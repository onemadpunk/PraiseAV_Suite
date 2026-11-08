import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { ChurchSession } from './churchFirebase';
import { withReply, type RotaReplyDoc, type RotaReplyStatus } from '../utils/rotaReplies';

export function canSeeAllRotaReplies(session: ChurchSession): boolean {
  return session.owner || session.roles.some((role) => role === 'admin' || role === 'planner' || role === 'worship_leader');
}

// Planners watch every reply; everyone else watches only their own.
export function subscribeRotaReplies(session: ChurchSession, onData: (docs: RotaReplyDoc[]) => void, onError: (error: Error) => void) {
  if (canSeeAllRotaReplies(session)) {
    return onSnapshot(collection(session.db, 'rotaReplies'), (snapshot) => onData(snapshot.docs.map((entry) => entry.data() as RotaReplyDoc)), onError);
  }
  return onSnapshot(doc(session.db, 'rotaReplies', session.user.uid), (snapshot) => onData(snapshot.exists() ? [snapshot.data() as RotaReplyDoc] : []), onError);
}

export async function saveRotaReply(session: ChurchSession, current: RotaReplyDoc | null, planId: string, status: RotaReplyStatus | null) {
  const email = session.user.email || '';
  if (!email) throw new Error('Sign in with an email address to reply to the rota.');
  const next = withReply(current, session.user.uid, email, planId, status);
  await setDoc(doc(session.db, 'rotaReplies', session.user.uid), next);
  return next;
}
