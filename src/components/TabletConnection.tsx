import { useState } from 'react';
import { tabletAddress } from '../utils/tabletConnection';
export function TabletConnection({churchId='sample'}:{churchId?:string}) {
  const key=`praiseav-tablet-${churchId}`;
  const [address,setAddress]=useState(()=>{
    const incoming=new URLSearchParams(location.search).get('live');
    if(incoming){try{const address=tabletAddress(incoming);localStorage.setItem(key,address);return address;}catch{/* Ignore untrusted incoming addresses. */}}
    return localStorage.getItem(key) || '';
  });
  const [message,setMessage]=useState('');
  const connect=()=>{
    try {
      const origin=tabletAddress(address);
      localStorage.setItem(key,origin); location.assign(origin);
    } catch(error) {setMessage(String(error));}
  };
  return <section className="rounded border border-sky-500/40 p-4 space-y-2">
    <h2 className="font-semibold">Use this tablet at church</h2>
    <p className="text-sm">On church Wi-Fi, scan PraiseAV’s Remote QR code and ask the AV operator to approve Band stand, Preacher, or both. Approval is remembered by this tablet’s browser. Use “Open my Suite preparation” in the paired live view once to link this page automatically; you can then open the live views from here on later Sundays.</p>
    {address && <button className="rounded bg-sky-600 text-white px-4 py-2" onClick={connect}>Open church live views</button>}
    <details><summary className="cursor-pointer text-sm">Change church computer address</summary><div className="flex gap-2 flex-wrap"><input aria-label="Church computer remote address" className="rounded border bg-transparent p-2 flex-1" placeholder="https://192.168.1.10:…" value={address} onChange={e=>setAddress(e.target.value)}/><button className="rounded bg-sky-600 text-white px-4 py-2" onClick={connect}>Connect</button></div></details>
    {message && <p role="alert">{message}</p>}
  </section>;
}
