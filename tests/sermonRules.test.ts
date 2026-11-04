import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {readSermonDrafts,restoreSermonDrafts} from '../src/services/sermonBackup';
import type {ChurchSession} from '../src/services/churchFirebase';
import { churchRules } from '../src/services/churchRules';
let env:RulesTestEnvironment;
const draft={id:'sermon-a',planId:'sunday',title:'My sermon',notes:'Private Alice notes',slides:[],media:[],updatedAt:'2026-11-04T12:00:00Z'};
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-praiseav-sermons',firestore:{rules:churchRules('owner@example.org')}});
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();
    await setDoc(doc(db,'plans','sunday'),{id:'sunday',sermonAssignments:{'sermon-a':'alice@example.org','sermon-b':'bob@example.org'}});
    for(const [uid,role] of [['alice','preacher'],['bob','preacher'],['musician','musician']])await setDoc(doc(db,'memberships',uid),{uid,email:uid+'@example.org',roles:[role]});
    await setDoc(doc(db,'plans','sunday','sermons','sermon-b'),{...draft,id:'sermon-b',notes:'Private Bob notes'});
  });
});
after(async()=>{await env?.cleanup();});
const person=(uid:string)=>env.authenticatedContext(uid,{email:uid+'@example.org',email_verified:true}).firestore();
test('assigned preacher can read an empty draft, create it, and update only that sermon',async()=>{
  const db=person('alice'),ref=doc(db,'plans','sunday','sermons','sermon-a');
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(setDoc(ref,draft));
  await assertSucceeds(updateDoc(ref,{notes:'Updated private notes'}));
  await assertFails(updateDoc(doc(db,'plans','sunday'),{title:'Replace entire plan'}));
  await assertFails(setDoc(doc(db,'plans','sunday','sermons','sermon-b'),{...draft,id:'sermon-b'}));
});
test('another preacher and musicians cannot read private notes',async()=>{
  await assertFails(getDoc(doc(person('alice'),'plans','sunday','sermons','sermon-b')));
  await assertFails(getDoc(doc(person('musician'),'plans','sunday','sermons','sermon-a')));
  await assertSucceeds(getDoc(doc(person('musician'),'plans','sunday')));
});
test('assignment identity and privileged fields cannot be forged in a sermon draft',async()=>{
  const db=person('alice'),ref=doc(db,'plans','sunday','sermons','sermon-a');
  await assertFails(setDoc(ref,{...draft,planId:'another-service'}));
  await assertFails(setDoc(ref,{...draft,roles:['admin']}));
  await assertFails(deleteDoc(ref));
});
test('removing church access revokes subsequent draft writes',async()=>{
  await env.withSecurityRulesDisabled(ctx=>deleteDoc(doc(ctx.firestore(),'memberships','bob')));
  await assertFails(updateDoc(doc(person('bob'),'plans','sunday','sermons','sermon-b'),{notes:'Revoked'}));
});

test('administrator backup and restore include private drafts while musicians cannot export them',async()=>{
  const session={owner:true,roles:[],db:person('owner')} as unknown as ChurchSession;
  const before=await readSermonDrafts(session,['sunday']);
  const saved=before.find(draft=>draft.id==='sermon-a')!;
  await updateDoc(doc(session.db,'plans','sunday','sermons','sermon-a'),{notes:'Changed after backup'});
  await restoreSermonDrafts(session,['sunday'],before);
  const restored=await getDoc(doc(session.db,'plans','sunday','sermons','sermon-a'));
  if(restored.data()?.notes!==saved.notes)throw new Error('Private notes were not restored');
  const musician={owner:false,roles:['musician'],db:person('musician')} as unknown as ChurchSession;
  await assert.rejects(readSermonDrafts(musician,['sunday']),/administrators/);
});
