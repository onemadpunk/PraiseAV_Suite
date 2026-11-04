import {collection,doc,getDocs,writeBatch} from 'firebase/firestore';
import type {ChurchSession} from './churchFirebase';
import type {SermonDraft} from '../types/church';
const requireAdmin=(session:ChurchSession)=>{if(!session.owner && !session.roles.includes('admin'))throw new Error('Only church administrators can back up or restore private sermon drafts.');};
export async function readSermonDrafts(session:ChurchSession,planIds:string[]):Promise<SermonDraft[]> {
  requireAdmin(session);
  const result:SermonDraft[]=[];
  for(const planId of new Set(planIds)) {
    const snapshot=await getDocs(collection(session.db,'plans',planId,'sermons'));
    result.push(...snapshot.docs.map(entry=>entry.data() as SermonDraft));
  }
  return result;
}
export async function restoreSermonDrafts(session:ChurchSession,planIds:string[],drafts:SermonDraft[]) {
  requireAdmin(session);
  const current=await readSermonDrafts(session,planIds);
  const key=(draft:SermonDraft)=>`${draft.planId}/${draft.id}`;
  const next=new Map(drafts.map(draft=>[key(draft),draft]));
  const changes=[...current.filter(draft=>!next.has(key(draft))).map(draft=>({draft,remove:true})),...drafts.map(draft=>({draft,remove:false}))];
  for(let i=0;i<changes.length;i+=5){
    const batch=writeBatch(session.db);
    for(const {draft,remove} of changes.slice(i,i+5)) {
      const ref=doc(session.db,'plans',draft.planId,'sermons',draft.id);
      if(remove)batch.delete(ref);else batch.set(ref,JSON.parse(JSON.stringify(draft)));
    }
    await batch.commit();
  }
}
