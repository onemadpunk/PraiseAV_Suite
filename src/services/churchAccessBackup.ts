import { collection, getDocs } from 'firebase/firestore';
import { approveChurchAccess, type ChurchRole, type ChurchSession } from './churchFirebase';
import { missingAccess, type AccessEntry } from './backup';

const requireAdmin = (session: ChurchSession) => { if (!session.owner && !session.roles.includes('admin')) throw new Error('Only church administrators can back up or restore access.'); };

export async function readChurchAccess(session: ChurchSession): Promise<AccessEntry[]> {
  requireAdmin(session);
  const snapshot = await getDocs(collection(session.db, 'memberships'));
  return snapshot.docs.map((entry) => {
    const data = entry.data() as Partial<AccessEntry>;
    return { uid: entry.id, email: String(data.email || ''), roles: Array.isArray(data.roles) ? data.roles : [] };
  }).filter((entry) => entry.roles.length);
}

/** Gives back access to people listed in the backup who have lost it. Returns how many. */
export async function accessToRestore(session: ChurchSession, backup: AccessEntry[]) {
  return missingAccess(await readChurchAccess(session), backup, session.user.uid);
}

export async function restoreAccess(session: ChurchSession, people: AccessEntry[]) {
  for (const person of people) await approveChurchAccess(session, person.uid, person.email, person.roles as ChurchRole[]);
}
