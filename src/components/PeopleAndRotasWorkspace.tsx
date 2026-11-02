import React, { useState } from 'react';
import {
  CalendarOff,
  Download,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Member, RotaDepartment } from '../types/church';

interface PeopleAndRotasWorkspaceProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
}

export const PeopleAndRotasWorkspace: React.FC<PeopleAndRotasWorkspaceProps> = ({
  members,
  onAddMember,
  onUpdateMember,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [blockoutDateInput, setBlockoutDateInput] = useState('2026-11-15');
  const [selectedMemberIdForBlockout, setSelectedMemberIdForBlockout] = useState<string | null>(
    null
  );

  // New Member Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [household, setHousehold] = useState('');
  const [department, setDepartment] = useState<RotaDepartment>('Band & Vocals');
  const [rolesInput, setRolesInput] = useState('Electric Guitar, Backing Vocals');
  const [dbsStatus, setDbsStatus] = useState<'Cleared' | 'Pending Renewal' | 'Not Required'>(
    'Cleared'
  );
  const [pastoralNotes, setPastoralNotes] = useState('');

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.household.toLowerCase().includes(search.toLowerCase()) ||
      m.qualifiedRoles.some((r) => r.toLowerCase().includes(search.toLowerCase()));
    const matchesDept =
      deptFilter === 'ALL' || m.departments.includes(deptFilter as RotaDepartment);
    return matchesSearch && matchesDept;
  });

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const created: Member = {
      id: 'mem-' + crypto.randomUUID(),
      fullName: fullName.trim(),
      email: email.trim() || 'member@gracecommunity.org.uk',
      phone: phone.trim() || '+44 7700 900000',
      household: household.trim() || `${fullName.trim().split(' ').pop()} Household`,
      status: 'Member',
      departments: [department],
      qualifiedRoles: rolesInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      dbsStatus,
      blockoutDates: [],
      attendanceRate: 95,
      joinedDate: new Date().toISOString().slice(0, 10),
      pastoralNotes: pastoralNotes.trim() || 'Active church member and rota volunteer.',
    };
    onAddMember(created);
    setFullName('');
    setEmail('');
    setPhone('');
    setHousehold('');
    setShowAddForm(false);
  };

  const handleAddBlockoutDate = (member: Member) => {
    if (!blockoutDateInput) return;
    if (member.blockoutDates.includes(blockoutDateInput)) return;
    onUpdateMember({
      ...member,
      blockoutDates: [...member.blockoutDates, blockoutDateInput],
    });
    setSelectedMemberIdForBlockout(null);
  };

  const handleRemoveBlockoutDate = (member: Member, dateToRemove: string) => {
    onUpdateMember({
      ...member,
      blockoutDates: member.blockoutDates.filter((d) => d !== dateToRemove),
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Household',
      'Status',
      'Departments',
      'Roles',
      'DBS Safeguarding',
      'Blockout Dates',
    ];
    const rows = members.map((m) => [
      `"${m.fullName}"`,
      `"${m.email}"`,
      `"${m.phone}"`,
      `"${m.household}"`,
      `"${m.status}"`,
      `"${m.departments.join('; ')}"`,
      `"${m.qualifiedRoles.join('; ')}"`,
      `"${m.dbsStatus}"`,
      `"${m.blockoutDates.join('; ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prase-suite-church-directory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="suite-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="suite-eyebrow">Church community / People</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            People & teams
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage households, volunteer serving roles, DBS safeguarding clearances, and blockout dates with zero per-user fees
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Directory CSV
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Person / Volunteer
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateMember}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add Church Member & Ministry Volunteer Profile
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jordanoka Blake"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="jordan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mobile Phone
              </label>
              <input
                type="text"
                placeholder="+44 7700 900123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Household Name
              </label>
              <input
                type="text"
                placeholder="Blake Household"
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Primary Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as RotaDepartment)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="Band & Vocals">Band & Vocals</option>
                <option value="Praise AV & Tech">Praise AV & Tech</option>
                <option value="Hospitality & Welcome">Hospitality & Welcome</option>
                <option value="Kids & Youth">Kids & Youth</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Qualified Roles (comma-separated)
              </label>
              <input
                type="text"
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                DBS / Background Check Status
              </label>
              <select
                value={dbsStatus}
                onChange={(e) =>
                  setDbsStatus(
                    e.target.value as 'Cleared' | 'Pending Renewal' | 'Not Required'
                  )
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="Cleared">Cleared</option>
                <option value="Pending Renewal">Pending Renewal</option>
                <option value="Not Required">Not Required</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
            >
              Save Member Profile
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, role, household, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
          {(['ALL', 'Band & Vocals', 'Praise AV & Tech', 'Hospitality & Welcome', 'Kids & Youth'] as const).map(
            (dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setDeptFilter(dept)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  deptFilter === dept
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {dept === 'ALL' ? `All People (${members.length})` : dept}
              </button>
            )
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 pl-5 pr-3">Name & Household</th>
                <th className="py-3 px-3">Departments & Qualified Roles</th>
                <th className="py-3 px-3">Safeguarding (DBS)</th>
                <th className="py-3 px-3">Blockout Dates (Unavailable)</th>
                <th className="py-3 pl-3 pr-5 text-right">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pl-5 pr-3 align-top">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {m.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.household} · {m.status} · {m.email}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {m.pastoralNotes}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {m.departments.join(' · ')}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Roles: {m.qualifiedRoles.join(' / ')}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        m.dbsStatus === 'Cleared'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : m.dbsStatus === 'Pending Renewal'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {m.dbsStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.blockoutDates.length === 0 ? (
                        <span className="text-slate-400 text-[11px]">Available all Sundays</span>
                      ) : (
                        m.blockoutDates.map((d) => (
                          <span
                            key={d}
                            className="font-mono text-[11px] text-amber-700 dark:text-amber-400 underline cursor-pointer"
                            title="Click to remove blockout date"
                            onClick={() => handleRemoveBlockoutDate(m, d)}
                          >
                            {d} (×)
                          </span>
                        ))
                      )}
                      {selectedMemberIdForBlockout === m.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="date"
                            value={blockoutDateInput}
                            onChange={(e) => setBlockoutDateInput(e.target.value)}
                            className="px-1.5 py-0.5 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddBlockoutDate(m)}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-600 text-white rounded"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIdForBlockout(m.id)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                        >
                          + Add Blockout
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 align-top">
                    {m.attendanceRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
