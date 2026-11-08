import { serviceTransferFileName, hashServiceText } from './serviceFolderTransfer';
import { sermonContributionName } from './sermonWorkflow';

// A "delivery" is the exact file PraiseAV Windows reads from its Services folder,
// published to the church's own Firestore so the booth can mirror it without a
// shared Drive folder. The booth writes a receipt when the file is on its disk.
export const MAX_DELIVERY_TEXT = 900_000; // Firestore documents are capped at 1 MiB.

export interface Delivery {
  id: string;           // planId, or itemId for a sermon
  fileName: string;     // the name PraiseAV expects in its Services folder
  text: string;         // the file's JSON text, exactly as written to disk
  hash: string;         // SHA-256 of text
  publishedAt: string;
  publishedBy: string;
}

export interface DeliveryReceipt {
  id: string;          // planId, or `${planId}--${itemId}` for a sermon
  hash: string;        // the hash the booth saved
  receivedAt: string;
  booth: string;       // the booth account's email
}

export function sermonReceiptId(planId: string, itemId: string) { return `${planId}--${itemId}`; }

async function build(id: string, fileName: string, value: unknown, email: string, now: string): Promise<Delivery> {
  const text = JSON.stringify(value, null, 2);
  if (text.length > MAX_DELIVERY_TEXT) throw new Error('This service is too large to send to the booth through the church cloud. Use the Services folder instead.');
  return { id, fileName, text, hash: await hashServiceText(text), publishedAt: now, publishedBy: email };
}

export function serviceDelivery(service: { id: string }, email: string, now = new Date().toISOString()) {
  return build(service.id, serviceTransferFileName(service.id), service, email, now);
}

export function sermonDelivery(sermon: { planId: string; itemId: string }, email: string, now = new Date().toISOString()) {
  return build(sermon.itemId, sermonContributionName(sermon.planId, sermon.itemId), sermon, email, now);
}

export type BoothStatus = { state: 'not-sent' } | { state: 'waiting'; publishedAt: string } | { state: 'received'; receivedAt: string } | { state: 'older'; receivedAt: string };

export function boothStatus(delivery: Pick<Delivery, 'hash' | 'publishedAt'> | null, receipt: Pick<DeliveryReceipt, 'hash' | 'receivedAt'> | null): BoothStatus {
  if (!delivery) return { state: 'not-sent' };
  if (!receipt) return { state: 'waiting', publishedAt: delivery.publishedAt };
  return receipt.hash === delivery.hash ? { state: 'received', receivedAt: receipt.receivedAt } : { state: 'older', receivedAt: receipt.receivedAt };
}

export function boothStatusText(status: BoothStatus): string {
  const time = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }); };
  switch (status.state) {
    case 'not-sent': return 'Not sent to the booth yet.';
    case 'waiting': return `Sent ${time(status.publishedAt)}. Waiting for the booth computer to pick it up (PraiseAV must be open and signed in to the church cloud).`;
    case 'received': return `On the booth computer since ${time(status.receivedAt)}.`;
    case 'older': return `The booth has an older version (from ${time(status.receivedAt)}). It will pick up this one next time PraiseAV is open.`;
  }
}
