import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Download,
  MonitorPlay,
  Plus,
  Printer,
  Radio,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  Member,
  RotaAssignment,
  RotaDepartment,
  ServiceItem,
  ServiceItemType,
  ServicePlan,
  Song,
} from '../types/church';
import {
  addSecondsToClockTime,
  ALL_KEYS,
  calculateCapoSuggestions,
  compileServiceItemSlides,
  formatDurationMMSS,
  parseChordProForSheet,
  transposeChordPro,
} from '../utils/musicAndAv';
import { toPraiseAVService } from '../utils/praiseavService';
import { rotaConflicts } from '../utils/rotaConflicts';
import { effectiveRotaStatus, replyFor, type RotaReplyIndex } from '../utils/rotaReplies';
import { arrangeChordPro } from '../utils/songArrangement';
import { assignedEmailAddresses, emailFingerprint, serviceTeamMessage } from '../utils/serviceSharing';
import type { ChurchSession } from '../services/churchFirebase';
import { uploadCloudFile } from '../services/cloudFiles';
import { cloudFileKind } from '../utils/cloudFiles';
import { teamNoticeFor } from '../utils/teamNotices';

interface ServicesWorkspaceProps {
  plans: ServicePlan[];
  activePlanId: string;
  onSelectPlan: (id: string) => void;
  onUpdatePlan: (updated: ServicePlan) => void;
  onCreatePlan: (newPlan: ServicePlan) => void;
  songs: Song[];
  members: Member[];
  replyIndex?: RotaReplyIndex;
  shareUrl?: string;
  session?: ChurchSession | null;
  onPushItemToLiveAV: (planId: string, itemIndex: number, slideIndex?: number) => void;
  onOpenPraiseAVConsole: () => void;
}

