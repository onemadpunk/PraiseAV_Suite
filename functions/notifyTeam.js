// "Let the team know" emails, sent by PraiseAV for every church (Steven's choice, 8 Nov 2026).
// A church's own free Firebase plan can't send email, so the Suite asks this one small service.
//
// Who may send, and to whom, is decided from the church's own data, read with the caller's own
// sign-in (so the church's security rules apply):
//   1. The church must be registered and ready in the PraiseAV church directory.
//   2. The caller's sign-in must be a verified email issued by that church's Firebase project.
//   3. The caller must be able to read the plan, and must have just pressed Let the team know on it
//      (plan.teamNotice.sentBy is their email, sent in the last 10 minutes). Only planners and
//      worship leaders can write plans, so this proves they are one.
//   4. Each address must match someone on that plan's rota (by its SHA-256 fingerprint), who
//      hasn't been marked Declined. Nobody else can be emailed through this service.
// The message is a fixed template: only the church name, service, date, roles and the church's own
// Suite link go in, all escaped. Limits keep the free mail plan safe: 40 people a send, one send per
// service every 10 minutes, 120 emails a church a day, 280 in all a day.

import { createHash } from 'node:crypto';

export const LIMITS = { perSend: 40, perChurchDay: 120, allDay: 280, resendMs: 10 * 60 * 1000 };
const SUITE_HOSTS = new Set(['praiseav-suite.web.app', 'suite.praiseav.com']);

export class NotifyError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const fingerprint = (email) => createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const validEmail = (email) => /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}\.[a-z]{2,}$/i.test(email);

/** Firestore REST value → plain value (just the shapes a plan uses). */
export function plain(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(plain);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, plain(v)]));
  return undefined;
}

export function checkLink(link) {
  let url;
  try { url = new URL(String(link)); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !SUITE_HOSTS.has(url.hostname)) return null;
  return url.toString();
}

export function teamEmail({ churchName, plan, roles, link }) {
  const date = escape(plan.date || '');
  const title = escape(plan.title || 'Sunday service');
  const church = escape(churchName);
  const subject = `${churchName}: you’re on the rota for ${plan.title || 'Sunday'} (${plan.date || ''})`.slice(0, 180);
  const text = [
    `You’re on the rota at ${churchName} for ${plan.title || 'the service'} on ${plan.date || ''}.`,
    `Your part: ${roles.join(', ')}.`,
    '',
    'The songs and keys are ready to look over. Open the Suite to see them and to say whether you can serve:',
    link,
    '',
    `You get this because your worship leader at ${churchName} put you on the rota. If you’d rather not get these emails, tell them.`,
  ].join('\n');
  const html = `<p>You’re on the rota at <strong>${church}</strong> for <strong>${title}</strong> on ${date}.</p>
<p>Your part: ${escape(roles.join(', '))}.</p>
<p>The songs and keys are ready to look over. Open the Suite to see them and to say whether you can serve:</p>
<p><a href="${escape(link)}">Open the songs and reply</a></p>
<p style="color:#666;font-size:12px">You get this because your worship leader at ${church} put you on the rota. If you’d rather not get these emails, tell them.</p>`;
  return { subject, text, html };
}

/**
 * deps: {
 *   findChurch(projectId) → { churchName } | null      (PraiseAV directory, status ready)
 *   verifyToken(projectId, token) → { uid, email, email_verified }
 *   readPlan(projectId, planId, token) → Firestore REST document | null
 *   reserve(projectId, planId, count, now) → throws NotifyError when over a limit
 *   sendMail({ to, replyTo, fromName, subject, text, html })
 *   now() }
 */
export async function notifyTeam(body, token, deps) {
  const projectId = String(body?.projectId || '');
  const planId = String(body?.planId || '');
  if (!/^[a-z0-9-]{6,100}$/.test(projectId) || !/^[A-Za-z0-9_-]{1,128}$/.test(planId)) throw new NotifyError(400, 'Missing church or service.');
  if (!token) throw new NotifyError(401, 'Sign in to the Suite first.');
  const link = checkLink(body?.link);
  if (!link) throw new NotifyError(400, 'The Suite link is not valid.');
  const church = await deps.findChurch(projectId);
  if (!church) throw new NotifyError(403, 'This church isn’t registered with PraiseAV yet, so emails can’t be sent. The notice in the Suite still works.');
  let user;
  try { user = await deps.verifyToken(projectId, token); } catch { throw new NotifyError(401, 'Sign in to the Suite again.'); }
  const sender = String(user?.email || '').toLowerCase();
  if (!user?.email_verified || !validEmail(sender)) throw new NotifyError(403, 'Verify your email address first.');
  const doc = await deps.readPlan(projectId, planId, token);
  if (!doc) throw new NotifyError(403, 'You can’t see this service.');
  const plan = plain({ mapValue: { fields: doc.fields || {} } });
  const sentAt = Date.parse(plan.teamNotice?.sentAt || '');
  if (String(plan.teamNotice?.sentBy || '').toLowerCase() !== sender || !Number.isFinite(sentAt) || Math.abs(deps.now() - sentAt) > LIMITS.resendMs) {
    throw new NotifyError(403, 'Press Let the team know in the Suite first.');
  }
  const rota = (Array.isArray(plan.rota) ? plan.rota : []).filter((entry) => entry && entry.status !== 'Declined' && typeof entry.memberEmailHash === 'string');
  const wanted = [...new Set((Array.isArray(body?.emails) ? body.emails : []).map((e) => String(e).trim().toLowerCase()).filter(validEmail))];
  const recipients = wanted
    .map((email) => ({ email, roles: [...new Set(rota.filter((entry) => entry.memberEmailHash === fingerprint(email)).map((entry) => String(entry.role || 'Team').slice(0, 60)))] }))
    .filter((r) => r.roles.length);
  if (!recipients.length) return { sent: 0 };
  if (recipients.length > LIMITS.perSend) throw new NotifyError(400, `Emails go to at most ${LIMITS.perSend} people at once.`);
  await deps.reserve(projectId, planId, recipients.length, deps.now());
  let sent = 0;
  const failed = [];
  for (const r of recipients) {
    const mail = teamEmail({ churchName: church.churchName, plan, roles: r.roles, link });
    try {
      await deps.sendMail({ to: r.email, replyTo: sender, fromName: `${church.churchName} via PraiseAV`.slice(0, 70), ...mail });
      sent++;
    } catch { failed.push(r.email); }
  }
  return { sent, failed };
}
