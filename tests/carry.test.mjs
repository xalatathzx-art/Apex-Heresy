import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carryingLimits, baseLeapAndJump} from '../script/data/carry.mjs';

test('the table is the one on p. 269', () => {
    assert.deepEqual({...carryingLimits(0)}, {carry: 0.9, lift: 2.25, push: 4.5});
    assert.deepEqual({...carryingLimits(4)}, {carry: 18, lift: 36, push: 72});
    assert.deepEqual({...carryingLimits(12)}, {carry: 112, lift: 225, push: 450});
    assert.deepEqual({...carryingLimits(20)}, {carry: 2250, lift: 4500, push: 9000});
});

test('the carrying column matches what the system already used', () => {
    // These are the values the old switch produced, so no book's encumbrance
    // limit changes: only two new columns appear beside it.
    const expected = [0.9, 2.25, 4.5, 9, 18, 27, 36, 45, 56, 67, 78, 90, 112,
                      225, 337, 450, 675, 900, 1350, 1800, 2250];
    expected.forEach((carry, sum) => assert.equal(carryingLimits(sum).carry, carry, `sum ${sum}`));
});

test('the table ends but the character does not', () => {
    assert.deepEqual({...carryingLimits(25)}, {...carryingLimits(20)});
    assert.deepEqual({...carryingLimits(-3)}, {...carryingLimits(0)});
});

test('base leap is the Strength Bonus in metres (p. 268)', () => {
    assert.equal(baseLeapAndJump(4).leap, 4);
    assert.equal(baseLeapAndJump(0).leap, 0);
});

test('base jump is twenty centimetres per Strength Bonus (p. 399)', () => {
    assert.equal(baseLeapAndJump(4).jump, 0.8);
    assert.equal(baseLeapAndJump(5).jump, 1);
});

test('nonsense does not produce a negative leap', () => {
    assert.equal(baseLeapAndJump(-2).leap, 0);
    assert.equal(baseLeapAndJump(undefined).jump, 0);
});

// ── Reaching the sheet ────────────────────────────────────────────────────

import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const gearTab = readFileSync(new URL('../template/sheet/actor/tab/gear.hbs', import.meta.url), 'utf8');
const combatTab = readFileSync(new URL('../template/sheet/actor/tab/combat.hbs', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

/** The actor class with only the two characteristics these derivations read. */
function actorWith({strength, toughness, agility = 30, size = 4}) {
    const Actor = loadSystem().get('DarkHeresyActor');
    const bonus = value => Math.floor(value / 10);
    const actor = Object.create(Actor.prototype);
    const characteristics = {
        strength: {bonus: bonus(strength)},
        toughness: {bonus: bonus(toughness)},
        agility: {bonus: bonus(agility)}
    };
    Object.defineProperty(actor, 'characteristics', {value: characteristics});
    Object.defineProperty(actor, 'size', {value: size});
    actor.system = {};
    return actor;
}

test('the sheet is given the carrying limits the table names', () => {
    const actor = actorWith({strength: 40, toughness: 35});
    actor._computeEncumbrance(12);
    assert.equal(actor.system.encumbrance.max, 45, 'SB 4 + TB 3 = 7');
    assert.equal(actor.system.encumbrance.lift, 90);
    assert.equal(actor.system.encumbrance.push, 180);
    assert.equal(actor.system.encumbrance.value, 12, 'what is carried is still carried');
});

test('leap and jump land beside the four paces, and the paces do not move', () => {
    const actor = actorWith({strength: 45, toughness: 30, agility: 38, size: 4});
    actor._computeMovement();
    const movement = actor.system.movement;
    assert.equal(movement.half, 3, 'AB 3 + size 4 - 4');
    assert.equal(movement.full, 6);
    assert.equal(movement.charge, 9);
    assert.equal(movement.run, 18);
    assert.equal(movement.leap, 4, 'the Strength Bonus in metres');
    assert.equal(movement.jump, 0.8);
});

test('the gear tab shows all three columns of the table', () => {
    assert.match(gearTab, /system\.encumbrance\.max/);
    assert.match(gearTab, /system\.encumbrance\.lift/);
    assert.match(gearTab, /system\.encumbrance\.push/);
});

test('the jump fields are shown to Rogue Trader and to nobody else', () => {
    const at = combatTab.indexOf('system.movement.leap');
    assert.ok(at > -1, 'the field exists');
    assert.match(combatTab.slice(at - 400, at), /\{\{#if \(eq ruleset "rt"\)\}\}/);
    // And the key the condition reads is actually put in front of the template.
    assert.match(source, /data\.ruleset = parts\.ruleset;/);
});

test('every new caption is written in English', () => {
    for (const key of ['ENCUMBRANCE.LIFT', 'ENCUMBRANCE.PUSH', 'MOVEMENT.LEAP',
                       'MOVEMENT.LEAP_HINT', 'MOVEMENT.JUMP', 'MOVEMENT.JUMP_HINT'])
        assert.ok(lang[key], key);
});
