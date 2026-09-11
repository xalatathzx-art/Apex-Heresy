import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('system derivation finishes before the core final effect phase',()=>{
    // Contract boundary taken from Foundry 14 Actor.prepareData: derived precedes final.
    class CoreActor {
        prepareDerivedData() {}
        prepareData(){this.prepareDerivedData();this.system.value *= 2;}
    }
    const system=loadSystem({Actor:CoreActor});
    const actor=new (system.get('DarkHeresyActor'))();actor.system={value:0};actor.type='npc';
    actor._computeCharacteristics=()=>{actor.system.value=10;};
    for(const method of ['_computeInfamy','_computeSkills','_computeAlignment','_computeItems','_computeExperience',
        '_computeArmour','_computeMovement','_computeVitalMeters','_prepareAttributesForModules']) actor[method]=()=>{};
    actor.prepareData();
    assert.equal(actor.system.value,20);
});

test('transferred equipment effect stops when the item is stowed, talents stay active',()=>{
    const system=loadSystem({ActiveEffect:class {get isSuppressed(){return !!this.duration?.expired;}}});
    const Effect=system.get('typeof DarkHeresyActiveEffect === "undefined" ? ActiveEffect : DarkHeresyActiveEffect');
    const fx=new Effect();fx.transfer=true;fx.parent={documentName:'Item',type:'armour',system:{equipped:false}};
    assert.equal(fx.isSuppressed,true);
    fx.parent.system.equipped=true;assert.equal(fx.isSuppressed,false);
    fx.parent={documentName:'Item',type:'talent',system:{}};assert.equal(fx.isSuppressed,false);
});
