import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const burst = (value, full) => ({
    weapon: {isRange: true, clip: {value, max: 30}, rateOfFire: {single: 1, burst: 0, full}, traits: {}},
    attackType: {name: 'full_auto'}
});

test('a magazine shorter than the rate of fire still fires, capped at what is left', () => {
    const got = loadSystem().get('_checkAmmo')(burst(9, 10));
    assert.equal(got.enough, true, 'nine rounds must not forbid a ten-round burst');
    assert.equal(got.required, 10);
    assert.equal(got.fired, 9);
});

test('an empty magazine still refuses the attack', () => {
    const got = loadSystem().get('_checkAmmo')(burst(0, 10));
    assert.equal(got.enough, false);
    assert.equal(got.fired, 0);
});

test('a full magazine spends exactly the rate of fire', () => {
    const got = loadSystem().get('_checkAmmo')(burst(30, 10));
    assert.equal(got.fired, 10);
});

test('a weapon with no magazine is unaffected', () => {
    const got = loadSystem().get('_checkAmmo')({
        weapon: {isRange: true, clip: {value: 0, max: 0}, rateOfFire: {}, traits: {}},
        attackType: {name: 'standard'}
    });
    assert.equal(got.enough, true);
});

test('the hit ceiling honours the rounds actually fired', () => {
    const hits = loadSystem().get('_computeNumberOfHits');
    const attackType = {name: 'full_auto', hitMargin: 1, maxHits: 10};
    // Six degrees of success would score six hits, but only three rounds left.
    assert.equal(hits(6, 0, attackType, 3, {}), 3);
});

test('the hit ceiling is not applied when no round limit is known', () => {
    const hits = loadSystem().get('_computeNumberOfHits');
    const attackType = {name: 'full_auto', hitMargin: 1, maxHits: 10};
    assert.equal(hits(6, 0, attackType, 10, {}), 6);
});
