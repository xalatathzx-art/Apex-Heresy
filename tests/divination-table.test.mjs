import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTERISTIC_KEYS} from '../script/creation/origin-data.mjs';

const table = JSON.parse(readFileSync(new URL('../packs-src/tables/divinations-dh2.json', import.meta.url), 'utf8'));

test('the divination table is a d100 roll that cites the book', () => {
    assert.equal(table.name, 'Divinations');
    assert.equal(table.formula, '1d100');
    assert.match(table.description, /Table 2-9/);
});

test('the rows cover 1 to 100 with no gap and no overlap', () => {
    const seen = new Set();
    for (const row of table.results) {
        const [from, to] = row.range;
        assert.ok(from >= 1 && to <= 100 && from <= to, `bad range ${from}-${to}`);
        for (let roll = from; roll <= to; roll++) {
            assert.ok(!seen.has(roll), `${roll} appears twice`);
            seen.add(roll);
        }
    }
    assert.equal(seen.size, 100);
});

test('every row carries a prophecy and the book text of its effect', () => {
    for (const row of table.results) {
        assert.ok(row.name, `a row has no prophecy`);
        assert.ok(row.text, `${row.name} has no effect text`);
        assert.ok(row.effect, `${row.name} has no effect field`);
    }
});

test('an effect only uses shapes the wizard knows how to apply', () => {
    const allowed = new Set(['characteristics', 'fate', 'wounds', 'insanity', 'corruption']);
    for (const row of table.results) {
        for (const key of Object.keys(row.effect)) assert.ok(allowed.has(key), `${row.name}: ${key}`);
        for (const key of Object.keys(row.effect.characteristics ?? {})) {
            assert.ok(CHARACTERISTIC_KEYS.includes(key), `${row.name}: ${key}`);
            assert.equal(typeof row.effect.characteristics[key], 'number');
        }
    }
});

test('a row whose outcome depends on what the character already has applies nothing automatically', () => {
    // "gains the Jaded talent. If he already possesses this talent, increase his Willpower
    // instead" cannot be resolved from the table alone, so it stays the player's call.
    const conditional = table.results.filter(row => /If he already/i.test(row.text));
    assert.ok(conditional.length > 0);
    for (const row of conditional) assert.deepEqual(row.effect, {}, row.name);
});

test('a row offering a choice of characteristic applies nothing automatically', () => {
    const choices = table.results.filter(row => / or .*characteristic/i.test(row.text));
    assert.ok(choices.length > 0);
    for (const row of choices) assert.deepEqual(row.effect, {}, row.name);
});

test('the flat modifiers match the book', () => {
    const byRoll = roll => table.results.find(row => roll >= row.range[0] && roll <= row.range[1]);
    assert.deepEqual(byRoll(3).effect, {characteristics: {perception: 5}});
    assert.deepEqual(byRoll(11).effect, {characteristics: {agility: -3}});
    assert.deepEqual(byRoll(27).effect, {characteristics: {perception: 3}});
    assert.deepEqual(byRoll(31).effect, {characteristics: {intelligence: -3}});
    assert.deepEqual(byRoll(61).effect, {characteristics: {perception: -3}});
    assert.deepEqual(byRoll(65).effect, {characteristics: {willpower: 3}});
    assert.deepEqual(byRoll(70).effect, {characteristics: {perception: 2}});
    assert.deepEqual(byRoll(73).effect, {characteristics: {toughness: -3}});
    assert.deepEqual(byRoll(100).effect, {fate: 1});
});

test('the rows the PDF interleaved are paired with the right prophecy', () => {
    // The text layer emits the effect column out of order where a row is tall. These four
    // pairings were settled by comparing bounding boxes, not by reading order.
    const byRoll = roll => table.results.find(row => roll >= row.range[0] && roll <= row.range[1]);
    assert.match(byRoll(7).text, /Jaded/);                       // 06-09 Humans must die...
    assert.match(byRoll(11).text, /Critical damage/);            // 10-13 The pain of the bullet...
    assert.match(byRoll(15).text, /Hatred/);                     // 14-17 Be a boon to your allies...
    assert.match(byRoll(61).text, /reduces that amount by 1/);   // 60-63 Ignorance is a wisdom...
    assert.match(byRoll(65).text, /plus 1 instead/);             // 64-67 Only the insane...
    assert.match(byRoll(73).text, /\+20 bonus/);                 // 72-75 Suffering is an instructor
    assert.match(byRoll(77).text, /Resistance/);                 // 76-79 The only true fear...
});
