import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';

const components = JSON.parse(readFileSync(new URL('../packs-src/origins/04-ow-regiment-components.json', import.meta.url), 'utf8'));
const byStage = stage => components.filter(item => item.system.stage === stage);
const costs = stage => Object.fromEntries(byStage(stage).map(item => [item.name, item.system.cost]));

test('every component is a valid Only War origin with its book page', () => {
    for (const item of components) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.ruleset, 'ow', item.name);
        assert.match(item.system.source, /^Only War, p\. \d+$/, item.name);
    }
});

test('home worlds and their costs follow Table 2-1 (p. 59)', () => {
    assert.deepEqual(costs('regimentOrigin'), {'Death World': 3, 'Fortress World': 3, 'Highborn': 3, 'Hive World': 3,
        'Imperial World': 1, 'Penal Colony': 2, 'Penitent': 3, 'Schola Progenium': 3});
});

test('commanding officers follow Table 2-2 (p. 63)', () => {
    assert.deepEqual(costs('regimentCommander'), {Bilious: 2, Circumspect: 2, Choleric: 2, Fixed: 1, Maverick: 2,
        Melancholic: 2, Phlegmatic: 1, Sanguine: 2, Supine: 1});
});

test('regiment types follow Table 2-3 (p. 64)', () => {
    assert.deepEqual(costs('regimentType'), {'Armoured Regiment': 4, 'Reconnaissance Regiment': 3, 'Drop Troops': 3,
        'Hunter-Killer': 3, 'Light Infantry': 2, 'Line Infantry': 2, 'Mechanised Infantry': 3, 'Siege Infantry': 2});
    // Every regiment type trades one characteristic for another.
    for (const item of byStage('regimentType')) {
        const values = Object.values(item.system.characteristics).sort((a, b) => a - b);
        assert.deepEqual(values, [-3, 3], item.name);
    }
});

test('training and equipment doctrines follow Tables 2-4 and 2-5 (pp. 66-67)', () => {
    assert.deepEqual(costs('doctrine'), {'Close Order Drill': 2, 'Die-Hards': 3, 'Favoured Foe': 3, 'Hardened Fighters': 2,
        'Iron Discipline': 3, 'Sharpshooters': 4, 'Survivalists': 4});
    assert.deepEqual(costs('equipmentDoctrine'), {Augmetics: 2, Chameleoline: 3, 'Combat Drugs': 2, Demolitions: 3,
        Scavengers: 3, 'Warrior Weapons': 3, 'Well-Provisioned': 3});
});

test('home world characteristic picks and wounds are the book numbers', () => {
    const world = name => normaliseOrigin(components.find(item => item.name === name).system);
    assert.deepEqual(world('Death World').characteristicChoices[0], {label: '+3 to any two of Perception, Strength, Toughness',
        pick: 2, value: 3, from: ['perception', 'strength', 'toughness']});
    assert.deepEqual(['Death World', 'Fortress World', 'Highborn', 'Hive World', 'Imperial World', 'Penal Colony', 'Penitent', 'Schola Progenium']
        .map(name => world(name).grants.wounds), [2, 0, -1, -1, 0, 1, 2, 1]);
    assert.equal(world('Imperial World').characteristics.willpower, 3);
    assert.equal(world('Penal Colony').rules.kitPoints, 15);
    assert.equal(world('Highborn').rules.logistics, 10);
});

test('choices a whole regiment makes are marked, the ones each character makes are not (p. 41)', () => {
    const choice = (name, key) => components.find(item => item.name === name).system.choices.find(entry => entry.key === key);
    assert.equal(choice('Fortress World', 'hatedEnemy').regimentLevel, true);
    assert.equal(choice('Favoured Foe', 'favouredFoe').regimentLevel, true);
    assert.equal(choice('Fortress World', 'combatDoctrine').regimentLevel, undefined, 'Nerves of Steel or Sprint is per character');
});
