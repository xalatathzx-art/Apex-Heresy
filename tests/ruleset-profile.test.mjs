import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

test('every supported book has a ruleset profile', () => {
    const rulesets = loadSystem().get('Dh.rulesets');
    assert.deepEqual(Object.keys(rulesets).sort(), ['bc', 'dh2', 'dw', 'ow', 'rt']);
    for (const [key, profile] of Object.entries(rulesets)) {
        assert.equal(profile.id, key);
        for (const field of ['fatigue', 'psychic', 'corruption', 'insanity', 'bloodLoss', 'toxic', 'righteousFury'])
            assert.ok(profile[field], `${key} has no ${field}`);
    }
});

test('an explicit ruleset on the character wins over the actor type', () => {
    const rulesetFor = loadSystem().get('Dh.rulesetFor');
    assert.equal(rulesetFor({type: 'acolyte', system: {ruleset: 'dw'}}).id, 'dw');
    assert.equal(rulesetFor({type: 'heretic', system: {ruleset: 'rt'}}).id, 'rt');
});

test('the actor type still decides when the character names no ruleset', () => {
    const rulesetFor = loadSystem().get('Dh.rulesetFor');
    assert.equal(rulesetFor({type: 'acolyte', system: {ruleset: ''}}).id, 'dh2');
    assert.equal(rulesetFor({type: 'heretic', system: {}}).id, 'bc');
    assert.equal(rulesetFor({type: 'npc', system: {ruleset: 'bc'}}).id, 'bc');
});

test('an unknown ruleset falls back instead of returning undefined', () => {
    assert.equal(loadSystem().get('Dh.rulesetFor')({type: 'acolyte', system: {ruleset: 'dh9'}}).id, 'dh2');
});

test('the inherited profiles are independent copies, not shared references', () => {
    const rulesets = loadSystem().get('Dh.rulesets');
    // Auditing one book must not edit Dark Heresy through a shared sub-object.
    for (const book of ['rt', 'ow'])
        assert.notEqual(rulesets[book].fatigue, rulesets.dh2.fatigue, book);
    // Spread both sides: the profiles live in the vm realm and the clone in the host realm,
    // so deepStrictEqual would compare prototypes rather than the rules we care about.
    assert.deepEqual({...rulesets.ow.fatigue}, {...rulesets.dh2.fatigue});
    assert.deepEqual({...rulesets.ow.corruption}, {...rulesets.dh2.corruption});
    // Only War is the last honest clone. Deathwatch and Rogue Trader have been read
    // against their own books and keep only what those books actually share.
    assert.notDeepEqual({...rulesets.dw.corruption}, {...rulesets.dh2.corruption});
    assert.notDeepEqual({...rulesets.rt.fatigue}, {...rulesets.dh2.fatigue});
    // What Rogue Trader has not been read for still has to be a copy, not a link:
    // the insanity track is the same in both books, and editing one must not move
    // the other.
    assert.notEqual(rulesets.rt.insanity, rulesets.dh2.insanity);
    assert.deepEqual({...rulesets.rt.insanity}, {...rulesets.dh2.insanity});
});

test('both character types carry the ruleset field', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    for (const type of ['acolyte', 'heretic']) assert.equal(data.Actor[type].ruleset, '');
});
