import assert from 'node:assert/strict';
import test from 'node:test';
import { churchKey, directoryId } from '../src/services/churchDirectory.ts';
import { churchRules } from '../src/services/churchRules.ts';

test('common spelling variants reserve the same church in the same town', () => {
  assert.equal(directoryId("St. Mary's Church", 'Newcastle upon Tyne'), directoryId('Saint Marys Church', 'Newcastle-upon-Tyne'));
  assert.notEqual(directoryId('Saint Marys Church', 'Newcastle'), directoryId('Saint Marys Church', 'York'));
  assert.equal(churchKey('  Hope & Light  '), 'hope-and-light');
});

test('invalid or missing names cannot reserve a directory entry', () => {
  assert.throws(() => directoryId('A', 'Leeds'), /church name and town/);
  assert.throws(() => directoryId('Hope Church', ''), /church name and town/);
});

test('only the PraiseAV Suite rules include the registration directory', () => {
  const ordinaryChurch = churchRules('owner@example.org');
  const directory = churchRules('owner@example.org', true);
  assert.doesNotMatch(ordinaryChurch, /churchDirectory/);
  assert.match(directory, /match \/churchDirectory\/\{id\}/);
  assert.match(directory, /resource\.data\.status == 'setting-up'/);
  assert.match(directory, /allow delete: if false/);
});

test('a listed church opens like its church link, knowing the owner only by hash', async () => {
  const { connectionFromDirectory } = await import('../src/services/churchDirectory');
  const { parseChurchConnection, emailSha256 } = await import('../src/services/churchFirebase');
  const hash = await emailSha256('Owner@Example.org ');
  assert.equal(hash, await emailSha256('owner@example.org'));
  const church: any = { id: 'x', churchName: 'St Mary', town: 'Leeds', nameKey: 'saint-mary', townKey: 'leeds', status: 'ready', ownerUid: 'u', projectId: 'stmary-123',
    signIn: { apiKey: 'k', authDomain: 'stmary-123.firebaseapp.com', projectId: 'stmary-123', appId: '1:2:web:3', ownerEmailSha256: hash } };
  const connection = connectionFromDirectory(church)!;
  assert.equal(connection.ownerEmail, '');
  assert.deepEqual(parseChurchConnection(JSON.parse(JSON.stringify(connection))), connection);
  assert.equal(connectionFromDirectory({ ...church, signIn: undefined }), null);
  assert.equal(connectionFromDirectory({ ...church, signIn: { ...church.signIn, projectId: 'other-project' } }), null);
  assert.throws(() => parseChurchConnection({ ...connection, ownerEmailSha256: undefined }));
});
