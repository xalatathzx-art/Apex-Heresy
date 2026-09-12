import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

/** An item of the given type, read through the real accessor. */
function item(type, system = {}) {
    const proto = loadSystem().get('DarkHeresyItem.prototype');
    const doc = Object.create(proto);
    doc.type = type;
    doc.system = system;
    return doc;
}

const equippable = (type, system) => item(type, system).isEquippable;

test('weapons and armour are still equippable', () => {
    assert.equal(equippable('weapon'), true);
    assert.equal(equippable('armour'), true);
});

test('a force field can be equipped', () => {
    // The report: "Forcefields aren't equippable and don't do anything." The
    // inventory only draws the equip button for an equippable item, and the
    // armour sum counts only equipped ones, so this gated both halves.
    assert.equal(equippable('forceField'), true);
});

test('gear that grants armour can be equipped', () => {
    // Synskin is type "gear". Its "also grants armour" option could never take
    // effect, because nothing could set equipped on it.
    assert.equal(equippable('gear', {grantsArmour: {enabled: true}}), true);
});

test('gear that grants an attack can be equipped', () => {
    assert.equal(equippable('gear', {grantsAttack: {enabled: true}}), true);
});

test('ordinary gear is not equippable', () => {
    assert.equal(equippable('gear', {}), false);
    assert.equal(equippable('gear', {grantsArmour: {enabled: false}}), false);
});

test('things nobody wears stay unequippable', () => {
    for (const type of ['talent', 'trait', 'psychicPower', 'ammunition', 'aptitude'])
        assert.equal(equippable(type, {}), false, type);
});
