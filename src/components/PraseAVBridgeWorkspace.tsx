import React, { useEffect, useState } from 'react';
import { ServicePlan, Song } from '../types/church';
import { toPraiseAVService } from '../utils/praiseavService';
import { canWrite, type ChurchSession } from '../services/churchFirebase';
import { publishService, watchDelivery } from '../services/deliveries';
import { boothStatus, boothStatusText, type Delivery, type DeliveryReceipt } from '../utils/deliveries';
import {
  loadServiceFolderLink, rememberServiceFolderLink, writeServiceToFolder,
  type ServiceFolderLink,
} from '../utils/serviceFolderTransfer';

type FolderPickerWindow = Window & {
  showDirectoryPicker?: (options: { id: string; mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
};
type WritableDirectory = FileSystemDirectoryHandle & {
  requestPermission: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
};

export interface PraiseAVThemePreset {
  id: string;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  stageGradient: string;
}

export const PRAISEAV_THEME_PRESETS: PraiseAVThemePreset[] = [
  { id: 'broadcast', name: 'Broadcast blue and gold', primaryHex: '#0284c7', secondaryHex: '#f59e0b', stageGradient: 'from-slate-950 via-sky-950 to-slate-900' },
  { id: 'royal', name: 'Sanctuary indigo and gold', primaryHex: '#4f46e5', secondaryHex: '#eab308', stageGradient: 'from-slate-950 via-indigo-950 to-slate-900' },
  { id: 'emerald', name: 'Liturgy teal and amber', primaryHex: '#0d9488', secondaryHex: '#f59e0b', stageGradient: 'from-slate-950 via-emerald-950 to-slate-900' },
];

interface Props {
  session?: ChurchSession | null;
  suiteLink?:string;
  activePlan: ServicePlan | undefined;
  songs: Song[];
  activeThemePreset: PraiseAVThemePreset;
  onSelectThemePreset: (preset: PraiseAVThemePreset) => void;
}

export const PraseAVBridgeWorkspace: React.FC<Props> = ({
  activePlan, songs, activeThemePreset, onSelectThemePreset, suiteLink, session,
}) => {
  const canSendToBooth = Boolean(session && canWrite(session, 'plans'));
  const [booth, setBooth] = useState<{ delivery: Delivery | null; receipt: DeliveryReceipt | null }>({ delivery: null, receipt: null });
  const [boothBusy, setBoothBusy] = useState(false);
  const [boothMessage, setBoothMessage] = useState('');
  useEffect(() => {
    setBooth({ delivery: null, receipt: null });
    if (!session || !activePlan || !canSendToBooth) return;
    return watchDelivery(session, { planId: activePlan.id }, setBooth);
  }, [session, activePlan?.id, canSendToBooth]);
  const sendToBooth = async () => {
    if (!session || !activePlan || boothBusy) return;
    setBoothBusy(true);
    setBoothMessage('');
    try {
      const delivery = await publishService(session, toPraiseAVService(activePlan, songs, suiteLink));
      setBoothMessage(delivery.hash === booth.delivery?.hash ? 'Nothing has changed since the last send.' : 'Sent. PraiseAV on the booth computer picks it up while it is open, and the AV desk chooses when to load it.');
    } catch (error) {
      setBoothMessage('Could not send to the booth: ' + (error instanceof Error ? error.message : String(error)) + ' If this keeps happening, ask a church administrator to update the church security rules (Church access).');
    } finally {
      setBoothBusy(false);
    }
  };
  const [folderLink, setFolderLink] = useState<ServiceFolderLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const canChooseFolder = typeof (window as FolderPickerWindow).showDirectoryPicker === 'function';

  useEffect(() => {
    let active = true;
    loadServiceFolderLink().then((link) => { if (active) setFolderLink(link); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const chooseFolder = async (): Promise<ServiceFolderLink> => {
    const picker = (window as FolderPickerWindow).showDirectoryPicker;
    if (!picker) throw new Error('This browser cannot save directly to a folder. Use Download .praiseav file instead.');
    const directory = await picker.call(window, { id: 'praiseav-services', mode: 'readwrite' });
    const link = { directory, lastExports: {} };
    setFolderLink(link);
    await rememberServiceFolderLink(link);
    return link;
  };

  const sendToFolder = async () => {
    if (!activePlan || busy) return;
    setBusy(true);
    setTransferMessage('');
    try {
      const link = folderLink || await chooseFolder();
      const permission = await (link.directory as WritableDirectory).requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') throw new Error('Folder access was not granted. Use Download .praiseav file instead.');
      const result = await writeServiceToFolder(
        link.directory, toPraiseAVService(activePlan, songs, suiteLink), link.lastExports[activePlan.id],
      );
      const updated = { ...link, lastExports: { ...link.lastExports, [activePlan.id]: result.hash } };
      setFolderLink(updated);
      await rememberServiceFolderLink(updated);
      setTransferMessage(result.unchanged
        ? `${activePlan.title} is already up to date in ${link.directory.name}.`
        : `Saved ${result.fileName} in ${link.directory.name}. Open it from PraiseAV’s Services list. If it is already open, PraiseAV will offer the updated version at the AV desk.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setTransferMessage(error instanceof Error ? error.message : 'Could not save to the selected folder. Use Download .praiseav file instead.');
    } finally {
      setBusy(false);
    }
  };

  const changeFolder = async () => {
    setTransferMessage('');
    try {
      const link = await chooseFolder();
      setTransferMessage(`Selected ${link.directory.name}. Send the service when ready.`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setTransferMessage(error instanceof Error ? error.message : 'Could not choose a folder.');
      }
    }
  };

  const forgetFolder = async () => {
    await rememberServiceFolderLink(null);
    setFolderLink(null);
    setTransferMessage('This browser has forgotten the folder. Service files already saved there remain in place.');
  };

  const download = () => {
    if (!activePlan) return;
    const service = toPraiseAVService(activePlan, songs, suiteLink);
    const blob = new Blob([JSON.stringify(service, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activePlan.date + '-' + activePlan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.praiseav';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="space-y-6 max-w-3xl">
    <h1 className="text-2xl font-bold">Use this service in PraiseAV</h1>
    <p>The Suite plans services and exports a .praiseav file. It does not control a live projector. Choose PraiseAV’s Services folder to send a service file there without downloading and moving it yourself.</p>
    <ol className="list-decimal pl-6 space-y-2 text-sm">
      <li>Choose the service plan in the Services page.</li>
      <li>In PraiseAV Windows, open More → Church sharing to see or choose its Services folder.</li>
      <li>Use Send to PraiseAV folder below and choose that same folder in this browser. If it is a synced OneDrive or Google Drive folder, the file can reach the church computer through that service.</li>
      <li>Open the service in PraiseAV Windows. If you send a later update, the AV desk sees a notice and chooses when to load it. PraiseAV never changes the live slide without the operator.</li>
      <li>Assign the preacher in My sermon & tablet. They save notes and slides, add videos/music to the shared folder and use Send my sermon to church. The desktop combines their published contribution with this service and checks every file before marking it Ready.</li>
      <li>Other visiting-speaker presentation placeholders still need their original PowerPoint or PDF added on the desktop.</li>
    </ol>
    {canSendToBooth && <div className="space-y-2 rounded border border-emerald-500/50 p-4">
      <h2 className="font-semibold">Send to the booth</h2>
      <p className="text-sm">Works from any computer, tablet or phone. PraiseAV on the booth computer, signed in to this church, saves it into its Services folder by itself. Video and music files still travel through the shared Services folder.</p>
      <button type="button" disabled={!activePlan || boothBusy} onClick={sendToBooth} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{boothBusy ? 'Sending…' : 'Send to the booth'}</button>
      <p role="status" className="text-sm">{boothStatusText(boothStatus(booth.delivery, booth.receipt))}</p>
      {boothMessage && <p className="text-sm">{boothMessage}</p>}
    </div>}
    {canChooseFolder && <div className="space-y-2 rounded border border-sky-500/40 p-4">
      <p className="text-sm">{folderLink ? `Folder remembered in this browser: ${folderLink.directory.name}` : 'Choose the Services folder once; this browser can remember it for later transfers.'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!activePlan || busy} onClick={sendToFolder}
          className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Send to PraiseAV folder'}
        </button>
        {folderLink && <button type="button" disabled={busy} onClick={changeFolder} className="px-3 py-2 rounded border border-slate-500 disabled:opacity-50">Change folder</button>}
        {folderLink && <button type="button" disabled={busy} onClick={forgetFolder} className="px-3 py-2 rounded border border-slate-500 disabled:opacity-50">Forget folder</button>}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">Saving again replaces only the file this browser last sent. If someone changes that file in PraiseAV or another computer, the Suite stops and asks you to review it.</p>
    </div>}
    <button type="button" disabled={!activePlan} onClick={download}
      className="px-4 py-2 rounded border border-slate-500 disabled:opacity-50">
      {activePlan ? 'Download ' + activePlan.title + ' .praiseav file' : 'Create a service first'}
    </button>
    {!canChooseFolder && <p className="text-sm text-slate-600 dark:text-slate-300">This browser does not support direct folder access. Download the file and move it to PraiseAV’s Services folder.</p>}
    {transferMessage && <p role="status" className="text-sm">{transferMessage}</p>}
    <div className="border-t pt-4">
      <h2 className="font-semibold mb-2">Suite display theme</h2>
      <div className="flex flex-wrap gap-2">{PRAISEAV_THEME_PRESETS.map((preset) =>
        <button key={preset.id} onClick={() => onSelectThemePreset(preset)}
          className={'px-3 py-2 rounded border text-sm ' + (activeThemePreset.id === preset.id ? 'border-sky-500' : 'border-slate-500')}>{preset.name}</button>)}</div>
      <p className="text-xs mt-2 text-slate-500">This changes the Suite only. Choose the projector theme in PraiseAV.</p>
    </div>
  </section>;
};
