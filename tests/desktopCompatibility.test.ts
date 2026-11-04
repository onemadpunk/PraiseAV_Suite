import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { toPraiseAVService } from '../src/utils/praiseavService';
import type { ServicePlan, Song } from '../src/types/church';

const desktopRoot = process.env.PRAISEAV_DESKTOP_ROOT;

test('Suite service opens in the actual PraiseAV desktop reader', { skip: !desktopRoot }, () => {
  const require = createRequire(import.meta.url);
  const services = require(path.join(desktopRoot!, 'electron', 'services.cjs'));
  const song: Song = {
    id: 'test_song', title: 'Original Test Hymn', author: 'Test Church',
    ccliNumber: '', defaultKey: 'C', bpm: 80, timeSignature: '4/4',
    themes: [], arrangement: ['Verse 1'], chordPro: '[Verse 1]\n[C]Original test words',
    lastScheduled: '',
  };
  const plan: ServicePlan = {
    id: 'test_plan', title: 'Test Service', seriesTitle: '', date: '2026-11-01',
    serviceTimes: ['10:00'], targetDurationMinutes: 60, rota: [],
    items: [
      { id: 'test_item', type: 'song', title: song.title, songId: song.id, musicalKey: 'D',
        durationSeconds: 180, leader: '', stageNotes: '', audioCue: '', lightingCue: '' },
    ],
  };
  const directory = mkdtempSync(path.join(tmpdir(), 'praiseav-cross-app-'));
  const file = path.join(directory, 'service.praiseav');
  try {
    writeFileSync(file, JSON.stringify(toPraiseAVService(plan, [song])), 'utf8');
    const opened = services.open(file, {
      addSong: (copy: { title: string; lyrics: string; song_key: string }) => {
        assert.equal(copy.title, song.title);
        assert.match(copy.lyrics, /Original test words/);
        assert.equal(copy.song_key, 'C');
        return { id: 'desktop_song', status: 'imported', title: copy.title };
      },
      findSongsByTitle: () => [],
    });
    assert.equal(opened.doc.format, 'praiseav-service');
    assert.equal(opened.doc.items[0].songKeyOverride, 'D');
    assert.equal(opened.songIds.test_song, 'desktop_song');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
