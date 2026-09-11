import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';

const archetypes = JSON.parse(readFileSync(new URL('../packs-src/origins/08-bc-archetypes.json', import.meta.url), 'utf8'));
const find = key => normaliseOrigin(archetypes.find(item => item.system.key === key).system);
const raw = key => archetypes.find(item => item.system.key === key).system;

test('the book offers eight archetypes, four per race, all valid (p. 54)', () => {
    assert.equal(archetypes.length, 8);
    for (const item of archetypes) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'archetype', item.name);
        assert.match(item.system.source, /^Black Crusade, p\. \d+$/, item.name);
        assert.match(item.system.wounds.formula, /^\d+\+1d5$/, item.name);
        assert.ok(item.system.rules.specialAbility.name, item.name);
        assert.ok(item.system.rules.specialAbility.effect.length > 40, item.name);
    }
    const byRace = archetypes.reduce((map, item) => {
        map[item.system.rules.race] = (map[item.system.rules.race] ?? 0) + 1;
        return map;
    }, {});
    assert.deepEqual(byRace, {chaosSpaceMarine: 4, human: 4});
});

test('an archetype names the race it demands, and the wizard can filter on it', () => {
    assert.equal(raw('champion').requires.originKey, 'chaosSpaceMarine');
    assert.equal(raw('psyker').requires.originKey, 'human');
    for (const item of archetypes)
        assert.equal(item.system.requires.originKey, item.system.rules.race, item.name);
});

test('wounds match the book (pp. 55-70)', () => {
    const wounds = Object.fromEntries(archetypes.map(item => [item.system.key, item.system.wounds.formula]));
    assert.deepEqual(wounds, {champion: '15+1d5', chosen: '16+1d5', forsaken: '15+1d5', sorcerer: '15+1d5',
        apostate: '9+1d5', heretek: '12+1d5', renegade: '10+1d5', psyker: '8+1d5'});
});

test('the human archetypes carry their characteristic bonuses (pp. 63-70)', () => {
    assert.deepEqual(find('apostate').characteristics, {fellowship: 5});
    assert.deepEqual(find('heretek').characteristics, {intelligence: 5});
    assert.deepEqual(find('renegade').characteristics, {weaponSkill: 3, ballisticSkill: 3});
    assert.deepEqual(find('psyker').characteristics, {willpower: 5});
    assert.deepEqual(find('champion').characteristics, {}, 'the Chaos Space Marines get none');
});

test('the Sorcerer is Bound at psy rating 2, the Psyker Unbound at 3 (pp. 61, 70)', () => {
    const sorcerer = find('sorcerer').rules.psyker;
    assert.deepEqual(sorcerer, {psyRating: 2, corruption: '1', freePowerExperience: 500,
        psychicStrength: 'bound', disciplines: ['Unaligned', 'Divination', 'Telepathy', 'Telekinesis']});
    const psyker = find('psyker').rules.psyker;
    assert.equal(psyker.psyRating, 3);
    assert.equal(psyker.corruption, '1d5');
    assert.equal(psyker.freePowerExperience, 500);
    assert.equal(psyker.psychicStrength, 'unbound');
    for (const key of ['sorcerer', 'psyker'])
        assert.ok(find(key).grants.traits.some(trait => trait.name === 'Psyker'), key);
    assert.equal(find('champion').rules.psyker, undefined);
});

test('the Sorcerer takes Psy Rating twice and the Psyker three times (pp. 61, 70)', () => {
    // Кратность — поле записи, а не повторённая строка: одинаковые выдачи схлопываются.
    const count = key => find(key).grants.talents.find(talent => talent.name === 'Psy Rating')?.count;
    assert.equal(count('sorcerer'), 2);
    assert.equal(count('psyker'), 3);
});

test('a starting rank of +10 is an advance, not a second copy of the skill (p. 57)', () => {
    const dodge = find('chosen').choices.find(choice => choice.key === 'defenceSkill');
    assert.deepEqual(dodge.options[0].grants.skills, [{key: 'dodge', advance: 10}]);
});

test('every "or" in the book is a choice the player answers', () => {
    const counts = Object.fromEntries(archetypes.map(item => [item.system.key, item.system.choices.length]));
    assert.equal(counts.apostate, 14, 'the Apostate has the longest list of them');
    for (const item of archetypes) {
        assert.ok(item.system.choices.length >= 4, item.name);
        for (const choice of item.system.choices) {
            assert.ok(choice.key && choice.label, `${item.name}: ${JSON.stringify(choice)}`);
            if (choice.type === 'one') assert.ok(choice.options.length >= 2, `${item.name}: ${choice.key}`);
            if (choice.type === 'many') assert.ok(choice.count >= 1, `${item.name}: ${choice.key}`);
        }
    }
});

test('craftsmanship travels with the item the book specifies (pp. 63-70)', () => {
    const best = find('heretek').grants.equipment.find(entry => entry.name === 'Las Carbine');
    assert.equal(best.craftsmanship, 'best');
    const laspistol = find('apostate').grants.equipment.find(entry => entry.name === 'Laspistol');
    assert.equal(laspistol.craftsmanship, 'good');
    const lasgun = find('renegade').choices.find(choice => choice.key === 'primaryWeapon')
        .options[0].grants.equipment[0];
    assert.deepEqual(lasgun, {name: 'Lasgun', craftsmanship: 'best'});
});
