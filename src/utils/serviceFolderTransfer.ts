import type { PraiseAVServiceFile } from './praiseavService';

const DATABASE = 'praiseav-suite-service-transfer';
const STORE = 'settings';
const LINK_KEY = 'services-folder';

export interface ServiceFolderLink {
  directory: FileSystemDirectoryHandle;
  lastExports: Record<string, string>;
}

export interface TransferResult {
  fileName: string;
  hash: string;
  unchanged: boolean;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadServiceFolderLink(): Promise<ServiceFolderLink | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(LINK_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function rememberServiceFolderLink(link: ServiceFolderLink | null): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      if (link) transaction.objectStore(STORE).put(link, LINK_KEY);
      else transaction.objectStore(STORE).delete(LINK_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export function serviceTransferFileName(serviceId: string): string {
  const safeId = /^[a-z0-9_-]{1,128}$/i.test(serviceId) ? serviceId : Array.from(
    new TextEncoder().encode(serviceId), (byte) => byte.toString(16).padStart(2, '0'),
  ).join('').slice(0, 128);
  return `PraiseAV Suite ${safeId || 'unnamed'}.praiseav`;
}

export async function hashServiceText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function missingFile(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

/** A repeated transfer may replace only the exact file last written by this browser. */
export async function writeServiceToFolder(
  directory: FileSystemDirectoryHandle,
  service: PraiseAVServiceFile,
  lastExportHash?: string,
): Promise<TransferResult> {
  const fileName = serviceTransferFileName(service.id);
  const text = JSON.stringify(service, null, 2);
  const hash = await hashServiceText(text);
  let file: FileSystemFileHandle;
  try {
    file = await directory.getFileHandle(fileName);
    const currentText = await (await file.getFile()).text();
    let currentId: string | undefined;
    try { currentId = JSON.parse(currentText).id; } catch { /* Leave the existing file alone. */ }
    if (currentId !== service.id) {
      throw new Error(`${fileName} is not this service. This transfer will not replace it.`);
    }
    const currentHash = await hashServiceText(currentText);
    if (currentHash === hash) return { fileName, hash, unchanged: true };
    if (currentHash !== lastExportHash) {
      throw new Error(`${fileName} has changed outside this Suite browser. Open it in PraiseAV and decide which version to keep; this transfer will not replace it.`);
    }
  } catch (error) {
    if (!missingFile(error)) throw error;
    file = await directory.getFileHandle(fileName, { create: true });
  }
  const writable = await file.createWritable();
  try {
    await writable.write(text);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
  const savedHash = await hashServiceText(await (await file.getFile()).text());
  if (savedHash !== hash) throw new Error('The saved service could not be verified. Try again or use Download .praiseav file.');
  return { fileName, hash, unchanged: false };
}
