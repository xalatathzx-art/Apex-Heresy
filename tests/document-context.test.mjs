import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('missing explicit token never falls back to base actor',async()=>{
    const system=loadSystem();
    system.context.game.actors.set('base',{id:'base'});
    assert.equal(await system.get('_getActorFromOwnerId')('base','deleted-token'),null);
});
test('legacy token id resolves off the active scene',async()=>{
    const system=loadSystem();
    const actor={id:'base',uuid:'Scene.other.Token.npc.Actor.base'};
    system.context.game.scenes.set('other',{tokens:new Map([['npc',{actor}]])});
    assert.equal(await system.get('_getActorFromOwnerId')('base','npc'),actor);
});
test('actor UUID resolves the original synthetic actor',async()=>{
    const actor={documentName:'Actor',uuid:'Scene.other.Token.npc.Actor.base'};
    const system=loadSystem({fromUuid:async uuid=>uuid===actor.uuid?actor:null});
    assert.equal(await system.get('_getActorFromOwnerId')(actor.uuid),actor);
});
