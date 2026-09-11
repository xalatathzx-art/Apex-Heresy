import {test} from 'node:test';
import assert from 'node:assert/strict';

test('pack builder preserves effect documents and flags without sharing references',async()=>{
    const {packEffectData}=await import('../tools/lib/pack-effects.mjs');
    const source={effects:[{_id:'effect',name:'Bonus',transfer:true,system:{changes:[{key:'system.wounds.max',type:'add',value:2}]}}],flags:{'dark-heresy':{activation:'equipped'}}};
    const built=packEffectData(source);assert.deepEqual(built,source);
    built.effects[0].system.changes[0].value=7;assert.equal(source.effects[0].system.changes[0].value,2);
});

test('malformed effects and duplicate IDs fail before pack output',async()=>{
    const {packEffectData}=await import('../tools/lib/pack-effects.mjs');
    for(const source of [{effects:{}},{effects:[{_id:'a'},{_id:'a'}]},{flags:[]},{effects:[{system:{changes:'bad'}}]}]) {
        assert.throws(()=>packEffectData(source),/effect|flag/i);
    }
});
