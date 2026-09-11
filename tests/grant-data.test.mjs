import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan, resolveGrantPlan, mergePlans} from '../script/creation/grant-data.mjs';

const feral = {
    ruleset: 'dh2', stage: 'homeWorld', key: 'feralWorld', order: 1,
    characteristics: {strength: 5, toughness: 5, fellowship: -5},
    aptitudes: ['Toughness'],
    grants: {talents: [{name: 'Jaded'}], skills: [{key: 'survival', advance: 0}]}
};

test('a plan with no picks is the origin itself', () => {
    const {plan, problems} = resolveGrantPlan(feral, {});
    assert.deepEqual(problems, []);
    assert.deepEqual(plan.characteristics, {strength: 5, toughness: 5, fellowship: -5});
    assert.deepEqual(plan.talents, [{name: 'Jaded'}]);
    assert.deepEqual(plan.aptitudes, ['Toughness']);
});

test('a characteristic choice adds its value to each picked characteristic', () => {
    const origin = {...feral, characteristics: {}, characteristicChoices: [
        {label: 'Any two', pick: 2, value: 3, from: ['perception', 'strength', 'toughness']}
    ]};
    const {plan} = resolveGrantPlan(origin, {characteristicChoices: [[0, 2]]});
    assert.deepEqual(plan.characteristics, {perception: 3, toughness: 3});
});

test('picking fewer or repeating a characteristic is reported', () => {
    const origin = {...feral, characteristicChoices: [
        {label: 'Any two', pick: 2, value: 3, from: ['perception', 'strength']}
    ]};
    assert.match(resolveGrantPlan(origin, {characteristicChoices: [[0]]}).problems[0], /2/);
    assert.match(resolveGrantPlan(origin, {characteristicChoices: [[0, 0]]}).problems[0], /twice/i);
});

test('a "one" choice contributes only the picked option', () => {
    const origin = {...feral, choices: [{key: 'omnissiah', type: 'one', label: "Omnissiah's Chosen", options: [
        {label: 'Technical Knock', grants: {talents: [{name: 'Technical Knock'}]}},
        {label: 'Weapon-Tech', grants: {talents: [{name: 'Weapon-Tech'}]}}
    ]}]};
    const {plan} = resolveGrantPlan(origin, {one: {omnissiah: 1}});
    assert.deepEqual(plan.talents.map(t => t.name), ['Jaded', 'Weapon-Tech']);
});

test('an option may require naming a target, for "Resistance (Pick One) or Takedown"', () => {
    const origin = {...feral, choices: [{key: 'roleTalent', type: 'one', label: 'Role Talent', options: [
        {label: 'Resistance (Pick One)', talentTemplate: 'Resistance ({v})'},
        {label: 'Takedown', grants: {talents: [{name: 'Takedown'}]}}
    ]}]};

    const named = resolveGrantPlan(origin, {one: {roleTalent: 0}, target: {roleTalent: {kind: 'text', value: 'Poisons'}}});
    assert.deepEqual(named.problems, []);
    const resistance = named.plan.talents.find(t => t.name === 'Resistance (Poisons)');
    assert.deepEqual(resistance.targets, [{kind: 'text', value: 'Poisons'}]);

    // Picking that option without naming the target is incomplete, not a talent called "Resistance ({v})".
    assert.match(resolveGrantPlan(origin, {one: {roleTalent: 0}}).problems[0], /roleTalent/);

    // The option that needs no target is unaffected.
    const takedown = resolveGrantPlan(origin, {one: {roleTalent: 1}});
    assert.deepEqual(takedown.problems, []);
    assert.deepEqual(takedown.plan.talents.map(t => t.name), ['Jaded', 'Takedown']);
});

test('an unanswered "one" choice is reported instead of silently defaulting', () => {
    const origin = {...feral, choices: [{key: 'omnissiah', type: 'one', label: 'x',
        options: [{label: 'a'}, {label: 'b'}]}]};
    assert.match(resolveGrantPlan(origin, {}).problems[0], /omnissiah/);
});

