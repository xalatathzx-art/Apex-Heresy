import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';
import {RULESET_DEFS} from '../script/creation/ruleset-data.mjs';
import {rollExpression} from '../script/creation/creation-roll-data.mjs';

const races = JSON.parse(readFileSync(new URL('../packs-src/origins/07-bc-races.json', import.meta.url), 'utf8'));
const find = key => normaliseOrigin(races.find(item => item.system.key === key).system);

test('the book offers two races, both valid origins with their page', () => {
    assert.equal(races.length, 2);
    for (const item of races) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'race', item.name);
        assert.equal(item.system.ruleset, 'bc', item.name);
        assert.match(item.system.source, /^Black Crusade, p\. \d+$/, item.name);
        assert.deepEqual(item.system.grants.aptitudes, [], 'the book has no aptitudes');
    }
});

test('the race sets the roll base and the starting experience (pp. 53, 75)', () => {
    assert.equal(find('human').rules.characteristicBase, 25);
    assert.equal(find('human').rules.startingExperience, 1000);
    assert.equal(find('chaosSpaceMarine').rules.characteristicBase, 30);
    assert.equal(find('chaosSpaceMarine').rules.startingExperience, 500,
        'a Chaos Space Marine starts higher and so gets less to spend');
    assert.equal(rollExpression(RULESET_DEFS.bc.characteristicModifiers, 0,
        find('chaosSpaceMarine').rules.characteristicBase), '2d10+30');
});

test('a human knows Low Gothic and picks two Common Lores and a Trade (p. 51)', () => {
    const human = find('human');
    assert.deepEqual(human.grants.specialities, [{key: 'linguistics', name: 'Low Gothic', advance: 0}]);
    assert.deepEqual(human.grants.traits.map(trait => trait.name), ['The Quick and the Dead']);
    const commonLore = human.choices.find(choice => choice.key === 'commonLore');
    assert.equal(commonLore.type, 'many');
    assert.equal(commonLore.count, 2);
    assert.deepEqual(commonLore.groups, ['commonLore']);
    assert.equal(human.choices.find(choice => choice.key === 'trade').count, 1);
});

test('a Chaos Space Marine carries his implants as traits and talents (p. 49)', () => {
    const marine = find('chaosSpaceMarine');
    assert.deepEqual(marine.grants.traits.map(trait => trait.name),
        ['Amphibious', 'Unnatural Characteristic (Strength +4)', 'Unnatural Characteristic (Toughness +4)']);
    const talents = marine.grants.talents.map(talent => talent.name);
    for (const name of ['Ambidextrous', 'Bulging Biceps', 'Legion Weapon Training', 'Nerves of Steel',
        'Quick Draw', 'Unarmed Warrior'])
        assert.ok(talents.includes(name), name);
    assert.deepEqual(talents.filter(name => name.startsWith('Resistance')),
        ['Resistance (Cold)', 'Resistance (Heat)', 'Resistance (Poisons)']);
    assert.deepEqual(talents.filter(name => name.startsWith('Heightened Senses')),
        ['Heightened Senses (Hearing)', 'Heightened Senses (Sight)']);
    const skills = marine.grants.skills.map(skill => skill.key);
    assert.deepEqual(skills, ['athletics', 'awareness', 'dodge', 'parry']);
    assert.deepEqual(marine.grants.specialities.map(entry => `${entry.key}:${entry.name}`),
        ['commonLore:War', 'forbiddenLore:Adeptus Astartes', 'forbiddenLore:The Horus Heresy and the Long War',
         'linguistics:Low Gothic', 'navigate:Surface', 'operate:Surface']);
});

test('his armour and knife come free, and he picks bolter or bolt pistol with four magazines', () => {
    const marine = find('chaosSpaceMarine');
    assert.deepEqual(marine.grants.equipment.map(entry => entry.name),
        ['Legion Power Armour', 'Legion Combat Knife']);
    const weapon = marine.choices.find(choice => choice.key === 'startingWeapon');
    assert.equal(weapon.type, 'one');
    assert.equal(weapon.options.length, 2);
    for (const option of weapon.options) {
        const magazines = option.grants.equipment.find(entry => entry.quantity);
        assert.equal(magazines.quantity, 4, option.label);
    }
});
