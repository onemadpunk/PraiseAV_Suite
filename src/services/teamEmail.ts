import { doc, setDoc } from 'firebase/firestore';
import type { ChurchSession } from './churchFirebase';
import type { ServicePlan } from '../types/church';

/**
 * Saves the plan with its new team notice, then asks PraiseAV's mail service to email the people on
 * the rota (functions/notifyTeam.js decides who may be emailed). Returns a sentence for the planner.
 * Emails are a bonus: when they can't go, the notice in the Suite still reaches everyone who opens it.
 */
export async function emailTeam(session: ChurchSession, plan: ServicePlan, emails: string[], link: string | undefined): Promise<string> {
  // The mail service reads the saved plan to check this press of Let the team know.
  await setDoc(doc(session.db, 'plans', plan.id), JSON.parse(JSON.stringify(plan)));
  if (!emails.length || !link) return 'No email addresses are on file for this rota, so nobody was emailed.';
  try {
    const res = await fetch('/api/notify-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await session.user.getIdToken()}` },
      body: JSON.stringify({ projectId: session.connection.config.projectId, planId: plan.id, emails, link }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return result.error || 'Emails could not be sent just now.';
    if (!result.sent) return 'Nobody on the rota has an email address on file, so nobody was emailed.';
    return `${result.sent} ${result.sent === 1 ? 'person was' : 'people were'} emailed.${result.failed?.length ? ` These couldn’t be emailed: ${result.failed.join(', ')}.` : ''}`;
  } catch {
    return 'Emails could not be sent from here.';
  }
}
