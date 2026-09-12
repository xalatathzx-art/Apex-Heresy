import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UNTRAINED_PENALTY, isTrainedWith, trainingModifier} from '../script/combat/weapon-training.mjs';

test('the untrained penalty is the one on p. 151', () => {
    assert.equal(UNTRAINED_PENALTY, -20);
});

test('the matching training makes a weapon trained', () => {
    assert.equal(isTrainedWith(['Weapon Training (Las)'], 'las'), true);
    assert.equal(isTrainedWith(['Weapon Training (Bolt)'], 'bolt'), true);
    assert.equal(isTrainedWith(['Weapon Training (Chain)'], 'chain'), true);
});

test('training in one group does not cover another', () => {
    assert.equal(isTrainedWith(['Weapon Training (Las)'], 'bolt'), false);
    assert.equal(trainingModifier(['Weapon Training (Las)'], 'bolt'), -20);
});

test('the books name Low-Tech what the data calls primitive', () => {
    assert.equal(isTrainedWith(['Weapon Training (Low-Tech)'], 'primitive'), true);
    assert.equal(isTrainedWith(['Weapon Training (Primitive)'], 'primitive'), true);
});

test('Low-Tech training covers force weapons, which are its variants', () => {
    // p. 146: "Force weapons count as Best craftsmanship Mono variants of the
    // equivalent Low-Tech weapon."
    assert.equal(isTrainedWith(['Weapon Training (Low-Tech)'], 'force'), true);
});

test('solid projectile is recognised however it is written', () => {
    for (const name of ['Weapon Training (Solid Projectile)', 'Weapon Training (SP)'])
        assert.equal(isTrainedWith([name], 'solidProjectile'), true, name);
});

test('exotic training is its own specialisation', () => {
    assert.equal(isTrainedWith(['Exotic Weapon Training (Graviton)'], 'exotic'), false,
        'a specific exotic does not cover every exotic');
    assert.equal(isTrainedWith(['Weapon Training (Exotic)'], 'exotic'), true);
});

test('the unfilled template talent covers nothing', () => {
    // The pack ships "Weapon Training*" as a blank for the GM to specialise.
    // Treating it as universal would silently remove every untrained penalty.
    assert.equal(isTrainedWith(['Weapon Training*'], 'las'), false);
    assert.equal(isTrainedWith(['Weapon Training'], 'las'), false);
});

test('a weapon with no group is never penalised', () => {
    // 37 weapons keep an empty type on purpose; a gap in the data must not
    // become a penalty on the character.
    assert.equal(isTrainedWith([], ''), true);
    assert.equal(trainingModifier([], ''), 0);
    assert.equal(isTrainedWith([], null), true);
});

test('carrying no talents at all leaves a typed weapon untrained', () => {
    assert.equal(isTrainedWith([], 'las'), false);
    assert.equal(isTrainedWith(undefined, 'las'), false);
});

test('unrelated talents are not mistaken for training', () => {
    assert.equal(isTrainedWith(['Blind Fighting', 'Sound Constitution'], 'las'), false);
});

// ── Reaching the attack ───────────────────────────────────────────────────

test('the penalty is worked out and added to the attack target', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('function _getWeaponTrainingModifier'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /trainingModifier\(talents, rollData\.weapon\?\.weaponType\)/);
    assert.match(source, /\+ trainingMod;/, 'and it reaches the summed modifiers');
});

test('a manual override beats the deduction in both directions', () => {
    // The data cannot know every case, so the table can insist either way.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('function _getWeaponTrainingModifier'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /untrainedOverride === true\) return UNTRAINED_PENALTY/);
    assert.match(body, /untrainedOverride === false\) return 0/);
});

test('only attacks are judged for training', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('function _getWeaponTrainingModifier'));
    assert.match(fn.slice(0, fn.indexOf('\n}')), /flags\?\.isAttack\) return 0/);
});

test('the roll card shows the penalty rather than hiding it in the total', () => {
    const card = readFileSync(new URL('../template/chat/roll.hbs', import.meta.url), 'utf8');
    assert.match(card, /untrainedModifier/);
    assert.match(card, /CHAT\.UNTRAINED/);
});
