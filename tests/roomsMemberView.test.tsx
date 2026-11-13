import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoomsSection } from '../src/components/GroupsAndGivingWorkspace';
import { newRoom } from '../src/utils/groupsRoomsGiving';
import type { RoomBooking } from '../src/types/church';

const hall = newRoom('Church hall', '');
const mine: RoomBooking = { id: 'rb-1', kind: 'booking', roomName: 'Church hall', eventTitle: 'Band rehearsal', date: '2099-01-10', startTime: '19:00', endTime: '21:00', organizer: 'Worship band', avRequired: false, setupNotes: '', bookedByUid: 'sam' };
const theirs: RoomBooking = { ...mine, id: 'rb-2', eventTitle: "Boys' Brigade", organizer: "Boys' Brigade", startTime: '18:00', endTime: '19:00', bookedByUid: 'jo' };
const base = { smallGroups: [], setSmallGroups: () => {}, roomBookings: [hall, mine, theirs], setRoomBookings: () => {}, donations: [], setDonations: () => {}, members: [], canSeeGroups: true, canSeeFinance: false, canEditGroups: false, canEditFinance: false };

test('a member sees every booking, who it is for, can book, and can cancel only their own', () => {
  const html = renderToStaticMarkup(<RoomsSection {...base} canBookRooms myUid="sam" myName="Sam" />);
  assert.match(html, /Book a room/);
  assert.match(html, /Band rehearsal/);
  assert.match(html, /For Worship band/);
  assert.match(html, /Boys&#x27; Brigade|Boys' Brigade/);
  assert.match(html, /Cancel booking Band rehearsal/);
  assert.doesNotMatch(html, /Cancel booking Boys/);
  assert.doesNotMatch(html, /Add room/);
});

test('without booking rights the list is read-only', () => {
  const html = renderToStaticMarkup(<RoomsSection {...base} />);
  assert.doesNotMatch(html, /Book a room|Cancel booking/);
});
