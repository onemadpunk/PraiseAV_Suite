import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotifyError, fingerprint, notifyTeam, teamEmail, checkLink } from './notifyTeam.js';

const NOW = Date.parse('2026-11-08T15:00:00Z');
const s = (v) => ({ stringValue: v });
const rotaEntry = (email, role, status = 'Pending') => ({ mapValue: { fields: { memberEmailHash: s(fingerprint(email)), role: s(role), status: s(status) } } });
const planDoc = (extra = {}) => ({ fields: {
  id: s('sunday'), title: s('Morning <worship>'), date: s('2026-11-15'),
  teamNotice: { mapValue: { fields: { sentAt: s('2026-11-08T14:58:00Z'), sentBy: s('Leader@Grace.org') } } },
  rota: { arrayValue: { values: [rotaEntry('sam@example.org', 'Bass'), rotaEntry('sam@example.org', 'Vocals'), rotaEntry('jo@example.org', 'Drums'), rotaEntry('no@example.org', 'Keys', 'Declined')] } },
  ...extra,
} });

function deps(over = {}) {
  const mail = [];
  return {
    mail,
    findChurch: async (id) => (id === 'grace-church' ? { churchName: 'Grace Church' } : null),
    verifyToken: async (id, token) => { if (token !== 'good') throw new Error('bad'); return { uid: 'u', email: 'leader@grace.org', email_verified: true }; },
    readPlan: async () => planDoc(),
    reserve: async () => {},
    sendMail: async (m) => { mail.push(m); },
    now: () => NOW,
    ...over,
  };
}
const body = (extra = {}) => ({ projectId: 'grace-church', planId: 'sunday', link: 'https://praiseav-suite.web.app/?church=abc&view=band&plan=sunday', emails: ['Sam@example.org', 'jo@example.org', 'no@example.org', 'stranger@example.org'], ...extra });

test('only people on the rota who have not declined are emailed, once each, with their roles', async () => {
  const d = deps();
  assert.deepEqual(await notifyTeam(body(), 'good', d), { sent: 2, failed: [] });
  assert.deepEqual(d.mail.map((m) => m.to), ['sam@example.org', 'jo@example.org']);
  assert.match(d.mail[0].text, /Your part: Bass, Vocals\./);
  assert.equal(d.mail[0].replyTo, 'leader@grace.org');
  assert.equal(d.mail[0].fromName, 'Grace Church via PraiseAV');
  assert.match(d.mail[0].html, /Morning &lt;worship&gt;/, 'church text is escaped');
});

test('unregistered churches, bad sign-ins, other people, stale presses and odd links are refused', async () => {
  const refused = async (b, token, d, status) => assert.rejects(notifyTeam(b, token, d), (e) => e instanceof NotifyError && e.status === status);
  await refused(body({ projectId: 'someone-else' }), 'good', deps(), 403);
  await refused(body(), 'forged', deps(), 401);
  await refused(body(), '', deps(), 401);
  await refused(body(), 'good', deps({ verifyToken: async () => ({ email: 'leader@grace.org', email_verified: false }) }), 403);
  await refused(body(), 'good', deps({ readPlan: async () => null }), 403);
  await refused(body(), 'good', deps({ verifyToken: async () => ({ email: 'musician@grace.org', email_verified: true }) }), 403);
  await refused(body(), 'good', deps({ now: () => NOW + 60 * 60 * 1000 }), 403);
  await refused(body({ link: 'https://evil.example/phish' }), 'good', deps(), 400);
  await refused(body({ planId: '../x' }), 'good', deps(), 400);
  await refused(body(), 'good', deps({ reserve: async () => { throw new NotifyError(429, 'later'); } }), 429);
});

test('nothing to send is not an error, and the link must be the Suite', async () => {
  assert.deepEqual(await notifyTeam(body({ emails: ['stranger@example.org'] }), 'good', deps()), { sent: 0 });
  assert.equal(checkLink('https://suite.praiseav.com/?a=1'), 'https://suite.praiseav.com/?a=1');
  assert.equal(checkLink('http://praiseav-suite.web.app/'), null);
  assert.equal(checkLink('https://user:pw@praiseav-suite.web.app/'), null);
  const mail = teamEmail({ churchName: 'A "B" <C>', plan: { title: 'T', date: 'D' }, roles: ['Bass'], link: 'https://praiseav-suite.web.app/?x="y"' });
  assert.doesNotMatch(mail.html, /<C>|"y"/);
});