test('a "many" choice counts by intelligence bonus and rejects the wrong number', () => {
    const origin = {...feral, choices: [
        {key: 'lore', type: 'many', label: 'Lore', count: 'intelligenceBonus', groups: ['commonLore']}
    ]};
    const two = [{key: 'commonLore', name: 'Imperium'}, {key: 'commonLore', name: 'Tech'}];
    const ok = resolveGrantPlan(origin, {many: {lore: two}}, {intelligenceBonus: 2});
    assert.deepEqual(ok.problems, []);
    assert.deepEqual(ok.plan.specialities, [
        {key: 'commonLore', name: 'Imperium', advance: 0},
        {key: 'commonLore', name: 'Tech', advance: 0}
    ]);
    assert.match(resolveGrantPlan(origin, {many: {lore: two}}, {intelligenceBonus: 3}).problems[0], /3/);
});

test('a "target" choice names the talent and keeps the target structurally', () => {
    const origin = {...feral, choices: [
        {key: 'hatred', type: 'target', label: 'Hatred', talentTemplate: 'Hatred ({v})'}
    ]};
    const {plan} = resolveGrantPlan(origin, {target: {hatred: {kind: 'faction', value: 'Orks'}}});
    const hatred = plan.talents.find(t => t.name === 'Hatred (Orks)');
    assert.deepEqual(hatred.targets, [{kind: 'faction', value: 'Orks'}]);
});

test('resolving never mutates the origin it was given', () => {
    const origin = structuredClone(feral);
    resolveGrantPlan(origin, {});
    assert.deepEqual(origin, feral);
});

test('merging plans sums characteristics and keeps the higher skill advance', () => {
    const a = {...emptyPlan(), characteristics: {strength: 5}, skills: [{key: 'survival', advance: 0}], wounds: 3};
    const b = {...emptyPlan(), characteristics: {strength: 3, toughness: 5}, skills: [{key: 'survival', advance: 10}], wounds: 2};
    const merged = mergePlans(a, b);
    assert.deepEqual(merged.characteristics, {strength: 8, toughness: 5});
    assert.deepEqual(merged.skills, [{key: 'survival', advance: 10}]);
    assert.equal(merged.wounds, 5);
});

test('merging records a duplicate talent once and reports it for the experience refund', () => {
    const a = {...emptyPlan(), talents: [{name: 'Jaded'}]};
    const merged = mergePlans(a, {...emptyPlan(), talents: [{name: 'Jaded'}]});
    assert.deepEqual(merged.talents, [{name: 'Jaded'}]);
    assert.deepEqual(merged.duplicates, [{kind: 'talent', name: 'Jaded'}]);
});

test('merging leaves the plans it was given untouched', () => {
    const a = {...emptyPlan(), characteristics: {strength: 5}, talents: [{name: 'Jaded'}]};
    const snapshot = structuredClone(a);
    mergePlans(a, {...emptyPlan(), characteristics: {strength: 3}});
    assert.deepEqual(a, snapshot);
});

test('elite advances and their riders pass through the plan', () => {
    const mystic = {...feral, grants: {eliteAdvances: ['psyker']}};
    const telepathica = {...feral, grants: {eliteRiders: [{elite: 'psyker', traits: [{name: 'Sanctioned'}]}]}};
    const one = resolveGrantPlan(mystic, {}).plan, two = resolveGrantPlan(telepathica, {}).plan;
    assert.deepEqual(one.eliteAdvances, ['psyker']);
    assert.deepEqual(two.eliteRiders, [{elite: 'psyker', traits: [{name: 'Sanctioned'}]}]);
    const merged = mergePlans(one, two, one);
    assert.deepEqual(merged.eliteAdvances, ['psyker'], 'the same advance is not granted twice');
    assert.equal(merged.eliteRiders.length, 1);
    assert.deepEqual(emptyPlan().eliteAdvances, []);
});
