import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewImport, updateRestaurant} from '../features/admin/admin-api';

test('admin API keeps multipart boundary generation with fetch and forwards authentication', async()=>{
  const previous=globalThis.fetch;
  const form=new FormData();form.set('mode','preview');
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'/api/admin/restaurants');
    assert.equal(init?.method,'POST');
    assert.equal(init?.body,form);
    assert.equal(new Headers(init?.headers).get('Content-Type'),null);
    assert.equal(new Headers(init?.headers).get('x-admin-password'),'test-password');
    return Response.json({rows:[]});
  };
  try {await previewImport('test-password',form);} finally {globalThis.fetch=previous;}
});
test('admin API serializes state changes and propagates server errors',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async(_url,init)=>{
    assert.equal(init?.method,'PATCH');
    assert.equal(new Headers(init?.headers).get('Content-Type'),'application/json');
    assert.deepEqual(JSON.parse(String(init?.body)),{id:'test',active:false,previous:true});
    return Response.json({error:'상태가 변경되었습니다.'},{status:400});
  };
  try {await assert.rejects(updateRestaurant('test-password',{id:'test',active:false,previous:true}),/상태가 변경되었습니다/);} finally {globalThis.fetch=previous;}
});
