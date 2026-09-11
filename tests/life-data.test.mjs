import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMEANOURS, demeanourFor} from '../script/creation/life-data.mjs';

test('Table 3-21 covers every result of d100 in fifty rows (pp. 107-109)', () => {
    assert.equal(DEMEANOURS.length, 50);
    for (let roll = 1; roll <= 100; roll++) assert.ok(demeanourFor(roll), `no demeanour for ${roll}`);
    assert.equal(DEMEANOURS[0].min, 1);
    assert.equal(DEMEANOURS.at(-1).max, 100);
    for (const [index, entry] of DEMEANOURS.entries())
        if (index) assert.equal(entry.min, DEMEANOURS[index - 1].max + 1, entry.name);
});

test('the printed rows land where the book puts them', () => {
    assert.equal(demeanourFor(1), 'Addict');
    assert.equal(demeanourFor(8), 'Heroic');
    assert.equal(demeanourFor(50), 'Leech');
    assert.equal(demeanourFor(97), 'Twitchy');
    assert.equal(demeanourFor(100), 'Unlucky');
    assert.equal(demeanourFor(0), '');
});
