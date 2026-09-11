import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DISCIPLINES, psyRatingCost, psyBase, powerAccessible, psychicOffers, psyRatingOffer, purchasePsyRating}
    from '../script/creation/psychic-data.mjs';
import {checkPrerequisites, refundUpdate} from '../script/creation/shop-data.mjs';

const NAMES = {'willpower': 'willpower', 'toughness': 'toughness', 'perception': 'perception', 'strength': 'strength'};

const snapshot = (extra = {}) => ({
    characteristicValues: {willpower: 42, toughness: 36, perception: 31, strength: 30},
    skills: {psyniscience: {label: 'Psyniscience', advance: 0, isSpecialist: false, aptitudes: []}},
    talents: [], traits: [{name: 'Psyker'}],
    psyRating: 1, psyCost: 0, powers: [],
    ...extra
});

test('the five core disciplines carry every power on their trees, with its book value', () => {
    assert.deepEqual(DISCIPLINES.map(d => d.key), ['biomancy', 'divination', 'pyromancy', 'telekinesis', 'telepathy']);
    for (const discipline of DISCIPLINES) {
        assert.equal(discipline.powers.length, 9, discipline.key);
        const names = new Set(discipline.powers.map(p => p.name));
        // Exactly one root, and every parent is a power of the same tree.
        assert.equal(discipline.powers.filter(p => !p.parents.length).length, 1, `${discipline.key} root`);
        for (const power of discipline.powers) {
            for (const parent of power.parents) assert.ok(names.has(parent), `${power.name} <- ${parent}`);
            assert.ok([100, 200, 300, 400, 500].includes(power.value), `${power.name} ${power.value}`);
        }
    }
    const value = name => DISCIPLINES.flatMap(d => d.powers).find(p => p.name === name).value;
    assert.equal(value('Smite'), 200);
    assert.equal(value('Warp Speed'), 500);
    assert.equal(value('Telepathic Link'), 100);
});

test('psy rating advances cost 200 times the new rating, counted from the free starting rating', () => {
    assert.equal(psyRatingCost(1, 1), 0);
    assert.equal(psyRatingCost(2, 1), 400);
    assert.equal(psyRatingCost(3, 1), 1000);           // 400 + 600, the book's example
    assert.equal(psyRatingCost(2, 2), 0, 'a sanctioned psyker starts at 2 for free');
    assert.equal(psyRatingCost(3, 2), 600);
    assert.equal(psyRatingCost(0, 1), 0);
});

test('the Sanctioned trait moves the free starting rating to 2', () => {
    assert.equal(psyBase([{name: 'Psyker'}]), 1);
    assert.equal(psyBase([{name: 'Psyker'}, {name: 'Sanctioned'}]), 2);
});

test('a power is reachable from the top of its tree through a power the character owns', () => {
    const biomancy = DISCIPLINES.find(d => d.key === 'biomancy');
    const power = name => biomancy.powers.find(p => p.name === name);
    assert.equal(powerAccessible(power('Invigourate'), new Set()), true, 'the top power is always open');
    assert.equal(powerAccessible(power('Smite'), new Set()), false);
    assert.equal(powerAccessible(power('Smite'), new Set(['invigourate'])), true);
    // Warp Speed hangs under both Iron Arm and Endurance; either path opens it.
    assert.equal(powerAccessible(power('Warp Speed'), new Set(['endurance'])), true);
});

test('psy rating prerequisites are read from the character', () => {
    assert.equal(checkPrerequisites('Psy rating 3', snapshot(), NAMES)[0].status, 'unmet');
    assert.equal(checkPrerequisites('Psy Rating 3', snapshot({psyRating: 3}), NAMES)[0].status, 'met');
});

test('power offers combine tree access, prerequisites and price', () => {
    const catalogue = [
        {name: 'Invigourate', uuid: 'a', prerequisite: 'Toughness 30'},
        {name: 'Smite', uuid: 'b', prerequisite: 'Willpower 40'},
        {name: 'Enfeeble', uuid: 'c', prerequisite: 'Toughness 35'},
        {name: 'Vortex Explosion', uuid: 'x', prerequisite: 'None'}
    ];
    const offers = psychicOffers(catalogue, snapshot({powers: ['Invigourate']}), NAMES);
    const biomancy = offers.find(d => d.key === 'biomancy');
    const find = name => biomancy.powers.find(p => p.name === name);
    assert.equal(find('Invigourate').owned, true);
    assert.equal(find('Smite').accessible, true);
    assert.equal(find('Smite').blocked, false);
    assert.equal(find('Smite').cost, 200);
    assert.equal(find('Enfeeble').accessible, false, 'Enfeeble needs Smite first');
    assert.equal(find('Enfeeble').blocked, true);
    assert.equal(find('Iron Arm').uuid, null, 'a power missing from the pack is listed but cannot be bought');
    assert.equal(offers.flatMap(d => d.powers).some(p => p.name === 'Vortex Explosion'), false,
        'powers outside the core trees are not offered');
});

test('buying psy rating raises it by one and rewrites the cumulative cost; refunding undoes it', () => {
    const subject = snapshot({psyRating: 2, psyCost: 400});
    assert.deepEqual(psyRatingOffer(subject), {rating: 2, next: 3, cost: 600, maxed: false, base: 1});
    const {update, record} = purchasePsyRating(subject);
    assert.deepEqual(update, {'system.psy.rating': 3, 'system.psy.cost': 1000});
    assert.equal(record.cost, 600);
    assert.deepEqual(refundUpdate({...subject, psyRating: 3, psyCost: 1000}, record),
        {'system.psy.rating': 2, 'system.psy.cost': 400});
    assert.equal(refundUpdate({...subject, psyRating: 4, psyCost: 1800}, record), null, 'only the top step comes back');
    assert.equal(psyRatingOffer(snapshot({psyRating: 10})).maxed, true);
});

test('the sheet charges psy rating by the same rule the wizard does', async () => {
    const {readFileSync} = await import('node:fs');
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /psyRatingCost\(this\.psy\.rating, psyBase\(traits, Dh\.rulesetFor\(this\)\.id\)\)/,
        '_computeExperience_auto must count psy rating from the free starting rating');
});
