// ════════════════════════════════════════════════════════════════════════
//  Сборка полка Only War (стр. 58-69).
//
//  У группы 12 очков. За них берутся родной мир, характер командира и доктрины:
//  ровно одна из них — тип полка, и всего доктрин не больше трёх. Неистраченные
//  очки превращаются в очки комплекта по 2 за очко.
//
//  Выбор, который делает вся группа (какие две характеристики поднимает родной
//  мир, какой враг у Hated Enemy), разрешается здесь и становится обычной
//  выдачей. Выбор «или», который книга оставляет каждому бойцу (стр. 41),
//  остаётся выбором и переезжает в собранный полк.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

import {normaliseOrigin} from "./origin-data.mjs";
import {UNIVERSAL_KIT, KIT_POINTS, kitPoints} from "./kit-data.mjs";

export const REGIMENT_BUDGET = 12;
/** Тип полка входит в это число: «no more than three doctrines in total» (стр. 64). */
export const MAX_DOCTRINES = 3;

const byKey = (catalogue, key) => {
    const found = (catalogue ?? []).find(entry => entry.key === key);
    return found ? normaliseOrigin(found) : null;
};

/** Компоненты выбора в книжном порядке: мир, командир, тип, остальные доктрины. */
export function selectedComponents(selection, catalogue) {
    return [selection.homeWorld, selection.commander, selection.regimentType, ...(selection.doctrines ?? [])]
        .map(key => byKey(catalogue, key)).filter(Boolean);
}

/** Сколько очков стоит выбранное. */
export function regimentCost(selection, catalogue) {
    return selectedComponents(selection, catalogue).reduce((total, part) => total + (part.cost ?? 0), 0);
}

/**
 * Всё, что не так с выбором, словами.
 * @param {{homeWorld, commander, regimentType, doctrines, picks}} selection
 * @param {object[]} catalogue  system-части компонентов
 */
export function regimentProblems(selection, catalogue) {
    const problems = [];
    const need = (key, stage, label) => {
        const part = byKey(catalogue, selection[key]);
        if (!part) problems.push(`no ${label} chosen`);
        else if (part.stage !== stage) problems.push(`${part.key} is not a ${label}`);
        return part;
    };
    const home = need("homeWorld", "regimentOrigin", "home world");
    need("commander", "regimentCommander", "commanding officer");
    need("regimentType", "regimentType", "regiment type");

    const doctrines = selection.doctrines ?? [];
    if (new Set(doctrines).size !== doctrines.length) problems.push("the same doctrine is taken twice");
    for (const key of doctrines) {
        const part = byKey(catalogue, key);
        if (!part) problems.push(`unknown doctrine "${key}"`);
        else if (!["doctrine", "equipmentDoctrine"].includes(part.stage)) problems.push(`${key} is not a doctrine`);
    }
    // Тип полка — одна из трёх доктрин, поэтому своих остаётся не больше двух.
    if (doctrines.length + 1 > MAX_DOCTRINES)
        problems.push(`${doctrines.length + 1} doctrines of ${MAX_DOCTRINES}`);

    const cost = regimentCost(selection, catalogue);
    if (cost > REGIMENT_BUDGET) problems.push(`spent ${cost} of ${REGIMENT_BUDGET} points`);

    // Выбор характеристик родного мира делает группа, и он обязателен.
    for (const [index, choice] of (home?.characteristicChoices ?? []).entries()) {
        const picked = selection.picks?.homeWorldCharacteristics?.slice(0, choice.pick) ?? [];
        if (picked.length !== choice.pick) problems.push(`"${choice.label}" needs ${choice.pick} characteristic(s)`);
        else if (new Set(picked).size !== picked.length) problems.push(`"${choice.label}" picks the same characteristic twice`);
        else for (const key of picked)
            if (!choice.from.includes(key)) problems.push(`"${choice.label}" cannot take ${key}`);
        if (index > 0) problems.push("a home world with more than one characteristic choice is not supported");
    }
    for (const part of selectedComponents(selection, catalogue))
        for (const choice of part.choices ?? [])
            if (choice.regimentLevel && !selection.picks?.targets?.[choice.key])
                problems.push(`"${choice.label}" is unanswered`);

    return problems;
}

const mergeNamed = (list, entries) => {
    for (const entry of entries ?? []) if (!list.some(item => item.name === entry.name)) list.push({...entry});
};

/**
 * Собрать выбранное в одно происхождение стадии regiment.
 *
 * @returns {{system: object, problems: string[]}}
 */
