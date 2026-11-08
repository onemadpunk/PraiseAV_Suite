import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { churchRules } from '../src/services/churchRules';
import { withReply } from '../src/utils/rotaReplies';

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-praiseav-sermons', firestore: { rules: churchRules('owner@example.org') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role] of [['sam', 'musician'], ['jo', 'musician'], ['leader', 'worship_leader']]) await setDoc(doc(db, 'memberships', uid), { uid, email: uid + '@example.org', roles: [role] });
  });
});
after(async () => { await env?.cleanup(); });
const person = (uid: string) => env.authenticatedContext(uid, { email: uid + '@example.org', email_verified: true }).firestore();

test('a member saves only their own rota reply, under their own email', async () => {
  const db = person('sam');
  await assertSucceeds(setDoc(doc(db, 'rotaReplies', 'sam'), withReply(null, 'sam', 'sam@example.org', 'sunday', 'Confirmed')));
  await assertFails(setDoc(doc(db, 'rotaReplies', 'jo'), withReply(null, 'jo', 'jo@example.org', 'sunday', 'Declined')));
  await assertFails(setDoc(doc(db, 'rotaReplies', 'sam'), withReply(null, 'sam', 'jo@example.org', 'sunday', 'Declined')));
  await assertFails(setDoc(doc(db, 'rotaReplies', 'sam'), { ...withReply(null, 'sam', 'sam@example.org', 'sunday', 'Confirmed'), roles: ['admin'] }));
});

test('the worship leader reads every reply; other members read only their own', async () => {
  await assertSucceeds(getDocs(collection(person('leader'), 'rotaReplies')));
  await assertSucceeds(getDoc(doc(person('sam'), 'rotaReplies', 'sam')));
  await assertFails(getDoc(doc(person('jo'), 'rotaReplies', 'sam')));
  await assertFails(getDocs(collection(person('jo'), 'rotaReplies')));
});

test('someone without church access cannot reply', async () => {
  const stranger = env.authenticatedContext('stranger', { email: 'stranger@example.org', email_verified: true }).firestore();
  await assertFails(setDoc(doc(stranger, 'rotaReplies', 'stranger'), withReply(null, 'stranger', 'stranger@example.org', 'sunday', 'Confirmed')));
  assert.ok(true);
});
