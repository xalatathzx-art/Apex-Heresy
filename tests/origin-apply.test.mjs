import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan} from '../script/creation/grant-data.mjs';
import {planToActorUpdate, planToItemData, revertUpdate,
        GRANT_FLAG_SCOPE, GRANT_FLAG_KEY} from '../script/creation/origin-apply.mjs';

const actor = () => ({system: {
    characteristics: {strength: {base: 30}, toughness: {base: 28}, fellowship: {base: 31},
                      influence: {base: 25}},
    skills: {survival: {advance: -20, specialities: {}}, commonLore: {advance: -20, specialities: {}}},
    wounds: {max: 0, value: 0}, fate: {max: 0, value: 0},
    corruption: 0, insanity: 0, aptitudes: {}
}});

test('characteristic modifiers raise base values and are recorded for the undo', () => {
    const plan = {...emptyPlan(), characteristics: {strength: 5, fellowship: -5}};
    const {update, applied} = planToActorUpdate(actor(), plan);
    assert.equal(update['system.characteristics.strength.base'], 35);
    assert.equal(update['system.characteristics.fellowship.base'], 26);
    assert.deepEqual(applied.characteristics, {strength: 5, fellowship: -5});
});

test('a characteristic the actor does not have is skipped rather than written blindly', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), characteristics: {luck: 5}});
    assert.equal(update['system.characteristics.luck.base'], undefined);
    assert.deepEqual(applied.characteristics, {});
});

test('a skill is only raised, never lowered, and only the raise is recorded', () => {
    const raised = actor();
    raised.system.skills.survival.advance = 10;
    const {update, applied} = planToActorUpdate(raised, {...emptyPlan(), skills: [{key: 'survival', advance: 0}]});
    assert.equal(update['system.skills.survival.advance'], undefined);
    assert.deepEqual(applied.skills, {});
});

test('an untrained skill moves to the granted advance', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), skills: [{key: 'survival', advance: 0}]});
    assert.equal(update['system.skills.survival.advance'], 0);
    assert.deepEqual(applied.skills, {survival: {from: -20, to: 0}});
});

test('specialities are added under their skill without touching siblings', () => {
    const plan = {...emptyPlan(), specialities: [{key: 'commonLore', name: 'Imperium', advance: 0}]};
    const {update, applied} = planToActorUpdate(actor(), plan);
    assert.equal(update['system.skills.commonLore.specialities.Imperium.advance'], 0);
    assert.deepEqual(applied.specialities, [{key: 'commonLore', name: 'Imperium'}]);
});

test('wounds, corruption and insanity add to what is already there', () => {
    const wounded = actor();
    wounded.system.wounds.max = 9;
    wounded.system.wounds.value = 9;
    const {update, applied} = planToActorUpdate(wounded, {...emptyPlan(), wounds: 2, corruption: 3, insanity: 1});
    assert.equal(update['system.wounds.max'], 11);
    assert.equal(update['system.wounds.value'], 11);
    assert.equal(update['system.corruption'], 3);
    assert.equal(update['system.insanity'], 1);
    assert.equal(applied.wounds, 2);
});

test('influence is a characteristic, not a counter of its own', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), influence: 5});
    assert.equal(update['system.characteristics.influence.base'], 30);
    assert.equal(applied.influence, 5);
});

test('aptitudes are recorded so the undo can remove exactly the ones granted', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), aptitudes: ['Toughness']});
    assert.deepEqual(update['system.aptitudes'], {Toughness: true});
    assert.deepEqual(applied.aptitudes, ['Toughness']);
});

test('an aptitude the actor already has is not recorded, so the undo cannot take it away', () => {
    const veteran = actor();
    veteran.system.aptitudes = {Toughness: true};
    const {update, applied} = planToActorUpdate(veteran, {...emptyPlan(), aptitudes: ['Toughness']});
    assert.equal(update['system.aptitudes'], undefined);
    assert.deepEqual(applied.aptitudes, []);
});

test('an empty plan writes nothing at all', () => {
    const {update} = planToActorUpdate(actor(), emptyPlan());
    assert.deepEqual(update, {});
});

test('granted items are tagged with the stage and the carrier that produced them', () => {
    const lookup = (kind, name) => kind === 'talent' && name === 'Jaded'
        ? {name: 'Jaded', type: 'talent', _id: 'fromPack', system: {description: 'from the compendium'}} : null;
    const plan = {...emptyPlan(), talents: [{name: 'Jaded'}, {name: 'Nonexistent'}],
                  traits: [{name: 'Sturdy', rating: 3}], equipment: [{name: 'Sword', quantity: 2}]};
    const data = planToItemData(plan, 'dh2:homeWorld', 'carrier1', lookup);

    const jaded = data.find(d => d.name === 'Jaded');
    assert.equal(jaded.system.description, 'from the compendium');
    assert.equal(jaded._id, undefined, 'the pack id must not follow the copy onto the actor');
    assert.equal(jaded.flags[GRANT_FLAG_SCOPE][GRANT_FLAG_KEY], 'dh2:homeWorld');
    assert.equal(jaded.flags[GRANT_FLAG_SCOPE].grantedBy, 'carrier1');

    // A name no pack carries still produces a stub, so nothing is lost silently.
    assert.equal(data.find(d => d.name === 'Nonexistent').type, 'talent');
    assert.equal(data.find(d => d.name === 'Sturdy').system.rating, 3);
    assert.equal(data.find(d => d.name === 'Sword').system.quantity, 2);
});

test('a talent target survives the copy out of the compendium', () => {
    const lookup = () => ({name: 'Hatred (Orks)', type: 'talent', system: {}});
    const plan = {...emptyPlan(), talents: [{name: 'Hatred (Orks)', targets: [{kind: 'faction', value: 'Orks'}]}]};
    const [hatred] = planToItemData(plan, 'dh2:role', 'carrier1', lookup);
    assert.deepEqual(hatred.system.targets, [{kind: 'faction', value: 'Orks'}]);
});

test('the undo restores exactly the recorded raises and nothing else', () => {
    const subject = actor();
    const {update, applied} = planToActorUpdate(subject, {...emptyPlan(),
        characteristics: {strength: 5}, skills: [{key: 'survival', advance: 0}],
        specialities: [{key: 'commonLore', name: 'Imperium', advance: 0}],
        wounds: 2, aptitudes: ['Toughness']});

    subject.system.characteristics.strength.base = update['system.characteristics.strength.base'];
    subject.system.skills.survival.advance = update['system.skills.survival.advance'];
    subject.system.wounds.max = update['system.wounds.max'];
    subject.system.wounds.value = update['system.wounds.value'];
    subject.system.aptitudes = update['system.aptitudes'];

    const back = revertUpdate(subject, applied);
    assert.equal(back['system.characteristics.strength.base'], 30);
    assert.equal(back['system.skills.survival.advance'], -20);
    assert.equal(back['system.skills.commonLore.specialities.-=Imperium'], null);
    assert.equal(back['system.wounds.max'], 0);
    assert.equal(back['system.wounds.value'], 0);
    assert.deepEqual(back['system.aptitudes'], {});
});

test('the undo leaves a skill alone when something else raised it further', () => {
    const subject = actor();
    const applied = {skills: {survival: {from: -20, to: 0}}};
    subject.system.skills.survival.advance = 20;   // a later stage trained it past this grant
    assert.equal(revertUpdate(subject, applied)['system.skills.survival.advance'], undefined);
});

test('the undo of an empty record writes nothing', () => {
    assert.deepEqual(revertUpdate(actor(), {}), {});
});
