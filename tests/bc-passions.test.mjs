import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin, CHARACTERISTIC_KEYS} from '../script/creation/origin-data.mjs';

const passions = JSON.parse(readFileSync(new URL('../packs-src/origins/09-bc-passions.json', import.meta.url), 'utf8'));
const stage = name => passions.filter(item => item.system.stage === name);
const find = (stageName, key) =>
    normaliseOrigin(passions.find(item => item.system.stage === stageName && item.system.key === key).system);

test('ten Prides, ten Disgraces and ten Motivations, all valid (Tables 2-1 to 2-3)', () => {
    assert.equal(passions.length, 30);
    for (const name of ['pride', 'disgrace', 'motivation']) {
        const rows = stage(name);
        assert.equal(rows.length, 10, name);
        assert.deepEqual(rows.map(item => item.system.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], name);
        for (const item of rows) {
            assert.deepEqual(validateOrigin(item.system), [], item.name);
            assert.match(item.system.source, /^Black Crusade, p\. 7[234]$/, item.name);
            assert.ok(item.system.description.length > 80, item.name);
        }
    }
});

test('a d10 roll finds exactly one row of each table (p. 75)', () => {
    for (const name of ['pride', 'disgrace', 'motivation'])
        for (let roll = 1; roll <= 10; roll++)
            assert.equal(stage(name).filter(item => item.system.rules.roll === roll).length, 1,
                `${name} ${roll}`);
});

test('Prides give and take characteristics (Table 2-1, p. 72)', () => {
    assert.deepEqual(find('pride', 'charm').characteristics, {fellowship: 5, toughness: -5});
    assert.deepEqual(find('pride', 'devotion').characteristics, {willpower: 5, strength: -5});
    assert.deepEqual(find('pride', 'fortitude').characteristics, {toughness: 5, agility: -3, intelligence: -3});
    assert.deepEqual(find('pride', 'craftsmanship').characteristics,
        {agility: 3, intelligence: 3, weaponSkill: -3, ballisticSkill: -3});
    assert.equal(find('pride', 'craftsmanship').grants.influence, 1, '+1 Infamy');
    assert.equal(find('pride', 'beauty').grants.influence, 2);
    assert.match(find('pride', 'wealth').rules.note, /Acquisition Test with a \+20/);
});

test('Infamy rides on the Influence characteristic, so +2 Infamy is +2 there', () => {
    assert.ok(CHARACTERISTIC_KEYS.includes('influence'));
    for (const key of ['deceit', 'destruction', 'hubris', 'waste'])
        assert.equal(find('disgrace', key).grants.influence, 2, key);
});

test('Disgraces bring Corruption, Wounds and the situational penalties (Table 2-2, p. 73)', () => {
    assert.equal(find('disgrace', 'betrayal').grants.corruption, 5);
    assert.match(find('disgrace', 'betrayal').rules.note, /-10 Situational Modifier to all Charm/);
    assert.equal(find('disgrace', 'greed').grants.corruption, 4);
    assert.match(find('disgrace', 'greed').rules.note, /Commerce/);
    assert.match(find('disgrace', 'regret').rules.note, /Haunted/);
    assert.equal(find('disgrace', 'gluttony').grants.wounds, 2);
    assert.deepEqual(find('disgrace', 'gluttony').characteristics, {agility: -5});
    assert.equal(find('disgrace', 'wrath').grants.wounds, -1, 'Wrath costs a Wound');
    assert.deepEqual(find('disgrace', 'wrath').characteristics, {perception: 5, willpower: -2});
});

test('Motivations mix Corruption, Wounds and characteristics (Table 2-3, p. 74)', () => {
    assert.equal(find('motivation', 'arcane').grants.corruption, 4);
    assert.deepEqual(find('motivation', 'arcane').characteristics, {intelligence: 2, strength: -3});
    assert.equal(find('motivation', 'ascendancy').grants.wounds, -2);
    assert.equal(find('motivation', 'dominion').grants.influence, 1);
    assert.equal(find('motivation', 'dominion').grants.wounds, -1);
    assert.equal(find('motivation', 'immortality').grants.wounds, 2);
    assert.equal(find('motivation', 'innovation').grants.corruption, 2);
    assert.equal(find('motivation', 'nihilism').grants.corruption, 5);
    assert.equal(find('motivation', 'violence').grants.corruption, 5);
});

test('Perfection is the one row the player aims himself (p. 74)', () => {
    const perfection = find('motivation', 'perfection');
    assert.deepEqual(perfection.characteristics, {});
    assert.equal(perfection.characteristicChoices.length, 2);
    const [up, down] = perfection.characteristicChoices;
    assert.deepEqual({pick: up.pick, value: up.value}, {pick: 1, value: 5});
    assert.deepEqual({pick: down.pick, value: down.value}, {pick: 2, value: -3});
    assert.equal(up.from.length, 9, 'Infamy is not on the list');
    assert.equal(up.from.includes('influence'), false);
});
