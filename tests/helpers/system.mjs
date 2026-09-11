import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {applyTraitOverrides, editTraitOverrides, validateTraitOverrides, WEAPON_TRAIT_TYPES, traitOverridesFromRows, traitOverridePatch} from '../../script/data/weapon-traits.mjs';
import {PATRON_RELATIONS, BC_CHARACTERISTIC_COSTS, BC_SKILL_COSTS, BC_TALENT_COSTS,
        BC_CHARACTERISTIC_PATRONS, BC_SKILL_PATRONS, BC_INFAMY_ADVANCE, alignmentLeader}
    from '../../script/creation/patron-data.mjs';

// Run the actual legacy entry module without booting a world or opening sheets.
// Foundry's document persistence/UI are the external boundary, not copied rules.
export function loadSystem(overrides = {}) {
    const listeners = new Map();
    class Document {}
    const context = vm.createContext({
        console, Set, Map, Math, Number, Promise, structuredClone, setTimeout, clearTimeout,
        applyTraitOverrides, editTraitOverrides, validateTraitOverrides, WEAPON_TRAIT_TYPES, traitOverridesFromRows, traitOverridePatch,
        PATRON_RELATIONS, BC_CHARACTERISTIC_COSTS, BC_SKILL_COSTS, BC_TALENT_COSTS,
        BC_CHARACTERISTIC_PATRONS, BC_SKILL_PATRONS, BC_INFAMY_ADVANCE, alignmentLeader,
        Actor: Document, Item: Document, Combat: Document, ActiveEffect: Document,
        CONFIG: {statusEffects: [], ActiveEffect: {}, Actor: {}, Item: {}},
        CONST: {ACTIVE_EFFECT_MODES: {CUSTOM:0, MULTIPLY:1, ADD:2, DOWNGRADE:3, UPGRADE:4, OVERRIDE:5}},
        foundry: {appv1: {sheets: {ActorSheet: Document, ItemSheet: Document}}, utils: {
            deepClone: structuredClone,
            mergeObject: (a,b) => ({...a,...b}),
            getProperty: (o, p) => p.split('.').reduce((v,k) => v?.[k], o),
            isEmpty: o => !Object.keys(o).length
        }},
        Hooks: {on: register, once: register, call: () => true, callAll: () => {}},
        game: {settings: {get: () => false}, users: {}, actors: new Map(), scenes: new Map()},
        canvas: {ready: false},
        ...overrides
    });
    function register(name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
    }
    const source = readFileSync(new URL('../../script/dark-heresy.js', import.meta.url), 'utf8')
        .replace(/^import .*?;\r?\n/gm, '');
    vm.runInContext(source, context, {filename:'dark-heresy.js'});
    return {context, listeners, get: expression => vm.runInContext(expression, context)};
}

export function effect(status, options = {}) {
    return {id: 'effect', statuses: new Set([status]), disabled: false, active: true,
        isSuppressed: false, duration: {value: Infinity, seconds: Infinity},
        flags: {}, img:'custom.svg', ...options};
}

export function actorWithEffects(system, effects) {
    const actor = Object.create(system.get('DarkHeresyActor.prototype'));
    Object.assign(actor, {effects, allApplicableEffects: function* () {yield* effects;}, getActiveTokens: () => []});
    return actor;
}
