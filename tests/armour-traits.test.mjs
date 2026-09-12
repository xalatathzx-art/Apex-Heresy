import {test} from 'node:test';
import assert from 'node:assert/strict';
import {traitArmour} from '../script/data/armour-traits.mjs';
import {loadSystem} from './helpers/system.mjs';
import {readFileSync} from 'node:fs';

const trait = name => ({type: 'trait', name});

test('Natural Armour grants its value to all locations (DH2 p. 136)', () => {
    assert.deepEqual({...traitArmour([trait('Natural Armour (3)')])},
        {value: 3, source: 'naturalArmour'});
});

test('Machine grants its value (DH2 p. 137)', () => {
    assert.deepEqual({...traitArmour([trait('Machine (5)')])},
        {value: 5, source: 'machine'});
});

test('Machine and Natural Armour do not stack with each other', () => {
    assert.equal(traitArmour([trait('Machine (5)'), trait('Natural Armour (3)')]).value, 5);
    assert.equal(traitArmour([trait('Machine (2)'), trait('Natural Armour (4)')]).value, 4);
});

test('the higher of the two names itself as the source', () => {
    assert.equal(traitArmour([trait('Machine (2)'), trait('Natural Armour (4)')]).source, 'naturalArmour');
});

test('a trait carrying no value grants nothing', () => {
    assert.deepEqual({...traitArmour([trait('Machine'), trait('Natural Armour')])},
        {value: 0, source: null});
});

test('no armour trait grants nothing', () => {
    assert.deepEqual({...traitArmour([])}, {value: 0, source: null});
    assert.deepEqual({...traitArmour(undefined)}, {value: 0, source: null});
});

test('only trait items are considered', () => {
    const armour = {type: 'armour', name: 'Machine (9)'};
    assert.equal(traitArmour([armour]).value, 0);
});

test('an unrelated trait is ignored', () => {
    assert.equal(traitArmour([trait('Fear (3)'), trait('Size (6)')]).value, 0);
});

test('the American spelling is accepted too', () => {
    assert.equal(traitArmour([trait('Natural Armor (2)')]).value, 2);
});

// ── The trait reaching the sheet ──────────────────────────────────────────

const CHARACTERISTICS = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility',
                         'intelligence', 'perception', 'willpower', 'fellowship', 'influence'];

/** Derive an actor carrying the given items, and report its armour by location. */
function armourOf(items) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    system.context.game.darkHeresy = {config: {hitLocations: system.get('Dh.hitLocations')}};

    const characteristics = {};
    for (const key of CHARACTERISTICS)
        characteristics[key] = {base: 30, advance: 0, unnatural: 0, tempModifier: 0,
                                displayBonus: 3, bonus: 3, label: key};

    const actor = Object.create(proto);
    actor.type = 'acolyte';
    actor.items = items;
    actor.system = {characteristics, armour: {}};
    proto._computeArmour.call(actor);
    return actor.system.armour;
}

test('Machine grants its Armour Points to every location', () => {
    const armour = armourOf([trait('Machine (5)')]);
    for (const location of ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'])
        assert.equal(armour[location].value, 5, location);
});

test('trait armour stacks with worn armour (DH2 p. 137)', () => {
    const vest = {
        type: 'armour', name: 'Flak Vest', isEquipped: true, isArmour: true, isAdditive: false,
        part: {head: 0, body: 4, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0},
        system: {}
    };
    const armour = armourOf([trait('Machine (5)'), vest]);
    assert.equal(armour.body.value, 9, 'worn 4 plus Machine 5');
    assert.equal(armour.head.value, 5, 'the trait alone where nothing is worn');
});

test('a creature with neither trait is unchanged', () => {
    assert.equal(armourOf([]).body.value, 0);
});

test('fire still ignores the armour Machine grants, which is the printed rule', () => {
    // DH2 p. 137 says Machine armour does not protect against Fire, and p. 243
    // has fire bypass armour entirely while Toughness still applies. The reporter
    // asked for a toggle to stop this; it is a house rule, not a defect, so the
    // behaviour is pinned here rather than changed.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fire = source.slice(source.indexOf('async function _applyFireEffect'));
    const body = fire.slice(0, fire.indexOf('\n}'));
    // The comments in that function talk about armour; the code must not.
    const code = body.replace(/\/\/.*$/gm, '');
    assert.match(code, /_toughnessBonus\(actor\)/, 'Toughness is still deducted');
    assert.doesNotMatch(code, /armour/i, 'no armour of any kind is consulted');
});
