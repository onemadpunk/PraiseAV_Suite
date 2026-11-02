import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { ChurchSession, DataDomain, canWrite, saveChurchChanges, subscribeChurchDomain } from './churchFirebase';

// Writes are serialized so rapid clicks cannot commit older state after newer
// state. A failed write restores the last confirmed view and shows the error.
export function useChurchCollection<T extends { id: string }>(
  session: ChurchSession | null,
  domain: DataDomain,
  sample: T[],
  onError: (message: string) => void
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [items, setItems] = useState<T[]>(session ? [] : sample);
  const [ready, setReady] = useState(!session);
  const current = useRef(items);
  const confirmed = useRef(items);
  const pending = useRef(0);
  const serial = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!session) {
      current.current = sample;
      confirmed.current = sample;
      setItems(sample);
      setReady(true);
      return;
    }
    setReady(false);
    return subscribeChurchDomain<T>(session, domain, (next) => {
      if (pending.current === 0) {
        confirmed.current = next;
        current.current = next;
        setItems(next);
      }
      setReady(true);
    }, (error) => {
      onError(domain + ': ' + error.message);
      setReady(true);
    });
  }, [session, domain]);

  const update: Dispatch<SetStateAction<T[]>> = (action) => {
    if (session && !canWrite(session, domain)) {
      onError('Your church role cannot change ' + domain + '.');
      return;
    }
    const before = current.current;
    const next = typeof action === 'function' ? (action as (prior: T[]) => T[])(before) : action;
    current.current = next;
    setItems(next);
    if (!session) return;
    pending.current += 1;
    serial.current = serial.current.then(async () => {
      await saveChurchChanges(session, domain, confirmed.current, next);
      confirmed.current = next;
    }).catch((error) => {
      onError(domain + ': ' + String(error));
    }).finally(() => {
      pending.current -= 1;
      if (pending.current === 0 && current.current !== confirmed.current) {
        current.current = confirmed.current;
        setItems(confirmed.current);
      }
    });
  };
  return [items, update, ready];
}
