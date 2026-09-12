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

test('the difficulty dropdown already prints its modifier, so the labels stay plain', () => {
    // Checked in the running application: the select renders "label (signed
    // value)" on its own — "Ordinary (+10)", "Challenging (0)". Putting the
    // modifier into the string as well produced "Challenging (+0) (0)", so the
    // report was answered by a change that was not needed and did harm.
    for (const [key, label] of [['DIFFICULTY.CHALLENGING', 'Challenging'],
                                ['DIFFICULTY.HARD', 'Hard'],
                                ['DIFFICULTY.ORDINARY', 'Ordinary']])
        assert.equal(lang[key], label, key);
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
