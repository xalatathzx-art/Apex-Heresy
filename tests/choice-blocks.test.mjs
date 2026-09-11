import {test} from 'node:test';
import assert from 'node:assert/strict';
import {esc, manyCount, choiceBlocksHtml, readChoicePicks, restoreChoicePicks}
    from '../script/creation/choice-blocks.mjs';
import {resolveGrantPlan} from '../script/creation/grant-data.mjs';

/**
 * The smallest thing that answers querySelectorAll the way the reader uses it: a flat list of
 * fake inputs, matched on the attribute the selector names.
 */
function fakeRoot(nodes) {
    const matches = selector => {
        const attribute = /\[data-([a-z-]+)(?:="([^"]*)")?\]/i.exec(selector);
        const tag = selector.split('[')[0];
        const key = attribute[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return nodes.filter(node =>
            (!tag || node.tag === tag)
            && node.dataset[key] !== undefined
            && (attribute[2] === undefined || String(node.dataset[key]) === attribute[2])
            && (!/data-group="([^"]*)"/.test(selector)
                || node.dataset.group === /data-group="([^"]*)"/.exec(selector)[1]));
    };
    return {querySelectorAll: matches, querySelector: selector => matches(selector)[0] ?? null};
}

const input = (tag, dataset, extra = {}) => ({tag, dataset, value: '', checked: false, ...extra});

test('escaping keeps book text out of the markup', () => {
    assert.equal(esc(`<b>"Omnissiah's" & co</b>`), '&lt;b&gt;&quot;Omnissiah&#39;s&quot; &amp; co&lt;/b&gt;');
    assert.equal(esc(null), '');
});

test('a "many" choice counts by intelligence bonus or by a flat number', () => {
    assert.equal(manyCount({count: 'intelligenceBonus'}, {intelligenceBonus: 3}), 3);
    assert.equal(manyCount({count: 'intelligenceBonus'}, {}), 0);
    assert.equal(manyCount({count: 2}), 2);
    assert.equal(manyCount({}), 0);
});

test('the markup renders one block per choice and escapes the labels', () => {
    const html = choiceBlocksHtml({
        characteristicChoices: [{label: 'Any two', pick: 2, from: ['strength', 'toughness']}],
        choices: [
            {key: 'a', type: 'one', label: "Omnissiah's Chosen", options: [{label: 'Technical Knock'}]},
            {key: 'b', type: 'many', label: 'Lore', count: 2, groups: ['commonLore']},
            {key: 'c', type: 'target', label: 'Hatred', talentTemplate: 'Hatred ({v})'}
        ]
    });
    assert.equal((html.match(/wizard-choice"/g) ?? []).length, 4);
    assert.match(html, /Omnissiah&#39;s Chosen/);
    assert.match(html, /data-charchoice="0"/);
    assert.match(html, /data-many="b"/);
    assert.match(html, /data-target="c"/);
});

test('an option that needs a target renders a hidden input for it', () => {
    const html = choiceBlocksHtml({choices: [{key: 'roleTalent', type: 'one', label: 'Role Talent', options: [
        {label: 'Resistance (Pick One)', talentTemplate: 'Resistance ({v})'},
        {label: 'Takedown'}
    ]}]});
    assert.match(html, /data-option-target="roleTalent"/);
    assert.match(html, /hidden/);
});

test('a choice with no option needing a target renders no extra input', () => {
    const html = choiceBlocksHtml({choices: [{key: 'x', type: 'one', label: 'X', options: [{label: 'a'}]}]});
    assert.doesNotMatch(html, /data-option-target/);
});

test('reading collects every kind of answer', () => {
    const nodes = [
        input('input', {charchoice: '0', group: undefined}, {value: '0', checked: true}),
        input('input', {charchoice: '0'}, {value: '1', checked: false}),
        input('input', {charchoice: '0'}, {value: '2', checked: true}),
        input('select', {choice: 'omnissiah'}, {value: '1'}),
        input('input', {many: 'lore', group: 'commonLore'}, {value: 'Imperium, Tech'}),
        input('input', {target: 'hatred'}, {value: 'Orks'})
    ];
    const picks = readChoicePicks(fakeRoot(nodes), {
        characteristicChoices: [{from: ['a', 'b', 'c'], pick: 2}],
        choices: [{key: 'omnissiah', type: 'one'}, {key: 'lore', type: 'many'}, {key: 'hatred', type: 'target'}]
    });
    assert.deepEqual(picks.characteristicChoices, [[0, 2]]);
    assert.deepEqual(picks.one, {omnissiah: 1});
    assert.deepEqual(picks.many.lore, [{key: 'commonLore', name: 'Imperium'}, {key: 'commonLore', name: 'Tech'}]);
    assert.deepEqual(picks.target.hatred, {kind: 'text', value: 'Orks'});
});

test('an unanswered control contributes nothing rather than an empty answer', () => {
    const nodes = [
        input('select', {choice: 'omnissiah'}, {value: ''}),
        input('input', {target: 'hatred'}, {value: '   '}),
        input('input', {many: 'lore', group: 'commonLore'}, {value: ' , '})
    ];
    const picks = readChoicePicks(fakeRoot(nodes), {choices: [{key: 'lore', type: 'many'}]});
    assert.deepEqual(picks.one, {});
    assert.deepEqual(picks.target, {});
    assert.deepEqual(picks.many.lore, []);
});

test('an option target is read into the same bucket the resolver expects', () => {
    const nodes = [
        input('select', {choice: 'roleTalent'}, {value: '0'}),
        input('input', {optionTarget: 'roleTalent'}, {value: 'Poisons'})
    ];
    const picks = readChoicePicks(fakeRoot(nodes), {});
    const origin = {ruleset: 'dh2', stage: 'role', key: 'chirurgeon', choices: [
        {key: 'roleTalent', type: 'one', label: 'Role Talent', options: [
            {label: 'Resistance (Pick One)', talentTemplate: 'Resistance ({v})'},
            {label: 'Takedown', grants: {talents: [{name: 'Takedown'}]}}
        ]}
    ]};
    const {plan, problems} = resolveGrantPlan(origin, picks);
    assert.deepEqual(problems, []);
    assert.deepEqual(plan.talents.map(t => t.name), ['Resistance (Poisons)']);
});

test('answers survive a re-render: what was read goes back in', () => {
    const nodes = [
        input('input', {charchoice: '0'}, {value: '0'}),
        input('input', {charchoice: '0'}, {value: '1'}),
        input('select', {choice: 'omnissiah'}),
        input('input', {many: 'lore', group: 'commonLore'}),
        input('input', {target: 'hatred'})
    ];
    const root = fakeRoot(nodes);
    restoreChoicePicks(root, {
        characteristicChoices: [[1]],
        one: {omnissiah: 1},
        many: {lore: [{key: 'commonLore', name: 'Imperium'}]},
        target: {hatred: {kind: 'text', value: 'Orks'}}
    });
    assert.equal(nodes[0].checked, false);
    assert.equal(nodes[1].checked, true);
    assert.equal(nodes[2].value, '1');
    assert.equal(nodes[3].value, 'Imperium');
    assert.equal(nodes[4].value, 'Orks');
});

test('reading and restoring survive a missing root instead of throwing', () => {
    assert.deepEqual(readChoicePicks(null, {}), {characteristicChoices: [], one: {}, many: {}, target: {}});
    restoreChoicePicks(null, {one: {a: 1}});
});
