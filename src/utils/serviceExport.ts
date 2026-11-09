import type { ServicePlan, Song } from '../types/church';
import { csvCell } from './csv';

// Every service as one spreadsheet: a row per item, oldest service first, so a church can keep a
// record of past services (and the songs sung) before tidying old plans away.
export function servicesCsv(plans: ServicePlan[], songs: Song[]): string {
  const byId = new Map(songs.map((song) => [song.id, song]));
  const header = ['Date', 'Times', 'Service', 'Series', 'Order', 'Type', 'Item', 'Key', 'Leader', 'Minutes', 'Song writers', 'CCLI'];
  const rows: Array<Array<string | number>> = [];
  const sorted = [...plans].sort((a, b) => (a.date + a.title).localeCompare(b.date + b.title));
  for (const plan of sorted) {
    const base = [plan.date, plan.serviceTimes.join(' & '), plan.title, plan.seriesTitle || ''];
    if (!plan.items.length) rows.push([...base, '', '', '', '', '', '', '', '']);
    plan.items.forEach((item, index) => {
      const song = item.songId ? byId.get(item.songId) : undefined;
      rows.push([
        ...base, index + 1, item.type, item.title,
        item.type === 'song' ? item.musicalKey || song?.defaultKey || '' : '',
        item.leader || '', Math.round((item.durationSeconds || 0) / 60),
        song?.author || '', song?.ccliNumber || '',
      ]);
    });
  }
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** How many services include this song, so deleting it can say what it affects. */
export function servicesUsingSong(plans: ServicePlan[], songId: string): ServicePlan[] {
  return plans.filter((plan) => plan.items.some((item) => item.songId === songId));
}
