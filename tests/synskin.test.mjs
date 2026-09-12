import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

const LOCATIONS = ['head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg'];

const shipped = () => ({
    type: 'gear', name: 'Synskin',
    system: {
        grantsArmour: {
            enabled: false, isAdditive: true,
            part: Object.fromEntries(LOCATIONS.map(l => [l, 0]))
        }
    }
});

test('Synskin grants the two Armour points it promises (DH2 p. 173)', () => {
    const {doc, changed} = fixDocument(shipped());
    assert.equal(changed, true);
    assert.equal(doc.system.grantsArmour.enabled, true);
    for (const location of LOCATIONS)
        assert.equal(doc.system.grantsArmour.part[location], 2, location);
});

test('it fills only the locations not already armoured', () => {
    // "2 Armour points to all locations not already armoured" is the maximum
    // rule, not addition: where worn armour is better, the armour counts.
    // Shipped data had isAdditive true, which would stack 2 on top of plate.
    const {doc} = fixDocument(shipped());
    assert.equal(doc.system.grantsArmour.isAdditive, false);
});

test('the patch is idempotent', () => {
    const once = fixDocument(shipped());
    assert.equal(fixDocument(once.doc).changed, false);
});

test('other gear is untouched', () => {
    const {changed} = fixDocument({type: 'gear', name: 'Rations', system: {}});
    assert.equal(changed, false);
});
