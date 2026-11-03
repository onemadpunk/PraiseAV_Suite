import { useEffect, useRef, useState } from 'react';
import type { ServicePlan, Song } from '../types/church';
import { ALL_KEYS, parseChordProForSheet, transposeChordPro } from '../utils/musicAndAv';
import { arrangeChordPro } from '../utils/songArrangement';
import { assignmentsForEmailHash, emailFingerprint } from '../utils/serviceSharing';

interface Props { plans: ServicePlan[]; songs: Song[]; initialPlanId?: string; userEmail?: string; }

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char
);

export function MusicStandWorkspace({ plans, songs, initialPlanId, userEmail = '' }: Props) {
  const [planId, setPlanId] = useState(initialPlanId || plans[0]?.id || '');
  const [songIndex, setSongIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState('');
  const [capo, setCapo] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [userEmailHash, setUserEmailHash] = useState('');
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const plan = plans.find((entry) => entry.id === planId) || plans[0];
  const mySchedule = plans.map((entry) => ({ plan: entry, assignments: assignmentsForEmailHash(entry, userEmailHash) }))
    .filter((entry) => entry.assignments.length).sort((a, b) => a.plan.date.localeCompare(b.plan.date));
  const entries = (plan?.items || []).flatMap((item) => {
    const song = songs.find((candidate) => candidate.id === item.songId);
    return song ? [{ item, song }] : [];
  });
  const current = entries[Math.min(songIndex, entries.length - 1)];
  const soundingKey = selectedKey || current?.item.musicalKey || current?.song.defaultKey || 'C';
  const currentKeyIndex = ALL_KEYS.indexOf(soundingKey);
  const shapeKey = currentKeyIndex < 0 ? soundingKey : ALL_KEYS[(currentKeyIndex - capo + 12) % 12];
  const chart = current ? transposeChordPro(arrangeChordPro(current.song.chordPro, current.item.arrangementOverride || current.song.arrangement), current.song.defaultKey, shapeKey) : '';
  const lines = parseChordProForSheet(chart);

  useEffect(() => { setSongIndex(0); setSelectedKey(''); setCapo(0); }, [planId]);
  useEffect(() => {
    let active = true;
    emailFingerprint(userEmail).then((hash) => { if (active) setUserEmailHash(hash); });
    return () => { active = false; };
  }, [userEmail]);
  useEffect(() => { if (initialPlanId) setPlanId(initialPlanId); }, [initialPlanId]);
  useEffect(() => { setSelectedKey(''); setCapo(0); }, [current?.item.id]);

  const printSongbook = () => {
    if (!plan) return;
    const body = entries.map(({ item, song }) => {
      const key = item.musicalKey || song.defaultKey;
      const chart = transposeChordPro(arrangeChordPro(song.chordPro, item.arrangementOverride || song.arrangement), song.defaultKey, key);
      return '<section><h2>' + escapeHtml(song.title) + ' — ' + escapeHtml(key) +
        '</h2><pre>' + escapeHtml(chart || 'Add church-licensed words and chords.') + '</pre></section>';
    }).join('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Allow pop-ups to print the songbook.'); return; }
    printWindow.document.write('<!doctype html><html><head><title>' + escapeHtml(plan.title) +
      ' songbook</title><style>body{font-family:Arial,sans-serif;margin:20mm}section{break-after:page}pre{white-space:pre-wrap;font-size:13pt;line-height:1.4}h2{font-size:18pt}</style></head><body><h1>' +
      escapeHtml(plan.title) + '</h1>' + body + '</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return <section className={(expanded ? 'fixed inset-0 z-50 overflow-y-auto p-4 bg-white dark:bg-slate-950 ' : '') + 'space-y-5'}>
    <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 text-sm">
      <strong>Follow PraiseAV live at church</strong>
      <p>On the church Wi-Fi, ask the AV operator to turn on Remote in PraiseAV Windows. Scan its QR code on this tablet and ask to be approved as a read-only Band stand. That local view follows the live song and slide; your personal capo choice does not change the projector.</p>
    </div>
    {userEmail && <div className="rounded-xl border border-sky-400/50 p-4 space-y-2">
      <h2 className="font-semibold">My schedule</h2>
      {mySchedule.length ? mySchedule.map(({ plan: scheduled, assignments }) => <button key={scheduled.id} type="button" onClick={() => setPlanId(scheduled.id)} className="block w-full text-left rounded-lg border border-slate-300 dark:border-slate-700 p-3">
        <strong>{scheduled.date} · {scheduled.title}</strong><span className="block text-sm">{assignments.map((entry) => `${entry.role} — ${entry.status}`).join(', ')}</span>
      </button>) : <p className="text-sm">No rota assignments match {userEmail}. Ask your worship leader to assign your member record using this email address.</p>}
    </div>}
    <div className="suite-page-header flex flex-wrap items-center justify-between gap-2">
      <div><div className="suite-eyebrow">Worship team / Charts</div><h1 className="text-xl font-bold">Band stand</h1><p className="text-sm text-slate-600 dark:text-slate-300">Read-only charts for this service. Your key and capo choices affect this screen only.</p></div>
      <div className="flex gap-2">
        <button className="p-2 border rounded" onClick={printSongbook}>Print / save songbook PDF</button>
        <button className="p-2 border rounded" onClick={() => setExpanded(!expanded)}>{expanded ? 'Close full screen' : 'Full screen'}</button>
      </div>
    </div>
    <label className="block text-sm">Service
      <select className="block w-full p-2 mt-1 border rounded text-slate-900" value={plan?.id || ''} onChange={(e) => setPlanId(e.target.value)}>
        {plans.map((entry) => <option key={entry.id} value={entry.id}>{entry.date} — {entry.title}</option>)}
      </select>
    </label>
    {!entries.length ? <p>No songs in this service yet.</p> : <>
      <div className="flex gap-2 items-center">
        <button className="px-3 py-2 border rounded" disabled={songIndex <= 0} onClick={() => setSongIndex((index) => index - 1)}>Previous</button>
        <select aria-label="Choose song" className="flex-1 p-2 border rounded text-slate-900" value={songIndex} onChange={(e) => setSongIndex(Number(e.target.value))}>
          {entries.map(({ item, song }, index) => <option key={item.id} value={index}>{index + 1}. {song.title}</option>)}
        </select>
        <button className="px-3 py-2 border rounded" disabled={songIndex >= entries.length - 1} onClick={() => setSongIndex((index) => index + 1)}>Next</button>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="text-sm">Sounding key
          <select className="block p-2 border rounded text-slate-900" value={soundingKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {ALL_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label className="text-sm">Capo fret
          <select className="block p-2 border rounded text-slate-900" value={capo} onChange={(e) => setCapo(Number(e.target.value))}>
            {Array.from({ length: 8 }, (_, index) => <option key={index} value={index}>{index}</option>)}
          </select>
        </label>
        <p className="self-end text-sm">Play {shapeKey} shapes{capo ? ' with capo ' + capo : ''}; sounds in {soundingKey}.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 overflow-x-auto"
        onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const dx = e.changedTouches[0].clientX - touchStart.current.x;
          const dy = e.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) setSongIndex((index) => Math.max(0, Math.min(entries.length - 1, index + (dx < 0 ? 1 : -1))));
          touchStart.current = null;
        }}>
        <h2 className="text-2xl font-bold mb-5">{current.song.title}</h2>
        {!chart.trim() ? <p>Add church-licensed words and chords to this song.</p> : lines.map((line, index) =>
          line.isSectionHeader ? <h3 className="font-bold text-sky-700 dark:text-sky-300 mt-5 mb-2" key={index}>{line.sectionLabel}</h3>
            : <div className="flex whitespace-pre-wrap font-mono text-base leading-6" key={index}>{line.segments.map((segment, part) =>
                <span key={part} className="inline-flex flex-col"><strong className="text-sky-700 dark:text-sky-300 min-h-6">{segment.chord || ' '}</strong><span>{segment.lyric || ' '}</span></span>)}</div>
        )}
      </div>
      <p className="text-xs text-slate-500">Printing song words or charts may require your church to report copies under its licence.</p>
    </>}
  </section>;
}
