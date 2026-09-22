import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';

const specialities = JSON.parse(readFileSync(new URL('../packs-src/origins/12-dw-specialities.json', import.meta.url), 'utf8'));
const chapters = JSON.parse(readFileSync(new URL('../packs-src/origins/11-dw-chapters.json', import.meta.url), 'utf8'));
const find = key => normaliseOrigin(specialities.find(item => item.system.key === key).system);
const raw = key => specialities.find(item => item.system.key === key).system;

test('six Specialities, each valid and following the Space Marine step (pp. 68-91)', () => {
    assert.equal(specialities.length, 6);
    for (const item of specialities) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'speciality', item.name);
        assert.equal(item.system.requires.originKey, 'spaceMarine', item.name);
        assert.match(item.system.source, /^Deathwatch, p\. \d+$/, item.name);
        assert.ok(item.system.rules.specialAbility, item.name);
    }
});

test('every Speciality a Chapter closes exists under that key (Table 1-1, p. 26)', () => {
    const keys = new Set(specialities.map(item => item.system.key));
    for (const chapter of chapters)
        for (const forbidden of chapter.system.rules.forbidsSpecialities)
            assert.ok(keys.has(forbidden), `${chapter.name} forbids an unknown ${forbidden}`);
});

test('each prices its characteristics as its own table prints (pp. 69-89)', () => {
    // The book prints three rows of prices; which one a characteristic gets is the
    // whole difference between an Apothecary and a Devastator.
    assert.deepEqual(raw('apothecary').rules.characteristicCosts.weaponSkill, [200, 500, 1000, 1500]);
    assert.deepEqual(raw('apothecary').rules.characteristicCosts.intelligence, [200, 500, 1000, 1500]);
    assert.deepEqual(raw('apothecary').rules.characteristicCosts.strength, [500, 1000, 1500, 2000]);
    assert.deepEqual(raw('devastatorMarine').rules.characteristicCosts.ballisticSkill, [200, 500, 1000, 1500]);
    assert.deepEqual(raw('devastatorMarine').rules.characteristicCosts.weaponSkill, [750, 1500, 2000, 5000]);
    assert.deepEqual(raw('tacticalMarine').rules.characteristicCosts.willpower, [200, 500, 1000, 1500]);
    assert.deepEqual(raw('librarian').rules.characteristicCosts.willpower, [200, 500, 1000, 1500]);
    assert.deepEqual(raw('techmarine').rules.characteristicCosts.intelligence, [200, 500, 1000, 1500]);
    for (const item of specialities) {
        const costs = item.system.rules.characteristicCosts;
        assert.equal(Object.keys(costs).length, 9, `${item.name}: nine characteristics, no Influence`);
        for (const [key, row] of Object.entries(costs)) {
            assert.equal(row.length, 4, `${item.name}/${key}`);
            // Cumulative and rising: no step ever costs less than the one before it.
            for (let i = 1; i < row.length; i++) assert.ok(row[i] > row[i - 1], `${item.name}/${key}`);
        }
    }
});

test('the Rank 1 advances are the ones a new Battle-Brother may buy (p. 27)', () => {
    for (const item of specialities) {
        const advances = item.system.rules.advances;
        assert.ok(advances.length >= 4, item.name);
        for (const advance of advances) {
            assert.ok(advance.name, item.name);
            assert.ok(['skill', 'talent'].includes(advance.type), `${item.name}: ${advance.name}`);
            assert.ok(Number.isFinite(advance.cost), `${item.name}: ${advance.name}`);
        }
    }
    const apothecary = raw('apothecary').rules.advances;
    assert.equal(apothecary.find(a => a.name === 'Medicae').cost, 400);
    assert.equal(apothecary.find(a => a.name === 'Interrogation').cost, 200);
    assert.equal(apothecary.find(a => a.name === 'Hardy').prerequisites, 'T 40');
    const tactical = raw('tacticalMarine').rules.advances;
    assert.equal(tactical.find(a => a.name === 'Astartes Weapon Specialisation').cost, 1000);
});

test('starting skills and issue match the book (pp. 28, 69-89)', () => {
    assert.deepEqual(find('apothecary').grants.skills.map(s => s.key), ['medicae']);
    assert.deepEqual(find('librarian').grants.skills.map(s => s.key), ['psyniscience']);
    assert.deepEqual(find('tacticalMarine').grants.skills.map(s => s.key), ['command']);
    assert.deepEqual(find('techmarine').grants.skills.map(s => s.key), ['techUse']);
    // The book's own skill names, now that the system carries them: the Assault
    // Marine gets Pilot (Personal), the Techmarine Speak Language (Techna-Lingua).
    assert.deepEqual(find('assaultMarine').grants.specialities.map(s => `${s.key}:${s.name}`),
        ['pilot:Personal']);
    assert.deepEqual(find('techmarine').grants.specialities.map(s => `${s.key}:${s.name}`),
        ['speakLanguage:Techna-Lingua']);

    const issue = key => find(key).grants.equipment.map(item => item.name);
    assert.deepEqual(issue('apothecary'), ['Astartes Bolter (Godwyn)', 'Reductor', 'Narthecium']);
    assert.deepEqual(issue('assaultMarine'), ['Astartes Chainsword', 'Astartes Jump Pack']);
    assert.deepEqual(issue('devastatorMarine'), ['Astartes Heavy Bolter']);
    assert.ok(issue('techmarine').includes('Astartes Servo-Arm'));
});

test('the Librarian is a psyker from the first day (p. 81)', () => {
    const psyker = raw('librarian').rules.psyker;
    assert.equal(psyker.psyRating, 3);
    assert.equal(psyker.techniques, 3);
    assert.equal(psyker.techniqueList.length, 7, 'three chosen from seven');
    assert.ok(find('librarian').grants.traits.some(trait => trait.name === 'Psyker'));
});

test('a Speciality with a choice of special ability offers it (pp. 69-89)', () => {
    const ability = key => find(key).choices.find(choice => choice.key === 'specialAbility');
    assert.equal(ability('apothecary').options.length, 3);
    assert.equal(ability('assaultMarine').options.length, 2);
    assert.equal(ability('devastatorMarine').options.length, 2);
    assert.equal(ability('tacticalMarine').options.length, 2);
    // The Librarian and the Techmarine have no choice: their ability is fixed.
    assert.equal(ability('librarian'), undefined);
    assert.equal(ability('techmarine'), undefined);
    // The Assault Marine's Swift Attack comes with the Speciality, not as a choice.
    assert.deepEqual(find('assaultMarine').grants.talents.map(talent => talent.name), ['Swift Attack']);
});
