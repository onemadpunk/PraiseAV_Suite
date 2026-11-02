import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeChordPro } from '../src/utils/songArrangement';
import { compileServiceItemSlides } from '../src/utils/musicAndAv';
import { toPraiseAVService } from '../src/utils/praiseavService';
import type { ServicePlan, Song } from '../src/types/church';

const song: Song = { id: 's1', title: 'Test', author: '', ccliNumber: '', defaultKey: 'C', bpm: 80, timeSignature: '4/4', themes: [], arrangement: ['Verse 1', 'Chorus'], chordPro: '[Verse 1]\n[C]First line\n\n[Chorus]\n[G]Second line', lastScheduled: '' };
const item = { id: 'i1', type: 'song' as const, title: 'Test', durationSeconds: 180, leader: '', songId: 's1', stageNotes: '', audioCue: '', lightingCue: '', arrangementOverride: ['Verse 1', 'Chorus', 'Chorus'] };
const plan: ServicePlan = { id: 'p1', title: 'Service', seriesTitle: '', date: '2026-11-01', serviceTimes: ['10:30'], targetDurationMinutes: 60, rota: [], items: [item] };

test('service chart repeats a chorus without changing the library song', () => {
  const reordered = arrangeChordPro(song.chordPro, item.arrangementOverride);
  assert.equal((reordered.match(/Second line/g) || []).length, 2);
  assert.equal((song.chordPro.match(/Second line/g) || []).length, 1);
  const slides = compileServiceItemSlides(item, [song]);
  assert.equal(slides.filter((slide) => slide.label === 'Chorus').length, 2);
});

test('unknown section does not silently drop song words', () => {
  assert.equal(arrangeChordPro(song.chordPro, ['Verse 1', 'Bridge']), song.chordPro);
});

test('service export carries per-service order to desktop', () => {
  const exported = toPraiseAVService(plan, [song]);
  assert.equal(exported.items[0].arrangementOverride, 'Verse 1, Chorus, Chorus');
});
