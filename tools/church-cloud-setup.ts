/**
 * One-time, church-owned Firebase provisioning helper. This is a pilot tool,
 * not part of the public Suite UI. It invokes Google's official Firebase CLI
 * using the administrator's local login; no credentials are sent to PraiseAV.
 *
 * Examples:
 *   node --import tsx tools/church-cloud-setup.ts --project praiseav-suite \
 *     --church "PraiseAV pilot" --owner church@example.org --location europe-west2
 *   ...same arguments... --apply
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { churchRules } from '../src/services/churchRules.ts';

export type SetupOptions = {
  project: string;
  church: string;
  owner: string;
  location?: string;
  domain: string;
  firebase: string;
  firebaseScript?: string;
  apply: boolean;
  inspect: boolean;
};

export function parseOptions(args: string[]): SetupOptions {
  const values = new Map<string, string>();
  let apply = false;
  let inspect = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') { apply = true; continue; }
    if (args[i] === '--inspect') { inspect = true; continue; }
    if (!args[i].startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error(`Expected a value after ${args[i]}.`);
    }
    if (!['--project', '--church', '--owner', '--location', '--domain', '--firebase', '--firebase-script'].includes(args[i])) {
      throw new Error(`Unknown option ${args[i]}.`);
    }
    values.set(args[i++], args[i]);
  }
  const project = values.get('--project') || '';
  const church = values.get('--church')?.trim() || '';
  const owner = values.get('--owner')?.trim().toLowerCase() || '';
  const location = values.get('--location');
  const domain = values.get('--domain') || 'onemadpunk.github.io';
  if (apply && inspect) throw new Error('Choose either --inspect or --apply.');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) throw new Error('Enter the exact Firebase project ID (6–30 lower-case letters, numbers or hyphens).');
  if (!church || church.length > 80) throw new Error('Enter a church name of up to 80 characters.');
  churchRules(owner); // Validate with the same code that generates the Suite rules.
  if (location && !/^[a-z][a-z0-9-]{2,30}$/.test(location)) throw new Error('Invalid Firebase location.');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) || domain.includes('..')) throw new Error('Enter a website domain without https:// or a path.');
  return {
    project, church, owner, location, domain,
    firebase: values.get('--firebase') || 'firebase',
    firebaseScript: values.get('--firebase-script'), apply, inspect,
  };
}

export function setupFiles(options: SetupOptions) {
  return {
    'firebase.json': JSON.stringify({
      auth: { providers: { googleSignIn: {
        oAuthBrandDisplayName: 'PraiseAV Suite',
        supportEmail: options.owner,
        // Firebase's Google OAuth handler is always required. The Suite origin
        // is included for the site's sign-in flow; verify Authorized domains
        // in the Firebase Console after deploying because these are distinct
        // settings in some versions of Firebase Authentication.
        authorizedRedirectUris: [
          `https://${options.project}.firebaseapp.com/__/auth/handler`,
          `https://${options.domain}`,
        ],
      } } },
      firestore: { database: '(default)', location: options.location, edition: 'standard', rules: 'firestore.rules' },
    }, null, 2) + '\n',
    'firestore.rules': churchRules(options.owner) + '\n',
  };
}

type CommandResult = { status: number | null; stdout: string; stderr: string; error?: Error };
export type Runner = (command: string, args: string[], cwd?: string) => CommandResult;

export const systemRunner: Runner = (command, args, cwd) => {
  if (/\.(?:cmd|bat)$/i.test(command)) {
    return { status: null, stdout: '', stderr: '', error: new Error('Use the standalone Firebase executable, or pass node.exe with --firebase-script. Batch files are not run through a shell.') };
  }
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false, timeout: 120_000, windowsHide: true });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error };
};

function command(runner: Runner, options: SetupOptions, args: string[], cwd?: string): string {
  const result = runner(options.firebase, [
    ...(options.firebaseScript ? [options.firebaseScript] : []),
    ...args, '--project', options.project, '--account', options.owner, '--non-interactive',
  ], cwd);
  if (result.error || result.status !== 0) {
    throw new Error(`Firebase CLI failed at ${args.slice(0, 2).join(' ')}: ${result.error?.message || result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`}`);
  }
  return result.stdout;
}

function jsonResult(output: string, name: string): unknown {
  try {
    const parsed = JSON.parse(output);
    if (parsed?.status === 'error') throw new Error(parsed.error?.message || 'Firebase reported an error.');
    return parsed?.result ?? parsed;
  } catch (error) {
    throw new Error(`Could not understand Firebase ${name} response: ${String(error)}`);
  }
}

function items(value: unknown, key: string): Record<string, unknown>[] {
  const list = Array.isArray(value) ? value : (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : null);
  if (!Array.isArray(list)) throw new Error(`Firebase returned an unexpected ${key} list. Setup stopped without making further changes.`);
  return list as Record<string, unknown>[];
}

/** Only an exact, existing project can be modified. Never guesses at app IDs. */
export function inspectProject(options: SetupOptions, runner: Runner = systemRunner) {
  const projects = items(jsonResult(command(runner, options, ['projects:list', '--json']), 'projects'), 'projects');
  if (!projects.some((p) => p.projectId === options.project)) {
    throw new Error(`Project ${options.project} is not visible to this Firebase login. Sign in with the church administrator's Google account first.`);
  }
  // Auth provisioning selects the first app across every platform, so inspect
  // all apps rather than looking at web apps only.
  const apps = items(jsonResult(command(runner, options, ['apps:list', '--json']), 'apps'), 'apps');
  let databases: Record<string, unknown>[] = [];
  try {
    databases = items(jsonResult(command(runner, options, ['firestore:databases:list', '--json']), 'databases'), 'databases');
  } catch (error) {
    // A new Firebase project returns 403 until the Firestore API is enabled.
    // The CLI's Firestore deployment enables it and creates the database.
    // Every other error must stop the setup.
    if (!/Cloud Firestore API has not been used.*or it is disabled/i.test(String(error))) throw error;
  }
  const defaultDatabase = databases.find((db) => db.databaseId === '(default)' || db.name === `projects/${options.project}/databases/(default)`);
  return { apps, defaultDatabase: defaultDatabase || null };
}

