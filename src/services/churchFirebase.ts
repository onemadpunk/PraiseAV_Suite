import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider, User, createUserWithEmailAndPassword, getAuth,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut,
} from 'firebase/auth';
import { Firestore, collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

export type ChurchRole = 'admin' | 'office_staff' | 'planner' | 'preacher' | 'worship_leader' | 'av' | 'musician' | 'people' | 'kids' | 'finance' | 'member' | 'family';
export type DataDomain = 'plans' | 'songs' | 'members' | 'checkins' | 'groups' | 'bookings' | 'donations';

export interface ChurchConnection {
  config: FirebaseOptions & { projectId: string; appId: string; apiKey: string; authDomain: string };
  ownerEmail: string;
  churchName: string;
}

export interface ChurchSession {
  connection: ChurchConnection;
  app: FirebaseApp;
  db: Firestore;
  user: User;
  roles: ChurchRole[];
  owner: boolean;
}

const STORAGE_KEY = 'praiseav_suite_church_connection_v1';
const DOMAINS: DataDomain[] = ['plans', 'songs', 'members', 'checkins', 'groups', 'bookings', 'donations'];
const ROLE_LIST: ChurchRole[] = ['admin', 'office_staff', 'planner', 'preacher', 'worship_leader', 'av', 'musician', 'people', 'kids', 'finance', 'member', 'family'];

// Sign-in and live membership changes must accept exactly the same supported roles.
export function churchRolesFromMembership(value:unknown):ChurchRole[] {
  return Array.isArray(value) ? [...new Set(value.filter((role):role is ChurchRole=>ROLE_LIST.includes(role as ChurchRole)))] : [];
}

export function parseFirebaseConfigText(text: string): Record<string, string> {
  try {
    const json = JSON.parse(text) as unknown;
    if (json && typeof json === 'object' && !Array.isArray(json)) return json as Record<string, string>;
  } catch { /* Firebase Console often shows a JavaScript const rather than JSON. */ }
  const fields: Record<string, string> = {};
  for (const match of text.matchAll(/\b(apiKey|authDomain|projectId|appId)\s*:\s*['"]([^'"]+)['"]/g)) {
    fields[match[1]] = match[2];
  }
  if (Object.keys(fields).length !== 4) throw new Error('Paste the Firebase web app configuration shown in Project settings.');
  return fields;
}

export function parseChurchConnection(input: unknown): ChurchConnection {
  if (!input || typeof input !== 'object') throw new Error('Paste the Firebase web app configuration.');
  const raw = input as Record<string, unknown>;
  const source = raw.config && typeof raw.config === 'object' ? raw.config as Record<string, unknown> : raw;
  const config = {} as ChurchConnection['config'];
  for (const key of ['projectId', 'appId', 'apiKey', 'authDomain'] as const) {
    if (typeof source[key] !== 'string' || !source[key].trim()) throw new Error(`Firebase configuration is missing ${key}.`);
    config[key] = source[key].trim();
  }
  if (!/^[a-z0-9-]{6,100}$/.test(config.projectId)) throw new Error('Firebase project ID is invalid.');
  const ownerEmail = String(raw.ownerEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error('Enter the church administrator’s Google email address.');
  const churchName = String(raw.churchName || '').trim().slice(0, 100);
  if (!churchName) throw new Error('Enter the church name.');
  return { config, ownerEmail, churchName };
}

export function readChurchConnection(): ChurchConnection | null {
  try {
    const query = new URLSearchParams(location.search).get('church');
    if (query) {
      const bytes = Uint8Array.from(atob(query.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
      const decoded = JSON.parse(new TextDecoder().decode(bytes));
      return parseChurchConnection(decoded);
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseChurchConnection(JSON.parse(saved)) : null;
  } catch { return null; }
}

export function saveChurchConnection(connection: ChurchConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}

export function clearChurchConnection() {
  localStorage.removeItem(STORAGE_KEY);
}

export function churchInviteLink(connection: ChurchConnection): string {
  const bytes = new TextEncoder().encode(JSON.stringify(connection));
  const data = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(location.href);
  url.search = new URLSearchParams({ church: data }).toString();
  return url.toString();
}

export function churchApp(connection: ChurchConnection): FirebaseApp {
  const name = `church-${connection.config.projectId}`;
  return getApps().some((app) => app.name === name) ? getApp(name) : initializeApp(connection.config, name);
}

export async function signInChurch(connection: ChurchConnection): Promise<User> {
  const auth = getAuth(churchApp(connection));
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function registerChurchEmail(connection: ChurchConnection, email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(getAuth(churchApp(connection)), email.trim(), password);
  await sendEmailVerification(result.user);
  return result.user;
}

export async function signInChurchEmail(connection: ChurchConnection, email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(getAuth(churchApp(connection)), email.trim(), password);
  return result.user;
}

export async function resendChurchVerification(user: User): Promise<void> {
  if (!user.emailVerified) await sendEmailVerification(user);
}

export async function resetChurchEmailPassword(connection: ChurchConnection, email: string): Promise<void> {
  await sendPasswordResetEmail(getAuth(churchApp(connection)), email.trim());
}

export async function signOutChurch(connection: ChurchConnection) {
  await signOut(getAuth(churchApp(connection)));
}

export async function getChurchRoles(db: Firestore, user: User, ownerEmail: string): Promise<{ roles: ChurchRole[]; owner: boolean }> {
  const owner = Boolean(user.emailVerified && user.email?.toLowerCase() === ownerEmail);
  if (owner) return { roles: ROLE_LIST, owner: true };
  if (!user.emailVerified) return { roles: [], owner: false };
  const membership = await getDoc(doc(db, 'memberships', user.uid));
  const roles = churchRolesFromMembership(membership.data()?.roles);
  return { roles, owner: false };
}

export function canRead(session: ChurchSession, domain: DataDomain): boolean {
  if (session.owner || session.roles.includes('admin')) return true;
  const allowed: Record<DataDomain, ChurchRole[]> = {
    plans: ['planner', 'preacher', 'worship_leader', 'av', 'musician', 'office_staff'], songs: ['planner', 'preacher', 'worship_leader', 'av', 'musician'],
    members: ['people'], checkins: ['kids'], groups: ['member'],
    bookings: ['member'], donations: ['finance'],
  };
  return allowed[domain].some((role) => session.roles.includes(role));
}

export function canWrite(session: ChurchSession, domain: DataDomain): boolean {
  if (session.owner || session.roles.includes('admin')) return true;
  const allowed: Partial<Record<DataDomain, ChurchRole[]>> = {
    plans: ['planner', 'worship_leader'], songs: ['planner', 'worship_leader'], members: ['people'],
    checkins: ['kids'], groups: [], bookings: [], donations: ['finance'],
  };
  return (allowed[domain] || []).some((role) => session.roles.includes(role));
}

export function subscribeChurchDomain<T extends { id: string }>(session: ChurchSession, domain: DataDomain, onData: (items: T[]) => void, onError: (error: Error) => void) {
  if (!DOMAINS.includes(domain) || !canRead(session, domain)) { onData([]); return () => {}; }
  return onSnapshot(collection(session.db, domain), (snapshot) => {
    onData(snapshot.docs.map((entry) => entry.data() as T).filter((item) => typeof item.id === 'string'));
  }, onError);
}

export async function saveChurchChanges<T extends { id: string }>(session: ChurchSession, domain: DataDomain, before: T[], after: T[]) {
  if (!canWrite(session, domain)) throw new Error('Your church role cannot change these records.');
  const prior = new Map(before.map((item) => [item.id, item]));
  const next = new Map(after.map((item) => [item.id, item]));
  const changes: Array<{ id: string; value?: T }> = [];
  for (const [id, value] of next) if (JSON.stringify(prior.get(id)) !== JSON.stringify(value)) changes.push({ id, value });
  for (const id of prior.keys()) if (!next.has(id)) changes.push({ id });
  // Role checks read a membership document in Firestore rules. Keep non-owner
  // batches below the rules engine's 20 document-access-call limit.
  const batchSize = session.owner ? 400 : 5;
  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = writeBatch(session.db);
    for (const change of changes.slice(i, i + batchSize)) {
      if (!/^[A-Za-z0-9_-]{1,150}$/.test(change.id)) throw new Error('A record has an invalid ID.');
      const reference = doc(session.db, domain, change.id);
      if (change.value) batch.set(reference, JSON.parse(JSON.stringify(change.value)));
      else batch.delete(reference);
    }
    await batch.commit();
  }
}

export async function requestChurchAccess(session: ChurchSession) {
  if (!session.user.emailVerified) throw new Error('Verify your email before asking to join this church.');
  await setDoc(doc(session.db, 'joinRequests', session.user.uid), {
    uid: session.user.uid,
    email: session.user.email || '',
    name: session.user.displayName || '',
    requestedAt: new Date().toISOString(),
  });
}

export async function approveChurchAccess(session: ChurchSession, uid: string, email: string, roles: ChurchRole[]) {
  if (!session.owner && !session.roles.includes('admin')) throw new Error('Only a church administrator can approve access.');
  if (roles.some((role) => !ROLE_LIST.includes(role))) throw new Error('Unknown role.');
  const batch = writeBatch(session.db);
  batch.set(doc(session.db, 'memberships', uid), { uid, email, roles, approvedAt: new Date().toISOString() });
  batch.delete(doc(session.db, 'joinRequests', uid));
  await batch.commit();
}

export async function removeChurchAccess(session: ChurchSession, uid: string) {
  if (!session.owner && !session.roles.includes('admin')) throw new Error('Only a church administrator can remove access.');
  const batch = writeBatch(session.db);
  batch.delete(doc(session.db, 'directoryListings', uid));
  batch.delete(doc(session.db, 'memberships', uid));
  await batch.commit();
}

export async function updateChurchAccess(session: ChurchSession, uid: string, email: string, roles: ChurchRole[]) {
  if (!session.owner && !session.roles.includes('admin')) throw new Error('Only a church administrator can change access.');
  if (!roles.length || roles.some((role) => !ROLE_LIST.includes(role))) throw new Error('Choose at least one known role.');
  await setDoc(doc(session.db, 'memberships', uid), { uid, email, roles, approvedAt: new Date().toISOString() });
}
