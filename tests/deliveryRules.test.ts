import { before, after, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { churchRules } from '../src/services/churchRules';
import { sermonDelivery, serviceDelivery } from '../src/utils/deliveries';

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-praiseav-sermons', firestore: { rules: churchRules('owner@example.org') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'plans', 'sunday'), { id: 'sunday', sermonAssignments: { 'sermon-a': 'alice@example.org' } });
    for (const [uid, role] of [['leader', 'worship_leader'], ['booth', 'av'], ['alice', 'preacher'], ['bob', 'preacher'], ['sam', 'musician']]) await setDoc(doc(db, 'memberships', uid), { uid, email: uid + '@example.org', roles: [role] });
  });
});
after(async () => { await env?.cleanup(); });
const person = (uid: string) => env.authenticatedContext(uid, { email: uid + '@example.org', email_verified: true }).firestore();
const service = { format: 'praiseav-service', version: 1, id: 'sunday', name: 'Sunday' };

test('the worship leader publishes the service; the booth reads it; musicians and preachers cannot', async () => {
  await assertSucceeds(setDoc(doc(person('leader'), 'deliveries', 'sunday'), await serviceDelivery(service, 'leader@example.org')));
  await assertFails(setDoc(doc(person('leader'), 'deliveries', 'sunday'), await serviceDelivery(service, 'someone@example.org')));
  await assertFails(setDoc(doc(person('leader'), 'deliveries', 'sunday'), { ...(await serviceDelivery(service, 'leader@example.org')), fileName: '../evil.praiseav' }));
  await assertFails(setDoc(doc(person('alice'), 'deliveries', 'sunday'), await serviceDelivery(service, 'alice@example.org')));
  await assertSucceeds(getDoc(doc(person('booth'), 'deliveries', 'sunday')));
  await assertSucceeds(getDocs(collection(person('booth'), 'deliveries')));
  await assertFails(getDoc(doc(person('sam'), 'deliveries', 'sunday')));
});

test('only the assigned preacher publishes their sermon, and only the booth and planners list sermons', async () => {
  const sermon = { planId: 'sunday', itemId: 'sermon-a', notes: 'private' };
  await assertSucceeds(setDoc(doc(person('alice'), 'deliveries', 'sunday', 'sermons', 'sermon-a'), await sermonDelivery(sermon, 'alice@example.org')));
  await assertFails(setDoc(doc(person('bob'), 'deliveries', 'sunday', 'sermons', 'sermon-a'), await sermonDelivery(sermon, 'bob@example.org')));
  await assertSucceeds(getDoc(doc(person('alice'), 'deliveries', 'sunday', 'sermons', 'sermon-a')));
  await assertFails(getDoc(doc(person('bob'), 'deliveries', 'sunday', 'sermons', 'sermon-a')));
  await assertFails(getDoc(doc(person('sam'), 'deliveries', 'sunday', 'sermons', 'sermon-a')));
  await assertSucceeds(getDocs(collection(person('booth'), 'deliveries', 'sunday', 'sermons')));
});

test('only the booth writes receipts, under its own email', async () => {
  const receipt = { id: 'sunday', hash: 'a'.repeat(64), receivedAt: '2026-11-08T10:00:00Z', booth: 'booth@example.org' };
  await assertSucceeds(setDoc(doc(person('booth'), 'deliveryReceipts', 'sunday'), receipt));
  await assertFails(setDoc(doc(person('booth'), 'deliveryReceipts', 'sunday'), { ...receipt, booth: 'leader@example.org' }));
  await assertFails(setDoc(doc(person('leader'), 'deliveryReceipts', 'sunday'), { ...receipt, booth: 'leader@example.org' }));
  await assertSucceeds(getDoc(doc(person('alice'), 'deliveryReceipts', 'sunday')));
});