export function applyToExistingProject(options: SetupOptions, runner: Runner = systemRunner) {
  if (!options.apply) throw new Error('Use --apply to approve changes to the named church project.');
  if (!options.location) throw new Error('Choose --location before creating Firestore. Its location cannot be changed later.');
  const initial = inspectProject(options, runner);
  const namedApps = initial.apps.filter((app) => app.displayName === 'PraiseAV Suite');
  // The current Firebase CLI chooses the first app when deploying Auth. A
  // project with more than one app needs an explicit selection path, which
  // this pilot intentionally does not provide.
  if (initial.apps.length > 1 || (initial.apps.length && !namedApps.length)) {
    throw new Error('This project has web apps that cannot be identified safely. This pilot supports one PraiseAV Suite web app only.');
  }
  if (initial.defaultDatabase?.locationId && initial.defaultDatabase.locationId !== options.location) {
    throw new Error(`This project already has Firestore in ${initial.defaultDatabase.locationId}. The database location cannot be changed.`);
  }
  const folder = mkdtempSync(join(tmpdir(), 'praiseav-church-'));
  for (const [name, content] of Object.entries(setupFiles(options))) writeFileSync(join(folder, name), content, { mode: 0o600 });
  if (!namedApps.length) command(runner, options, ['apps:create', 'web', 'PraiseAV Suite']);
  // Firestore deployment enables its API and creates the missing default
  // Standard database using the explicit location in firebase.json.
  // Deploy only the two named resources; never deploy Hosting or Functions.
  command(runner, options, ['deploy', '--only', 'auth,firestore:rules'], folder);
  const final = inspectProject(options, runner);
  if (!final.defaultDatabase) throw new Error('Firebase did not report a default Firestore database after deployment.');
  const app = final.apps.find((candidate) => candidate.displayName === 'PraiseAV Suite');
  const appId = app?.appId;
  if (typeof appId !== 'string') throw new Error('Setup completed, but the web app ID was not returned. Find it in Firebase Project settings.');
  const response = jsonResult(command(runner, options, ['apps:sdkconfig', 'web', appId, '--json']), 'web app configuration');
  if (!response || typeof response !== 'object' || !('sdkConfig' in response)) {
    throw new Error('Setup completed, but Firebase returned an unknown web app configuration. Open Project settings to copy it.');
  }
  writeFileSync(join(folder, 'firebase-web-config.json'), JSON.stringify(response.sdkConfig, null, 2) + '\n', { mode: 0o600 });
  return { folder, appId, domain: options.domain };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.inspect) {
      const state = inspectProject(options);
      console.log(`Project ${options.project} is visible to ${options.owner}.`);
      console.log(`Apps: ${state.apps.map((app) => `${app.displayName} (${app.platform})`).join(', ') || 'none'}`);
      console.log(`Default Firestore database: ${state.defaultDatabase ? `exists in ${state.defaultDatabase.locationId || 'unknown location'}` : 'not set up yet'}`);
    } else if (!options.apply) {
      console.log(`Pilot plan for existing church project ${options.project}:`);
      console.log(`  Church owner: ${options.owner}`);
      console.log(`  Suite domain: ${options.domain}`);
      console.log(`  Firestore: use existing (default), or create in ${options.location || '[choose --location]'}`);
      console.log('  Configure Google sign-in, web app and church-specific security rules.');
      console.log('  No changes made. Run again with --apply after reviewing these choices.');
    } else {
      const result = applyToExistingProject(options);
      console.log(`Setup complete. Web app configuration saved in ${join(result.folder, 'firebase-web-config.json')}`);
      console.log(`Check that ${result.domain} appears under Authentication → Settings → Authorized domains before using Suite sign-in.`);
    }
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
