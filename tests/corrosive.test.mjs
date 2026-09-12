import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corrosiveBite} from '../script/combat/corrosive.mjs';
import {loadSystem} from './helpers/system.mjs';
import {readFileSync} from 'node:fs';

test('the acid eats armour first (DH2 p. 146)', () => {
    assert.deepEqual({...corrosiveBite({roll: 4, armourAtLocation: 6})},
        {armourLost: 4, toTarget: 0});
});

test('what the armour cannot absorb reaches the wearer', () => {
    assert.deepEqual({...corrosiveBite({roll: 8, armourAtLocation: 5})},
        {armourLost: 5, toTarget: 3});
});

test('an unarmoured location takes the whole amount', () => {
    assert.deepEqual({...corrosiveBite({roll: 7, armourAtLocation: 0})},
        {armourLost: 0, toTarget: 7});
});

test('armour exactly absorbing the bite lets nothing through', () => {
    assert.deepEqual({...corrosiveBite({roll: 5, armourAtLocation: 5})},
        {armourLost: 5, toTarget: 0});
});

test('nonsense cannot heal anyone or repair armour', () => {
    assert.deepEqual({...corrosiveBite({roll: -3, armourAtLocation: 4})},
        {armourLost: 0, toTarget: 0});
    assert.deepEqual({...corrosiveBite({roll: 5, armourAtLocation: -2})},
        {armourLost: 0, toTarget: 5});
});

test('the quality is in the vocabulary, so the six weapons that carry it parse', () => {
    const util = loadSystem().get('DarkHeresyUtil');
    assert.equal(util.extractWeaponTraits('Corrosive').corrosive, true);
    assert.equal(util.extractWeaponTraits('Blast (2), Corrosive').corrosive, true);
    assert.equal(util.extractWeaponTraits('Corrosive, Razor Sharp, Tearing').corrosive, true);
    assert.equal(util.extractWeaponTraits('Tearing').corrosive, false);
});

test('the quality reaches the weapon effects, eating armour before flesh', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const block = source.slice(source.indexOf('if (struck && traits.corrosive)'));
    const body = block.slice(0, block.indexOf('\n    // Токсичное'));
    assert.match(body, /corrosiveBite/, 'the book rule decides the split');
    assert.match(body, /tempModifier/, 'the armour loss is recorded and persists');
    assert.match(body, /penetration: 9999/, 'the excess ignores armour and Toughness');
});

test('every hit location maps to an armour key', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const table = source.slice(source.indexOf('const DH_ARMOUR_KEYS'));
    const body = table.slice(0, table.indexOf('};'));
    for (const [location, key] of [['ARMOUR.HEAD', 'head'], ['ARMOUR.LEFT_ARM', 'leftArm'],
                                   ['ARMOUR.RIGHT_ARM', 'rightArm'], ['ARMOUR.BODY', 'body'],
                                   ['ARMOUR.LEFT_LEG', 'leftLeg'], ['ARMOUR.RIGHT_LEG', 'rightLeg']])
        assert.match(body, new RegExp(`"${location}": "${key}"`), location);
});

test('the strings it needs exist', () => {
    const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    assert.ok(lang['WEAPON.TRAIT.CORROSIVE']);
    assert.match(lang['WEAPON.TRAIT.CORROSIVE_BITE'], /\{armour\}/);
    assert.match(lang['WEAPON.TRAIT.CORROSIVE_BITE'], /\{damage\}/);
});
