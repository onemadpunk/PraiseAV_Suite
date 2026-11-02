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

function signInError(failure: unknown): string {
  const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code) : '';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed. Click Sign in with Google to try again.';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site, then try again.';
  return `Google sign-in failed. ${String(failure)}`;
}

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
  const [rulesPublished, setRulesPublished] = useState(false);
  const [hasLegacy] = useState(() => Boolean(readLegacySnapshot()));
  const siteDomain = window.location.hostname;
  let projectId = '';
  try {
    const candidate = parseFirebaseConfigText(configText).projectId;
    if (/^[a-z0-9-]{6,100}$/.test(candidate)) projectId = candidate;
  } catch { /* No configuration has been pasted yet. */ }
  const projectBase = projectId ? `https://console.firebase.google.com/project/${projectId}` : '';

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

  useEffect(() => {
    try {
      const parsed = parseChurchConnection({ config: parseFirebaseConfigText(configText), churchName, ownerEmail });
      setRulesText(churchRules(parsed.ownerEmail));
    } catch { setRulesText(''); }
  }, [configText, churchName, ownerEmail]);

  useEffect(() => { setRulesPublished(false); }, [configText, ownerEmail]);

  const connect = async () => {
    if (busy) return;
    let parsed: ChurchConnection;
    try { parsed = parseChurchConnection({ config: parseFirebaseConfigText(configText), churchName, ownerEmail }); }
    catch (failure) { setError(String(failure)); return; }
    setBusy(true);
    try {
      saveChurchConnection(parsed);
      setConnection(parsed);
      setError('');
      await signInChurch(parsed);
    } catch (failure) { setError(signInError(failure)); }
    finally { setBusy(false); }
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
            {busy && !pending && <p role="status" className="text-sm text-sky-700 dark:text-sky-300">Complete sign-in in the Google window. This page will continue when you finish.</p>}
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
                catch (failure) { setError(signInError(failure)); }
                finally { setBusy(false); }
              }}>{busy ? 'Waiting for Google sign-in…' : 'Sign in with Google'}</button>
            )}
            <button className="ml-3 underline text-sm" onClick={switchChurch}>Use another church</button>
          </>
        ) : (
          <>
            <p>One church administrator sets up shared records once. Everyone else signs in through the church link they receive. PraiseAV Windows works without this setup.</p>
            <section aria-label="Church setup checklist" className="rounded-xl border border-sky-300 dark:border-sky-800 p-4 space-y-3 text-sm">
              <h2 className="font-semibold text-lg">Church setup checklist</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li><a className="underline text-sky-600" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Create a Firebase project ↗</a> using the church’s Google account. Choose the free Spark plan; leave AI and Analytics off.</li>
                <li>In Project settings → General → Your apps, register a Web app called PraiseAV Suite. Leave Firebase Hosting unchecked. Paste the full <code>firebaseConfig</code> code example below. There is no need to run <code>npm install</code>.</li>
                <li>Enable Google sign-in in {projectBase ? <a className="underline text-sky-600" href={`${projectBase}/authentication/providers`} target="_blank" rel="noreferrer">Authentication → Sign-in method ↗</a> : 'Authentication → Sign-in method'}. Set the public name to PraiseAV Suite and choose the church support email.</li>
                <li>In {projectBase ? <a className="underline text-sky-600" href={`${projectBase}/authentication/settings`} target="_blank" rel="noreferrer">Authentication → Settings ↗</a> : 'Authentication → Settings'}, add <code>{siteDomain}</code> under Authorised domains. Enter only the domain, without <code>https://</code> or a path.</li>
                <li>{projectBase ? <a className="underline text-sky-600" href={`${projectBase}/firestore`} target="_blank" rel="noreferrer">Create Cloud Firestore ↗</a> : 'Create Cloud Firestore'} using Standard edition, database ID <code>(default)</code>, a location near your church, and Production mode. Do not add real records yet.</li>
                <li>Copy the security rules generated below into Firestore → Rules and publish them. Then connect and sign in.</li>
              </ol>
              <p className="text-xs">The project belongs to your church. Only the administrator needs Firebase Console; members do not.</p>
            </section>
            <label className="block text-sm">Church name<input className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={churchName} onChange={(e) => setChurchName(e.target.value)} /></label>
            <label className="block text-sm">Church administrator’s Google email<input type="email" className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></label>
            <label className="block text-sm">Firebase Web app configuration<textarea className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={6} value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder="Paste the full Firebase code example here" /></label>
            {projectId && <p className="text-sm text-emerald-700 dark:text-emerald-400">Project found: <strong>{projectId}</strong>. The checklist now has direct links to its setup pages.</p>}
            {rulesText && <div className="space-y-2"><p className="text-sm">Your church-specific rules are ready. Copy them into Firestore → Rules and click Publish there.</p><button type="button" className="px-3 py-2 rounded border" onClick={() => navigator.clipboard.writeText(rulesText).catch(() => setError('Clipboard unavailable. Select and copy the rules from the box below.'))}>Copy security rules</button><textarea readOnly aria-label="Church security rules" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={8} value={rulesText} /><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rulesPublished} onChange={(e) => setRulesPublished(e.target.checked)} />I published these rules in Firestore.</label></div>}
            <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={!rulesText || !rulesPublished || busy} onClick={connect}>Connect and sign in</button>
            {hasLegacy && <p className="text-sm border border-amber-400 p-3">Older Suite records are still in this browser. Open them below and download a backup before moving them to a church project. They are not automatically uploaded.</p>}
            <button className="underline text-sm" onClick={onDemo}>{hasLegacy ? "Open existing browser records" : "Try the sample church (new changes are not saved)"}</button>
          </>
        )}
        <p className="text-sm"><a className="underline" href="https://github.com/onemadpunk/PraiseAV_Suite/blob/main/docs/church-setup.md" target="_blank" rel="noreferrer">Full setup guide</a> · <a className="underline" href="https://praiseav.com/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a></p>
        {error && <p role="alert" className="text-red-600 text-sm break-words">{error}</p>}
      </div>
    </main>
  );
}
