import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boothStatus, boothStatusText, sermonDelivery, serviceDelivery, MAX_DELIVERY_TEXT } from '../src/utils/deliveries';
import { hashServiceText } from '../src/utils/serviceFolderTransfer';

test('a service delivery carries the exact file PraiseAV reads from its Services folder', async () => {
  const service = { format: 'praiseav-service', version: 1, id: 'sunday-1', name: 'Sunday' };
  const delivery = await serviceDelivery(service, 'leader@example.org', '2026-11-08T10:00:00Z');
  assert.equal(delivery.fileName, 'PraiseAV Suite sunday-1.praiseav');
  assert.deepEqual(JSON.parse(delivery.text), service);
  assert.equal(delivery.hash, await hashServiceText(delivery.text));
  assert.equal(delivery.publishedBy, 'leader@example.org');
});

test('a sermon delivery uses the contribution file name the desktop expects', async () => {
  const delivery = await sermonDelivery({ planId: 'sunday-1', itemId: 'sermon-a' }, 'pastor@example.org');
  assert.equal(delivery.id, 'sermon-a');
  assert.equal(delivery.fileName, 'Sermon sunday-1--sermon-a.praiseav-sermon');
});

test('a service too large for one Firestore document is refused with a clear message', async () => {
  const big: { id: string; notes?: string } = { id: 'big', notes: 'x'.repeat(MAX_DELIVERY_TEXT) };
  await assert.rejects(serviceDelivery(big, 'a@b.org'), /too large/);
});

test('booth status follows the receipt for the current file only', () => {
  const sent = { hash: 'a'.repeat(64), publishedAt: '2026-11-08T10:00:00Z' };
  assert.equal(boothStatus(null, null).state, 'not-sent');
  assert.equal(boothStatus(sent, null).state, 'waiting');
  assert.equal(boothStatus(sent, { hash: sent.hash, receivedAt: '2026-11-08T10:01:00Z' }).state, 'received');
  assert.equal(boothStatus(sent, { hash: 'b'.repeat(64), receivedAt: '2026-11-07T10:01:00Z' }).state, 'older');
  assert.match(boothStatusText(boothStatus(sent, null)), /Waiting for the booth/);
});
