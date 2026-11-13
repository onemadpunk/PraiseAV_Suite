import type { DonationRecord, Member, RoomBooking, SmallGroup } from '../types/church';
import { csvCell } from './csv';

// ---------- Rooms ----------

export const isRoom = (record: RoomBooking) => record.kind === 'room';

/** The church's own rooms, set up by an administrator, in name order. */
export function churchRooms(records: RoomBooking[]): RoomBooking[] {
  return records.filter(isRoom).sort((a, b) => a.roomName.localeCompare(b.roomName));
}

/** Bookings only (not room setup records), soonest first. */
export function roomBookingsOnly(records: RoomBooking[]): RoomBooking[] {
  return records.filter((record) => !isRoom(record))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function newRoom(name: string, notes: string): RoomBooking {
  return {
    id: 'room-' + crypto.randomUUID(), kind: 'room', roomName: name.trim().slice(0, 100),
    eventTitle: '', date: '', startTime: '', endTime: '', organizer: '', avRequired: false,
    setupNotes: notes.trim().slice(0, 300),
  };
}

/** Why a booking cannot be made, or null if it can. */
export function bookingProblem(records: RoomBooking[], wanted: Pick<RoomBooking, 'roomName' | 'date' | 'startTime' | 'endTime'>): string | null {
  if (!wanted.roomName) return 'Choose a room.';
  if (!wanted.date) return 'Choose a date.';
  if (!wanted.startTime || !wanted.endTime || wanted.endTime <= wanted.startTime) return 'The end time must be after the start time.';
  const clash = roomBookingsOnly(records).find((b) => b.roomName === wanted.roomName && b.date === wanted.date
    && !(wanted.endTime <= b.startTime || wanted.startTime >= b.endTime));
  return clash ? `${wanted.roomName} is already booked then (${clash.startTime}–${clash.endTime}, "${clash.eventTitle}").` : null;
}

// ---------- Small groups ----------

export function groupMemberCount(group: SmallGroup): number {
  return group.memberIds ? group.memberIds.length : group.currentMembers;
}

/** The People records in a group, and how many of them have no email address. */
export function groupPeople(group: SmallGroup, members: Member[]): { people: Member[]; noEmail: number } {
  const ids = new Set(group.memberIds || []);
  const people = members.filter((m) => ids.has(m.id)).sort((a, b) => a.fullName.localeCompare(b.fullName));
  return { people, noEmail: people.filter((m) => !m.email.trim()).length };
}

/**
 * A mailto: link that opens the sender's own email app, addressed to the group.
 * Addresses go in BCC so members do not see each other's email addresses.
 */
export function groupEmailLink(group: SmallGroup, members: Member[], subject: string, body: string): string | null {
  const emails = [...new Set(groupPeople(group, members).people.map((m) => m.email.trim()).filter(Boolean))];
  if (!emails.length) return null;
  const query = 'bcc=' + emails.map(encodeURIComponent).join(',')
    + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  return 'mailto:?' + query;
}

export function materialEmailText(group: SmallGroup, material: { title: string; link: string; note: string }): { subject: string; body: string } {
  const lines = [`Hello ${group.name},`, '', material.title];
  if (material.note.trim()) lines.push('', material.note.trim());
  if (material.link.trim()) lines.push('', material.link.trim());
  lines.push('', 'You can also find this in the PraiseAV Suite under Groups.');
  return { subject: `${group.name}: ${material.title}`, body: lines.join('\n') };
}

/** Only allow ordinary web links for materials. */
export function safeLink(link: string): string {
  const value = link.trim();
  if (!value) return '';
  try {
    const url = new URL(/^[a-z]+:/i.test(value) ? value : 'https://' + value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch { return ''; }
}

// ---------- Giving ----------

export const COLLECTION_SUGGESTIONS = [
  'Sunday morning collection', 'Sunday evening collection', 'Prayer evening collection',
  'Midweek collection', 'Special collection', 'Bank transfer', 'Standing order', 'One-off gift',
];
export const FUND_SUGGESTIONS = ['General fund', 'Building fund', 'Missions', 'Foodbank', 'Youth', 'Hardship fund'];
export const METHOD_OPTIONS = ['Cash', 'Card / contactless', 'Bank transfer', 'Standing order', 'Cheque', 'Online'];

/** How the money came in, for older records that predate "source". */
export function givingSource(d: DonationRecord): string {
  return d.source?.trim() || d.method || 'Not recorded';
}

export interface GivingTotal { label: string; total: number; count: number }

function totalsBy(donations: DonationRecord[], key: (d: DonationRecord) => string): GivingTotal[] {
  const map = new Map<string, GivingTotal>();
  for (const d of donations) {
    const label = key(d) || 'Not recorded';
    const entry = map.get(label) || { label, total: 0, count: 0 };
    entry.total += d.amount; entry.count += 1;
    map.set(label, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function givingSummary(donations: DonationRecord[], period: string /* 'YYYY' or 'YYYY-MM' or '' for all */) {
  const inPeriod = donations.filter((d) => !period || d.date.startsWith(period));
  return {
    total: inPeriod.reduce((sum, d) => sum + d.amount, 0),
    count: inPeriod.length,
    named: inPeriod.filter((d) => d.donorName.trim()).length,
    bySource: totalsBy(inPeriod, givingSource),
    byFund: totalsBy(inPeriod, (d) => d.fund),
  };
}

/** Giving export. Names are left out unless the person exporting chose to show them. */
export function givingCsv(donations: DonationRecord[], includeNames: boolean): string {
  const headers = ['Date', 'Came in through', 'Fund', 'Method', 'Amount (GBP)', 'Note'];
  if (includeNames) headers.push('Given by');
  const rows = [...donations].sort((a, b) => a.date.localeCompare(b.date)).map((d) => {
    const row: Array<string | number> = [d.date, givingSource(d), d.fund, d.method, d.amount.toFixed(2), d.note || ''];
    if (includeNames) row.push(d.donorName);
    return row;
  });
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export const money = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
