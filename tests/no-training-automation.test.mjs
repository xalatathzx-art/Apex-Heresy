import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

// Владение оружием учитывают сами игроки: система штраф за него не считает.

test('an attack with a typed weapon and no talents keeps its full target', async () => {
    const system = loadSystem();
    const actor = {type: 'acolyte', system: {ruleset: 'dh2'}, items: [], effects: [],
        allApplicableEffects: function* () {}, getActiveTokens: () => []};
    system.context.fromUuidSync = () => actor;
    const rollData = {actorUuid: 'Actor.a', itemName: 'Lasgun', flags: {isAttack: true},
        target: {base: 40, modifier: 0}, weapon: {weaponType: 'las', weaponClass: 'basic', traits: {}}};
    await system.get('_computeCombatTarget')(rollData);
    assert.equal(rollData.target.final, 40);
    assert.equal(rollData.untrainedModifier, undefined);
});

test('the training module is gone', () => {
    assert.equal(existsSync(new URL('../script/combat/weapon-training.mjs', import.meta.url)), false);
});
