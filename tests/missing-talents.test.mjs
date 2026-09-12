import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MISSING_TALENTS, TALENT_FOLDERS} from '../tools/lib/missing-talents.mjs';

const byName = new Map(MISSING_TALENTS.map(entry => [entry.name, entry]));

test('every talent the report named is present', () => {
    for (const name of ['Soulless Aura', 'Psychic Null', 'Bane of the Daemon', 'Warp Disruption',
                        'Warp Anathema', 'Warp Bane', 'Null Field', 'Daemonic Anathema'])
        assert.ok(byName.has(name), `missing Untouchable talent ${name}`);
    for (const name of ['Holy Light', 'Seal of Purity', 'Wrath of the Righteous',
                        'Hand of the Emperor', 'The Unforgiving Blade'])
        assert.ok(byName.has(name), `missing Sisters of Battle talent ${name}`);
});

test('Inquisitor is not among them, because it is not a talent', () => {
    // elite-data.mjs already records that the Inquisitor advance is granted by a
    // serving Inquisitor's decree rather than bought, so there is nothing to add.
    assert.equal(byName.has('Inquisitor'), false);
    assert.equal(byName.has('Untouchable'), false, 'the advance itself is already modelled');
});

test('each entry cites its page', () => {
    for (const entry of MISSING_TALENTS)
        assert.match(entry.system.source, /^Dark Heresy Second Edition, p\. \d+$/, entry.name);
});

test('each entry declares a tier, prerequisites and aptitudes', () => {
    for (const entry of MISSING_TALENTS) {
        assert.equal(typeof entry.system.tier, 'number', entry.name);
        assert.ok(entry.system.prerequisites.length, `${entry.name} has no prerequisites`);
        assert.ok(entry.system.aptitudes.length, `${entry.name} has no aptitudes`);
        assert.ok(entry.system.description.length > 40, `${entry.name} has no text`);
    }
});

test('the Untouchable tiers match the book', () => {
    assert.equal(byName.get('Soulless Aura').system.tier, 1);
    assert.equal(byName.get('Psychic Null').system.tier, 2);
    assert.equal(byName.get('Bane of the Daemon').system.tier, 2);
    assert.equal(byName.get('Warp Disruption').system.tier, 2);
    for (const name of ['Warp Anathema', 'Warp Bane', 'Null Field', 'Daemonic Anathema'])
        assert.equal(byName.get(name).system.tier, 3, name);
});

test('each entry lands in the folder for its tier', () => {
    assert.equal(byName.get('Soulless Aura').folder, TALENT_FOLDERS[1]);
    assert.equal(byName.get('Psychic Null').folder, TALENT_FOLDERS[2]);
    assert.equal(byName.get('Null Field').folder, TALENT_FOLDERS[3]);
    assert.equal(byName.get('Holy Light').folder, TALENT_FOLDERS.faith);
});

test('prerequisite chains point at talents that exist here', () => {
    // Warp Anathema needs Warp Disruption, Null Field needs Psychic Null, and
    // Daemonic Anathema needs Warp Anathema. A chain into thin air is a data bug.
    const names = new Set(byName.keys());
    for (const [name, needs] of [['Warp Anathema', 'Warp Disruption'],
                                 ['Warp Bane', 'Warp Disruption'],
                                 ['Null Field', 'Psychic Null'],
                                 ['Daemonic Anathema', 'Warp Anathema']]) {
        assert.match(byName.get(name).system.prerequisites, new RegExp(needs), name);
        assert.ok(names.has(needs), `${name} depends on ${needs}, which is not defined`);
    }
});

test('no two entries share a name', () => {
    assert.equal(byName.size, MISSING_TALENTS.length);
});
