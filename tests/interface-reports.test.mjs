import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

const css = readFileSync(new URL('../css/dark-heresy.css', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('an armour value of ten or more is not cut off', () => {
    // The box was a fixed 52x52 at the largest text size, so a second digit had
    // nowhere to go. It must be free to grow with its contents.
    const rule = css.slice(css.indexOf('.dark-heresy .combat .armour .armour-row .part .total {'));
    const body = rule.slice(0, rule.indexOf('}'));
    assert.doesNotMatch(body, /\n\s*width:\s*52px/, 'no fixed width pins the box');
    assert.match(body, /min-width/, 'it has a floor instead');
});

test('every difficulty names its modifier, as the books print it', () => {
    // "Challenging (+0)" read as "Challenging", which hides the one number the
    // choice is actually about.
    const expected = {
        'DIFFICULTY.TRIVIAL': '+60', 'DIFFICULTY.ELEMENTARY': '+50',
        'DIFFICULTY.SIMPLE': '+40', 'DIFFICULTY.EASY': '+30',
        'DIFFICULTY.ROUTINE': '+20', 'DIFFICULTY.ORDINARY': '+10',
        'DIFFICULTY.CHALLENGING': '+0', 'DIFFICULTY.DIFFICULT': '−10',
        'DIFFICULTY.HARD': '−20', 'DIFFICULTY.VERY_HARD': '−30',
        'DIFFICULTY.ARDUOUS': '−40', 'DIFFICULTY.PUNISHING': '−50',
        'DIFFICULTY.HELLISH': '−60'
    };
    for (const [key, modifier] of Object.entries(expected))
        assert.ok(lang[key]?.includes(`(${modifier})`), `${key} reads "${lang[key]}"`);
});

test('the difficulty a test rolls at still resolves to a label', () => {
    const difficulties = loadSystem().get('Dh.difficulties');
    assert.equal(difficulties[0], 'DIFFICULTY.CHALLENGING');
    assert.equal(difficulties['-20'], 'DIFFICULTY.HARD');
});

test('an item sheet can create a temporary effect, not only a passive one', () => {
    // The handler reads the category off the button and Foundry v14's duration
    // schema is {value, units}, so both were already right. The item sheet simply
    // never offered anything but "passive".
    const sheet = readFileSync(new URL('../template/sheet/item/effects.hbs', import.meta.url), 'utf8');
    assert.match(sheet, /category="temporary"/, 'a temporary group is offered');
    assert.match(sheet, /category="passive"/, 'alongside the passive one');
});

test('the item sheet actually fills both effect groups', () => {
    // The template names effectsPassive and effectsTemporary, so the sheet must
    // build them; otherwise both lists render empty and the fix is cosmetic.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /data\.item\.effectsPassive = /);
    assert.match(source, /data\.item\.effectsTemporary = /);
    const sheet = readFileSync(new URL('../template/sheet/item/effects.hbs', import.meta.url), 'utf8');
    assert.match(sheet, /entries=item\.effectsPassive/);
    assert.match(sheet, /entries=item\.effectsTemporary/);
    assert.doesNotMatch(sheet, /entries=item\.effectsList/, 'the undivided list is no longer used');
});
