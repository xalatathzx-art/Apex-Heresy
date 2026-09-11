import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const raw = readFileSync(new URL('../lang/en.json', import.meta.url));

test('the language file is plain UTF-8 JSON with no byte order mark', () => {
    assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'a BOM stops Foundry parsing it');
    JSON.parse(raw.toString('utf8'));
});

test('no key is also the parent path of another key', () => {
    // Foundry expands dotted keys into a nested object. If "WIZARD.METHOD" holds a string and
    // "WIZARD.METHOD.ROLL" also exists, the expansion tries to set a property on that string,
    // and the system's ENTIRE translation set is discarded - every label in every sheet falls
    // back to its raw key. Nothing else in the system reports this.
    const keys = Object.keys(JSON.parse(raw.toString('utf8')));
    const collisions = [];
    for (const key of keys)
        for (const other of keys)
            if (other !== key && other.startsWith(`${key}.`)) collisions.push(`"${key}" is a parent of "${other}"`);
    assert.deepEqual([...new Set(collisions)], []);
});

test('no key is defined twice', () => {
    const seen = new Set(), duplicates = [];
    for (const [, key] of raw.toString('utf8').matchAll(/^\s*"([^"]+)"\s*:/gm)) {
        if (seen.has(key)) duplicates.push(key);
        seen.add(key);
    }
    assert.deepEqual(duplicates, []);
});
