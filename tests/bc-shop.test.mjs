import {test} from 'node:test';
import assert from 'node:assert/strict';
import {characteristicOffers, skillOffers, talentOffers, purchaseCharacteristic, purchaseSkill,
    unpurchasableIn} from '../script/creation/shop-data.mjs';
import {catalogueOffers} from '../script/creation/psychic-data.mjs';
import {advanceCost} from '../script/creation/advancement-data.mjs';

const NAMES = {willpower: 'willpower', toughness: 'toughness'};

const snapshot = (patron = 'undivided', extra = {}) => ({
    ruleset: 'bc', patron, aptitudes: new Set(),
    characteristics: {
        strength: {advance: 0, cost: 0, aptitudes: []},          // Khorne
        toughness: {advance: 0, cost: 0, aptitudes: []},         // Nurgle
        fellowship: {advance: 0, cost: 0, aptitudes: []},        // Slaanesh
        willpower: {advance: 0, cost: 0, aptitudes: []},         // Tzeentch
        agility: {advance: 0, cost: 0, aptitudes: []},           // unaligned
        influence: {advance: 0, cost: 0, base: 24, total: 24, aptitudes: []}
    },
    characteristicValues: {willpower: 40, toughness: 40},
    skills: {
        athletics: {label: 'Athletics', advance: 0, starter: true, isSpecialist: false, aptitudes: []},
        charm: {label: 'Charm', advance: -20, isSpecialist: false, aptitudes: []},
        awareness: {label: 'Awareness', advance: -20, isSpecialist: false, aptitudes: []}
    },
    talents: [], traits: [], powers: [], ...extra
});

test('a characteristic costs what its god is worth to the patron (Table 2-6, p. 78)', () => {
    const khorne = characteristicOffers(snapshot('khorne'));
    assert.equal(khorne.find(o => o.key === 'strength').cost, 100, 'Strength is True for Khorne');
    assert.equal(khorne.find(o => o.key === 'toughness').cost, 250, 'Nurgle is his ally');
    assert.equal(khorne.find(o => o.key === 'fellowship').cost, 500, 'Slaanesh opposes him');
    assert.equal(khorne.find(o => o.key === 'agility').cost, 250, 'the unaligned are allies');
    const none = characteristicOffers(snapshot());
    assert.equal(none.find(o => o.key === 'strength').cost, 250, 'the undivided pay the allied price');
    assert.deepEqual(none.map(o => o.relation).filter(r => r !== 'own'), Array(5).fill('ally'),
        'the undivided call every god an ally');
});

test('Infamy is bought at a flat 500 until it reaches 40 (p. 78)', () => {
    const offer = characteristicOffers(snapshot()).find(o => o.key === 'influence');
    assert.deepEqual({cost: offer.cost, maxed: offer.maxed, infamy: offer.infamy},
        {cost: 500, maxed: false, infamy: true});
    const rich = snapshot();
    rich.characteristics.influence = {advance: 15, cost: 1500, base: 25, total: 40, aptitudes: []};
    const maxed = characteristicOffers(rich).find(o => o.key === 'influence');
    assert.equal(maxed.maxed, true, 'past 40 Infamy is earned, not bought');
    assert.equal(maxed.cost, null);
    assert.deepEqual(unpurchasableIn('bc'), [], 'Infamy is the one characteristic Dark Heresy would refuse');
    assert.deepEqual(unpurchasableIn('dh2'), ['influence']);
});

test('buying Infamy writes the flat cumulative price, not a ladder', () => {
    const subject = snapshot();
    subject.characteristics.influence = {advance: 5, cost: 500, base: 24, total: 29, aptitudes: []};
    const {update, record} = purchaseCharacteristic(subject, 'influence');
    assert.equal(update['system.characteristics.influence.advance'], 10);
    assert.equal(update['system.characteristics.influence.cost'], 1000, 'two steps at 500');
    assert.equal(record.cost, 500);
});

