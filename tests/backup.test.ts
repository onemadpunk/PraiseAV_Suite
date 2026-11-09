import test from 'node:test';
import assert from 'node:assert/strict';
import { backupReminder, missingAccess, parseAccessList, parseChurchBackup } from '../src/services/backup';

const empty = { plans: [], songs: [], members: [], childrenList: [], smallGroups: [], roomBookings: [], donations: [] };

test('older backups without an access list still restore', () => {
  assert.deepEqual(parseAccessList(empty), []);
  assert.deepEqual(parseChurchBackup(empty).plans, []);
});

test('the access list is read and checked', () => {
  const access = parseAccessList({ ...empty, churchAccess: [{ uid: 'abc123', email: 'a@example.org', roles: ['planner', 'planner', 'musician'] }] });
  assert.deepEqual(access, [{ uid: 'abc123', email: 'a@example.org', roles: ['planner', 'musician'] }]);
  assert.throws(() => parseAccessList({ churchAccess: [{ uid: 'abc', email: 'a@example.org', roles: ['superuser'] }] }));
  assert.throws(() => parseAccessList({ churchAccess: [{ uid: 'a/b', email: 'a@example.org', roles: ['member'] }] }));
  assert.throws(() => parseAccessList({ churchAccess: [{ uid: 'abc', email: 'x', roles: [] }] }));
});

test('restore only gives back access that is missing, never the owner and never changes others', () => {
  const backup = [
    { uid: 'owner', email: 'o@example.org', roles: ['admin'] },
    { uid: 'kept', email: 'k@example.org', roles: ['admin'] },
    { uid: 'lost', email: 'l@example.org', roles: ['musician'] },
  ];
  const current = [{ uid: 'kept', email: 'k@example.org', roles: ['member'] }];
  assert.deepEqual(missingAccess(current, backup, 'owner'), [backup[2]]);
});

test('the backup reminder is calm and due after 30 days', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  assert.equal(backupReminder(null, now).due, true);
  assert.deepEqual(backupReminder('2026-11-09T08:00:00Z', now), { text: 'Last backup on this computer: today.', due: false });
  assert.equal(backupReminder('2026-10-01T08:00:00Z', now).due, true);
  assert.equal(backupReminder('2026-10-25T08:00:00Z', now).text, 'Last backup on this computer: 15 days ago.');
});
