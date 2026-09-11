import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULESETS, STAGES, CHARACTERISTIC_KEYS, SKILL_KEYS, APTITUDES,
        normaliseOrigin, validateOrigin, grantSummaryLines} from '../script/creation/origin-data.mjs';

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

test('the summary shows every granted section and nothing else', () => {
    assert.deepEqual(grantSummaryLines(base), []);
    const lines = grantSummaryLines({...base,
        characteristics: {strength: 5, fellowship: -5},
        aptitudes: ['Toughness'],
        grants: {skills: [{key: 'survival', advance: 0}], talents: [{name: 'Jaded'}],
                 traits: [{name: 'Sturdy', rating: 3}], equipment: [{name: 'Sword', quantity: 2}],
                 corruption: 2}});
    assert.deepEqual(lines, [
        'Characteristics: strength +5, fellowship -5',
        'Aptitudes: Toughness',
        'Skills: survival 0',   // the scale is -20/0/10/20, so a bare number reads better than a sign
        'Talents: Jaded',
        'Traits: Sturdy (3)',
        'Equipment: Sword ×2',
        'Corruption: +2'
    ]);
});

test('the summary spells out a choice rather than hiding it', () => {
    const lines = grantSummaryLines({...base, choices: [
        {key: 'omnissiah', type: 'one', label: "Omnissiah's Chosen",
         options: [{label: 'Technical Knock'}, {label: 'Weapon-Tech'}]}
    ]});
    assert.deepEqual(lines, ['Choice "omnissiah" (one): Technical Knock / Weapon-Tech']);
});

test('the aptitude vocabulary matches what the actor model uses', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    const used = new Set();
    for (const skill of Object.values(data.Actor.templates.skills.skills)) for (const a of skill.aptitudes) used.add(a);
    for (const char of Object.values(data.Actor.templates.characteristics.characteristics)) for (const a of char.aptitudes) used.add(a);
    assert.deepEqual(APTITUDES, [...used].sort());
});

test('an unknown aptitude is reported wherever it is named', () => {
    assert.match(validateOrigin({...base, aptitudes: ['Cooking']})[0], /Cooking/);
    assert.match(validateOrigin({...base, grants: {aptitudes: ['Cooking']}})[0], /Cooking/);
    assert.deepEqual(validateOrigin({...base, aptitudes: ['Knowledge'], grants: {aptitudes: ['Social']}}), []);
});

test('a choice option can grant an aptitude, because backgrounds offer a pick of two', () => {
    const problems = validateOrigin({...base, choices: [{key: 'apt', type: 'one', label: 'Background Aptitude',
        options: [{label: 'Knowledge', grants: {aptitudes: ['Knowledge']}},
                  {label: 'Social', grants: {aptitudes: ['Cooking']}}]}]});
    assert.equal(problems.length, 1);
    assert.match(problems[0], /Cooking/);
});

test('an origin carries a list of named bonuses, because a background can have two', () => {
    const filled = normaliseOrigin(base);
    assert.deepEqual(filled.bonuses, []);
    const two = normaliseOrigin({...base, bonuses: [
        {name: 'The Constant Threat', description: '<p>a</p>'},
        {name: 'Tested on Terra', description: '<p>b</p>'}
    ]});
    assert.equal(two.bonuses.length, 2);
    assert.equal(two.bonuses[1].name, 'Tested on Terra');
});

test('a bonus without a name is reported', () => {
    assert.match(validateOrigin({...base, bonuses: [{description: '<p>a</p>'}]})[0], /bonus/i);
});

test('the shipped origin type carries every field the schema fills in', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.ok(data.Item.types.includes('origin'));
    const shipped = data.Item.origin;
    for (const key of Object.keys(normaliseOrigin({})))
        if (!['description', 'source'].includes(key))   // both come from the itemDescription template
            assert.ok(key in shipped, `template.json origin has no ${key}`);
});
