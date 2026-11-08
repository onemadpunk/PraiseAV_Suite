import type { RotaAssignment, ServicePlan } from '../types/church';

// A volunteer's own answer to being on a service rota. Each person stores their
// replies in one document of their own; the planner sees them beside the rota.
export type RotaReplyStatus = 'Confirmed' | 'Declined';
export interface RotaReplyDoc {
  uid: string;
  email: string;
  replies: Record<string, RotaReplyStatus>; // planId → reply
  updatedAt: string;
}
export interface RotaReply { status: RotaReplyStatus; email: string; }
/** planId → email fingerprint → reply */
export type RotaReplyIndex = Record<string, Record<string, RotaReply>>;

export const MAX_ROTA_REPLIES = 200;

export function withReply(docValue: RotaReplyDoc | null, uid: string, email: string, planId: string, status: RotaReplyStatus | null, now = new Date().toISOString()): RotaReplyDoc {
  const replies = { ...(docValue?.replies || {}) };
  if (status) replies[planId] = status; else delete replies[planId];
  const ids = Object.keys(replies);
  // Keep the newest answers if someone has replied to a very long run of services.
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_ROTA_REPLIES))) delete replies[old];
  return { uid, email, replies, updatedAt: now }; // email must equal the signed-in account's own address
}

export function indexRotaReplies(docs: RotaReplyDoc[], fingerprints: Record<string, string>): RotaReplyIndex {
  const index: RotaReplyIndex = {};
  for (const entry of docs) {
    const hash = fingerprints[entry.email.trim().toLowerCase()];
    if (!hash || !entry.replies || typeof entry.replies !== 'object') continue;
    for (const [planId, status] of Object.entries(entry.replies)) {
      if (status !== 'Confirmed' && status !== 'Declined') continue;
      (index[planId] ||= {})[hash] = { status, email: entry.email };
    }
  }
  return index;
}


export function replyFor(plan: ServicePlan, entry: RotaAssignment, index: RotaReplyIndex): RotaReply | undefined {
  return entry.memberEmailHash ? index[plan.id]?.[entry.memberEmailHash] : undefined;
}

/** A volunteer's reply fills in a Pending assignment. A status the planner set themselves wins. */
export function effectiveRotaStatus(plan: ServicePlan, entry: RotaAssignment, index: RotaReplyIndex): RotaAssignment['status'] {
  return entry.status === 'Pending' ? replyFor(plan, entry, index)?.status || 'Pending' : entry.status;
}
