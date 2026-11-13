import React, { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Calendar, DoorOpen, Download, HeartHandshake, Mail, Plus, Trash2, Users } from 'lucide-react';
import { DonationRecord, GroupMaterial, Member, RoomBooking, SmallGroup } from '../types/church';
import {
  COLLECTION_SUGGESTIONS, FUND_SUGGESTIONS, METHOD_OPTIONS, bookingProblem, churchRooms, givingCsv,
  givingSource, givingSummary, groupEmailLink, groupMemberCount, groupPeople, materialEmailText, money,
  newRoom, roomBookingsOnly, safeLink,
} from '../utils/groupsRoomsGiving';
import { emailAddresses } from '../utils/groupEmail';
import { EmailGroupButton } from './EmailGroupButton';

interface GroupsAndGivingWorkspaceProps {
  smallGroups: SmallGroup[];
  setSmallGroups: Dispatch<SetStateAction<SmallGroup[]>>;
  roomBookings: RoomBooking[];
  setRoomBookings: Dispatch<SetStateAction<RoomBooking[]>>;
  donations: DonationRecord[];
  setDonations: Dispatch<SetStateAction<DonationRecord[]>>;
  /** People records. Empty unless this person can read People (admins and the People role). */
  members: Member[];
  canSeeGroups: boolean;
  canSeeFinance: boolean;
  canEditGroups: boolean;
  canEditFinance: boolean;
  /** Members can book a free slot and cancel their own bookings. */
  canBookRooms?: boolean;
  /** The signed-in person's id and name, for their own bookings. */
  myUid?: string;
  myName?: string;
  /** The signed-in person's address, used as "To" on group emails (everyone else is in BCC). */
  senderEmail?: string;
}

type Section = 'groups' | 'rooms' | 'giving';

const input = 'px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg';
const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden';
const primary = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500';
const soft = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg';
const plain = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg';
const today = () => new Date().toISOString().slice(0, 10);

