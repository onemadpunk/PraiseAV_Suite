import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ChurchRole, ChurchSession, approveChurchAccess, boothConnectionCode, churchInviteLink, removeChurchAccess, updateChurchAccess } from '../services/churchFirebase';
import { churchRules } from '../services/churchRules';
import { checkChurchRulesHealth, ChurchRulesHealth } from '../services/churchRulesHealth';
import { churchListing, setChurchListed } from '../services/churchDirectory';

const ROLES: ChurchRole[] = ['admin', 'office_staff', 'planner', 'preacher', 'worship_leader', 'av', 'musician', 'people', 'kids', 'finance', 'member', 'family'];
const ROLE_NAMES: Record<ChurchRole, string> = { admin: 'Administrator', office_staff: 'Office staff', planner: 'Service planner', preacher: 'Preacher', worship_leader: 'Worship leader', av: 'AV operator', musician: 'Musician', people: 'People team', kids: 'Kids team', finance: 'Finance team', member: 'Member', family: 'Family' };
type Request = { uid: string; email: string; name: string; booth?: boolean };
type Membership = { uid: string; email: string; roles: ChurchRole[] };
type Profile = { uid: string; displayName?: string; contactNumber?: string; householdName?: string; familyNames?: string };

export function ChurchAdminPanel({ session, onClose }: { session: ChurchSession; onClose: () => void }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Record<string, ChurchRole[]>>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [rulesHealth, setRulesHealth] = useState<ChurchRulesHealth | 'checking'>('checking');
  const canManage = session.owner || session.roles.includes('admin');
  const [listing, setListing] = useState<'listed' | 'unlisted' | 'missing' | null>(null);
  const [listTown, setListTown] = useState('');
  const listed = listing === null ? null : listing === 'listed';
  useEffect(() => {
    if (!session.owner) return;
    let active = true;
    churchListing(session.connection).then((value) => { if (active) setListing(value); }, () => { if (active) setListing(null); });
    return () => { active = false; };
  }, [session.owner, session.connection]);
  const changeListing = async (next: boolean) => {
    if (next && listing === 'missing' && listTown.trim().length < 2) { setNotice('Enter the church’s town or city first.'); return; }
    setBusy(true);
    try {
      await setChurchListed(session.connection, next, listTown);
      setListing(next ? 'listed' : 'unlisted');
      setNotice(next ? 'Your church is listed. Members can now find it by name and town in the Suite and sign in.' : 'Your church is no longer listed. Members need the church link to sign in.');
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void checkChurchRulesHealth(session.db).then((health) => { if (active) setRulesHealth(health); });
    return () => { active = false; };
  }, [session.db, canManage]);

  useEffect(() => {
    if (!canManage) return;
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
  }, [session.db, canManage]);

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
        <div className="space-y-2 text-sm"><label className="block">Send an invitation email<input type="email" className="w-full mt-1 p-2 border rounded text-slate-900" placeholder="person@example.org" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label><a className="inline-block px-3 py-2 rounded border" href={inviteEmail.trim() ? `mailto:${encodeURIComponent(inviteEmail.trim())}?subject=${encodeURIComponent('Invitation to ' + session.connection.churchName + ' on PraiseAV Suite')}&body=${encodeURIComponent('Please use this link to join our church on PraiseAV Suite:\n' + churchInviteLink(session.connection) + '\n\nSign in and request access. A church administrator will approve your account.')}` : undefined} onClick={(event) => { if (!inviteEmail.trim()) event.preventDefault(); }}>Open email draft</a><p>The email opens in your mail app. An administrator still approves each request.</p></div>
        {canManage && <>
        <div className="rounded-lg border border-sky-300 dark:border-sky-800 p-3 text-sm space-y-2">
          <strong>Church security rules</strong>
          <p role="status">{rulesHealth === 'current' ? 'Current rules confirmed.' : rulesHealth === 'checking' ? 'Checking the connected church…' : rulesHealth === 'update-needed' ? 'An update is needed before using the latest church features.' : rulesHealth === 'unsafe' ? 'The connected rules allowed a read that should be blocked. Review them before inviting members.' : 'Could not check the rules while the church connection is unavailable.'}</p>
          {rulesHealth !== 'current' && <p>The church owner can publish the updated rules in Firebase Console. The church connection stays in place.</p>}
          {rulesHealth !== 'current' && <button type="button" className="px-3 py-2 rounded border" onClick={() => navigator.clipboard.writeText(churchRules(session.connection.ownerEmail)).then(() => setNotice('Updated church rules copied. Paste them into Firestore → Rules and publish, then check again.')).catch(() => setNotice('Could not copy rules. Open the setup guide to generate them again.'))}>Copy updated security rules</button>}
          <button type="button" className="px-3 py-2 rounded border" onClick={() => { setRulesHealth('checking'); void checkChurchRulesHealth(session.db).then(setRulesHealth); }}>Check again</button>
        </div>
        {session.owner && <div className="rounded-lg border border-sky-300 dark:border-sky-800 p-3 text-sm space-y-2">
          <strong>Let members find the church by name</strong>
          <p>When this is on, anyone can type your church’s name and town in the Suite and get its sign-in page, without the church link. They still need your approval before they see anything. Turn it off to go back to link-only.</p>
          <p role="status">{listed === null ? 'Checking…' : listed ? 'On: members can find the church by name.' : 'Off: members need the church link.'}</p>
          {listing === 'missing' && <label className="block">Town or city (shown with the church name)<input className="w-full mt-1 p-2 border rounded text-slate-900" value={listTown} onChange={(event) => setListTown(event.target.value)} /></label>}
          <button type="button" disabled={busy || listed === null} className="px-3 py-2 rounded border disabled:opacity-50" onClick={() => void changeListing(!listed)}>{listed ? 'Stop listing the church' : 'List the church'}</button>
        </div>}
        <div className="rounded-lg border border-emerald-400/60 p-3 text-sm space-y-2">
          <strong>Set up the booth computer</strong>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Copy the booth code below.</li>
            <li>On the church computer, open PraiseAV → More → Church cloud, paste the code, and choose an email and password for the booth. A church-owned address such as <em>yourchurch.avdesk@gmail.com</em> works well, and the same account can run the church’s Google Drive and YouTube. Open the verification email that arrives and click its link.</li>
            <li>A request marked <em>Booth computer</em> appears below. Click <em>Approve as booth computer</em>.</li>
          </ol>
          <p>The booth login can only read services, songs and sermons, so volunteers at the booth never see people, giving or children’s records. Using a separate login also keeps the administrator’s account off a shared computer.</p>
          <button type="button" className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={() => navigator.clipboard.writeText(boothConnectionCode(session.connection)).then(() => setNotice('Booth code copied. Paste it into PraiseAV on the church computer.')).catch(() => setNotice('Could not copy. Select the code and copy it: ' + boothConnectionCode(session.connection)))}>Copy booth code</button>
        </div>
        <h3 className="font-semibold">Waiting for approval</h3>
        {!requests.length && <p className="text-sm">No requests yet.</p>}
        {requests.map((request) => {
          const profile = profiles.find((entry) => entry.uid === request.uid);
          return (
          <div key={request.uid} className="border rounded p-3 space-y-2">
            <strong>{request.booth ? 'Booth computer (PraiseAV)' : request.name || request.email}</strong> <span className="text-sm">{request.email}</span>
            {request.booth && <div className="space-y-1"><p className="text-sm">PraiseAV on the church computer asked to connect. It gets the AV operator role only.</p><button disabled={busy} className="px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50" onClick={async () => {
              setBusy(true);
              try { await approveChurchAccess(session, request.uid, request.email, ['av']); setNotice('Booth computer approved. PraiseAV will start receiving services in a moment.'); }
              catch (error) { setNotice(String(error)); }
              finally { setBusy(false); }
            }}>Approve as booth computer</button></div>}
            {profile && <p className="text-sm">Their details: {profile.displayName || 'Name not added'} · {profile.householdName || 'No household name'} · {profile.contactNumber || 'No contact number'}{profile.familyNames ? ` · Family: ${profile.familyNames}` : ''}</p>}
            <div className="flex flex-wrap gap-2 text-xs">{ROLES.map((role) => <label key={role} className="px-2 py-1 border rounded"><input type="checkbox" checked={(selected[request.uid] || ['member']).includes(role)} onChange={() => toggle(request.uid, role)} /> {ROLE_NAMES[role]}</label>)}</div>
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
              <label key={role} className="px-2 py-1 border rounded"><input type="checkbox" checked={roles.includes(role)} onChange={() => toggle(member.uid, role)} /> {ROLE_NAMES[role]}</label>)}</div>
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
        </>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <button className="px-3 py-2 rounded border" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
