import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const traitsOf = text => loadSystem().get('DarkHeresyUtil').extractWeaponTraits(text);

test('Snare keeps a negative value instead of disappearing', () => {
    // A bonus to the Snare test is written as a negative value. The pattern
    // demanded unsigned digits, so the quality parsed as absent and the target
    // was never asked to roll at all.
    assert.equal(traitsOf('Snare (-1)').snare, -1);
    assert.equal(traitsOf('Snare (-2)').snare, -2);
});

test('Snare still reads a positive value', () => {
    assert.equal(traitsOf('Snare (2)').snare, 2);
    assert.equal(traitsOf('Snare (1)').snare, 1);
});

test('a negative Snare is an integer, which is what gates the test roll', () => {
    // _rollWeaponEffectTest only fires when Number.isInteger(traits.snare).
    assert.equal(Number.isInteger(traitsOf('Snare (-1)').snare), true);
});

test('Snare alongside other qualities is still read correctly', () => {
    const traits = traitsOf('Tearing, Snare (-1), Felling (4)');
    assert.equal(traits.snare, -1);
    assert.equal(traits.felling, 4);
    assert.equal(traits.tearing, true);
});

test('other numbered qualities are unharmed by the signed read', () => {
    assert.equal(traitsOf('Felling (4)').felling, 4);
    assert.equal(traitsOf('Primitive (7)').primitive, 7);
    assert.equal(traitsOf('Proven (3)').proven, 3);
    assert.equal(traitsOf('Razor-Sharp, Toxic (2)').toxic, 2);
    assert.equal(traitsOf('Twin-Linked X1').twinLinked, true);
});
