import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../src/App';
const storage=new Map<string,string>();
Object.assign(globalThis,{window:{location:{hostname:'praiseav-suite.web.app'}},location:{search:''},localStorage:{getItem:(key:string)=>storage.get(key)??null}});
test('live entry opens church setup rather than an unsaved example workspace',()=>{
  storage.clear();
  const html=renderToStaticMarkup(<App/>);
  assert.match(html,/Find your church/);
  assert.match(html,/Church name/);
  assert.doesNotMatch(html,/pilot|Try the sample|Sample church|Leave sample|Reset local preview/i);
});
test('older browser records have a recovery download without reopening sample mode',()=>{
  storage.set('praiseav_suite_zero_cost_db_v1',JSON.stringify({plans:[],songs:[],members:[],childrenList:[],smallGroups:[],roomBookings:[],donations:[]}));
  const html=renderToStaticMarkup(<App/>);
  assert.match(html,/Download older records/);
  assert.match(html,/Nothing is uploaded automatically/);
  assert.doesNotMatch(html,/Open existing browser records|Try the sample/);
  storage.clear();
});
