import type { Member, ServicePlan } from '../types/church';

export function rotaConflicts(member: Member, active: ServicePlan, plans: ServicePlan[]): string[] {
  const warnings: string[] = [];
  if (member.blockoutDates.includes(active.date)) warnings.push('This person has a blockout date.');
  for (const plan of plans) {
    if (plan.date !== active.date) continue;
    const assignments = plan.rota.filter((entry) => entry.memberId === member.id && entry.status !== 'Declined');
    if (assignments.length) {
      warnings.push(plan.id === active.id
        ? 'Already assigned in this service: ' + assignments.map((entry) => entry.role).join(', ')
        : 'Already assigned to ' + plan.title + ' on this date.');
    }
  }
  return warnings;
}
