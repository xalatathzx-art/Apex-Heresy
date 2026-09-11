import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERISTIC_METHODS, rollExpression, POINT_BUY, pointBuyProblems,
        woundsExpression, fateExpression} from '../script/creation/creation-roll-data.mjs';
import {CHARACTERISTIC_KEYS} from '../script/creation/origin-data.mjs';

const even = Object.fromEntries(CHARACTERISTIC_KEYS.map(key => [key, 31]));

test('the three book methods are offered', () => {
    assert.deepEqual(CHARACTERISTIC_METHODS, ['roll', 'rollModified', 'pointBuy']);
});

test('plain rolling adds the modifier to a flat 2d10+20', () => {
    assert.equal(rollExpression('roll', 0), '2d10+20');
    assert.equal(rollExpression('roll', 5), '2d10+20+5');
    assert.equal(rollExpression('roll', -5), '2d10+20-5');
});

test('modified rolling keeps two of three dice instead of adding the modifier', () => {
    assert.equal(rollExpression('rollModified', 0), '2d10+20');
    assert.equal(rollExpression('rollModified', 5), '3d10kh2+20');
    assert.equal(rollExpression('rollModified', -5), '3d10kl2+20');
});

test('an unknown method rolls plainly rather than producing nothing', () => {
    assert.equal(rollExpression('pointBuy', 5), '2d10+20+5');
});

test('point buy enforces the budget and the cap', () => {
    assert.deepEqual(POINT_BUY, {base: 25, points: 60, cap: 40});
    assert.deepEqual(pointBuyProblems(even), []);
    assert.match(pointBuyProblems({...even, strength: 32})[0], /61|budget/i);
    // The cap and the base are reported per characteristic, in key order, before the budget.
    assert.match(pointBuyProblems({...even, strength: 41})[0], /40|cap/i);
    assert.match(pointBuyProblems({...even, weaponSkill: 24})[0], /25|below/i);
});

test('a characteristic with no value is reported rather than counted as zero', () => {
    const missing = {...even};
    delete missing.fellowship;
    assert.match(pointBuyProblems(missing).join(' '), /fellowship/);
});

test('spending less than the budget is allowed', () => {
    assert.deepEqual(pointBuyProblems(Object.fromEntries(CHARACTERISTIC_KEYS.map(k => [k, 25]))), []);
});

test('wounds combine the book formula, a flat bonus and doubled toughness bonus', () => {
    assert.equal(woundsExpression({formula: '9+1d5', bonus: 0, doubleToughnessBonus: false}, 4), '9+1d5');
    assert.equal(woundsExpression({formula: '1d5+1', bonus: 0, doubleToughnessBonus: true}, 4), '8+1d5+1');
    assert.equal(woundsExpression({formula: '8+1d5', bonus: -1, doubleToughnessBonus: false}, 3), '8+1d5-1');
});

test('an origin that says nothing about wounds contributes nothing', () => {
    assert.equal(woundsExpression({}, 4), '0');
});

test('fate is a flat value unless the book rolls for it', () => {
    assert.equal(fateExpression({value: 2, blessing: 3, formula: ''}), '2');
    assert.equal(fateExpression({value: 0, blessing: 0, formula: '1d10'}), '1d10');
    assert.equal(fateExpression({}), '0');
});
