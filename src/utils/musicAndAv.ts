import { PraiseSlide, ServiceItem, ServicePlan, Song } from '../types/church';
import { arrangeChordPro } from './songArrangement';

export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_PREFERRED_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm']);

function getNoteIndex(note: string): number {
  const clean = note.trim();
  const sIdx = CHROMATIC_SHARP.indexOf(clean);
  if (sIdx !== -1) return sIdx;
  return CHROMATIC_FLAT.indexOf(clean);
}

export function transposeChordToken(chord: string, semitones: number, preferFlats: boolean): string {
  if (semitones === 0) return chord;
  return chord.replace(/([A-G][#b]?)/g, (match) => {
    const idx = getNoteIndex(match);
    if (idx === -1) return match;
    const nextIdx = (idx + semitones + 120) % 12;
    return preferFlats ? CHROMATIC_FLAT[nextIdx] : CHROMATIC_SHARP[nextIdx];
  });
}

export function transposeChordPro(chordPro: string, fromKey: string, toKey: string): string {
  const fromIdx = getNoteIndex(fromKey);
  const toIdx = getNoteIndex(toKey);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return chordPro;
  const semitones = (toIdx - fromIdx + 12) % 12;
  const preferFlats = FLAT_PREFERRED_KEYS.has(toKey);

  return chordPro.replace(/\[([^\]]+)\]/g, (_, chordInside: string) => {
    if (/^(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Tag|Interlude|Ending|Vamp|Inst)/i.test(chordInside.trim())) {
      return `[${chordInside}]`;
    }
    return `[${transposeChordToken(chordInside, semitones, preferFlats)}]`;
  });
}

export function calculateCapoSuggestions(targetKey: string): Array<{ capo: number; shapesKey: string }> {
  const targetIdx = getNoteIndex(targetKey);
  if (targetIdx === -1) return [];
  const easyAcousticShapes = ['G', 'C', 'D', 'E', 'A'];
  const suggestions: Array<{ capo: number; shapesKey: string }> = [];

  for (const shape of easyAcousticShapes) {
    const shapeIdx = getNoteIndex(shape);
    const capo = (targetIdx - shapeIdx + 12) % 12;
    if (capo > 0 && capo <= 7) {
      suggestions.push({ capo, shapesKey: shape });
    }
  }
  return suggestions.sort((a, b) => a.capo - b.capo);
}

export interface ParsedChordLine {
  isSectionHeader: boolean;
  sectionLabel?: string;
  segments: Array<{ chord: string; lyric: string }>;
}

export function parseChordProForSheet(chordPro: string): ParsedChordLine[] {
  const lines = chordPro.split('\n');
  const parsed: ParsedChordLine[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      parsed.push({ isSectionHeader: false, segments: [{ chord: '', lyric: ' ' }] });
      continue;
    }

    const sectionMatch = trimmed.match(/^\[(Verse[^\]]*|Chorus[^\]]*|Bridge[^\]]*|Intro[^\]]*|Outro[^\]]*|Pre-Chorus[^\]]*|Tag[^\]]*|Interlude[^\]]*)\]$/i);
    if (sectionMatch) {
      parsed.push({
        isSectionHeader: true,
        sectionLabel: sectionMatch[1],
        segments: [],
      });
      continue;
    }

    const segments: Array<{ chord: string; lyric: string }> = [];
    const regex = /(?:\[([^\]]+)\])?([^\[]*)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match[0].length === 0) break;
      const chord = match[1] || '';
      const lyric = match[2] || '';
      if (chord || lyric) {
        segments.push({ chord, lyric });
      }
    }
    parsed.push({ isSectionHeader: false, segments });
  }

  return parsed;
}

export function compileSongToPraiseSlides(song: Song, activeKey?: string): PraiseSlide[] {
  const keyToUse = activeKey || song.defaultKey;
  const transposed = transposeChordPro(song.chordPro, song.defaultKey, keyToUse);
  const rawLines = transposed.split('\n');

  const slides: PraiseSlide[] = [];
  let currentLabel = 'Verse 1';
  let currentLyricBuffer: string[] = [];
  let currentChordSummary: string[] = [];

  const flushSlide = () => {
    if (currentLyricBuffer.length === 0) return;
    const cleanBody = currentLyricBuffer.join('\n').trim();
    if (!cleanBody) return;
    slides.push({
      id: `${song.id}-slide-${slides.length + 1}`,
      label: currentLabel,
      bodyText: cleanBody,
      lowerThirdText: cleanBody.replace(/\n/g, '  /  '),
      stageMonitorNote: `${song.title} (${keyToUse} · ${song.bpm} BPM) — Chords: ${
        Array.from(new Set(currentChordSummary)).join(' - ') || keyToUse
      }`,
      backgroundStyle: 'deep-navy',
    });
    currentLyricBuffer = [];
    currentChordSummary = [];
  };

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushSlide();
      continue;
    }
    const headerMatch = trimmed.match(/^\[(Verse[^\]]*|Chorus[^\]]*|Bridge[^\]]*|Intro[^\]]*|Outro[^\]]*|Pre-Chorus[^\]]*|Tag[^\]]*|Interlude[^\]]*)\]$/i);
    if (headerMatch) {
      flushSlide();
      currentLabel = headerMatch[1];
      continue;
    }

    const chordMatches = Array.from(trimmed.matchAll(/\[([^\]]+)\]/g));
    for (const cm of chordMatches) {
      currentChordSummary.push(cm[1]);
    }

    const lyricOnly = trimmed.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
    if (lyricOnly) {
      currentLyricBuffer.push(lyricOnly);
      if (currentLyricBuffer.length >= 4) {
        flushSlide();
      }
    }
  }
  flushSlide();

  return slides;
}

