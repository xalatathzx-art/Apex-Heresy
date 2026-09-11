import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tableResultFlags} from '../tools/lib/table-effects.mjs';

test('a row with a mechanical effect carries it as a flag', () => {
    assert.deepEqual(tableResultFlags({effect: {characteristics: {perception: 5}}}),
        {'dark-heresy': {divinationEffect: {characteristics: {perception: 5}}}});
});

test('a row with nothing to apply carries no flags at all', () => {
    for (const row of [{}, {effect: {}}, {effect: null}, {effect: []}, {effect: 'text'}])
        assert.deepEqual(tableResultFlags(row), {}, JSON.stringify(row));
});

test('the flag does not share the row object, so a later edit cannot reach the pack', () => {
    const row = {effect: {fate: 1}};
    const flags = tableResultFlags(row);
    row.effect.fate = 99;
    assert.equal(flags['dark-heresy'].divinationEffect.fate, 1);
});

test('every divination row produces flags the wizard can read', () => {
    const table = JSON.parse(readFileSync(new URL('../packs-src/tables/divinations-dh2.json', import.meta.url), 'utf8'));
    const flagged = table.results.map(tableResultFlags).filter(f => Object.keys(f).length);
    assert.equal(flagged.length, 9, 'nine rows apply a flat modifier; the rest are the player’s call');
    for (const flag of flagged) assert.ok(flag['dark-heresy'].divinationEffect);
});
