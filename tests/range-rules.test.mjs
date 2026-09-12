import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POINT_BLANK_BONUS, applyMeleeEngagement} from '../script/combat/range-rules.mjs';

const pointBlank = () => ({rangeMod: 30, rangeModText: 'Point Blank'});
const shortRange = () => ({rangeMod: 10, rangeModText: 'Short'});

test('the Point Blank bonus is the one on p. 231', () => {
    assert.equal(POINT_BLANK_BONUS, 30);
});

test('a pistol fired in melee loses the Point Blank bonus', () => {
    const got = applyMeleeEngagement(pointBlank(), true);
    assert.equal(got.rangeMod, 0);
    assert.equal(got.pointBlankDenied, true);
});

test('the range band is still reported, only the bonus goes', () => {
    // The target really is at Point Blank; saying otherwise would misreport
    // where it stands, and other rules read the band.
    assert.equal(applyMeleeEngagement(pointBlank(), true).rangeModText, 'Point Blank');
});

test('out of melee the bonus stands', () => {
    const got = applyMeleeEngagement(pointBlank(), false);
    assert.equal(got.rangeMod, 30);
    assert.equal(got.pointBlankDenied, false);
});

test('only the Point Blank bonus is affected', () => {
    // Short range is not mentioned by the rule, so it survives the melee.
    assert.equal(applyMeleeEngagement(shortRange(), true).rangeMod, 10);
    assert.equal(applyMeleeEngagement(shortRange(), true).pointBlankDenied, false);
});

test('a penalty is never turned into a bonus or erased', () => {
    assert.equal(applyMeleeEngagement({rangeMod: -10, rangeModText: 'Long'}, true).rangeMod, -10);
});

test('missing range data does not crash the attack', () => {
    assert.equal(applyMeleeEngagement(undefined, true).rangeMod, 0);
    assert.equal(applyMeleeEngagement({}, false).rangeMod, 0);
});

test('the rule reaches the attack and the card', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /applyMeleeEngagement/, 'the attack consults the rule');
    assert.match(source, /engagedInMelee/, 'and the dialog can say so');
    const card = readFileSync(new URL('../template/chat/roll.hbs', import.meta.url), 'utf8');
    assert.match(card, /pointBlankDenied/, 'the card explains the missing bonus');
});

test('the attack dialog asks whether the shooter is locked in melee', () => {
    const dialog = readFileSync(new URL('../template/dialog/combat-roll.hbs', import.meta.url), 'utf8');
    assert.match(dialog, /id="engagedInMelee"/);
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /rollData\.engagedInMelee = !!html\.find\("#engagedInMelee"\)/);
});

test('the question is only put for ranged weapons', () => {
    // A melee weapon has no Point Blank bonus to lose.
    const dialog = readFileSync(new URL('../template/dialog/combat-roll.hbs', import.meta.url), 'utf8');
    const ranged = dialog.slice(dialog.indexOf('{{#if weapon.isRange}}'));
    assert.ok(ranged.indexOf('id="engagedInMelee"') > -1);
    assert.ok(ranged.indexOf('id="engagedInMelee"') < ranged.indexOf('{{/if}}') + 2000);
});
