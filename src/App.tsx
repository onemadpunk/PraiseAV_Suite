/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Download,
  ExternalLink,
  HeartHandshake,
  ListMusic,
  MonitorPlay,
  Moon,
  Music,
  RotateCcw,
  ShieldCheck,
  Sun,
  Upload,
  Users,
} from 'lucide-react';
import { CheckInsWorkspace } from './components/CheckInsWorkspace';
import { GroupsAndGivingWorkspace } from './components/GroupsAndGivingWorkspace';
import { PeopleAndRotasWorkspace } from './components/PeopleAndRotasWorkspace';
import {
  PRAISEAV_THEME_PRESETS,
  PraiseAVThemePreset,
  PraseAVBridgeWorkspace,
} from './components/PraseAVBridgeWorkspace';
import { ServicesWorkspace } from './components/ServicesWorkspace';
import { SongLibraryWorkspace } from './components/SongLibraryWorkspace';
import {
  INITIAL_CHECKINS,
  INITIAL_DONATIONS,
  INITIAL_MEMBERS,
  INITIAL_ROOM_BOOKINGS,
  INITIAL_SERVICE_PLANS,
  INITIAL_SMALL_GROUPS,
  INITIAL_SONGS,
} from './data/initialChurchData';
import {
  CheckInChild,
  DonationRecord,
  Member,
  PraiseAVLiveState,
  RoomBooking,
  ServiceItem,
  ServicePlan,
  SmallGroup,
  Song,
} from './types/church';
import { compileServiceItemSlides } from './utils/musicAndAv';

type ActiveModule =
  | 'services'
  | 'songs'
  | 'people'
  | 'checkins'
  | 'groups-giving'
  | 'praise-av';

