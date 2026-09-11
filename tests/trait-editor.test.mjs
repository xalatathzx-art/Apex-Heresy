import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as traits from '../script/data/weapon-traits.mjs';

test('editor distinguishes inheritance, disabled and explicit values',()=>{
    assert.equal(typeof traits.traitOverridesFromRows,'function');
    assert.deepEqual(traits.traitOverridesFromRows([
        {key:'reliable',mode:'inherit',value:''}, {key:'scatter',mode:'off',value:''},
        {key:'toxic',mode:'value',value:'3'}, {key:'balanced',mode:'value',value:''},
        {key:'crippling',mode:'value',value:'1d10'}
    ]),{scatter:false,toxic:3,balanced:true,crippling:'1d10'});
});

test('empty numeric input and unknown mode are rejected',()=>{
    assert.equal(typeof traits.traitOverridesFromRows,'function');
    for(const row of [{key:'toxic',mode:'value',value:''},{key:'reliable',mode:'other'}]) {
        assert.throws(()=>traits.traitOverridesFromRows([row]),/trait/i);
    }
});

test('saving an unchanged editor leaves concurrent changes alone',()=>{
    assert.equal(typeof traits.traitOverridePatch,'function');
    assert.deepEqual(traits.traitOverridePatch({toxic:2},{toxic:2},{toxic:4}),{});
});

test('editor deletes an override when returning to inherited and refuses a conflicting edit',()=>{
    assert.equal(typeof traits.traitOverridePatch,'function');
    assert.deepEqual(traits.traitOverridePatch({toxic:2},{}, {toxic:2,balanced:true}),{'system.traitOverrides.-=toxic':null});
    assert.throws(()=>traits.traitOverridePatch({toxic:2},{toxic:3},{toxic:4}),/conflict/i);
});
