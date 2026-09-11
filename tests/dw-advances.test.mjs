import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gatherAdvances, cheapestOfEach, advanceOffers, advanceTimes, spentOnAdvances,
    rankForExperience, RANK_THRESHOLDS, CLOSED_AT_CREATION} from '../script/creation/advance-list.mjs';
import {validateOrigin} from '../script/creation/origin-data.mjs';

const [general] = JSON.parse(readFileSync(new URL('../packs-src/origins/13-dw-general-advances.json', import.meta.url), 'utf8'));
const chapters = JSON.parse(readFileSync(new URL('../packs-src/origins/11-dw-chapters.json', import.meta.url), 'utf8'));
const specialities = JSON.parse(readFileSync(new URL('../packs-src/origins/12-dw-specialities.json', import.meta.url), 'utf8'));

test('the General Space Marine list is the first rank of p. 60', () => {
    assert.deepEqual(validateOrigin(general.system), []);
    const advances = general.system.rules.advances;
    assert.equal(advances.length, 23);
    assert.equal(general.system.rules.rank, 1);
    assert.equal(advances.find(a => a.name === 'Awareness').cost, 200);
    assert.equal(advances.find(a => a.name === 'Concealment').cost, 800);
    assert.equal(advances.find(a => a.name === 'Astartes Weapon Specialisation').cost, 1500);
    assert.equal(advances.find(a => a.name === 'Astartes Weapon Specialisation').prerequisites,
        'Astartes Weapon Training');
});

test('every Chapter carries its own list, and those need no rank (pp. 58, 66-67)', () => {
    for (const chapter of chapters) {
        const advances = chapter.system.rules.advances;
        assert.ok(advances.length >= 11, chapter.name);
        for (const advance of advances) {
            assert.ok(['skill', 'talent'].includes(advance.type), `${chapter.name}: ${advance.name}`);
            assert.ok(Number.isFinite(advance.cost), `${chapter.name}: ${advance.name}`);
        }
    }
    const wolves = chapters.find(c => c.system.key === 'spaceWolves').system.rules.advances;
    assert.equal(wolves.find(a => a.name === 'Wrangling').cost, 100, 'nobody else sells it that cheap');
    assert.equal(wolves.find(a => a.name === 'Wisdom of the Ancients').cost, 1500);
    const templars = chapters.find(c => c.system.key === 'blackTemplars').system.rules.advances;
    assert.equal(templars.find(a => a.name === 'Abhor the Witch').prerequisites, 'Adeptus Astartes');
});

test('advances are gathered from every list a Battle-Brother may use (p. 58)', () => {
    const lists = [
        {source: 'chapter', advances: [{name: 'Hatred (Orks)', cost: 500, type: 'talent'}]},
        {source: 'general', rank: 1, advances: [{name: 'Awareness', cost: 200, type: 'skill'}]},
        {source: 'speciality', rank: 1, advances: [{name: 'Medicae', cost: 400, type: 'skill'}]},
        {source: 'deathwatch', rank: 1, advances: [{name: 'Deathwatch Training', cost: 300, type: 'talent'}]}
    ];
    const gathered = gatherAdvances(lists, {rank: 1, atCreation: true});
    assert.equal(gathered.length, 4);
    // The Chapter list never asks for a rank at all.
    assert.equal(gathered.find(a => a.source === 'chapter').rank, 0);
    assert.equal(gathered.find(a => a.source === 'chapter').lockedByRank, false);
    // And the Deathwatch list is closed to him on his first day.
    assert.deepEqual(CLOSED_AT_CREATION, ['deathwatch']);
    assert.equal(gathered.find(a => a.source === 'deathwatch').lockedAtCreation, true);
    assert.equal(gathered.find(a => a.source === 'general').lockedAtCreation, false);
    // Later, in play, that same list opens.
    const inPlay = gatherAdvances(lists, {rank: 1, atCreation: false});
    assert.equal(inPlay.find(a => a.source === 'deathwatch').lockedAtCreation, false);
});

