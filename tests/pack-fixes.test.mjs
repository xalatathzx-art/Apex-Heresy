import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NAME_FIXES, fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';
import {DISCIPLINES} from '../script/creation/psychic-data.mjs';

test('truncated and double-spaced names are restored to the book names', () => {
    // Tables 4-1 to 4-3 (pp. 120-122).
    assert.equal(NAME_FIXES.talent['Nowhere to Hid'], 'Nowhere to Hide');
    assert.equal(NAME_FIXES.talent['Blinding Fight'], 'Blind Fighting');
    const {doc, changed} = fixDocument({type: 'talent', name: 'Whirlwind of Deat', system: {description: ''}});
    assert.equal(changed, true);
    assert.equal(doc.name, 'Whirlwind of Death');
    assert.equal(fixDocument({type: 'weapon', name: 'Nowhere to Hid', system: {}}).changed, false, 'only the named type');
});

test('Frenzy gets back the digit its penalty lost (p. 127: a -20 penalty)', () => {
    const source = {type: 'talent', name: 'Frenzy', system: {description: '<p>but suffering a &ndash; 0 penalty to Ballistic Skill</p>'}};
    const {doc} = fixDocument(source);
    assert.match(doc.system.description, /&ndash;20 penalty/);
    assert.equal(source.system.description.includes('&ndash; 0'), true, 'the input is not mutated');
});

test('core psychic powers carry their book Value as cost; others are left alone', () => {
    const {doc, changed} = fixDocument({type: 'psychicPower', name: 'Smite', system: {cost: 0}});
    assert.equal(changed, true);
    assert.equal(doc.system.cost, DISCIPLINES.find(d => d.key === 'biomancy').powers.find(p => p.name === 'Smite').value);
    assert.equal(fixDocument({type: 'psychicPower', name: 'Smite', system: {cost: 200}}).changed, false, 'already right');
    assert.equal(fixDocument({type: 'psychicPower', name: 'Vortex Explosion', system: {cost: 0}}).changed, false);
});
