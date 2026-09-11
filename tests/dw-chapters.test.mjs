import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrigin, normaliseOrigin} from '../script/creation/origin-data.mjs';

const chapters = JSON.parse(readFileSync(new URL('../packs-src/origins/11-dw-chapters.json', import.meta.url), 'utf8'));
const find = key => normaliseOrigin(chapters.find(item => item.system.key === key).system);
const raw = key => chapters.find(item => item.system.key === key).system;

test('six Chapters, each a valid origin that follows the Space Marine step (pp. 38-55)', () => {
    assert.equal(chapters.length, 6);
    for (const item of chapters) {
        assert.deepEqual(validateOrigin(item.system), [], item.name);
        assert.equal(item.system.stage, 'chapter', item.name);
        assert.equal(item.system.requires.originKey, 'spaceMarine', item.name);
        assert.match(item.system.source, /^Deathwatch, p\. \d+$/, item.name);
        assert.ok(item.system.rules.soloMode, item.name);
        assert.ok(item.system.rules.demeanour, item.name);
    }
});

test('each Chapter gives what the book prints (pp. 40-54)', () => {
    assert.deepEqual(find('blackTemplars').characteristics, {weaponSkill: 5, willpower: 5});
    assert.deepEqual(find('bloodAngels').characteristics, {weaponSkill: 5, agility: 5});
    assert.deepEqual(find('darkAngels').characteristics, {ballisticSkill: 5, intelligence: 5});
    assert.deepEqual(find('spaceWolves').characteristics, {perception: 5, fellowship: 5});
    assert.deepEqual(find('stormWardens').characteristics, {strength: 5});
    assert.equal(find('stormWardens').grants.wounds, 2, 'and two more Wounds');
});

test('the Ultramarine chooses where his two bonuses land (p. 54)', () => {
    const choice = find('ultramarines').characteristicChoices[0];
    assert.equal(choice.pick, 2);
    assert.equal(choice.value, 5);
    assert.equal(choice.from.length, 9, 'any of the nine; Deathwatch has no Influence');
    assert.deepEqual(find('ultramarines').characteristics, {}, 'nothing is fixed for him');
});

test('the Solo Mode ability and the Demeanour are named per Chapter (pp. 40-54)', () => {
    const solo = Object.fromEntries(chapters.map(item => [item.system.key, item.system.rules.soloMode]));
    assert.deepEqual(solo, {blackTemplars: 'Righteous Zeal', bloodAngels: 'Blood Frenzy',
        darkAngels: 'Stoic Defence', spaceWolves: 'Wolf Senses', stormWardens: "Thunder's Call",
        ultramarines: 'Favoured Son'});
    const demeanours = Object.fromEntries(chapters.map(item => [item.system.key, item.system.rules.demeanour]));
    assert.deepEqual(demeanours, {blackTemplars: 'Zealous', bloodAngels: 'The Red Thirst',
        darkAngels: 'Sons of The Lion', spaceWolves: 'The Sons of Russ',
        stormWardens: 'Aspire to Glory', ultramarines: 'Honour the Codex'});
});

test('a Chapter closes the Specialities the book closes (Table 1-1, p. 26)', () => {
    assert.deepEqual(raw('blackTemplars').rules.forbidsSpecialities, ['devastatorMarine', 'librarian']);
    assert.deepEqual(raw('spaceWolves').rules.forbidsSpecialities, ['apothecary']);
    for (const key of ['bloodAngels', 'darkAngels', 'stormWardens', 'ultramarines'])
        assert.deepEqual(raw(key).rules.forbidsSpecialities, [], key);
});

test('the odd ones out are written down, not lost (pp. 40, 49, 52)', () => {
    // A Black Templar's zygotes are deficient: two implants simply do not work for him.
    assert.match(raw('blackTemplars').rules.note, /Betcher's gland|sus-an membrane/);
    // A Space Wolf smells what others miss.
    assert.deepEqual(find('spaceWolves').grants.talents.map(talent => talent.name),
        ['Heightened Senses (Smell)']);
    // A Storm Warden may carry his own Chapter's blade instead of the issued knife.
    const claymore = find('stormWardens').choices.find(choice => choice.key === 'sacrisClaymore');
    assert.equal(claymore.options.length, 2);
    assert.deepEqual(claymore.options[1].grants.equipment, [{name: 'Sacris Claymore'}]);
});
