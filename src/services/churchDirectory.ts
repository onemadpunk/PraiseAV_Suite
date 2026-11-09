import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { Timestamp, collection, deleteField, doc, getDoc, getDocs, getFirestore, limit, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import type { ChurchConnection } from './churchFirebase';
import { emailSha256 } from './churchFirebase';

export type DirectoryChurch = {
  id: string;
  churchName: string;
  town: string;
  nameKey: string;
  townKey: string;
  status: 'setting-up' | 'ready' | 'cancelled';
  ownerUid: string;
  expiresAt?: Timestamp;
  projectId?: string;
  /** Present only when the church's owner chose to let members find it by name and sign in. */
  signIn?: DirectorySignIn;
};

/** The church's public Firebase Web configuration (the same as in its church link), minus the owner's email. */
export type DirectorySignIn = { apiKey: string; authDomain: string; projectId: string; appId: string; ownerEmailSha256: string };

const RESERVATION_KEY = 'praiseav_suite_church_reservation_v1';
const DIRECTORY_PROJECT = 'praiseav-suite';

export function churchKey(value: string): string {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '').replace(/\bst\.?\b/g, 'saint')
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function directoryId(churchName: string, town: string): string {
  const name = churchKey(churchName);
  const place = churchKey(town);
  if (name.length < 3 || place.length < 2) throw new Error('Enter a church name and town to continue.');
  return `${name}--${place}`;
}

async function directoryApp(): Promise<FirebaseApp> {
  const name = 'praiseav-directory';
  if (getApps().some((app) => app.name === name)) return getApp(name);
  // Firebase Hosting exposes its public Web configuration at this reserved URL.
  // The directory belongs to the PraiseAV registration service; church records stay elsewhere.
  const response = await fetch('/__/firebase/init.json');
  if (!response.ok) throw new Error('Church lookup is available at praiseav-suite.web.app. Open that address to register a church.');
  const config = await response.json() as FirebaseOptions;
  if (config.projectId !== DIRECTORY_PROJECT || !config.appId || !config.apiKey) {
    throw new Error('Church lookup is not configured for this site.');
  }
  return initializeApp(config, name);
}

export async function findChurches(churchName: string): Promise<DirectoryChurch[]> {
  const nameKey = churchKey(churchName);
  if (nameKey.length < 3) throw new Error('Enter at least three letters of the church name.');
  const db = getFirestore(await directoryApp());
  const snapshot = await getDocs(query(collection(db, 'churchDirectory'), where('nameKey', '==', nameKey), limit(20)));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as DirectoryChurch));
}

export function savedReservation(): { id: string; churchName: string; town: string; ownerEmail: string } | null {
  try {
    const raw = localStorage.getItem(RESERVATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value.id === 'string' && typeof value.churchName === 'string' && typeof value.town === 'string' && typeof value.ownerEmail === 'string' ? value : null;
  } catch { return null; }
}

export async function refreshSavedReservation(): Promise<boolean> {
  const saved = savedReservation();
  if (!saved) return false;
  const db = getFirestore(await directoryApp());
  const snapshot = await getDoc(doc(db, 'churchDirectory', saved.id));
  const reservation = snapshot.data() as DirectoryChurch | undefined;
  const active = Boolean(reservation?.status === 'setting-up' && reservation.expiresAt && reservation.expiresAt.toMillis() > Date.now());
  if (!active) localStorage.removeItem(RESERVATION_KEY);
  return active;
}

export async function reserveChurch(churchName: string, town: string, useSignedIn = false): Promise<{ id: string; ownerEmail: string }> {
  const id = directoryId(churchName, town);
  const app = await directoryApp();
  const auth = getAuth(app);
  await auth.authStateReady();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const user = useSignedIn && auth.currentUser ? auth.currentUser : (await signInWithPopup(auth, provider)).user;
  if (!user.emailVerified || !user.email) throw new Error('Verify your Google account email before registering a church.');
  const db = getFirestore(app);
  const reference = doc(db, 'churchDirectory', id);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    const prior = existing.data() as DirectoryChurch | undefined;
    if (prior && (prior.status === 'ready' || (prior.status !== 'cancelled' && (!prior.expiresAt || prior.expiresAt.toMillis() > Date.now())))) {
      throw new Error('This church already has a registration. Ask its administrator for the church link.');
    }
    transaction.set(reference, {
      churchName: churchName.trim().slice(0, 100), town: town.trim().slice(0, 100),
      nameKey: churchKey(churchName), townKey: churchKey(town), status: 'setting-up',
      ownerUid: user.uid, expiresAt: Timestamp.fromMillis(Date.now() + 13 * 24 * 60 * 60 * 1000),
    });
  });
  const ownerEmail = user.email.toLowerCase();
  localStorage.setItem(RESERVATION_KEY, JSON.stringify({ id, churchName: churchName.trim(), town: town.trim(), ownerEmail }));
  return { id, ownerEmail };
}

