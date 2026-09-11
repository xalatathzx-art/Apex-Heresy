import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ELITE_ADVANCES, eliteKeysIn, eliteText, eliteTextWithout, eliteOffers, elitePlan}
    from '../script/creation/elite-data.mjs';
import {ELITE_ADVANCE_KEYS} from '../script/creation/origin-data.mjs';

const NAMES = {willpower: 'willpower', fellowship: 'fellowship'};
const snapshot = (extra = {}) => ({characteristicValues: {willpower: 42, fellowship: 30}, skills: {},
    talents: [], traits: [], elite: new Set(), ...extra});

test('the creation elite advances are the two the book allows at creation, priced as printed', () => {
    // Inquisitor (p. 88) is raised by an existing Inquisitor's decree, not chosen at creation.
    assert.deepEqual(ELITE_ADVANCES.map(e => [e.key, e.cost]), [['psyker', 300], ['untouchable', 300]]);
    for (const entry of ELITE_ADVANCES) assert.ok(ELITE_ADVANCE_KEYS.includes(entry.key), entry.key);
});

test('the sheet elite field is read and written as a list of names', () => {
    assert.deepEqual([...eliteKeysIn('Psyker')], ['psyker']);
    assert.deepEqual([...eliteKeysIn('psyker, Untouchable; Something Else')], ['psyker', 'untouchable']);
    assert.deepEqual([...eliteKeysIn('')], []);
    assert.equal(eliteText('', 'Psyker'), 'Psyker');
    assert.equal(eliteText('Inquisitor', 'Psyker'), 'Inquisitor, Psyker');
    assert.equal(eliteText('Psyker', 'Psyker'), 'Psyker');
    assert.equal(eliteTextWithout('Inquisitor, Psyker', 'Psyker'), 'Inquisitor');
});

test('Psyker needs Willpower 40, and a psyker cannot become Untouchable nor the reverse', () => {
    const offers = eliteOffers(snapshot(), NAMES);
    assert.equal(offers.find(o => o.key === 'psyker').blocked, false);
    assert.equal(eliteOffers(snapshot({characteristicValues: {willpower: 35}}), NAMES)
        .find(o => o.key === 'psyker').blocked, true);
    const psyker = eliteOffers(snapshot({elite: new Set(['psyker'])}), NAMES);
    assert.equal(psyker.find(o => o.key === 'psyker').owned, true);
    assert.equal(psyker.find(o => o.key === 'untouchable').excluded, true);
    assert.equal(psyker.find(o => o.key === 'untouchable').blocked, true);
});

test('an unsanctioned psyker gains the trait, the aptitude, psy rating 1 and 1d10+3 Corruption', () => {
    assert.deepEqual(elitePlan('psyker'), {
        key: 'psyker', name: 'Psyker', cost: 300,
        traits: [{name: 'Psyker', cost: 300}], talents: [], specialAbilities: [],
        aptitudes: ['Psyker'], psyRating: 1, corruption: '1d10+3'
    });
});

test('a sanctioned psyker starts at psy rating 2 with no Corruption; a free advance costs nothing', () => {
    const riders = [{elite: 'psyker', traits: [{name: 'Sanctioned'}]}, {elite: 'untouchable', traits: [{name: 'Other'}]}];
    const plan = elitePlan('psyker', {free: true, riders});
    assert.equal(plan.cost, 0);
    assert.deepEqual(plan.traits, [{name: 'Psyker', cost: 0}, {name: 'Sanctioned', cost: 0}]);
    assert.equal(plan.psyRating, 2);
    assert.equal(plan.corruption, null);
    // Already Sanctioned from elsewhere: the rule still applies, the trait is not granted twice.
    const owned = elitePlan('psyker', {traits: ['Sanctioned']});
    assert.equal(owned.psyRating, 2);
    assert.deepEqual(owned.traits.map(t => t.name), ['Psyker']);
});

test('an Untouchable gains Resistance (Psychic Powers), and the price sits on the advance itself', () => {
    assert.deepEqual(elitePlan('untouchable'), {
        key: 'untouchable', name: 'Untouchable', cost: 300,
        traits: [], talents: ['Resistance (Psychic Powers)'],
        specialAbilities: [{name: 'Untouchable', cost: 300}],
        aptitudes: [], psyRating: null, corruption: null
    });
    assert.equal(elitePlan('inquisitor'), null);
});
