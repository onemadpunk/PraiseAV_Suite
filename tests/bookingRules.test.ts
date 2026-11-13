import { before, after, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { churchRules } from '../src/services/churchRules';
import { newRoom } from '../src/utils/groupsRoomsGiving';

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-praiseav-sermons', firestore: { rules: churchRules('owner@example.org') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role] of [['sam', 'member'], ['jo', 'member'], ['admin1', 'admin'], ['band', 'musician']]) await setDoc(doc(db, 'memberships', uid), { uid, email: uid + '@example.org', roles: [role] });
  });
});
after(async () => { await env?.cleanup(); });
const person = (uid: string) => env.authenticatedContext(uid, { email: uid + '@example.org', email_verified: true }).firestore();
const booking = (id: string, uid: string, extra: Record<string, unknown> = {}) => ({
  id, kind: 'booking', roomName: 'Church hall', eventTitle: 'Band rehearsal', date: '2026-12-01', startTime: '19:00', endTime: '21:00',
  organizer: 'Worship band', avRequired: false, setupNotes: '', bookedByUid: uid, ...extra,
});

test('a member books a room under their own name, and can see every booking', async () => {
  await assertSucceeds(setDoc(doc(person('sam'), 'bookings', 'rb-sam'), booking('rb-sam', 'sam')));
  await assertSucceeds(getDocs(collection(person('jo'), 'bookings')));
});

test('a member cannot book as someone else, add a room, or send a broken booking', async () => {
  const db = person('sam');
  await assertFails(setDoc(doc(db, 'bookings', 'rb-x1'), booking('rb-x1', 'jo')));
  await assertFails(setDoc(doc(db, 'bookings', 'room-x'), { ...newRoom('Vestry', ''), bookedByUid: 'sam' }));
  await assertFails(setDoc(doc(db, 'bookings', 'rb-x2'), booking('rb-x2', 'sam', { endTime: '18:00' })));
  await assertFails(setDoc(doc(db, 'bookings', 'rb-x3'), booking('rb-x3', 'sam', { roles: ['admin'] })));
});

test('a member cancels only their own booking; an admin can cancel any', async () => {
  await assertSucceeds(setDoc(doc(person('jo'), 'bookings', 'rb-jo'), booking('rb-jo', 'jo')));
  await assertFails(deleteDoc(doc(person('sam'), 'bookings', 'rb-jo')));
  await assertFails(setDoc(doc(person('sam'), 'bookings', 'rb-jo'), booking('rb-jo', 'sam')));
  await assertSucceeds(deleteDoc(doc(person('jo'), 'bookings', 'rb-jo')));
  await assertSucceeds(deleteDoc(doc(person('admin1'), 'bookings', 'rb-sam')));
});

test('people without the member role cannot see or book rooms', async () => {
  await assertFails(getDocs(collection(person('band'), 'bookings')));
  await assertFails(setDoc(doc(person('band'), 'bookings', 'rb-b'), booking('rb-b', 'band')));
});

test('an admin still sets up rooms', async () => {
  const room = newRoom('Vestry', 'seats 10');
  await assertSucceeds(setDoc(doc(person('admin1'), 'bookings', room.id), room));
});
