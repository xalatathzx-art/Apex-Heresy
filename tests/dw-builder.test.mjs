import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveGrantPlan, emptyPlan, mergePlans} from '../script/creation/grant-data.mjs';
import {planToItemData} from '../script/creation/origin-apply.mjs';
import {normaliseOrigin} from '../script/creation/origin-data.mjs';
import {GRANT_ITEM_TYPES} from '../script/creation/content-lookup.mjs';
import {characteristicOffers, purchaseCharacteristic} from '../script/creation/shop-data.mjs';
import {RULESET_DEFS} from '../script/creation/ruleset-data.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const chapters = read('../packs-src/origins/11-dw-chapters.json');
const specialities = read('../packs-src/origins/12-dw-specialities.json');
const wizard = readFileSync(new URL('../script/creation/wizard.mjs', import.meta.url), 'utf8');
const template = read('../template.json');

/** Every special ability the Deathwatch pack ships, by the exact name it carries. */
const abilityNames = new Set(['13-space-marine-abilities.json', '14-speciality-abilities.json',
                              '15-mode-abilities.json']
    .flatMap(file => read(`../packs-src/deathwatch/${file}`).map(item => item.name)));

test('an ability is a kind of grant, like a talent or a trait', () => {
    assert.deepEqual(GRANT_ITEM_TYPES.ability, ['specialAbility']);
    assert.deepEqual(emptyPlan().abilities, []);
    assert.ok('abilities' in template.Item.origin.grants, 'and the schema knows it');

    const {plan} = resolveGrantPlan({grants: {abilities: [{name: 'Wolf Senses (Space Wolves)'}]}});
    assert.deepEqual(plan.abilities, [{name: 'Wolf Senses (Space Wolves)'}]);
    // Merging steps carries it too: the Chapter's ability must survive the Speciality.
    const merged = mergePlans(plan, {abilities: [{name: 'Angel of Death (Assault Marine)'}]});
    assert.deepEqual(merged.abilities.map(a => a.name),
        ['Wolf Senses (Space Wolves)', 'Angel of Death (Assault Marine)']);

    const items = planToItemData({...emptyPlan(), abilities: [{name: 'Wolf Senses (Space Wolves)'}]},
        'dw:chapter', 'carrier', () => null);
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'specialAbility', 'a stub still lands as the right type');
    assert.equal(items[0].name, 'Wolf Senses (Space Wolves)');
});

