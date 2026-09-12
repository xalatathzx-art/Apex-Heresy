import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const LANG = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('the English locale contains no Cyrillic', () => {
    // Jam and overheat alerts reached English tables in Russian. This keeps every
    // future string honest rather than fixing these four and waiting for the next.
    const offenders = Object.entries(LANG)
        .filter(([, value]) => /[Ѐ-ӿ]/.test(String(value)))
        .map(([key]) => key);
    assert.deepEqual(offenders, []);
});

test('the strings that were Russian now read in English', () => {
    assert.match(LANG['WEAPON.JAM'], /Jam/i);
    assert.match(LANG['WEAPON.OVERHEAT'], /Overheat/i);
    assert.match(LANG['WEAPON.SHOCK_STUNNED'], /Stunned/i);
    assert.match(LANG['WEAPON.SHOCK_EFFECTS_APPLIED'], /Fatigue/i);
});

test('their placeholders survive the translation', () => {
    assert.match(LANG['WEAPON.JAM'], /\{weapon\}/);
    assert.match(LANG['WEAPON.OVERHEAT'], /\{weapon\}/);
    assert.match(LANG['WEAPON.SHOCK_STUNNED'], /\{rounds\}/);
    assert.match(LANG['WEAPON.SHOCK_EFFECTS_APPLIED'], /\{actor\}/);
    assert.match(LANG['WEAPON.SHOCK_EFFECTS_APPLIED'], /\{rounds\}/);
});
