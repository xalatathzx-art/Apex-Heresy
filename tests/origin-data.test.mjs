import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULESETS, STAGES, CHARACTERISTIC_KEYS, SKILL_KEYS,
        normaliseOrigin, validateOrigin} from '../script/creation/origin-data.mjs';

const base = {ruleset: 'dh2', stage: 'homeWorld', key: 'feralWorld', order: 1};

test('every ruleset declares an ordered stage list', () => {
    assert.deepEqual(RULESETS, ['dh2', 'rt', 'ow', 'bc', 'dw']);
    for (const ruleset of RULESETS) assert.ok(STAGES[ruleset].length > 0, ruleset);
    assert.deepEqual(STAGES.dh2, ['homeWorld', 'background', 'role', 'divination']);
});

test('normalising fills empty defaults without dropping authored content', () => {
    const filled = normaliseOrigin({...base, characteristics: {strength: 5}, note: 'keep me'});
    assert.deepEqual(filled.characteristics, {strength: 5});
    assert.deepEqual(filled.grants.talents, []);
    assert.deepEqual(filled.choices, []);
    assert.equal(filled.wounds.formula, '');
    assert.equal(filled.note, 'keep me');
});

test('normalising returns independent objects', () => {
    const one = normaliseOrigin({...base}), two = normaliseOrigin({...base});
    one.grants.talents.push({name: 'Nerves of Steel'});
    assert.deepEqual(two.grants.talents, []);
});

test('unknown ruleset, stage, characteristic and skill keys are reported', () => {
    assert.deepEqual(validateOrigin(base), []);
    assert.match(validateOrigin({...base, ruleset: 'dh3'})[0], /ruleset/);
    assert.match(validateOrigin({...base, stage: 'planet'})[0], /stage/);
    assert.match(validateOrigin({...base, characteristics: {luck: 5}})[0], /luck/);
    assert.match(validateOrigin({...base, grants: {skills: [{key: 'cooking', advance: 0}]}})[0], /cooking/);
});

test('a skill advance outside the actor scale is reported', () => {
    assert.match(validateOrigin({...base, grants: {skills: [{key: 'survival', advance: 5}]}})[0], /advance/);
});

test('a choice must carry a key, a kind and at least one option', () => {
    assert.match(validateOrigin({...base, choices: [{type: 'one', options: []}]}).join(' '), /key/);
    assert.match(validateOrigin({...base, choices: [{key: 'a', type: 'two', options: [{label: 'x'}]}]})[0], /type/);
});

test('grants hidden inside a choice option are validated too', () => {
    const problems = validateOrigin({...base, choices: [{key: 'a', type: 'one', options: [
        {label: 'x', grants: {talents: [{name: ''}]}}
    ]}]});
    assert.match(problems[0], /talent/);
});

test('the key vocabularies match template.json', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.deepEqual(CHARACTERISTIC_KEYS, Object.keys(data.Actor.templates.characteristics.characteristics));
    assert.deepEqual(SKILL_KEYS, Object.keys(data.Actor.templates.skills.skills));
});

test('the shipped origin type carries every field the schema fills in', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.ok(data.Item.types.includes('origin'));
    const shipped = data.Item.origin;
    for (const key of Object.keys(normaliseOrigin({})))
        if (!['description', 'source'].includes(key))   // both come from the itemDescription template
            assert.ok(key in shipped, `template.json origin has no ${key}`);
});
