import { parseChurchBackup } from './backup';
import type { CheckInChild, DonationRecord, Member, RoomBooking, ServicePlan, SmallGroup, Song } from '../types/church';

export interface LegacySnapshot {
  plans: ServicePlan[];
  songs: Song[];
  members: Member[];
  childrenList: CheckInChild[];
  smallGroups: SmallGroup[];
  roomBookings: RoomBooking[];
  donations: DonationRecord[];
}

export const LEGACY_STORAGE_KEY = 'praiseav_suite_zero_cost_db_v1';

// Read only: the previous Suite stored all seven domains in this browser.
// Users can download a backup before they clear browser storage or migrate.
export function readLegacySnapshot(): LegacySnapshot | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;
    const keys = ['plans', 'songs', 'members', 'childrenList', 'smallGroups', 'roomBookings', 'donations'] as const;
    if (!keys.every((key) => Array.isArray(source[key]))) return null;
    return parseChurchBackup(source);
  } catch { return null; }
}
