import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseWorkbook, identity } from '../lib/server/import/parser';
import { plan, revision, synchronize } from '../lib/server/import/sync';
import type { Restaurant } from '../lib/server/restaurants';

async function fixture(options: {strike?: boolean; rich?: boolean; bad?: boolean; duplicate?: boolean; empty?: boolean} = {}) {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('식당');
  sheet.addRow(['제목']); sheet.addRow(['순번','카테고리','가맹점명','대표메뉴','주소','거리']);
  if (!options.empty) {
    sheet.addRow([1,'한식','식당 A','곰탕',options.bad ? '' : '서울 서초구 반포대로28길 43','0.1Km']);
    if (options.strike) sheet.getCell('C3').font={strike:true};
    if (options.rich) sheet.getCell('C3').value={richText:[{text:'식당 '},{text:'A',font:{strike:true}}]};
    if (options.duplicate) sheet.addRow([2,'한식','식당 A','곰탕','서울 서초구 반포대로28길 43','100m']);
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
test('header detection, meter conversion and normal row', async()=>{const [r]=await parseWorkbook(await fixture());assert.equal(r.distance,100);assert.equal(r.active,true);});
test('cell and rich-text strike produce inactive rows',async()=>{for(const option of [{strike:true},{rich:true}])assert.equal((await parseWorkbook(await fixture(option)))[0].active,false);});
test('invalid, duplicate and empty data are rejected',async()=>{for(const option of [{bad:true},{duplicate:true},{empty:true}])await assert.rejects(parseWorkbook(await fixture(option)));});
test('name plus address identity ignores whitespace',()=>assert.equal(identity({name:'식당 A',address:'서울 서초'}),identity({name:'식당A',address:'서울서초'})));
const existing: Restaurant[] = [{id:'00000000-0000-4000-8000-000000000001',name:'식당 A',address:'서울 서초구 반포대로28길 43',category:'한식',main_menu:'곰탕',active:true,distance:'100',latitude:'37.49',longitude:'127.01',created_at:null,updated_at:null},{id:'00000000-0000-4000-8000-000000000002',name:'누락 식당',address:'다른 주소',category:null,main_menu:null,active:true,distance:null,latitude:null,longitude:null,created_at:null,updated_at:null}];
function mockDb(current = existing, fail = false) {
  const calls: {text:string; values?:unknown[]}[]=[];
  const client={query:async(text:string,values?:unknown[])=>{calls.push({text,values});if(text.startsWith('select id'))return {rows:current};if(fail&&text.startsWith('update public'))throw new Error('injected');return {rows:[{id:existing[0].id}]};},release:()=>{}};
  (globalThis as unknown as {lunchDb:unknown}).lunchDb={connect:async()=>client};return calls;
}
test('existing coordinates reused; strike and absent rows deactivate in transaction',async()=>{
  const incoming=await parseWorkbook(await fixture({strike:true}));
  assert.deepEqual(plan(incoming,existing),{added:0,updated:1,inactive:1,missing:1});
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('must not geocode');};
  try {const calls=mockDb();await synchronize(incoming,existing,revision(existing));assert.equal(calls.at(-1)?.text,'COMMIT');assert.equal(calls.find(c=>c.text.startsWith('update public.restaurants set name'))?.values?.[5],false);assert.ok(calls.some(c=>c.text.includes('not (id=any')));} finally{globalThis.fetch=oldFetch;}
});
test('concurrent edit and DB write failure roll back',async()=>{
  const rows=await parseWorkbook(await fixture());
  for(const [current,fail] of [[[],false],[existing,true]] as [Restaurant[],boolean][]){const calls=mockDb(current,fail);await assert.rejects(synchronize(rows,existing,revision(existing)));assert.equal(calls.at(-1)?.text,'ROLLBACK');assert.ok(!calls.some(c=>c.text==='COMMIT'));}
});
test('failed geocoding saves NULL address and coordinates',async()=>{
  const rows=await parseWorkbook(await fixture()); rows[0].address='검색 실패 주소';
  const calls=mockDb();const oldFetch=globalThis.fetch;process.env.KAKAO_REST_API_KEY='test';
  globalThis.fetch=async()=>new Response(JSON.stringify({documents:[],meta:{total_count:0}}));
  try{const result=await synchronize(rows,existing,revision(existing));assert.equal(result.addressErrors,1);const values=calls.find(c=>c.text.startsWith('insert into'))?.values;assert.equal(values?.[3],null);assert.equal(values?.[6],null);assert.equal(values?.[7],null);assert.equal(values?.length,8);assert.equal(calls.at(-1)?.text,'COMMIT');}finally{globalThis.fetch=oldFetch;delete process.env.KAKAO_REST_API_KEY;}
});
test('new row resolves coordinates and inserts before missing-row deactivation',async()=>{
  const rows=await parseWorkbook(await fixture()); rows[0].name='새 식당'; rows[0].address='서울 서초구 새길 1';
  const calls=mockDb();const oldFetch=globalThis.fetch;process.env.KAKAO_REST_API_KEY='test';
  globalThis.fetch=async()=>new Response(JSON.stringify({documents:[{x:'127.01',y:'37.49'}],meta:{total_count:1}}));
  try{await synchronize(rows,existing,revision(existing));const insert=calls.find(c=>c.text.startsWith('insert into'));assert.ok(insert);assert.equal(insert.values?.[6],'37.49');assert.equal(insert.values?.[7],'127.01');assert.equal(calls.at(-1)?.text,'COMMIT');}finally{globalThis.fetch=oldFetch;delete process.env.KAKAO_REST_API_KEY;}
});
test('hidden historical worksheets are excluded; visible final worksheet is imported', async () => {
  const book = new ExcelJS.Workbook();
  for (const [name, state] of [['최종','visible'],['수정','hidden'],['기존','veryHidden']] as const) {
    const sheet = book.addWorksheet(name, {state});
    sheet.addRow(['가맹점명','주소']);
    sheet.addRow([name + ' 식당','서울 서초구 반포대로28길 43']);
  }
  const rows = await parseWorkbook(Buffer.from(await book.xlsx.writeBuffer()));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, '최종 식당');
});
test('multiple visible tables still require disambiguation', async () => {
  const book = new ExcelJS.Workbook();
  for (const name of ['목록1','목록2']) {
    const sheet = book.addWorksheet(name);
    sheet.addRow(['가맹점명','주소']);
    sheet.addRow([name,'서울 서초구 반포대로28길 43']);
  }
  await assert.rejects(parseWorkbook(Buffer.from(await book.xlsx.writeBuffer())));
});
test('geocoding strips parentheses and punctuation attached to building numbers', async () => {
  const { geocode } = await import('../lib/server/import/geocoder');
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.KAKAO_REST_API_KEY;
  process.env.KAKAO_REST_API_KEY = 'test';
  try {
    for (const suffix of ['(서초동) 1층 동신명가', ', 지하1층', '. 지하3호']) {
      const base = '서울특별시 서초구 반포대로28길 31';
      const queries: string[] = [];
      globalThis.fetch = async input => {
        const query = new URL(String(input)).searchParams.get('query')!;
        queries.push(query);
        return new Response(JSON.stringify(query === base ? {documents:[{x:'127.01',y:'37.49'}],meta:{total_count:1}} : {documents:[],meta:{total_count:0}}));
      };
      assert.deepEqual(await geocode(base + suffix), {latitude:'37.49',longitude:'127.01'});
      assert.equal(queries.at(-1), base);
    }
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.KAKAO_REST_API_KEY; else process.env.KAKAO_REST_API_KEY = oldKey; }
});

