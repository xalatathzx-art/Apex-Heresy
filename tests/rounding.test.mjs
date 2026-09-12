import {test} from 'node:test';
import assert from 'node:assert/strict';
import {halfRoundedUp} from '../script/data/rounding.mjs';
import {loadSystem} from './helpers/system.mjs';

test('halving rounds up, even below one half (DH2 p. 23)', () => {
    assert.equal(halfRoundedUp(0), 0);
    assert.equal(halfRoundedUp(1), 1);
    assert.equal(halfRoundedUp(2), 1);
    assert.equal(halfRoundedUp(3), 2);
    assert.equal(halfRoundedUp(4), 2);
    assert.equal(halfRoundedUp(5), 3);
});

test('halving tolerates junk without producing NaN', () => {
    assert.equal(halfRoundedUp(undefined), 0);
    assert.equal(halfRoundedUp(null), 0);
    assert.equal(halfRoundedUp('4'), 2);
});

function systemWithUnnatural(unnatural) {
    const actor = {system: {characteristics: {strength: {unnatural}}}};
    const system = loadSystem();
    system.context.game.actors.set('a1', actor);
    return system;
}

test('Unnatural grants half its value in degrees, rounded up (DH2 p. 140)', () => {
    const system = systemWithUnnatural(3);
    const bonus = system.get('_getUnnaturalDosBonus');
    assert.equal(bonus({ownerId: 'a1', characteristicKey: 'strength'}), 2);
});

test('an even Unnatural value is unchanged by the rounding rule', () => {
    const system = systemWithUnnatural(4);
    assert.equal(system.get('_getUnnaturalDosBonus')({ownerId: 'a1', characteristicKey: 'strength'}), 2);
});

test('Unnatural (1) still grants a degree rather than none', () => {
    const system = systemWithUnnatural(1);
    assert.equal(system.get('_getUnnaturalDosBonus')({ownerId: 'a1', characteristicKey: 'strength'}), 1);
});

test('no Unnatural grants nothing', () => {
    const system = systemWithUnnatural(0);
    assert.equal(system.get('_getUnnaturalDosBonus')({ownerId: 'a1', characteristicKey: 'strength'}), 0);
});
