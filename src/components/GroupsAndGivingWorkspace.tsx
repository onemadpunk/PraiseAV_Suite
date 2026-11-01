import React, { useState } from 'react';
import {
  Calendar,
  Download,
  HeartHandshake,
  Plus,
  Users,
} from 'lucide-react';
import { DonationRecord, RoomBooking, SmallGroup } from '../types/church';
import { csvCell } from '../utils/csv';

interface GroupsAndGivingWorkspaceProps {
  smallGroups: SmallGroup[];
  onAddSmallGroup: (sg: SmallGroup) => void;
  roomBookings: RoomBooking[];
  onAddRoomBooking: (rb: RoomBooking) => void;
  donations: DonationRecord[];
  onAddDonation: (don: DonationRecord) => void;
  canSeeGroups: boolean;
  canSeeFinance: boolean;
  canEditGroups: boolean;
  canEditFinance: boolean;
}

export const GroupsAndGivingWorkspace: React.FC<GroupsAndGivingWorkspaceProps> = ({
  smallGroups,
  onAddSmallGroup,
  roomBookings,
  onAddRoomBooking,
  donations,
  onAddDonation,
  canSeeGroups,
  canSeeFinance,
  canEditGroups,
  canEditFinance,
}) => {
  const [sectionView, setSectionView] = useState<'groups-rooms' | 'giving'>(canSeeGroups ? 'groups-rooms' : 'giving');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showAddDonation, setShowAddDonation] = useState(false);

  // Small Group Form
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState<SmallGroup['category']>('Home Group');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupDay, setGroupDay] = useState('Wednesday');
  const [groupTime, setGroupTime] = useState('19:30');
  const [groupLocation, setGroupLocation] = useState('');
  const [groupStudy, setGroupStudy] = useState('1 Peter Study Guide');

  // Room Booking Form
  const [roomName, setRoomName] = useState<RoomBooking['roomName']>('Main Sanctuary');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-12');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [organizer, setOrganizer] = useState('Hannah Vance');
  const [avRequired, setAvRequired] = useState(true);
  const [setupNotes, setSetupNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Donation Form
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [fund, setFund] = useState<DonationRecord['fund']>('General Ministry Fund');
  const [method, setMethod] = useState<DonationRecord['method']>('Standing Order (Bank)');
  const [giftAidEligible, setGiftAidEligible] = useState(true);
  const [donDate, setDonDate] = useState('2026-11-01');

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const giftAidReclaimable = donations
    .filter((d) => d.giftAidEligible)
    .reduce((sum, d) => sum + d.amount * 0.25, 0);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onAddSmallGroup({
      id: 'sg-' + crypto.randomUUID(),
      name: groupName.trim(),
      category: groupCategory,
      leaderName: groupLeader.trim() || 'Ministry Leader',
      meetingDay: groupDay,
      meetingTime: groupTime,
      location: groupLocation.trim() || 'Church Campus',
      currentMembers: 8,
      maxCapacity: 16,
      currentStudy: groupStudy.trim(),
      active: true,
    });
    setGroupName('');
    setShowAddGroup(false);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!eventTitle.trim()) return;

    // Check for room collision
    const conflict = roomBookings.find(
      (b) =>
        b.roomName === roomName &&
        b.date === eventDate &&
        !(endTime <= b.startTime || startTime >= b.endTime)
    );
    if (conflict) {
      setBookingError(
        `Room Conflict: ${roomName} is already booked on ${eventDate} (${conflict.startTime}–${conflict.endTime}) for "${conflict.eventTitle}".`
      );
      return;
    }

    onAddRoomBooking({
      id: 'rb-' + crypto.randomUUID(),
      roomName,
      eventTitle: eventTitle.trim(),
      date: eventDate,
      startTime,
      endTime,
      organizer: organizer.trim() || 'Church Office',
      avRequired,
      setupNotes: setupNotes.trim() || 'Standard room configuration.',
    });
    setEventTitle('');
    setShowAddBooking(false);
  };

  const handleCreateDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || amount <= 0) return;
    onAddDonation({
      id: 'don-' + crypto.randomUUID(),
      donorName: donorName.trim(),
      household: donorName.trim(),
      amount,
      fund,
      method,
      giftAidEligible,
      date: donDate,
      reference: `REC-${Date.now().toString().slice(-5)}`,
    });
    setDonorName('');
    setShowAddDonation(false);
  };

  const handleExportGiftAidCSV = () => {
    const headers = [
      'Date',
      'Donor / Household',
      'Fund',
      'Method',
      'Amount (GBP)',
      'Gift Aid Eligible',
      '25% Tax Reclaim (GBP)',
      'Reference',
    ];
    const rows = donations.map((d) => [
      d.date,
      d.donorName,
      d.fund,
      d.method,
      d.amount.toFixed(2),
      d.giftAidEligible ? 'YES' : 'NO',
      d.giftAidEligible ? (d.amount * 0.25).toFixed(2) : '0.00',
      d.reference,
    ]);
    const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'praiseav-suite-giving-review.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Small Groups, Room Bookings and Giving Records
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Coordinate groups and rooms. Finance staff can record giving for review.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {canSeeGroups && <button
            type="button"
            onClick={() => setSectionView('groups-rooms')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              sectionView === 'groups-rooms'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Small Groups & Room Calendar
          </button>}
          {canSeeFinance && <button
            type="button"
            onClick={() => setSectionView('giving')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              sectionView === 'giving'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Giving Records
          </button>}
        </div>
      </div>

      {sectionView === 'groups-rooms' && canSeeGroups ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Small Groups Directory */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Small Groups & Midweek Communities ({smallGroups.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Home groups, youth tables, and courses
                </p>
              </div>
              {canEditGroups && <button
                type="button"
                onClick={() => setShowAddGroup(!showAddGroup)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                New Group
              </button>}
            </div>

            {canEditGroups && showAddGroup && (
              <form
                onSubmit={handleCreateGroup}
                className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Group Name (e.g. Eastside Home Group)"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Leaders"
                    value={groupLeader}
                    onChange={(e) => setGroupLeader(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Location / Address"
                    value={groupLocation}
                    onChange={(e) => setGroupLocation(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Current Curriculum / Study"
                    value={groupStudy}
                    onChange={(e) => setGroupStudy(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                  >
                    Create Small Group
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {smallGroups.map((sg) => (
                <div key={sg.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {sg.name}
                    </div>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {sg.currentMembers}/{sg.maxCapacity} members
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {sg.category} · {sg.meetingDay}s at {sg.meetingTime} · Led by {sg.leaderName}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                    Location: {sg.location} · Study: <strong>{sg.currentStudy}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room & Sanctuary AV Calendar Bookings */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Campus Room & Praise AV Rig Bookings ({roomBookings.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automatic room conflict detection included
                </p>
              </div>
              {canEditGroups && <button
                type="button"
                onClick={() => setShowAddBooking(!showAddBooking)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Book Room
              </button>}
            </div>

            {canEditGroups && showAddBooking && (
              <form
                onSubmit={handleCreateBooking}
                className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3"
              >
                {bookingError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-xs rounded-lg border border-red-200 dark:border-red-800">
                    {bookingError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value as RoomBooking['roomName'])}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Main Sanctuary">Main Sanctuary</option>
                    <option value="Fellowship Hall">Fellowship Hall</option>
                    <option value="Youth Loft">Youth Loft</option>
                    <option value="AV Broadcast Suite">AV Broadcast Suite</option>
                    <option value="Kids Wing">Kids Wing</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Event or Rehearsal Name"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={avRequired}
                      onChange={(e) => setAvRequired(e.target.checked)}
                    />
                    Requires Praise AV Projection Rig
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                  >
                    Confirm Room Booking
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {roomBookings.map((rb) => (
                <div key={rb.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {rb.eventTitle}
                    </span>
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {rb.date} · {rb.startTime}–{rb.endTime}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Room: <strong>{rb.roomName}</strong> · Organizer: {rb.organizer} ·{' '}
                    {rb.avRequired ? 'Praise AV Rig Reserved' : 'No AV needed'}
                  </div>
                  <div className="text-xs text-slate-500">{rb.setupNotes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : canSeeFinance ? (
        /* Giving records */
        <div className="space-y-6">
          {/* Summary Metric Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total Recorded Giving (Batch)
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                £{totalDonations.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                This is a record of giving, not a payment processor.
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Potential Gift Aid for review
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                +£{giftAidReclaimable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Subject to valid declarations and HMRC rules
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Recorded giving plus potential Gift Aid
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
                £
                {(totalDonations + giftAidReclaimable).toLocaleString('en-GB', {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Across {donations.length} recorded transactions
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Giving ledger
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record transfers and offerings. No payments are processed here.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportGiftAidCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export review CSV
                </button>
                {canEditFinance && <button
                  type="button"
                  onClick={() => setShowAddDonation(!showAddDonation)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Offering / Transfer
                </button>}
              </div>
            </div>

            {canEditFinance && showAddDonation && (
              <form
                onSubmit={handleCreateDonation}
                className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
              >
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Donor / Household
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chen Household"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (£)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Designated Fund
                  </label>
                  <select
                    value={fund}
                    onChange={(e) => setFund(e.target.value as DonationRecord['fund'])}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="General Ministry Fund">General Ministry Fund</option>
                    <option value="Building & AV Upgrade">Building & AV Upgrade</option>
                    <option value="Community Foodbank">Community Foodbank</option>
                    <option value="Youth Camp Bursary">Youth Camp Bursary</option>
                  </select>
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 pb-2">
                    <input
                      type="checkbox"
                      checked={giftAidEligible}
                      onChange={(e) => setGiftAidEligible(e.target.checked)}
                    />
                    Gift Aid (+25%)
                  </label>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                    <th className="py-3 pl-5 pr-2">Date</th>
                    <th className="py-3 px-2">Donor / Household</th>
                    <th className="py-3 px-2">Designated Fund</th>
                    <th className="py-3 px-2">Method</th>
                    <th className="py-3 px-2 text-right">Amount</th>
                    <th className="py-3 pl-2 pr-5 text-right">Gift Aid (+25%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 pl-5 pr-2 font-mono tabular-nums text-slate-500">
                        {d.date}
                      </td>
                      <td className="py-3 px-2 font-semibold text-slate-900 dark:text-slate-100">
                        {d.donorName}
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300">{d.fund}</td>
                      <td className="py-3 px-2 text-slate-500">{d.method}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        £{d.amount.toFixed(2)}
                      </td>
                      <td className="py-3 pl-2 pr-5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {d.giftAidEligible ? `+£${(d.amount * 0.25).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : <p>This area is restricted to church finance staff.</p>}
    </div>
  );
};
