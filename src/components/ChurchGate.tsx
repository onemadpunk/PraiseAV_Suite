import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import {
  ChurchConnection, ChurchSession, churchApp,
  clearChurchConnection, getChurchRoles, parseChurchConnection, parseFirebaseConfigText,
  readChurchConnection, requestChurchAccess, saveChurchConnection,
  signInChurch, signOutChurch,
} from '../services/churchFirebase';
import { churchRules } from '../services/churchRules';
import { readLegacySnapshot } from '../services/legacyData';

export function ChurchGate({ onReady, onDemo }: { onReady: (session: ChurchSession) => void; onDemo: () => void }) {
  const [connection, setConnection] = useState<ChurchConnection | null>(() => readChurchConnection());
  const [churchName, setChurchName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [configText, setConfigText] = useState('');
  const [userName, setUserName] = useState('');
  const [pending, setPending] = useState<ChurchSession | null>(null);
  const [rulesText, setRulesText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [hasLegacy] = useState(() => Boolean(readLegacySnapshot()));

  useEffect(() => {
    if (!connection) return;
    const app = churchApp(connection);
    const db = getFirestore(app);
    return onAuthStateChanged(getAuth(app), async (user) => {
      setError('');
      if (!user) { setUserName(''); setPending(null); return; }
      setUserName(user.displayName || user.email || 'Member');
      try {
        const { roles, owner } = await getChurchRoles(db, user, connection.ownerEmail);
        if (owner) await getDoc(doc(db, 'memberships', user.uid)); // verifies that this project's rules are installed
        const session = { connection, app, db, user, roles, owner };
        if (roles.length) onReady(session);
        else setPending(session);
      } catch (failure) {
        setError(`Could not open this church’s database. Check that Firestore and its security rules are set up. ${String(failure)}`);
      }
    }, (failure) => setError(failure.message));
  }, [connection, onReady]);

  useEffect(() => {
    if (!pending) return;
    return onSnapshot(doc(pending.db, 'memberships', pending.user.uid), async (snapshot) => {
      if (!snapshot.exists()) return;
      try {
        const { roles, owner } = await getChurchRoles(pending.db, pending.user, pending.connection.ownerEmail);
        if (roles.length) onReady({ ...pending, roles, owner });
      } catch (failure) { setError(String(failure)); }
    }, (failure) => setError(failure.message));
  }, [pending, onReady]);

  const prepare = () => {
    try {
      const parsed = parseChurchConnection({ config: parseFirebaseConfigText(configText), churchName, ownerEmail });
      setRulesText(churchRules(parsed.ownerEmail));
      setError('');
    } catch (failure) { setError(String(failure)); }
  };

  const connect = () => {
    try {
      const parsed = parseChurchConnection({ config: parseFirebaseConfigText(configText), churchName, ownerEmail });
      saveChurchConnection(parsed);
      setConnection(parsed);
      setError('');
    } catch (failure) { setError(String(failure)); }
  };

  const switchChurch = async () => {
    if (connection) await signOutChurch(connection).catch(() => {});
    clearChurchConnection();
    setConnection(null);
    setPending(null);
    setRulesText('');
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <h1 className="inline-block">
          <img className="w-60 max-w-full dark:hidden" src={import.meta.env.BASE_URL + 'branding/suite-primary-light.svg'} alt="PraiseAV Suite" />
          <img className="hidden w-60 max-w-full dark:block" src={import.meta.env.BASE_URL + 'branding/suite-primary-dark.svg'} alt="PraiseAV Suite" />
        </h1>
        {connection ? (
          <>
            <p><strong>{connection.churchName}</strong> owns its Firebase project and church records.</p>
            {userName ? <p>Signed in as {userName}</p> : <p>Sign in with your own Google account to request or use church access.</p>}
            {pending ? (
              <div className="space-y-3">
                <p>Your church administrator has not approved your account yet.</p>
                <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy || requested} onClick={async () => {
                  setBusy(true);
                  try { await requestChurchAccess(pending); setRequested(true); setError(''); }
                  catch (failure) { setError(String(failure)); }
                  finally { setBusy(false); }
                }}>{requested ? 'Access request sent' : 'Ask church administrator for access'}</button>
                <p className="text-sm">This page will open automatically after a church administrator approves you.</p>
              </div>
            ) : (
              <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await signInChurch(connection); setError(''); }
                catch (failure) { setError(String(failure)); }
                finally { setBusy(false); }
              }}>Sign in with Google</button>
            )}
            <button className="ml-3 underline text-sm" onClick={switchChurch}>Use another church</button>
          </>
        ) : (
          <>
            <p>Connect to a church-owned Firebase project. PraiseAV does not hold an administrator account for your church.</p>
            <details className="rounded border border-slate-200 dark:border-slate-700 p-3">
              <summary className="cursor-pointer font-semibold">First church administrator? Follow these setup steps</summary>
              <ol className="list-decimal pl-6 py-3 space-y-2 text-sm">
                <li>Sign in to <a className="underline" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Firebase Console</a> with the church administrator’s Google account and create a project on the free Spark plan.</li>
                <li>Add a Web app, then copy its Firebase configuration into the box below.</li>
                <li>Create a Cloud Firestore database. Choose the region the church wants for its records.</li>
                <li>Enable Google in Authentication → Sign-in method, and add this website’s domain to Authorized domains.</li>
                <li>Generate the rules below and publish them in Firestore → Rules. Do not use test-mode rules for real records.</li>
                <li>Connect below, sign in as the owner, and share the church link with members.</li>
              </ol>
            </details>
            <label className="block text-sm">Church name<input className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={churchName} onChange={(e) => setChurchName(e.target.value)} /></label>
            <label className="block text-sm">Church administrator’s Google email<input type="email" className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></label>
            <label className="block text-sm">Firebase Web app configuration<textarea className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={6} value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder={'{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'} /></label>
            <div className="flex gap-3 flex-wrap">
              <button className="px-4 py-2 rounded border" onClick={prepare}>Generate security rules</button>
              <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={connect}>Connect to church</button>
            </div>
            {rulesText && <div className="space-y-2"><p className="text-sm">Copy these rules into the church project’s Firestore Rules page, then click Publish there.</p><button className="px-3 py-1 rounded border" onClick={() => navigator.clipboard.writeText(rulesText)}>Copy rules</button><textarea readOnly className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={12} value={rulesText} /></div>}
            {hasLegacy && <p className="text-sm border border-amber-400 p-3">Older Suite records are still in this browser. Open them below and download a backup before moving them to a church project. They are not automatically uploaded.</p>}
            <button className="underline text-sm" onClick={onDemo}>{hasLegacy ? "Open existing browser records" : "Try the sample church without an account"}</button>
          </>
        )}
        <p className="text-sm"><a className="underline" href="https://github.com/onemadpunk/PraiseAV_Suite/blob/main/docs/church-setup.md" target="_blank" rel="noreferrer">Full setup guide</a> · <a className="underline" href="https://praiseav.com/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a></p>
        {error && <p role="alert" className="text-red-600 text-sm break-words">{error}</p>}
      </div>
    </main>
  );
}
