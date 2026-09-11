import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';
import {planToActorUpdate, revertUpdate, unnaturalFromTrait} from '../script/creation/origin-apply.mjs';
import {emptyPlan} from '../script/creation/grant-data.mjs';
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
        ['Amphibious', 'Chaos Space Marine Implants',
         'Unnatural Characteristic (Strength +4)', 'Unnatural Characteristic (Toughness +4)',
         // p. 50, under Black Carapace: a Space Marine in power armour has Size (Hulking).
         'Size (Hulking)']);
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

test('the implants that are neither talent nor trait travel on a card of their own (p. 50)', () => {
    const marine = find('chaosSpaceMarine');
    assert.ok(marine.grants.traits.some(trait => trait.name === 'Chaos Space Marine Implants'),
        "Larraman's organ, the Catalepsean node, the Omophagea, the Sus-an membrane, "
        + "Betcher's gland and the Black Carapace grant no talent — without this card they are lost");
});

test('an unnatural trait raises the characteristic bonus it names', () => {
    const actor = () => ({items: [], system: {
        characteristics: {strength: {base: 40, unnatural: 0}, toughness: {base: 40, unnatural: 0}},
        skills: {}, wounds: {max: 0, value: 0}, corruption: 0, insanity: 0, aptitudes: {}
    }});
    const plan = {...emptyPlan(), traits: [
        {name: 'Unnatural Characteristic (Strength +4)'},
        {name: 'Unnatural Characteristic (Toughness +4)'},
        {name: 'Amphibious'}
    ]};
    const {update, applied} = planToActorUpdate(actor(), plan);
    assert.equal(update['system.characteristics.strength.unnatural'], 4);
    assert.equal(update['system.characteristics.toughness.unnatural'], 4);
    assert.deepEqual(applied.unnatural, {strength: 4, toughness: 4});

    // И забирается ровно столько же, когда шаг отменяют.
    const granted = {items: [], system: {characteristics: {strength: {base: 40, unnatural: 4}}}};
    const back = revertUpdate(granted, {unnatural: {strength: 4}});
    assert.equal(back['system.characteristics.strength.unnatural'], 0);
});

test('only a rated unnatural trait counts, and both spellings are read', () => {
    assert.deepEqual(unnaturalFromTrait('Unnatural Strength (+4)'), {key: 'strength', value: 4});
    assert.deepEqual(unnaturalFromTrait('Unnatural Characteristic (Willpower +1)'), {key: 'willpower', value: 1});
    assert.equal(unnaturalFromTrait('Unnatural Characteristic'), null, 'no number, no bonus');
    assert.equal(unnaturalFromTrait('Size (Hulking)'), null);
    assert.equal(unnaturalFromTrait('Amphibious'), null);
});