test('a higher rank than he holds is locked, and says so separately', () => {
    const lists = [{source: 'speciality', rank: 2, advances: [{name: 'Crushing Blow', cost: 600, type: 'talent'}]}];
    assert.equal(gatherAdvances(lists, {rank: 1})[0].lockedByRank, true);
    assert.equal(gatherAdvances(lists, {rank: 2})[0].lockedByRank, false);
});

test('the same advance in two lists is sold at the cheaper price', () => {
    const both = [
        {name: 'Tracking', cost: 400, type: 'skill', source: 'general'},
        {name: 'Tracking', cost: 200, type: 'skill', source: 'chapter'}
    ];
    const cheapest = cheapestOfEach(both);
    assert.equal(cheapest.length, 1);
    assert.equal(cheapest[0].cost, 200, 'a Space Wolf tracks cheaper than anyone');
    assert.equal(cheapest[0].source, 'chapter');
});

test('an advance marked (x2) may be taken twice, a plain one only once (p. 58)', () => {
    assert.deepEqual(advanceTimes('Sound Constitution (x2)'), {base: 'Sound Constitution', times: 2});
    assert.deepEqual(advanceTimes('Awareness'), {base: 'Awareness', times: 1});
    assert.deepEqual(advanceTimes('Psychic Power (x2)'), {base: 'Psychic Power', times: 2});

    const advances = gatherAdvances([{source: 'general', advances: [
        {name: 'Sound Constitution (x2)', cost: 500, type: 'talent'},
        {name: 'Awareness', cost: 200, type: 'skill'}
    ]}]);
    const once = advanceOffers(advances, {owned: ['Sound Constitution', 'Awareness'], remaining: 1000});
    assert.equal(once.find(a => a.base === 'Sound Constitution').maxed, false, 'one of his two');
    assert.equal(once.find(a => a.base === 'Awareness').maxed, true);
    const twice = advanceOffers(advances, {owned: ['Sound Constitution', 'Sound Constitution']});
    assert.equal(twice.find(a => a.base === 'Sound Constitution').maxed, true);
});

test('what he cannot pay for is offered but not affordable', () => {
    const advances = gatherAdvances([{source: 'general', advances: [
        {name: 'Astartes Weapon Specialisation', cost: 1500, type: 'talent'},
        {name: 'Awareness', cost: 200, type: 'skill'}
    ]}]);
    const offers = advanceOffers(advances, {owned: [], remaining: 1000});
    assert.equal(offers.find(a => a.name === 'Awareness').affordable, true);
    assert.equal(offers.find(a => a.name === 'Astartes Weapon Specialisation').affordable, false,
        'it costs more than the 1,000 he starts with');
    assert.equal(spentOnAdvances([{cost: 200}, {cost: 400}]), 600);
});

test('Rank 1 starts at 13,000 spent — twelve of them already his (Table 2-2, p. 58)', () => {
    assert.deepEqual(RANK_THRESHOLDS, [13000, 17000, 21000, 25000, 30000, 35000, 40000, 45000]);
    assert.equal(rankForExperience(13000), 1);
    assert.equal(rankForExperience(16999), 1);
    assert.equal(rankForExperience(17000), 2);
    assert.equal(rankForExperience(21800), 3, "the book's own example");
    assert.equal(rankForExperience(0), 1, 'a brand new Battle-Brother is still Rank 1');
});

test('a Speciality list and a Chapter list plug into the same gathering', () => {
    const apothecary = specialities.find(item => item.system.key === 'apothecary').system.rules.advances;
    const wolves = chapters.find(item => item.system.key === 'spaceWolves').system.rules.advances;
    const gathered = gatherAdvances([
        {source: 'chapter', advances: wolves},
        {source: 'general', rank: 1, advances: general.system.rules.advances},
        {source: 'speciality', rank: 1, advances: apothecary}
    ], {rank: 1});
    assert.equal(gathered.length, wolves.length + general.system.rules.advances.length + apothecary.length);
    // Chapter lines come first, as they do in the book.
    assert.equal(gathered[0].source, 'chapter');
});
