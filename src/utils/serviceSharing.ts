import type { Member, ServicePlan, Song } from '../types/church';

export function assignedEmailAddresses(plan: ServicePlan, members: Member[]): string[] {
  const byId = new Map(members.map((member) => [member.id, member.email.trim()]));
  return [...new Set(plan.rota.filter((entry) => entry.status !== 'Declined')
    .map((entry) => byId.get(entry.memberId) || '')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
}

export async function emailFingerprint(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function assignmentsForEmailHash(plan: ServicePlan, emailHash: string) {
  return emailHash ? plan.rota.filter((entry) => entry.status !== 'Declined' && entry.memberEmailHash === emailHash) : [];
}

export function serviceTeamMessage(plan: ServicePlan, songs: Song[], link: string): string {
  const byId = new Map(songs.map((song) => [song.id, song]));
  const order = plan.items.map((item, index) => {
    const song = item.songId ? byId.get(item.songId) : undefined;
    const key = song ? item.musicalKey || song.defaultKey : '';
    return `${index + 1}. ${item.title}${key ? ` — key ${key}` : ''}`;
  }).join('\n');
  const team = plan.rota.filter((entry) => entry.status !== 'Declined')
    .map((entry) => `${entry.memberName}: ${entry.role} (${entry.status})`).join('\n');
  return `${plan.title} — ${plan.date}${plan.serviceTimes.length ? ` at ${plan.serviceTimes.join(', ')}` : ''}\n\nService order:\n${order || 'No items yet.'}\n\nTeam:\n${team || 'No assignments yet.'}\n\nOpen your service and band charts in PraiseAV Suite:\n${link}\n\nSign in with your church account. Ask your church administrator for access if needed.`;
}
