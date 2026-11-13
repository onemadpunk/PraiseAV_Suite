import React, { useState } from 'react';
import { Copy, Mail } from 'lucide-react';
import type { Member } from '../types/church';
import { addressesForPasting, bccMailto, emailAddresses, withoutEmail } from '../utils/groupEmail';

const plain = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap';

/**
 * Opens a ready email in the sender's own mail app with these people in BCC.
 * Nothing is sent by the Suite. For lists too long for a mail link, the addresses
 * are copied to paste into BCC instead.
 */
export const EmailGroupButton: React.FC<{
  label: string;
  people: Member[];
  senderEmail?: string;
  subject?: string;
  body?: string;
}> = ({ label, people, senderEmail, subject, body }) => {
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState('');
  const addresses = emailAddresses(people);
  const missing = withoutEmail(people);

  const copy = async (why: string) => {
    const text = addressesForPasting(addresses);
    try {
      await navigator.clipboard.writeText(text);
      setManual('');
      setNotice(`${why}${addresses.length} ${addresses.length === 1 ? 'address' : 'addresses'} copied. Paste them into the BCC box of a new email, so people don't see each other's addresses.`);
    } catch {
      setManual(text);
      setNotice(`${why}Copy the addresses below and paste them into the BCC box of a new email.`);
    }
  };

  const open = () => {
    const href = bccMailto(addresses, { to: senderEmail, subject, body });
    if (!href) { void copy('This list is too long for your email app to open in one go. '); return; }
    setNotice('Your email app should open with everyone in BCC. If nothing happens, use "Copy addresses".');
    setManual('');
    window.location.href = href;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={plain} disabled={!addresses.length} onClick={open}><Mail className="w-3.5 h-3.5" /> {label}</button>
        <button type="button" className={plain} disabled={!addresses.length} onClick={() => void copy('')}><Copy className="w-3.5 h-3.5" /> Copy addresses</button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {addresses.length} {addresses.length === 1 ? 'person' : 'people'}
          {missing > 0 && <span className="text-amber-700 dark:text-amber-400"> · {missing} without an email address in People</span>}
        </span>
      </div>
      {notice && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{notice}</p>}
      {manual && <textarea readOnly aria-label="Email addresses" rows={3} className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={manual} onFocus={(e) => e.currentTarget.select()} />}
    </div>
  );
};
