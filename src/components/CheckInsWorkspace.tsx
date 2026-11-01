import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Printer,
  Radio,
  Shield,
  UserCheck,
} from 'lucide-react';
import { CheckInChild } from '../types/church';

interface CheckInsWorkspaceProps {
  childrenList: CheckInChild[];
  onToggleCheckIn: (childId: string) => void;
  onAddChild: (child: CheckInChild) => void;
  onPageParentOnPraseAV: (securityCode: string, childName: string, room: string) => void;
}

export const CheckInsWorkspace: React.FC<CheckInsWorkspaceProps> = ({
  childrenList,
  onToggleCheckIn,
  onAddChild,
  onPageParentOnPraseAV,
}) => {
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [selectedBadgeChildId, setSelectedBadgeChildId] = useState<string>(
    childrenList[0]?.id || ''
  );
  const [showRegisterChild, setShowRegisterChild] = useState(false);
  const [pagedCodeAlert, setPagedCodeAlert] = useState<string | null>(null);

  // New Child Form
  const [childName, setChildName] = useState('');
  const [ageGroup, setAgeGroup] = useState<CheckInChild['ageGroup']>('Sparks (3–5)');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [medicalAlert, setMedicalAlert] = useState('None');

  const filtered = childrenList.filter(
    (c) => roomFilter === 'ALL' || c.ageGroup === roomFilter
  );

  const checkedInCount = childrenList.filter((c) => c.checkedInAt && !c.checkedOutAt).length;
  const badgeChild =
    childrenList.find((c) => c.id === selectedBadgeChildId) || childrenList[0];

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) return;
    const randomCode = `K-${Math.floor(1000 + Math.random() * 9000)}`;
    const roomMap: Record<CheckInChild['ageGroup'], string> = {
      'Nursery (0–2)': 'Kids Wing — Crèche A',
      'Sparks (3–5)': 'Kids Wing — Room B',
      'Trailblazers (6–10)': 'Kids Wing — Room C',
      'Youth (11–17)': 'Youth Loft',
    };
    const nowHHMM = new Date().toTimeString().slice(0, 5);
    const created: CheckInChild = {
      id: `chk-${Date.now()}`,
      childName: childName.trim(),
      ageGroup,
      room: roomMap[ageGroup],
      guardianName: guardianName.trim() || 'Parent / Guardian',
      guardianPhone: guardianPhone.trim() || '+44 7700 900000',
      medicalAlert: medicalAlert.trim() || 'None',
      securityCode: randomCode,
      checkedInAt: nowHHMM,
      checkedOutAt: null,
      serviceDate: '2026-11-01',
    };
    onAddChild(created);
    setSelectedBadgeChildId(created.id);
    setChildName('');
    setGuardianName('');
    setShowRegisterChild(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Sunday Safeguarding Kiosk · Active Checked-In: {checkedInCount} / {childrenList.length} Registered
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Kids & Youth Check-Ins, Security Pickup Codes & Praise AV Parent Alert
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowRegisterChild(!showRegisterChild)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Check-In First-Time Visitor
        </button>
      </div>

      {pagedCodeAlert && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
          <span>
            <strong>Sent to Praise AV Congregation & Stage Screen:</strong> Parent Pickup Code{' '}
            <code className="font-mono font-bold">{pagedCodeAlert}</code> is now displayed on the projector overlay.
          </span>
          <button
            type="button"
            onClick={() => setPagedCodeAlert(null)}
            className="text-xs font-semibold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {showRegisterChild && (
        <form
          onSubmit={handleRegisterSubmit}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Instant Visitor Check-In & Security Label Generator
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Child Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oliver Brooks"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Age Group
              </label>
              <select
                value={ageGroup}
                onChange={(e) =>
                  setAgeGroup(e.target.value as CheckInChild['ageGroup'])
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="Nursery (0–2)">Nursery (0–2)</option>
                <option value="Sparks (3–5)">Sparks (3–5)</option>
                <option value="Trailblazers (6–10)">Trailblazers (6–10)</option>
                <option value="Youth (11–17)">Youth (11–17)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Parent / Guardian
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Brooks"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Mobile
              </label>
              <input
                type="text"
                placeholder="+44 7700 900555"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Allergies / Medical Note
              </label>
              <input
                type="text"
                value={medicalAlert}
                onChange={(e) => setMedicalAlert(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRegisterChild(false)}
              className="px-3 py-1.5 text-xs text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
            >
              Generate Security Code & Check In
            </button>
          </div>
        </form>
      )}

      {/* Room Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit overflow-x-auto">
        {(['ALL', 'Nursery (0–2)', 'Sparks (3–5)', 'Trailblazers (6–10)', 'Youth (11–17)'] as const).map(
          (group) => (
            <button
              key={group}
              type="button"
              onClick={() => setRoomFilter(group)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                roomFilter === group
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {group === 'ALL' ? 'All Age Groups' : group}
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Roster & Check-In Actions */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                  <th className="py-3 pl-5 pr-2">Pickup Code</th>
                  <th className="py-3 px-2">Child & Room Assignment</th>
                  <th className="py-3 px-2">Parent / Guardian</th>
                  <th className="py-3 px-2">Medical / Allergy</th>
                  <th className="py-3 pl-2 pr-5 text-right">Actions & Praise AV Pager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filtered.map((child) => {
                  const isCheckedIn = Boolean(child.checkedInAt && !child.checkedOutAt);
                  const hasAllergy = child.medicalAlert !== 'None';
                  return (
                    <tr
                      key={child.id}
                      onClick={() => setSelectedBadgeChildId(child.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedBadgeChildId === child.id
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2 font-mono font-bold text-indigo-600 dark:text-indigo-400 align-top">
                        {child.securityCode}
                      </td>
                      <td className="py-3.5 px-2 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {child.childName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {child.ageGroup} · {child.room}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 align-top">
                        <div className="text-slate-800 dark:text-slate-200">
                          {child.guardianName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {child.guardianPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 align-top">
                        {hasAllergy ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            Alert: {child.medicalAlert}
                          </span>
                        ) : (
                          <span className="text-slate-400">No medical alerts</span>
                        )}
                      </td>
                      <td
                        className="py-3.5 pl-2 pr-5 text-right align-top whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onPageParentOnPraseAV(
                                child.securityCode,
                                child.childName,
                                child.room
                              );
                              setPagedCodeAlert(child.securityCode);
                            }}
                            title="Display Security Code on Praise AV Congregation Screen"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded hover:bg-indigo-100"
                          >
                            <Radio className="w-3 h-3" />
                            Page Parent on AV
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleCheckIn(child.id)}
                            className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${
                              isCheckedIn
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            {isCheckedIn ? `In (${child.checkedInAt})` : 'Check In'}
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

        {/* Right 4 Cols: Printable Thermal Security Badge + Parent Receipt Preview */}
        {badgeChild && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Thermal Sticker Badge & Parent Stub
              </h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Labels
              </button>
            </div>

            {/* Child Name Badge Preview */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>CHILD BADGE · {badgeChild.serviceDate}</span>
                <span>{badgeChild.room}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {badgeChild.childName}
                </div>
                <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {badgeChild.securityCode}
                </div>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Guardian: {badgeChild.guardianName} ({badgeChild.guardianPhone})
              </div>
              {badgeChild.medicalAlert !== 'None' && (
                <div className="p-2 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded">
                  MEDICAL ALERT: {badgeChild.medicalAlert}
                </div>
              )}
            </div>

            {/* Matching Parent Pickup Stub */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500">
                PARENT PICKUP SECURITY RECEIPT
              </div>
              <div className="text-2xl font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100">
                {badgeChild.securityCode}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Present this code at {badgeChild.room} after the service. If needed during worship, this code will appear on the Praise AV congregation alert screen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
