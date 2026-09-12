import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const combatTab = readFileSync(new URL('../template/sheet/actor/tab/combat.hbs', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('the weapon row offers a damage-only roll', () => {
    // The handler, its binding and the dialog all existed already; the button
    // was missing from the sheet, so nothing could reach any of it.
    assert.match(combatTab, /class="roll-weapon-damage"/);
});

test('the button sits beside the attack, on the same weapon row', () => {
    const attackAt = combatTab.indexOf('class="roll-weapon"');
    const damageAt = combatTab.indexOf('class="roll-weapon-damage"');
    assert.ok(attackAt > -1 && damageAt > attackAt);
    assert.ok(damageAt - attackAt < 500, 'the two live together in the row');
});

test('the binding and the handler it needs are in place', () => {
    assert.match(source, /\.roll-weapon-damage"\)\.click/);
    assert.match(source, /async _prepareWeaponDamage\(event\)/);
});

test('it opens the damage dialog rather than an attack', () => {
    const fn = source.slice(source.indexOf('async _prepareWeaponDamage(event)'));
    const body = fn.slice(0, fn.indexOf('\n    }'));
    assert.match(body, /openDirectDamageDialog\(rollData\)/);
    assert.doesNotMatch(body, /combatRoll|prepareCombatRoll/, 'no attack is rolled');
});

test('a stowed weapon still refuses', () => {
    const fn = source.slice(source.indexOf('async _prepareWeaponDamage(event)'));
    assert.match(fn.slice(0, fn.indexOf('\n    }')), /equipped !== true/);
});

test('the strings it needs exist', () => {
    assert.ok(lang['WEAPON.DAMAGE_ONLY']);
    assert.match(lang['WEAPON.DAMAGE_ONLY_HINT'], /degrees of success/);
});
