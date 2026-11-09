import React, { useState } from 'react';
import {
  Check,
  Download,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { Song } from '../types/church';
import { hasSongWords } from '../utils/praiseavService';
import {
  ALL_KEYS,
  calculateCapoSuggestions,
  compileSongToPraiseSlides,
  parseChordProForSheet,
  transposeChordPro,
} from '../utils/musicAndAv';

interface SongLibraryWorkspaceProps {
  songs: Song[];
  onAddSong: (song: Song) => void;
  onUpdateSong: (song: Song) => void;
  onDeleteSong?: (song: Song) => void;
  onAddSongToActiveService: (song: Song, chosenKey: string) => void;
}

export const SongLibraryWorkspace: React.FC<SongLibraryWorkspaceProps> = ({
  songs,
  onAddSong,
  onUpdateSong,
  onDeleteSong,
  onAddSongToActiveService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [keyFilter, setKeyFilter] = useState<string>('ALL');
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0]?.id || '');
  const [previewKey, setPreviewKey] = useState<string>(songs[0]?.defaultKey || 'C');
  const [activeTab, setActiveTab] = useState<'chart' | 'slides' | 'editor'>('chart');
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // New Song Form
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCcli, setNewCcli] = useState('');
  const [newKey, setNewKey] = useState('G');
  const [newBpm, setNewBpm] = useState(72);
  const [newTimeSig, setNewTimeSig] = useState<'4/4' | '3/4' | '6/8'>('4/4');
  const [newThemes, setNewThemes] = useState('');
  const [newChordPro, setNewChordPro] = useState('[Verse 1]\n\n[Chorus]\n');

  const filteredSongs = songs.filter((s) => {
    const matchesQuery =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ccliNumber.includes(searchQuery) ||
      s.chordPro.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKey = keyFilter === 'ALL' || s.defaultKey === keyFilter;
    return matchesQuery && matchesKey;
  });

  const selectedSong =
    songs.find((s) => s.id === selectedSongId) || filteredSongs[0] || songs[0];

  const handleSelectSong = (song: Song) => {
    setSelectedSongId(song.id);
    setPreviewKey(song.defaultKey);
  };

  const handleCreateSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: Song = {
      id: 'song-' + crypto.randomUUID(),
      title: newTitle.trim(),
      author: newAuthor.trim(),
      ccliNumber: newCcli.trim(),
      defaultKey: newKey,
      bpm: newBpm,
      timeSignature: newTimeSig,
      themes: newThemes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      arrangement: [...newChordPro.matchAll(/^\s*\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Tag|Interlude|Ending|Vamp|Instrumental)[^\]]*\]\s*$/gim)].map((match) => match[0].trim().slice(1, -1)),
      chordPro: newChordPro,
      lastScheduled: '',
    };
    onAddSong(created);
    setSelectedSongId(created.id);
    setPreviewKey(created.defaultKey);
    setShowNewSongModal(false);
    setNewTitle('');
    setNewAuthor('');
  };

  const handleExportSongForPraiseAV = (song: Song) => {
    const lines = song.chordPro.replace(/\r\n?/g, '\n').split('\n').map((line) =>
      /^\s*\[(?:Verse|Chorus|Bridge|Intro|Outro|Tag|Pre-Chorus)[^\]]*\]\s*$/i.test(line)
        ? line.trim().slice(1, -1)
        : line.replace(/\[[^\]]+\]/g, '')
    );
    if (!hasSongWords(song.chordPro)) {
      alert('Add lyrics you have permission to use before exporting this song.');
      return;
    }
    const text = [song.title, '', ...lines, '', song.author, 'CCLI Song # ' + (song.ccliNumber || 'none'), ''].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const transposedText = selectedSong
    ? transposeChordPro(selectedSong.chordPro, selectedSong.defaultKey, previewKey)
    : '';
  const parsedLines = parseChordProForSheet(transposedText);
  const slides = selectedSong ? compileSongToPraiseSlides(selectedSong, previewKey) : [];
  const capoList = calculateCapoSuggestions(previewKey);

  return (
    <div className="space-y-6">
      <div className="suite-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="suite-eyebrow">Worship resources / Library</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Song library
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain church-licensed lyrics and chords, preview slides, and prepare charts in the key your musicians need.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewSongModal(!showNewSongModal)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Song to Database
        </button>
      </div>

      {showNewSongModal && (
        <form
          onSubmit={handleCreateSongSubmit}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add New Worship Song (ChordPro + Praise AV Auto-Pagination)
            </h2>
            <button
              type="button"
              onClick={() => setShowNewSongModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Song Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Living Hope"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Songwriters / Authors
              </label>
              <input
                type="text"
                placeholder="e.g. Phil Wickham, Brian Johnson"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                CCLI Song #
              </label>
              <input
                type="text"
                value={newCcli}
                onChange={(e) => setNewCcli(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Key
              </label>
              <select
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tempo (BPM)
              </label>
              <input
                type="number"
                value={newBpm}
                onChange={(e) => setNewBpm(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time Signature
              </label>
              <select
                value={newTimeSig}
                onChange={(e) => setNewTimeSig(e.target.value as '4/4' | '3/4' | '6/8')}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Themes (comma-separated)
              </label>
              <input
                type="text"
                value={newThemes}
                onChange={(e) => setNewThemes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ChordPro Lyrics & Chords (Put chords in brackets like [G] or [Am7], and sections like [Verse 1])
            </label>
            <textarea
              rows={7}
              value={newChordPro}
              onChange={(e) => setNewChordPro(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
            >
              Save Song to Library
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Song Directory Table */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search title, lyrics, writer, or CCLI #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Filter by Original Key:</span>
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                className="font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1"
              >
                <option value="ALL">All Keys ({songs.length})</option>
                {ALL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    Key of {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {filteredSongs.map((song) => {
              const isSelected = song.id === selectedSong?.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {song.title}
                    </div>
                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                      Key: {song.defaultKey}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {song.author}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
                    <span>CCLI #{song.ccliNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{song.bpm} BPM</span>
                    <span aria-hidden="true">·</span>
                    <span>{song.timeSignature}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans">{song.themes.slice(0, 3).join(' / ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Song Studio, Transposer & Praise AV Slide Deck */}
        {selectedSong && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    CCLI #{selectedSong.ccliNumber} · {selectedSong.bpm} BPM · {selectedSong.timeSignature} · Last used {selectedSong.lastScheduled}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedSong.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSong.author}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onDeleteSong && <button
                    type="button"
                    onClick={() => onDeleteSong(selectedSong)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete song
                  </button>}
                  <button
                    type="button"
                    onClick={() => handleExportSongForPraiseAV(selectedSong)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export to Praise AV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddSongToActiveService(selectedSong, previewKey);
                      setAddedFeedback(true);
                      setTimeout(() => setAddedFeedback(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 whitespace-nowrap shrink-0"
                  >
                    {addedFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Added in Key of {previewKey}
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Add to Current Service ({previewKey})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Key Transposer Strip & Segmented View Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-1">
                    Transpose Key:
                  </span>
                  {ALL_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPreviewKey(k)}
                      className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                        previewKey === k
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chart')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'chart'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Chord Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('slides')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'slides'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Praise AV Slides ({slides.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'editor'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Edit Words On-The-Fly
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'chart' && (
              <div className="p-5 space-y-4">
                {capoList.length > 0 && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Capo Chart ({previewKey}):{' '}
                    </span>
                    {capoList.map((c, idx) => (
                      <span key={c.shapesKey} className="font-mono">
                        {idx > 0 ? ' · ' : ''}Capo {c.capo} ({c.shapesKey} shapes)
                      </span>
                    ))}
                  </div>
                )}

                <div className="font-mono text-xs space-y-2 bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {parsedLines.map((line, idx) => {
                    if (line.isSectionHeader) {
                      return (
                        <div
                          key={idx}
                          className="pt-3 pb-1 font-sans font-bold text-xs text-indigo-600 dark:text-indigo-400"
                        >
                          {line.sectionLabel}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex flex-wrap leading-tight py-0.5">
                        {line.segments.map((seg, sIdx) => (
                          <div key={sIdx} className="inline-flex flex-col pr-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold h-4">
                              {seg.chord || '\u00A0'}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 whitespace-pre">
                              {seg.lyric}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'slides' && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {slides.map((sl, i) => (
                  <div
                    key={sl.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                  >
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Slide {i + 1} · {sl.label}
                      </span>
                      <span className="font-mono text-slate-500">16:9</span>
                    </div>
                    <div className="aspect-video bg-slate-950 text-white p-4 flex items-center justify-center text-center">
                      <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                        {sl.bodyText}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-[11px] font-mono text-slate-500 truncate">
                      {sl.stageMonitorNote}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Change lyrics or chords on the fly below. Edits immediately update all Praise AV slides and band chord sheets.
                </p>
                <textarea
                  rows={16}
                  value={selectedSong.chordPro}
                  onChange={(e) =>
                    onUpdateSong({
                      ...selectedSong,
                      chordPro: e.target.value,
                    })
                  }
                  className="w-full p-4 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
