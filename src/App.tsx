/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Headphones,
  Download,
  ExternalLink,
  HeartHandshake,
  ListMusic,
  MonitorPlay,
  Moon,
  Music,
  ShieldCheck,
  Sun,
  Upload,
  Users,
} from 'lucide-react';
import { CheckInsWorkspace } from './components/CheckInsWorkspace';
import { ChurchAdminPanel } from './components/ChurchAdminPanel';
import { ChurchGate } from './components/ChurchGate';
import { ChurchDirectoryWorkspace } from './components/ChurchDirectoryWorkspace';
import { GroupsAndGivingWorkspace } from './components/GroupsAndGivingWorkspace';
import { PeopleAndRotasWorkspace } from './components/PeopleAndRotasWorkspace';
import {
  PRAISEAV_THEME_PRESETS,
  PraiseAVThemePreset,
  PraseAVBridgeWorkspace,
} from './components/PraseAVBridgeWorkspace';
import { ServicesWorkspace } from './components/ServicesWorkspace';
import { SongLibraryWorkspace } from './components/SongLibraryWorkspace';
import { MusicStandWorkspace } from './components/MusicStandWorkspace';
import { OwnProfileForm } from './components/OwnProfileForm';
import {
  CheckInChild,
  DonationRecord,
  Member,
  RoomBooking,
  ServiceItem,
  ServicePlan,
  SmallGroup,
  Song,
} from './types/church';
import { ChurchSession, canRead, canWrite, churchInviteLink, clearChurchConnection, signOutChurch, churchRolesFromMembership } from './services/churchFirebase';
import { useChurchCollection } from './services/useChurchCollection';
import { SermonWorkspace } from './components/SermonWorkspace';
import { parseChurchBackup } from './services/backup';
import {readSermonDrafts,restoreSermonDrafts} from './services/sermonBackup';
import { doc, onSnapshot } from 'firebase/firestore';

type ActiveModule =
  | 'services'
  | 'songs'
  | 'band'
  | 'sermons'
  | 'people'
  | 'directory'
  | 'checkins'
  | 'groups-giving'
  | 'praise-av';

const MODULE_TITLES: Record<ActiveModule, string> = {
  services: 'Service planning',
  songs: 'Song library',
  band: 'Band stand',
  sermons: 'My sermon & tablet',
  people: 'People & rotas',
  directory: 'Church directory',
  checkins: 'Kids check-ins',
  'groups-giving': 'Groups, rooms & giving',
  'praise-av': 'PraiseAV export',
};

function defaultModule(session: ChurchSession | null): ActiveModule {
  if (!session) return 'services';
  if (session.roles.includes('preacher') && !session.roles.some(role=>['planner','admin'].includes(role))) return 'sermons';
  if (session.roles.includes('musician') && !session.roles.some((role) => role === 'planner' || role === 'av' || role === 'admin')) return 'band';
  if (canRead(session, 'plans')) return 'services';
  if (canRead(session, 'members')) return 'people';
  if (canRead(session, 'checkins')) return 'checkins';
  if (canRead(session, 'groups') || canRead(session, 'donations')) return 'groups-giving';
  return 'directory';
}

