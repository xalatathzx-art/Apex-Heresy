import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../template/chat/evasion.hbs', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('an evasion names every modifier that shaped it', () => {
    // The report: "No way to see what modifers are present in a PC evasion
    // attempt." The card showed one bare number.
    const block = source.slice(source.indexOf('const evasionSources = []'));
    const body = block.slice(0, block.indexOf('rollData.target.final'));
    assert.match(body, /CHAT\.TEST_MODIFIER/, 'the manual modifier');
    assert.match(body, /DIALOG\.DIFFICULTY/, 'the difficulty');
    assert.match(body, /actorConditionSources/, 'the conditions, already named elsewhere');
    assert.match(body, /WEAPON\.TRAIT\.UNBALANCED/, 'the parry penalty');
});

test('the two ways an evasion can be refused outright are named', () => {
    const block = source.slice(source.indexOf('const evasionSources = []'));
    const body = block.slice(0, block.indexOf('rollData.target.final'));
    assert.match(body, /parryBlocked/, 'a flexible weapon cannot be parried');
    assert.match(body, /evasionBlocked/, 'and a grappled character gets no reaction');
});

test('a zero modifier is not listed as though it did something', () => {
    const block = source.slice(source.indexOf('const noteEvasion'));
    assert.match(block.slice(0, block.indexOf('};')), /if \(!value\) return;/);
});

test('the card prints the breakdown, and the bare number only without one', () => {
    assert.match(card, /\{\{#if evasionSources\}\}/);
    assert.match(card, /\{\{evasionSources\}\}/);
    assert.match(card, /\{\{else if target\.modifier\}\}/);
});

test('the strings it needs exist', () => {
    for (const key of ['CHAT.EVASION_MODIFIERS', 'WEAPON.TRAIT.UNBALANCED',
                       'WEAPON.FLEXIBLE_NO_PARRY_SHORT', 'CONDITION.GRAPPLED'])
        assert.ok(lang[key], key);
});
