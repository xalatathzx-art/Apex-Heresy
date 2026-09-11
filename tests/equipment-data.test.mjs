import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';
import {AVAILABILITY_ORDER, ARMOURY_TYPES, availableAtCreation, acquisitionAllowance, equipmentOffers}
    from '../script/creation/equipment-data.mjs';

test('the availability scale is the one the system shifts along', () => {
    const system = loadSystem();
    assert.deepEqual(AVAILABILITY_ORDER, Object.keys(system.get('Dh.availability')));
});

test('creation picks may be Scarce or better, and nothing unknown slips through (p. 82)', () => {
    for (const ok of ['ubiquitous', 'abundant', 'plentiful', 'common', 'average', 'scarce'])
        assert.equal(availableAtCreation(ok), true, ok);
    for (const no of ['rare', 'very-rare', 'unique', '', undefined, 'Scarce-ish'])
        assert.equal(availableAtCreation(no), false, String(no));
});

test('the number of picks is the starting Influence bonus', () => {
    assert.equal(acquisitionAllowance(37), 3);   // the book's own example
    assert.equal(acquisitionAllowance(9), 0);
    assert.equal(acquisitionAllowance(undefined), 0);
});

test('offers keep armoury items within reach, mark picks and stop at the allowance', () => {
    const catalogue = [
        {uuid: 'a', name: 'Laspistol', type: 'weapon', availability: 'common'},
        {uuid: 'b', name: 'Hellgun', type: 'weapon', availability: 'rare'},
        {uuid: 'c', name: 'Flak Vest', type: 'armour', availability: 'common'},
        {uuid: 'd', name: 'Psy Focus', type: 'gear', availability: 'scarce'},
        {uuid: 'e', name: 'Frenzy', type: 'talent', availability: 'common'}
    ];
    assert.ok(ARMOURY_TYPES.includes('weapon') && !ARMOURY_TYPES.includes('talent'));
    const offers = equipmentOffers(catalogue, [{uuid: 'c'}], {allowance: 2});
    assert.deepEqual(offers.map(o => o.name), ['Flak Vest', 'Laspistol', 'Psy Focus']);
    assert.equal(offers.find(o => o.uuid === 'c').picked, true);
    assert.equal(offers.find(o => o.uuid === 'a').allowed, true);
    const full = equipmentOffers(catalogue, [{uuid: 'c'}, {uuid: 'a'}], {allowance: 2});
    assert.equal(full.find(o => o.uuid === 'd').allowed, false, 'the allowance is spent');
    assert.equal(full.find(o => o.uuid === 'a').picked, true);
});

test('a name opening with quotation marks sorts by its first word', () => {
    const catalogue = [
        {uuid: 'q', name: '“Emperor’s Wrath” Shard Bolts', type: 'ammunition', availability: 'scarce'},
        {uuid: 'a', name: 'Amasec', type: 'drug', availability: 'average'},
        {uuid: 'z', name: 'Zweihander', type: 'weapon', availability: 'common'}
    ];
    assert.deepEqual(equipmentOffers(catalogue, [], {allowance: 3}).map(o => o.uuid), ['a', 'q', 'z']);
});
