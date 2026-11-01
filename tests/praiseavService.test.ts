import test from 'node:test';
import assert from 'node:assert/strict';
import { toPraiseAVService, wordsFromChordPro } from '../src/utils/praiseavService';
import type { ServicePlan, Song } from '../src/types/church';

const song: Song = {
  id: 'song_1', title: 'Test Hymn', author: 'Test Writer', ccliNumber: '',
  defaultKey: 'C', bpm: 80, timeSignature: '4/4', themes: [],
  arrangement: ['Verse 1', 'Chorus'], chordPro: '[Verse 1]\n[C]This is a test\n\n[Chorus]\n[G]Second line',
  lastScheduled: '',
};
const plan: ServicePlan = {
  id: 'plan_1', title: 'Sunday Service', seriesTitle: '', date: '2026-11-01',
  serviceTimes: ['10:30'], targetDurationMinutes: 70, rota: [],
  items: [
    { id: 'item_1', type: 'song', title: song.title, songId: song.id, musicalKey: 'D', durationSeconds: 180, leader: '', stageNotes: '', audioCue: '', lightingCue: '' },
    { id: 'item_2', type: 'presentation', title: 'Guest slides', externalMediaName: 'visitor.pptx', durationSeconds: 600, leader: '', stageNotes: '', audioCue: '', lightingCue: '' },
  ],
};

test('ChordPro words retain sections but omit chord tokens', () => {
  assert.equal(wordsFromChordPro(song.chordPro), '[Verse 1]\nThis is a test\n\n[Chorus]\nSecond line');
});

test('Suite exports the desktop service format with an item key override', () => {
  const exported = toPraiseAVService(plan, [song]);
  assert.equal(exported.format, 'praiseav-service');
  assert.equal(exported.items.length, 2);
  assert.equal(exported.items[0].songKeyOverride, 'D');
  assert.equal(exported.songs[song.id].title, song.title);
  assert.match(String(exported.songs[song.id].lyrics), /This is a test/);
  assert.equal(exported.items[1].type, 'designed');
  assert.deepEqual(exported.media, []);
});

test('Missing song words leave a visible operator cue without an unusable song item', () => {
  const exported = toPraiseAVService(plan, [{ ...song, chordPro: '' }]);
  assert.equal(exported.items[0].type, 'designed');
  assert.equal(Object.keys(exported.songs).length, 0);
});
