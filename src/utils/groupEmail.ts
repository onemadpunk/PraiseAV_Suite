import type { Member } from '../types/church';

/**
 * "Email this group": the Suite never sends email. It opens a ready email in the
 * leader's own mail app (mailto:) with everyone in BCC, so members don't see each
 * other's addresses, or copies the addresses for pasting into BCC by hand.
 */

// Older versions of the People form filled this in when no email was typed.
const PLACEHOLDER_EMAILS = new Set(['member@gracecommunity.org.uk']);
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/**
 * Many mail apps (Outlook on Windows in particular) silently drop or cut off
 * mailto: links longer than about 2,000 characters. Above this, copy instead.
 */
export const MAILTO_LIMIT = 1900;

/** Usable addresses for these people, once each, in name order. */
export function emailAddresses(people: Member[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const person of [...people].sort((a, b) => a.fullName.localeCompare(b.fullName))) {
    const email = (person.email || '').trim();
    const key = email.toLowerCase();
    if (!EMAIL.test(email) || PLACEHOLDER_EMAILS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

/** How many of these people cannot be emailed (no usable address). */
export function withoutEmail(people: Member[]): number {
  return people.filter((p) => {
    const email = (p.email || '').trim();
    return !EMAIL.test(email) || PLACEHOLDER_EMAILS.has(email.toLowerCase());
  }).length;
}

/** The worship band: everyone in People on the "Band & Vocals" team. */
export function bandMembers(members: Member[]): Member[] {
  return members.filter((m) => m.departments.includes('Band & Vocals'));
}

/**
 * A mailto: link with everyone in BCC. `to` is normally the sender's own address,
 * so the email isn't sent to "undisclosed recipients". Null when there is nobody
 * to email or the link would be too long for mail apps to open.
 */
export function bccMailto(addresses: string[], options: { to?: string; subject?: string; body?: string } = {}): string | null {
  if (!addresses.length) return null;
  const to = options.to && EMAIL.test(options.to.trim()) ? encodeURIComponent(options.to.trim()) : '';
  let href = `mailto:${to}?bcc=` + addresses.map(encodeURIComponent).join(',');
  if (options.subject) href += '&subject=' + encodeURIComponent(options.subject);
  if (options.body) href += '&body=' + encodeURIComponent(options.body);
  return href.length > MAILTO_LIMIT ? null : href;
}

/** Addresses ready to paste into the BCC box. Semicolons work in Outlook and Gmail alike. */
export function addressesForPasting(addresses: string[]): string {
  return addresses.join('; ');
}
