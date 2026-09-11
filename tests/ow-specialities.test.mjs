import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {validateOrigin, normaliseOrigin, APTITUDES} from '../script/creation/origin-data.mjs';

const specialities = JSON.parse(readFileSync(new URL('../packs-src/origins/06-ow-specialities.json', import.meta.url), 'utf8'));
const packNames = new Set(readdirSync(new URL('../packs-src/only-war/', import.meta.url))
    .filter(file => file.endsWith('.json') && file !== 'folders.json')
    .flatMap(file => JSON.parse(readFileSync(new URL(`../packs-src/only-war/${file}`, import.meta.url), 'utf8')))
    .map(item => item.name));
const find = key => normaliseOrigin(specialities.find(item => item.system.key === key).system);

test('the twelve specialities are valid origins with the book page', () => {
    assert.equal(specialities.length, 12);
    for (const item of specialities) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'speciality', item.name);
        assert.match(item.system.source, /^Only War, p\. \d+$/, item.name);
        for (const aptitude of item.system.grants.aptitudes) assert.ok(APTITUDES.includes(aptitude), `${item.name}: ${aptitude}`);
    }
});

test('Guardsmen start with 600 xp and Support Specialists with 300 (p. 100)', () => {
    const xp = key => find(key).rules.startingExperience;
    for (const key of ['heavyGunner', 'medic', 'operator', 'sergeant', 'weaponSpecialist']) assert.equal(xp(key), 600, key);
    for (const key of ['commissar', 'ministorumPriest', 'ogryn', 'ratling', 'sanctionedPsyker', 'stormTrooper', 'techPriestEnginseer'])
        assert.equal(xp(key), 300, key);
    assert.equal(specialities.filter(item => item.system.rules.support).length, 7);
});

test('wounds are the speciality figure plus 1d5 (pp. 76-99)', () => {
    const wounds = Object.fromEntries(specialities.map(item => [item.system.key, item.system.wounds.formula]));
    assert.deepEqual(wounds, {heavyGunner: '10+1d5', medic: '8+1d5', operator: '6+1d5', sergeant: '10+1d5',
        weaponSpecialist: '8+1d5', commissar: '10+1d5', ministorumPriest: '9+1d5', ogryn: '25+1d5', ratling: '5+1d5',
        sanctionedPsyker: '8+1d5', stormTrooper: '12+1d5', techPriestEnginseer: '8+1d5'});
});

test('the abhumans carry their characteristic modifiers and traits (pp. 90, 92)', () => {
    assert.deepEqual(find('ogryn').characteristics, {strength: 10, toughness: 10, intelligence: -15, agility: -10});
    assert.deepEqual(find('ogryn').grants.traits.map(trait => trait.name),
        ['Auto-Stabilised', 'But It Dark in Dere!', 'Clumsy', 'Size (Hulking)', 'Sturdy', 'Unnatural Characteristic (Strength +2)', 'Unnatural Characteristic (Toughness +2)']);
    assert.deepEqual(find('ratling').characteristics, {perception: 10, fellowship: 10, toughness: -10});
});

test('the Weapon Specialist picks his +5, and picks three weapon trainings (p. 84)', () => {
    const specialist = find('weaponSpecialist');
    assert.deepEqual(specialist.characteristicChoices[0], {label: '+5 Ballistic Skill or +5 Weapon Skill', pick: 1, value: 5,
        from: ['ballisticSkill', 'weaponSkill']});
    assert.equal(specialist.choices.filter(choice => choice.key.startsWith('weaponTraining')).length, 3);
});

test('the Sanctioned Psyker starts at psy rating 2 with 1d5 Corruption and 400 xp of powers (p. 95)', () => {
    assert.deepEqual(find('sanctionedPsyker').rules.psyker,
        {psyRating: 2, corruption: '1d5', freePowerExperience: 400, ratingCostPerRating: 200});
    assert.deepEqual(find('sanctionedPsyker').grants.traits.map(trait => trait.name), ['Psyker']);
});

test('the Commissar and the Storm Trooper have no Comrade; the Enginseer has a Servitor (pp. 87, 97, 99)', () => {
    assert.equal(find('commissar').rules.comrade, false);
    assert.equal(find('stormTrooper').rules.comrade, false);
    assert.equal(find('techPriestEnginseer').rules.comrade, 'servitor');
    assert.equal(find('medic').rules.comrade, true);
});

test('every speciality offers its advances at the printed cost', () => {
    for (const item of specialities) {
        const advances = item.system.rules.advances;
        assert.ok(advances.length >= 2, item.name);
        for (const advance of advances) {
            assert.ok([200, 250, 300].includes(advance.cost), `${item.name}: ${advance.name} ${advance.cost}`);
            assert.ok(advance.effect.length > 40, `${item.name}: ${advance.name}`);
        }
    }
    assert.equal(find('sergeant').rules.advances.length, 4, 'the Sergeant also buys Sweeping Orders');
});

test('every item a speciality hands out exists in the Only War pack', () => {
    const granted = specialities.flatMap(item => [
        ...(item.system.grants.equipment ?? []),
        ...item.system.choices.flatMap(choice => (choice.options ?? []).flatMap(option => option.grants?.equipment ?? []))
    ].map(entry => entry.name));
    assert.ok(granted.length > 20);
    assert.deepEqual([...new Set(granted.filter(name => !packNames.has(name)))], []);
});
