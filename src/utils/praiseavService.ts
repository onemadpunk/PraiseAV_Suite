import type { ServiceItem, ServicePlan, Song } from '../types/church';

// PraiseAV's saved-service format is read by electron/services.cjs. Keep this
// adapter separate from the Suite's planning model.
export interface PraiseAVServiceFile {
  format: 'praiseav-service';
  version: 1;
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  notices: string;
  items: Array<Record<string, unknown>>;
  songs: Record<string, Record<string, unknown>>;
  media: Array<{ id: string; name: string }>;
}

const section = /^\s*\[(?:Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Tag|Interlude|Ending|Vamp|Inst)[^\]]*\]\s*$/i;

export function wordsFromChordPro(chordPro: string): string {
  return chordPro.replace(/\r\n?/g, '\n').split('\n').map((line) => {
    if (section.test(line)) return line.trim();
    if (/^\s*\{[^}]+\}\s*$/.test(line)) return '';
    return line.replace(/\[[^\]]+\]/g, '').trimEnd();
  }).join('\n').trim();
}

export function hasSongWords(chordPro: string): boolean {
  return wordsFromChordPro(chordPro).split('\n').some((line) => Boolean(line.trim()) && !section.test(line));
}

function textBox(text: string) {
  return {
    id: crypto.randomUUID(), type: 'text', x: 200, y: 380, w: 1520, h: 320,
    text, font: 'Segoe UI', size: 88, color: '#ffffff', bold: true,
    italic: false, align: 'center', shadow: true,
  };
}

function noticeSlide(item: ServiceItem, text: string) {
  return {
    uid: item.id,
    type: 'designed',
    name: item.title,
    slides: [{ id: `${item.id}-1`, background: { type: 'theme' }, elements: [textBox(text)] }],
    suiteNotes: item.stageNotes,
    suiteAudioCue: item.audioCue,
    suiteLightingCue: item.lightingCue,
  };
}

function songCopy(song: Song) {
  return {
    title: song.title,
    author: song.author,
    copyright: '',
    ccli: song.ccliNumber,
    lyrics: wordsFromChordPro(song.chordPro),
    arrangement: song.arrangement.join(', '),
    song_key: song.defaultKey,
    chordpro: song.chordPro,
    backing_track: '', timing: '', slide_looks: '', lyrics2: '', hide_second: false,
  };
}

export function toPraiseAVService(plan: ServicePlan, songs: Song[]): PraiseAVServiceFile {
  const byId = new Map(songs.map((song) => [song.id, song]));
  const copies: PraiseAVServiceFile['songs'] = {};
  const items = plan.items.map((item) => {
    if (item.type === 'song' && item.songId) {
      const song = byId.get(item.songId);
      if (song && hasSongWords(song.chordPro)) {
        copies[song.id] = songCopy(song);
        return {
          uid: item.id,
          songId: song.id,
          songKeyOverride: item.musicalKey || '',
          arrangementOverride: (item.arrangementOverride || song.arrangement).join(', '),
          suiteNotes: item.stageNotes,
        };
      }
      return noticeSlide(item, item.title + '\n\nAdd licensed song words in PraiseAV before the service.');
    }
    if (item.type === 'sermon') {
      return {
        uid: item.id, type: 'sermon', title: item.title, speaker: item.leader,
        opening: 'title', picture: null,
        slides: (item.customSlides || []).map((slide) => ({ type: 'text', text: slide.bodyText })),
        notes: item.stageNotes, notesFollow: false,
      };
    }
    if (item.type === 'scripture') {
      return noticeSlide(item, [item.scriptureRef || item.title, item.scriptureText || ''].filter(Boolean).join('\n\n'));
    }
    if (item.type === 'presentation') {
      return noticeSlide(item, `${item.title}\n\nAdd the presentation file in PraiseAV before the service.`);
    }
    return noticeSlide(item, [item.title, item.subtitle].filter(Boolean).join('\n\n'));
  });
  return {
    format: 'praiseav-service', version: 1, id: plan.id,
    name: plan.title, date: plan.date,
    startTime: plan.serviceTimes[0] || '', endTime: '', notices: '',
    items, songs: copies, media: [],
  };
}
