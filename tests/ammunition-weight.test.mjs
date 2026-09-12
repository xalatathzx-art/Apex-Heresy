import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

const ammo = (name, quantity, weight) =>
    ({type: 'ammunition', name, system: {quantity, weight}});

test('a magazine is one carried item, not sixty', () => {
    // quantity on shipped ammunition mirrors the weapon's clip size exactly
    // (Lasgun clip 60 / cell 60, Bolt Pistol clip 8 / clip 8), so it is the
    // magazine capacity written in the wrong field. Encumbrance multiplies
    // quantity by weight, which made one lasgun cell weigh 24 kg.
    const {doc, changed} = fixDocument(ammo('Standard Lasgun Cell', 60, 0.4));
    assert.equal(changed, true);
    assert.equal(doc.system.quantity, 1);
    assert.equal(doc.system.weight, 0.4, 'the weight of one magazine is untouched');
});

test('ammunition that already reads as one item keeps its quantity', () => {
    // Only the quantity is asserted here: the compatibility rule also acts on
    // ammunition, so the document-wide changed flag no longer isolates this one.
    const {doc} = fixDocument(ammo('Silver Stakes', 1, 0));
    assert.equal(doc.system.quantity, 1);
});

test('the patch is idempotent', () => {
    const once = fixDocument(ammo('Standard Lasgun Cell', 60, 0.4));
    assert.equal(fixDocument(once.doc).changed, false);
});

test('the input document is never mutated', () => {
    const source = ammo('Standard Lasgun Cell', 60, 0.4);
    fixDocument(source);
    assert.equal(source.system.quantity, 60);
});

test('only ammunition is touched', () => {
    const {doc} = fixDocument({type: 'gear', name: 'Rations', system: {quantity: 7, weight: 0.5}});
    assert.equal(doc.system.quantity, 7);
});

test('a weapon keeps its magazine size, which is where capacity belongs', () => {
    const {doc} = fixDocument({
        type: 'weapon', name: 'Lasgun',
        system: {type: 'las', clip: {max: 60, value: 60}, quantity: 1}
    });
    assert.equal(doc.system.clip.max, 60);
});
