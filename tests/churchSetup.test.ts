import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChurchConnection, parseFirebaseConfigText } from '../src/services/churchFirebase';
import { parseChurchBackup } from '../src/services/backup';
import { churchRules } from '../src/services/churchRules';

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

test('Backup import rejects malformed and duplicate record IDs', () => {
  const empty = { plans: [], songs: [], members: [], childrenList: [], smallGroups: [], roomBookings: [], donations: [] };
  assert.deepEqual(parseChurchBackup(empty), empty);
  assert.throws(() => parseChurchBackup({ ...empty, songs: [{ id: 'same' }, { id: 'same' }] }));
  assert.throws(() => parseChurchBackup({ ...empty, songs: [{ id: '../other' }] }));
});
