import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import type { ChurchSession } from '../services/churchFirebase';
import { canWrite } from '../services/churchFirebase';
import type { ServicePlan, SermonDraft } from '../types/church';
import { canAuthorSermon, sermonContributionName, storeSermonMedia } from '../utils/sermonWorkflow';
import { hashServiceText, loadServiceFolderLink, rememberServiceFolderLink, type ServiceFolderLink } from '../utils/serviceFolderTransfer';
import { toPraiseAVService } from '../utils/praiseavService';
import { TabletConnection } from './TabletConnection';

interface Props {plans:ServicePlan[];session:ChurchSession|null;onUpdatePlan:(plan:ServicePlan)=>void;initialPlanId?:string;}
export function SermonWorkspace({plans,session,onUpdatePlan,initialPlanId}:Props) {
  const planner=!session || canWrite(session,'plans');
  const [selection,setSelection]=useState('');
  const choices=plans.flatMap(plan=>plan.items.filter(item=>item.type==='sermon' && canAuthorSermon(plan,item.id,session?.user.email || '',planner)).map(item=>({plan,item,key:`${plan.id}/${item.id}`})));
  const selected=choices.find(c=>c.key===selection) || choices.find(c=>c.plan.id===initialPlanId) || choices[0];
  const selectedKey=selected?.key || '';
  const [draft,setDraft]=useState<SermonDraft|null>(null);
  const [slideText,setSlideText]=useState('');
  const [assignment,setAssignment]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [folder,setFolder]=useState<ServiceFolderLink|null>(null);
  const [review,setReview]=useState<{text:string;hash:string}|null>(null);
  const dirty=useRef(false), baseVersion=useRef('');
  useEffect(()=>{loadServiceFolderLink().then(setFolder).catch(()=>{});},[]);
  useEffect(()=>{
    if(!selected) {setDraft(null);return;}
    const initial:SermonDraft={id:selected.item.id,planId:selected.plan.id,title:selected.item.title,notes:selected.item.stageNotes || '',slides:selected.item.customSlides || [],media:selected.item.sermonMedia || [],updatedAt:''};
    dirty.current=false; baseVersion.current=''; setLoaded(!session); setReview(null);
    setAssignment(selected.plan.sermonAssignments?.[selected.item.id] || '');
    setDraft(initial);setSlideText(initial.slides.map(s=>s.bodyText).join('\n---\n'));
    if(!session)return;
    return onSnapshot(doc(session.db,'plans',selected.plan.id,'sermons',selected.item.id),snapshot=>{
      const value=snapshot.exists()?snapshot.data() as SermonDraft:initial;
      if(!dirty.current) {setDraft(value);setSlideText(value.slides.map(s=>s.bodyText).join('\n---\n'));baseVersion.current=value.updatedAt;}
      setLoaded(true);
    },error=>{setLoaded(false);setMessage('Could not load this sermon. Check church access/rules: '+error.message);});
  },[selectedKey,session]);
  const edit=(patch:Partial<SermonDraft>)=>{dirty.current=true;setDraft(old=>old?{...old,...patch}:old);};
  const linkedFolder=async()=>{
    let link=folder;
    if(!link) {
      const picker=(window as unknown as {showDirectoryPicker?:(o:unknown)=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker;
      if(!picker)throw new Error('Use Chrome or Edge on your home computer to link the shared PraiseAV Services folder. Notes can still be saved here.');
      link={directory:await picker.call(window,{id:'praiseav-services',mode:'readwrite'}),lastExports:{}};
      await rememberServiceFolderLink(link);setFolder(link);
    }
    const permission=await (link.directory as FileSystemDirectoryHandle & {requestPermission:(o:unknown)=>Promise<string>}).requestPermission({mode:'readwrite'});
    if(permission!=='granted')throw new Error('Please allow access to the shared Services folder.');
    return link;
  };
  const save=async()=>{
    if(!draft || !selected || !loaded)throw new Error('Wait for your assigned sermon to load.');
    const texts=slideText.split(/^\s*---\s*$/m).map(s=>s.trim()).filter(Boolean);
    if(texts.length>100 || draft.notes.length>300000)throw new Error('This sermon exceeds the supported notes/slide limits.');
    const next:SermonDraft={...draft,slides:texts.map((bodyText,i)=>({id:draft.slides[i]?.id || crypto.randomUUID(),label:`Point ${i+1}`,bodyText,lowerThirdText:'',stageMonitorNote:'',backgroundStyle:'warm-charcoal'})),updatedAt:new Date().toISOString()};
    if(next.media.some(c=>c.afterSlide<0 || c.afterSlide>texts.length))throw new Error('A media cue is placed after a slide that no longer exists. Choose its position again.');
    if(session)await runTransaction(session.db,async tx=>{
      const ref=doc(session.db,'plans',next.planId,'sermons',next.id), current=await tx.get(ref);
      if((current.data()?.updatedAt || '')!==baseVersion.current)throw new Error('This sermon changed on another device. Reload this page before saving. Your typed notes are still here.');
      tx.set(ref,JSON.parse(JSON.stringify(next)));
    });
    baseVersion.current=next.updatedAt;dirty.current=false;setDraft(next);setMessage('Sermon draft saved. Send to church when ready.');return next;
  };
  const act=async(work:()=>Promise<unknown>)=>{setBusy(true);setMessage('');try{await work();}catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy(false);}};
  const publish=()=>act(async()=>{
    if(!selected)return;
    const next=await save(),link=await linkedFolder(),fileName=sermonContributionName(next.planId,next.id);
    const compiled=toPraiseAVService({...selected.plan,items:[{...selected.item,title:next.title,stageNotes:next.notes,customSlides:next.slides,sermonMedia:next.media}]},[]);
    const data={format:'praiseav-sermon',version:1,planId:next.planId,itemId:next.id,title:next.title,notes:next.notes,slides:compiled.items[0].slides,media:compiled.media,updatedAt:next.updatedAt};
    const text=JSON.stringify(data,null,2),key=`sermon:${selectedKey}`;
    let handle:FileSystemFileHandle;
    try {
      handle=await link.directory.getFileHandle(fileName);
      const old=await (await handle.getFile()).text(),hash=await hashServiceText(old);
      const parsed=JSON.parse(old);
      if(parsed.planId!==next.planId || parsed.itemId!==next.id)throw new Error('This filename belongs to a different sermon. It has not been replaced.');
      if(hash!==link.lastExports[key]){setReview({text:old,hash});throw new Error('Review the existing published sermon below before replacing it from this browser.');}
    } catch(error){if(!(error instanceof DOMException && error.name==='NotFoundError'))throw error;handle=await link.directory.getFileHandle(fileName,{create:true});}
    const writer=await handle.createWritable();
    try{await writer.write(text);await writer.close();}catch(error){await writer.abort().catch(()=>{});throw error;}
    const hash=await hashServiceText(text);
    if(await hashServiceText(await (await handle.getFile()).text())!==hash)throw new Error('The published sermon could not be verified. Try sending it again.');
    const updated={...link,lastExports:{...link.lastExports,[key]:hash}};await rememberServiceFolderLink(updated);setFolder(updated);setReview(null);
    setMessage('Sermon and media sent to the shared Services folder. The AV desk will show Ready when all files arrive. The planner must also send Sunday’s service plan. Updates never change the live screen until the operator loads them.');
  });
  return <section className="space-y-5 max-w-4xl">
    <h1 className="text-2xl font-bold">My sermon & tablet</h1>
    <p>Prepare your notes, congregation slides and media here. Publish to the church’s shared Services folder, then use the approved tablet view on Sunday.</p>
    {!selected?<p role="status">No sermon is assigned to your account yet. Ask the service planner to assign your email to Sunday’s sermon.</p>:<>
      <label className="block">Service / sermon<select className="block w-full rounded border bg-transparent p-2" value={selectedKey} onChange={e=>{if(!dirty.current || confirm('Leave unsaved sermon edits?'))setSelection(e.target.value);}}>{choices.map(c=><option key={c.key} value={c.key}>{c.plan.date} · {c.plan.title} · {c.item.title}</option>)}</select></label>
      {planner&&<div className="flex gap-2"><input aria-label="Assigned preacher email" type="email" className="flex-1 rounded border bg-transparent p-2" placeholder="Assigned preacher’s email" value={assignment} onChange={e=>setAssignment(e.target.value)}/><button disabled={busy} className="rounded border p-2" onClick={()=>void act(async()=>{
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignment.trim())){setMessage('Enter a valid preacher email.');return;}
        await save();
        onUpdatePlan({...selected.plan,items:selected.plan.items.map(item=>item.id===selected.item.id?{...item,stageNotes:''}:item),sermonAssignments:{...selected.plan.sermonAssignments,[selected.item.id]:assignment.trim().toLowerCase()}});setMessage('Assignment requested. Notes are saved privately; the preacher must also have the church Preacher role.');
      })}>Assign preacher</button></div>}
      {draft&&<fieldset disabled={busy || !loaded} className="space-y-4 disabled:opacity-60">
        <label className="block">Sermon title<input maxLength={200} className="block w-full rounded border bg-transparent p-2" value={draft.title} onChange={e=>edit({title:e.target.value})}/></label>
        <label className="block">Private preacher notes<textarea rows={12} className="block w-full rounded border bg-transparent p-2" value={draft.notes} onChange={e=>edit({notes:e.target.value})}/><small>Use a line containing --- between private notes pages.</small></label>
        <label className="block">Congregation slides<textarea rows={8} className="block w-full rounded border bg-transparent p-2" value={slideText} onChange={e=>{dirty.current=true;setSlideText(e.target.value);}}/><small>Use --- on a line between slides. These words appear on the projector.</small></label>
        <label className="block">Add video or music<input type="file" accept=".mp4,.webm,.mp3,.wav,.m4a,.ogg" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void act(async()=>{const link=await linkedFolder();const media=await storeSermonMedia(link.directory,file);edit({media:[...draft.media,media]});setMessage('Media copied and verified in the shared folder. Save/send the sermon when ready.');});}}/></label>
        {draft.media.map((cue,index)=><div key={cue.id+index} className="flex flex-wrap gap-2 items-center"><span className="flex-1">{cue.kind}: {cue.name}</span><label>Play after<select className="rounded border bg-transparent p-2" value={cue.afterSlide} onChange={e=>edit({media:draft.media.map((c,i)=>i===index?{...c,afterSlide:Number(e.target.value)}:c)})}>{Array.from({length:slideText.split(/^\s*---\s*$/m).filter(s=>s.trim()).length+1},(_,i)=><option key={i} value={i}>{i?`Slide ${i}`:'Title'}</option>)}</select></label><button onClick={()=>edit({media:draft.media.filter((_,i)=>i!==index)})}>Remove cue</button></div>)}
        <div className="flex gap-2"><button className="rounded border px-4 py-2" onClick={()=>void act(save)}>Save draft</button><button className="rounded bg-sky-600 text-white px-4 py-2" onClick={()=>void publish()}>Send my sermon to church</button></div>
      </fieldset>}
      {review&&<details open className="rounded border p-3"><summary>Previously published sermon — review before replacement</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{review.text}</pre><button className="rounded border p-2" onClick={async()=>{if(!folder)return;const next={...folder,lastExports:{...folder.lastExports,[`sermon:${selectedKey}`]:review.hash}};await rememberServiceFolderLink(next);setFolder(next);setReview(null);setMessage('Reviewed. Send my sermon again to publish your saved draft instead.');}}>I reviewed it; allow my saved draft to replace this version</button></details>}
    </>}
    {message&&<p role="status" className="rounded border p-3">{message}</p>}
    <TabletConnection churchId={session?.connection.config.projectId}/>
  </section>;
}