export function compileServiceItemSlides(item: ServiceItem, songs: Song[]): PraiseSlide[] {
  if (item.customSlides && item.customSlides.length > 0) {
    return item.customSlides;
  }

  if (item.type === 'song' && item.songId) {
    const foundSong = songs.find((s) => s.id === item.songId);
    if (foundSong) {
      return compileSongToPraiseSlides({ ...foundSong, chordPro: arrangeChordPro(foundSong.chordPro, item.arrangementOverride || foundSong.arrangement) }, item.musicalKey || foundSong.defaultKey);
    }
  }

  if (item.type === 'scripture' && item.scriptureText) {
    const sentences = item.scriptureText
      .split(/(?<=[.?!;])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const slides: PraiseSlide[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(' ');
      slides.push({
        id: `${item.id}-scr-${i}`,
        label: `${item.scriptureRef || item.title} (${item.scriptureTranslation || 'NIV'}) · Part ${Math.floor(i / 2) + 1}`,
        bodyText: chunk,
        lowerThirdText: `${item.scriptureRef || item.title}: ${chunk}`,
        stageMonitorNote: `Reader: ${item.leader} · ${item.stageNotes}`,
        backgroundStyle: 'emerald-liturgy',
      });
    }
    return slides;
  }

  if (item.type === 'presentation') {
    return [
      {
        id: `${item.id}-pres-1`,
        label: `EXTERNAL DECK · ${item.externalMediaName || 'PowerPoint / PDF'}`,
        bodyText: `${item.title}\n\n[Praise AV External Deck: ${item.externalMediaName || 'Slides.pptx'}]`,
        lowerThirdText: `${item.title} — ${item.leader}`,
        stageMonitorNote: `Preacher Timer & Notes Active · File: ${item.externalMediaName || 'External Presentation'}`,
        backgroundStyle: 'warm-charcoal',
      },
    ];
  }

  return [
    {
      id: `${item.id}-main-1`,
      label: item.type.toUpperCase(),
      bodyText: item.subtitle ? `${item.title}\n\n${item.subtitle}` : item.title,
      lowerThirdText: `${item.title}${item.subtitle ? ` — ${item.subtitle}` : ''} (${item.leader})`,
      stageMonitorNote: `Leader: ${item.leader} · Audio: ${item.audioCue} · Notes: ${item.stageNotes}`,
      backgroundStyle: item.type === 'sermon' ? 'warm-charcoal' : 'deep-navy',
    },
  ];
}

export function formatDurationMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function addSecondsToClockTime(startHHMM: string, addSeconds: number): string {
  const [hhStr, mmStr] = startHHMM.split(':');
  const baseMinutes = (parseInt(hhStr || '9', 10) * 60) + parseInt(mmStr || '0', 10);
  const totalMinutes = baseMinutes + Math.floor(addSeconds / 60);
  const outHH = Math.floor(totalMinutes / 60) % 24;
  const outMM = totalMinutes % 60;
  return `${String(outHH).padStart(2, '0')}:${String(outMM).padStart(2, '0')}`;
}

export function buildPraiseAVExportBundle(plan: ServicePlan, songs: Song[]) {
  const compiledItems = plan.items.map((item, idx) => {
    const slides = compileServiceItemSlides(item, songs);
    return {
      orderIndex: idx + 1,
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle || '',
      leader: item.leader,
      durationSeconds: item.durationSeconds,
      musicalKey: item.musicalKey || null,
      scriptureRef: item.scriptureRef || null,
      scriptureTranslation: item.scriptureTranslation || 'NIV',
      externalMediaName: item.externalMediaName || null,
      cues: {
        audio: item.audioCue,
        lighting: item.lightingCue,
        stageNotes: item.stageNotes,
      },
      slides,
    };
  });

  return {
    schemaVersion: '1.0.0',
    application: 'Praise Suite -> Praise AV (https://praiseav.com/) Direct Bridge',
    exportedAt: new Date().toISOString(),
    servicePlan: {
      id: plan.id,
      title: plan.title,
      seriesTitle: plan.seriesTitle,
      date: plan.date,
      serviceTimes: plan.serviceTimes,
      targetDurationMinutes: plan.targetDurationMinutes,
      rota: plan.rota,
      cuesAndSlides: compiledItems,
    },
  };
}
