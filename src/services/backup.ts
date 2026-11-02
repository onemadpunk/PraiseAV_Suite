import type { LegacySnapshot } from './legacyData';

const valid = (key: keyof LegacySnapshot, record: Record<string, unknown>): boolean => {
  const text = (name: string) => typeof record[name] === 'string';
  const list = (name: string) => Array.isArray(record[name]);
  if (key === 'plans') return text('title') && text('date') && list('items') && list('rota') && list('serviceTimes');
  if (key === 'songs') return text('title') && text('chordPro') && text('defaultKey') && list('arrangement');
  if (key === 'members') return text('fullName') && list('blockoutDates') && list('qualifiedRoles') && list('departments');
  if (key === 'childrenList') return text('childName') && text('securityCode') && text('serviceDate');
  if (key === 'smallGroups') return text('name') && text('category') && typeof record.active === 'boolean';
  if (key === 'roomBookings') return text('roomName') && text('date') && text('startTime') && text('endTime');
  if (key === 'donations') return text('donorName') && text('date') && typeof record.amount === 'number' && Number.isFinite(record.amount) && record.amount >= 0;
  return false;
};

const keys = ['plans', 'songs', 'members', 'childrenList', 'smallGroups', 'roomBookings', 'donations'] as const;

export function parseChurchBackup(input: unknown): LegacySnapshot {
  if (!input || typeof input !== 'object') throw new Error('This is not a PraiseAV Suite backup.');
  const value = input as Record<string, unknown>;
  const result = {} as LegacySnapshot;
  for (const key of keys) {
    const records = value[key];
    if (!Array.isArray(records) || records.length > 10000) throw new Error('The backup has an invalid ' + key + ' list.');
    const seen = new Set<string>();
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('An ' + key + ' record is invalid.');
      const id = (record as { id?: unknown }).id;
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(id) || seen.has(id)) {
        throw new Error('An ' + key + ' record has a missing, duplicate, or invalid ID.');
      }
      if (!valid(key, record as Record<string, unknown>)) throw new Error('An ' + key + ' record is missing required fields.');
      seen.add(id);
    }
    // The original browser backup and the new church backup use the same keys.
    (result as unknown as Record<string, unknown>)[key] = records;
  }
  return result;
}
