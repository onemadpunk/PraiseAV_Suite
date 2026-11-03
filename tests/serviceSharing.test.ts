import assert from 'node:assert/strict';
import test from 'node:test';
import type { Member, ServicePlan, Song } from '../src/types/church';
import { assignedEmailAddresses, assignmentsForEmailHash, emailFingerprint, serviceTeamMessage } from '../src/utils/serviceSharing';

const plan = {
  id: 'sunday', title: 'Sunday Worship', date: '2026-11-08', serviceTimes: ['10:30'],
  items: [
    { id: 'one', type: 'song', title: 'First Song', songId: 'song-a', musicalKey: 'D' },
    { id: 'two', type: 'prayer', title: 'Prayer' },
  ],
  rota: [
    { id: 'a', memberId: 'member-a', memberName: 'Ada', role: 'Guitar', status: 'Confirmed' },
    { id: 'b', memberId: 'member-b', memberName: 'Ben', role: 'Keys', status: 'Pending' },
    { id: 'c', memberId: 'member-a', memberName: 'Ada', role: 'Vocals', status: 'Declined' },
  ],
} as ServicePlan;
const members = [{ id: 'member-a', email: 'ada@example.org' }, { id: 'member-b', email: 'ben@example.org' }] as Member[];
const songs = [{ id: 'song-a', defaultKey: 'C' }] as Song[];

test('team email addresses include pending assignments but exclude declines and duplicates', async () => {
  assert.deepEqual(assignedEmailAddresses(plan, members), ['ada@example.org', 'ben@example.org']);
  const emailHash = await emailFingerprint(' ADA@example.org ');
  assert.equal(emailHash, await emailFingerprint('ada@example.org'));
  assert.notEqual(emailHash, 'ada@example.org');
  const assignedPlan = { ...plan, rota: plan.rota.map((entry) => entry.memberId === 'member-a' ? { ...entry, memberEmailHash: emailHash } : entry) };
  assert.deepEqual(assignmentsForEmailHash(assignedPlan, emailHash).map((entry) => entry.role), ['Guitar']);
});

test('team message includes the chosen service key, order and sign-in link', () => {
  const message = serviceTeamMessage(plan, songs, 'https://example.org/?church=abc&plan=sunday');
  assert.match(message, /1\. First Song — key D/);
  assert.match(message, /2\. Prayer/);
  assert.match(message, /Ada: Guitar \(Confirmed\)/);
  assert.doesNotMatch(message, /Vocals/);
  assert.match(message, /https:\/\/example\.org\/\?church=abc&plan=sunday/);
});
