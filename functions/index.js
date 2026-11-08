// PraiseAV's one Cloud Function, in the praiseav-suite project: "Let the team know" emails.
// The rules for who may send what are in notifyTeam.js. Mail goes out through Brevo's free plan
// (300 a day); the key is kept as a Firebase secret, never in this repository.
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { LIMITS, NotifyError, notifyTeam } from './notifyTeam.js';

const BREVO_API_KEY = defineSecret('BREVO_API_KEY');
const MAIL_FROM = defineString('MAIL_FROM', { default: 'rota@praiseav.com' });

const home = getApps().find((app) => app.name === '[DEFAULT]') || initializeApp();
const db = getFirestore(home);

// Each church has its own Firebase project; its sign-ins are checked against that project's keys.
function churchApp(projectId) {
  const name = `church-${projectId}`;
  return getApps().find((app) => app.name === name) || initializeApp({ projectId }, name);
}

async function findChurch(projectId) {
  const found = await db.collection('churchDirectory').where('projectId', '==', projectId).where('status', '==', 'ready').limit(1).get();
  if (found.empty) return null;
  return { churchName: String(found.docs[0].get('churchName') || 'Your church').slice(0, 100) };
}

async function readPlan(projectId, planId, token) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${encodeURIComponent(planId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

async function reserve(projectId, planId, count, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const church = db.doc(`mailLimits/church-${projectId}-${day}`);
  const all = db.doc(`mailLimits/all-${day}`);
  const plan = db.doc(`mailLimits/plan-${projectId}-${planId}`);
  await db.runTransaction(async (tx) => {
    const [c, a, p] = await Promise.all([tx.get(church), tx.get(all), tx.get(plan)]);
    if (now - (p.get('lastSentAt') || 0) < LIMITS.resendMs) throw new NotifyError(429, 'The team was emailed about this service a few minutes ago. Try again later.');
    if ((c.get('count') || 0) + count > LIMITS.perChurchDay) throw new NotifyError(429, 'Your church has sent today’s emails. The notice in the Suite still works; try the emails again tomorrow.');
    if ((a.get('count') || 0) + count > LIMITS.allDay) throw new NotifyError(429, 'PraiseAV has sent all its emails for today. The notice in the Suite still works; try again tomorrow.');
    tx.set(church, { count: FieldValue.increment(count), day }, { merge: true });
    tx.set(all, { count: FieldValue.increment(count), day }, { merge: true });
    tx.set(plan, { lastSentAt: now }, { merge: true });
  });
}

async function sendMail({ to, replyTo, fromName, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY.value(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { name: fromName, email: MAIL_FROM.value() }, to: [{ email: to }], replyTo: { email: replyTo }, subject, textContent: text, htmlContent: html }),
  });
  if (!res.ok) throw new Error(`Mail service: HTTP ${res.status}`);
}

export const notifyTeamEmail = onRequest({ region: 'europe-west2', secrets: [BREVO_API_KEY], maxInstances: 2, timeoutSeconds: 60, memory: '256MiB' }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }
  const token = /^Bearer (.+)$/.exec(req.get('Authorization') || '')?.[1] || '';
  try {
    const result = await notifyTeam(req.body, token, {
      findChurch,
      verifyToken: (projectId, idToken) => getAuth(churchApp(projectId)).verifyIdToken(idToken),
      readPlan, reserve, sendMail, now: () => Date.now(),
    });
    res.json(result);
  } catch (error) {
    const status = error instanceof NotifyError ? error.status : 500;
    if (status === 500) console.error('notifyTeamEmail failed', error);
    res.status(status).json({ error: status === 500 ? 'Emails could not be sent just now. The notice in the Suite still works.' : error.message });
  }
});
