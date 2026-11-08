// Files carried to the booth through the church's own Firestore, so a preacher can send a
// PowerPoint, PDF or a short clip from an iPad or phone: no shared folder and no Chrome needed.
// Each file is split into chunks of at most CHUNK_BYTES (a Firestore document holds up to 1 MiB),
// written first; the file record is written last and marks the upload complete. PraiseAV Windows
// downloads the chunks, checks the SHA-256 and puts the file in the Services folder's
// "PraiseAV Assets", exactly where the shared-folder route puts it.
// The free Firebase plan stores 1 GiB in all, so large videos still go through the shared folder,
// and the booth clears files a fortnight after they were sent.

export type CloudFileKind = 'video' | 'audio' | 'presentation';

export const CHUNK_BYTES = 900 * 1024;
const MB = 1024 * 1024;
export const CLOUD_FILE_LIMITS: Record<CloudFileKind, number> = { video: 100 * MB, audio: 50 * MB, presentation: 50 * MB };
const KINDS: Record<string, CloudFileKind> = {
  mp4: 'video', webm: 'video', mp3: 'audio', wav: 'audio', m4a: 'audio', ogg: 'audio',
  pdf: 'presentation', pptx: 'presentation', ppt: 'presentation', odp: 'presentation',
};
export const CLOUD_FILE_ACCEPT = Object.keys(KINDS).map((ext) => '.' + ext).join(',');
export const CLOUD_FILE_NAME = /^[0-9a-f]{64}\.(mp4|webm|mp3|wav|m4a|ogg|pdf|pptx|ppt|odp)$/;

export interface CloudFile {
  name: string; fileName: string; sha256: string; ext: string; kind: CloudFileKind;
  bytes: number; chunks: number; uploadedBy: string; uploadedAt: string;
}

export function fileExtension(name: string) {
  return /\.([A-Za-z0-9]{1,5})$/.exec(name)?.[1]?.toLowerCase() || '';
}

export function cloudFileKind(name: string): CloudFileKind | null {
  return KINDS[fileExtension(name)] || null;
}

/** Why this file can't travel through the church cloud, or '' when it can. */
export function cloudFileProblem(name: string, bytes: number): string {
  const kind = cloudFileKind(name);
  if (!kind) return 'Choose a PowerPoint, PDF, MP4/WebM video or MP3/WAV/M4A/OGG audio file.';
  if (bytes < 1) return 'That file is empty.';
  if (bytes > CLOUD_FILE_LIMITS[kind]) {
    return `${kind === 'presentation' ? 'Presentations' : kind === 'video' ? 'Videos' : 'Music files'} up to ${CLOUD_FILE_LIMITS[kind] / MB} MB can be sent from any device. For a bigger file, use Chrome or Edge on a computer and the church’s shared Services folder.`;
  }
  return '';
}

export function chunkCount(bytes: number) {
  return Math.ceil(bytes / CHUNK_BYTES);
}

export async function sha256Hex(data: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The record written after every chunk is in place. */
export function cloudFileRecord(name: string, data: ArrayBuffer, sha256: string, email: string, now = new Date()): CloudFile {
  const ext = fileExtension(name), kind = cloudFileKind(name);
  const problem = cloudFileProblem(name, data.byteLength);
  if (problem || !kind) throw new Error(problem);
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error('The file could not be checked. Try again.');
  return {
    name: name.slice(0, 200), fileName: `${sha256}.${ext}`, sha256, ext, kind,
    bytes: data.byteLength, chunks: chunkCount(data.byteLength), uploadedBy: email, uploadedAt: now.toISOString(),
  };
}

/** The media entry a service or sermon carries for a cloud file (read by PraiseAV's serviceAssets). */
export function mediaEntry(file: CloudFile) {
  return { id: `suite-${file.sha256}`, name: file.name, kind: file.kind, fileName: file.fileName, sha256: file.sha256, bytes: file.bytes, via: 'cloud' as const };
}
