import { Bytes, doc, getDoc, setDoc } from 'firebase/firestore';
import type { ChurchSession } from './churchFirebase';
import { CHUNK_BYTES, cloudFileProblem, cloudFileRecord, mediaEntry, sha256Hex, type CloudFile } from '../utils/cloudFiles';

/**
 * Sends one file to the booth through the church cloud (see utils/cloudFiles.ts) and returns its
 * media entry. A file already sent (same contents) is not sent again.
 */
export async function uploadCloudFile(session: ChurchSession, planId: string, file: File, onProgress?: (done: number, total: number) => void) {
  const email = session.user.email || '';
  if (!email) throw new Error('Sign in with an email address to send files to the booth.');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(planId)) throw new Error('This service can’t receive files yet. Save it first.');
  const problem = cloudFileProblem(file.name, file.size);
  if (problem) throw new Error(problem);
  const data = await file.arrayBuffer();
  const record = cloudFileRecord(file.name, data, await sha256Hex(data), email);
  const ref = doc(session.db, 'deliveries', planId, 'files', record.fileName);
  const existing = await getDoc(ref).catch(() => null);
  if (existing?.exists()) return mediaEntry(existing.data() as CloudFile);
  let done = 0;
  onProgress?.(0, record.chunks);
  const send = async (index: number) => {
    const part = new Uint8Array(data, index * CHUNK_BYTES, Math.min(CHUNK_BYTES, data.byteLength - index * CHUNK_BYTES));
    await setDoc(doc(ref, 'chunks', String(index)), { data: Bytes.fromUint8Array(part) });
    onProgress?.(++done, record.chunks);
  };
  // A few at a time: quicker on a good connection, gentle on a weak one.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, record.chunks) }, async () => {
    while (next < record.chunks) await send(next++);
  }));
  await setDoc(ref, record);
  return mediaEntry(record);
}
