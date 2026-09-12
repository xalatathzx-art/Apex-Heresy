import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const sprayWeapon = () => ({
    isRange: true,
    name: 'Hand Flamer',
    rateOfFire: {single: 0, burst: 0, full: 0},
    traits: {skipAttackRoll: true}
});

test('a Spray weapon may fire even though it has no rate of fire', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    assert.equal(supports({weapon: sprayWeapon(), attackType: {name: 'standard'}}), true);
});

test('a non-Spray weapon with no single shot is still refused', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    const weapon = {...sprayWeapon(), traits: {}};
    assert.equal(supports({weapon, attackType: {name: 'standard'}}), false);
});

test('refusing a single shot explains itself instead of failing silently', () => {
    const warnings = [];
    const system = loadSystem({
        ui: {notifications: {warn: message => warnings.push(message), info() {}, error() {}}}
    });
    const weapon = {...sprayWeapon(), traits: {}};
    system.get('_weaponSupportsAttackType')({weapon, attackType: {name: 'standard'}});
    assert.equal(warnings.length, 1, 'the refusal must reach the user');
});

test('a Spray weapon is not refused for lacking full auto either', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    assert.equal(supports({weapon: sprayWeapon(), attackType: {name: 'full_auto'}}), true);
});

test('an ordinary weapon with a single shot is still allowed', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    const weapon = {isRange: true, name: 'Lasgun', rateOfFire: {single: 1, burst: 0, full: 0}, traits: {}};
    assert.equal(supports({weapon, attackType: {name: 'standard'}}), true);
});
