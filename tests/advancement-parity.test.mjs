import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';
import {CHARACTERISTIC_LEVELS, SKILL_LEVELS, CHARACTERISTIC_COSTS, SKILL_COSTS, TALENT_COSTS}
    from '../script/creation/advancement-data.mjs';

// The system computes spent experience from its own tables (Dh.characteristicCosts,
// Dh.talentCosts and an inline skill formula). The wizard quotes and charges prices from
// advancement-data.mjs. If the two ever disagree, the wizard shows one price and the sheet
// charges another - so they are pinned to each other here, not just to the book.
const system = loadSystem();

test('characteristic prices agree with the system table', () => {
    const table = system.get('Dh.characteristicCosts');
    // Row 0 is the free starting value; rows 1..5 are Simple..Expert, columns [two, one, none].
    CHARACTERISTIC_LEVELS.forEach((level, index) => {
        const row = table[index + 1];
        assert.deepEqual([CHARACTERISTIC_COSTS[2][level], CHARACTERISTIC_COSTS[1][level], CHARACTERISTIC_COSTS[0][level]],
            [...row], level);
    });
});

test('talent prices agree with the system table', () => {
    const table = system.get('Dh.talentCosts');
    [1, 2, 3].forEach(tier => {
        assert.deepEqual([TALENT_COSTS[2][tier], TALENT_COSTS[1][tier], TALENT_COSTS[0][tier]],
            [...table[tier - 1]], `tier ${tier}`);
    });
});

test('skill prices agree with the formula the system charges by', () => {
    // _computeExperience_auto: a rank at index i costs (i + 1) * (3 - matched) * 100.
    SKILL_LEVELS.forEach((level, i) => {
        for (const matched of [0, 1, 2])
            assert.equal(SKILL_COSTS[matched][level], (i + 1) * (3 - matched) * 100, `${level} with ${matched}`);
    });
});
