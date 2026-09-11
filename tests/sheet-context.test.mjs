import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

// A native data model serialises only its schema. Everything prepareData derives on
// top of it - armour per location, movement, encumbrance, insanity and corruption
// bonuses - is absent from toObject(), so a sheet built from it shows those as blank.
class PreparedModel {
    constructor() {
        this.characteristics = {toughness: {base: 30, total: 35}};
        this.armour = {body: {value: 2, toughnessBonus: 3, total: 5}};
    }
    toObject() { return {characteristics: structuredClone(this.characteristics)}; }
}

test('the sheet context carries the fields prepareData derives', () => {
    const system = loadSystem();
    const context = system.get('sheetSystem')({system: new PreparedModel()});
    assert.equal(context.armour.body.total, 5);
    assert.equal(context.characteristics.toughness.total, 35);
});

test('the sheet context is a copy, so a sheet that rewrites it leaves the document alone', () => {
    const system = loadSystem();
    const document = {system: new PreparedModel()};
    const context = system.get('sheetSystem')(document);
    context.armour.body.total = 99;
    context.characteristics.toughness.total = 0;
    assert.equal(document.system.armour.body.total, 5);
    assert.equal(document.system.characteristics.toughness.total, 35);
});

test('no sheet builds its context from the serialised document', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.equal(/data\.data\.system/.test(source), false,
        'data.data.system drops derived fields; use sheetSystem(this.document)');
});
