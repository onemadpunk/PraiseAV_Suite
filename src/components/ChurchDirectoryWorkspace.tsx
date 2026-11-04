import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ChurchSession } from '../services/churchFirebase';

type Listing = {
  uid: string;
  displayName: string;
  householdName: string;
  email: string;
  contactNumber: string;
};

export function ChurchDirectoryWorkspace({ session, onEdit }: { session: ChurchSession; onEdit: () => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => onSnapshot(collection(session.db, 'directoryListings'), (snapshot) => {
    setListings(snapshot.docs.map((entry) => entry.data() as Listing));
    setError('');
  }, (cause) => setError(cause.message)), [session.db]);

  const matches = listings.filter((entry) => `${entry.displayName} ${entry.householdName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Church directory</h1><p className="text-sm">Contact details shared by approved church members who chose to be listed.</p></div>
      <button type="button" className="px-3 py-2 rounded bg-sky-600 text-white" onClick={onEdit}>My directory choices</button>
    </div>
    <input type="search" aria-label="Search directory" placeholder="Search by name or household" className="w-full p-2 border rounded bg-white dark:bg-slate-800" value={search} onChange={(event) => setSearch(event.target.value)} />
    {error && <p role="alert">Could not load the directory: {error}</p>}
    {!error && !matches.length && <p className="text-sm">No matching listings.</p>}
    <div className="grid gap-3 md:grid-cols-2">{matches.map((entry) => <article key={entry.uid} className="border rounded-xl p-4 space-y-1">
      <h2 className="font-semibold">{entry.displayName}</h2>
      {entry.householdName && <p className="text-sm">{entry.householdName}</p>}
      {entry.email && <a className="block text-sm underline" href={`mailto:${entry.email}`}>{entry.email}</a>}
      {entry.contactNumber && <a className="block text-sm underline" href={`tel:${entry.contactNumber}`}>{entry.contactNumber}</a>}
    </article>)}</div>
  </section>;
}
