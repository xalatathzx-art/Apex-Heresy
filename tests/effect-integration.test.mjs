import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem,effect,actorWithEffects} from './helpers/system.mjs';

test('removing an item condition disables its contribution without deleting the source',async()=>{
    const s=loadSystem();let patch;
    const fx=effect('stunned',{parent:{documentName:'Item'},update:async data=>{patch=data;},delete:()=>assert.fail('source deleted')});
    await actorWithEffects(s,[fx]).removeCondition('stunned');
    assert.equal(patch.disabled,true);
});

test('effect row UUID identifies its exact parent despite duplicate local IDs',()=>{
    const first={id:'same',uuid:'Actor.a.Item.first.ActiveEffect.same'};
    const second={id:'same',uuid:'Actor.a.Item.second.ActiveEffect.same'};
    const s=loadSystem({$:()=>({closest:()=>({data:key=>({id:'same',uuid:second.uuid,collection:'effects'})[key]})})});
    const sheet=Object.create(s.get('DarkHeresySheet.prototype'));
    sheet.actor={effects:new Map(),items:[{effects:new Map([['same',first]])},{effects:new Map([['same',second]])}]};
    assert.equal(sheet._getDocument({currentTarget:{}}),second);
    second.uuid='Actor.a.Item.changed.ActiveEffect.same';
    // A stale explicit UUID must never fall back to a different local ID.
    s.context.$=()=>({closest:()=>({data:key=>({id:'same',uuid:'Actor.missing.ActiveEffect.same',collection:'effects'})[key]})});
    assert.equal(sheet._getDocument({currentTarget:{}}),null);
});

test('expired and item-targeted effects are not represented as applying to the actor',()=>{
    const s=loadSystem();const item={documentName:'Item',name:'Armour'};
    const expired=effect('stunned',{parent:item,transfer:true,active:false,isSuppressed:true,isTemporary:true,duration:{expired:true},name:'Expired'});
    const local=effect(null,{parent:item,transfer:false,isTemporary:false,name:'Item-only'});
    item.effects=new Set([expired,local]);
    const result=s.get('DarkHeresySheet.prototype.organizeEffects').call({actor:{effects:[],items:[item]}});
    assert.equal(result.active.length,0);assert.equal(result.passive.length,0);
    assert.equal(result.disabled[0].state,'expired');
    assert.equal(result.itemOnly[0].state,'itemOnly');
});

test('restart explicitly resets expiry and records a new start',async()=>{
    const s=loadSystem();s.context.ActiveEffect.getEffectStart=()=>({time:123});let patch;
    await s.get('restartEffect')({update:async value=>{patch=value;}});
    assert.equal(patch.disabled,false);assert.equal(patch['duration.expired'],false);
    assert.equal(patch.start.time,123);
});
