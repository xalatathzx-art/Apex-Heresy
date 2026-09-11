import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';

const read = file => JSON.parse(readFileSync(new URL(`../packs-src/origins/${file}`, import.meta.url), 'utf8'));
const regiments = read('05-ow-regiments.json');
const components = read('04-ow-regiment-components.json');
const component = key => components.find(item => item.system.key === key);

const packNames = new Set(readdirSync(new URL('../packs-src/only-war/', import.meta.url))
    .filter(file => file.endsWith('.json') && file !== 'folders.json')
    .flatMap(file => JSON.parse(readFileSync(new URL(`../packs-src/only-war/${file}`, import.meta.url), 'utf8')))
    .map(item => item.name));

const regiment = name => normaliseOrigin(regiments.find(item => item.name.startsWith(name)).system);

test('the eight pre-made regiments are valid origins of the regiment stage', () => {
    assert.equal(regiments.length, 8);
    for (const item of regiments) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'regiment', item.name);
        assert.match(item.system.source, /^Only War, p\. \d+$/, item.name);
    }
});

test('each regiment costs what its components cost (pp. 43-58)', () => {
    for (const item of regiments) {
        const parts = item.system.rules.components;
        const spent = [parts.homeWorld, parts.commander, parts.regimentType, ...parts.doctrines]
            .reduce((total, key) => total + component(key).system.cost, 0);
        assert.equal(spent, parts.cost, item.name);
        assert.equal(spent, item.system.cost, item.name);
        assert.ok(spent <= 12, `${item.name} spends ${spent} of 12`);
        assert.ok(parts.doctrines.length <= 3, item.name);
    }
});

test('each regiment modifies characteristics exactly as its components do', () => {
    for (const item of regiments) {
        const parts = item.system.rules.components;
        const picks = item.system.rules.regimentPicks.homeWorldCharacteristics ?? [];
        const total = {};
        const addAll = source => {
            for (const [key, value] of Object.entries(source ?? {})) total[key] = (total[key] ?? 0) + value;
        };
        const home = normaliseOrigin(component(parts.homeWorld).system);
        addAll(home.characteristics);
        for (const key of picks) total[key] = (total[key] ?? 0) + home.characteristicChoices[0].value;
        addAll(normaliseOrigin(component(parts.regimentType).system).characteristics);
        for (const key of parts.doctrines) addAll(normaliseOrigin(component(key).system).characteristics);
        // A modifier that cancels out (Catachan: +3 Toughness from the world, -3 from the type) is not printed.
        const net = Object.fromEntries(Object.entries(total).filter(([, value]) => value !== 0));
        assert.deepEqual(net, item.system.characteristics, item.name);
    }
});

test('each regiment grants the aptitudes its doctrines grant', () => {
    for (const item of regiments) {
        const parts = item.system.rules.components;
        const expected = [parts.homeWorld, parts.commander, parts.regimentType, ...parts.doctrines]
            .flatMap(key => normaliseOrigin(component(key).system).grants.aptitudes);
        assert.deepEqual(new Set(normaliseOrigin(item.system).grants.aptitudes ?? []), new Set(expected), item.name);
    }
});

test('the Cadian 99th is the book entry, down to its kit and favoured weapons (p. 43)', () => {
    const cadian = regiment('Cadian');
    assert.deepEqual(cadian.characteristics, {agility: 3, ballisticSkill: 3, perception: -3, willpower: 3});
    assert.deepEqual(cadian.grants.aptitudes, ['Willpower']);
    assert.deepEqual(cadian.grants.talents.map(talent => talent.name), ['Hatred (Servants of Chaos)', 'Rapid Reload']);
    assert.deepEqual(cadian.choices.map(choice => choice.key), ['closeOrderDrill', 'combatDoctrine']);
    assert.equal(cadian.grants.wounds, 0);
    assert.deepEqual(cadian.rules.favouredWeapons, ['Autocannon', 'Grenade launcher']);
    assert.deepEqual(cadian.rules.kit.mainWeapon, [{name: 'M36 Lasgun', craftsmanship: 'good'}, {name: 'Charge Pack (Basic)', quantity: 4}]);
    assert.deepEqual(cadian.rules.kit.squad, ['A single Chimera Armoured Transport per squad']);
});

test('the regiments that differ from their components say so (pp. 47, 55)', () => {
    assert.match(regiment('Krieg').rules.components.note, /Untempered Zeal/);
    assert.match(regiment('Tallarn').rules.components.note, /Hardened/);
});

test('every kit item a regiment hands out exists in the Only War pack', () => {
    const granted = regiments.flatMap(item => {
        const kit = item.system.rules.kit;
        return [...kit.mainWeapon, ...kit.armour, ...kit.items].map(entry => entry.name);
    });
    assert.ok(granted.length > 50);
    assert.deepEqual([...new Set(granted.filter(name => !packNames.has(name)))], []);
});
