import {test} from 'node:test';
import assert from 'node:assert/strict';
import {skillLevelIndex, characteristicOffers, skillOffers, checkPrerequisites, talentOffers, spentOn,
        purchaseCharacteristic, purchaseSkill, purchaseNewSpeciality, refundUpdate, CHARACTERISTIC_ABBREVIATIONS}
    from '../script/creation/shop-data.mjs';

const NAMES = {'weapon skill': 'weaponSkill', 'willpower': 'willpower', 'intelligence': 'intelligence',
               'fellowship': 'fellowship'};

// A Feral World / Imperial Guard / Warrior acolyte, in the shape the actor model stores.
const snapshot = () => ({
    aptitudes: new Set(['General', 'Toughness', 'Fieldcraft', 'Weapon Skill', 'Offence', 'Strength',
                        'Ballistic Skill', 'Defence']),
    characteristics: {
        weaponSkill: {advance: 0, cost: 0, aptitudes: ['Weapon Skill', 'Offence']},
        intelligence: {advance: 0, cost: 0, aptitudes: ['Intelligence', 'Knowledge']},
        willpower: {advance: 0, cost: 0, aptitudes: ['Willpower', 'Psyker']},
        influence: {advance: 0, cost: 0, aptitudes: []}
    },
    characteristicValues: {weaponSkill: 38, intelligence: 30, willpower: 34, fellowship: 29},
    skills: {
        athletics: {label: 'Athletics', advance: 0, starter: true, cost: 0, isSpecialist: false,
                    aptitudes: ['Strength', 'General']},
        logic: {label: 'Logic', advance: -20, starter: false, cost: 0, isSpecialist: false,
                aptitudes: ['Intelligence', 'Knowledge']},
        commonLore: {isSpecialist: true, aptitudes: ['Intelligence', 'Knowledge'], specialities: {
            imperialGuard: {label: 'Imperial Guard', advance: 0, starter: true, cost: 0},
            war: {label: 'War', advance: -20, starter: false, cost: 0}
        }}
    },
    talents: [{name: 'Iron Jaw', starter: true}],
    traits: []
});

test('a skill advance maps onto its rank ladder', () => {
    assert.equal(skillLevelIndex(-20), -1);
    assert.equal(skillLevelIndex(0), 0);
    assert.equal(skillLevelIndex(10), 1);
    assert.equal(skillLevelIndex(30), 3);
    assert.equal(skillLevelIndex(undefined), -1);
});

test('influence is never offered, because the book does not let it be bought', () => {
    // p. 79: "players cannot purchase advances in that characteristic".
    assert.equal(characteristicOffers(snapshot()).some(o => o.key === 'influence'), false);
});

test('a characteristic offers the next step at the price its aptitudes earn', () => {
    const offers = characteristicOffers(snapshot());
    assert.deepEqual(offers.find(o => o.key === 'weaponSkill'),
        {key: 'weaponSkill', steps: 0, matched: 2, nextLevel: 'simple', cost: 100, maxed: false});
    assert.equal(offers.find(o => o.key === 'intelligence').cost, 500, 'no matching aptitude');
});

test('a characteristic already at Expert is maxed, not offered a sixth step', () => {
    const subject = snapshot();
    subject.characteristics.weaponSkill.advance = 25;
    const offer = characteristicOffers(subject).find(o => o.key === 'weaponSkill');
    assert.equal(offer.maxed, true);
    assert.equal(offer.cost, null);
});

test('skills offer their next rank; a specialist skill offers only specialities already known', () => {
    const offers = skillOffers(snapshot());
    assert.deepEqual(offers.find(o => o.key === 'athletics'),
        {key: 'athletics', specKey: null, label: 'Athletics', matched: 2, level: 'known', nextLevel: 'trained',
         cost: 200, maxed: false});
    assert.equal(offers.find(o => o.key === 'logic').nextLevel, 'known');
    assert.ok(offers.some(o => o.specKey === 'imperialGuard'));
    assert.equal(offers.some(o => o.specKey === 'war'), false, 'an untrained speciality is bought by name instead');
});

test('prerequisites read characteristic thresholds and owned names, and admit what they cannot read', () => {
    const checks = checkPrerequisites('Weapon Skill 35, Iron Jaw, Psy rating', snapshot(), NAMES);
    assert.deepEqual(checks, [
        {text: 'Weapon Skill 35', status: 'met'},
        {text: 'Iron Jaw', status: 'met'},
        {text: 'Psy rating', status: 'unknown'}
    ]);
    assert.equal(checkPrerequisites('Willpower 50', snapshot(), NAMES)[0].status, 'unmet');
    assert.deepEqual(checkPrerequisites('None', snapshot(), NAMES), []);
    assert.deepEqual(checkPrerequisites('', snapshot(), NAMES), []);
});

