import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan} from '../script/creation/grant-data.mjs';
import {planToActorUpdate, planToItemData} from '../script/creation/origin-apply.mjs';
import {RULESET_DEFS} from '../script/creation/ruleset-data.mjs';

// The regiment and the speciality both hand out skills and talents; Only War says what to do
// when they hand out the same one (p. 41).
const OW = RULESET_DEFS.ow.duplicates;

const actor = () => ({
    items: [{type: 'talent', name: 'Rapid Reload'}],
    system: {
        characteristics: {strength: {base: 30}},
        skills: {
            survival: {advance: 0, starter: true, isSpecialist: false, specialities: {}},
            athletics: {advance: -20, starter: false, isSpecialist: false, specialities: {}},
            commonLore: {advance: -20, isSpecialist: true, specialities: {
                war: {label: 'War', advance: 0, starter: true, cost: 0}
            }}
        },
        wounds: {max: 0, value: 0}, corruption: 0, insanity: 0, aptitudes: {}
    }
});

test('a skill given twice becomes an extra advance in Only War, and the best of the two in Dark Heresy', () => {
    const plan = {...emptyPlan(), skills: [{key: 'survival', advance: 0}, {key: 'athletics', advance: 0}]};
    const only = planToActorUpdate(actor(), plan, {duplicates: OW});
    assert.equal(only.update['system.skills.survival.advance'], 10, 'Known twice starts the game Trained');
    assert.equal(only.update['system.skills.athletics.advance'], 0, 'a skill given once is unchanged');
    assert.deepEqual(only.applied.duplicateSkills, ['survival']);

    const dark = planToActorUpdate(actor(), plan);
    assert.equal(dark.update['system.skills.survival.advance'], undefined, 'Dark Heresy keeps the better rank');
    assert.deepEqual(dark.applied.duplicateSkills, []);
});

test('a speciality given twice also gains the extra advance', () => {
    const plan = {...emptyPlan(), specialities: [{key: 'commonLore', name: 'War', advance: 0}]};
    const {update, applied} = planToActorUpdate(actor(), plan, {duplicates: OW});
    assert.equal(update['system.skills.commonLore.specialities.war.advance'], 10);
    assert.deepEqual(applied.duplicateSkills, ['commonLore:War']);
});

test('a talent given twice is 100 xp instead, and the second copy is not created (p. 41)', () => {
    const plan = {...emptyPlan(), talents: [{name: 'Rapid Reload'}, {name: 'Nerves of Steel'}]};
    const {applied} = planToActorUpdate(actor(), plan, {duplicates: OW});
    assert.deepEqual(applied.duplicateTalents, ['Rapid Reload']);
    assert.equal(applied.duplicateExperience, 100);

    const items = planToItemData(plan, 'ow:speciality', 'carrier', () => null, {skipTalents: applied.duplicateTalents});
    assert.deepEqual(items.filter(item => item.type === 'talent').map(item => item.name), ['Nerves of Steel']);
});

test('Dark Heresy grants no experience for a repeated talent and still creates nothing twice', () => {
    const plan = {...emptyPlan(), talents: [{name: 'Rapid Reload'}]};
    const {applied} = planToActorUpdate(actor(), plan);
    assert.deepEqual(applied.duplicateTalents, ['Rapid Reload']);
    assert.equal(applied.duplicateExperience, 0);
});

test('the ruleset says when wounds and fate are rolled', () => {
    assert.equal(RULESET_DEFS.dh2.vitalsStage, 'characteristics');
    assert.equal(RULESET_DEFS.ow.vitalsStage, 'speciality', 'wounds come from the speciality (p. 100)');
});

test('a count becomes copies for items that cannot hold one (grenades), and a number for ammunition', () => {
    const plan = {...emptyPlan(), equipment: [{name: 'Frag Grenade', quantity: 2}, {name: 'Charge Pack (Basic)', quantity: 4}]};
    // Only ammunition carries a quantity in this system; a weapon does not.
    const lookup = (kind, name) => name === 'Charge Pack (Basic)'
        ? {name, type: 'ammunition', system: {quantity: 1}}
        : {name, type: 'weapon', system: {}};
    const items = planToItemData(plan, 'ow:regiment', 'carrier', lookup);
    assert.deepEqual(items.filter(item => item.name === 'Frag Grenade').length, 2, 'two grenades are two items');
    const packs = items.filter(item => item.name === 'Charge Pack (Basic)');
    assert.equal(packs.length, 1);
    assert.equal(packs[0].system.quantity, 4);
});
