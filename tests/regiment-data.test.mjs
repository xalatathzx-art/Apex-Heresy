import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGIMENT_BUDGET, MAX_DOCTRINES, regimentCost, regimentProblems, composeRegiment}
    from '../script/creation/regiment-data.mjs';
import {normaliseOrigin} from '../script/creation/origin-data.mjs';

const read = file => JSON.parse(readFileSync(new URL(`../packs-src/origins/${file}`, import.meta.url), 'utf8'));
const catalogue = read('04-ow-regiment-components.json').map(item => item.system);
const premade = read('05-ow-regiments.json');

const selectionFor = item => ({
    homeWorld: item.system.rules.components.homeWorld,
    commander: item.system.rules.components.commander,
    regimentType: item.system.rules.components.regimentType,
    doctrines: item.system.rules.components.doctrines,
    picks: {homeWorldCharacteristics: item.system.rules.regimentPicks.homeWorldCharacteristics ?? [],
            targets: {hatedEnemy: item.system.rules.regimentPicks.hatedEnemy,
                      favouredFoe: item.system.rules.regimentPicks.favouredFoe}}
});

test('a regiment has 12 points, one of each required part and at most three doctrines (pp. 58, 64)', () => {
    assert.equal(REGIMENT_BUDGET, 12);
    assert.equal(MAX_DOCTRINES, 3);
    const base = {homeWorld: 'imperialWorld', commander: 'fixed', regimentType: 'lineInfantry', doctrines: [],
                  picks: {homeWorldCharacteristics: ['toughness']}};
    assert.deepEqual(regimentProblems(base, catalogue), []);
    assert.equal(regimentCost(base, catalogue), 4);
    assert.match(regimentProblems({...base, doctrines: ['dieHards', 'ironDiscipline', 'sharpshooters']}, catalogue).join(' '), /4 doctrines of 3/);
    assert.match(regimentProblems({...base, doctrines: ['sharpshooters', 'sharpshooters']}, catalogue).join(' '), /twice/);
    assert.match(regimentProblems({...base, homeWorld: 'deathWorld', doctrines: ['survivalists', 'sharpshooters'],
        picks: {homeWorldCharacteristics: ['strength', 'toughness']}}, catalogue).join(' '), /spent 14 of 12/);
    assert.match(regimentProblems({...base, regimentType: 'dieHards'}, catalogue).join(' '), /not a regiment type/);
    assert.match(regimentProblems({...base, picks: {homeWorldCharacteristics: []}}, catalogue).join(' '), /needs 1 characteristic/);
    assert.match(regimentProblems({...base, homeWorld: 'fortressWorld', picks: {homeWorldCharacteristics: ['toughness', 'willpower']}}, catalogue).join(' '),
        /Hated Enemy" is unanswered/);
});

test('every pre-made regiment composes back out of its components (pp. 43-58)', () => {
    for (const item of premade) {
        const {system, problems} = composeRegiment(selectionFor(item), catalogue, {name: item.name});
        const printed = normaliseOrigin(item.system);
        assert.deepEqual(problems, [], item.name);
        assert.equal(system.cost, printed.cost, item.name);
        assert.deepEqual(system.characteristics, printed.characteristics, item.name);
        assert.deepEqual(new Set(system.grants.aptitudes), new Set(printed.grants.aptitudes), item.name);
        assert.equal(system.grants.wounds, printed.grants.wounds, item.name);
        assert.deepEqual(new Set(system.grants.talents.map(talent => talent.name)),
            new Set(printed.grants.talents.map(talent => talent.name)), `${item.name} talents`);
        const keys = grants => new Set([...grants.skills.map(skill => skill.key),
            ...grants.specialities.map(spec => `${spec.key}:${spec.name}`)]);
        assert.deepEqual(keys(system.grants), keys(printed.grants), `${item.name} skills`);
    }
});

test('a composed regiment keeps the "or" choices for each Guardsman and answers the group ones (p. 41)', () => {
    const cadian = premade.find(item => item.name.startsWith('Cadian'));
    const {system} = composeRegiment(selectionFor(cadian), catalogue, {name: cadian.name});
    assert.deepEqual(system.choices.map(choice => choice.key), ['combatDoctrine', 'closeOrderDrill']);
    assert.ok(system.grants.talents.some(talent => talent.name === 'Hatred (Servants of Chaos)'),
        'the group answered Hated Enemy, so it is granted rather than asked again');
});

test('the kit is the universal one, replaced slot by slot, with points left over turned into kit points (pp. 68-69)', () => {
    const selection = {homeWorld: 'imperialWorld', commander: 'fixed', regimentType: 'lineInfantry', doctrines: [],
                       picks: {homeWorldCharacteristics: ['toughness']}};
    const {system} = composeRegiment(selection, catalogue, {name: 'Test'});
    assert.deepEqual(system.rules.kit.mainWeapon, [{name: 'M36 Lasgun'}, {name: 'Charge Pack (Basic)', quantity: 4}]);
    assert.deepEqual(system.rules.kit.armour, [{name: 'Imperial Guard Flak Armour'}]);
    assert.ok(system.rules.kit.items.some(entry => entry.name === 'Knife'), 'the universal knife stays');
    assert.ok(system.rules.kit.items.some(entry => entry.name === 'Frag Grenade'), 'the regiment type adds its grenades');
    // 12 - 4 spent = 8 points left, 30 + 2 x 8 = 46 kit points.
    assert.equal(system.rules.kitPoints, 46);
    const penal = composeRegiment({...selection, homeWorld: 'penalColony', picks: {homeWorldCharacteristics: ['agility', 'strength']}},
        catalogue, {name: 'Penal'});
    assert.equal(penal.system.rules.kitPoints, 15 + 2 * (12 - 5), 'Scum and Villainy starts from 15');
    assert.equal(penal.system.rules.logistics, 0);
    const highborn = composeRegiment({...selection, homeWorld: 'highborn', picks: {homeWorldCharacteristics: ['fellowship', 'intelligence']}},
        catalogue, {name: 'Highborn'});
    assert.equal(highborn.system.rules.logistics, 10, 'Abundant Resources');
});

test('kit purchases add to the kit and cannot overspend its points', () => {
    const selection = {homeWorld: 'imperialWorld', commander: 'fixed', regimentType: 'lineInfantry', doctrines: [],
                       picks: {homeWorldCharacteristics: ['toughness']}};
    const bought = [{key: 'magnoculars', cost: 8, effect: {type: 'add', items: [{name: 'Magnoculars'}]}},
                    {key: 'lascarbine', cost: 5, effect: {type: 'replaceMain', replace: [{name: 'Las Carbine'}]}}];
    const {system, problems} = composeRegiment(selection, catalogue, {name: 'Test', kit: bought});
    assert.deepEqual(problems, []);
    assert.deepEqual(system.rules.kit.mainWeapon, [{name: 'Las Carbine'}]);
    assert.ok(system.rules.kit.items.some(entry => entry.name === 'Magnoculars'));
    assert.equal(system.rules.kitSpent, 13);
    const over = composeRegiment(selection, catalogue, {name: 'Test', kit: [{key: 'x', cost: 99, effect: {type: 'text', text: 'x'}}]});
    assert.match(over.problems.join(' '), /standard kit spends 99 of 46/);
});
