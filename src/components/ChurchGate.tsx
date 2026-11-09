import { useCallback, useEffect, useState } from 'react';
import { User, getAuth, onAuthStateChanged, reload } from 'firebase/auth';
import { doc, getDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import {
  ChurchConnection, ChurchSession, churchApp,
  clearChurchConnection, getChurchRoles, parseChurchConnection, parseFirebaseConfigText,
  readChurchConnection, registerChurchEmail, requestChurchAccess,
  resendChurchVerification, resetChurchEmailPassword, saveChurchConnection,
  signInChurch, signInChurchEmail, signOutChurch,
} from '../services/churchFirebase';
import { churchRules } from '../services/churchRules';
import { checkChurchRulesHealth } from '../services/churchRulesHealth';
import { DirectoryChurch, cancelChurchReservation, connectionFromDirectory, directoryId, findChurches, finishChurchRegistration, refreshSavedReservation, reserveChurch, savedReservation } from '../services/churchDirectory';
import { readLegacySnapshot } from '../services/legacyData';
import { OwnProfileForm } from './OwnProfileForm';

function signInError(failure: unknown): string {
  const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code) : '';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed. Click Sign in with Google to try again.';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site, then try again.';
  return `Google sign-in failed. ${String(failure)}`;
}

export function ChurchGate({ onReady }: { onReady: (session: ChurchSession) => void }) {
  const [connection, setConnection] = useState<ChurchConnection | null>(() => readChurchConnection());
  const [churchName, setChurchName] = useState(() => savedReservation()?.churchName || '');
  const [town, setTown] = useState(() => savedReservation()?.town || '');
  const [matches, setMatches] = useState<DirectoryChurch[]>([]);
  const [searched, setSearched] = useState(false);
  const [reservedId, setReservedId] = useState<string | null>(() => savedReservation()?.id || null);
  const [ownerEmail, setOwnerEmail] = useState(() => savedReservation()?.ownerEmail || '');
  const [configText, setConfigText] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [emailMode, setEmailMode] = useState<'sign-in' | 'register'>('sign-in');
  const [verificationPending, setVerificationPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<ChurchSession | null>(null);
  const [rulesText, setRulesText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [rulesPublished, setRulesPublished] = useState(false);
  const [hasLegacy] = useState(() => Boolean(readLegacySnapshot()));
  const siteDomain = window.location.hostname;
  const directoryAvailable = siteDomain === 'praiseav-suite.web.app' || siteDomain === 'suite.praiseav.com';
  let projectId = '';
  try {
    const candidate = parseFirebaseConfigText(configText).projectId;
    if (/^[a-z0-9-]{6,100}$/.test(candidate)) projectId = candidate;
  } catch { /* No configuration has been pasted yet. */ }
  const projectBase = projectId ? `https://console.firebase.google.com/project/${projectId}` : '';

  const openSignedInUser = useCallback(async (user: User) => {
    if (!connection) return;
    setUserName(user.displayName || user.email || 'Member');
    if (!user.emailVerified) {
      setVerificationPending(true);
      setPending(null);
      return;
    }
    setVerificationPending(false);
    const app = churchApp(connection);
    const db = getFirestore(app);
    try {
      const { roles, owner } = await getChurchRoles(db, user, connection);
      if (owner) await getDoc(doc(db, 'memberships', user.uid)); // verifies that this project's rules are installed
      // The owner opened the church from the public list: remember their email so rule updates work.
      const known = owner && !connection.ownerEmail ? { churchName: connection.churchName, config: connection.config, ownerEmail: (user.email || '').toLowerCase() } : connection;
      if (known !== connection) saveChurchConnection(known);
      const session = { connection: known, app, db, user, roles, owner };
      if (roles.length) onReady(session);
      else setPending(session);
      setError('');
    } catch (failure) {
      setError(`Could not open this church’s database. Check that Firestore and its security rules are set up. ${String(failure)}`);
    }
  }, [connection, onReady]);

  useEffect(() => {
    if (!connection) return;
    return onAuthStateChanged(getAuth(churchApp(connection)), (user) => {
      if (!user) { setUserName(''); setPending(null); setVerificationPending(false); return; }
      void openSignedInUser(user);
    }, (failure) => setError(failure.message));
  }, [connection, openSignedInUser]);

  useEffect(() => {
    if (!pending) return;
    return onSnapshot(doc(pending.db, 'memberships', pending.user.uid), async (snapshot) => {
      if (!snapshot.exists()) return;
      try {
        const { roles, owner } = await getChurchRoles(pending.db, pending.user, pending.connection);
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

  useEffect(() => {
    if (connection || !reservedId) return;
    let mounted = true;
    void refreshSavedReservation().then((active) => {
      if (mounted && !active) { setReservedId(null); setOwnerEmail(''); setSearched(false); }
    }).catch((failure) => { if (mounted) setError(`Could not check the saved church registration. ${String(failure)}`); });
    return () => { mounted = false; };
  }, [connection, reservedId]);

  const connect = async () => {
    if (busy) return;
    if (!reservedId) { setError('Register this church before connecting.'); return; }
    try { if (directoryId(churchName, town) !== reservedId) { setError('Use the same church name and town you registered before connecting.'); return; } }
    catch (failure) { setError(String(failure)); return; }
    let parsed: ChurchConnection;
    try {
      parsed = parseChurchConnection({ config: parseFirebaseConfigText(configText), churchName, ownerEmail });
      if (parsed.config.projectId === 'praiseav-suite') throw new Error('Create a Firebase project owned by your church. The PraiseAV registration project cannot hold another church’s records.');
    }
    catch (failure) { setError(String(failure)); return; }
    setBusy(true);
    try {
      const owner = await signInChurch(parsed);
      if (!owner.emailVerified || owner.email?.toLowerCase() !== parsed.ownerEmail) throw new Error('Sign in with the same Google account that registered this church.');
      await getDoc(doc(getFirestore(churchApp(parsed)), 'memberships', owner.uid));
      const rulesHealth = await checkChurchRulesHealth(getFirestore(churchApp(parsed)));
      if (rulesHealth !== 'current') throw new Error(rulesHealth === 'unsafe' ? 'The church security rules allow access that should be blocked. Publish the generated rules before connecting.' : 'Publish the current generated church security rules, then try connecting again.');
      await finishChurchRegistration(reservedId, parsed.config.projectId, parsed.ownerEmail);
      saveChurchConnection(parsed);
      setConnection(parsed);
      setError('');
    } catch (failure) { setError(`Could not finish church setup. ${String(failure)}`); }
    finally { setBusy(false); }
  };

  const submitEmail = async () => {
    if (!connection || busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    if (emailMode === 'register' && password.length < 6) { setError('Choose a password with at least 6 characters.'); return; }
    if (emailMode === 'register' && password !== passwordConfirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (emailMode === 'register') {
        await registerChurchEmail(connection, email, password);
        setNotice(`We sent a verification link to ${email.trim()}. Open it, then return here and click “I verified my email”.`);
      } else {
        await signInChurchEmail(connection, email, password);
      }
      setPassword('');
      setPasswordConfirmation('');
    } catch (failure) {
      const code = failure && typeof failure === 'object' && 'code' in failure ? String(failure.code) : '';
      if (code === 'auth/operation-not-allowed') setError('Email sign-in is not enabled for this church yet. Ask the church administrator to enable Email/Password in Firebase Authentication.');
      else if (code === 'auth/email-already-in-use') setError('This email already has an account. Choose Sign in, or reset your password.');
      else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('Email or password not recognised. Try again or reset your password.');
      else setError(`Email sign-in failed. ${String(failure)}`);
    } finally { setBusy(false); }
  };

  const checkVerification = async () => {
    if (!connection || busy) return;
    const user = getAuth(churchApp(connection)).currentUser;
    if (!user) { setError('Sign in again, then check your email verification.'); return; }
    setBusy(true);
    try {
      await reload(user);
      await user.getIdToken(true);
      if (!user.emailVerified) { setError('Your email is not verified yet. Open the link we sent, then try again.'); return; }
      setNotice('Email verified. You can now ask your church administrator for access.');
      await openSignedInUser(user);
    } catch (failure) { setError(`Could not check your email verification. ${String(failure)}`); }
    finally { setBusy(false); }
  };

  const sendVerificationAgain = async () => {
    if (!connection || busy) return;
    const user = getAuth(churchApp(connection)).currentUser;
    if (!user) { setError('Sign in again to resend your verification email.'); return; }
    setBusy(true);
    try { await resendChurchVerification(user); setNotice(`We sent another verification link to ${user.email}.`); setError(''); }
    catch (failure) { setError(`Could not send another verification email. ${String(failure)}`); }
    finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (!connection || busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address first, then choose Reset password.'); return; }
    setBusy(true);
    try { await resetChurchEmailPassword(connection, email); setNotice('If this email has a password account, a reset link has been sent.'); setError(''); }
    catch (failure) { setError(`Could not send a password reset link. ${String(failure)}`); }
    finally { setBusy(false); }
  };

  const switchChurch = async () => {
    if (connection) await signOutChurch(connection).catch(() => {});
    clearChurchConnection();
    setConnection(null);
    setPending(null);
    setVerificationPending(false);
    setRequested(false);
    setRulesText('');
  };

  const searchChurch = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      directoryId(churchName, town);
      setMatches((await findChurches(churchName)).filter((church) => church.status !== 'cancelled' && (church.status === 'ready' || !church.expiresAt || church.expiresAt.toMillis() > Date.now())));
      setSearched(true);
    } catch (failure) { setError(String(failure)); }
    finally { setBusy(false); }
  };

  const registerChurch = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try { const reservation = await reserveChurch(churchName, town); setReservedId(reservation.id); setOwnerEmail(reservation.ownerEmail); }
    catch (failure) { setError(String(failure)); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <h1 className="inline-block">
          <img className="w-60 max-w-full dark:hidden" src={(import.meta.env?.BASE_URL || '/') + 'branding/suite-primary-light.svg'} alt="PraiseAV Suite" />
          <img className="hidden w-60 max-w-full dark:block" src={(import.meta.env?.BASE_URL || '/') + 'branding/suite-primary-dark.svg'} alt="PraiseAV Suite" />
        </h1>
        {connection ? (
          <>
            <p><strong>{connection.churchName}</strong> owns its Firebase project and church records.</p>
            {userName ? <p>Signed in as {userName}</p> : <p>Sign in with Google or an email address to join this church.</p>}
            {verificationPending ? (
              <div className="space-y-3 rounded-xl border border-sky-300 dark:border-sky-800 p-4">
                <h2 className="font-semibold">Verify your email</h2>
                <p className="text-sm">Open the verification link sent to {userName}. Then return here to continue. You cannot request church access until your email is verified.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy} onClick={checkVerification}>I verified my email</button>
                  <button type="button" className="px-4 py-2 rounded border disabled:opacity-50" disabled={busy} onClick={sendVerificationAgain}>Resend verification email</button>
                </div>
              </div>
            ) : pending ? (
              <div className="space-y-3">
                <p>You can add your own details now. Your church administrator must approve access before you can view shared church records.</p>
                <OwnProfileForm session={pending} />
                <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy || requested} onClick={async () => {
                  setBusy(true);
                  try { await requestChurchAccess(pending); setRequested(true); setError(''); }
                  catch (failure) { setError(String(failure)); }
                  finally { setBusy(false); }
                }}>{requested ? 'Access request sent' : 'Ask church administrator for access'}</button>
                <p className="text-sm">This page will open automatically after a church administrator approves you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy} onClick={async () => {
                  setBusy(true);
                  try { await signInChurch(connection); setError(''); }
                  catch (failure) { setError(signInError(failure)); }
                  finally { setBusy(false); }
                }}>Sign in with Google</button>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                  <h2 className="font-semibold">Use your email address</h2>
                  <div className="flex gap-2 text-sm"><button type="button" className={emailMode === 'sign-in' ? 'px-3 py-1.5 rounded bg-sky-600 text-white' : 'px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600'} onClick={() => setEmailMode('sign-in')}>Sign in</button><button type="button" className={emailMode === 'register' ? 'px-3 py-1.5 rounded bg-sky-600 text-white' : 'px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600'} onClick={() => setEmailMode('register')}>Create an account</button></div>
                  <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitEmail(); }}>
                    <label className="block text-sm">Email address<input type="email" autoComplete="email" required className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                    <label className="block text-sm">Password<input type="password" autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'} required minLength={emailMode === 'register' ? 6 : undefined} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                    {emailMode === 'register' && <label className="block text-sm">Confirm password<input type="password" autoComplete="new-password" required minLength={6} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>}
                    <button type="submit" className="px-4 py-2 rounded border border-sky-500 disabled:opacity-50" disabled={busy}>{emailMode === 'register' ? 'Create account and verify email' : 'Sign in with email'}</button>
                  </form>
                  {emailMode === 'sign-in' && <button type="button" className="underline text-sm" disabled={busy} onClick={resetPassword}>Reset password</button>}
                  <p className="text-xs text-slate-600 dark:text-slate-400">Email accounts need the church to enable Email/Password in Firebase Authentication. No Google account is required.</p>
                </div>
              </div>
            )}
            <button className="ml-3 underline text-sm" onClick={switchChurch}>Use another church</button>
          </>
        ) : (
          <>
            <p>Find your church by its name and town. If it already uses Suite, you can sign in from here when the church has chosen to be listed, or use the church link from its administrator. Only one person needs to set up a new church.</p>
            {directoryAvailable ? <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3" aria-label="Find your church">
              <h2 className="font-semibold text-lg">Find your church</h2>
              <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void searchChurch(); }}>
                <label className="block text-sm">Church name<input required readOnly={Boolean(reservedId)} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={churchName} onChange={(event) => { setChurchName(event.target.value); setSearched(false); }} /></label>
                <label className="block text-sm">Town or city<input required readOnly={Boolean(reservedId)} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" value={town} onChange={(event) => { setTown(event.target.value); setSearched(false); }} /></label>
                {!reservedId && <button type="submit" className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={busy}>Find church</button>}
              </form>
              {searched && !reservedId && <div className="space-y-2 text-sm">
                {matches.length > 0 ? <><p>Churches with this name:</p><ul className="space-y-2">{matches.map((church) => <li key={church.id} className="rounded border border-slate-200 dark:border-slate-700 p-3"><strong>{church.churchName}</strong> · {church.town}{(() => { const listed = connectionFromDirectory(church); return listed
                  ? <div className="mt-2"><button type="button" className="px-3 py-2 rounded bg-sky-600 text-white" onClick={() => { saveChurchConnection(listed); setConnection(listed); setError(''); }}>Sign in to {church.churchName}</button></div>
                  : <p className="mt-1">{church.status === 'ready' ? 'Already using Suite. Ask your church administrator for its link so you can request access.' : 'Setup is in progress. Ask the person setting it up for the church link.'}</p>; })()}</li>)}</ul></> : <p>No church with this name was found.</p>}
                {matches.some((church) => church.id === directoryId(churchName, town)) ? <p>If this is a separate congregation with the same name, add its neighbourhood to the church name and search again.</p> : <button type="button" className="px-4 py-2 rounded border border-sky-500 disabled:opacity-50" disabled={busy} onClick={registerChurch}>Set up this church</button>}
              </div>}
              {reservedId && <div className="text-sm space-y-2"><p className="text-emerald-700 dark:text-emerald-300">Church registration reserved for about two weeks. Continue the one-time setup below.</p><button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={async () => { setBusy(true); try { await cancelChurchReservation(reservedId); setReservedId(null); setOwnerEmail(''); setSearched(false); setError(''); } catch (failure) { setError(String(failure)); } finally { setBusy(false); } }}>Change church name or town</button></div>}
            </section> : <p className="rounded-xl border border-sky-300 dark:border-sky-800 p-4 text-sm">Church lookup and registration are available on the <a className="underline text-sky-600" href="https://praiseav-suite.web.app/">PraiseAV Suite website</a>.</p>}
            {reservedId && <>
            <section aria-label="Church setup checklist" className="rounded-xl border border-sky-300 dark:border-sky-800 p-4 space-y-3 text-sm">
              <h2 className="font-semibold text-lg">Church setup checklist</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li><a className="underline text-sky-600" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Create a Firebase project ↗</a> using the church’s Google account. Choose the free Spark plan; leave AI and Analytics off.</li>
                <li>In Project settings → General → Your apps, register a Web app called PraiseAV Suite. Leave Firebase Hosting unchecked. Paste the full <code>firebaseConfig</code> code example below. There is no need to run <code>npm install</code>.</li>
                <li>In {projectBase ? <a className="underline text-sky-600" href={`${projectBase}/authentication/providers`} target="_blank" rel="noreferrer">Authentication → Sign-in method ↗</a> : 'Authentication → Sign-in method'}, enable Google for the church administrator and Email/Password for members without Google accounts. Leave passwordless Email link off; its Spark email quota is too small for normal church sign-in. Set the public name to PraiseAV Suite and choose the church support email.</li>
                <li>In {projectBase ? <a className="underline text-sky-600" href={`${projectBase}/authentication/settings`} target="_blank" rel="noreferrer">Authentication → Settings ↗</a> : 'Authentication → Settings'}, add <code>{siteDomain}</code> under Authorised domains. Enter only the domain, without <code>https://</code> or a path.</li>
                <li>{projectBase ? <a className="underline text-sky-600" href={`${projectBase}/firestore`} target="_blank" rel="noreferrer">Create Cloud Firestore ↗</a> : 'Create Cloud Firestore'} using Standard edition, database ID <code>(default)</code>, a location near your church, and Production mode. Do not add real records yet.</li>
                <li>Copy the security rules generated below into Firestore → Rules and publish them. Then connect and sign in.</li>
                <li>After signing in, open Church access → <strong>Set up the booth computer</strong>. Paste its code into PraiseAV on the church computer, and services sent from the Suite reach the booth by themselves.</li>
              </ol>
              <p className="text-xs">The project belongs to your church. Only the administrator needs Firebase Console; members do not.</p>
              <p className="text-xs"><strong>Keep a backup.</strong> Your church owns its data, and PraiseAV keeps no copy. If something is deleted, only your own backup can bring it back. After setup, open Church access → <em>Back up your church</em> and click <em>Download everything</em> once a month.</p>
            </section>
            <label className="block text-sm">Church administrator’s Google email<input type="email" readOnly className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={ownerEmail} /></label>
            <label className="block text-sm">Firebase Web app configuration<textarea className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={6} value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder="Paste the full Firebase code example here" /></label>
            {projectId && <p className="text-sm text-emerald-700 dark:text-emerald-400">Project found: <strong>{projectId}</strong>. The checklist now has direct links to its setup pages.</p>}
            {rulesText && <div className="space-y-2"><p className="text-sm">Your church-specific rules are ready. Copy them into Firestore → Rules and click Publish there.</p><button type="button" className="px-3 py-2 rounded border" onClick={() => navigator.clipboard.writeText(rulesText).catch(() => setError('Clipboard unavailable. Select and copy the rules from the box below.'))}>Copy security rules</button><textarea readOnly aria-label="Church security rules" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono text-xs" rows={8} value={rulesText} /><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rulesPublished} onChange={(e) => setRulesPublished(e.target.checked)} />I published these rules in Firestore.</label></div>}
            <button className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50" disabled={!rulesText || !rulesPublished || busy} onClick={connect}>Connect and sign in</button>
            </>}
            {hasLegacy && <details className="text-sm rounded border border-slate-300 dark:border-slate-700 p-3"><summary>Recover older browser records</summary><p className="my-2">Download these records as a backup, then restore them after signing into your church. Nothing is uploaded automatically.</p><button type="button" className="underline" onClick={()=>{
              const records=readLegacySnapshot();if(!records)return;
              const url=URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:'application/json'}));
              const link=document.createElement('a');link.href=url;link.download='praiseav-suite-older-browser-records.json';link.click();URL.revokeObjectURL(url);
            }}>Download older records</button></details>}
          </>
        )}
        <p className="text-sm"><a className="underline" href="https://praiseav.com/help/suite.html#setting-up-your-church" target="_blank" rel="noreferrer">Full setup guide</a> · <a className="underline" href="https://praiseav.com/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a></p>
        {notice && <p role="status" className="text-emerald-700 dark:text-emerald-300 text-sm">{notice}</p>}
        {error && <p role="alert" className="text-red-600 text-sm break-words">{error}</p>}
      </div>
    </main>
  );
}
