import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONTROLLER_OPTIONS, TARGET_OPTIONS, UNARMED_DAMAGE, PRONE_GRAPPLE_BONUS,
        grappleOutcome, optionsFor} from '../script/combat/grapple.mjs';

test('both sides get the options the book gives them', () => {
    assert.deepEqual(CONTROLLER_OPTIONS.map(o => o.id), ['damage', 'throwDown', 'push']);
    assert.deepEqual(TARGET_OPTIONS.map(o => o.id), ['breakFree', 'slipFree', 'takeControl']);
    assert.equal(optionsFor('controller'), CONTROLLER_OPTIONS);
    assert.equal(optionsFor('target'), TARGET_OPTIONS);
});

test('slipping free is Acrobatics, everything else is Strength', () => {
    // p. 223: "Slip Free ... by making a Challenging (+0) Acrobatics test."
    const all = [...CONTROLLER_OPTIONS, ...TARGET_OPTIONS];
    for (const option of all)
        assert.equal(option.test, option.id === 'slipFree' ? 'acrobatics' : 'strength', option.id);
});

test('losing the contest achieves nothing at all', () => {
    for (const option of ['damage', 'throwDown', 'push', 'breakFree', 'slipFree', 'takeControl']) {
        const got = grappleOutcome({option, won: false, degrees: 4, halfMove: 6});
        assert.deepEqual({...got}, {freed: false, prone: false, controlSwapped: false,
            damage: false, fatigue: 0, metres: 0, proneBonus: 0, endsGrapple: false}, option);
    }
});

test('damaging an opponent deals unarmed damage and a level of Fatigue', () => {
    const got = grappleOutcome({option: 'damage', won: true});
    assert.equal(got.damage, true);
    assert.equal(got.fatigue, 1);
    assert.equal(UNARMED_DAMAGE, '1d5-3');
});

test('throwing an opponent down leaves them Prone and worsens their position', () => {
    const got = grappleOutcome({option: 'throwDown', won: true});
    assert.equal(got.prone, true);
    assert.equal(got.proneBonus, PRONE_GRAPPLE_BONUS);
    assert.equal(PRONE_GRAPPLE_BONUS, 10);
});

test('a push travels a metre plus one per degree', () => {
    assert.equal(grappleOutcome({option: 'push', won: true, degrees: 0, halfMove: 10}).metres, 1);
    assert.equal(grappleOutcome({option: 'push', won: true, degrees: 3, halfMove: 10}).metres, 4);
});

test('a push cannot exceed the pusher’s Half Move', () => {
    assert.equal(grappleOutcome({option: 'push', won: true, degrees: 9, halfMove: 4}).metres, 4);
});

test('breaking or slipping free ends the grapple', () => {
    for (const option of ['breakFree', 'slipFree']) {
        const got = grappleOutcome({option, won: true});
        assert.equal(got.freed, true, option);
        assert.equal(got.endsGrapple, true, option);
    }
});

test('taking control swaps the roles without ending the grapple', () => {
    const got = grappleOutcome({option: 'takeControl', won: true});
    assert.equal(got.controlSwapped, true);
    assert.equal(got.endsGrapple, false, 'the grapple continues, the other way round');
    assert.equal(got.freed, false);
});

test('an unknown option does nothing rather than guessing', () => {
    assert.equal(grappleOutcome({option: 'headbutt', won: true}).damage, false);
});

// ── Reaching the table ────────────────────────────────────────────────────

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const combatTab = readFileSync(new URL('../template/sheet/actor/tab/combat.hbs', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('the sheet offers the grapple action', () => {
    assert.match(combatTab, /class="grapple-test"/);
    assert.match(source, /\.grapple-test"\)\.click/);
    assert.match(source, /async _onGrappleTest\(event\)/);
});

test('which side you are on is deduced from the condition', () => {
    const fn = source.slice(source.indexOf('async _onGrappleTest(event)'));
    const body = fn.slice(0, fn.indexOf('\n    }'));
    assert.match(body, /hasCondition\?\.\("grappled"\)/);
    assert.match(body, /optionsFor\(side\)/);
});

test('it needs someone to grapple with', () => {
    const fn = source.slice(source.indexOf('async _onGrappleTest(event)'));
    assert.match(fn.slice(0, fn.indexOf('\n    }')), /GRAPPLE\.NO_OPPONENT/);
});

test('the Strength contests go through the opposed rule, not a bare comparison', () => {
    const fn = source.slice(source.indexOf('async function _resolveGrapple'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /resolveOpposed\(mine, theirs\)/);
    assert.match(body, /_contestRoll\(actor, "strength"\)/);
    assert.match(body, /_contestRoll\(opponent, "strength"\)/);
});

test('Slip Free is tested against Acrobatics and nobody else', () => {
    const fn = source.slice(source.indexOf('async function _resolveGrapple'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /chosen\.test === "acrobatics"/);
    assert.match(body, /skills\?\.acrobatics/);
});

test('the outcomes are carried out, not merely announced', () => {
    const fn = source.slice(source.indexOf('async function _resolveGrapple'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /applyDamage/, 'damage lands');
    assert.match(body, /system\.fatigue\.value/, 'the level of Fatigue lands');
    assert.match(body, /addCondition\("prone"/, 'a thrown opponent goes down');
    assert.match(body, /removeCondition\?\.\("grappled"\)/, 'and breaking free really frees');
});

test('the push is limited by the pusher’s Half Move', () => {
    const fn = source.slice(source.indexOf('async function _resolveGrapple'));
    assert.match(fn.slice(0, fn.indexOf('\n}')), /halfMove: Number\(actor\.system\?\.movement\?\.half\)/);
});

test('every option and message has a string', () => {
    for (const option of [...CONTROLLER_OPTIONS, ...TARGET_OPTIONS])
        assert.ok(lang[option.label], option.id);
    for (const key of ['GRAPPLE.TITLE', 'GRAPPLE.PROMPT', 'GRAPPLE.NO_OPPONENT',
                       'GRAPPLE.HINT_CONTROLLER', 'GRAPPLE.HINT_TARGET', 'GRAPPLE.DEALT',
                       'GRAPPLE.PUSHED', 'GRAPPLE.CONTROL_TAKEN', 'GRAPPLE.PRONE_BONUS', 'GRAPPLE.HELD'])
        assert.ok(lang[key], key);
});
