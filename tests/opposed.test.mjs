import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveOpposed} from '../script/combat/opposed.mjs';

const side = (over = {}) => ({success: true, degrees: 1, bonus: 3, roll: 50, ...over});

test('whoever succeeds alone wins', () => {
    assert.equal(resolveOpposed(side(), side({success: false})).winner, 'a');
    assert.equal(resolveOpposed(side({success: false}), side()).winner, 'b');
});

test('a lone success is worth at least one, even with no degrees', () => {
    assert.equal(resolveOpposed(side({degrees: 0}), side({success: false})).margin, 1);
});

test('when both succeed, the most degrees wins', () => {
    const got = resolveOpposed(side({degrees: 4}), side({degrees: 2}));
    assert.equal(got.winner, 'a');
    assert.equal(got.margin, 2);
    assert.equal(got.reason, 'degrees');
});

test('a tie on degrees goes to the higher characteristic bonus', () => {
    const got = resolveOpposed(side({degrees: 2, bonus: 5}), side({degrees: 2, bonus: 3}));
    assert.equal(got.winner, 'a');
    assert.equal(got.reason, 'bonus');
});

test('a tie on bonus goes to the lower die roll', () => {
    // p. 25: "If there is still a tie, then the lowest die roll wins."
    const got = resolveOpposed(side({degrees: 2, bonus: 4, roll: 12}),
                               side({degrees: 2, bonus: 4, roll: 44}));
    assert.equal(got.winner, 'a');
    assert.equal(got.reason, 'roll');
});

test('both failing is a stalemate, which the book leaves to the table', () => {
    // The alternative the book offers is re-rolling until someone wins; that is
    // the GM's call, and the system does not get to make it for them.
    const got = resolveOpposed(side({success: false}), side({success: false}));
    assert.equal(got.winner, null);
    assert.equal(got.reason, 'stalemate');
});

test('an exact tie all the way down is a stalemate too', () => {
    assert.equal(resolveOpposed(side(), side()).winner, null);
});

test('missing sides do not crash the contest', () => {
    assert.equal(resolveOpposed(null, null).winner, null);
    assert.equal(resolveOpposed(side(), undefined).winner, 'a');
});
