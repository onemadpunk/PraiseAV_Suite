import type { ServicePlan } from '../types/church';
import { assignmentsForEmailHash } from './serviceSharing';
import type { RotaReplyStatus } from './rotaReplies';

// "You're on the rota": when the worship leader presses Let the team know, the plan records when.
// Everyone assigned to that service then sees it in the Suite (a badge on Band stand and a notice
// at the top of it) until they reply. Musicians can already read plans, so nothing new is stored
// about them and no new permissions are needed.

export interface TeamNotice { plan: ServicePlan; roles: string[]; sentAt: string }

export function teamNoticeFor(sentBy: string, now = new Date()) {
  return { sentAt: now.toISOString(), sentBy: sentBy.slice(0, 200) };
}

/** Upcoming services this person was told about and hasn't answered yet, soonest first. */
export function pendingTeamNotices(plans: ServicePlan[], emailHash: string, replies: Record<string, RotaReplyStatus>, today: string): TeamNotice[] {
  if (!emailHash) return [];
  return plans
    .filter((plan) => plan.teamNotice?.sentAt && plan.date >= today && !replies[plan.id])
    .map((plan) => ({ plan, roles: assignmentsForEmailHash(plan, emailHash).map((entry) => entry.role), sentAt: plan.teamNotice!.sentAt }))
    .filter((notice) => notice.roles.length)
    .sort((a, b) => a.plan.date.localeCompare(b.plan.date));
}
