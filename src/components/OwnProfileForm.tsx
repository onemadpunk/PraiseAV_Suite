import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ChurchSession } from '../services/churchFirebase';

type OwnProfile = {
  uid: string;
  email: string;
  displayName: string;
  contactNumber: string;
  householdName: string;
  familyNames: string;
  updatedAt: string;
};

export function OwnProfileForm({ session }: { session: ChurchSession }) {
  const [displayName, setDisplayName] = useState(session.user.displayName || '');
  const [contactNumber, setContactNumber] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [familyNames, setFamilyNames] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(doc(session.db, 'profiles', session.user.uid), (snapshot) => {
    const profile = snapshot.data() as OwnProfile | undefined;
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setContactNumber(profile.contactNumber || '');
    setHouseholdName(profile.householdName || '');
    setFamilyNames(profile.familyNames || '');
  }, (error) => setNotice(`Could not load your profile: ${error.message}`)), [session.db, session.user.uid]);

  const save = async () => {
    if (!displayName.trim()) { setNotice('Enter your name before saving.'); return; }
    setBusy(true);
    try {
      const profile: OwnProfile = {
        uid: session.user.uid,
        email: session.user.email || '',
        displayName: displayName.trim().slice(0, 100),
        contactNumber: contactNumber.trim().slice(0, 40),
        householdName: householdName.trim().slice(0, 100),
        familyNames: familyNames.trim().slice(0, 200),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(session.db, 'profiles', session.user.uid), profile);
      setNotice('Your details were saved. Only you and church administrators can see this profile for now.');
    } catch (error) { setNotice(`Could not save your profile: ${String(error)}`); }
    finally { setBusy(false); }
  };

  return <section aria-label="My details" className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 space-y-3">
    <h2 className="font-semibold">My details</h2>
    <p className="text-sm">Add the details you want your church administrator to have. These are not yet shown in a member address book. Do not enter children’s medical or safeguarding information here.</p>
    <label className="block text-sm">Your name<input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
    <label className="block text-sm">Contact number <span className="text-slate-500">(optional)</span><input type="tel" className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={40} value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} /></label>
    <label className="block text-sm">Household name <span className="text-slate-500">(optional)</span><input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={100} value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label>
    <label className="block text-sm">Other family members’ names <span className="text-slate-500">(optional, private to administrators)</span><input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={200} value={familyNames} onChange={(event) => setFamilyNames(event.target.value)} /></label>
    <button type="button" className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy} onClick={save}>Save my details</button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
