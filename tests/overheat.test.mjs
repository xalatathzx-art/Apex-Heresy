import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OVERHEAT_THRESHOLD, overheatArm, overheatSelfDamage} from '../script/combat/overheat.mjs';

test('the weapon overheats on 91 or higher (DH2 p. 149)', () => {
    assert.equal(OVERHEAT_THRESHOLD, 91);
});

test('a one-handed weapon burns the arm holding it', () => {
    assert.equal(overheatArm({twoHanded: false, holdingArm: 'rightArm'}), 'rightArm');
    assert.equal(overheatArm({twoHanded: false, holdingArm: 'leftArm'}), 'leftArm');
});

test('a two-handed weapon burns a random arm', () => {
    assert.equal(overheatArm({twoHanded: true, roll: 0.1}), 'leftArm');
    assert.equal(overheatArm({twoHanded: true, roll: 0.9}), 'rightArm');
});

test('the wielder takes the weapon damage as Energy at penetration zero', () => {
    const hurt = overheatSelfDamage({damage: 7, arm: 'rightArm'});
    assert.deepEqual({...hurt}, {amount: 7, penetration: 0, location: 'rightArm', type: 'energy'});
});

test('armour is not bypassed: penetration is zero, not the toxic-style override', () => {
    assert.equal(overheatSelfDamage({damage: 7, arm: 'rightArm'}).penetration, 0);
});

test('dropping the weapon avoids the damage entirely', () => {
    assert.equal(overheatSelfDamage({damage: 7, dropped: true, arm: 'rightArm'}), null);
});

test('a nonsensical damage total cannot heal the wielder', () => {
    assert.equal(overheatSelfDamage({damage: -3, arm: 'rightArm'}).amount, 0);
});

test('an overheating weapon burns its wielder in the attack flow', () => {
    // The report: "the weapon does not damage the wielder OR allow the rolling
    // of weapon damage dice to apply potential damage to the holder."
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const branch = source.slice(source.indexOf('if (traits.overheating)'));
    const body = branch.slice(0, branch.indexOf('} else {'));
    assert.match(body, /_burnOverheatWielder\(rollData\)/, 'the overheat burns someone');

    const helper = source.slice(source.indexOf('async function _burnOverheatWielder'));
    const helperBody = helper.slice(0, helper.indexOf('\n}'));
    assert.match(helperBody, /overheatSelfDamage/, 'the book rule decides the damage');
    assert.match(helperBody, /applyDamage/, 'and it reaches the wielder');
    assert.match(helperBody, /damageFormula/, "rolled from the weapon's own damage");
    assert.match(helperBody, /DialogV2\.confirm/, 'the wielder may drop the weapon instead');
});
