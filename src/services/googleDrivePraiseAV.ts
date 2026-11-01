import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/drive'];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    provider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

export interface PraiseAVDetectedTheme {
  sourceFileName: string;
  primaryAccent: string;
  secondaryAccent: string;
  backgroundHex: string;
  surfaceHex: string;
  extractedVariables: Record<string, string>;
}

/**
 * Searches Google Drive for the user's PraiseAV folder (case-insensitive match for 'praiseav' or 'praise av')
 */
export async function findPraiseAVFolders(token: string): Promise<DriveFileItem[]> {
  const q = encodeURIComponent(
    "mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name contains 'praise' or name contains 'Praise' or name contains 'PRAISE')"
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,parents)&pageSize=25`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Drive search failed (${res.status})`);
  }
  const data = await res.json();
  return data.files || [];
}

/**
 * Lists files inside a specific Google Drive folder (or searches globally for PraiseAV files)
 */
export async function listFilesInDriveFolder(
  token: string,
  folderId?: string
): Promise<DriveFileItem[]> {
  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : "trashed = false and (name contains 'praise' or name contains 'Praise' or name contains 'song' or name contains 'service')";
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,size,parents)&orderBy=folder,name&pageSize=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to list folder contents (${res.status})`);
  }
  const data = await res.json();
  return data.files || [];
}

/**
 * Reads text content of a file from Google Drive
 */
export async function readDriveFileText(
  token: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  // If it's a Google Doc, export as plain text
  const url =
    mimeType === 'application/vnd.google-apps.document'
      ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
      : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Could not read file content (${res.status})`);
  }
  return await res.text();
}

/**
 * Parses CSS/HTML/JSON/JS files from the user's PraiseAV folder to extract exact theme colors & variables
 */
export function extractPraiseAVThemeFromCode(
  fileName: string,
  content: string
): PraiseAVDetectedTheme | null {
  const vars: Record<string, string> = {};
  const cssVarRegex = /(--[a-zA-Z0-9-_]+)\s*:\s*([^;}\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = cssVarRegex.exec(content)) !== null) {
    vars[match[1].trim()] = match[2].trim();
  }

  const hexMatches = Array.from(
    new Set(content.match(/#[0-9a-fA-F]{6}\b/g) || [])
  );

  if (Object.keys(vars).length === 0 && hexMatches.length === 0) {
    return null;
  }

  const primary =
    vars['--primary'] ||
    vars['--accent'] ||
    vars['--brand'] ||
    vars['--color-primary'] ||
    hexMatches.find((h) => !/^#(000000|ffffff|111111|222222|333333)$/i.test(h)) ||
    '#0ea5e9';

  const bg =
    vars['--bg'] ||
    vars['--background'] ||
    vars['--bg-primary'] ||
    '#0b0f19';

  const surface =
    vars['--surface'] ||
    vars['--card'] ||
    vars['--panel'] ||
    '#111827';

  return {
    sourceFileName: fileName,
    primaryAccent: primary,
    secondaryAccent: vars['--secondary'] || '#f59e0b',
    backgroundHex: bg,
    surfaceHex: surface,
    extractedVariables: vars,
  };
}

/**
 * Creates a new file inside the user's PraiseAV Google Drive folder
 */
export async function createFileInDriveFolder(
  token: string,
  folderId: string | null,
  fileName: string,
  jsonContent: string
): Promise<DriveFileItem> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'application/json',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------praiseav_suite_drive_sync_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create file in Google Drive (${res.status})`);
  }
  return await res.json();
}

/**
 * Updates/Overwrites an existing file in Google Drive (MUST be preceded by explicit user confirmation dialog in UI)
 */
export async function updateExistingDriveFile(
  token: string,
  fileId: string,
  jsonContent: string
): Promise<DriveFileItem> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: jsonContent,
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to update file in Google Drive (${res.status})`);
  }
  return await res.json();
}
