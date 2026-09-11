import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

function fixture(version=12) {
    const system=loadSystem({console:{...console,error(){}}});let written;
    const gm={id:'gm',isGM:true};Object.assign(system.context.game,{user:gm,users:{activeGM:gm},
        actors:{contents:[]},items:{contents:[]},packs:[],scenes:new Map(),
        settings:{get:()=>version,set:async(_s,_k,value)=>{written=value;}}});
    system.context.ui={notifications:{info(){},error(){}}};
    return {system,written:()=>written};
}
test('failed embedded migration does not advance the world version',async()=>{
    const f=fixture();
    f.system.context.game.actors.contents=[{type:'npc',effects:[],items:{contents:[{id:'ammo',type:'ammunition',_source:{system:{}}}]},
        updateEmbeddedDocuments:async()=>{throw Error('database unavailable');}}];
    try {await f.system.get('migrateWorld')();} catch {}
    assert.equal(f.written(),undefined);
});
test('newer world schema is never downgraded',async()=>{
    const f=fixture(999);try {await f.system.get('migrateWorld')();} catch {}
    assert.equal(f.written(),undefined);
});
test('second GM cannot run migrations',async()=>{
    const f=fixture();f.system.context.game.user={id:'other',isGM:true};
    await f.system.get('migrateWorld')();
    assert.equal(f.written(),undefined);
});
test('schema zero patch uses stored data and is free of document writes',()=>{
    const f=fixture(0);
    const actor={type:'npc',_source:{system:{bio:{notes:'keep me'},experience:{value:20,totalspent:10}}}};
    const patch=f.system.get('migrateActorData')(actor,0);
    assert.equal(patch['system.notes'],'keep me');
    assert.equal(patch['system.experience.value'],30);
});
