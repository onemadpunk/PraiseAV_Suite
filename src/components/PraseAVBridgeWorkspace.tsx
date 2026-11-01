import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  FileCode,
  FolderOpen,
  Layers,
  LogOut,
  MessageSquare,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Tv,
  UploadCloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  createFileInDriveFolder,
  DriveFileItem,
  extractPraiseAVThemeFromCode,
  findPraiseAVFolders,
  getAccessToken,
  googleSignIn,
  initAuth,
  listFilesInDriveFolder,
  logout,
  PraiseAVDetectedTheme,
  readDriveFileText,
  updateExistingDriveFile,
} from '../services/googleDrivePraiseAV';
import { PraiseAVLiveState, ServicePlan, Song } from '../types/church';
import {
  buildPraiseAVExportBundle,
  compileServiceItemSlides,
  formatDurationMMSS,
} from '../utils/musicAndAv';

export interface PraiseAVThemePreset {
  id: string;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  stageGradient: string;
}

export const PRAISEAV_THEME_PRESETS: PraiseAVThemePreset[] = [
  {
    id: 'praiseav-broadcast',
    name: 'PraiseAV Broadcast Studio (Sky Blue & Amber Gold)',
    primaryHex: '#0284c7',
    secondaryHex: '#f59e0b',
    stageGradient: 'from-slate-950 via-sky-950 to-slate-900',
  },
  {
    id: 'praiseav-royal',
    name: 'PraiseAV Sanctuary Royal (Indigo & Warm Gold)',
    primaryHex: '#4f46e5',
    secondaryHex: '#eab308',
    stageGradient: 'from-slate-950 via-indigo-950 to-slate-900',
  },
  {
    id: 'praiseav-emerald',
    name: 'PraiseAV Liturgy Emerald (Teal & Champagne)',
    primaryHex: '#0d9488',
    secondaryHex: '#f59e0b',
    stageGradient: 'from-slate-950 via-emerald-950 to-slate-900',
  },
];

interface PraiseAVBridgeWorkspaceProps {
  activePlan: ServicePlan;
  songs: Song[];
  liveState: PraiseAVLiveState;
  onUpdateLiveState: (next: Partial<PraiseAVLiveState>) => void;
  activeThemePreset: PraiseAVThemePreset;
  onSelectThemePreset: (preset: PraiseAVThemePreset) => void;
  onImportSongsFromDriveJson?: (importedSongs: Song[]) => void;
}

