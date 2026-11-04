import test from 'node:test';
import assert from 'node:assert/strict';
import { canRead, canWrite, parseChurchConnection, parseFirebaseConfigText, churchRolesFromMembership } from '../src/services/churchFirebase';
import type { ChurchRole, ChurchSession, DataDomain } from '../src/services/churchFirebase';
import { parseChurchBackup } from '../src/services/backup';
import { CHURCH_RULES_VERSION, churchRules } from '../src/services/churchRules';

const config = { apiKey: 'public-web-key', authDomain: 'test.firebaseapp.com', projectId: 'test-church', appId: '1:123:web:456' };

test('Firebase Console JavaScript snippet is accepted without eval', () => {
  const snippet = 'const firebaseConfig = { apiKey: "public-web-key", authDomain: "test.firebaseapp.com", projectId: "test-church", appId: "1:123:web:456" };';
  assert.deepEqual(parseFirebaseConfigText(snippet), config);
  assert.deepEqual(parseFirebaseConfigText(JSON.stringify(config)), config);
});

test('Church connection requires an owner email and project identity', () => {
  assert.equal(parseChurchConnection({ config, ownerEmail: 'AV@Example.org', churchName: 'St Mark' }).ownerEmail, 'av@example.org');
  assert.throws(() => parseChurchConnection({ config, churchName: 'St Mark' }));
});

test('Rules separate child and finance records by role', () => {
  const rules = churchRules('av@example.org');
  assert.match(rules, /match \/checkins\/\{id\}/);
  assert.match(rules, /hasRole\('kids'\)/);
  assert.match(rules, /match \/donations\/\{id\}/);
  assert.match(rules, /hasRole\('finance'\)/);
  assert.match(rules, /email_verified == true/);
});

test('new church rules include opt-in directory and the church team roles', () => {
  const rules = churchRules('av@example.org');
  assert.match(rules, /match \/directoryListings\/\{uid\}/);
  assert.match(rules, /allow read: if approved\(\);/);
  assert.match(rules, /consentAt == request\.time/);
  assert.match(rules, /request\.resource\.data\.email == request\.auth\.token\.email/);
  assert.match(rules, /'office_staff', 'planner', 'preacher', 'worship_leader'/);
  assert.match(rules, /match \/profiles\/\{uid\}/);
  assert.match(rules, /request\.auth\.uid == uid/);
});

test('new church rules expose only the current read-only capability check', () => {
  const rules = churchRules('av@example.org');
  assert.match(rules, new RegExp(`PraiseAV church rules ${CHURCH_RULES_VERSION}`));
  assert.ok(rules.includes(`allow get: if admin() && version == '${CHURCH_RULES_VERSION}';`));
  assert.match(rules, /allow list, create, update, delete: if false;/);
});

test('Backup import rejects malformed and duplicate record IDs', () => {
  const empty = { plans: [], songs: [], members: [], childrenList: [], smallGroups: [], roomBookings: [], donations: [] };
  assert.deepEqual(parseChurchBackup(empty), empty);
  assert.throws(() => parseChurchBackup({ ...empty, songs: [{ id: 'same' }, { id: 'same' }] }));
  assert.throws(() => parseChurchBackup({ ...empty, songs: [{ id: '../other' }] }));
});

test('client access matrix keeps children, giving and people records in separate roles', () => {
  const session = (roles: ChurchRole[]) => ({ roles, owner: false }) as ChurchSession;
  const sensitive: DataDomain[] = ['members', 'checkins', 'donations'];
  assert.equal(canRead(session(['av']), 'plans'), true);
  assert.equal(canWrite(session(['av']), 'plans'), false);
  for (const role of ['av', 'musician', 'member'] as ChurchRole[]) {
    for (const domain of sensitive) assert.equal(canRead(session([role]), domain), false);
  }
  assert.equal(canRead(session(['people']), 'members'), true);
  assert.equal(canRead(session(['people']), 'checkins'), false);
  assert.equal(canRead(session(['kids']), 'checkins'), true);
  assert.equal(canRead(session(['kids']), 'donations'), false);
  assert.equal(canRead(session(['finance']), 'donations'), true);
  assert.equal(canWrite(session(['finance']), 'donations'), true);
  assert.equal(canRead(session(['preacher']), 'plans'), true);
  assert.equal(canWrite(session(['preacher']), 'plans'), false);
  assert.equal(canRead(session(['worship_leader']), 'songs'), true);
  assert.equal(canWrite(session(['worship_leader']), 'plans'), true);
  assert.equal(canRead(session(['office_staff']), 'plans'), true);
  assert.equal(canRead(session(['office_staff']), 'members'), false);
  for (const domain of sensitive) assert.equal(canRead(session(['family']), domain), false);
});

test('live membership changes preserve every supported church role',()=>{
  const roles:ChurchRole[]=['admin','office_staff','planner','preacher','worship_leader','av','musician','people','kids','finance','member','family'];
  assert.deepEqual(churchRolesFromMembership(roles),roles);
  assert.deepEqual(churchRolesFromMembership(['preacher','unknown','preacher']),['preacher']);
  assert.deepEqual(churchRolesFromMembership(null),[]);
});