test('a comma inside brackets does not split a prerequisite', () => {
    const checks = checkPrerequisites('Weapon Training (Las, Solid Projectile), Fellowship 30', snapshot(), NAMES);
    assert.equal(checks.length, 2);
    assert.equal(checks[0].text, 'Weapon Training (Las, Solid Projectile)');
});

test('talents are priced by tier and aptitudes; an unmet known prerequisite blocks, an unknown one does not', () => {
    const catalogue = [
        {name: 'Iron Jaw', tier: 1, aptitudes: 'Toughness, Defence', prerequisites: 'Toughness 40'},
        {name: 'Frenzy', tier: 1, aptitudes: 'Strength, Offence', prerequisites: 'None'},
        {name: 'Strong Minded', tier: 2, aptitudes: 'Willpower, Defence', prerequisites: 'Willpower 50'},
        {name: 'Warp Sense', tier: 2, aptitudes: 'Perception, Psyker', prerequisites: 'Psy rating'},
        {name: 'Weapon Training*', tier: 1, aptitudes: 'General, Finesse', prerequisites: 'None'},
        {name: 'Broken', tier: 0, aptitudes: 'General', prerequisites: 'None'}
    ];
    const offers = talentOffers(catalogue, {...snapshot(), talents: [...snapshot().talents, {name: 'Weapon Training (Las)'}]}, NAMES);
    assert.equal(offers.some(o => o.name === 'Iron Jaw'), false, 'already owned');
    assert.equal(offers.some(o => o.name === 'Broken'), false, 'no tier, no price');
    assert.equal(offers.find(o => o.name === 'Frenzy').cost, 200, 'two matching aptitudes');
    assert.equal(offers.find(o => o.name === 'Strong Minded').cost, 450, 'one matching aptitude');
    assert.equal(offers.find(o => o.name === 'Strong Minded').blocked, true);
    assert.equal(offers.find(o => o.name === 'Warp Sense').blocked, false, 'unreadable, so the player decides');
    assert.ok(offers.some(o => o.name === 'Weapon Training*'), 'a specialist talent can be taken again');
});

test('spending sums the recorded prices', () => {
    assert.equal(spentOn([{cost: 100}, {cost: 250}, {cost: '50'}]), 400);
    assert.equal(spentOn([]), 0);
    assert.equal(spentOn(undefined), 0);
});

test('buying a characteristic raises advance, not base, and writes the cumulative cost', () => {
    const subject = snapshot();
    const {update, record} = purchaseCharacteristic(subject, 'weaponSkill');
    assert.deepEqual(update, {'system.characteristics.weaponSkill.advance': 5,
                              'system.characteristics.weaponSkill.cost': 100});
    assert.equal(record.cost, 100);

    subject.characteristics.weaponSkill.advance = 5;
    subject.characteristics.weaponSkill.cost = 100;
    const second = purchaseCharacteristic(subject, 'weaponSkill');
    assert.equal(second.update['system.characteristics.weaponSkill.advance'], 10);
    assert.equal(second.update['system.characteristics.weaponSkill.cost'], 100 + 250, 'Simple then Intermediate');
    assert.equal(second.record.cost, 250);
});

test('buying a skill rank leaves a free starting rank out of the written cost', () => {
    // athletics is Known as a starter: Trained costs 200, and the Known rank costs nothing.
    const {update, record} = purchaseSkill(snapshot(), 'athletics');
    assert.deepEqual(update, {'system.skills.athletics.advance': 10, 'system.skills.athletics.cost': 200});
    assert.equal(record.cost, 200);
});

test('buying an untrained skill charges for Known', () => {
    const {update, record} = purchaseSkill(snapshot(), 'logic');
    assert.deepEqual(update, {'system.skills.logic.advance': 0, 'system.skills.logic.cost': 300});
    assert.equal(record.cost, 300);
});

test('a speciality rank is written under the speciality, not the skill', () => {
    const {update} = purchaseSkill(snapshot(), 'commonLore', 'imperialGuard');
    assert.equal(update['system.skills.commonLore.specialities.imperialGuard.advance'], 10);
});

test('a new speciality is bought at Known under a key of its own', () => {
    const {update, record} = purchaseNewSpeciality(snapshot(), 'commonLore', 'Tactica Imperialis', 'tacticaImperialis');
    assert.deepEqual(update['system.skills.commonLore.specialities.tacticaImperialis'],
        {label: 'Tactica Imperialis', advance: 0, starter: false, cost: 300});
    assert.equal(record.created, true);
    assert.equal(purchaseNewSpeciality(snapshot(), 'commonLore', 'War', 'war'), null, 'already on the list');
    assert.equal(purchaseNewSpeciality(snapshot(), 'athletics', 'X', 'x'), null, 'not a specialist skill');
});

