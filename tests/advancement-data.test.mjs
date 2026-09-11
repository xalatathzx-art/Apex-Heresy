import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERISTIC_LEVELS, SKILL_LEVELS, CHARACTERISTIC_COSTS, SKILL_COSTS, TALENT_COSTS,
        matchingAptitudes, advanceCost, cumulativeCost} from '../script/creation/advancement-data.mjs';

test('the characteristic table matches the book', () => {
    // Dark Heresy p. 80, Table 2-2.
    assert.deepEqual(CHARACTERISTIC_LEVELS, ['simple', 'intermediate', 'trained', 'proficient', 'expert']);
    assert.deepEqual(Object.values(CHARACTERISTIC_COSTS[2]), [100, 250, 500, 750, 1250]);
    assert.deepEqual(Object.values(CHARACTERISTIC_COSTS[1]), [250, 500, 750, 1000, 1500]);
    assert.deepEqual(Object.values(CHARACTERISTIC_COSTS[0]), [500, 750, 1000, 1500, 2500]);
});

test('the skill table matches the book', () => {
    // p. 80, Table 2-4.
    assert.deepEqual(SKILL_LEVELS, ['known', 'trained', 'experienced', 'veteran']);
    assert.deepEqual(Object.values(SKILL_COSTS[2]), [100, 200, 300, 400]);
    assert.deepEqual(Object.values(SKILL_COSTS[1]), [200, 400, 600, 800]);
    assert.deepEqual(Object.values(SKILL_COSTS[0]), [300, 600, 900, 1200]);
});

test('the talent table matches the book', () => {
    // p. 81, Table 2-6.
    assert.deepEqual(Object.values(TALENT_COSTS[2]), [200, 300, 400]);
    assert.deepEqual(Object.values(TALENT_COSTS[1]), [300, 450, 600]);
    assert.deepEqual(Object.values(TALENT_COSTS[0]), [600, 900, 1200]);
});

test('fewer matching aptitudes never costs less', () => {
    for (const table of [CHARACTERISTIC_COSTS, SKILL_COSTS, TALENT_COSTS])
        for (const level of Object.keys(table[2]))
            assert.ok(table[2][level] <= table[1][level] && table[1][level] <= table[0][level], level);
});

test('matching counts the aptitudes the character actually has, and never exceeds two', () => {
    const owned = {Toughness: true, Knowledge: true, General: true};
    assert.equal(matchingAptitudes(owned, ['Toughness', 'Knowledge']), 2);
    assert.equal(matchingAptitudes(owned, ['Toughness', 'Offence']), 1);
    assert.equal(matchingAptitudes(owned, ['Offence', 'Finesse']), 0);
    assert.equal(matchingAptitudes(['Toughness'], ['Toughness']), 1);
    // A repeated aptitude on the advance is still one match, not two.
    assert.equal(matchingAptitudes(owned, ['Toughness', 'Toughness']), 1);
    assert.equal(matchingAptitudes(owned, ['Toughness', 'Knowledge', 'General']), 2);
    assert.equal(matchingAptitudes({}, ['Toughness']), 0);
    // ownedAptitudes() hands over a Set, whose Object.keys is empty.
    assert.equal(matchingAptitudes(new Set(['Toughness', 'Knowledge']), ['Toughness', 'Knowledge']), 2);
});

test('a single advance costs what its row says', () => {
    assert.equal(advanceCost('characteristic', 'simple', 2), 100);
    assert.equal(advanceCost('skill', 'veteran', 0), 1200);
    assert.equal(advanceCost('talent', 2, 1), 450);
    assert.equal(advanceCost('talent', 4, 2), null);
    assert.equal(advanceCost('psychic', 'simple', 2), null);
});

test('costs accumulate because the levels must be taken in turn', () => {
    // p. 80: "a player could not simply pay 500 xp for a +10 increase... buy Simple for 250
    // first, and then pay the 500 for Intermediate."
    assert.equal(cumulativeCost('characteristic', null, 'intermediate', 1), 250 + 500);
    assert.equal(cumulativeCost('characteristic', 'simple', 'intermediate', 1), 500);
    assert.equal(cumulativeCost('skill', null, 'veteran', 2), 100 + 200 + 300 + 400);
    assert.equal(cumulativeCost('skill', 'known', 'trained', 2), 200);
});

test('a level already reached, or one going backwards, has no cost to quote', () => {
    assert.equal(cumulativeCost('skill', 'trained', 'known', 2), null);
    assert.equal(cumulativeCost('skill', 'veteran', 'veteran', 2), null);
    assert.equal(cumulativeCost('skill', null, 'legendary', 2), null);
    assert.equal(cumulativeCost('talent', null, 1, 2), null, 'talents have no ladder to climb');
});
