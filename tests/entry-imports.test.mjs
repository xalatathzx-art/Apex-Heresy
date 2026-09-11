import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// tests/helpers/system.mjs runs the entry module inside node:vm after stripping its import
// lines with a single-line regex. An import spread over two lines survives the strip, and the
// whole suite then fails with "Cannot use import statement outside a module" — which points at
// line 1 and says nothing about the real cause.
test('every import in the entry module fits on one line, or the test harness cannot strip it', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const lines = source.split(/\r?\n/);
    const unstripped = lines
        .map((line, index) => ({line, number: index + 1}))
        .filter(({line}) => /^\s*import\b/.test(line) && !/;\s*$/.test(line));
    assert.deepEqual(unstripped, [], 'these import statements span more than one line');
});

test('the harness strips the imports it is given', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const stripped = source.replace(/^import .*?;\r?\n/gm, '');
    assert.doesNotMatch(stripped, /^\s*import\b/m);
});