test('a skill costs by its god too (Table 2-7, pp. 78-79)', () => {
    const tzeentch = skillOffers(snapshot('tzeentch'));
    assert.equal(tzeentch.find(o => o.key === 'charm').cost, 200, 'Charm is Slaanesh, who is his ally');
    assert.equal(tzeentch.find(o => o.key === 'athletics').cost, 500,
        'Athletics is Khorne, opposed, and the second rank at that');
    assert.equal(tzeentch.find(o => o.key === 'awareness').cost, 200, 'Awareness has no god');
    const slaanesh = skillOffers(snapshot('slaanesh'));
    assert.equal(slaanesh.find(o => o.key === 'charm').cost, 100, 'his own, at the Known rank');
    assert.equal(slaanesh.find(o => o.key === 'athletics').cost, 500,
        'Athletics is Khorne, opposed; and the second rank at that');
});

test('buying a skill rank charges the patron price cumulatively', () => {
    const {update} = purchaseSkill(snapshot('slaanesh'), 'charm');
    assert.equal(update['system.skills.charm.advance'], 0, 'Untrained becomes Known');
    assert.equal(update['system.skills.charm.cost'], 100);
    assert.equal(advanceCost('skill', 'known', 0, 'bc', 'own'), 100);
});

test('a talent costs by its tier and its god (Table 2-9, p. 79)', () => {
    const catalogue = [
        {name: 'Frenzy', uuid: 'a', tier: 1, prerequisites: '', patron: 'khorne'},
        {name: 'Jaded', uuid: 'b', tier: 1, prerequisites: '', patron: 'nurgle'},
        {name: 'Quick Draw', uuid: 'c', tier: 1, prerequisites: '', patron: 'undivided'},
        {name: 'Crushing Blow', uuid: 'd', tier: 3, prerequisites: '', patron: 'khorne'}
    ];
    const offers = talentOffers(catalogue, snapshot('khorne'), NAMES);
    const price = name => offers.find(o => o.name === name).cost;
    assert.equal(price('Frenzy'), 200, 'his own, tier one');
    assert.equal(price('Jaded'), 250, 'Nurgle is allied');
    assert.equal(price('Quick Draw'), 250, 'the unaligned are allied');
    assert.equal(price('Crushing Blow'), 400, 'his own, tier three');
    const slaanesh = talentOffers(catalogue, snapshot('slaanesh'), NAMES);
    assert.equal(slaanesh.find(o => o.name === 'Frenzy').cost, 500, 'Khorne opposes Slaanesh');
});

test('a talent the pack left unmarked still knows its god from the book', () => {
    const catalogue = [{name: 'Frenzy', uuid: 'a', tier: 1, prerequisites: '', patron: 'undivided'}];
    const offers = talentOffers(catalogue, snapshot('khorne'), NAMES);
    assert.equal(offers[0].cost, 200, 'Table 2-10 says Frenzy is Khorne, whatever the card says');
    assert.equal(offers[0].relation, 'own');
});

test('an aligned power is sold only to that god\'s devoted (p. 79)', () => {
    const catalogue = [
        {name: 'Rain of Foulness', uuid: 'a', cost: 300, prerequisite: '', patron: 'nurgle', discipline: 'Nurgle'},
        {name: 'Force Bolt', uuid: 'b', cost: 200, prerequisite: '', patron: 'undivided', discipline: 'Telekinesis'}
    ];
    const flat = catalogueOffers(catalogue, snapshot(), NAMES).flatMap(group => group.powers);
    assert.equal(flat.find(p => p.name === 'Rain of Foulness').blocked, true, 'the undivided may not');
    assert.equal(flat.find(p => p.name === 'Force Bolt').blocked, false);

    const nurgle = catalogueOffers(catalogue, snapshot('nurgle'), NAMES).flatMap(group => group.powers);
    assert.equal(nurgle.find(p => p.name === 'Rain of Foulness').blocked, false, 'his own god\'s power');
    assert.equal(nurgle.find(p => p.name === 'Rain of Foulness').cost, 300, 'priced from its own entry');
});

test('Khorne suffers no witches: aligned to him, nothing psychic can be bought (p. 79)', () => {
    const catalogue = [
        {name: 'Force Bolt', uuid: 'b', cost: 200, prerequisite: '', patron: 'undivided', discipline: 'Telekinesis'}
    ];
    const powers = catalogueOffers(catalogue, snapshot('khorne'), NAMES).flatMap(group => group.powers);
    assert.equal(powers[0].blocked, true);
    assert.match(powers[0].prerequisites.map(check => check.text).join(' '), /Khorne/);
});