export const PraseAVBridgeWorkspace: React.FC<PraiseAVBridgeWorkspaceProps> = ({
  activePlan,
  songs,
  liveState,
  onUpdateLiveState,
  activeThemePreset,
  onSelectThemePreset,
  onImportSongsFromDriveJson,
}) => {
  const [stageAlertInput, setStageAlertInput] = useState(liveState.stageMessage);
  const [outputMode, setOutputMode] = useState<'sanctuary-full' | 'lower-third'>('sanctuary-full');
  const [showProtocolSpec, setShowProtocolSpec] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);

  // Google Drive Auth & PraiseAV Folder Inspector State
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isScanningDrive, setIsScanningDrive] = useState<boolean>(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveStatusMsg, setDriveStatusMsg] = useState<string | null>(null);

  const [praiseFolders, setPraiseFolders] = useState<DriveFileItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [folderFiles, setFolderFiles] = useState<DriveFileItem[]>([]);
  const [inspectedFile, setInspectedFile] = useState<{
    file: DriveFileItem;
    content: string;
  } | null>(null);
  const [detectedTheme, setDetectedTheme] = useState<PraiseAVDetectedTheme | null>(null);

  // Mandatory Explicit Confirmation Modal State before mutating/overwriting an existing Google Drive file
  const [pendingOverwriteFile, setPendingOverwriteFile] = useState<{
    file: DriveFileItem;
    newContent: string;
  } | null>(null);

  const currentItem =
    activePlan.items[liveState.activeItemIndex] || activePlan.items[0];
  const slides = currentItem ? compileServiceItemSlides(currentItem, songs) : [];
  const currentSlide = slides[liveState.activeSlideIndex] || slides[0];
  const nextSlide = slides[liveState.activeSlideIndex + 1];

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, tok) => {
        setDriveUser(u);
        setDriveToken(tok);
        setNeedsAuth(false);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentItem) {
      setRemainingSeconds(currentItem.durationSeconds);
    }
  }, [liveState.activeItemIndex, currentItem?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleScanPraiseAVFolder = async (tokenToUse?: string) => {
    const tok = tokenToUse || driveToken || (await getAccessToken());
    if (!tok) {
      setNeedsAuth(true);
      return;
    }
    setIsScanningDrive(true);
    setDriveError(null);
    setDriveStatusMsg(null);
    try {
      const folders = await findPraiseAVFolders(tok);
      setPraiseFolders(folders);

      if (folders.length > 0) {
        const primaryFolder = folders[0];
        setSelectedFolderId(primaryFolder.id);
        const files = await listFilesInDriveFolder(tok, primaryFolder.id);
        setFolderFiles(files);
        setDriveStatusMsg(
          `Connected to your Google Drive folder "${primaryFolder.name}" (${files.length} items found).`
        );
      } else {
        const fallbackFiles = await listFilesInDriveFolder(tok);
        setFolderFiles(fallbackFiles);
        setDriveStatusMsg(
          `Scanned Google Drive (${fallbackFiles.length} PraiseAV / worship files found).`
        );
      }
    } catch (err: any) {
      setDriveError(err?.message || 'Could not scan Google Drive folder.');
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setDriveError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        setDriveToken(result.accessToken);
        setNeedsAuth(false);
        await handleScanPraiseAVFolder(result.accessToken);
      }
    } catch (err: any) {
      setDriveError(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectFolder = async (folderId: string) => {
    setSelectedFolderId(folderId);
    const tok = driveToken || (await getAccessToken());
    if (!tok) {
      setNeedsAuth(true);
      return;
    }
    setIsScanningDrive(true);
    try {
      const files = await listFilesInDriveFolder(tok, folderId || undefined);
      setFolderFiles(files);
    } catch (err: any) {
      setDriveError(err?.message || 'Failed to list files in selected folder.');
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleInspectDriveFile = async (file: DriveFileItem) => {
    const tok = driveToken || (await getAccessToken());
    if (!tok) {
      setNeedsAuth(true);
      return;
    }
    // If the user clicked a subfolder, open that subfolder!
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      await handleSelectFolder(file.id);
      return;
    }

    setDriveError(null);
    try {
      const content = await readDriveFileText(tok, file.id, file.mimeType);
      setInspectedFile({ file, content });

      // Check if it contains CSS/HTML theme colors from PraiseAV
      if (/\.(css|html|js|ts|tsx|json)$/i.test(file.name)) {
        const extracted = extractPraiseAVThemeFromCode(file.name, content);
        if (extracted) {
          setDetectedTheme(extracted);
          onSelectThemePreset({
            id: `drive-${file.id}`,
            name: `Matched from Drive: ${file.name} (${extracted.primaryAccent})`,
            primaryHex: extracted.primaryAccent,
            secondaryHex: extracted.secondaryAccent,
            stageGradient: 'from-slate-950 via-sky-950 to-slate-900',
          });
          setDriveStatusMsg(
            `Applied PraiseAV theme colors extracted from "${file.name}" (${extracted.primaryAccent}).`
          );
        }
      }

      // Check if it's a JSON song/service file we can import
      if (file.name.endsWith('.json') && onImportSongsFromDriveJson) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
            onImportSongsFromDriveJson(parsed.songs);
            setDriveStatusMsg(
              `Imported ${parsed.songs.length} songs from "${file.name}" in your PraiseAV Drive folder.`
            );
          }
        } catch {
          // Not a song array JSON
        }
      }
    } catch (err: any) {
      setDriveError(
        `Could not read text from "${file.name}": ${err?.message || 'Binary or unsupported format'}`
      );
    }
  };

  const handleSaveServicePlanToDrive = async () => {
    const tok = driveToken || (await getAccessToken());
    if (!tok) {
      setNeedsAuth(true);
      return;
    }

    const bundle = buildPraiseAVExportBundle(activePlan, songs);
    const jsonString = JSON.stringify(bundle, null, 2);
    const targetFileName = `${activePlan.date}-${activePlan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.praiseav.json`;

    // Check if a file with this name already exists in the folder
    const existing = folderFiles.find((f) => f.name === targetFileName);
    if (existing) {
      // Mandatory user confirmation dialog before updating/overwriting existing file
      setPendingOverwriteFile({ file: existing, newContent: jsonString });
      return;
    }

    try {
      setIsScanningDrive(true);
      const created = await createFileInDriveFolder(
        tok,
        selectedFolderId || null,
        targetFileName,
        jsonString
      );
      setFolderFiles((prev) => [created, ...prev]);
      setDriveStatusMsg(
        `Saved "${created.name}" directly to your Google Drive PraiseAV folder.`
      );
    } catch (err: any) {
      setDriveError(err?.message || 'Failed to save file to Google Drive.');
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleConfirmOverwriteDriveFile = async () => {
    if (!pendingOverwriteFile) return;
    const tok = driveToken || (await getAccessToken());
    if (!tok) {
      setNeedsAuth(true);
      return;
    }
    try {
      setIsScanningDrive(true);
      await updateExistingDriveFile(
        tok,
        pendingOverwriteFile.file.id,
        pendingOverwriteFile.newContent
      );
      setDriveStatusMsg(
        `Updated "${pendingOverwriteFile.file.name}" in your Google Drive PraiseAV folder.`
      );
      setPendingOverwriteFile(null);
    } catch (err: any) {
      setDriveError(err?.message || 'Failed to update existing file in Google Drive.');
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleSelectCue = (itemIdx: number) => {
    onUpdateLiveState({
      activeItemIndex: itemIdx,
      activeSlideIndex: 0,
      lastPingTimestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleStepSlide = (delta: -1 | 1) => {
    const nextIdx = liveState.activeSlideIndex + delta;
    if (nextIdx >= 0 && nextIdx < slides.length) {
      onUpdateLiveState({
        activeSlideIndex: nextIdx,
        lastPingTimestamp: new Date().toLocaleTimeString(),
      });
    } else if (delta === 1 && liveState.activeItemIndex + 1 < activePlan.items.length) {
      onUpdateLiveState({
        activeItemIndex: liveState.activeItemIndex + 1,
        activeSlideIndex: 0,
        lastPingTimestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleDownloadFullBundle = () => {
    const bundle = buildPraiseAVExportBundle(activePlan, songs);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePlan.date}-praise-av-live-pack.praiseav.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const livePacketPreview = {
    event: 'PRAISE_AV_SLIDE_TRIGGER',
    targetApp: 'Praise AV (https://praiseav.com/)',
    timestamp: new Date().toISOString(),
    servicePlanId: activePlan.id,
    serviceTitle: activePlan.title,
    itemIndex: liveState.activeItemIndex,
    itemTitle: currentItem?.title,
    itemType: currentItem?.type,
    slideIndex: liveState.activeSlideIndex,
    totalSlidesInCue: slides.length,
    displayFlags: {
      blackout: liveState.blackout,
      clearText: liveState.clearText,
      outputMode,
    },
    currentSlide: currentSlide || null,
    nextSlide: nextSlide || null,
    congregationAndPreacherAlert: liveState.stageMessage || null,
  };

  const receiverIntegrationCode = `// Connect Praise AV (https://praiseav.com/) to PraiseAV Suite at $0 cost:
// Option A: Instant Same-Machine Browser / Electron BroadcastChannel
const bridge = new BroadcastChannel('praise_av_bridge_v1');
bridge.onmessage = (event) => {
  const packet = event.data;
  if (packet.event === 'PRAISE_AV_SLIDE_TRIGGER') {
    renderMainProjector(packet.currentSlide, packet.displayFlags);
    renderPreacherScreen(packet.currentSlide, packet.nextSlide, packet.congregationAndPreacherAlert);
  }
};

// Option B: Direct Google Drive PraiseAV Folder Sync
// PraiseAV Suite reads & writes .praiseav.json directly inside your Google Drive PraiseAV folder.`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(receiverIntegrationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Confirmation Dialog for Updating Existing Google Drive Files */}
      {pendingOverwriteFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Update existing file in Google Drive?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to overwrite the existing file{' '}
              <strong className="font-mono">{pendingOverwriteFile.file.name}</strong> in your Google Drive PraiseAV folder with the updated service plan?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingOverwriteFile(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwriteDriveFile}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>PraiseAV Direct Sync Engine</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://praiseav.com/"
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-sans"
            >
              praiseav.com
              <ExternalLink className="w-3 h-3" />
            </a>
            <span aria-hidden="true">·</span>
            <span>Google Drive Bridge Enabled</span>
            <span aria-hidden="true">·</span>
            <span>Last Cue Push: {liveState.lastPingTimestamp}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            PraiseAV Live Projection Controller, Google Drive Folder Sync & Theme Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowProtocolSpec(!showProtocolSpec)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showProtocolSpec ? 'Hide PraiseAV API Spec' : 'PraiseAV Integration Code'}
          </button>
          <button
            type="button"
            onClick={handleDownloadFullBundle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download .praiseav Pack
          </button>
        </div>
      </div>

      {/* Google Drive PraiseAV Folder Connector & Theme Matcher */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span>Google Drive &ldquo;PraiseAV&rdquo; Folder Bridge & Theme Matcher</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect directly to your <strong>PraiseAV</strong> folder in Google Drive to inspect your files, auto-match your exact PraiseAV theme colors, and sync service plans at $0 cost.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Theme Preset Selector */}
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="PraiseAV Theme Style"
                value={activeThemePreset.id}
                onChange={(e) => {
                  const found = PRAISEAV_THEME_PRESETS.find((p) => p.id === e.target.value);
                  if (found) onSelectThemePreset(found);
                }}
                className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                {PRAISEAV_THEME_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
                {detectedTheme && (
                  <option value={`drive-detected`}>
                    Drive Extracted: {detectedTheme.sourceFileName} ({detectedTheme.primaryAccent})
                  </option>
                )}
              </select>
            </div>

            {needsAuth || !driveToken ? (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'Connecting Drive...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScanPraiseAVFolder()}
                  disabled={isScanningDrive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningDrive ? 'animate-spin' : ''}`} />
                  Scan PraiseAV Folder
                </button>
                <button
                  type="button"
                  onClick={handleSaveServicePlanToDrive}
                  disabled={isScanningDrive}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 whitespace-nowrap"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Save Active Plan to Drive
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setDriveUser(null);
                    setDriveToken(null);
                    setNeedsAuth(true);
                    setFolderFiles([]);
                  }}
                  title="Sign out of Google Drive"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {driveError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{driveError}</span>
          </div>
        )}

        {driveStatusMsg && (
          <div className="p-3 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-lg text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between">
            <span>{driveStatusMsg}</span>
            {driveUser && (
              <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                Signed in as {driveUser.email}
              </span>
            )}
          </div>
        )}

        {/* Folder & File Browser when authenticated */}
        {!needsAuth && driveToken && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  PraiseAV Google Drive Folders & Files ({folderFiles.length})
                </span>
                {praiseFolders.length > 0 && (
                  <select
                    value={selectedFolderId}
                    onChange={(e) => handleSelectFolder(e.target.value)}
                    className="text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5"
                  >
                    {praiseFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        Folder: {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 max-h-56 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
                {folderFiles.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    Click &ldquo;Scan PraiseAV Folder&rdquo; to list the files inside your Google Drive PraiseAV directory.
                  </div>
                ) : (
                  folderFiles.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleInspectDriveFile(file)}
                        className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-sky-50 dark:hover:bg-sky-950/40 flex items-center justify-between transition-colors"
                      >
                        <span className="inline-flex items-center gap-2 truncate pr-2 font-medium text-slate-800 dark:text-slate-200">
                          {isFolder ? (
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </span>
                        <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 shrink-0">
                          {isFolder ? 'Open Folder →' : 'Inspect / Match →'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {inspectedFile
                  ? `Inspected File: ${inspectedFile.file.name}`
                  : 'PraiseAV File & Theme Inspector'}
              </div>
              {inspectedFile ? (
                <pre className="p-3 text-[11px] font-mono bg-slate-950 text-slate-200 rounded-lg max-h-56 overflow-auto leading-relaxed border border-slate-800">
                  {inspectedFile.content.slice(0, 4000)}
                </pre>
              ) : (
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-500 h-56 flex items-center justify-center text-center">
                  Select any file in your Google Drive PraiseAV folder on the left to inspect its code/schema and automatically apply its theme colors or import its songs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Developer Integration Drawer for Praise AV Creator */}
      {showProtocolSpec && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                How PraiseAV Suite Connects to Praise AV (https://praiseav.com/) at $0 Cost
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every slide change, preacher note, parent alert, or service export emits a standardized JSON payload over BroadcastChannel, Google Drive folder sync, or downloadable .praiseav.json file.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 rounded-lg hover:bg-sky-100 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedCode ? 'Copied Listener Snippet!' : 'Copy Praise AV Listener Code'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Drop-In Listener for Praise AV
              </div>
              <pre className="p-3.5 text-[11px] font-mono bg-slate-950 text-slate-200 rounded-lg overflow-x-auto leading-relaxed">
                {receiverIntegrationCode}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Live Outgoing JSON Packet (Real-Time State)
              </div>
              <pre className="p-3.5 text-[11px] font-mono bg-slate-950 text-emerald-300 rounded-lg overflow-x-auto max-h-52 leading-relaxed">
                {JSON.stringify(livePacketPreview, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Dual 16:9 Live Monitors: Sanctuary Output + Preacher Timer / Stage Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitor 1: Main Sanctuary / Livestream Output */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Tv className="w-4 h-4 text-sky-500" />
              <span>Output 1: Main Sanctuary & Livestream (16:9)</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              <button
                type="button"
                onClick={() => setOutputMode('sanctuary-full')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  outputMode === 'sanctuary-full'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Full Projection Slide
              </button>
              <button
                type="button"
                onClick={() => setOutputMode('lower-third')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  outputMode === 'lower-third'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Livestream Lower-Third
              </button>
            </div>
          </div>

          <div
            className={`aspect-video relative flex flex-col justify-between p-6 text-white select-none transition-colors ${
              liveState.blackout
                ? 'bg-black'
                : currentSlide?.backgroundStyle === 'emerald-liturgy'
                ? 'bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900'
                : currentSlide?.backgroundStyle === 'warm-charcoal'
                ? 'bg-gradient-to-br from-stone-950 via-neutral-900 to-stone-950'
                : `bg-gradient-to-br ${activeThemePreset.stageGradient}`
            }`}
          >
            {!liveState.blackout && (
              <>
                <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
                  <span>{currentItem?.title}</span>
                  <span>
                    {currentSlide?.label} ({liveState.activeSlideIndex + 1}/{slides.length})
                  </span>
                </div>

                {outputMode === 'sanctuary-full' ? (
                  <div className="my-auto text-center px-4">
                    {!liveState.clearText && currentSlide ? (
                      <p className="text-lg sm:text-2xl font-semibold leading-relaxed whitespace-pre-line tracking-tight drop-shadow">
                        {currentSlide.bodyText}
                      </p>
                    ) : (
                      <span className="text-xs font-mono text-white/30">
                        [Text Layer Cleared — Moving Background Active]
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-auto">
                    {!liveState.clearText && currentSlide && (
                      <div className="bg-slate-950/90 border border-white/15 rounded-lg px-5 py-3 backdrop-blur-md">
                        <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wider">
                          {currentItem?.title} · {currentSlide.label}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-white mt-0.5">
                          {currentSlide.lowerThirdText}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
                  <span>PraiseAV Sanctuary Feed</span>
                  {liveState.stageMessage && (
                    <span className="text-amber-300 font-semibold">
                      Congregation Alert: {liveState.stageMessage}
                    </span>
                  )}
                </div>
              </>
            )}

            {liveState.blackout && (
              <div className="m-auto text-xs font-mono text-neutral-600">
                [SANCTUARY SCREEN BLACKOUT ACTIVE]
              </div>
            )}
          </div>
        </div>

        {/* Monitor 2: Preacher Timer & Notes / Band Confidence Screen */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Monitor className="w-4 h-4 text-amber-500" />
              <span>Output 2: Preacher Timer, Notes & Stage Confidence Screen</span>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Preacher / Cue Timer: {formatDurationMMSS(remainingSeconds)}
            </span>
          </div>

          <div className="aspect-video bg-neutral-950 text-white p-5 flex flex-col justify-between font-sans">
            {/* Top Bar: Clock + Cue Countdown + Chords */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <div className="text-[11px] font-mono text-amber-400">
                  {currentSlide?.stageMonitorNote || currentItem?.stageNotes}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Now: {currentItem?.title} ({currentSlide?.label})
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-lg font-bold text-emerald-400">
                  {formatDurationMMSS(remainingSeconds)}
                </div>
                <div className="text-[10px] text-neutral-500">TIME REMAINING</div>
              </div>
            </div>

            {/* Middle: Current Slide vs Next Slide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto py-2">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                <div className="text-[10px] font-mono text-sky-400 mb-1">
                  CURRENT SLIDE ({liveState.activeSlideIndex + 1}/{slides.length})
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white whitespace-pre-line leading-snug">
                  {currentSlide?.bodyText || '—'}
                </p>
              </div>
              <div className="p-3 bg-neutral-900/50 border border-neutral-800/80 rounded-lg">
                <div className="text-[10px] font-mono text-neutral-400 mb-1">
                  NEXT SLIDE
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 whitespace-pre-line leading-snug">
                  {nextSlide
                    ? nextSlide.bodyText
                    : 'End of current item — Next cue ready'}
                </p>
              </div>
            </div>

            {/* Bottom Stage Alert Bar */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">
                Audio: {currentItem?.audioCue}
              </span>
              {liveState.stageMessage ? (
                <span className="px-2.5 py-0.5 bg-amber-500 text-black font-bold rounded">
                  ALERT: {liveState.stageMessage}
                </span>
              ) : (
                <span className="text-neutral-500">No active congregation/stage alerts</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Operator Transport Controls & Congregation / Parent Alert Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleStepSlide(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Slide
          </button>
          <button
            type="button"
            onClick={() => handleStepSlide(1)}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 whitespace-nowrap shrink-0"
          >
            Next Slide
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onUpdateLiveState({ clearText: !liveState.clearText })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              liveState.clearText
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {liveState.clearText ? 'Restore Lyrics' : 'Clear Words (Background Only)'}
          </button>

          <button
            type="button"
            onClick={() => onUpdateLiveState({ blackout: !liveState.blackout })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              liveState.blackout
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            {liveState.blackout ? 'Exit Blackout' : 'Blackout Projector'}
          </button>
        </div>

        {/* Congregation Alert / Parent Notification Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdateLiveState({ stageMessage: stageAlertInput.trim() });
          }}
          className="flex items-center gap-2 flex-1 max-w-md"
        >
          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Congregation / Parent Alert (e.g. Parent Code K-8491 needed)..."
            value={stageAlertInput}
            onChange={(e) => setStageAlertInput(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 whitespace-nowrap shrink-0"
          >
            Push Alert
          </button>
          {liveState.stageMessage && (
            <button
              type="button"
              onClick={() => {
                setStageAlertInput('');
                onUpdateLiveState({ stageMessage: '' });
              }}
              className="text-xs text-red-600 hover:underline whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Bottom Cue Grid: Service Items + Individual Slide Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Service Cue Stack ({activePlan.title})
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {activePlan.items.map((item, idx) => {
              const isLive = idx === liveState.activeItemIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCue(idx)}
                  className={`w-full text-left px-4 py-3 text-xs transition-colors flex items-center justify-between ${
                    isLive
                      ? 'bg-sky-50 dark:bg-sky-950/60 font-semibold text-sky-700 dark:text-sky-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-mono mr-1.5">{idx + 1}.</span>
                    <span>{item.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {isLive ? 'LIVE' : formatDurationMMSS(item.durationSeconds)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Slides for Cue #{liveState.activeItemIndex + 1}: {currentItem?.title}
            </span>
            <span className="text-slate-500 font-mono tabular-nums">
              {slides.length} slides ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slides.map((sl, sIdx) => {
              const isCurrentSlide = sIdx === liveState.activeSlideIndex;
              return (
                <button
                  key={sl.id}
                  type="button"
                  onClick={() =>
                    onUpdateLiveState({
                      activeSlideIndex: sIdx,
                      lastPingTimestamp: new Date().toLocaleTimeString(),
                    })
                  }
                  className={`text-left rounded-lg border overflow-hidden transition-all ${
                    isCurrentSlide
                      ? 'border-sky-500 ring-2 ring-sky-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div
                    className={`px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between ${
                      isCurrentSlide
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      {sIdx + 1}. {sl.label}
                    </span>
                    {isCurrentSlide && <span className="font-mono text-[10px]">ON AIR</span>}
                  </div>
                  <div className="p-3 bg-slate-950 text-white min-h-[88px] flex items-center justify-center text-center">
                    <p className="text-xs leading-snug whitespace-pre-line line-clamp-4">
                      {sl.bodyText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
