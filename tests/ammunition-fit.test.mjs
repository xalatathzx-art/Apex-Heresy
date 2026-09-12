import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyAmmunition} from '../script/data/ammunition-fit.mjs';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';
import {loadSystem} from './helpers/system.mjs';

test('ammunition named after its weapon is classified by the weapon rules', () => {
    assert.equal(classifyAmmunition('Standard Lasgun Cell'), 'las');
    assert.equal(classifyAmmunition('Standard Bolt Pistol Clip'), 'bolt');
    assert.equal(classifyAmmunition('Standard Autogun Clip'), 'solidProjectile');
    assert.equal(classifyAmmunition('Standard Plasma Gun Clip'), 'plasma');
});

test('las ammunition is recognised by what it is called, not by "las"', () => {
    // A las weapon says "las"; its ammunition says "Charge Pack" or "Cell".
    assert.equal(classifyAmmunition('Hot-Shot Charge Packs'), 'las');
    assert.equal(classifyAmmunition('Standard Lascarabine Cell'), 'las');
});

test('bolt ammunition is recognised as bolts', () => {
    assert.equal(classifyAmmunition('Purity Bolts'), 'bolt');
    assert.equal(classifyAmmunition('Abyssal Bolts'), 'bolt');
    assert.equal(classifyAmmunition('Psybolts'), 'bolt');
});

test('bolt shells are bolt rounds, not shotgun shells', () => {
    assert.equal(classifyAmmunition('Tempest Bolt Shells'), 'bolt');
    assert.equal(classifyAmmunition('Theta-Pattern Shock Bolts'), 'bolt');
});

test('generic solid-projectile wording is recognised', () => {
    assert.equal(classifyAmmunition('Dumdum Bullets'), 'solidProjectile');
    assert.equal(classifyAmmunition('Man-Stopper Bullets'), 'solidProjectile');
    assert.equal(classifyAmmunition('Slug Shells'), 'solidProjectile');
});

test('primitive ammunition is recognised', () => {
    assert.equal(classifyAmmunition('Standard Arrow'), 'primitive');
    assert.equal(classifyAmmunition('Silver Stakes'), 'primitive');
});

test('ammunition whose weapon cannot be named stays universal', () => {
    assert.equal(classifyAmmunition('Sanctified Ammunition'), null);
    assert.equal(classifyAmmunition(''), null);
});

// ── Writing it into the pack ──────────────────────────────────────────────

const ammo = name => ({type: 'ammunition', name, system: {weaponTypes: [], quantity: 1}});

test('the patch records what a round fits', () => {
    const {doc, changed} = fixDocument(ammo('Standard Lasgun Cell'));
    assert.equal(changed, true);
    assert.deepEqual(doc.system.weaponTypes, ['las']);
});

test('an unplaceable round keeps an empty list, which means fits anything', () => {
    const {doc} = fixDocument(ammo('Sanctified Ammunition'));
    assert.deepEqual(doc.system.weaponTypes, []);
});

test('the patch is idempotent', () => {
    const once = fixDocument(ammo('Standard Lasgun Cell'));
    assert.equal(fixDocument(once.doc).changed, false);
});

test('a list a GM already filled in is not overwritten', () => {
    const tagged = {type: 'ammunition', name: 'Standard Lasgun Cell',
                    system: {weaponTypes: ['bolt'], quantity: 1}};
    const {doc, changed} = fixDocument(tagged);
    assert.deepEqual(doc.system.weaponTypes, ['bolt']);
    assert.equal(changed, false);
});

// ── The whole chain ───────────────────────────────────────────────────────

test('a patched weapon and a patched round agree, which is the reported failure', () => {
    // The report: "the automated reload for a Lasgun failed to recognise either
    // Standard ammunition or a Hot-Shot charge pack, and adding categories to
    // the ammunition did not fix it." It could not: the weapon had no type to
    // match against. Both halves are patched, so the matcher can finally answer.
    const util = loadSystem().get('DarkHeresyUtil');
    const patch = doc => fixDocument(doc).doc;

    const lasgun = patch({type: 'weapon', name: 'Lasgun', system: {type: '', class: 'basic'}});
    const boltPistol = patch({type: 'weapon', name: 'Bolt Pistol', system: {type: '', class: 'pistol'}});
    const cell = patch(ammo('Standard Lasgun Cell'));
    const hotShot = patch(ammo('Hot-Shot Charge Packs'));
    const boltClip = patch(ammo('Standard Bolt Pistol Clip'));

    assert.equal(util.ammunitionFitsWeapon(cell, lasgun), true, 'a cell fits a lasgun');
    assert.equal(util.ammunitionFitsWeapon(hotShot, lasgun), true, 'so does a hot-shot pack');
    assert.equal(util.ammunitionFitsWeapon(boltClip, boltPistol), true, 'bolts fit a bolt pistol');
    assert.equal(util.ammunitionFitsWeapon(boltClip, lasgun), false, 'bolts do not fit a lasgun');
    assert.equal(util.ammunitionFitsWeapon(cell, boltPistol), false, 'a cell does not fit a bolt pistol');
});

test('an unplaceable round still fits everything, so nothing is locked out', () => {
    const util = loadSystem().get('DarkHeresyUtil');
    const lasgun = fixDocument({type: 'weapon', name: 'Lasgun', system: {type: '', class: 'basic'}}).doc;
    const generic = fixDocument(ammo('Sanctified Ammunition')).doc;
    assert.equal(util.ammunitionFitsWeapon(generic, lasgun), true);
});