test('NULL address matches an unambiguous name on reimport without adding a duplicate', async()=>{
  const rows=await parseWorkbook(await fixture());
  const failed=[{...existing[0],address:null,latitude:null,longitude:null}];
  assert.deepEqual(plan(rows,failed),{added:0,updated:1,inactive:0,missing:0});
  const calls=mockDb(failed);
  const oldFetch=globalThis.fetch; const oldKey=process.env.KAKAO_REST_API_KEY; process.env.KAKAO_REST_API_KEY='test'; globalThis.fetch=async()=>Response.json({documents:[],meta:{total_count:0}});
  try {
    await synchronize(rows,failed,revision(failed));
    assert.ok(!calls.some(c=>c.text.startsWith('insert into')));
    assert.equal(calls.find(c=>c.text.startsWith('update public.restaurants set name'))?.values?.[3],null);
    assert.equal(calls.at(-1)?.text,'COMMIT');
  } finally {globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.KAKAO_REST_API_KEY;else process.env.KAKAO_REST_API_KEY=oldKey;}
});
test('ambiguous NULL-address name is rejected before import',async()=>{
  const rows=await parseWorkbook(await fixture());
  assert.throws(()=>plan([...rows,{...rows[0],address:'다른 주소'}],[{...existing[0],address:null}]));
});
test('address correction saves server coordinates; failed searches do not write', async()=>{
  const {correctAddress}=await import('../lib/server/import/sync');
  const oldFetch=globalThis.fetch;const oldKey=process.env.KAKAO_REST_API_KEY;process.env.KAKAO_REST_API_KEY='test';
  const calls: unknown[][]=[];
  (globalThis as unknown as {lunchDb:unknown}).lunchDb={query:async(_sql:string,values:unknown[])=>{calls.push(values);return {rowCount:1};}};
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({documents:[],meta:{total_count:0}}));
    await assert.rejects(correctAddress(existing[0].id,'없는 주소',null));
    assert.equal(calls.length,0);
    globalThis.fetch=async()=>new Response(JSON.stringify({documents:[{x:'127.01',y:'37.49'}],meta:{total_count:1}}));
    await correctAddress(existing[0].id,' 수정 주소 ',null);
    assert.deepEqual(calls[0],['수정 주소','37.49','127.01',existing[0].id,null]);
  } finally {globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.KAKAO_REST_API_KEY;else process.env.KAKAO_REST_API_KEY=oldKey;}
});


test('service failures and exhausted deadline abort before any database writes', async () => {
  const rows = await parseWorkbook(await fixture());
  const withoutCoordinates = [{ ...existing[0], latitude: null, longitude: null }];
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.KAKAO_REST_API_KEY;
  const originalNow = Date.now;
  try {
    for (const failure of ['network', 'quota', 'missing-key', 'deadline', 'bad-response']) {
      const calls = mockDb(withoutCoordinates);
      process.env.KAKAO_REST_API_KEY = 'test';
      if (failure === 'missing-key') delete process.env.KAKAO_REST_API_KEY;
      globalThis.fetch = async () => {
        if (failure === 'network') throw new Error('offline');
        return failure === 'bad-response' ? Response.json({ unexpected: true }) : new Response('', { status: 429 });
      };
      let tick = 0;
      Date.now = failure === 'deadline' ? () => tick++ * 300000 : originalNow;
      await assert.rejects(synchronize(rows, withoutCoordinates, revision(withoutCoordinates)));
      assert.equal(calls.length, 0, failure + ' must not start a transaction');
      assert.equal(withoutCoordinates[0].address, existing[0].address);
    }
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
    if (originalKey === undefined) delete process.env.KAKAO_REST_API_KEY; else process.env.KAKAO_REST_API_KEY = originalKey;
  }
});
