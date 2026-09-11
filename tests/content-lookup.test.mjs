import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normaliseName, baseName, lookupCandidates, findContent} from '../script/creation/content-lookup.mjs';

// Names taken verbatim from the built dark-heresy pack, including its quirks.
const index = [
    {name: 'Weapon Training*', type: 'talent'},
    {name: 'Exotic Weapon Training*', type: 'talent'},
    {name: 'Resistance*', type: 'talent'},
    {name: 'Mechadendrite Use*', type: 'talent'},
    {name: 'Clues from  the Crowds', type: 'talent'},
    {name: 'Jaded', type: 'talent'},
    {name: 'Medi-kit', type: 'tool'},
    {name: 'Glow-globe', type: 'tool'},
    {name: 'Micro-bead', type: 'tool'},
    {name: 'Monotask Servo-Skull', type: 'tool'},
    {name: 'Auto Quill', type: 'tool'},
    {name: 'Grapnel & Line', type: 'tool'},
    {name: 'Enforcer Light Carapace', type: 'armour'},
    {name: 'Mechanicus Implants', type: 'trait'}
];
const EQUIP = ['weapon', 'armour', 'gear', 'tool', 'ammunition', 'drug', 'cybernetic', 'forceField'];

test('names compare without regard to case or repeated spaces', () => {
    assert.equal(normaliseName('  Medi-Kit '), 'medi-kit');
    assert.equal(normaliseName('Clues from  the Crowds'), 'clues from the crowds');
    assert.equal(normaliseName(null), '');
});

test('a trailing parenthetical is the specialisation, not part of the name', () => {
    assert.equal(baseName('Weapon Training (Las)'), 'Weapon Training');
    assert.equal(baseName('Monotask Servo-Skull (Laud Hailer)'), 'Monotask Servo-Skull');
    assert.equal(baseName('Jaded'), 'Jaded');
    // Only a trailing group counts; a name that merely contains brackets is left alone.
    assert.equal(baseName('Hand Cannon (Best) Mk II'), 'Hand Cannon (Best) Mk II');
});

test('candidates go from exact, through the specialist marker, to the bare name', () => {
    assert.deepEqual(lookupCandidates('Weapon Training (Las)'),
        ['Weapon Training (Las)', 'Weapon Training*', 'Weapon Training']);
    assert.deepEqual(lookupCandidates('Jaded'), ['Jaded']);
});

test('a specialist talent resolves to the single starred entry in the pack', () => {
    assert.equal(findContent(index, ['talent'], 'Weapon Training (Las)').name, 'Weapon Training*');
    assert.equal(findContent(index, ['talent'], 'Weapon Training (Solid Projectile)').name, 'Weapon Training*');
    assert.equal(findContent(index, ['talent'], 'Resistance (Psychic Powers)').name, 'Resistance*');
    assert.equal(findContent(index, ['talent'], 'Mechadendrite Use (Utility)').name, 'Mechadendrite Use*');
});

test('a specialisation never reaches the wrong talent', () => {
    // "Weapon Training (Las)" must not land on "Exotic Weapon Training*".
    assert.equal(findContent(index, ['talent'], 'Weapon Training (Las)').name, 'Weapon Training*');
    assert.equal(findContent(index, ['talent'], 'Exotic Weapon Training (Needle)').name, 'Exotic Weapon Training*');
});

test('case and stray spaces in the pack do not hide an item', () => {
    assert.equal(findContent(index, EQUIP, 'Medi-Kit').name, 'Medi-kit');
    assert.equal(findContent(index, EQUIP, 'Glow-Globe').name, 'Glow-globe');
    assert.equal(findContent(index, EQUIP, 'Micro-Bead').name, 'Micro-bead');
    assert.equal(findContent(index, ['talent'], 'Clues from the Crowds').name, 'Clues from  the Crowds');
});

test('a parenthetical piece of equipment falls back to its base entry', () => {
    assert.equal(findContent(index, EQUIP, 'Monotask Servo-Skull (Utility)').name, 'Monotask Servo-Skull');
    assert.equal(findContent(index, EQUIP, 'Monotask Servo-Skull (Laud Hailer)').name, 'Monotask Servo-Skull');
});

test('the type must match, so a tool is never handed over as a talent', () => {
    assert.equal(findContent(index, ['talent'], 'Medi-Kit'), null);
    assert.equal(findContent(index, EQUIP, 'Jaded'), null);
    assert.equal(findContent(index, ['trait'], 'Mechanicus Implants').name, 'Mechanicus Implants');
});

test('a name nothing carries returns null rather than a wrong guess', () => {
    assert.equal(findContent(index, EQUIP, 'Nonexistent Thing'), null);
    assert.equal(findContent(index, ['talent'], 'Nonexistent (Spec)'), null);
});
