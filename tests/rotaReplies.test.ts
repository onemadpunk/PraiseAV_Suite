import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveRotaStatus, indexRotaReplies, replyFor, withReply, MAX_ROTA_REPLIES } from '../src/utils/rotaReplies';
import { emailFingerprint } from '../src/utils/serviceSharing';
import type { ServicePlan } from '../src/types/church';

const plan = (rotaStatus: 'Confirmed' | 'Pending' | 'Declined', hash: string): ServicePlan => ({
  id: 'sunday', title: 'Sunday', seriesTitle: '', date: '2026-11-15', serviceTimes: [], targetDurationMinutes: 75, items: [],
  rota: [{ id: 'r1', memberId: 'm1', memberName: 'Sam', memberEmailHash: hash, department: 'Band & Vocals', role: 'Bass', status: rotaStatus }],
});

test('a volunteer reply is stored against the plan and can be undone', () => {
  const first = withReply(null, 'u1', 'Sam@Example.org', 'sunday', 'Confirmed', 't1');
  assert.deepEqual(first, { uid: 'u1', email: 'Sam@Example.org', replies: { sunday: 'Confirmed' }, updatedAt: 't1' });
  const changed = withReply(first, 'u1', 'Sam@Example.org', 'sunday', 'Declined', 't2');
  assert.equal(changed.replies.sunday, 'Declined');
  assert.deepEqual(withReply(changed, 'u1', 'Sam@Example.org', 'sunday', null, 't3').replies, {});
});

test('replies are capped so the document stays within the security rules', () => {
  let current: ReturnType<typeof withReply> | null = null;
  for (let i = 0; i < MAX_ROTA_REPLIES + 5; i++) current = withReply(current, 'u1', 'a@b.org', 'plan-' + i, 'Confirmed');
  assert.equal(Object.keys(current!.replies).length, MAX_ROTA_REPLIES);
  assert.ok(current!.replies['plan-' + (MAX_ROTA_REPLIES + 4)]);
});

test('planner sees the reply on the matching rota entry, and their own choice wins', async () => {
  const hash = await emailFingerprint('sam@example.org');
  const index = indexRotaReplies([
    withReply(null, 'u1', 'Sam@Example.org', 'sunday', 'Declined'),
    { uid: 'u2', email: 'other@example.org', replies: { sunday: 'Maybe' as never }, updatedAt: '' },
  ], { 'sam@example.org': hash, 'other@example.org': await emailFingerprint('other@example.org') });
  const pending = plan('Pending', hash);
  assert.equal(replyFor(pending, pending.rota[0], index)?.status, 'Declined');
  assert.equal(effectiveRotaStatus(pending, pending.rota[0], index), 'Declined');
  const confirmedByPlanner = plan('Confirmed', hash);
  assert.equal(effectiveRotaStatus(confirmedByPlanner, confirmedByPlanner.rota[0], index), 'Confirmed');
  const someoneElse = plan('Pending', 'not-sam');
  assert.equal(effectiveRotaStatus(someoneElse, someoneElse.rota[0], index), 'Pending');
});
