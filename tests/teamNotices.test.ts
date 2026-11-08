import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingTeamNotices, teamNoticeFor } from '../src/utils/teamNotices';
import type { ServicePlan } from '../src/types/church';

const plan = (id: string, date: string, extra: Partial<ServicePlan> = {}) => ({
  id, title: 'Service ' + id, seriesTitle: '', date, serviceTimes: ['10:30'], targetDurationMinutes: 60, items: [],
  rota: [{ id: 'r', memberId: 'm', memberName: 'Sam', memberEmailHash: 'sam-hash', role: 'Bass', department: 'Band & Vocals', status: 'Pending' }],
  ...extra,
}) as unknown as ServicePlan;

test('band members see the services they were told about until they reply', () => {
  const told = teamNoticeFor('leader@example.org', new Date('2026-11-08T10:00:00Z'));
  assert.deepEqual(told, { sentAt: '2026-11-08T10:00:00.000Z', sentBy: 'leader@example.org' });
  const plans = [plan('b', '2026-11-22', { teamNotice: told }), plan('a', '2026-11-15', { teamNotice: told }), plan('quiet', '2026-11-29'), plan('past', '2026-11-01', { teamNotice: told })];
  const pending = pendingTeamNotices(plans, 'sam-hash', {}, '2026-11-08');
  assert.deepEqual(pending.map((n) => n.plan.id), ['a', 'b'], 'soonest first; not told or past services are left out');
  assert.deepEqual(pending[0].roles, ['Bass']);
  assert.deepEqual(pendingTeamNotices(plans, 'sam-hash', { a: 'Confirmed', b: 'Declined' }, '2026-11-08'), []);
  assert.deepEqual(pendingTeamNotices(plans, 'someone-else', {}, '2026-11-08'), []);
  assert.deepEqual(pendingTeamNotices(plans, '', {}, '2026-11-08'), []);
});
