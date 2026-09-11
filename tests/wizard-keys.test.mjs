import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTERISTIC_KEYS} from '../script/creation/origin-data.mjs';
import {CHARACTERISTIC_METHODS} from '../script/creation/creation-roll-data.mjs';
import {RULESET_DEFS, stepsFor} from '../script/creation/ruleset-data.mjs';

// The wizard imports foundry.applications.api at module scope, so it cannot be imported here
// and its behaviour has no unit coverage. What can be checked without a world is that every
// name it asks the localiser for actually exists — a missing key shows as raw dotted text in
// the window, which is the most likely way this breaks unnoticed.
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

const staticKeys = source => new Set([
    ...[...source.matchAll(/(?:localize|format)\(\s*"([A-Z][A-Z0-9_.]+)"/g)].map(m => m[1]),
    ...[...source.matchAll(/localize\s+"([A-Z][A-Z0-9_.]+)"/g)].map(m => m[1])
]);

test('every key the wizard template names exists', () => {
    const missing = [...staticKeys(read('../template/apps/character-wizard.hbs'))].filter(k => !(k in lang));
    assert.deepEqual(missing, []);
});

test('every key the wizard module names exists', () => {
    const missing = [...staticKeys(read('../script/creation/wizard.mjs'))].filter(k => !(k in lang));
    assert.deepEqual(missing, []);
});

test('every key the origin sheet names exists', () => {
    const missing = [...staticKeys(read('../template/sheet/origin.hbs'))].filter(k => !(k in lang));
    assert.deepEqual(missing, []);
});

test('the keys the wizard builds at runtime exist for every value they are built from', () => {
    // `CHARACTERISTIC.${key}` — one row per characteristic in the generation step.
    for (const key of CHARACTERISTIC_KEYS) {
        const name = `CHARACTERISTIC.${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        assert.ok(name in lang, name);
    }
    // `WIZARD.METHOD.${method}` — one option per generation method.
    for (const method of CHARACTERISTIC_METHODS) assert.ok(`WIZARD.METHOD.${method.toUpperCase()}` in lang, method);
});

test('every ruleset and step label the wizard renders exists', () => {
    for (const [key, def] of Object.entries(RULESET_DEFS)) {
        assert.ok(def.label in lang, `${key}: ${def.label}`);
        for (const step of stepsFor(key)) assert.ok(step.label in lang, `${key}/${step.id}: ${step.label}`);
    }
});

test('the origin stage vocabulary in the system config resolves', () => {
    const script = read('../script/dark-heresy.js');
    const block = /Dh\.originStages = \{([\s\S]*?)\n\};/.exec(script);
    assert.ok(block, 'Dh.originStages not found');
    const keys = [...block[1].matchAll(/"([A-Z][A-Z0-9_.]+)"/g)].map(m => m[1]);
    assert.ok(keys.length >= 21, `found only ${keys.length} stages`);
    assert.deepEqual(keys.filter(k => !(k in lang)), []);
});
