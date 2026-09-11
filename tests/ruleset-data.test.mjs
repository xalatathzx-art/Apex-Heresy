import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULESETS, STAGES} from '../script/creation/origin-data.mjs';
import {RULESET_DEFS, stepsFor, originStepsFor, auditedRulesets} from '../script/creation/ruleset-data.mjs';
import {CHARACTERISTIC_METHODS} from '../script/creation/creation-roll-data.mjs';

test('every ruleset has a definition with an actor type and at least one step', () => {
    assert.deepEqual(Object.keys(RULESET_DEFS), RULESETS);
    for (const ruleset of RULESETS) {
        const def = RULESET_DEFS[ruleset];
        assert.ok(['acolyte', 'heretic'].includes(def.actorType), `${ruleset}: ${def.actorType}`);
        assert.ok(def.steps.length > 0, ruleset);
        assert.ok(def.label, ruleset);
    }
});

test('every origin step names a stage that the ruleset declares', () => {
    for (const ruleset of RULESETS)
        for (const step of originStepsFor(ruleset))
            assert.ok(STAGES[ruleset].includes(step.stage), `${ruleset}/${step.stage}`);
});

test('every ruleset offers only characteristic methods that exist', () => {
    for (const ruleset of RULESETS)
        for (const method of RULESET_DEFS[ruleset].characteristicMethods)
            assert.ok(CHARACTERISTIC_METHODS.includes(method), `${ruleset}: ${method}`);
});

test('step ids are unique inside a ruleset', () => {
    for (const ruleset of RULESETS) {
        const ids = stepsFor(ruleset).map(s => s.id);
        assert.equal(new Set(ids).size, ids.length, ruleset);
    }
});

test('every ruleset generates characteristics exactly once', () => {
    for (const ruleset of RULESETS) {
        const generators = stepsFor(ruleset).filter(s => s.kind === 'characteristics');
        assert.equal(generators.length, 1, ruleset);
    }
});

test('Dark Heresy runs home world, background, role, characteristics, experience, divination', () => {
    assert.deepEqual(stepsFor('dh2').map(s => s.id),
        ['homeWorld', 'background', 'role', 'characteristics', 'experience', 'divination']);
    assert.equal(RULESET_DEFS.dh2.actorType, 'acolyte');
});

test('Black Crusade builds a heretic and asks for the race before the archetype', () => {
    const ids = stepsFor('bc').map(s => s.id);
    assert.equal(RULESET_DEFS.bc.actorType, 'heretic');
    assert.ok(ids.indexOf('race') < ids.indexOf('archetype'));
});

test('only Rogue Trader uses the adjacency grid and only Only War the budget counter', () => {
    assert.deepEqual(RULESETS.filter(r => stepsFor(r).some(s => s.widget === 'grid')), ['rt']);
    assert.deepEqual(RULESETS.filter(r => stepsFor(r).some(s => s.widget === 'budget')), ['ow']);
});

test('every step label and ruleset label resolves to a real translation', () => {
    const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    for (const ruleset of RULESETS) {
        assert.ok(lang[RULESET_DEFS[ruleset].label], `${ruleset}: ${RULESET_DEFS[ruleset].label}`);
        for (const step of stepsFor(ruleset)) assert.ok(lang[step.label], `${ruleset}/${step.id}: ${step.label}`);
    }
});

test('only books whose characteristic rule has been checked against the book count as audited', () => {
    // Dark Heresy modifiers are a generation rule, not a number: "+" rolls 3d10 and keeps the
    // best two, point buy starts at 30 instead of 25. Adding the modifier to the result as
    // well would count it twice. Every other book still has to be read before it is trusted.
    assert.deepEqual(auditedRulesets(), ['dh2']);
    assert.equal(RULESET_DEFS.dh2.characteristicModifiers, 'generation');
    for (const ruleset of RULESETS) {
        const mode = RULESET_DEFS[ruleset].characteristicModifiers;
        assert.ok(mode === null || ['generation', 'flat'].includes(mode), `${ruleset}: ${mode}`);
    }
});

test('an unknown ruleset has no steps rather than throwing', () => {
    assert.deepEqual(stepsFor('dh3'), []);
    assert.deepEqual(originStepsFor(''), []);
});
