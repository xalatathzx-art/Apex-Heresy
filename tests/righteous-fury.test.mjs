import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRITICAL, EXTRA_DAMAGE, MAX_CHAIN, confirmationHits,
        explodes, extraDamage, righteousFuryMode} from '../script/combat/righteous-fury.mjs';

test('a book that has not been read keeps the Dark Heresy reading', () => {
    assert.equal(righteousFuryMode(undefined), CRITICAL);
    assert.equal(righteousFuryMode({label: 'CHAT.RIGHTEOUS_FURY'}), CRITICAL);
    assert.equal(righteousFuryMode({mode: 'nonsense'}), CRITICAL);
});

test('Rogue Trader adds damage where Dark Heresy adds a critical', () => {
    assert.equal(righteousFuryMode({mode: EXTRA_DAMAGE}), EXTRA_DAMAGE);
});

test('the confirming attack is the same attack, so the same target', () => {
    assert.equal(confirmationHits(22, 25), true, 'the book’s own example, p. 245');
    assert.equal(confirmationHits(25, 25), true, 'equal to the target is a hit');
    assert.equal(confirmationHits(26, 25), false);
});

test('an attack that never rolled to hit confirms automatically', () => {
    // "If the original attack did not have an associated attack roll, the
    // attacker is considered to automatically succeed at the second roll."
    for (const target of [null, undefined, NaN, 'nothing'])
        assert.equal(confirmationHits(97, target), true, String(target));
    // But a target of zero is a real target that cannot be hit, not a missing one.
    assert.equal(confirmationHits(1, 0), false);
});

test('a natural ten keeps the fury going, nothing else does', () => {
    assert.equal(explodes(10), true);
    assert.equal(explodes(9), false);
    assert.equal(explodes(1), false);
});

test('the additional dice are added to the damage total', () => {
    // The book's example: a 4 on the additional die adds 4.
    assert.equal(extraDamage([4]), 4);
    assert.equal(extraDamage([10, 10, 3]), 23);
    assert.equal(extraDamage([]), 0);
});

test('one hit means one fury, however many tens it rolled', () => {
    // "if ANY die rolled results in a natural 10 ... this calls for a second
    // attack roll" — one event per attack, not one per die. Two tens on a burst
    // of damage dice must not buy two confirmations and two chains.
    const fn = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const body = fn.slice(fn.indexOf('async function _resolveRighteousFuryDamage'));
    assert.match(body.slice(0, body.indexOf('\n}')),
        /if \(damage\.righteousFuryExtra !== undefined\) return;/);
});

// ── Reaching the table ────────────────────────────────────────────────────

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('only Rogue Trader is given the second reading', () => {
    const at = source.indexOf('Dh.rulesets.rt = {');
    const body = source.slice(at, source.indexOf('};', at));
    assert.match(body, /righteousFury:[^\n]*mode: EXTRA_DAMAGE/);
    // And the books that were already right are not touched.
    for (const book of ['Dh.rulesets.dw = {']) {
        const other = source.slice(source.indexOf(book), source.indexOf(book) + 2000);
        assert.doesNotMatch(other, /mode: EXTRA_DAMAGE/, book);
    }
});

test('the damage roll asks the book before it rolls anything', () => {
    const fn = source.slice(source.indexOf('async function _computeDamage('));
    // The attack is what says which book, so it has to reach the function. It was
    // left off the signature once and nothing here noticed: every check below reads
    // the body, and the body looked right while the name it used was undeclared.
    // Only firing the weapon in the running application showed it.
    assert.match(fn.slice(0, fn.indexOf('{')), /rollData = null\)/);
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /righteousFuryMode\(/);
    assert.match(body, /EXTRA_DAMAGE/);
    assert.match(body, /_rollRighteousFury\(\)/, 'the other books still get their 1d5');
});

test('every damage roll hands the attack over, the first hit and the rest', () => {
    const calls = source.match(/_computeDamage\(\r?\n[\s\S]*?\r?\n\s*\);/g) ?? [];
    assert.equal(calls.length, 2, 'the first hit and the additional hits');
    for (const call of calls) assert.match(call, /rollData\r?\n\s*\);/);
});

test('the confirming roll is made against the attack’s own target', () => {
    const fn = source.slice(source.indexOf('async function _resolveRighteousFuryDamage'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /rollData\?\.target\?\.final/);
    assert.match(body, /confirmationHits\(/);
});

test('the chain of tens is rolled out, and cannot run away', () => {
    const fn = source.slice(source.indexOf('async function _resolveRighteousFuryDamage'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /explodes\(/);
    assert.match(body, /MAX_CHAIN/);
});

test('the added damage lands on the total the target actually takes', () => {
    const fn = source.slice(source.indexOf('async function _resolveRighteousFuryDamage'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /damage\.total \+= /);
});

test('the card says what happened, in English', () => {
    for (const key of ['CHAT.RIGHTEOUS_FURY_CONFIRMED', 'CHAT.RIGHTEOUS_FURY_MISSED',
                       'CHAT.RIGHTEOUS_FURY_EXTRA'])
        assert.ok(lang[key], key);
    const card = readFileSync(new URL('../template/chat/damage.hbs', import.meta.url), 'utf8');
    assert.match(card, /damage\.righteousFuryExtra/);
});
