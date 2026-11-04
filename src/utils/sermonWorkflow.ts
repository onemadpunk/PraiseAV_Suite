import type { ServicePlan } from '../types/church';

export function canAuthorSermon(plan: ServicePlan, itemId: string, email: string, planner: boolean): boolean {
  return planner || Boolean(email && plan.sermonAssignments?.[itemId]?.toLowerCase() === email.toLowerCase());
}

export const MEDIA_FOLDER = 'PraiseAV Assets';
export function sermonContributionName(planId: string, itemId: string) {
  if (![planId,itemId].every(id=>/^[A-Za-z0-9_-]{1,80}$/.test(id))) throw new Error('Service or sermon identifier is invalid for publishing.');
  return `Sermon ${planId}--${itemId}.praiseav-sermon`;
}
export async function storeSermonMedia(directory: FileSystemDirectoryHandle, file: File) {
  const extension = /\.(mp4|webm|mp3|wav|m4a|ogg)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (!extension) throw new Error('Choose an MP4/WebM video or MP3/WAV/M4A/OGG audio file.');
  if (!file.size || file.size > 512 * 1024 * 1024) throw new Error('Media files must be between 1 byte and 512 MB.');
  const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2,'0')).join('');
  const sha256 = await digest(file);
  const fileName = `${sha256}.${extension}`;
  const folder = await directory.getDirectoryHandle(MEDIA_FOLDER, {create:true});
  const handle = await folder.getFileHandle(fileName, {create:true});
  const prior = await handle.getFile();
  if (prior.size && (prior.size !== file.size || await digest(prior) !== sha256)) throw new Error('An existing media file failed verification. It has not been replaced.');
  if (!prior.size) {
    const writer = await handle.createWritable();
    try { await writer.write(file); await writer.close(); } catch(error) { await writer.abort().catch(()=>{}); throw error; }
  }
  const saved = await handle.getFile();
  if (saved.size !== file.size || await digest(saved) !== sha256) throw new Error('The saved media could not be verified. Try adding it again.');
  return { id: `suite-${sha256}`, name: file.name, kind: ['mp4','webm'].includes(extension) ? 'video' as const : 'audio' as const, fileName, sha256, bytes:file.size, afterSlide:0 };
}
