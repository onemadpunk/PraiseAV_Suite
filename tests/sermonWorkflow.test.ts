import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAuthorSermon,sermonContributionName,storeSermonMedia} from '../src/utils/sermonWorkflow';
import {toPraiseAVService} from '../src/utils/praiseavService';
import type {ServicePlan} from '../src/types/church';
import {parseChurchBackup} from '../src/services/backup';
import {tabletAddress} from '../src/utils/tabletConnection';
const plan:ServicePlan={id:'sunday',title:'Sunday',date:'2026-11-08',seriesTitle:'',serviceTimes:['10:00'],targetDurationMinutes:60,rota:[],sermonAssignments:{sermon:'alice@example.org'},items:[{id:'sermon',type:'sermon',title:'Prepared sermon',leader:'Alice',stageNotes:'Private notes',audioCue:'',lightingCue:'',durationSeconds:1200,customSlides:[{id:'point',label:'Point 1',bodyText:'Congregation words',lowerThirdText:'',stageMonitorNote:'',backgroundStyle:'warm-charcoal'}],sermonMedia:[{id:'clip',name:'Clip',kind:'video',fileName:'a'.repeat(64)+'.mp4',sha256:'a'.repeat(64),bytes:10,afterSlide:1},{id:'music',name:'Music',kind:'audio',fileName:'b'.repeat(64)+'.mp3',sha256:'b'.repeat(64),bytes:20,afterSlide:0}]}]};
test('sermon export preserves private notes, cue order, media manifest and stable assignment',()=>{
  const exported=toPraiseAVService(plan,[],'https://praiseav-suite.web.app/?plan=sunday');
  assert.equal(exported.items[0].notes,'Private notes');
  assert.deepEqual((exported.items[0].slides as Array<{type:string}>).map(s=>s.type),['media','text','media']);
  assert.equal(exported.media.length,2);assert.equal(exported.items[0].contributionRequired,true);
  assert.equal(exported.items[0].contributionFile,sermonContributionName('sunday','sermon'));
});
test('planner sermons can publish without assigning a tablet or preacher',()=>{
  const exported=toPraiseAVService({...plan,sermonAssignments:{}},[]);
  assert.equal(exported.items[0].contributionFile,sermonContributionName('sunday','sermon'));
  assert.equal(exported.items[0].contributionRequired,false);
});

test('authoring is limited to assigned email or plan managers and paths reject invalid IDs',()=>{
  assert.equal(canAuthorSermon(plan,'sermon','alice@example.org',false),true);
  assert.equal(canAuthorSermon(plan,'sermon','bob@example.org',false),false);
  assert.throws(()=>sermonContributionName('../escape','sermon'));
});
test('tablet return links accept church LAN addresses and reject external or credentialed targets',()=>{
  assert.equal(tabletAddress('https://192.168.1.10:8230/?k=temporary'),'https://192.168.1.10:8230');
  for(const target of ['http://192.168.1.10','https://192.168.evil.com','https://example.com','https://user:password@192.168.1.10','javascript:alert(1)'])assert.throws(()=>tabletAddress(target));
});
test('media transfer verifies bytes and refuses an existing corrupted asset',async()=>{
  let blob:Blob=new Blob([]);let corrupt=false;
  const handle={getFile:async()=>corrupt?new Blob(['wrong']):blob,createWritable:async()=>({write:async(value:Blob)=>{blob=value;},close:async()=>{},abort:async()=>{}})};
  const directory={getDirectoryHandle:async()=>({getFileHandle:async()=>handle})} as unknown as FileSystemDirectoryHandle;
  const media=await storeSermonMedia(directory,new File(['audio bytes'],'song.mp3'));
  assert.equal(media.bytes,11);assert.equal(media.kind,'audio');assert.match(media.fileName,/^[a-f0-9]{64}\.mp3$/);
  corrupt=true;
  await assert.rejects(storeSermonMedia(directory,new File(['audio bytes'],'song.mp3')),/verification/);
});

test('church backups preserve private drafts and reject orphaned or duplicate sermons',()=>{
  const draft={id:'sermon',planId:'sunday',title:'Sunday sermon',notes:'Private notes',slides:[],media:[],updatedAt:'2026-11-04'};
  const backup={plans:[plan],songs:[],members:[],childrenList:[],smallGroups:[],roomBookings:[],donations:[],sermonDrafts:[draft]};
  assert.equal(parseChurchBackup(backup).sermonDrafts?.[0].notes,'Private notes');
  assert.throws(()=>parseChurchBackup({...backup,sermonDrafts:[draft,draft]}));
  assert.throws(()=>parseChurchBackup({...backup,sermonDrafts:[{...draft,planId:'other'}]}));
  assert.throws(()=>parseChurchBackup({...backup,sermonDrafts:[{...draft,roles:['admin']}]}));
});
