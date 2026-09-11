import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

function fixture() {
    class CoreCombat {async _onStartTurn(){} async _onEndTurn(){} async _onStartRound(){}}
    const system=loadSystem({Combat:CoreCombat});
    const Class=system.get('typeof DarkHeresyCombat === "undefined" ? Combat : DarkHeresyCombat');
    const combat=new Class();const flags={};
    Object.assign(combat,{uuid:'Combat.test',getFlag:(_s,k)=>flags[k],setFlag:async(_s,k,v)=>{flags[k]=v;}});
    return {system,combat};
}
test('vacuum completes before newly caused suffocation is checked',async()=>{
    const {system,combat}=fixture();const events=[],states=new Set(['vacuum']);
    const actor={uuid:'Actor.a',hasCondition:key=>states.has(key)};
    system.context._applyVacuumEffect=async()=>{await Promise.resolve();states.add('suffocating');events.push('vacuum');};
    system.context._applySuffocationEffect=async()=>events.push('suffocating');
    await combat._onStartTurn({id:'a',actor},{round:1,turn:0});
    assert.deepEqual(events,['vacuum','suffocating']);
});
test('toxic resolves at end of turn, never start, and repeated event is ignored',async()=>{
    const {system,combat}=fixture();let count=0;
    const actor={uuid:'Actor.a',hasCondition:key=>key==='poisond'};
    system.context._applyToxicEffect=async()=>count++;
    const cb={id:'a',actor},context={round:1,turn:0};
    await combat._onStartTurn(cb,context);assert.equal(count,0);
    await combat._onEndTurn(cb,context);await combat._onEndTurn(cb,context);
    assert.equal(count,1);
});
