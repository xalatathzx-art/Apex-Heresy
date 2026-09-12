import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixDocument, FOLDER_RENAMES} from '../tools/lib/dark-heresy-fixes.mjs';

test('the Laser folder is renamed Las, which is how the setting writes it', () => {
    // The report said "Laser Weapons"; the folder is actually called "Laser".
    assert.equal(FOLDER_RENAMES['Laser'], 'Las');
});

test("Harlequin's Kiss drops the quality that does not exist", () => {
    // DMG-SB is not a weapon quality in any of the books, and the weapon is
    // neither unarmed nor carrying it as a real trait.
    const {doc, changed} = fixDocument({
        type: 'weapon', name: 'Harlequin’s Kiss',
        system: {type: '', special: 'Felling (4), Tearing, DMG-SB'}
    });
    assert.equal(changed, true);
    assert.equal(doc.system.special, 'Felling (4), Tearing');
});

test('the other qualities on that weapon survive', () => {
    const {doc} = fixDocument({
        type: 'weapon', name: 'Harlequin’s Kiss',
        system: {type: '', special: 'Felling (4), Tearing, DMG-SB'}
    });
    assert.match(doc.system.special, /Felling \(4\)/);
    assert.match(doc.system.special, /Tearing/);
});

test('a weapon that never had the phantom quality is untouched', () => {
    const {doc} = fixDocument({
        type: 'weapon', name: 'Chainsword', system: {type: 'chain', special: 'Tearing'}
    });
    assert.equal(doc.system.special, 'Tearing');
});

test('Scholastic Lore offers the Common Lore specialisations too (DH2 p. 114)', () => {
    // "Scholastic Lore has several Specialisations. These include all those for
    // Common Lore, as even commonly known information can be studied to greater
    // depths."
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    const skills = template.Actor.templates.skills.skills;
    const common = Object.keys(skills.commonLore.specialities);
    const scholastic = Object.keys(skills.scholasticLore.specialities);
    for (const key of common)
        assert.ok(scholastic.includes(key), `Scholastic Lore is missing ${key}`);
});

test('Scholastic Lore keeps its own specialisations', () => {
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    const scholastic = Object.keys(template.Actor.templates.skills.skills.scholasticLore.specialities);
    for (const key of ['astromancy', 'beasts', 'bureaucracy', 'cryptology', 'heraldry',
                       'judgement', 'legend', 'numerology', 'occult', 'philosophy', 'tacticaImperialis'])
        assert.ok(scholastic.includes(key), `lost its own ${key}`);
});
