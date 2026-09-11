import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';
import {RULESET_DEFS} from '../script/creation/ruleset-data.mjs';

const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');

/** Fields a character type actually has, its templates folded in. */
const model = type => (template.Actor[type].templates ?? [])
    .reduce((out, name) => ({...out, ...template.Actor.templates[name]}), {...template.Actor[type]});

test('both character types carry every field any book writes', () => {
    const acolyte = model('acolyte');
    const heretic = model('heretic');
    for (const field of ['race', 'archetype', 'patron', 'alignment', 'pride', 'vice', 'aspiration']) {
        assert.notEqual(acolyte[field], undefined, `acolyte has no ${field}`);
        assert.notEqual(heretic[field], undefined, `heretic has no ${field}`);
    }
    // Whatever the book writes, it writes into the same shape on either type: a character
    // can be re-pointed at another book without being re-created.
    assert.deepEqual(Object.keys(acolyte).sort(), Object.keys(heretic).sort());
});

test('no book demands an actor type any more', () => {
    for (const [id, def] of Object.entries(RULESET_DEFS))
        assert.equal(def.actorType, undefined, id);
    assert.equal(source.includes('WIZARD.WRONG_TYPE'), false,
        'the warning that asked the player to have a different sheet created is gone');
});

test('every book has a sheet, and the sheet is chosen by the book', () => {
    const system = loadSystem();
    const sheets = system.get('Dh.bookSheets');
    assert.deepEqual(Object.keys(sheets).sort(), Object.keys(RULESET_DEFS).sort());

    const sheetFor = system.get('Dh.sheetFor');
    assert.equal(sheetFor({system: {ruleset: 'bc'}, type: 'acolyte'}), 'BlackCrusadeSheet',
        'the book wins over the type');
    assert.equal(sheetFor({system: {ruleset: 'ow'}, type: 'heretic'}), 'OnlyWarSheet');
    // A character who never named a book keeps the sheet his type always had.
    assert.equal(sheetFor({type: 'heretic', system: {}}), 'BlackCrusadeSheet');
    assert.equal(sheetFor({type: 'acolyte', system: {}}), 'DarkHeresy2Sheet');
    assert.equal(sheetFor(null), 'DarkHeresy2Sheet');
});

test('each sheet names its own biography, vitals and tabs', () => {
    const system = loadSystem();
    const sheets = system.get('Dh.bookSheets');
    const seen = new Map();
    for (const [id, sheet] of Object.entries(sheets)) {
        assert.equal(sheet.ruleset, id);
        assert.match(sheet.bioPartial, /partial\/bio-[a-z-]+\.hbs$/, id);
        assert.ok(sheet.vitals.length >= 3, id);
        assert.ok(sheet.tabList.length >= 8, id);
        // Two books must not share one biography: that was the whole point.
        assert.equal(seen.get(sheet.bioPartial), undefined, `${id} reuses ${sheet.bioPartial}`);
        seen.set(sheet.bioPartial, id);
    }
    const tabs = id => sheets[id].tabList.map(tab => tab.id);
    assert.ok(tabs('ow').includes('squad'), 'the Guardsman has his Comrade');
    assert.equal(tabs('dh2').includes('squad'), false);
    assert.ok(tabs('bc').includes('allegiance'), 'the Heretic has his patron and his tally');
    assert.equal(tabs('dh2').includes('allegiance'), false);
    assert.ok(sheets.bc.vitals.includes('infamy'), 'Infamy Points stand where Fate would');
    assert.equal(sheets.bc.vitals.includes('fate'), false);
});

test('every partial a sheet names exists and is preloaded', () => {
    const system = loadSystem();
    const sheets = system.get('Dh.bookSheets');
    const wanted = new Set(["systems/dark-heresy/template/sheet/actor/character.hbs"]);
    for (const sheet of Object.values(sheets)) {
        wanted.add(sheet.bioPartial);
        for (const key of sheet.vitals)
            wanted.add(`systems/dark-heresy/template/sheet/actor/partial/vital-${key}.hbs`);
        for (const tab of sheet.tabList)
            wanted.add(`systems/dark-heresy/template/sheet/actor/${tab.partial}`);
    }
    for (const path of wanted) {
        const file = new URL('../' + path.replace('systems/dark-heresy/', ''), import.meta.url);
        assert.ok(existsSync(file), `missing file: ${path}`);
        // A partial addressed by a name from the context must be loaded up front, or
        // Handlebars will not find it when the sheet renders.
        assert.ok(source.includes(`"${path}"`), `not preloaded: ${path}`);
    }
});

test('the frame hands the sheet context down to every partial it calls', () => {
    const frame = readFileSync(new URL('../template/sheet/actor/character.hbs', import.meta.url), 'utf8');
    // Inside an {{#each}} the current context is the row, so a partial called there
    // would otherwise render without system, items or anything else.
    assert.match(frame, /\{\{> \(lookup vital "partial"\) \.\.\/this\}\}/);
    assert.match(frame, /\{\{> \(lookup tab "partial"\) \.\.\/this\}\}/);
});
