import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { ChurchSession } from './churchFirebase';
import { sermonDelivery, sermonReceiptId, serviceDelivery, type Delivery, type DeliveryReceipt } from '../utils/deliveries';

function email(session: ChurchSession) {
  const value = session.user.email || '';
  if (!value) throw new Error('Sign in with an email address to send to the booth.');
  return value;
}

export async function publishService(session: ChurchSession, service: { id: string }): Promise<Delivery> {
  const delivery = await serviceDelivery(service, email(session));
  await setDoc(doc(session.db, 'deliveries', service.id), delivery);
  return delivery;
}

export async function publishSermon(session: ChurchSession, sermon: { planId: string; itemId: string }): Promise<Delivery> {
  const delivery = await sermonDelivery(sermon, email(session));
  await setDoc(doc(session.db, 'deliveries', sermon.planId, 'sermons', sermon.itemId), delivery);
  return delivery;
}

type Watch = { delivery: Delivery | null; receipt: DeliveryReceipt | null };

/** Follows one delivery and the booth's receipt for it. Errors (e.g. rules older than v4) leave both empty. */
export function watchDelivery(session: ChurchSession, path: { planId: string; itemId?: string }, onChange: (value: Watch) => void) {
  const value: Watch = { delivery: null, receipt: null };
  const deliveryRef = path.itemId ? doc(session.db, 'deliveries', path.planId, 'sermons', path.itemId) : doc(session.db, 'deliveries', path.planId);
  const receiptRef = doc(session.db, 'deliveryReceipts', path.itemId ? sermonReceiptId(path.planId, path.itemId) : path.planId);
  const quiet = (error: Error) => console.warn('Booth delivery status unavailable:', error.message);
  const stops = [
    onSnapshot(deliveryRef, (snap) => { value.delivery = snap.exists() ? snap.data() as Delivery : null; onChange({ ...value }); }, quiet),
    onSnapshot(receiptRef, (snap) => { value.receipt = snap.exists() ? snap.data() as DeliveryReceipt : null; onChange({ ...value }); }, quiet),
  ];
  return () => stops.forEach((stop) => stop());
}
