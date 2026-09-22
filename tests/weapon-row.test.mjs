import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../css/dark-heresy.css', import.meta.url), 'utf8');
const combat = readFileSync(new URL('../template/sheet/actor/tab/combat.hbs', import.meta.url), 'utf8');

/**
 * The weapon row ends in a column of controls, and there are two of them.
 *
 * The column was sized for one. When the damage-only button was added beside
 * Attack, both kept asking for the full width and the second pushed the first
 * out of the column: every weapon on every sheet showed only "Damage", and the
 * attack could not be clicked at all.
 */
test('the control column holds both buttons', () => {
    // Both are still drawn, and a jam replaces them rather than joining them.
    assert.match(combat, /class="roll-weapon"/);
    assert.match(combat, /class="roll-weapon-damage"/);
    assert.match(combat, /\{\{#if item\.jammed\}\}[\s\S]*?clear-jam[\s\S]*?\{\{else\}\}[\s\S]*?roll-weapon[\s\S]*?\{\{\/if\}\}/);

    // The last grid track is wide enough for two, not one.
    const grid = css.match(/--dh-weapon-cols:[\s\S]*?;/)?.[0];
    assert.ok(grid, 'the weapon grid is defined');
    const last = Number(grid.match(/(\d+)px;\s*$/)?.[1]);
    assert.ok(last >= 140, `the control column is ${last}px, too narrow for two buttons`);

    // And the buttons share that track instead of each demanding all of it.
    const rule = css.slice(css.indexOf('.dark-heresy .combat .weapons .item-list .items .weapon .attack button {'));
    const body = rule.slice(0, rule.indexOf('}'));
    assert.match(body, /flex: 1 1 0;/, 'each button takes an equal share');
    assert.equal(/width:\s*100%/.test(body), false,
        'width:100% on two buttons is what pushed the attack out of the column');
});
