import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

/**
 * An attack roll against a token carrying the given conditions.
 * The modifier function reads the target off the canvas, so the canvas is the
 * only thing that needs standing up.
 */
function attackAgainst(conditions, {melee = false} = {}) {
    const system = loadSystem();
    const token = {actor: {hasCondition: id => conditions.includes(id)}};
    system.context.canvas.ready = true;
    system.context.canvas.tokens = {get: () => token};
    system.context.canvas.scene = {id: 'scene1'};
    const rollData = {
        flags: {isAttack: true},
        targets: [{tokenId: 't1'}],
        weapon: {weaponClass: melee ? 'melee' : 'ranged'}
    };
    const modifier = system.get('_getTargetConditionModifier')(rollData);
    return {modifier, sources: rollData.targetConditionSources};
}

test('a prone target at range is named Prone, not Stunned', () => {
    const {modifier, sources} = attackAgainst(['prone']);
    assert.equal(modifier, -10, 'the modifier was already correct');
    assert.match(sources, /Prone/);
    assert.doesNotMatch(sources, /Stunned/);
    assert.match(sources, /\(-10\)/);
});

test('a prone target in melee is still named Prone, with the melee bonus', () => {
    const {modifier, sources} = attackAgainst(['prone'], {melee: true});
    assert.equal(modifier, 10);
    assert.match(sources, /Prone/);
    assert.match(sources, /\(\+10\)/);
});

test('a grappled target is named Grappled, not Stunned', () => {
    const {modifier, sources} = attackAgainst(['grappled'], {melee: true});
    assert.equal(modifier, 20);
    assert.match(sources, /Grappled/);
    assert.doesNotMatch(sources, /Stunned/);
});

test('a stunned target is still named Stunned', () => {
    const {sources} = attackAgainst(['stunned']);
    assert.match(sources, /Stunned \(\+20\)/);
});

test('an unconscious target is named, not folded into Stunned', () => {
    const {sources} = attackAgainst(['unconscious']);
    assert.match(sources, /Unconscious \(\+30\)/);
});

test('several conditions are all listed, and they still sum', () => {
    const {modifier, sources} = attackAgainst(['stunned', 'prone'], {melee: true});
    assert.equal(modifier, 30);
    assert.match(sources, /Stunned \(\+20\)/);
    assert.match(sources, /Prone \(\+10\)/);
});

test('an untouched target lists nothing', () => {
    const {modifier, sources} = attackAgainst([]);
    assert.equal(modifier, 0);
    assert.equal(sources, '');
});

test('the roll card prints the named sources instead of a hardcoded Stunned', () => {
    const card = readFileSync(new URL('../template/chat/roll.hbs', import.meta.url), 'utf8');
    const block = card.slice(card.indexOf('targetConditionModifier'));
    assert.match(block, /targetConditionSources/);
    assert.doesNotMatch(block.slice(0, 400), /localize "CONDITION\.STUNNED"/);
});