test('each Chapter hands over its Solo Mode ability, by the name the pack uses (p. 216)', () => {
    for (const chapter of chapters) {
        const granted = chapter.system.grants.abilities ?? [];
        assert.equal(granted.length, 1, chapter.name);
        assert.ok(abilityNames.has(granted[0].name), `${chapter.name}: ${granted[0].name} is not in the pack`);
        // The printed note and the granted item are the same ability under one name.
        assert.ok(granted[0].name.startsWith(chapter.system.rules.soloMode.replace(/[’']/g, '')
            .slice(0, 5)), chapter.name);
    }
    assert.equal(chapters.find(c => c.system.key === 'spaceWolves').system.grants.abilities[0].name,
        'Wolf Senses (Space Wolves)');
});

test('a Speciality hands over what it always has, and its choice hands over the rest (p. 69)', () => {
    const byKey = key => specialities.find(item => item.system.key === key).system;
    // Assault Marines always get Angel of Death and then pick one of two.
    assert.deepEqual(byKey('assaultMarine').grants.abilities, [{name: 'Angel of Death (Assault Marine)'}]);
    // The Apothecary has nothing fixed: all three are a choice.
    assert.deepEqual(byKey('apothecary').grants.abilities, []);
    assert.deepEqual(byKey('librarian').grants.abilities, [{name: 'Battle-Psyker (Librarian)'}]);
    assert.equal(byKey('techmarine').grants.abilities.length, 2);

    for (const item of specialities) {
        for (const ability of item.system.grants.abilities ?? [])
            assert.ok(abilityNames.has(ability.name), `${item.name}: ${ability.name}`);
        for (const choice of item.system.choices ?? []) {
            if (choice.key !== 'specialAbility') continue;
            for (const option of choice.options) {
                const granted = option.grants?.abilities ?? [];
                assert.equal(granted.length, 1, `${item.name}: ${option.label} grants nothing`);
                assert.ok(abilityNames.has(granted[0].name), `${item.name}: ${granted[0].name}`);
            }
        }
    }

    // Picking an option actually resolves into the plan.
    const assault = specialities.find(item => item.system.key === 'assaultMarine').system;
    const {plan, problems} = resolveGrantPlan(assault, {one: {specialAbility: 0}});
    assert.deepEqual(problems, []);
    assert.deepEqual(plan.abilities.map(a => a.name),
        ['Angel of Death (Assault Marine)', 'Wings of Angels (Assault Marine)']);
});

test('the wizard looks abilities up in the pack alongside talents and gear', () => {
    assert.match(wizard, /\["ability", plan\.abilities\]/);
});

test('the Chapter writes its Demeanour into the biography (p. 397)', () => {
    assert.match(wizard, /update\["system\.bio\.chapterDemeanour"\] = source\.system\.rules\.demeanour;/);
    for (const chapter of chapters) assert.ok(chapter.system.rules.demeanour, chapter.name);
});

test('a Chapter closes the Specialities the book closes to it (Table 1-1, p. 27)', () => {
    assert.deepEqual(chapters.find(c => c.system.key === 'spaceWolves').system.rules.forbidsSpecialities,
        ['apothecary']);
    assert.deepEqual(chapters.find(c => c.system.key === 'blackTemplars').system.rules.forbidsSpecialities,
        ['devastatorMarine', 'librarian']);
    // And the wizard stops offering them, rather than letting the choice be made and undone.
    assert.match(wizard, /_forbiddenSpecialities\(\) \{/);
    assert.match(wizard, /\.filter\(entry => !forbidden\.has\(entry\.system\?\.key\)\)/);
    // The key is only in the index if the index is asked for it.
    assert.match(wizard, /"system\.requires", "system\.key"/);
});

test('the General Space Marine list is read from the document, not from the index', () => {
    // A pack index carries only the fields it was asked for, and system.rules is not
    // among them: reading rules off an index entry silently dropped the whole list.
    assert.match(wizard, /for \(const entry of await this\._originsFor\("advanceList"\)\) \{/);
    assert.match(wizard, /if \(source\?\.rules\?\.advanceList !== "general"\) continue;/);
    assert.equal(/\.find\(entry => entry\.system\?\.rules\?\.advanceList/.test(wizard), false);
});

test('the shop is built once, with the lists already read', () => {
    // _experienceStepContext is synchronous, so the lists are fetched before it runs.
    assert.match(wizard, /this\._advanceListCache = RULESET_DEFS\[this\.ruleset\]\?\.advanceLists/);
    assert.match(wizard, /gatherAdvances\(this\._advanceListCache \?\? \[\]/);
});

test('only Black Crusade explains its prices by a patron', () => {
    assert.equal(RULESET_DEFS.bc.patronPricing, true);
    assert.equal(RULESET_DEFS.dw.patronPricing, undefined, 'a Battle-Brother serves no Dark God');
    assert.match(wizard, /shopPatron: RULESET_DEFS\[this\.ruleset\]\?\.patronPricing/);
    // Deathwatch buys skills and talents as printed lines, so those tabs are gone.
    assert.match(wizard, /const ladderTabs = listed \? \["characteristics"\] : \["characteristics", "skills", "talents"\]/);
});

test('Deathwatch characteristics cost what the Speciality prints (p. 58)', () => {
    const costs = specialities.find(item => item.system.key === 'assaultMarine').system.rules.characteristicCosts;
    assert.deepEqual(costs.weaponSkill, [200, 500, 1000, 1500]);
    assert.deepEqual(costs.ballisticSkill, [750, 1500, 2000, 5000]);

    const snapshot = {
        ruleset: 'dw', aptitudes: new Set(), characteristicCosts: costs,
        characteristics: {weaponSkill: {advance: 0, cost: 0, aptitudes: []},
                          ballisticSkill: {advance: 10, cost: 700, aptitudes: []}}
    };
    const offers = characteristicOffers(snapshot);
    const ws = offers.find(o => o.key === 'weaponSkill');
    assert.equal(ws.cost, 200, 'his first +5 in Weapon Skill');
    assert.equal(ws.relation, null, 'no patron');
    assert.equal(ws.matched, 0);
    assert.equal(ws.printedSteps, 4);
    // Two advances already bought, so the third price is the one offered.
    assert.equal(offers.find(o => o.key === 'ballisticSkill').cost, 2000);

    // The cost written to the sheet is cumulative, as the engine reads it.
    const {update} = purchaseCharacteristic(snapshot, 'ballisticSkill');
    assert.equal(update['system.characteristics.ballisticSkill.advance'], 15);
    assert.equal(update['system.characteristics.ballisticSkill.cost'], 750 + 1500 + 2000);

    // A fourth advance is the last: there is no fifth price to offer.
    const maxed = characteristicOffers({...snapshot,
        characteristics: {weaponSkill: {advance: 20, cost: 3200, aptitudes: []}}});
    assert.equal(maxed[0].maxed, true);
    assert.equal(maxed[0].cost, null);
});

test('the other books are untouched by the printed prices', () => {
    const plain = {ruleset: 'dh2', aptitudes: new Set(['Weapon Skill']),
                   characteristics: {weaponSkill: {advance: 0, cost: 0, aptitudes: ['Weapon Skill']}}};
    const offer = characteristicOffers(plain)[0];
    assert.equal(offer.printedSteps, undefined);
    assert.ok(offer.nextLevel, 'Dark Heresy still climbs its ladder');
});

test('a granted ability keeps the origin schema valid', () => {
    for (const item of [...chapters, ...specialities])
        assert.deepEqual(normaliseOrigin(item.system).grants.abilities,
            item.system.grants.abilities ?? [], item.name);
});
