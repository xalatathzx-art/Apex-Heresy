import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

const weapon = (name, type = '') => ({type: 'weapon', name, system: {type}});

test('a weapon with no type is classified', () => {
    const {doc, changed} = fixDocument(weapon('Lasgun'));
    assert.equal(changed, true);
    assert.equal(doc.system.type, 'las');
});

test('the miscategorised Chainaxe is corrected, not left as las', () => {
    const {doc, changed} = fixDocument(weapon('Chainaxe', 'las'));
    assert.equal(changed, true);
    assert.equal(doc.system.type, 'chain');
});

test('an unclassifiable weapon is left alone rather than guessed', () => {
    const {doc, changed} = fixDocument(weapon('Praesidium Protectiva'));
    assert.equal(changed, false);
    assert.equal(doc.system.type, '');
});

test('the patch is idempotent', () => {
    const first = fixDocument(weapon('Lasgun'));
    const second = fixDocument(first.doc);
    assert.equal(second.changed, false);
    assert.equal(second.doc.system.type, 'las');
});

test('the input document is never mutated', () => {
    const source = weapon('Lasgun');
    fixDocument(source);
    assert.equal(source.system.type, '');
});

test('non-weapon documents are untouched by the classifier', () => {
    const {doc} = fixDocument({type: 'talent', name: 'Lasgun Mastery', system: {}});
    assert.equal(doc.system.type, undefined);
});
