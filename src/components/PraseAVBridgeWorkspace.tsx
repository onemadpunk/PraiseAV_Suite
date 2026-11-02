import React from 'react';
import { ServicePlan, Song } from '../types/church';
import { toPraiseAVService } from '../utils/praiseavService';

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
  activePlan: ServicePlan | undefined;
  songs: Song[];
  activeThemePreset: PraiseAVThemePreset;
  onSelectThemePreset: (preset: PraiseAVThemePreset) => void;
}

export const PraseAVBridgeWorkspace: React.FC<Props> = ({
  activePlan, songs, activeThemePreset, onSelectThemePreset,
}) => {
  const download = () => {
    if (!activePlan) return;
    const service = toPraiseAVService(activePlan, songs);
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
    <p>The Suite plans services and exports a .praiseav file. It does not control a live projector or automatically sync with the desktop app.</p>
    <ol className="list-decimal pl-6 space-y-2 text-sm">
      <li>Choose the service plan in the Services page.</li>
      <li>Download its .praiseav file below.</li>
      <li>Open the file in PraiseAV on the church computer, or put it in a shared PraiseAV Services folder.</li>
      <li>Attach any visiting speaker presentation or media file on the desktop before the service. The export includes its name, not its contents.</li>
    </ol>
    <button type="button" disabled={!activePlan} onClick={download}
      className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50">
      {activePlan ? 'Download ' + activePlan.title + ' .praiseav' : 'Create a service first'}
    </button>
    <p className="text-sm text-slate-600 dark:text-slate-300">For automatic file sharing, each church can choose a local Google Drive or OneDrive folder in PraiseAV’s Church sharing setup. That choice is optional.</p>
    <div className="border-t pt-4">
      <h2 className="font-semibold mb-2">Suite display theme</h2>
      <div className="flex flex-wrap gap-2">{PRAISEAV_THEME_PRESETS.map((preset) =>
        <button key={preset.id} onClick={() => onSelectThemePreset(preset)}
          className={'px-3 py-2 rounded border text-sm ' + (activeThemePreset.id === preset.id ? 'border-sky-500' : 'border-slate-500')}>{preset.name}</button>)}</div>
      <p className="text-xs mt-2 text-slate-500">This changes the Suite only. Choose the projector theme in PraiseAV.</p>
    </div>
  </section>;
};
