import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { applyToExistingProject, parseOptions, setupFiles, type Runner } from '../tools/church-cloud-setup.ts';

const args = ['--project', 'praiseav-suite', '--church', 'Example Church', '--owner', 'owner@example.org', '--location', 'europe-west2'];

test('defaults to a plan that cannot change a project', () => {
  const options = parseOptions(args);
  assert.equal(options.apply, false);
  assert.equal(options.domain, 'onemadpunk.github.io');
  assert.throws(() => applyToExistingProject(options, () => { throw new Error('must not call CLI'); }), /--apply/);
  const files = setupFiles(options);
  assert.match(files['firestore.rules'], /owner@example\.org/);
  assert.equal(JSON.parse(files['firebase.json']).auth.providers.emailPassword, true);
  assert.deepEqual(JSON.parse(files['firebase.json']).auth.providers.googleSignIn.authorizedRedirectUris, [
    'https://praiseav-suite.firebaseapp.com/__/auth/handler', 'https://onemadpunk.github.io',
  ]);
  assert.equal(JSON.parse(files['firebase.json']).firestore.location, 'europe-west2');
});

test('rejects malformed identifiers and injected domain text', () => {
  assert.throws(() => parseOptions([...args, '--domain', 'example.com/evil']), /domain/);
  assert.throws(() => parseOptions(['--project', 'bad;command', ...args.slice(2)]), /project ID/);
  assert.throws(() => parseOptions([...args.slice(0, 5), 'not-an-email']), /email/);
});

function mockRunner({ projects = [{ projectId: 'praiseav-suite' }], apps = [], databases = [], firestoreDisabled = false }: {
  projects?: object[]; apps?: object[]; databases?: object[]; firestoreDisabled?: boolean;
} = {}) {
  const calls: { args: string[]; cwd?: string }[] = [];
  const run: Runner = (_command, callArgs, cwd) => {
    calls.push({ args: callArgs, cwd });
    const [action] = callArgs;
    if (action === 'projects:list') return { status: 0, stdout: JSON.stringify({ result: projects }), stderr: '' };
    if (action === 'apps:list') return { status: 0, stdout: JSON.stringify({ result: apps }), stderr: '' };
    if (action === 'firestore:databases:list') {
      if (firestoreDisabled) return { status: 1, stdout: JSON.stringify({ status: 'error', error: 'Cloud Firestore API has not been used in project praiseav-suite before or it is disabled' }), stderr: '' };
      return { status: 0, stdout: JSON.stringify({ result: databases }), stderr: '' };
    }
    if (action === 'apps:create') { apps.push({ displayName: 'PraiseAV Suite', appId: '1:test:web:1' }); }
    if (action === 'deploy') {
      firestoreDisabled = false;
      if (!databases.length) databases.push({ name: 'projects/praiseav-suite/databases/(default)', locationId: 'europe-west2' });
    }
    if (action === 'apps:sdkconfig') return { status: 0, stdout: '{"result":{"sdkConfig":{"projectId":"praiseav-suite"}}}', stderr: '' };
    return { status: 0, stdout: '', stderr: '' };
  };
  return { run, calls };
}

test('stops before changes when the signed-in account cannot see the exact project', () => {
  const mock = mockRunner({ projects: [{ projectId: 'other-project' }] });
  assert.throws(() => applyToExistingProject(parseOptions([...args, '--apply']), mock.run), /not visible/);
  assert.deepEqual(mock.calls.map((c) => c.args[0]), ['projects:list']);
});

test('stops before changes when an existing web app is ambiguous', () => {
  const mock = mockRunner({ apps: [{ displayName: 'Another app', appId: 'other' }] });
  assert.throws(() => applyToExistingProject(parseOptions([...args, '--apply']), mock.run), /cannot be identified safely/);
  assert.deepEqual(mock.calls.map((c) => c.args[0]), ['projects:list', 'apps:list', 'firestore:databases:list']);
});

test('stops before changes when another platform app could receive Auth settings', () => {
  const mock = mockRunner({ apps: [
    { displayName: 'Android app', platform: 'ANDROID', appId: 'android' },
    { displayName: 'PraiseAV Suite', platform: 'WEB', appId: 'web' },
  ] });
  assert.throws(() => applyToExistingProject(parseOptions([...args, '--apply']), mock.run), /cannot be identified safely/);
  assert.deepEqual(mock.calls.map((c) => c.args[0]), ['projects:list', 'apps:list', 'firestore:databases:list']);
});

test('requires a deliberate location choice for a new database', () => {
  const mock = mockRunner();
  const options = parseOptions([...args.slice(0, -2), '--apply']);
  assert.throws(() => applyToExistingProject(options, mock.run), /Choose --location/);
  assert.deepEqual(mock.calls, []);
});

test('does not change an existing database in another location', () => {
  const mock = mockRunner({ databases: [{ name: 'projects/praiseav-suite/databases/(default)', locationId: 'us-central1' }] });
  assert.throws(() => applyToExistingProject(parseOptions([...args, '--apply']), mock.run), /already has Firestore in us-central1/);
  assert.deepEqual(mock.calls.map((c) => c.args[0]), ['projects:list', 'apps:list', 'firestore:databases:list']);
});

test('church setup targets only its named Firebase project and two deployable resources', () => {
  const mock = mockRunner({ firestoreDisabled: true });
  const result = applyToExistingProject(parseOptions([...args, '--apply']), mock.run);
  try {
    assert.deepEqual(mock.calls.map((c) => c.args[0]), [
      'projects:list', 'apps:list', 'firestore:databases:list',
      'apps:create', 'deploy',
      'projects:list', 'apps:list', 'firestore:databases:list', 'apps:sdkconfig',
    ]);
    assert.ok(mock.calls.every((c) => c.args.includes('praiseav-suite')));
    assert.ok(mock.calls.every((c) => c.args.includes('owner@example.org')));
    assert.deepEqual(mock.calls.find((c) => c.args[0] === 'deploy')?.args.slice(0, 3), ['deploy', '--only', 'auth,firestore:rules']);
  } finally {
    rmSync(result.folder, { recursive: true, force: true });
  }
});
