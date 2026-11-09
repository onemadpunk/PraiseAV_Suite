import test from 'node:test';
import assert from 'node:assert/strict';
import { servicesCsv, servicesUsingSong } from '../src/utils/serviceExport';

const song = { id: 's1', title: 'Amazing Grace', author: 'John Newton', ccliNumber: '22025', defaultKey: 'G' } as any;
const plan = (id: string, date: string, items: any[]) => ({ id, title: 'Sunday', seriesTitle: '', date, serviceTimes: ['10:30'], targetDurationMinutes: 60, items, rota: [] }) as any;

test('services export one row per item, oldest first, with keys and CCLI numbers', () => {
  const csv = servicesCsv([
    plan('b', '2026-11-08', [{ id: 'i1', type: 'song', title: 'Amazing Grace', songId: 's1', musicalKey: 'A', leader: 'Sam', durationSeconds: 240 }]),
    plan('a', '2026-11-01', []),
  ], [song]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^"2026-11-01"/);
  assert.equal(lines[2], '"2026-11-08","10:30","Sunday","","1","song","Amazing Grace","A","Sam","4","John Newton","22025"');
});

test('a formula in a title is not run by a spreadsheet', () => {
  const csv = servicesCsv([plan('a', '2026-11-01', [{ id: 'i', type: 'prayer', title: '=HYPERLINK("x")', durationSeconds: 60 }])], []);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
});

test('finds the services that use a song', () => {
  const plans = [plan('a', '2026-11-01', [{ id: 'i', type: 'song', songId: 's1' }]), plan('b', '2026-11-08', [])];
  assert.deepEqual(servicesUsingSong(plans, 's1').map((p) => p.id), ['a']);
});