export const ServicesWorkspace: React.FC<ServicesWorkspaceProps> = ({
  plans,
  activePlanId,
  onSelectPlan,
  onUpdatePlan,
  onCreatePlan,
  songs,
  members,
  replyIndex = {},
  shareUrl,
  session = null,
  onPushItemToLiveAV,
  onOpenPraiseAVConsole,
}) => {
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const [shareNotice, setShareNotice] = useState('');
  const teamMessage = activePlan && shareUrl ? serviceTeamMessage(activePlan, songs, shareUrl) : '';
  const teamEmails = activePlan ? assignedEmailAddresses(activePlan, members) : [];
  const teamMailto = teamMessage && teamEmails.length ? `mailto:?bcc=${encodeURIComponent(teamEmails.join(','))}&subject=${encodeURIComponent(activePlan.title + ' service plan')}&body=${encodeURIComponent(teamMessage)}` : '';
  const [selectedItemId, setSelectedItemId] = useState<string>(
    activePlan?.items[1]?.id || activePlan?.items[0]?.id || ''
  );
  const [inspectorTab, setInspectorTab] = useState<'slides' | 'chords' | 'cues'>('slides');
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [showAssignVolunteer, setShowAssignVolunteer] = useState(false);

  // Add Item Form State
  const [newItemType, setNewItemType] = useState<ServiceItemType>('song');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemSubtitle, setNewItemSubtitle] = useState('');
  const [newItemLeader, setNewItemLeader] = useState('');
  const [newItemMinutes, setNewItemMinutes] = useState(4);
  const [newItemSongId, setNewItemSongId] = useState(songs[0]?.id || '');
  const [newItemKey, setNewItemKey] = useState(songs[0]?.defaultKey || 'C');
  const [newItemScriptureRef, setNewItemScriptureRef] = useState('Romans 8:31–39');
  const [newItemScriptureTranslation, setNewItemScriptureTranslation] = useState<'NIV' | 'ESV' | 'KJV' | 'NLT'>('NIV');
  const [newItemScriptureText, setNewItemScriptureText] = useState('');
  const [newItemExternalMedia, setNewItemExternalMedia] = useState('');
  const [newItemStageNotes, setNewItemStageNotes] = useState('');
  const [newItemAudioCue, setNewItemAudioCue] = useState('Standard Mic Bus');
  const [newItemLightingCue, setNewItemLightingCue] = useState('Sanctuary Warm Wash');

  // New Service Plan State
  const [planTitleInput, setPlanTitleInput] = useState('');
  const [planSeriesInput, setPlanSeriesInput] = useState('');
  const [planDateInput, setPlanDateInput] = useState(new Date().toLocaleDateString('en-CA'));
  const [planTimeInput, setPlanTimeInput] = useState('10:30');

  // Volunteer Assignment State
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [selectedDepartment, setSelectedDepartment] = useState<RotaDepartment>('Band & Vocals');
  const [selectedRole, setSelectedRole] = useState('Worship Leader');
  // Declared with the other hooks: the empty-church screen below returns early, and a hook after it
  // crashes the page when the first service is created.
  const [fileNotice, setFileNotice] = useState('');

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitleInput.trim()) return;
    const created: ServicePlan = {
      id: 'plan-' + crypto.randomUUID(),
      title: planTitleInput.trim(),
      seriesTitle: planSeriesInput.trim(),
      date: planDateInput,
      serviceTimes: [planTimeInput],
      targetDurationMinutes: 75,
      items: [],
      rota: [],
    };
    onCreatePlan(created);
    setPlanTitleInput('');
    setShowNewPlanForm(false);
  };

  if (!activePlan) return (
    <div className="space-y-6">
      <div className="suite-page-header">
        <div className="suite-eyebrow">Worship planning / Services</div>
        <h1>Make space for what matters</h1>
        <p>Create your first service plan to bring the order, people and PraiseAV cues together.</p>
      </div>
      <section className="suite-empty-state" aria-labelledby="first-service-title">
        <div className="suite-empty-icon"><CalendarDays aria-hidden="true" size={28} /></div>
        <div className="suite-eyebrow">Your church workspace is ready</div>
        <h2 id="first-service-title">Start with a service</h2>
        <p>Add a date and gathering time. You can build the order and add songs and volunteers afterwards.</p>
        {!showNewPlanForm && <button type="button" className="suite-empty-primary" onClick={() => setShowNewPlanForm(true)}><Plus size={16} /> Create first service plan</button>}
        {showNewPlanForm && (
          <form onSubmit={handleCreatePlanSubmit} className="suite-empty-form">
            <label>Service name<input required placeholder="Sunday morning" value={planTitleInput} onChange={(e) => setPlanTitleInput(e.target.value)} /></label>
            <label>Date<input required type="date" value={planDateInput} onChange={(e) => setPlanDateInput(e.target.value)} /></label>
            <label>Start time<input required type="time" value={planTimeInput} onChange={(e) => setPlanTimeInput(e.target.value)} /></label>
            <div className="suite-empty-form-actions">
              <button type="button" onClick={() => setShowNewPlanForm(false)}>Cancel</button>
              <button type="submit" className="suite-empty-primary">Create service</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );

  const selectedMember = members.find((member) => member.id === selectedMemberId) || members[0];
  const assignmentWarnings = selectedMember ? rotaConflicts(selectedMember, activePlan, plans) : [];
  const selectedItemIndex = activePlan.items.findIndex((i) => i.id === selectedItemId);
  const selectedItem =
    activePlan.items[selectedItemIndex !== -1 ? selectedItemIndex : 0] || activePlan.items[0];

  const totalPlannedSeconds = activePlan.items.reduce((acc, item) => acc + item.durationSeconds, 0);
  const totalPlannedMinutes = Math.round(totalPlannedSeconds / 60);
  const baseServiceStart = activePlan.serviceTimes[0] || '09:00';

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activePlan.items.length) return;
    const nextItems = [...activePlan.items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(targetIndex, 0, moved);
    onUpdatePlan({ ...activePlan, items: nextItems });
  };

  const handleDeleteItem = (id: string) => {
    const nextItems = activePlan.items.filter((i) => i.id !== id);
    onUpdatePlan({ ...activePlan, items: nextItems });
    if (selectedItemId === id && nextItems[0]) {
      setSelectedItemId(nextItems[0].id);
    }
  };

  // A PowerPoint or PDF for a presentation item, sent through the church cloud (works on an iPad).
  const handlePresentationFile = async (itemId: string, file: File) => {
    if (!session) { setFileNotice('Sign in to the church’s Suite to send the file to the booth.'); return; }
    if (cloudFileKind(file.name) !== 'presentation') { setFileNotice('Choose a PowerPoint (.pptx or .ppt), .odp or PDF file.'); return; }
    try {
      const entry = await uploadCloudFile(session, activePlan.id, file, (done, total) => setFileNotice(`Sending ${file.name}: ${Math.round((done / total) * 100)}%`));
      onUpdatePlan({ ...activePlan, items: activePlan.items.map((item) => item.id === itemId ? { ...item, externalMediaName: file.name, presentationFile: entry } : item) });
      setFileNotice(`${file.name} is in the church cloud. Send the service to the booth and PraiseAV makes the slides from it.`);
    } catch (error) {
      setFileNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const handleKeyChangeOnItem = (itemId: string, nextKey: string) => {
    const nextItems = activePlan.items.map((item) =>
      item.id === itemId ? { ...item, musicalKey: nextKey } : item
    );
    onUpdatePlan({ ...activePlan, items: nextItems });
  };

  const handleArrangementChange = (itemId: string, value: string) => {
    const order = value.split(',').map((part) => part.trim()).filter(Boolean);
    const nextItems = activePlan.items.map((item) => item.id === itemId ? { ...item, arrangementOverride: order.length ? order : undefined } : item);
    onUpdatePlan({ ...activePlan, items: nextItems });
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSong = songs.find((s) => s.id === newItemSongId);
    const resolvedTitle =
      newItemType === 'song' && chosenSong && !newItemTitle.trim()
        ? chosenSong.title
        : newItemTitle.trim() || 'Service Element';

    const created: ServiceItem = {
      id: 'item-' + crypto.randomUUID(),
      type: newItemType,
      title: resolvedTitle,
      subtitle: newItemSubtitle.trim() || undefined,
      durationSeconds: Math.max(30, newItemMinutes * 60),
      leader: newItemLeader,
      songId: newItemType === 'song' ? newItemSongId : undefined,
      musicalKey: newItemType === 'song' ? newItemKey : undefined,
      scriptureRef: newItemType === 'scripture' ? newItemScriptureRef : undefined,
      scriptureTranslation: newItemType === 'scripture' ? newItemScriptureTranslation : undefined,
      scriptureText: newItemType === 'scripture' ? newItemScriptureText : undefined,
      externalMediaName: newItemType === 'presentation' ? newItemExternalMedia : undefined,
      stageNotes: newItemStageNotes,
      audioCue: newItemAudioCue,
      lightingCue: newItemLightingCue,
    };

    const nextItems = [...activePlan.items, created];
    onUpdatePlan({ ...activePlan, items: nextItems });
    setSelectedItemId(created.id);
    setShowAddItemForm(false);
    setNewItemTitle('');
    setNewItemSubtitle('');
  };

  const handleExportPraiseBundle = () => {
    const bundle = toPraiseAVService(activePlan, songs, shareUrl);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePlan.date}-${activePlan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.praiseav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleRotaStatus = (rotaId: string) => {
    const order: Array<'Confirmed' | 'Pending' | 'Declined'> = ['Confirmed', 'Pending', 'Declined'];
    const nextRota = activePlan.rota.map((r) => {
      if (r.id !== rotaId) return r;
      const nextStatus = order[(order.indexOf(effectiveRotaStatus(activePlan, r, replyIndex)) + 1) % order.length];
      return { ...r, status: nextStatus };
    });
    onUpdatePlan({ ...activePlan, rota: nextRota });
  };

  const handleRemoveRota = (rotaId: string) => {
    onUpdatePlan({
      ...activePlan,
      rota: activePlan.rota.filter((r) => r.id !== rotaId),
    });
  };

  const handleAssignVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = selectedMember;
    if (!member) return;
    if (assignmentWarnings.length && !confirm('Check this assignment:\n' + assignmentWarnings.join('\n') + '\n\nAssign anyway?')) return;
    const newEntry: RotaAssignment = {
      id: 'rota-' + crypto.randomUUID(),
      memberId: member.id,
      memberName: member.fullName,
      memberEmailHash: await emailFingerprint(member.email),
      department: selectedDepartment,
      role: selectedRole,
      status: 'Pending',
    };
    onUpdatePlan({
      ...activePlan,
      rota: [...activePlan.rota, newEntry],
    });
    setShowAssignVolunteer(false);
  };

  const linkedSong =
    selectedItem?.type === 'song' && selectedItem.songId
      ? songs.find((s) => s.id === selectedItem.songId)
      : undefined;

  const activeMusicalKey = selectedItem?.musicalKey || linkedSong?.defaultKey || 'C';
  const compiledSlides = selectedItem ? compileServiceItemSlides(selectedItem, songs) : [];
  const transposedChordPro = linkedSong
    ? transposeChordPro(arrangeChordPro(linkedSong.chordPro, selectedItem.arrangementOverride || linkedSong.arrangement), linkedSong.defaultKey, activeMusicalKey)
    : '';
  const parsedChordSheet = linkedSong ? parseChordProForSheet(transposedChordPro) : [];
  const capoSuggestions = linkedSong ? calculateCapoSuggestions(activeMusicalKey) : [];

  let runningSeconds = 0;

  return (
    <div className="space-y-6">
      {/* Service plan overview and actions */}
      <div className="suite-service-hero">
        <div className="suite-service-hero-copy">
          <div className="suite-eyebrow">Worship planning <span aria-hidden="true">/</span> Services</div>
          <h1>Plan your next gathering</h1>
          <p>Shape the service, prepare your team, and send every cue to PraiseAV.</p>
          <div className="suite-service-picker">
            <span className="suite-picker-label">Current plan</span>
            <select
              aria-label="Select Service Plan"
              value={activePlan.id}
              onChange={(e) => {
                const nextPlan = plans.find((p) => p.id === e.target.value);
                onSelectPlan(e.target.value);
                if (nextPlan && nextPlan.items[0]) {
                  setSelectedItemId(nextPlan.items[0].id);
                }
              }}
              className="suite-plan-select text-xl font-bold tracking-tight bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.date} — {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewPlanForm(!showNewPlanForm)}
              className="suite-new-plan inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New plan
            </button>
          </div>
          <div className="suite-service-facts">
            <span>{activePlan.seriesTitle || 'No series'}</span>
            <span className="font-mono tabular-nums">{activePlan.date}</span>
            <span className="font-mono tabular-nums">{activePlan.serviceTimes.join(' & ')}</span>
          </div>
        </div>

        <div className="suite-service-hero-side">
          <div className="suite-runtime-card">
            <span>Planned runtime</span>
            <strong>{totalPlannedMinutes}<small> min</small></strong>
            <span>Target {activePlan.targetDurationMinutes} min</span>
          </div>
          <div className="suite-service-actions">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Print sheet
          </button>
          {session && activePlan.rota.length > 0 && (
            <button
              type="button"
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white"
              title="Everyone on this service's rota sees it in the Suite and can say whether they can serve."
              onClick={async () => {
                const resend = Boolean(activePlan.teamNotice);
                if (resend && !confirm('The team was told on ' + new Date(activePlan.teamNotice!.sentAt).toLocaleString() + '. Tell them again (for example after changing songs)?')) return;
                onUpdatePlan({ ...activePlan, teamNotice: teamNoticeFor(session.user.email || '') });
                // Emails come from the leader's own email (the church's data stays with the church):
                // their mail app opens with the whole rota in BCC, ready to send.
                if (teamMailto) window.location.href = teamMailto;
                setShareNotice('Done. Everyone on the rota sees “You’re on the rota” in the Suite, with the songs, keys and a button to say whether they can serve. ' + (teamMailto ? 'Your email app has opened with the team in BCC: press Send to email them too.' : 'Nobody on this rota has an email address on file, so no email was started.'));
              }}
            >
              {activePlan.teamNotice ? 'Tell the team again' : 'Let the team know'}
            </button>
          )}
          {shareUrl && <>
            <button type="button" className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg" onClick={async () => {
              try { await navigator.clipboard.writeText(teamMessage); setShareNotice('Service order and team link copied. Send it to your rota using your usual messaging app.'); }
              catch { setShareNotice('Could not copy the team message. Try Email team or your browser’s copy command.'); }
            }}>Copy team message</button>
            {teamMailto && <a className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg" href={teamMailto}>Email team ({teamEmails.length})</a>}
          </>}
          <button
            type="button"
            onClick={handleExportPraiseBundle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download .praiseav
          </button>
          <button
            type="button"
            onClick={() => {
              onPushItemToLiveAV(activePlan.id, Math.max(0, selectedItemIndex), 0);
              onOpenPraiseAVConsole();
            }}
            className="suite-preview-button inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Radio className="w-3.5 h-3.5" />
            Preview selected cue
          </button>
          </div>
        </div>
      </div>
      {shareNotice && <p role="status" className="text-sm rounded-lg border border-sky-400/50 p-3">{shareNotice}</p>}
      {fileNotice && <p role="status" className="text-sm rounded-lg border border-sky-400/50 p-3">{fileNotice}</p>}

      {/* Optional New Service Plan Form */}
      {showNewPlanForm && (
        <form
          onSubmit={handleCreatePlanSubmit}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Create New Sunday or Midweek Service Plan
            </h3>
            <button
              type="button"
              onClick={() => setShowNewPlanForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Service Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunday Morning"
                value={planTitleInput}
                onChange={(e) => setPlanTitleInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teaching Series
              </label>
              <input
                type="text"
                value={planSeriesInput}
                onChange={(e) => setPlanSeriesInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Service Date
              </label>
              <input
                type="date"
                required
                value={planDateInput}
                onChange={(e) => setPlanDateInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div><label className="block text-xs font-medium mb-1">Start time</label><input type="time" value={planTimeInput} onChange={(e) => setPlanTimeInput(e.target.value)} className="w-full px-3 py-2 border rounded text-slate-900" /></div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
            >
              Create Plan
            </button>
          </div>
        </form>
      )}

      {/* Main 12-Column Split: Left 7 Cols Order of Service + Rotas, Right 5 Cols Praise AV Slide & Chord Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Order of Service & Volunteer Rota */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Order of Service ({activePlan.items.length} Cues)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click a row to preview chords, notes, and slides before exporting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemForm(!showAddItemForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {showAddItemForm && (
              <form
                onSubmit={handleAddItemSubmit}
                className="p-5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Element Type
                    </label>
                    <select
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value as ServiceItemType)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      <option value="song">Worship Song (from Library)</option>
                      <option value="scripture">Bible reading (paste text you may display)</option>
                      <option value="sermon">Sermon & Preacher Timer Notes</option>
                      <option value="presentation">Guest presentation placeholder</option>
                      <option value="prayer">Prayer / Liturgy</option>
                      <option value="preservice">Pre-service item</option>
                      <option value="offering">Tithes & Offerings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Leader / Person Responsible
                    </label>
                    <input
                      type="text"
                      value={newItemLeader}
                      onChange={(e) => setNewItemLeader(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={newItemMinutes}
                      onChange={(e) => setNewItemMinutes(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                {newItemType === 'song' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Select Song from Library
                      </label>
                      <select
                        value={newItemSongId}
                        onChange={(e) => {
                          const s = songs.find((item) => item.id === e.target.value);
                          setNewItemSongId(e.target.value);
                          if (s) setNewItemKey(s.defaultKey);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        {songs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} (Default Key: {s.defaultKey} · {s.bpm} BPM)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Scheduled Key (Auto-Transposes)
                      </label>
                      <select
                        value={newItemKey}
                        onChange={(e) => setNewItemKey(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        {ALL_KEYS.map((k) => (
                          <option key={k} value={k}>
                            Key of {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {newItemType === 'scripture' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Scripture Reference
                        </label>
                        <input
                          type="text"
                          value={newItemScriptureRef}
                          onChange={(e) => {
                            setNewItemScriptureRef(e.target.value);
                            setNewItemTitle(`Scripture Reading: ${e.target.value} (${newItemScriptureTranslation})`);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Bible Translation
                        </label>
                        <select
                          value={newItemScriptureTranslation}
                          onChange={(e) =>
                            setNewItemScriptureTranslation(
                              e.target.value as 'NIV' | 'ESV' | 'KJV' | 'NLT'
                            )
                          }
                          className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                        >
                          <option value="NIV">NIV (Praise AV Default)</option>
                          <option value="ESV">ESV</option>
                          <option value="KJV">KJV</option>
                          <option value="NLT">NLT</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Passage Text (Automatically Paginated into Praise AV Slides)
                      </label>
                      <textarea
                        rows={3}
                        value={newItemScriptureText}
                        onChange={(e) => setNewItemScriptureText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {newItemType === 'presentation' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      External PowerPoint (.pptx) or Guest Speaker PDF Filename for Praise AV
                    </label>
                    <input
                      type="text"
                      value={newItemExternalMedia}
                      onChange={(e) => setNewItemExternalMedia(e.target.value)}
                      placeholder="e.g. Guest-Missionary-Update.pptx or Youth-Report.pdf"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}

                {newItemType !== 'song' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Item Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pastoral Prayer & Intercession"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Subtitle / Theme
                      </label>
                      <input
                        type="text"
                        placeholder="Optional subtitle"
                        value={newItemSubtitle}
                        onChange={(e) => setNewItemSubtitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Audio Cue
                    </label>
                    <input
                      type="text"
                      value={newItemAudioCue}
                      onChange={(e) => setNewItemAudioCue(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Lighting Cue
                    </label>
                    <input
                      type="text"
                      value={newItemLightingCue}
                      onChange={(e) => setNewItemLightingCue(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Stage / Praise AV Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Cue instructions..."
                      value={newItemStageNotes}
                      onChange={(e) => setNewItemStageNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                  >
                    Add to Order of Service
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                    <th className="py-2.5 pl-4 pr-2 w-16">Time</th>
                    <th className="py-2.5 px-2">Service Element & Cues</th>
                    <th className="py-2.5 px-2">Leader</th>
                    <th className="py-2.5 px-2 w-24">Key / Slides</th>
                    <th className="py-2.5 px-2 text-right w-16">Length</th>
                    <th className="py-2.5 pl-2 pr-4 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {activePlan.items.map((item, idx) => {
                    const itemClock = addSecondsToClockTime(baseServiceStart, runningSeconds);
                    runningSeconds += item.durationSeconds;
                    const isSelected = item.id === selectedItem?.id;
                    const itemSlidesCount = compileServiceItemSlides(item, songs).length;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3 pl-4 pr-2 font-mono tabular-nums text-slate-500 dark:text-slate-400 align-top">
                          {itemClock}
                        </td>
                        <td className="py-3 px-2 align-top">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {idx + 1}. {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="capitalize">{item.type}</span>
                            {item.subtitle && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span>{item.subtitle}</span>
                              </>
                            )}
                            <span aria-hidden="true"> · </span>
                            <span>{item.audioCue}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-700 dark:text-slate-300 align-top whitespace-nowrap">
                          {item.leader}
                        </td>
                        <td className="py-3 px-2 align-top whitespace-nowrap">
                          {item.type === 'song' ? (
                            <div
                              className="inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[11px] text-slate-500">Key:</span>
                              <select
                                aria-label={`Musical key for ${item.title}`}
                                value={item.musicalKey || 'C'}
                                onChange={(e) => handleKeyChangeOnItem(item.id, e.target.value)}
                                className="font-mono font-semibold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-indigo-600 dark:text-indigo-400"
                              >
                                {ALL_KEYS.map((k) => (
                                  <option key={k} value={k}>
                                    {k}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : item.type === 'presentation' ? (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400" onClick={(e) => e.stopPropagation()}>
                              <div>{item.presentationFile ? `File: ${item.presentationFile.name}` : 'No file yet'}</div>
                              {session && (
                                <label className="cursor-pointer text-indigo-600 dark:text-indigo-400 underline">
                                  {item.presentationFile ? 'Replace file' : 'Add PowerPoint or PDF'}
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept=".pptx,.ppt,.odp,.pdf"
                                    onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void handlePresentationFile(item.id, file); }}
                                  />
                                </label>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {itemSlidesCount} {itemSlidesCount === 1 ? 'slide' : 'slides'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 align-top">
                          {formatDurationMMSS(item.durationSeconds)}
                        </td>
                        <td
                          className="py-3 pl-2 pr-4 text-right align-top whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="Preview this cue"
                              onClick={() => onPushItemToLiveAV(activePlan.id, idx, 0)}
                              className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded"
                            >
                              <MonitorPlay className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Move Up"
                              disabled={idx === 0}
                              onClick={() => handleMoveItem(idx, -1)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Move Down"
                              disabled={idx === activePlan.items.length - 1}
                              onClick={() => handleMoveItem(idx, 1)}
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 rounded"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove Item"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Rota & Conflict Check Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Service Volunteer Rota & Band Lineup ({activePlan.rota.length} Assigned)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any volunteer status to cycle Confirmed · Pending · Declined
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignVolunteer(!showAssignVolunteer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign Volunteer
              </button>
            </div>

            {showAssignVolunteer && (
              <form
                onSubmit={handleAssignVolunteerSubmit}
                className="p-4 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Team Member
                  </label>
                  <select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                      const m = members.find((mem) => mem.id === e.target.value);
                      setSelectedMemberId(e.target.value);
                      if (m && m.qualifiedRoles[0]) {
                        setSelectedRole(m.qualifiedRoles[0]);
                      }
                      if (m && m.departments[0]) {
                        setSelectedDepartment(m.departments[0]);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    {members.map((m) => {
                      const hasBlockout = m.blockoutDates.includes(activePlan.date);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.fullName} {hasBlockout ? '(BLOCKOUT DATE!)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value as RotaDepartment)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Band & Vocals">Band & Vocals</option>
                    <option value="Praise AV & Tech">Praise AV & Tech</option>
                    <option value="Hospitality & Welcome">Hospitality & Welcome</option>
                    <option value="Kids & Youth">Kids & Youth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Serving Role
                  </label>
                  <input
                    type="text"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                  >
                    Add to Rota
                  </button>
                </div>
                {assignmentWarnings.length > 0 && <p role="alert" className="text-xs text-amber-600 col-span-full">{assignmentWarnings.join(' ')}</p>}
              </form>
            )}

            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {activePlan.rota.map((r) => {
                const memberObj = members.find((m) => m.id === r.memberId);
                const isBlockedOut = memberObj?.blockoutDates.includes(activePlan.date);
                const reply = replyFor(activePlan, r, replyIndex);
                const shown = effectiveRotaStatus(activePlan, r, replyIndex);

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {r.memberName}
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {' '}
                          · {r.role} · {r.department}
                        </span>
                      </div>
                      {reply && (
                        <div className={`text-[11px] font-medium mt-0.5 ${reply.status === 'Confirmed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {reply.status === 'Confirmed' ? 'Replied: can serve' : 'Replied: can’t make it'}{shown !== reply.status ? ' (you set ' + r.status + ')' : ''}
                        </div>
                      )}
                      {isBlockedOut && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          Warning: Member has a registered blockout date on {activePlan.date}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleRotaStatus(r.id)}
                        className={`text-xs font-medium underline-offset-4 hover:underline ${
                          shown === 'Confirmed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : shown === 'Pending'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        Status: {shown}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRota(r.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Unassign Volunteer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Praise AV Slide Deck & Transposed Chord Sheet Inspector */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden sticky top-6">
          {selectedItem ? (
            <div>
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    Selected Cue · {selectedItem.type} · Leader: {selectedItem.leader}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {formatDurationMMSS(selectedItem.durationSeconds)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedItem.title}
                </h3>

                {/* Functional Segmented Tab Bar */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mt-2">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('slides')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      inspectorTab === 'slides'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Praise AV Slides ({compiledSlides.length})
                  </button>
                  {linkedSong && (
                    <button
                      type="button"
                      onClick={() => setInspectorTab('chords')}
                      className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        inspectorTab === 'chords'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Chord Chart (Key of {activeMusicalKey})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectorTab('cues')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      inspectorTab === 'cues'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Tech & Stage Cues
                  </button>
                </div>
              </div>

              {/* Tab 1: Praise AV Slide Deck Preview */}
              {inspectorTab === 'slides' && (
                <div className="p-5 space-y-4 max-h-[620px] overflow-y-auto">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Click a slide to select it in this Suite preview</span>
                    <span className="font-mono tabular-nums">Suite preview, not live output</span>
                  </div>

                  {compiledSlides.length === 0 && <p role="status" className="p-3 rounded border border-amber-400 text-sm">No song words have been entered. Add words your church is licensed to use in Songs before this service; the desktop export will show a reminder until then.</p>}
                  <div className="grid grid-cols-1 gap-3">
                    {compiledSlides.map((slide, sIdx) => (
                      <div
                        key={slide.id}
                        onClick={() =>
                          onPushItemToLiveAV(
                            activePlan.id,
                            Math.max(0, selectedItemIndex),
                            sIdx
                          )
                        }
                        className="group cursor-pointer border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg overflow-hidden transition-colors"
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Slide {sIdx + 1} · {slide.label}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium opacity-80 group-hover:opacity-100">
                            Preview →
                          </span>
                        </div>
                        <div className="p-4 bg-slate-950 text-white text-center min-h-[104px] flex flex-col items-center justify-center">
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-line max-w-md">
                            {slide.bodyText}
                          </p>
                        </div>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate">
                          Preacher / Stage Screen: {slide.stageMonitorNote}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Live Transposed ChordPro Sheet & Capo Calculator */}
              {inspectorTab === 'chords' && linkedSong && (
                <div className="p-5 space-y-4 max-h-[620px] overflow-y-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Transpose Key:
                      </span>
                      <select
                        value={activeMusicalKey}
                        onChange={(e) => handleKeyChangeOnItem(selectedItem.id, e.target.value)}
                        className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-indigo-600 dark:text-indigo-400"
                      >
                        {ALL_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k} {k === linkedSong.defaultKey ? '(Original)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Chart
                    </button>
                  </div>

                  <label className="block text-xs text-slate-600 dark:text-slate-300">Order for this service (comma separated; repeat a section to sing it again)
                    <input key={selectedItem.id} type="text" defaultValue={(selectedItem.arrangementOverride || linkedSong.arrangement).join(', ')}
                      onBlur={(e) => handleArrangementChange(selectedItem.id, e.target.value)}
                      className="block w-full mt-1 px-2 py-1 border rounded bg-white dark:bg-slate-800" />
                    <span className="block mt-1 text-[11px]">Use the exact section names in the chart, such as Verse 1, Chorus, Verse 2, Chorus.</span>
                  </label>
                  {capoSuggestions.length > 0 && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Acoustic Guitar Capo Options for {activeMusicalKey}:{' '}
                      </span>
                      {capoSuggestions.map((c, idx) => (
                        <span key={c.shapesKey} className="font-mono">
                          {idx > 0 ? ' · ' : ''}Capo {c.capo} (play {c.shapesKey} shapes)
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="font-mono text-xs space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                      {linkedSong.title} · CCLI #{linkedSong.ccliNumber} · Key of {activeMusicalKey} ·{' '}
                      {linkedSong.bpm} BPM ({linkedSong.timeSignature})
                    </div>
                    {parsedChordSheet.map((line, lIdx) => {
                      if (line.isSectionHeader) {
                        return (
                          <div
                            key={lIdx}
                            className="pt-2 font-sans font-bold text-xs text-indigo-600 dark:text-indigo-400"
                          >
                            {line.sectionLabel}
                          </div>
                        );
                      }
                      return (
                        <div key={lIdx} className="flex flex-wrap leading-tight py-0.5">
                          {line.segments.map((seg, sIdx) => (
                            <div key={sIdx} className="inline-flex flex-col pr-1">
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

              {/* Tab 3: Tech & Stage Cues */}
              {inspectorTab === 'cues' && (
                <div className="p-5 space-y-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 font-medium">
                      FOH Audio & Click Track Cue
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200">
                      {selectedItem.audioCue}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 font-medium">
                      Sanctuary DMX Lighting Preset
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200">
                      {selectedItem.lightingCue}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 font-medium">
                      Preacher Timer / Praise AV Operator Notes
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                      {selectedItem.stageNotes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Select an item in the Order of Service to preview Praise AV slides and chord charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