const STORAGE_KEY = 'praiseav_suite_zero_cost_db_v1';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('services');
  // PraiseAV uses a dark AV operator studio theme by default
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeThemePreset, setActiveThemePreset] = useState<PraiseAVThemePreset>(
    PRAISEAV_THEME_PRESETS[0]
  );

  const [plans, setPlans] = useState<ServicePlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.plans) && parsed.plans.length > 0) return parsed.plans;
      }
    } catch {
      // Fallback to default
    }
    return INITIAL_SERVICE_PLANS;
  });

  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) return parsed.songs;
      }
    } catch {
      // Fallback
    }
    return INITIAL_SONGS;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.members) && parsed.members.length > 0) return parsed.members;
      }
    } catch {
      // Fallback
    }
    return INITIAL_MEMBERS;
  });

  const [childrenList, setChildrenList] = useState<CheckInChild[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.childrenList)) return parsed.childrenList;
      }
    } catch {
      // Fallback
    }
    return INITIAL_CHECKINS;
  });

  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.smallGroups)) return parsed.smallGroups;
      }
    } catch {
      // Fallback
    }
    return INITIAL_SMALL_GROUPS;
  });

  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.roomBookings)) return parsed.roomBookings;
      }
    } catch {
      // Fallback
    }
    return INITIAL_ROOM_BOOKINGS;
  });

  const [donations, setDonations] = useState<DonationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.donations)) return parsed.donations;
      }
    } catch {
      // Fallback
    }
    return INITIAL_DONATIONS;
  });

  const [activePlanId, setActivePlanId] = useState<string>(
    plans[0]?.id || 'plan-2026-11-01'
  );

  const [liveState, setLiveState] = useState<PraiseAVLiveState>({
    connected: true,
    connectionMode: 'broadcast-channel',
    wsEndpoint: 'ws://127.0.0.1:7890/praise-av',
    activePlanId: plans[0]?.id || 'plan-2026-11-01',
    activeItemIndex: 1,
    activeSlideIndex: 0,
    blackout: false,
    clearText: false,
    logoOverlay: false,
    stageMessage: '',
    lastPingTimestamp: '08:55:12',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Sync Dark Mode class and PraiseAV custom theme CSS variables on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--praiseav-primary', activeThemePreset.primaryHex);
    root.style.setProperty('--praiseav-secondary', activeThemePreset.secondaryHex);
  }, [darkMode, activeThemePreset]);

  // Persist entire church database locally ($0 hosting cost)
  useEffect(() => {
    try {
      const payload = {
        plans,
        songs,
        members,
        childrenList,
        smallGroups,
        roomBookings,
        donations,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota warnings
    }
  }, [plans, songs, members, childrenList, smallGroups, roomBookings, donations]);

  // Initialize BroadcastChannel for PraiseAV Live Bridge
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('praise_av_bridge_v1');
      broadcastRef.current = channel;
      return () => channel.close();
    }
  }, []);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];

  const handleUpdateLiveState = (next: Partial<PraiseAVLiveState>) => {
    setLiveState((prev) => {
      const merged = { ...prev, ...next };
      if (broadcastRef.current && activePlan) {
        const item =
          activePlan.items[merged.activeItemIndex] || activePlan.items[0];
        const slides = item ? compileServiceItemSlides(item, songs) : [];
        broadcastRef.current.postMessage({
          event: 'PRAISE_AV_SLIDE_TRIGGER',
          timestamp: new Date().toISOString(),
          servicePlanId: activePlan.id,
          serviceTitle: activePlan.title,
          itemIndex: merged.activeItemIndex,
          itemTitle: item?.title,
          slideIndex: merged.activeSlideIndex,
          currentSlide: slides[merged.activeSlideIndex] || slides[0] || null,
          nextSlide: slides[merged.activeSlideIndex + 1] || null,
          displayFlags: {
            blackout: merged.blackout,
            clearText: merged.clearText,
          },
          congregationAndPreacherAlert: merged.stageMessage || null,
        });
      }
      return merged;
    });
  };

  const handleUpdatePlan = (updated: ServicePlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreatePlan = (newPlan: ServicePlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
  };

  const handleAddSongToActiveService = (song: Song, chosenKey: string) => {
    if (!activePlan) return;
    const newItem: ServiceItem = {
      id: `item-song-${Date.now()}`,
      type: 'song',
      title: song.title,
      subtitle: `Key of ${chosenKey} · ${song.bpm} BPM`,
      durationSeconds: 270,
      leader: 'Hannah Vance',
      songId: song.id,
      musicalKey: chosenKey,
      stageNotes: `Arrangement: ${song.arrangement.join(' -> ')}`,
      audioCue: `Click ${song.bpm} BPM (${song.timeSignature})`,
      lightingCue: 'Worship Deep Navy + Warm Key',
    };
    handleUpdatePlan({
      ...activePlan,
      items: [...activePlan.items, newItem],
    });
  };

  const handleToggleChildCheckIn = (childId: string) => {
    const nowHHMM = new Date().toTimeString().slice(0, 5);
    setChildrenList((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c;
        const currentlyIn = Boolean(c.checkedInAt && !c.checkedOutAt);
        return {
          ...c,
          checkedInAt: currentlyIn ? null : nowHHMM,
          checkedOutAt: currentlyIn ? nowHHMM : null,
        };
      })
    );
  };

  const handlePageParentOnPraiseAV = (
    securityCode: string,
    childName: string,
    room: string
  ) => {
    handleUpdateLiveState({
      stageMessage: `PARENT PICKUP CODE ${securityCode} (${room})`,
      lastPingTimestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleExportFullDatabase = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      platform: 'PraiseAV Suite — Zero-Cost Church Management & PraiseAV (praiseav.com) Sync',
      plans,
      songs,
      members,
      childrenList,
      smallGroups,
      roomBookings,
      donations,
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `praiseav-suite-church-database-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDatabaseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (Array.isArray(parsed.plans)) setPlans(parsed.plans);
        if (Array.isArray(parsed.songs)) setSongs(parsed.songs);
        if (Array.isArray(parsed.members)) setMembers(parsed.members);
        if (Array.isArray(parsed.childrenList)) setChildrenList(parsed.childrenList);
        if (Array.isArray(parsed.smallGroups)) setSmallGroups(parsed.smallGroups);
        if (Array.isArray(parsed.roomBookings)) setRoomBookings(parsed.roomBookings);
        if (Array.isArray(parsed.donations)) setDonations(parsed.donations);
      } catch {
        // Invalid JSON file
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPlans(INITIAL_SERVICE_PLANS);
    setSongs(INITIAL_SONGS);
    setMembers(INITIAL_MEMBERS);
    setChildrenList(INITIAL_CHECKINS);
    setSmallGroups(INITIAL_SMALL_GROUPS);
    setRoomBookings(INITIAL_ROOM_BOOKINGS);
    setDonations(INITIAL_DONATIONS);
    setActivePlanId(INITIAL_SERVICE_PLANS[0].id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* Mandatory 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('services');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          PraiseAV Suite
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveModule('services')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 ${
              activeModule === 'services'
                ? 'text-sky-600 dark:text-sky-400 underline font-semibold'
                : ''
            }`}
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('songs')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 ${
              activeModule === 'songs'
                ? 'text-sky-600 dark:text-sky-400 underline font-semibold'
                : ''
            }`}
          >
            Songs
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('people')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 ${
              activeModule === 'people'
                ? 'text-sky-600 dark:text-sky-400 underline font-semibold'
                : ''
            }`}
          >
            People & Rotas
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('checkins')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 ${
              activeModule === 'checkins'
                ? 'text-sky-600 dark:text-sky-400 underline font-semibold'
                : ''
            }`}
          >
            Check-Ins
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('groups-giving')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 underline-offset-8 ${
              activeModule === 'groups-giving'
                ? 'text-sky-600 dark:text-sky-400 underline font-semibold'
                : ''
            }`}
          >
            Groups & Giving
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModule('praise-av')}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0"
          >
            PraiseAV & Drive Sync
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Sidebar (260px) + Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Navigation & Zero-Cost Storage Controls Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div>
              <div className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
                PraiseAV Church Suite
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveModule('services')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'services'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <ListMusic className="w-4 h-4" />
                    Services & Order
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{plans.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('songs')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'songs'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Music className="w-4 h-4" />
                    Songs & ChordPro
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{songs.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('people')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'people'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    People & Rotas
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{members.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('checkins')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'checkins'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    Kids Check-Ins
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {childrenList.filter((c) => c.checkedInAt && !c.checkedOutAt).length}/
                    {childrenList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('groups-giving')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'groups-giving'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <HeartHandshake className="w-4 h-4" />
                    Groups, Rooms & Giving
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {smallGroups.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('praise-av')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeModule === 'praise-av'
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Cloud className="w-4 h-4" />
                    PraiseAV & Google Drive
                  </span>
                  <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                    Live
                  </span>
                </button>
              </div>
            </div>

            {/* Active PraiseAV Quick Status Card */}
            {activePlan && (
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Active PraiseAV Cue</span>
                  <a
                    href="https://praiseav.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    praiseav.com
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activePlan.items[liveState.activeItemIndex]?.title ||
                    activePlan.items[0]?.title}
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  Slide {liveState.activeSlideIndex + 1} · {activePlan.date}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('praise-av')}
                  className="w-full py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Open PraiseAV & Drive →
                </button>
              </div>
            )}
          </div>

          {/* Zero-Cost Local Storage & Portability Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              $0 Local + Drive Sync & Theme
            </div>

            <button
              type="button"
              onClick={handleExportFullDatabase}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Backup Church DB (.json)
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore / Sync DB File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportDatabaseFile}
              className="hidden"
            />

            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Daylight Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sky-600" />
                    PraiseAV Dark
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetDemoData}
                title="Reset to default sample church data"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeModule === 'services' && (
            <ServicesWorkspace
              plans={plans}
              activePlanId={activePlanId}
              onSelectPlan={setActivePlanId}
              onUpdatePlan={handleUpdatePlan}
              onCreatePlan={handleCreatePlan}
              songs={songs}
              members={members}
              onPushItemToLiveAV={(planId, itemIdx, slideIdx = 0) => {
                setActivePlanId(planId);
                handleUpdateLiveState({
                  activePlanId: planId,
                  activeItemIndex: itemIdx,
                  activeSlideIndex: slideIdx,
                  lastPingTimestamp: new Date().toLocaleTimeString(),
                });
              }}
              onOpenPraiseAVConsole={() => setActiveModule('praise-av')}
            />
          )}

          {activeModule === 'songs' && (
            <SongLibraryWorkspace
              songs={songs}
              onAddSong={(newSong) => setSongs((prev) => [newSong, ...prev])}
              onUpdateSong={(updatedSong) =>
                setSongs((prev) =>
                  prev.map((s) => (s.id === updatedSong.id ? updatedSong : s))
                )
              }
              onAddSongToActiveService={handleAddSongToActiveService}
            />
          )}

          {activeModule === 'people' && (
            <PeopleAndRotasWorkspace
              members={members}
              onAddMember={(m) => setMembers((prev) => [m, ...prev])}
              onUpdateMember={(updated) =>
                setMembers((prev) =>
                  prev.map((m) => (m.id === updated.id ? updated : m))
                )
              }
            />
          )}

          {activeModule === 'checkins' && (
            <CheckInsWorkspace
              childrenList={childrenList}
              onToggleCheckIn={handleToggleChildCheckIn}
              onAddChild={(c) => setChildrenList((prev) => [c, ...prev])}
              onPageParentOnPraseAV={handlePageParentOnPraiseAV}
            />
          )}

          {activeModule === 'groups-giving' && (
            <GroupsAndGivingWorkspace
              smallGroups={smallGroups}
              onAddSmallGroup={(sg) => setSmallGroups((prev) => [sg, ...prev])}
              roomBookings={roomBookings}
              onAddRoomBooking={(rb) => setRoomBookings((prev) => [rb, ...prev])}
              donations={donations}
              onAddDonation={(don) => setDonations((prev) => [don, ...prev])}
            />
          )}

          {activeModule === 'praise-av' && activePlan && (
            <PraseAVBridgeWorkspace
              activePlan={activePlan}
              songs={songs}
              liveState={liveState}
              onUpdateLiveState={handleUpdateLiveState}
              activeThemePreset={activeThemePreset}
              onSelectThemePreset={setActiveThemePreset}
              onImportSongsFromDriveJson={(imported) =>
                setSongs((prev) => [...imported, ...prev])
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