export function composeRegiment(selection, catalogue, {name = "New Regiment", kit = []} = {}) {
    const problems = regimentProblems(selection, catalogue);
    const parts = selectedComponents(selection, catalogue);
    const home = byKey(catalogue, selection.homeWorld);

    const characteristics = {};
    const grants = {skills: [], specialities: [], talents: [], traits: [], equipment: [], aptitudes: [], wounds: 0};
    const choices = [];
    const bonuses = [];
    const slots = {mainWeapon: [...UNIVERSAL_KIT.mainWeapon], armour: [...UNIVERSAL_KIT.armour],
                   items: [...UNIVERSAL_KIT.items], squad: [], text: [UNIVERSAL_KIT.text]};

    const addCharacteristic = (key, value) => { characteristics[key] = (characteristics[key] ?? 0) + value; };

    for (const part of parts) {
        for (const [key, value] of Object.entries(part.characteristics)) addCharacteristic(key, value);
        for (const skill of part.grants.skills) {
            const existing = grants.skills.find(entry => entry.key === skill.key);
            if (existing) existing.advance = Math.max(existing.advance, skill.advance);
            else grants.skills.push({...skill});
        }
        for (const spec of part.grants.specialities) {
            const existing = grants.specialities.find(entry => entry.key === spec.key && entry.name === spec.name);
            if (existing) existing.advance = Math.max(existing.advance ?? 0, spec.advance ?? 0);
            else grants.specialities.push({...spec});
        }
        mergeNamed(grants.talents, part.grants.talents);
        mergeNamed(grants.traits, part.grants.traits);
        for (const aptitude of part.grants.aptitudes) if (!grants.aptitudes.includes(aptitude)) grants.aptitudes.push(aptitude);
        grants.wounds += part.grants.wounds ?? 0;
        bonuses.push(...part.bonuses);

        for (const choice of part.choices ?? []) {
            if (!choice.regimentLevel) { choices.push(structuredClone(choice)); continue; }
            // Ответ группы превращается в обычную выдачу: бойцу его уже не переспрашивают.
            const value = selection.picks?.targets?.[choice.key];
            if (!value) continue;
            if (choice.talentTemplate) mergeNamed(grants.talents, [{name: choice.talentTemplate.replace("{v}", value)}]);
            if (choice.specialityTemplate)
                grants.specialities.push({key: choice.specialityTemplate.key,
                                          name: choice.specialityTemplate.name.replace("{v}", value), advance: 0});
        }

        const partKit = part.rules?.kit;
        if (partKit) {
            if (partKit.mainWeapon?.length) slots.mainWeapon = partKit.mainWeapon.map(entry => ({...entry}));
            if (partKit.armour?.length) slots.armour = partKit.armour.map(entry => ({...entry}));
            for (const entry of partKit.items ?? []) slots.items.push({...entry});
            for (const entry of partKit.squad ?? []) slots.squad.push(entry);
            if (partKit.text) slots.text.push(partKit.text);
        }
    }

    for (const key of selection.picks?.homeWorldCharacteristics?.slice(0, home?.characteristicChoices?.[0]?.pick ?? 0) ?? [])
        addCharacteristic(key, home.characteristicChoices[0].value);

    // Покупки по таблице 2-6 ложатся поверх собранного комплекта.
    const points = kitPoints({unusedRegimentPoints: Math.max(0, REGIMENT_BUDGET - regimentCost(selection, catalogue)),
                              base: home?.rules?.kitPoints ?? KIT_POINTS});
    let spent = 0;
    for (const purchase of kit) {
        spent += purchase.cost ?? 0;
        const effect = purchase.effect ?? {};
        if (effect.type === "add") for (const entry of effect.items ?? []) slots.items.push({...entry});
        else if (effect.type === "replaceMain") slots.mainWeapon = (effect.replace ?? []).map(entry => ({...entry}));
        else if (effect.text) slots.text.push(effect.text);
    }
    if (spent > points) problems.push(`standard kit spends ${spent} of ${points} points`);

    const net = Object.fromEntries(Object.entries(characteristics).filter(([, value]) => value !== 0));
    const system = {
        ruleset: "ow", stage: "regiment", order: 0, key: "customRegiment",
        cost: regimentCost(selection, catalogue),
        characteristics: net, characteristicChoices: [], grants, choices, bonuses,
        rules: {
            kit: {mainWeapon: slots.mainWeapon, armour: slots.armour, items: slots.items,
                  squad: slots.squad, text: slots.text.join(" ")},
            favouredWeapons: selection.favouredWeapons ?? [],
            components: {homeWorld: selection.homeWorld, commander: selection.commander,
                         regimentType: selection.regimentType, doctrines: [...(selection.doctrines ?? [])],
                         cost: regimentCost(selection, catalogue)},
            regimentPicks: structuredClone(selection.picks ?? {}),
            kitPoints: points, kitSpent: spent,
            logistics: parts.reduce((total, part) => total + (part.rules?.logistics ?? 0), 0)
        },
        description: `<div class='bc-entry'><div class='bc-rule'><p>${name}</p></div></div>`,
        source: "Only War, pp. 58-69"
    };
    return {system, problems};
}
