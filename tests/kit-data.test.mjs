import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {UNIVERSAL_KIT, ADDITIONAL_KIT, kitPoints, KIT_POINTS} from '../script/creation/kit-data.mjs';

const packNames = new Set(readdirSync(new URL('../packs-src/only-war/', import.meta.url))
    .filter(file => file.endsWith('.json') && file !== 'folders.json')
    .flatMap(file => JSON.parse(readFileSync(new URL(`../packs-src/only-war/${file}`, import.meta.url), 'utf8')))
    .map(item => item.name));

const names = kit => [...(kit.mainWeapon ?? []), ...(kit.armour ?? []), ...(kit.items ?? [])].map(entry => entry.name);

test('the universal kit is the book list, with the items the pack has as items (p. 68)', () => {
    assert.deepEqual(names(UNIVERSAL_KIT), ['Laspistol', 'Charge Pack (Pistol)', 'Flak Vest', 'Knife',
        'Glow-globe/Lamp Pack', 'Uplifting Primer']);
    assert.match(UNIVERSAL_KIT.text, /uniform/);
    assert.match(UNIVERSAL_KIT.text, /two weeks/);
});

test('kit points are 30, plus 2 for each regiment point left, unless the home world sets its own (p. 68)', () => {
    assert.equal(KIT_POINTS, 30);
    assert.equal(kitPoints({unusedRegimentPoints: 0}), 30);
    assert.equal(kitPoints({unusedRegimentPoints: 2}), 34);
    assert.equal(kitPoints({unusedRegimentPoints: 1, base: 15}), 17, 'Penal Colony: Scum and Villainy');
});

test('Table 2-6 has every row at its printed cost and limit (p. 69)', () => {
    assert.equal(ADDITIONAL_KIT.length, 48);
    const row = key => ADDITIONAL_KIT.find(entry => entry.key === key);
    assert.deepEqual([row('goodCraftsmanship').cost, row('bestCraftsmanship').cost], [5, 10]);
    assert.deepEqual([row('extraKrakGrenade').cost, row('extraKrakGrenade').limit], [15, 2]);
    assert.deepEqual([row('frenzon').cost, row('frenzon').requires], [20, {doctrine: 'combatDrugs'}]);
    assert.deepEqual(row('combatShotgun').requires, {regimentType: ['lineInfantry', 'lightInfantry', 'siegeInfantry', 'dropTroops']});
    assert.deepEqual(row('puritySeals').requires, {homeWorld: 'penitent'});
    assert.equal(row('favouredHeavyWeapon').cost, 15);
    assert.deepEqual(ADDITIONAL_KIT.filter(entry => entry.effect.type === 'availability').map(entry => entry.cost),
        [1, 2, 3, 5, 8, 10, 15, 20]);
    assert.equal(new Set(ADDITIONAL_KIT.map(entry => entry.key)).size, 48, 'keys are unique');
});

test('every item the kit hands out by name exists in the Only War pack', () => {
    const granted = [...names(UNIVERSAL_KIT),
        ...ADDITIONAL_KIT.flatMap(entry => [...(entry.effect.items ?? []), ...(entry.effect.replace ?? [])].map(item => item.name))];
    assert.deepEqual(granted.filter(name => !packNames.has(name)), []);
});

test('regiment type and doctrine kit names in the component data exist in the Only War pack', () => {
    const components = JSON.parse(readFileSync(new URL('../packs-src/origins/04-ow-regiment-components.json', import.meta.url), 'utf8'));
    const granted = components.flatMap(item => names(item.system.rules?.kit ?? {}));
    assert.ok(granted.length > 10);
    assert.deepEqual(granted.filter(name => !packNames.has(name)), []);
});
