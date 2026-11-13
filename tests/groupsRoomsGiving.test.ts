import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingProblem, churchRooms, givingCsv, givingSummary, groupEmailLink, groupMemberCount, newRoom,
  roomBookingsOnly, safeLink, materialEmailText,
} from '../src/utils/groupsRoomsGiving';
import { parseChurchBackup } from '../src/services/backup';
import type { DonationRecord, Member, RoomBooking, SmallGroup } from '../src/types/church';

const hall = newRoom('Church hall', 'Seats 60');
const vestry = newRoom('Vestry', '');
const booking: RoomBooking = { id: 'rb-1', kind: 'booking', roomName: 'Church hall', eventTitle: 'Toddlers', date: '2026-11-20', startTime: '10:00', endTime: '12:00', organizer: '', avRequired: false, setupNotes: '' };
const oldBooking: RoomBooking = { id: 'rb-0', roomName: 'Main Sanctuary', eventTitle: 'Old', date: '2026-10-01', startTime: '09:00', endTime: '10:00', organizer: '', avRequired: true, setupNotes: '' };

test('rooms the church sets up are kept apart from bookings, including older bookings', () => {
  const all = [booking, vestry, hall, oldBooking];
  assert.deepEqual(churchRooms(all).map((r) => r.roomName), ['Church hall', 'Vestry']);
  assert.deepEqual(roomBookingsOnly(all).map((b) => b.id), ['rb-0', 'rb-1']);
});

test('a room cannot be double booked, but the same time in another room is fine', () => {
  const all = [hall, vestry, booking];
  assert.match(bookingProblem(all, { roomName: 'Church hall', date: '2026-11-20', startTime: '11:00', endTime: '13:00' }) || '', /already booked/);
  assert.equal(bookingProblem(all, { roomName: 'Vestry', date: '2026-11-20', startTime: '11:00', endTime: '13:00' }), null);
  assert.equal(bookingProblem(all, { roomName: 'Church hall', date: '2026-11-20', startTime: '12:00', endTime: '13:00' }), null);
  assert.match(bookingProblem(all, { roomName: 'Vestry', date: '2026-11-20', startTime: '13:00', endTime: '12:00' }) || '', /after the start/);
});

const people = [
  { id: 'p1', fullName: 'Ann', email: 'ann@example.org' },
  { id: 'p2', fullName: 'Bob', email: '' },
  { id: 'p3', fullName: 'Cat', email: 'cat@example.org' },
] as Member[];
const group = { id: 'sg-1', name: 'Tuesday group', currentMembers: 8, memberIds: ['p1', 'p2'] } as SmallGroup;

test('a group emails only its own members, in BCC', () => {
  const href = groupEmailLink(group, people, 'Hi', 'Body') || '';
  assert.match(href, /^mailto:\?bcc=ann%40example\.org&subject=Hi&body=Body$/);
  assert.equal(groupEmailLink({ ...group, memberIds: ['p2'] }, people, 'Hi', ''), null);
  assert.equal(groupMemberCount(group), 2);
  assert.equal(groupMemberCount({ ...group, memberIds: undefined }), 8);
});

test('materials only accept web links and the email names the group', () => {
  assert.equal(safeLink('drive.google.com/file/x'), 'https://drive.google.com/file/x');
  assert.equal(safeLink('javascript:alert(1)'), '');
  assert.equal(safeLink(''), '');
  const text = materialEmailText(group, { title: 'Week 3', link: 'https://x.org/a', note: 'Read ch. 3' });
  assert.equal(text.subject, 'Tuesday group: Week 3');
  assert.match(text.body, /Read ch\. 3\n\nhttps:\/\/x\.org\/a/);
});

const giving: DonationRecord[] = [
  { id: 'd1', date: '2026-11-02', amount: 245.5, source: 'Sunday morning collection', fund: 'General fund', method: 'Cash', donorName: '' },
  { id: 'd2', date: '2026-11-05', amount: 60, source: 'Prayer evening collection', fund: 'General fund', method: 'Cash', donorName: '' },
  { id: 'd3', date: '2026-11-09', amount: 1000, source: 'One-off gift', fund: 'Building fund', method: 'Bank transfer', donorName: 'Smith household' },
  { id: 'd4', date: '2026-10-01', amount: 100, fund: 'General Ministry Fund', method: 'Standing Order (Bank)', donorName: 'Old record', giftAidEligible: true },
];

test('giving is totalled by collection and by fund for a period', () => {
  const nov = givingSummary(giving, '2026-11');
  assert.equal(nov.total, 1305.5);
  assert.equal(nov.count, 3);
  assert.equal(nov.named, 1);
  assert.deepEqual(nov.byFund.map((t) => [t.label, t.total]), [['Building fund', 1000], ['General fund', 305.5]]);
  assert.equal(givingSummary(giving, '').bySource.find((t) => t.label === 'Standing Order (Bank)')?.total, 100);
});

test('giving download leaves names and Gift Aid out unless names are shown', () => {
  const hidden = givingCsv(giving, false);
  assert.doesNotMatch(hidden, /Smith|Old record|Gift Aid/);
  assert.match(givingCsv(giving, true), /Smith household/);
});

test('backups accept rooms, groups with members and unnamed giving', () => {
  const parsed = parseChurchBackup({
    plans: [], songs: [], members: [], childrenList: [],
    smallGroups: [{ ...group, category: 'Home Group', active: true, materials: [] }],
    roomBookings: [hall, booking], donations: giving,
  });
  assert.equal(parsed.roomBookings.length, 2);
  assert.equal(parsed.donations.length, 4);
});
