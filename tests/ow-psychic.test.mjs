import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogueOffers, psychicOffersFor, psyBase, psyRatingCost} from '../script/creation/psychic-data.mjs';
import {checkPrerequisites} from '../script/creation/shop-data.mjs';

const NAMES = {toughness: 'toughness', strength: 'strength'};
const catalogue = [
    {name: 'Smite', uuid: 'a', cost: 200, prerequisite: 'None', discipline: 'Biomancy'},
    {name: 'Endurance', uuid: 'b', cost: 300, prerequisite: 'Toughness 30+', discipline: 'Biomancy'},
    {name: 'Iron Arm', uuid: 'c', cost: 400, prerequisite: 'Endurance, Strength 35+, Toughness 35+', discipline: 'Biomancy'},
    {name: 'Warp Speed', uuid: 'd', cost: 500, prerequisite: 'Psy Rating 5', discipline: 'Biomancy'}
];
const snapshot = (extra = {}) => ({ruleset: 'ow', characteristicValues: {toughness: 36, strength: 30},
    skills: {}, talents: [], traits: [{name: 'Psyker'}], psyRating: 2, psyCost: 0, powers: [], ...extra});

test('Only War prices a power from its own entry and checks its prerequisites (p. 229)', () => {
    const [biomancy] = catalogueOffers(catalogue, snapshot(), NAMES);
    assert.equal(biomancy.label, 'Biomancy');
    const find = name => biomancy.powers.find(power => power.name === name);
    assert.equal(find('Smite').cost, 200);
    assert.equal(find('Smite').blocked, false);
    assert.equal(find('Endurance').blocked, false, 'Toughness 36 meets 30+');
    assert.equal(find('Iron Arm').blocked, true, 'Strength 30 does not meet 35+');
    assert.equal(find('Warp Speed').blocked, true, 'psy rating 2 does not meet 5');
    assert.equal(find('Smite').accessible, true, 'Only War has no discipline trees');
});

test('a power that another power requires is met once it is owned', () => {
    const owned = snapshot({powers: ['Endurance'], characteristicValues: {toughness: 36, strength: 40}});
    assert.deepEqual(checkPrerequisites('Endurance', owned, NAMES).map(check => check.status), ['met']);
    const [biomancy] = catalogueOffers(catalogue, owned, NAMES);
    assert.equal(biomancy.powers.find(power => power.name === 'Iron Arm').blocked, false);
    assert.equal(biomancy.powers.find(power => power.name === 'Endurance').owned, true);
});

test('the ruleset decides whether powers hang on trees', () => {
    const dark = psychicOffersFor('dh2', [{name: 'Smite', uuid: 'a', prerequisite: 'Willpower 40'}], snapshot({ruleset: 'dh2'}), NAMES);
    assert.equal(dark.length, 5, 'Dark Heresy has five discipline trees');
    const only = psychicOffersFor('ow', catalogue, snapshot(), NAMES);
    assert.equal(only.length, 1, 'Only War lists what the pack holds');
});

test('a sanctioned psyker of Only War starts at psy rating 2 for free', () => {
    assert.equal(psyBase([{name: 'Psyker'}], 'ow'), 2);
    assert.equal(psyBase([{name: 'Psyker'}], 'dh2'), 1);
    assert.equal(psyBase([{name: 'Psyker'}, {name: 'Sanctioned'}], 'dh2'), 2);
    assert.equal(psyRatingCost(3, psyBase([{name: 'Psyker'}], 'ow')), 600, '200 x the new rating (p. 95)');
});
