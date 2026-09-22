import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';
import {unnaturalFromTrait, sizeFromTrait} from '../script/creation/origin-apply.mjs';
import {woundsExpression} from '../script/creation/creation-roll-data.mjs';

const [entry] = JSON.parse(readFileSync(new URL('../packs-src/origins/10-dw-space-marine.json', import.meta.url), 'utf8'));
const marine = normaliseOrigin(entry.system);

test('what every Battle-Brother already is, before Chapter or Speciality (p. 36)', () => {
    assert.deepEqual(validateOrigin(entry.system), []);
    assert.equal(entry.system.stage, 'spaceMarine');
    assert.equal(entry.system.ruleset, 'dw');
    assert.match(entry.system.source, /^Deathwatch, p\. \d+$/);
    assert.deepEqual(marine.grants.aptitudes, [], 'the book has no aptitudes');
    assert.deepEqual(marine.characteristics, {}, 'the Chapter modifies them, not this');
});

test('his starting skills, under the names the book prints (p. 36)', () => {
    // The system carries the first edition skills under their own keys now, so the
    // list is the book's own. It used to be folded into the Dark Heresy 2 set, and
    // the fold both lost and invented: Literacy vanished, Survival appeared.
    assert.deepEqual(marine.grants.skills.map(skill => skill.key).sort(),
        ['awareness', 'climb', 'concealment', 'dodge', 'intimidate', 'literacy',
         'silentMove', 'tracking']);
    const specialities = marine.grants.specialities.map(entry => `${entry.key}:${entry.name}`);
    for (const wanted of ['ciphers:Chapter Runes', 'speakLanguage:High Gothic', 'speakLanguage:Low Gothic',
        'commonLore:Adeptus Astartes', 'commonLore:Imperium', 'commonLore:War',
        'scholasticLore:Codex Astartes', 'navigate:Surface', 'drive:Ground Vehicles'])
        assert.ok(specialities.includes(wanted), wanted);
    // Hypno-conditioning: the two the Deathwatch adds on top (p. 36).
    assert.ok(specialities.includes('commonLore:Deathwatch'));
    assert.ok(specialities.includes('forbiddenLore:Xenos'));
});

test('his talents, including the one the Deathwatch trains into him (p. 36)', () => {
    const talents = marine.grants.talents.map(talent => talent.name);
    for (const name of ['Ambidextrous', 'Astartes Weapon Training', 'Bulging Biceps', 'Killing Strike',
        'Nerves of Steel', 'Quick Draw', 'True Grit', 'Unarmed Master', 'Deathwatch Training'])
        assert.ok(talents.includes(name), name);
    assert.deepEqual(talents.filter(name => name.startsWith('Heightened Senses')),
        ['Heightened Senses (Hearing)', 'Heightened Senses (Sight)']);
    assert.ok(talents.includes('Resistance (Psychic Powers)'));
});

test('his bonus is doubled, not padded, and power armour makes him Hulking (pp. 36-37)', () => {
    const traits = marine.grants.traits.map(trait => trait.name);
    assert.deepEqual(traits, ['Unnatural Characteristic (Strength x2)',
        'Unnatural Characteristic (Toughness x2)', 'Size (Hulking)']);
    // Written in the pack's own spelling, and still read as a multiplier.
    assert.deepEqual(unnaturalFromTrait(traits[0]), {key: 'strength', value: 0, multiplier: 2});
    assert.deepEqual(unnaturalFromTrait(traits[1]), {key: 'toughness', value: 0, multiplier: 2});
    assert.equal(sizeFromTrait(traits[2]), 5);
    // The Black Carapace denies the shooter that size bonus; the flag is what turns it off.
    assert.equal(marine.rules.spaceMarine, true);
});

test('power armour adds a metre, wounds are 18+1d5 (p. 27)', () => {
    assert.equal(marine.rules.movementBonus, 1, 'the armour lifts the Agility bonus for movement');
    assert.equal(woundsExpression(entry.system.wounds), '18+1d5');
});

test('standard issue every Speciality gets (p. 29)', () => {
    const gear = marine.grants.equipment;
    assert.deepEqual(gear.map(item => item.name),
        ['Astartes Power Armour', 'Astartes Bolt Pistol', 'Astartes Frag Grenade',
         'Astartes Krak Grenade', 'Astartes Combat Knife', 'Repair Cement']);
    assert.equal(gear.find(item => item.name === 'Astartes Frag Grenade').quantity, 3);
    assert.equal(gear.find(item => item.name === 'Astartes Krak Grenade').quantity, 3);
    // The Chapter Trapping is chosen with the GM, so it is written down rather than granted.
    assert.ok(marine.bonuses.some(bonus => /Chapter Trapping/.test(bonus.name)));
});
