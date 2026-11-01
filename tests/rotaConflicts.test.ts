import test from 'node:test';
import assert from 'node:assert/strict';
import { rotaConflicts } from '../src/utils/rotaConflicts';
import type { Member, ServicePlan } from '../src/types/church';

const member = { id: 'person_1', blockoutDates: ['2026-11-01'] } as Member;
const service = {
  id: 'service_1', title: 'Morning', date: '2026-11-01',
  rota: [{ id: 'rota_1', memberId: member.id, role: 'Sound Desk', status: 'Pending' }],
} as ServicePlan;
const other = {
  id: 'service_2', title: 'Evening', date: '2026-11-01',
  rota: [{ id: 'rota_2', memberId: member.id, role: 'Guitar', status: 'Confirmed' }],
} as ServicePlan;

test('rota warns about blockouts and same-date assignments before adding another role', () => {
  const warnings = rotaConflicts(member, service, [service, other]);
  assert.equal(warnings.length, 3);
  assert.match(warnings.join(' '), /blockout/);
  assert.match(warnings.join(' '), /Sound Desk/);
  assert.match(warnings.join(' '), /Evening/);
});

test('declined and other-date assignments do not block a new rota entry', () => {
  const available = { ...member, blockoutDates: [] };
  const declined = { ...service, rota: [{ ...service.rota[0], status: 'Declined' as const }] };
  assert.deepEqual(rotaConflicts(available, service, [declined, { ...other, date: '2026-11-08' }]), []);
});