function SuiteWorkspace({ session, onExit }: { session: ChurchSession; onExit: () => void }) {
  const [activeModule, setActiveModule] = useState<ActiveModule>(() => {
    const view=new URLSearchParams(location.search).get('view');
    if(view==='sermons' && (!session || canWrite(session,'plans') || session.roles.includes('preacher')))return 'sermons';
    return view==='band' && (!session || canRead(session,'plans') && canRead(session,'songs')) ? 'band' : defaultModule(session);
  });
  const [darkMode, setDarkMode] = useState(true);
  const [activeThemePreset, setActiveThemePreset] = useState<PraiseAVThemePreset>(PRAISEAV_THEME_PRESETS[0]);
  const [dataError, setDataError] = useState('');
  const [plans, setPlans, plansReady] = useChurchCollection<ServicePlan>(session, 'plans', [], setDataError);
  const [songs, setSongs, songsReady] = useChurchCollection<Song>(session, 'songs', [], setDataError);
  const [members, setMembers, membersReady] = useChurchCollection<Member>(session, 'members', [], setDataError);
  const [childrenList, setChildrenList, checkinsReady] = useChurchCollection<CheckInChild>(session, 'checkins', [], setDataError);
  const [smallGroups, setSmallGroups, groupsReady] = useChurchCollection<SmallGroup>(session, 'groups', [], setDataError);
  const [roomBookings, setRoomBookings, bookingsReady] = useChurchCollection<RoomBooking>(session, 'bookings', [], setDataError);
  const [donations, setDonations, donationsReady] = useChurchCollection<DonationRecord>(session, 'donations', [], setDataError);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const moduleAllowed = (module: ActiveModule) => !session
    || module === 'directory'
    || (module === 'sermons' && (canWrite(session,'plans') || session.roles.includes('preacher')))
    || (module === 'praise-av' && canRead(session, 'plans') && canRead(session, 'songs'))
    || (module === 'services' && canRead(session, 'plans'))
    || (module === 'songs' && canRead(session, 'songs'))
    || (module === 'band' && canRead(session, 'plans') && canRead(session, 'songs'))
    || (module === 'people' && canRead(session, 'members'))
    || (module === 'checkins' && canRead(session, 'checkins'))
    || (module === 'groups-giving' && (canRead(session, 'groups') || canRead(session, 'donations')));
  useEffect(() => {
    if (!moduleAllowed(activeModule)) setActiveModule(defaultModule(session));
  }, [session, activeModule]);
  const dataReady = [plansReady, songsReady, membersReady, checkinsReady, groupsReady, bookingsReady, donationsReady].every(Boolean);
  const [activePlanId, setActivePlanId] = useState<string>(() => new URLSearchParams(location.search).get('plan') || plans[0]?.id || '');

  const [preview, setPreview] = useState({
    activeItemIndex: 0,
    activeSlideIndex: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const shareUrl = session && activePlan && canWrite(session, 'plans') ? (() => {
    const url = new URL(churchInviteLink(session.connection));
    url.searchParams.set('view', 'band');
    url.searchParams.set('plan', activePlan.id);
    return url.toString();
  })() : undefined;

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
      id: 'item-song-' + crypto.randomUUID(),
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

  const handleExportFullDatabase = async () => {
    if(!dataReady){setDataError('Wait for church records to finish loading before making a backup.');return;}
    try {
    const sermonDrafts=session?await readSermonDrafts(session,plans.map(plan=>plan.id)):undefined;
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      platform: 'PraiseAV Suite church backup',
      ...(sermonDrafts && {sermonDrafts}),
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
    }catch(error){setDataError('Could not create the complete backup: '+String(error));}
  };

  const handleImportDatabaseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setDataError('Backup file exceeds the 20 MB import limit.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setDataError('Could not read the backup file.');
    reader.onload = async () => {
      try {
        const parsed = parseChurchBackup(JSON.parse(String(reader.result)));
        if (session && !confirm('Restore this backup into ' + session.connection.churchName + '? Records with the same IDs will be replaced, and records missing from the backup will be removed. Download a backup of the current church first.')) return;
        if(session && parsed.sermonDrafts)await restoreSermonDrafts(session,[...plans.map(plan=>plan.id),...parsed.plans.map(plan=>plan.id)],parsed.sermonDrafts);
        setPlans(parsed.plans);
        setSongs(parsed.songs);
        setMembers(parsed.members);
        setChildrenList(parsed.childrenList);
        setSmallGroups(parsed.smallGroups);
        setRoomBookings(parsed.roomBookings);
        setDonations(parsed.donations);
        setDataError(session && !parsed.sermonDrafts?'This older backup has no private sermon drafts. Existing drafts have been kept.':'');
      } catch (failure) {
        setDataError('Could not restore backup: ' + String(failure));
      }
    };
    reader.readAsText(file);
  };

  if (session && !dataReady) return <main className="p-8">Opening {session.connection.churchName}…</main>;

  return (
    <div className="suite-shell min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* Suite identity, current section, and account actions */}
      <header className="suite-topbar flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        {/* Suite identity */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('services');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          <img className="w-44 h-auto dark:hidden" src={import.meta.env.BASE_URL + 'branding/suite-horizontal-light.svg'} alt="PraiseAV Suite" />
          <img className="hidden w-44 h-auto dark:block" src={import.meta.env.BASE_URL + 'branding/suite-horizontal-dark.svg'} alt="PraiseAV Suite" />
        </a>

        <div className="suite-topbar-context" aria-live="polite">
          <span className="suite-topbar-kicker">{session.connection.churchName}</span>
          <span className="suite-topbar-page">{MODULE_TITLES[activeModule]}</span>
        </div>

        {/* Account and export actions */}
        <div className="flex items-center gap-3 shrink-0">
          <a className="text-xs underline" href="https://github.com/onemadpunk/PraiseAV_Suite/blob/main/docs/workflows.md" target="_blank" rel="noreferrer">Help</a>
          {session && <button type="button" className="px-3 py-2 text-xs border rounded-lg" onClick={() => setShowProfile(true)}>My details</button>}
          {session && (session.owner || session.roles.includes('admin') || session.roles.includes('office_staff')) && <button type="button" className="px-3 py-2 text-xs border rounded-lg" onClick={() => setShowAdmin(true)}>Church access</button>}
          {moduleAllowed('praise-av') && <button
            type="button"
            onClick={() => setActiveModule('praise-av')}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0"
          >
            PraiseAV export
          </button>}
        </div>
      </header>
      {dataError && <div role="alert" className="px-6 py-2 bg-red-100 text-red-800 text-sm">Could not save or load church data: {dataError} <button className="underline ml-2" onClick={() => setDataError('')}>Dismiss</button></div>}

      {/* Workspace Body: Left Sidebar (260px) + Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Navigation & Zero-Cost Storage Controls Sidebar */}
        <aside className="suite-sidebar w-full lg:w-64 shrink-0 bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div>
              <div className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
                PraiseAV Church Suite
              </div>
              <nav className="suite-nav space-y-1" aria-label="Suite sections">
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

                <button type="button" onClick={() => setActiveModule('band')} className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-lg ${activeModule === 'band' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Headphones className="w-4 h-4 mr-2.5" /> Band stand
                </button>
                {moduleAllowed('sermons') && <button type="button" onClick={()=>setActiveModule('sermons')} className="w-full text-left px-3 py-2 text-xs rounded-lg">My sermon & tablet</button>}
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

                {session && <button type="button" onClick={() => setActiveModule('directory')} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg ${activeModule === 'directory' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Users className="w-4 h-4" /> Church directory</button>}

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
                    PraiseAV export
                  </span>
                  <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                    File
                  </span>
                </button>
              </nav>
            </div>

            {/* Active PraiseAV Quick Status Card */}
            {activePlan && (
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Selected Suite cue</span>
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
                  {activePlan.items[preview.activeItemIndex]?.title ||
                    activePlan.items[0]?.title}
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  Slide {preview.activeSlideIndex + 1} · {activePlan.date}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('praise-av')}
                  className="w-full py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Open export guide →
                </button>
              </div>
            )}
          </div>

          {/* Zero-Cost Local Storage & Portability Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Church data and appearance
            </div>

            {(!session || session.owner || session.roles.includes('admin')) && <button
              type="button"
              onClick={handleExportFullDatabase}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download church backup (.json)
            </button>}

            {(!session || session.owner || session.roles.includes('admin')) && <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore backup file
            </button>}
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


            </div>
            <button className="text-xs underline px-3 py-1" onClick={onExit}>Sign out / switch church</button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="suite-main flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {!moduleAllowed(activeModule) ? <p role="status">Your church role does not include this area. Ask a church administrator if you need access.</p> : <>
          {activeModule === 'services' && (
            <ServicesWorkspace
              plans={plans}
              activePlanId={activePlanId}
              onSelectPlan={setActivePlanId}
              onUpdatePlan={handleUpdatePlan}
              onCreatePlan={handleCreatePlan}
              songs={songs}
              members={members}
              shareUrl={shareUrl}
              onPushItemToLiveAV={(planId, itemIdx, slideIdx = 0) => {
                setActivePlanId(planId);
                setPreview({ activeItemIndex: itemIdx, activeSlideIndex: slideIdx });
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

          {activeModule === 'band' && <MusicStandWorkspace plans={plans} songs={songs} initialPlanId={activePlanId} userEmail={session?.user.email || ''} churchId={session?.connection.config.projectId} />}
          {activeModule === 'sermons' && <SermonWorkspace plans={plans} session={session} onUpdatePlan={handleUpdatePlan} initialPlanId={activePlanId}/>}

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

          {activeModule === 'directory' && session && <ChurchDirectoryWorkspace session={session} onEdit={() => setShowProfile(true)} />}

          {activeModule === 'checkins' && (
            <CheckInsWorkspace
              childrenList={childrenList}
              onToggleCheckIn={handleToggleChildCheckIn}
              onAddChild={(c) => setChildrenList((prev) => [c, ...prev])}
            />
          )}

          {activeModule === 'groups-giving' && (
            <GroupsAndGivingWorkspace
              smallGroups={smallGroups}
              onAddSmallGroup={(sg) => setSmallGroups((prev) => [sg, ...prev])}
              roomBookings={roomBookings}
              onAddRoomBooking={(rb) => setRoomBookings((prev) => [rb, ...prev])}
              donations={donations}
              canSeeGroups={!session || canRead(session, 'groups')}
              canSeeFinance={!session || canRead(session, 'donations')}
              canEditGroups={!session || canWrite(session, 'groups')}
              canEditFinance={!session || canWrite(session, 'donations')}
              onAddDonation={(don) => setDonations((prev) => [don, ...prev])}
            />
          )}

          {activeModule === 'praise-av' && (
            <PraseAVBridgeWorkspace
              suiteLink={shareUrl}
              activePlan={activePlan}
              songs={songs}
              activeThemePreset={activeThemePreset}
              onSelectThemePreset={setActiveThemePreset}
            />
          )}
          </>}
        </main>
      </div>
      {showAdmin && session && <ChurchAdminPanel session={session} onClose={() => setShowAdmin(false)} />}
      {showProfile && session && <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="My details"><div className="max-w-xl mx-auto bg-white dark:bg-[#111827] rounded-2xl p-6 space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">My details</h2><button type="button" aria-label="Close my details" onClick={() => setShowProfile(false)}>✕</button></div><OwnProfileForm session={session} /></div></div>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<ChurchSession | null>(null);
  const onReady = useCallback((ready: ChurchSession) => setSession(ready), []);
  useEffect(() => {
    if (!session || session.owner) return;
    return onSnapshot(doc(session.db, 'memberships', session.user.uid), (snapshot) => {
      const roles = churchRolesFromMembership(snapshot.data()?.roles);
      if (!snapshot.exists() || !roles.length) {
        setSession(null);
        return;
      }
      if (roles.join(',') !== session.roles.join(',')) setSession({ ...session, roles });
    }, () => setSession(null));
  }, [session]);
  const onExit = useCallback(() => {
    if (session) {
      void signOutChurch(session.connection);
      clearChurchConnection();
    }
    setSession(null);
  }, [session]);
  if (!session) return <ChurchGate onReady={onReady} />;
  return <SuiteWorkspace session={session} onExit={onExit} />;
}