export async function finishChurchRegistration(id: string, projectId: string, ownerEmail: string): Promise<void> {
  const app = await directoryApp();
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user?.emailVerified || user.email?.toLowerCase() !== ownerEmail.toLowerCase()) throw new Error('Finish setup with the same Google account that registered this church.');
  const db = getFirestore(app);
  await runTransaction(db, async (transaction) => {
    const reference = doc(db, 'churchDirectory', id);
    const current = await transaction.get(reference);
    if (!current.exists() || current.data().ownerUid !== user.uid || current.data().status !== 'setting-up') {
      throw new Error('This church reservation is no longer yours. Search for the church again.');
    }
    transaction.update(reference, { status: 'ready', projectId, expiresAt: null });
  });
  localStorage.removeItem(RESERVATION_KEY);
}

export async function cancelChurchReservation(id: string): Promise<void> {
  const app = await directoryApp();
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again to change this registration.');
  const db = getFirestore(app);
  await runTransaction(db, async (transaction) => {
    const reference = doc(db, 'churchDirectory', id);
    const current = await transaction.get(reference);
    if (!current.exists() || current.data().ownerUid !== user.uid || current.data().status !== 'setting-up') return;
    transaction.update(reference, { status: 'cancelled' });
  });
  localStorage.removeItem(RESERVATION_KEY);
}

/** Opens a church found in the public list, as its church link would. */
export function connectionFromDirectory(church: DirectoryChurch): ChurchConnection | null {
  const signIn = church.signIn;
  if (church.status !== 'ready' || !signIn || signIn.projectId !== church.projectId) return null;
  return {
    config: { apiKey: signIn.apiKey, authDomain: signIn.authDomain, projectId: signIn.projectId, appId: signIn.appId },
    churchName: church.churchName, ownerEmail: '', ownerEmailSha256: signIn.ownerEmailSha256,
  };
}

/** The owner finds their own entry in the public list (they registered it with their Google account). */
async function ownEntry(connection: ChurchConnection) {
  const app = await directoryApp();
  const auth = getAuth(app);
  await auth.authStateReady();
  let user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== connection.ownerEmail) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account', login_hint: connection.ownerEmail });
    user = (await signInWithPopup(auth, provider)).user;
  }
  if (user.email?.toLowerCase() !== connection.ownerEmail) throw new Error('Use the Google account that registered this church (' + connection.ownerEmail + ').');
  const db = getFirestore(app);
  const found = await getDocs(query(collection(db, 'churchDirectory'), where('ownerUid', '==', user.uid), where('projectId', '==', connection.config.projectId), limit(1)));
  return { db, entry: found.empty ? null : found.docs[0] };
}

/** 'missing': set up before the church list existed, so the owner adds it (with its town) when listing it. */
export async function churchListing(connection: ChurchConnection): Promise<'listed' | 'unlisted' | 'missing'> {
  const db = getFirestore(await directoryApp());
  const found = await getDocs(query(collection(db, 'churchDirectory'), where('projectId', '==', connection.config.projectId), limit(5)));
  if (found.empty) return 'missing';
  return found.docs.some((entry) => Boolean(entry.data().signIn)) ? 'listed' : 'unlisted';
}

/** Lets members find the church by name and sign in, or stops that. Only the church's owner can. */
export async function setChurchListed(connection: ChurchConnection, listed: boolean, town = ''): Promise<void> {
  let { db, entry } = await ownEntry(connection);
  if (!entry && listed) {
    // A church set up before the list existed: register its name and town now, as setup does.
    const reservation = await reserveChurch(connection.churchName, town, true);
    await finishChurchRegistration(reservation.id, connection.config.projectId, connection.ownerEmail);
    ({ db, entry } = await ownEntry(connection));
  }
  if (!entry) throw new Error('This church is not in the PraiseAV church list yet.');
  if (!listed) { await updateDoc(doc(db, 'churchDirectory', entry.id), { signIn: deleteField() }); return; }
  const { apiKey, authDomain, projectId, appId } = connection.config;
  const signIn: DirectorySignIn = { apiKey, authDomain, projectId, appId, ownerEmailSha256: await emailSha256(connection.ownerEmail) };
  await updateDoc(doc(db, 'churchDirectory', entry.id), { signIn });
}

/** The name a listed church goes by now, so members' browsers pick up a rename. */
export async function listedChurchName(projectId: string): Promise<string | null> {
  const db = getFirestore(await directoryApp());
  const found = await getDocs(query(collection(db, 'churchDirectory'), where('projectId', '==', projectId), where('status', '==', 'ready'), limit(1)));
  return found.empty ? null : String(found.docs[0].data().churchName || '') || null;
}

/** The owner renames the church: a new entry under the new name, keeping the town and listing, then the old one is retired. */
export async function renameChurch(connection: ChurchConnection, newName: string): Promise<void> {
  const name = newName.trim().slice(0, 100);
  const { db, entry } = await ownEntry(connection);
  if (!entry) throw new Error('List the church first, then rename it.');
  const old = entry.data() as DirectoryChurch;
  if (directoryId(name, old.town) === entry.id) throw new Error('That is the same name. Choose a different name.');
  const reservation = await reserveChurch(name, old.town, true);
  await finishChurchRegistration(reservation.id, connection.config.projectId, connection.ownerEmail);
  if (old.signIn) await updateDoc(doc(db, 'churchDirectory', reservation.id), { signIn: old.signIn });
  await updateDoc(doc(db, 'churchDirectory', entry.id), { status: 'cancelled', signIn: deleteField() });
}
