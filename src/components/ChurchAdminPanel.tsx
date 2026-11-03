import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ChurchRole, ChurchSession, approveChurchAccess, churchInviteLink, removeChurchAccess, updateChurchAccess } from '../services/churchFirebase';
import { churchRules } from '../services/churchRules';

const ROLES: ChurchRole[] = ['admin', 'planner', 'av', 'musician', 'people', 'kids', 'finance', 'member'];
type Request = { uid: string; email: string; name: string };
type Membership = { uid: string; email: string; roles: ChurchRole[] };
type Profile = { uid: string; displayName?: string; contactNumber?: string; householdName?: string; familyNames?: string };

export function ChurchAdminPanel({ session, onClose }: { session: ChurchSession; onClose: () => void }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Record<string, ChurchRole[]>>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stopRequests = onSnapshot(collection(session.db, 'joinRequests'), (snapshot) => {
      setRequests(snapshot.docs.map((entry) => entry.data() as Request));
    }, (error) => setNotice(error.message));
    const stopMembers = onSnapshot(collection(session.db, 'memberships'), (snapshot) => {
      setMemberships(snapshot.docs.map((entry) => entry.data() as Membership));
    }, (error) => setNotice(error.message));
    const stopProfiles = onSnapshot(collection(session.db, 'profiles'), (snapshot) => {
      setProfiles(snapshot.docs.map((entry) => entry.data() as Profile));
    }, (error) => setNotice(error.message));
    return () => { stopRequests(); stopMembers(); stopProfiles(); };
  }, [session.db]);

  const toggle = (uid: string, role: ChurchRole) => {
    setSelected((prev) => {
      const existing = prev[uid] || memberships.find((member) => member.uid === uid)?.roles || ['member'];
      return { ...prev, [uid]: existing.includes(role) ? existing.filter((value) => value !== role) : [...existing, role] };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Church access">
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Church access · {session.connection.churchName}</h2><button onClick={onClose} aria-label="Close">✕</button></div>
        <p className="text-sm">Share this link. Each person signs in with Google or registers using an email address, verifies that email, adds their own details, then requests access. Review requests before granting shared church access.</p>
        <div className="flex gap-2"><input readOnly className="flex-1 p-2 border rounded text-xs text-slate-900" value={churchInviteLink(session.connection)} /><button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => navigator.clipboard.writeText(churchInviteLink(session.connection))}>Copy link</button></div>
        <div className="rounded-lg border border-sky-300 dark:border-sky-800 p-3 text-sm space-y-2"><p>For email registration and private profiles, enable Email/Password in Firebase Authentication and publish the latest church security rules in Firestore. Existing churches need to do this once.</p><button type="button" className="px-3 py-2 rounded border" onClick={() => navigator.clipboard.writeText(churchRules(session.connection.ownerEmail)).then(() => setNotice('Updated church rules copied. Paste them into Firestore → Rules and publish.')).catch(() => setNotice('Could not copy rules. Open the setup guide to generate them again.'))}>Copy updated security rules</button></div>
        <h3 className="font-semibold">Waiting for approval</h3>
        {!requests.length && <p className="text-sm">No requests yet.</p>}
        {requests.map((request) => {
          const profile = profiles.find((entry) => entry.uid === request.uid);
          return (
          <div key={request.uid} className="border rounded p-3 space-y-2">
            <strong>{request.name || request.email}</strong> <span className="text-sm">{request.email}</span>
            {profile && <p className="text-sm">Their details: {profile.displayName || 'Name not added'} · {profile.householdName || 'No household name'} · {profile.contactNumber || 'No contact number'}{profile.familyNames ? ` · Family: ${profile.familyNames}` : ''}</p>}
            <div className="flex flex-wrap gap-2 text-xs">{ROLES.map((role) => <label key={role} className="px-2 py-1 border rounded"><input type="checkbox" checked={(selected[request.uid] || ['member']).includes(role)} onChange={() => toggle(request.uid, role)} /> {role}</label>)}</div>
            <button disabled={busy || !(selected[request.uid] || ['member']).length} className="px-3 py-1 rounded bg-sky-600 text-white disabled:opacity-50" onClick={async () => {
              setBusy(true);
              try { await approveChurchAccess(session, request.uid, request.email, selected[request.uid] || ['member']); setNotice(`${request.email} approved.`); }
              catch (error) { setNotice(String(error)); }
              finally { setBusy(false); }
            }}>Approve</button>
          </div>
        ); })}
        <h3 className="font-semibold">Approved people</h3>
        {!memberships.length && <p className="text-sm">Only the project owner has access so far.</p>}
        {memberships.map((member) => {
          const roles = selected[member.uid] || member.roles || [];
          return <div key={member.uid} className="border-b py-3 text-sm space-y-2">
            <strong>{member.email}</strong>
            <div className="flex flex-wrap gap-2 text-xs">{ROLES.map((role) =>
              <label key={role} className="px-2 py-1 border rounded"><input type="checkbox" checked={roles.includes(role)} onChange={() => toggle(member.uid, role)} /> {role}</label>)}</div>
            <div className="flex gap-3">
              <button className="text-sky-700 dark:text-sky-300" disabled={busy || !roles.length} onClick={async () => {
                setBusy(true);
                try { await updateChurchAccess(session, member.uid, member.email, roles); setNotice('Roles saved for ' + member.email); }
                catch (error) { setNotice(String(error)); }
                finally { setBusy(false); }
              }}>Save roles</button>
              <button className="text-red-600" disabled={busy} onClick={async () => {
                if (!confirm('Remove access for ' + member.email + '?')) return;
                setBusy(true);
                try { await removeChurchAccess(session, member.uid); setNotice(member.email + ' removed.'); }
                catch (error) { setNotice(String(error)); }
                finally { setBusy(false); }
              }}>Remove</button>
            </div>
          </div>;
        })}
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <button className="px-3 py-2 rounded border" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