test('nothing is bought past the top of a ladder', () => {
    const subject = snapshot();
    subject.skills.athletics.advance = 30;
    assert.equal(purchaseSkill(subject, 'athletics'), null);
    subject.characteristics.weaponSkill.advance = 25;
    assert.equal(purchaseCharacteristic(subject, 'weaponSkill'), null);
});

test('a refund puts the step back exactly, and only while it is still the top step', () => {
    const subject = snapshot();
    const {record} = purchaseCharacteristic(subject, 'weaponSkill');
    subject.characteristics.weaponSkill.advance = 5;
    subject.characteristics.weaponSkill.cost = 100;
    assert.deepEqual(refundUpdate(subject, record),
        {'system.characteristics.weaponSkill.advance': 0, 'system.characteristics.weaponSkill.cost': 0});

    // Another step was bought on top: refunding the lower one would leave a hole.
    subject.characteristics.weaponSkill.advance = 10;
    assert.equal(refundUpdate(subject, record), null);
});

test('refunding a created speciality removes it', () => {
    const {record} = purchaseNewSpeciality(snapshot(), 'commonLore', 'Tactica Imperialis', 'tacticaImperialis');
    assert.deepEqual(refundUpdate(snapshot(), record), {'system.skills.commonLore.specialities.-=tacticaImperialis': null});
});

test('prerequisite thresholds written as abbreviations are checked, not left for the player', () => {
    const names = {...NAMES, ...CHARACTERISTIC_ABBREVIATIONS};
    const checks = checkPrerequisites('WS 35, WP 40, Int 30', snapshot(), names);
    assert.deepEqual(checks.map(check => check.status), ['met', 'unmet', 'met']);
});

test('every abbreviation points at a real characteristic', async () => {
    const {CHARACTERISTIC_KEYS} = await import('../script/creation/origin-data.mjs');
    for (const [abbr, key] of Object.entries(CHARACTERISTIC_ABBREVIATIONS))
        assert.ok(CHARACTERISTIC_KEYS.includes(key), `${abbr} -> ${key}`);
});

test('a prerequisite with alternatives is met by any one of them', () => {
    const checks = checkPrerequisites('Willpower 50 or Weapon Skill 35, Willpower 50 or Fellowship 40', snapshot(), NAMES);
    assert.deepEqual(checks.map(check => check.status), ['met', 'unmet']);
    assert.equal(checkPrerequisites('Willpower 50 or Psy rating', snapshot(), NAMES)[0].status, 'unknown');
});

test('skill prerequisites are read from the rank the character holds', () => {
    const checks = checkPrerequisites('Athletics, Logic, Athletics +10, Common Lore (Imperial Guard), '
        + 'Rank 2 in the Athletics skill, Rank 1 in any Common Lore skill, Common Lore (War)', snapshot(), NAMES);
    assert.deepEqual(checks.map(check => check.status), ['met', 'unmet', 'unmet', 'met', 'unmet', 'met', 'unmet']);
    // "Rank 2 (Trained)" carries the rank name in brackets, and hyphens do not matter in names.
    const trained = {...snapshot(), skills: {...snapshot().skills,
        techUse: {label: 'Tech-Use', advance: 10, isSpecialist: false, aptitudes: []}}};
    assert.deepEqual(checkPrerequisites('Rank 2 (Trained) in Tech-Use skill, Tech Use +10', trained, NAMES)
        .map(check => check.status), ['met', 'met']);
    // "(Xenos-Any)" is any speciality under that heading; "(Any)" is any at all.
    const lore = {...snapshot(), skills: {forbiddenLore: {isSpecialist: true, aptitudes: [], specialities: {
        xenosEldar: {label: 'Xenos (Eldar)', advance: 0}}}}};
    assert.deepEqual(checkPrerequisites('Forbidden Lore (Xenos–Any), Forbidden Lore (Any), Forbidden Lore (Daemonology)', lore, NAMES)
        .map(check => check.status), ['met', 'met', 'unmet']);
});

test('a talent from the book the character lacks is unmet, not left for the player', () => {
    const subject = {...snapshot(), talentNames: new Set(['frenzy', 'resistance', 'iron jaw'])};
    assert.deepEqual(checkPrerequisites('Frenzy, Resistance (Fear), Iron Jaw', subject, NAMES)
        .map(check => check.status), ['unmet', 'unmet', 'met']);
});

test('talent offers know which prerequisite names are talents from the catalogue itself', () => {
    const catalogue = [
        {name: 'Frenzy', tier: 1, aptitudes: 'Strength, Offence', prerequisites: 'None'},
        {name: 'Crushing Blow', tier: 2, aptitudes: 'Weapon Skill, Offence', prerequisites: 'Frenzy'}
    ];
    assert.equal(talentOffers(catalogue, snapshot(), NAMES).find(o => o.name === 'Crushing Blow').blocked, true);
});
