import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectiveMaxAgility} from '../script/data/max-agility.mjs';
import {loadSystem} from './helpers/system.mjs';

const worn = maxAgility => ({isEquipped: true, system: {maxAgility}});

test('nothing worn leaves Agility alone', () => {
    assert.equal(effectiveMaxAgility([]), null);
    assert.equal(effectiveMaxAgility(undefined), null);
});

test('armour without a cap does not cap anything', () => {
    assert.equal(effectiveMaxAgility([worn(null), worn(0), worn(undefined)]), null);
});

test('the lowest cap among worn pieces applies (DH2 p. 168)', () => {
    assert.equal(effectiveMaxAgility([worn(45), worn(35), worn(50)]), 35);
});

test('stowed armour caps nothing', () => {
    const stowed = {isEquipped: false, system: {maxAgility: 20}};
    assert.equal(effectiveMaxAgility([stowed, worn(45)]), 45);
});

const CHARACTERISTICS = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility',
                         'intelligence', 'perception', 'willpower', 'fellowship', 'influence'];

/** Derive an actor wearing the given armour, and report what Agility became. */
function agilityWearing(items, {base = 45} = {}) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    const characteristics = {};
    for (const key of CHARACTERISTICS)
        characteristics[key] = {base: 30, advance: 0, unnatural: 0, tempModifier: 0, label: key};
    characteristics.agility = {base, advance: 0, unnatural: 0, tempModifier: 0, label: 'agility'};

    const actor = Object.create(proto);
    actor.type = 'acolyte';
    actor.items = items;
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
    return actor.system.characteristics.agility;
}

test('worn armour holds Agility down to its maximum', () => {
    const agility = agilityWearing([worn(35)], {base: 45});
    assert.equal(agility.total, 35, 'Agility counts as the armour maximum');
    assert.equal(agility.bonus, 3, 'and the bonus follows the capped value');
});

test('armour whose maximum is above the wearer changes nothing', () => {
    const agility = agilityWearing([worn(50)], {base: 45});
    assert.equal(agility.total, 45);
    assert.equal(agility.bonus, 4);
});

test('the lowest of several worn pieces is the one that binds', () => {
    assert.equal(agilityWearing([worn(45), worn(30)], {base: 50}).total, 30);
});

test('an actor with no items is unaffected', () => {
    assert.equal(agilityWearing([], {base: 45}).total, 45);
});
