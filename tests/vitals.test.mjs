import {test} from 'node:test';
import assert from 'node:assert/strict';
import {woundsAfterDamage, woundsAfterHealing} from '../script/combat/vitals.mjs';

test('damage fills wounds before it spills into critical', () => {
    assert.deepEqual({...woundsAfterDamage({wounds: 2, critical: 0, max: 10, amount: 5})},
        {wounds: 7, critical: 0});
});

test('the overflow past the limit becomes critical', () => {
    assert.deepEqual({...woundsAfterDamage({wounds: 8, critical: 0, max: 10, amount: 5})},
        {wounds: 10, critical: 3});
});

test('a character already at the limit takes it all as critical', () => {
    assert.deepEqual({...woundsAfterDamage({wounds: 10, critical: 2, max: 10, amount: 4})},
        {wounds: 10, critical: 6});
});

test('zero damage changes nothing', () => {
    assert.deepEqual({...woundsAfterDamage({wounds: 3, critical: 1, max: 10, amount: 0})},
        {wounds: 3, critical: 1});
});

test('healing clears critical first, because it is what kills', () => {
    assert.deepEqual({...woundsAfterHealing({wounds: 10, critical: 3, amount: 2})},
        {wounds: 10, critical: 1});
});

test('healing beyond the critical carries on into the wounds', () => {
    assert.deepEqual({...woundsAfterHealing({wounds: 10, critical: 3, amount: 5})},
        {wounds: 8, critical: 0});
});

test('healing cannot take wounds below zero', () => {
    assert.deepEqual({...woundsAfterHealing({wounds: 2, critical: 0, amount: 9})},
        {wounds: 0, critical: 0});
});

test('nonsense neither heals nor harms', () => {
    assert.deepEqual({...woundsAfterDamage({wounds: 3, critical: 0, max: 10, amount: -4})},
        {wounds: 3, critical: 0});
    assert.deepEqual({...woundsAfterHealing({wounds: 3, critical: 0, amount: -4})},
        {wounds: 3, critical: 0});
});

test('damage and healing are inverse across the critical boundary', () => {
    const hurt = woundsAfterDamage({wounds: 8, critical: 0, max: 10, amount: 5});
    const healed = woundsAfterHealing({...hurt, amount: 5});
    assert.deepEqual({...healed}, {wounds: 8, critical: 0});
});