export const GroupsAndGivingWorkspace: React.FC<GroupsAndGivingWorkspaceProps> = (props) => {
  const { canSeeGroups, canSeeFinance } = props;
  const [section, setSection] = useState<Section>(canSeeGroups ? 'groups' : 'giving');
  const tabs: Array<[Section, string, boolean]> = [
    ['groups', 'Small groups', canSeeGroups], ['rooms', 'Rooms', canSeeGroups], ['giving', 'Giving', canSeeFinance],
  ];
  return (
    <div className="space-y-6">
      <div className="suite-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="suite-eyebrow">Church life / Administration</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Groups, rooms & giving</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Set up small groups and rooms, share materials, and record what came in.</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg" role="tablist">
          {tabs.filter(([, , show]) => show).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${section === id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {section === 'groups' && canSeeGroups && <GroupsSection {...props} />}
      {section === 'rooms' && canSeeGroups && <RoomsSection {...props} />}
      {section === 'giving' && canSeeFinance && <GivingSection {...props} />}
      {!canSeeGroups && !canSeeFinance && <p>This area is restricted.</p>}
    </div>
  );
};

// ---------------- Small groups ----------------

const GroupsSection: React.FC<GroupsAndGivingWorkspaceProps> = ({ smallGroups, setSmallGroups, members, canEditGroups, senderEmail }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Home Group');
  const [leader, setLeader] = useState('');
  const [day, setDay] = useState('Wednesday');
  const [time, setTime] = useState('19:30');
  const [location, setLocation] = useState('');
  const [study, setStudy] = useState('');

  const update = (id: string, change: (g: SmallGroup) => SmallGroup) =>
    setSmallGroups((prev) => prev.map((g) => (g.id === id ? change(g) : g)));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = 'sg-' + crypto.randomUUID();
    setSmallGroups((prev) => [{
      id, name: name.trim(), category, leaderName: leader.trim(), meetingDay: day, meetingTime: time,
      location: location.trim(), currentMembers: 0, maxCapacity: 0, currentStudy: study.trim(), active: true,
      memberIds: [], materials: [],
    }, ...prev]);
    setName(''); setLeader(''); setLocation(''); setStudy('');
    setShowAdd(false); setOpenId(id);
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Users className="w-4 h-4" /> Small groups ({smallGroups.length})</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Home groups, Bible studies and courses. Open a group to choose its members and share materials.</p>
        </div>
        {canEditGroups && <button type="button" className={soft} onClick={() => setShowAdd(!showAdd)}><Plus className="w-3.5 h-3.5" /> New group</button>}
      </div>

      {canEditGroups && showAdd && (
        <form onSubmit={create} className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1"><span className="block font-medium">Group name</span>
              <input required className={input + ' w-full'} placeholder="e.g. Tuesday home group" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="text-xs space-y-1"><span className="block font-medium">Type of group</span>
              <input className={input + ' w-full'} list="sg-categories" value={category} onChange={(e) => setCategory(e.target.value)} /></label>
            <label className="text-xs space-y-1"><span className="block font-medium">Leader(s)</span>
              <input className={input + ' w-full'} value={leader} onChange={(e) => setLeader(e.target.value)} /></label>
            <label className="text-xs space-y-1"><span className="block font-medium">Where it meets</span>
              <input className={input + ' w-full'} placeholder="e.g. 12 High Street, or Church hall" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label className="text-xs space-y-1"><span className="block font-medium">Day</span>
              <select className={input + ' w-full'} value={day} onChange={(e) => setDay(e.target.value)}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => <option key={d}>{d}</option>)}
              </select></label>
            <label className="text-xs space-y-1"><span className="block font-medium">Time</span>
              <input type="time" className={input + ' w-full'} value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="text-xs space-y-1 sm:col-span-2"><span className="block font-medium">Current study (optional)</span>
              <input className={input + ' w-full'} value={study} onChange={(e) => setStudy(e.target.value)} /></label>
          </div>
          <datalist id="sg-categories">{['Home Group', 'Bible Study', 'Youth & Young Adults', 'Discipleship Course', 'Prayer Group'].map((c) => <option key={c} value={c} />)}</datalist>
          <div className="flex justify-end"><button type="submit" className={primary}>Create group</button></div>
        </form>
      )}

      {!smallGroups.length && <p className="p-5 text-xs text-slate-500">No groups yet.{canEditGroups ? ' Press "New group" to add the first one.' : ''}</p>}
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {smallGroups.map((g) => (
          <div key={g.id} className="p-4 space-y-2">
            <button type="button" className="w-full text-left" aria-expanded={openId === g.id} onClick={() => setOpenId(openId === g.id ? null : g.id)}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{g.name}</span>
                <span className="text-xs text-slate-500 tabular-nums">{groupMemberCount(g)} {groupMemberCount(g) === 1 ? 'person' : 'people'} · {(g.materials || []).length} shared</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {[g.category, g.meetingDay && `${g.meetingDay}s at ${g.meetingTime}`, g.leaderName && `Led by ${g.leaderName}`, g.location].filter(Boolean).join(' · ')}
              </div>
              {g.currentStudy && <div className="text-xs text-slate-600 dark:text-slate-300">Study: <strong>{g.currentStudy}</strong></div>}
            </button>
            {openId === g.id && <GroupDetail group={g} members={members} canEdit={canEditGroups} senderEmail={senderEmail}
              onChange={(change) => update(g.id, change)}
              onDelete={() => { if (confirm(`Delete the group "${g.name}"? Its shared materials are deleted too.`)) setSmallGroups((prev) => prev.filter((x) => x.id !== g.id)); }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const GroupDetail: React.FC<{ group: SmallGroup; members: Member[]; canEdit: boolean; senderEmail?: string; onChange: (c: (g: SmallGroup) => SmallGroup) => void; onDelete: () => void }> = ({ group, members, canEdit, senderEmail, onChange, onDelete }) => {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const { people } = groupPeople(group, members);
  const ids = new Set(group.memberIds || []);
  const materials = group.materials || [];
  const canEmail = canEdit && members.length > 0;

  const openEmail = (subject: string, body: string) => {
    const href = groupEmailLink(group, members, subject, body, senderEmail);
    if (!href) {
      setError(emailAddresses(people).length
        ? 'This group is too big for your email app to open in one go. Use "Copy addresses" above and paste them into BCC.'
        : 'Nobody in this group has an email address in People yet.');
      return;
    }
    window.location.href = href;
  };

  const share = (e: React.SyntheticEvent, sendEmail: boolean) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Give it a title, e.g. "Week 3 study sheet".'); return; }
    const cleanLink = safeLink(link);
    if (link.trim() && !cleanLink) { setError('That link does not look like a web address.'); return; }
    const material: GroupMaterial = { id: 'mat-' + crypto.randomUUID(), title: title.trim().slice(0, 200), link: cleanLink, note: note.trim().slice(0, 2000), sharedAt: today() };
    onChange((g) => ({ ...g, materials: [material, ...(g.materials || [])].slice(0, 100) }));
    setTitle(''); setLink(''); setNote('');
    if (sendEmail) { const text = materialEmailText(group, material); openEmail(text.subject, text.body); }
  };

  const toggle = (id: string) => onChange((g) => {
    const next = new Set(g.memberIds || []);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { ...g, memberIds: [...next], currentMembers: next.size };
  });

  return (
    <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
      {/* Members */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Who is in this group</h3>
          {canEdit && members.length > 0 && <button type="button" className={plain} onClick={() => setPicking(!picking)}>{picking ? 'Done' : 'Choose people'}</button>}
        </div>
        {members.length === 0
          ? <p className="text-slate-500">{groupMemberCount(group)} {groupMemberCount(group) === 1 ? 'person' : 'people'}.{canEdit ? ' Add people in "People & rotas" first, then choose them here.' : ''}</p>
          : picking
            ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
                {[...members].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((m) => (
                  <label key={m.id} className="inline-flex items-center gap-2"><input type="checkbox" checked={ids.has(m.id)} onChange={() => toggle(m.id)} />{m.fullName}{!m.email && <span className="text-slate-400">(no email)</span>}</label>
                ))}
              </div>
            : people.length ? <p className="text-slate-700 dark:text-slate-300">{people.map((m) => m.fullName).join(', ')}</p> : <p className="text-slate-500">Nobody chosen yet.</p>}
        {members.length > 0 && people.length > 0 && <EmailGroupButton label="Email this group" people={people} senderEmail={senderEmail} subject={group.name} body={`Hello ${group.name},\n\n`} />}
      </section>

      {/* Materials */}
      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Shared with the group</h3>
        {canEdit && <form onSubmit={(e) => share(e, false)} className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={input} placeholder='Title, e.g. "Week 3 study sheet"' value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className={input} placeholder="Link (optional), e.g. a Google Drive file" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <textarea className={input + ' w-full'} rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="submit" className={plain}>Share in the Suite</button>
            {canEmail && <button type="button" className={primary} onClick={(e) => share(e, true)}><Mail className="w-3.5 h-3.5" /> Share and email the group</button>}
          </div>
          <p className="text-slate-500">Emails open in your own email app, with the group in BCC so they don't see each other's addresses. For files, put them in Google Drive (or similar) and paste the share link.</p>
        </form>}
        {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
        {!materials.length && <p className="text-slate-500">Nothing shared yet.</p>}
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{m.link ? <a className="underline text-indigo-600 dark:text-indigo-400" href={m.link} target="_blank" rel="noopener noreferrer">{m.title}</a> : m.title}</div>
                  <div className="text-slate-500">Shared {m.sharedAt}</div>
                  {m.note && <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 mt-1">{m.note}</p>}
                </div>
                {canEdit && <div className="flex gap-1 shrink-0">
                  {canEmail && <button type="button" aria-label={`Email "${m.title}" to the group`} title="Email to the group" className="p-1" onClick={() => { const t = materialEmailText(group, m); openEmail(t.subject, t.body); }}><Mail className="w-3.5 h-3.5" /></button>}
                  <button type="button" aria-label={`Remove "${m.title}"`} title="Remove" className="p-1 text-red-600" onClick={() => onChange((g) => ({ ...g, materials: (g.materials || []).filter((x) => x.id !== m.id) }))}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {canEdit && <div className="flex justify-end"><button type="button" className="text-red-600 underline" onClick={onDelete}>Delete this group</button></div>}
    </div>
  );
};

// ---------------- Rooms ----------------

export const RoomsSection: React.FC<GroupsAndGivingWorkspaceProps> = ({ roomBookings, setRoomBookings, canEditGroups, canBookRooms, myUid, myName, smallGroups }) => {
  const canBook = canEditGroups || Boolean(canBookRooms);
  const rooms = useMemo(() => churchRooms(roomBookings), [roomBookings]);
  const bookings = useMemo(() => roomBookingsOnly(roomBookings), [roomBookings]);
  const [roomName, setRoomName] = useState('');
  const [roomNotes, setRoomNotes] = useState('');
  const [showBook, setShowBook] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [room, setRoom] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [organizer, setOrganizer] = useState(myName || '');
  const [roomFilter, setRoomFilter] = useState('');
  const [av, setAv] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const addRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const nameValue = roomName.trim();
    if (!nameValue) return;
    if (rooms.some((r) => r.roomName.toLowerCase() === nameValue.toLowerCase())) { setError(`"${nameValue}" is already set up.`); return; }
    setError('');
    setRoomBookings((prev) => [...prev, newRoom(nameValue, roomNotes)]);
    setRoomName(''); setRoomNotes('');
  };

  const book = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = room || rooms[0]?.roomName || '';
    if (!title.trim()) { setError('Say what the booking is for.'); return; }
    if (!organizer.trim()) { setError('Say who it is for: your name or your group.'); return; }
    const problem = bookingProblem(roomBookings, { roomName: chosen, date, startTime: start, endTime: end });
    if (problem) { setError(problem); return; }
    setError('');
    setRoomBookings((prev) => [...prev, {
      id: 'rb-' + crypto.randomUUID(), kind: 'booking', roomName: chosen, eventTitle: title.trim().slice(0, 200),
      date, startTime: start, endTime: end, organizer: organizer.trim().slice(0, 100), avRequired: av, setupNotes: notes.trim().slice(0, 500),
      ...(myUid ? { bookedByUid: myUid } : {}),
    }]);
    setTitle(''); setNotes(''); setShowBook(false);
  };

  const now = today();
  const shown = bookings.filter((b) => (showPast || b.date >= now) && (!roomFilter || b.roomName === roomFilter));
  const chosenRoom = room || rooms[0]?.roomName || '';
  const sameDay = bookings.filter((b) => b.roomName === chosenRoom && b.date === date);
  const canCancel = (b: RoomBooking) => canEditGroups || Boolean(canBookRooms && myUid && b.bookedByUid === myUid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className={card + ' lg:col-span-5'}>
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><DoorOpen className="w-4 h-4" /> Church rooms ({rooms.length})</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{canEditGroups ? 'Add each room people can book: the hall, the vestry, the kitchen and so on.' : 'The rooms that can be booked.'}</p>
        </div>
        {canEditGroups && <form onSubmit={addRoom} className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <input className={input + ' w-full'} placeholder="Room name, e.g. Church hall" value={roomName} onChange={(e) => setRoomName(e.target.value)} aria-label="Room name" />
          <input className={input + ' w-full'} placeholder="About the room (optional), e.g. seats 40, has a TV" value={roomNotes} onChange={(e) => setRoomNotes(e.target.value)} aria-label="About the room" />
          <div className="flex justify-end"><button type="submit" className={primary}><Plus className="w-3.5 h-3.5" /> Add room</button></div>
        </form>}
        {!rooms.length && <p className="p-5 text-xs text-slate-500">No rooms set up yet.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {rooms.map((r) => (
            <li key={r.id} className="px-5 py-3 flex items-start justify-between gap-2 text-xs">
              <div><div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{r.roomName}</div>{r.setupNotes && <div className="text-slate-500">{r.setupNotes}</div>}</div>
              {canEditGroups && <button type="button" aria-label={`Remove ${r.roomName}`} className="p-1 text-red-600"
                onClick={() => { if (confirm(`Remove "${r.roomName}" from the room list? Existing bookings stay.`)) setRoomBookings((prev) => prev.filter((x) => x.id !== r.id)); }}><Trash2 className="w-3.5 h-3.5" /></button>}
            </li>
          ))}
        </ul>
      </div>

      <div className={card + ' lg:col-span-7'}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Calendar className="w-4 h-4" /> Room bookings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Who has which room, and when. A room can't be booked twice at the same time.</p>
          </div>
          {canBook && rooms.length > 0 && <button type="button" className={soft} onClick={() => setShowBook(!showBook)}><Plus className="w-3.5 h-3.5" /> Book a room</button>}
        </div>
        {error && <p role="alert" className="mx-4 mt-3 p-2.5 bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-xs rounded-lg border border-red-200 dark:border-red-800">{error}</p>}
        {canEditGroups && !rooms.length && <p className="p-5 text-xs text-slate-500">Add your church's rooms on the left first, then you can book them here.</p>}
        {canBook && showBook && rooms.length > 0 && (
          <form onSubmit={book} className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1"><span className="block font-medium">Room</span>
                <select className={input + ' w-full'} value={room || rooms[0].roomName} onChange={(e) => setRoom(e.target.value)}>{rooms.map((r) => <option key={r.id}>{r.roomName}</option>)}</select></label>
              <label className="space-y-1"><span className="block font-medium">What it's for</span>
                <input className={input + ' w-full'} placeholder="e.g. Band rehearsal, Boys' Brigade" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <label className="space-y-1"><span className="block font-medium">Date</span><input type="date" className={input + ' w-full'} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="block font-medium">From</span><input type="time" className={input + ' w-full'} value={start} onChange={(e) => setStart(e.target.value)} /></label>
                <label className="space-y-1"><span className="block font-medium">Until</span><input type="time" className={input + ' w-full'} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
              </div>
              <label className="space-y-1"><span className="block font-medium">Who it's for (you or your group)</span><input className={input + ' w-full'} list="booking-groups" placeholder="e.g. Worship band" value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
                <datalist id="booking-groups">{smallGroups.map((g) => <option key={g.id} value={g.name} />)}</datalist></label>
              <label className="space-y-1"><span className="block font-medium">Notes (optional)</span><input className={input + ' w-full'} placeholder="e.g. tables out, heating on" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" aria-live="polite">
              {sameDay.length
                ? <><span className="font-medium">Already booked in {chosenRoom} that day:</span> {sameDay.map((b) => `${b.startTime}–${b.endTime} ${b.eventTitle}${b.organizer ? ` (${b.organizer})` : ''}`).join(', ')}. Pick a time outside these.</>
                : <span>{chosenRoom} is free all day on {date}.</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={av} onChange={(e) => setAv(e.target.checked)} /> Needs the projector / PraiseAV</label>
              <button type="submit" className={primary}>Book it</button>
            </div>
          </form>
        )}
        <div className="px-5 pt-3 text-xs flex flex-wrap items-center gap-3">
          {rooms.length > 1 && <select className={input} value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} aria-label="Show bookings for"><option value="">All rooms</option>{rooms.map((r) => <option key={r.id}>{r.roomName}</option>)}</select>}
          <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past bookings</label>
        </div>
        {!shown.length && <p className="p-5 text-xs text-slate-500">No {showPast ? '' : 'upcoming '}bookings.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {shown.map((b) => (
            <li key={b.id} className="px-5 py-3 text-xs space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{b.eventTitle}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{b.date} · {b.startTime}–{b.endTime}</span>
                  {canCancel(b) && <button type="button" aria-label={`Cancel booking ${b.eventTitle}`} className="p-1 text-red-600"
                    onClick={() => { if (confirm(`Cancel "${b.eventTitle}" on ${b.date}?`)) setRoomBookings((prev) => prev.filter((x) => x.id !== b.id)); }}><Trash2 className="w-3.5 h-3.5" /></button>}
                </span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">{[b.roomName, b.organizer && `For ${b.organizer}`, b.avRequired && 'Needs the projector'].filter(Boolean).join(' · ')}</div>
              {b.setupNotes && <div className="text-slate-500">{b.setupNotes}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ---------------- Giving ----------------

const GivingSection: React.FC<GroupsAndGivingWorkspaceProps> = ({ donations, setDonations, canEditFinance }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');
  const [date, setDate] = useState(today());
  const [source, setSource] = useState(COLLECTION_SUGGESTIONS[0]);
  const [fund, setFund] = useState(FUND_SUGGESTIONS[0]);
  const [method, setMethod] = useState(METHOD_OPTIONS[0]);
  const [amount, setAmount] = useState('');
  const [named, setNamed] = useState(false);
  const [donor, setDonor] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const periodKey = period === 'month' ? today().slice(0, 7) : period === 'year' ? today().slice(0, 4) : '';
  const summary = givingSummary(donations, periodKey);
  const entries = [...donations].filter((d) => !periodKey || d.date.startsWith(periodKey)).sort((a, b) => b.date.localeCompare(a.date));
  const periodLabel = period === 'month' ? 'This month' : period === 'year' ? 'This year' : 'All time';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0) { setError('Enter the amount, e.g. 245.50'); return; }
    if (!source.trim()) { setError('Say how it came in, e.g. Sunday morning collection.'); return; }
    if (named && !donor.trim()) { setError('Enter who gave it, or untick "Record who gave it".'); return; }
    setError('');
    setDonations((prev) => [{
      id: 'don-' + crypto.randomUUID(), date, amount: value, source: source.trim().slice(0, 100), fund: fund.trim().slice(0, 100) || 'General fund',
      method, donorName: named ? donor.trim().slice(0, 100) : '', note: note.trim().slice(0, 300),
    }, ...prev]);
    setAmount(''); setDonor(''); setNote(''); setNamed(false); setShowAdd(false);
  };

  const exportCsv = () => {
    const blob = new Blob([givingCsv(entries, showNames)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `praiseav-suite-giving-${periodKey || 'all'}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          {(['month', 'year', 'all'] as const).map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={period === p}
            className={`px-3 py-1 rounded-md ${period === p ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}>{p === 'month' ? 'This month' : p === 'year' ? 'This year' : 'All time'}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={plain} onClick={exportCsv}><Download className="w-3.5 h-3.5" /> Download (CSV)</button>
          {canEditFinance && <button type="button" className={primary} onClick={() => setShowAdd(!showAdd)}><Plus className="w-3.5 h-3.5" /> Record giving</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">{periodLabel}: total recorded</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">{money(summary.total)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.count} {summary.count === 1 ? 'entry' : 'entries'}. A record only; no payments go through the Suite.</div>
        </div>
        <TotalsCard title="By how it came in" totals={summary.bySource} />
        <TotalsCard title="By fund" totals={summary.byFund} />
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><HeartHandshake className="w-4 h-4" /> Giving record</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Record collections as one total. Naming a giver is optional, and only finance and admins can see giving at all.</p>
          </div>
          {summary.named > 0 && <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"><input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} /> Show names ({summary.named} named)</label>}
        </div>

        {canEditFinance && showAdd && (
          <form onSubmit={save} className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1"><span className="block font-medium">How it came in</span>
                <ChoiceOrOther label="How it came in" options={COLLECTION_SUGGESTIONS} value={source} onChange={setSource} placeholder="e.g. Harvest collection" /></div>
              <label className="space-y-1"><span className="block font-medium">Amount (£)</span>
                <input inputMode="decimal" className={input + ' w-full font-mono'} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label className="space-y-1"><span className="block font-medium">Date</span>
                <input type="date" className={input + ' w-full'} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <div className="space-y-1"><span className="block font-medium">Fund (what it's for)</span>
                <ChoiceOrOther label="Fund" options={FUND_SUGGESTIONS} value={fund} onChange={setFund} placeholder="e.g. Roof appeal" /></div>
              <label className="space-y-1"><span className="block font-medium">Paid by</span>
                <select className={input + ' w-full'} value={method} onChange={(e) => setMethod(e.target.value)}>{METHOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label className="space-y-1"><span className="block font-medium">Note (optional)</span>
                <input className={input + ' w-full'} placeholder="e.g. counted by Sue and Tom" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={named} onChange={(e) => setNamed(e.target.checked)} /> Record who gave it (optional, e.g. for a large one-off gift)</label>
              {named && <input className={input + ' w-full sm:w-1/2'} placeholder="Name or household" value={donor} onChange={(e) => setDonor(e.target.value)} aria-label="Who gave it" />}
            </div>
            {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex justify-end"><button type="submit" className={primary}>Save</button></div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 pl-5 pr-2">Date</th><th className="py-3 px-2">Came in through</th><th className="py-3 px-2">Fund</th>
                <th className="py-3 px-2">Paid by</th>{showNames && <th className="py-3 px-2">Given by</th>}<th className="py-3 px-2 text-right">Amount</th><th className="py-3 pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {!entries.length && <tr><td colSpan={7} className="p-5 text-slate-500">Nothing recorded for {periodLabel.toLowerCase()}.</td></tr>}
              {entries.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 pl-5 pr-2 font-mono tabular-nums text-slate-500">{d.date}</td>
                  <td className="py-3 px-2 font-semibold text-slate-900 dark:text-slate-100">{givingSource(d)}{d.note && <div className="font-normal text-slate-500">{d.note}</div>}</td>
                  <td className="py-3 px-2 text-slate-700 dark:text-slate-300">{d.fund}</td>
                  <td className="py-3 px-2 text-slate-500">{d.method}</td>
                  {showNames && <td className="py-3 px-2 text-slate-700 dark:text-slate-300">{d.donorName || '—'}</td>}
                  <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">{money(d.amount)}</td>
                  <td className="py-3 pr-5 text-right">{canEditFinance && <button type="button" aria-label="Delete this entry" className="p-1 text-red-600"
                    onClick={() => { if (confirm(`Delete this entry (${givingSource(d)}, ${money(d.amount)} on ${d.date})?`)) setDonations((prev) => prev.filter((x) => x.id !== d.id)); }}><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TotalsCard: React.FC<{ title: string; totals: Array<{ label: string; total: number }> }> = ({ title, totals }) => (
  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{title}</div>
    {!totals.length && <div className="text-xs text-slate-500">Nothing yet.</div>}
    <ul className="space-y-1 text-xs">
      {totals.slice(0, 5).map((t) => <li key={t.label} className="flex justify-between gap-2"><span className="truncate">{t.label}</span><span className="font-mono tabular-nums">{money(t.total)}</span></li>)}
      {totals.length > 5 && <li className="text-slate-500">and {totals.length - 5} more</li>}
    </ul>
  </div>
);

/** A short list of common choices, plus "Something else" to type your own. */
const ChoiceOrOther: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string }> = ({ label, options, value, onChange, placeholder }) => {
  const [other, setOther] = useState(!options.includes(value));
  return (
    <span className="block space-y-1">
      <select aria-label={label} className={input + ' w-full'} value={other ? '__other' : value}
        onChange={(e) => { if (e.target.value === '__other') { setOther(true); onChange(''); } else { setOther(false); onChange(e.target.value); } }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other">Something else…</option>
      </select>
      {other && <input aria-label={label + ' (your own)'} className={input + ' w-full'} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />}
    </span>
  );
};
