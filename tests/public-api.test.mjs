import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('public API rejects a missing explicit actor instead of selecting a token',async()=>{
    const system=loadSystem({fromUuid:async()=>null});
    const create=system.get('typeof createDarkHeresyAPI === "undefined" ? null : createDarkHeresyAPI');
    assert.equal(typeof create,'function');
    await assert.rejects(create().rollTest({actorUuid:'Actor.missing',characteristic:'agility'}),/Actor.*not found/);
});
test('public API checks ownership before rolling',async()=>{
    const system=loadSystem({fromUuid:async()=>({documentName:'Actor',isOwner:false})});
    const create=system.get('typeof createDarkHeresyAPI === "undefined" ? null : createDarkHeresyAPI');
    assert.equal(typeof create,'function');
    await assert.rejects(create().rollTest({actorUuid:'Actor.other',characteristic:'agility'}),/permission/);
});

test('trait API validates before writes and removes obsolete overrides explicitly',async()=>{
    let patch;
    const item={type:'weapon',system:{traitOverrides:{toxic:2,reliable:true}},update:async value=>{patch=value;}};
    const actor={documentName:'Actor',isOwner:true,items:new Map([['weapon',item]])};
    const system=loadSystem({fromUuid:async()=>actor});
    const api=system.get('createDarkHeresyAPI')();
    assert.equal(typeof api.setItemTraits,'function');
    await assert.rejects(api.setItemTraits({actorUuid:'Actor.test',itemId:'weapon',traits:{toxic:'bad'}}),/trait/i);
    assert.equal(patch,undefined);
    await api.setItemTraits({actorUuid:'Actor.test',itemId:'weapon',traits:{toxic:3}});
    assert.equal(patch['system.traitOverrides.toxic'],3);
    assert.equal(patch['system.traitOverrides.-=reliable'],null);
});
