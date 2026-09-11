import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

function setup({round=1, clip=3, fired, combatId='combat'}={}) {
    const flags=new Map(Object.entries(fired ?? {}));
    const weapon={name:'Test',getFlag:(_,key)=>flags.get(key),setFlag:async(_,key,value)=>flags.set(key,value)};
    const actor={documentName:'Actor',items:new Map([['weapon',weapon]])};
    const system=loadSystem({fromUuid:async()=>actor,fromUuidSync:()=>actor,
        game:{combat:{id:combatId,round},settings:{get:()=>false},i18n:{format:key=>key}},
        ui:{notifications:{warn:()=>{}}}});
    let rolls=0;
    system.context._resolveCombatRoll=async()=>{rolls++;};
    const data={actorUuid:'Actor.test',itemId:'weapon',attackType:{name:'standard'},weapon:{isRange:true,
        traits:{recharge:true},clip:{value:clip,max:3},rateOfFire:{single:1,burst:0,full:0}}};
    return {system,data,flags,weapon,rolls:()=>rolls};
}

test('first-round recharge weapon can fire once but not twice',async()=>{
    const {system,data,rolls}=setup();
    assert.equal((await system.get('combatRoll')(data)).status,'resolved');
    assert.equal((await system.get('combatRoll')(data)).status,'cancelled');
    assert.equal(rolls(),1);
});

test('queued attacks recheck the current magazine rather than a saved dialog snapshot',async()=>{
    const {system,data,weapon,rolls}=setup();weapon.clip={value:0,max:3};
    assert.equal((await system.get('combatRoll')(data)).reason,'ammunition');
    assert.equal(rolls(),0);
});

test('single fire and melee restrictions also apply without the dialog',async()=>{
    for (const mode of ['standard','called_shot','lightning']) {
        const {system,data,rolls}=setup();data.attackType.name=mode;
        data.weapon.rateOfFire.single=0;
        if(mode==='lightning') {data.weapon.isRange=false;data.weapon.traits.unwieldy=true;}
        assert.equal((await system.get('combatRoll')(data)).reason,'attackType');
        assert.equal(rolls(),0);
    }
});

test('Fate reroll does not consume the original ammunition again',async()=>{
    const {system,data,weapon}=setup({clip:0});let writes=0;
    weapon.update=async()=>{writes++;};data.flags={isReRoll:true};
    assert.equal((await system.get('combatRoll')(data)).status,'resolved');
    await system.get('_consumeAmmo')(data);
    assert.equal(writes,0);
});

test('a preRoll cancellation never starts recharge or resolves an attack',async()=>{
    const {system,data,flags,rolls}=setup();system.context.Hooks.call=()=>false;
    assert.equal((await system.get('combatRoll')(data)).status,'cancelled');
    assert.equal(flags.size,0);assert.equal(rolls(),0);
});

test('an incapacitated attacker does not start recharge',async()=>{
    const {system,data,flags}=setup();
    system.context._actorFromRollData=()=>({hasCondition:key=>key==='stunned'});
    await system.get('combatRoll')(data);
    assert.equal(flags.size,0);
});

test('empty clip cancels a direct attack without starting recharge',async()=>{
    const {system,data,flags,rolls}=setup({clip:0});
    assert.equal((await system.get('combatRoll')(data)).reason,'ammunition');
    assert.equal(rolls(),0);
    assert.equal(flags.size,0);
});

test('unsupported fire mode is rejected by the common attack entry',async()=>{
    const {system,data,rolls}=setup();data.attackType.name='full_auto';
    assert.equal((await system.get('combatRoll')(data)).reason,'attackType');
    assert.equal(rolls(),0);
});

test('recharge expires after the following round and does not leak into another combat',async()=>{
    for(const [round,combatId,expected] of [[2,'combat','cancelled'],[3,'combat','resolved'],[1,'other','resolved']]) {
        const {system,data}=setup({round,combatId,fired:{rechargeFiredRound:1,rechargeCombatId:'combat'}});
        assert.equal((await system.get('combatRoll')(data)).status,expected);
    }
});
