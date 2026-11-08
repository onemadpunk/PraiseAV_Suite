import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_BYTES, chunkCount, cloudFileKind, cloudFileProblem, cloudFileRecord, mediaEntry, sha256Hex } from '../src/utils/cloudFiles';
import { toPraiseAVService } from '../src/utils/praiseavService';
import type { ServicePlan } from '../src/types/church';

test('PowerPoint, PDF, video and music can travel through the church cloud within size limits', () => {
  assert.equal(cloudFileKind('Talk.PPTX'), 'presentation');
  assert.equal(cloudFileKind('notes.pdf'), 'presentation');
  assert.equal(cloudFileKind('clip.mp4'), 'video');
  assert.equal(cloudFileKind('song.m4a'), 'audio');
  assert.equal(cloudFileKind('virus.exe'), null);
  assert.equal(cloudFileProblem('Talk.pptx', 10 * 1024 * 1024), '');
  assert.match(cloudFileProblem('Talk.pptx', 60 * 1024 * 1024), /shared Services folder/);
  assert.match(cloudFileProblem('film.mp4', 101 * 1024 * 1024), /Videos up to 100 MB/);
  assert.match(cloudFileProblem('x.exe', 10), /Choose/);
  assert.equal(chunkCount(CHUNK_BYTES), 1);
  assert.equal(chunkCount(CHUNK_BYTES + 1), 2);
});

test('the record and media entry name the file by its SHA-256', async () => {
  const data = new TextEncoder().encode('slides').buffer as ArrayBuffer;
  const sha = await sha256Hex(data);
  const record = cloudFileRecord('Talk.pptx', data, sha, 'alice@example.org', new Date('2026-11-08T10:00:00Z'));
  assert.deepEqual(record, { name: 'Talk.pptx', fileName: sha + '.pptx', sha256: sha, ext: 'pptx', kind: 'presentation', bytes: 6, chunks: 1, uploadedBy: 'alice@example.org', uploadedAt: '2026-11-08T10:00:00.000Z' });
  assert.deepEqual(mediaEntry(record), { id: 'suite-' + sha, name: 'Talk.pptx', kind: 'presentation', fileName: sha + '.pptx', sha256: sha, bytes: 6, via: 'cloud' });
  assert.throws(() => cloudFileRecord('Talk.pptx', data, 'nope', 'a@b.c'));
});

test('a presentation file reaches PraiseAV as a presentation item, and sermon slides as a presentation cue', () => {
  const file = { id: 'suite-' + 'a'.repeat(64), name: 'Report.pdf', kind: 'presentation' as const, fileName: 'a'.repeat(64) + '.pdf', sha256: 'a'.repeat(64), bytes: 10, via: 'cloud' as const };
  const plan = {
    id: 'sunday', title: 'Sunday', date: '2026-11-15', serviceTimes: ['10:30'], items: [
      { id: 'p1', type: 'presentation', title: 'Mission report', durationSeconds: 300, leader: '', stageNotes: '', audioCue: '', lightingCue: '', presentationFile: file },
      { id: 's1', type: 'sermon', title: 'Hope', durationSeconds: 1800, leader: 'Alice', stageNotes: '', audioCue: '', lightingCue: '', customSlides: [], sermonMedia: [{ ...file, afterSlide: 0 }] },
    ],
  } as unknown as ServicePlan;
  const out = toPraiseAVService(plan, []);
  assert.deepEqual(out.items[0], { uid: 'p1', type: 'presentation', name: 'Mission report', slides: [], suiteFile: file.id, suiteNotes: '' });
  assert.deepEqual((out.items[1].slides as unknown[])[0], { type: 'presentation', id: file.id, name: 'Report.pdf' });
  assert.equal(out.media.filter((m) => m.id === file.id).length, 1);
});
