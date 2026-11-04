import { useEffect, useState } from 'react';
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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
  const [listed, setListed] = useState(false);
  const [hasListing, setHasListing] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
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

  useEffect(() => {
    if (!session.owner && !session.roles.length) return;
    return onSnapshot(doc(session.db, 'directoryListings', session.user.uid), (snapshot) => {
      const listing = snapshot.data();
      setListed(snapshot.exists());
      setHasListing(snapshot.exists());
      setShowHousehold(listing?.showHousehold === true);
      setShowEmail(listing?.showEmail === true);
      setShowPhone(listing?.showPhone === true);
    }, (error) => setNotice(`Could not load your directory choice: ${error.message}`));
  }, [session.db, session.owner, session.roles, session.user.uid]);

  const save = async () => {
    if (!displayName.trim()) { setNotice('Enter your name before saving.'); return; }
    if (listed && showHousehold && !householdName.trim()) { setNotice('Add a household name or turn off household sharing.'); return; }
    if (listed && showPhone && !contactNumber.trim()) { setNotice('Add a contact number or turn off phone sharing.'); return; }
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
      if (session.owner || session.roles.length) {
        const listingRef = doc(session.db, 'directoryListings', session.user.uid);
        if (listed) {
          await setDoc(listingRef, {
            uid: session.user.uid,
            displayName: profile.displayName,
            householdName: showHousehold ? profile.householdName : '',
            email: showEmail ? profile.email : '',
            contactNumber: showPhone ? profile.contactNumber : '',
            showHousehold, showEmail, showPhone,
            consentVersion: 'v1',
            consentAt: serverTimestamp(),
          });
        } else if (hasListing) {
          await deleteDoc(listingRef);
        }
      }
      setNotice('Your details and directory choices were saved.');
    } catch (error) { setNotice(`Could not save your profile: ${String(error)}`); }
    finally { setBusy(false); }
  };

  return <section aria-label="My details" className="rounded-xl border border-slate-300 dark:border-slate-700 p-4 space-y-3">
    <h2 className="font-semibold">My details</h2>
    <p className="text-sm">Your details are private to you and church administrators. Do not enter children’s medical or safeguarding information here.</p>
    <label className="block text-sm">Your name<input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
    <label className="block text-sm">Contact number <span className="text-slate-500">(optional)</span><input type="tel" className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={40} value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} /></label>
    <label className="block text-sm">Household name <span className="text-slate-500">(optional)</span><input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={100} value={householdName} onChange={(event) => setHouseholdName(event.target.value)} /></label>
    <label className="block text-sm">Other family members’ names <span className="text-slate-500">(optional, private to administrators)</span><input className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-800" maxLength={200} value={familyNames} onChange={(event) => setFamilyNames(event.target.value)} /></label>
    {(session.owner || session.roles.length > 0) && <fieldset className="border rounded p-3 space-y-2 text-sm">
      <legend className="font-semibold">Church member directory</legend>
      <p>Sharing is optional. Only approved members of this church can see your listing. You can remove it at any time. Other family members’ names are never listed.</p>
      <label className="block"><input type="checkbox" checked={listed} onChange={(event) => setListed(event.target.checked)} /> I agree to share my name with other approved church members</label>
      {listed && <>
        <label className="block"><input type="checkbox" checked={showHousehold} onChange={(event) => setShowHousehold(event.target.checked)} /> Show my household name</label>
        <label className="block"><input type="checkbox" checked={showEmail} onChange={(event) => setShowEmail(event.target.checked)} /> Show my email address</label>
        <label className="block"><input type="checkbox" checked={showPhone} onChange={(event) => setShowPhone(event.target.checked)} /> Show my contact number</label>
      </>}
    </fieldset>}
    <button type="button" className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy} onClick={save}>Save my details</button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
