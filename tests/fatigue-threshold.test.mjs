import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const CHARACTERISTICS = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility',
                         'intelligence', 'perception', 'willpower', 'fellowship', 'influence'];

/**
 * Derive an actor's stats without booting a world, and report its fatigue
 * threshold. Everything the computation touches lives under system, because the
 * accessors on the prototype read through it.
 */
function thresholdFor({toughness, willpower, type = 'acolyte'}) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    const characteristics = {};
    for (const key of CHARACTERISTICS)
        characteristics[key] = {base: 30, advance: 0, unnatural: 0, tempModifier: 0, label: key};
    Object.assign(characteristics.toughness, toughness);
    Object.assign(characteristics.willpower, willpower);

    const actor = Object.create(proto);
    actor.type = type;
    actor.system = {
        characteristics,
        fatigue: {value: 0, max: 0},
        psy: {rating: 0, sustained: 0},
        initiative: {characteristic: 'agility'},
        insanity: 0,
        corruption: 0
    };
    actor._getAdvanceCharacteristic = () => 0;
    proto._computeCharacteristics.call(actor);
    return actor.system.fatigue.max;
}

test('the threshold is Toughness bonus plus Willpower bonus', () => {
    assert.equal(thresholdFor({
        toughness: {base: 40},
        willpower: {base: 30}
    }), 7);
});

test('Unnatural Toughness raises the threshold (DH2 p. 233)', () => {
    // Toughness bonus 4 plus Unnatural 2 is 6; Willpower bonus 3. Threshold 9.
    assert.equal(thresholdFor({
        toughness: {base: 40, unnatural: 2},
        willpower: {base: 30}
    }), 9);
});

test('Unnatural Willpower raises the threshold too', () => {
    assert.equal(thresholdFor({
        toughness: {base: 40},
        willpower: {base: 30, unnatural: 3}
    }), 10);
});

test('a Deathwatch multiplier counts toward the threshold', () => {
    // Unnatural Toughness (x2) doubles the bonus: 4 becomes 8, plus Willpower 3.
    assert.equal(thresholdFor({
        toughness: {base: 40, unnaturalMultiplier: 2},
        willpower: {base: 30}
    }), 11);
});

test('an advance still counts, as it always did', () => {
    assert.equal(thresholdFor({
        toughness: {base: 35, advance: 5},
        willpower: {base: 30}
    }), 7);
});
