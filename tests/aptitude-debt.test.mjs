import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERISTIC_APTITUDES, owedAptitudes, replacementOptions} from '../script/creation/aptitude-debt.mjs';
import {APTITUDES} from '../script/creation/origin-data.mjs';

test('the characteristic aptitudes are the nine named after a characteristic (p. 80)', () => {
    assert.deepEqual(CHARACTERISTIC_APTITUDES, ['Weapon Skill', 'Ballistic Skill', 'Strength', 'Toughness',
        'Agility', 'Intelligence', 'Perception', 'Willpower', 'Fellowship']);
    for (const name of CHARACTERISTIC_APTITUDES) assert.ok(APTITUDES.includes(name), name);
});

test('each duplicate is owed once until it is replaced', () => {
    const records = [
        {source: 'role', duplicateAptitudes: ['Willpower', 'Knowledge'], replacedAptitudes: [{duplicate: 'Willpower', chosen: 'Agility'}]},
        {source: 'elite', duplicateAptitudes: ['Psyker']},
        {source: 'home', duplicateAptitudes: []}
    ];
    assert.deepEqual(owedAptitudes(records), [{source: 'role', duplicate: 'Knowledge'}, {source: 'elite', duplicate: 'Psyker'}]);
    assert.deepEqual(owedAptitudes([]), []);
});

test('the same aptitude duplicated twice is owed twice', () => {
    const records = [{source: 'a', duplicateAptitudes: ['Defence', 'Defence'], replacedAptitudes: [{duplicate: 'Defence', chosen: 'Strength'}]}];
    assert.deepEqual(owedAptitudes(records), [{source: 'a', duplicate: 'Defence'}]);
});

test('a replacement must be a characteristic aptitude the character does not have', () => {
    const owned = new Set(['General', 'Willpower', 'Agility', 'Knowledge']);
    assert.deepEqual(replacementOptions(owned),
        ['Weapon Skill', 'Ballistic Skill', 'Strength', 'Toughness', 'Intelligence', 'Perception', 'Fellowship']);
});
