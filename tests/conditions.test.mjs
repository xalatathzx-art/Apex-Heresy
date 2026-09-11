import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem, effect, actorWithEffects} from './helpers/system.mjs';

for (const [label, options, expected] of [
    ['enabled', {}, true],
    ['disabled', {disabled:true,active:false}, false],
    ['expired', {active:false,isSuppressed:true,duration:{expired:true}}, false]
]) test(`condition activity agrees for ${label} effect regardless of icon`, () => {
    const system=loadSystem(), actor=actorWithEffects(system,[effect('stunned',options)]);
    assert.equal(!!actor.hasCondition('stunned'), expected);
    assert.equal(system.get('_hasCondition')(actor,'stunned'), expected);
});

test('item effect reports its item and remains passive when permanent', () => {
    const system=loadSystem();
    const item={documentName:'Item',type:'weapon',name:'Sword'};
    const fx=effect(null,{parent:item,name:'Strength',isTemporary:false});
    item.effects=new Set([fx]);
    const result=system.get('DarkHeresySheet.prototype.organizeEffects').call({actor:{effects:[],items:[item]}},{});
    assert.equal(result.passive.length,1);
    assert.equal(result.passive[0].source,'Sword');
});

test('reapplying an expired condition restarts the existing document', async () => {
    const system=loadSystem();
    let updated;
    const fx=effect('stunned',{active:false,update:async data => {updated=data;return fx;}});
    const actor=actorWithEffects(system,[fx]);
    actor.createEmbeddedDocuments=async()=>{assert.fail('must restart existing condition');};
    system.get('DarkHeresyUtil').findEffect=()=>({});
    system.get('DarkHeresyUtil').getCreateData=()=>({statuses:['stunned']});
    system.context.foundry.utils.mergeObject=Object.assign;
    system.context.ActiveEffect.getEffectStart=()=>({time:100});
    await actor.addCondition('stunned');
    assert.equal(updated.disabled,false);
    assert.equal(updated.duration.expired,false);
    assert.equal(updated.start.time,100);
});
