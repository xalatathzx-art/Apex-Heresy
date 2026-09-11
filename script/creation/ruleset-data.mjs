// ════════════════════════════════════════════════════════════════════════
//  О чём спрашивает Мастер создания — по книгам.
//
//  У самого Мастера ветвлений по книге нет: он идёт по этому списку, а `kind`
//  шага решает, какая панель рисуется. Добавить книгу — значит дописать сюда
//  запись, а не разложить условия по коду окна.
//
//  Порядок шагов книжный. Black Crusade единственная просит характеристики
//  посреди происхождения: архетип там выбирается уже зная их (стр. 47).
//
//  `bioField` у шага — куда на листе попадает НАЗВАНИЕ выбранного. Заполняется
//  в момент выбора, а не в конце: игрок видит, как анкета собирается под его
//  руками. Поле остаётся редактируемым — переименовать «Мир-улей» в «Десолеум»
//  это обычная игра, а не поломка.
//
//  `characteristicModifiers` — чем является модификатор характеристики:
//    "generation" — правилом генерации, а не числом. Dark Heresy при «+» кидает
//                   3d10 и берёт две лучшие, при «–» две худшие, а при закупке
//                   начинает с 30 вместо 25 и с 20 вместо 25 (стр. 31). Модификатор
//                   уже сидит в полученном значении, и прибавлять его ВТОРОЙ раз
//                   нельзя.
//    "flat"       — обычной прибавкой к готовому значению.
//    null         — книга на этот счёт ещё не сверена; Мастер такую не ведёт.
// ════════════════════════════════════════════════════════════════════════

import {CHARACTERISTIC_KEYS} from "./origin-data.mjs";

/** Паки, где ищется выданное по имени. У книги свой пак идёт первым. */
const CONTENT_PACKS = ["dark-heresy.dark-heresy", "dark-heresy.black-crusade",
    "dark-heresy.rogue-trader", "dark-heresy.only-war", "dark-heresy.deathwatch"];
const packsFirst = pack => [pack, ...CONTENT_PACKS.filter(entry => entry !== pack)];

//  Поля правил, которыми книги расходятся (значение Dark Heresy — по умолчанию):
//    ready                 — Мастер по книге доведён до конца и предлагается игрокам;
//    characteristicRerolls — сколько результатов характеристик можно перебросить;
//    startingExperience    — стартовый опыт, если его не задаёт происхождение;
//    fate                  — {formula, table}: Судьба броском по таблице, а не от мира;
//    duplicates            — skill: "best" (лучшее из двух) | "advance" (лишний ранг),
//                            talentExperience: опыт взамен повторного таланта;
//    contentPacks          — порядок паков при поиске выданного по имени;
//    characteristicKeys    — характеристики книги.
export const RULESET_DEFS = {
    dh2: {
        label: "RULESET.DH2", actorType: "acolyte",
        ready: true,
        characteristicModifiers: "generation",
        characteristicMethods: ["roll", "pointBuy"],
        characteristicRerolls: 0,
        startingExperience: 1000,
        duplicates: {skill: "best", talentExperience: 0},
        contentPacks: packsFirst("dark-heresy.dark-heresy"),
        steps: [
            {id: "homeWorld",       label: "ORIGIN.STAGE.HOME_WORLD",  kind: "origin", stage: "homeWorld", bioField: "system.bio.homeWorld"},
            {id: "background",      label: "ORIGIN.STAGE.BACKGROUND",  kind: "origin", stage: "background", bioField: "system.bio.background"},
            {id: "role",            label: "ORIGIN.STAGE.ROLE",        kind: "origin", stage: "role", bioField: "system.bio.role"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"},
            // Стадия 4 книги — «Spend Experience Points, Equip Acolyte» (стр. 78-82).
            {id: "equipment",       label: "WIZARD.EQUIPMENT",         kind: "equipment"},
            {id: "divination",      label: "ORIGIN.STAGE.DIVINATION",  kind: "divination"}
        ]
    },
    rt: {
        label: "RULESET.RT", actorType: "acolyte",
        characteristicModifiers: null,
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            // Путь Происхождения — шесть строк одной таблицы с правилом соседства,
            // поэтому один шаг с собственным виджетом, а не шесть выпадающих списков.
            {id: "originPath",      label: "WIZARD.ORIGIN_PATH",       kind: "origin", stage: "homeWorld", widget: "grid"},
            {id: "career",          label: "ORIGIN.STAGE.CAREER",      kind: "origin", stage: "career"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"}
        ]
    },
    ow: {
        label: "RULESET.OW", actorType: "acolyte",
        // Мастер по Only War ещё не доведён до конца — игрокам не предлагается.
        ready: false,
        // Модификаторы полка и специальности прибавляются к готовому броску (стр. 41).
        characteristicModifiers: "flat",
        characteristicMethods: ["roll", "pointBuy"],
        characteristicRerolls: 1,
        // 600 у гвардейца; специальность поддержки задаёт 300 сама (стр. 100).
        startingExperience: 600,
        fate: {formula: "1d10", table: [{min: 1, max: 7, value: 1}, {min: 8, max: 9, value: 2}, {min: 10, max: 10, value: 3}]},
        duplicates: {skill: "advance", talentExperience: 100},
        contentPacks: packsFirst("dark-heresy.only-war"),
        characteristicKeys: CHARACTERISTIC_KEYS.filter(key => key !== "influence"),
        steps: [
            // Книжный порядок (стр. 73): полк группы, затем характеристики, специальность,
            // раны-судьба-опыт и Comrade. Полк — один на весь отряд и собирается за бюджет.
            {id: "regiment",        label: "ORIGIN.STAGE.REGIMENT",    kind: "regiment", stage: "regiment", bioField: "system.bio.background"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "speciality",      label: "ORIGIN.STAGE.SPECIALITY",  kind: "origin", stage: "speciality", bioField: "system.bio.role"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"},
            {id: "comrade",         label: "WIZARD.COMRADE",           kind: "comrade"}
        ]
    },
    bc: {
        label: "RULESET.BC", actorType: "heretic",
        characteristicModifiers: null,
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "race",            label: "ORIGIN.STAGE.RACE",        kind: "origin", stage: "race", bioField: "system.race"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "archetype",       label: "ORIGIN.STAGE.ARCHETYPE",   kind: "origin", stage: "archetype", bioField: "system.archetype"},
            {id: "pride",           label: "ORIGIN.STAGE.PRIDE",       kind: "origin", stage: "pride"},
            {id: "disgrace",        label: "ORIGIN.STAGE.DISGRACE",    kind: "origin", stage: "disgrace"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"}
        ]
    },
    dw: {
        label: "RULESET.DW", actorType: "acolyte",
        characteristicModifiers: null,
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "chapter",         label: "ORIGIN.STAGE.CHAPTER",     kind: "origin", stage: "chapter"},
            {id: "speciality",      label: "ORIGIN.STAGE.SPECIALITY",  kind: "origin", stage: "speciality"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"}
        ]
    }
};

/** Шаги Мастера для книги; незнакомая книга просто не имеет шагов. */
export function stepsFor(ruleset) { return RULESET_DEFS[ruleset]?.steps ?? []; }

/** Только те шаги, на которых выбирается предмет происхождения. */
export function originStepsFor(ruleset) { return stepsFor(ruleset).filter(s => s.kind === "origin"); }

/** Книги, по которым Мастер реально умеет вести: сверенные и доведённые до конца. */
export function auditedRulesets() {
    return Object.keys(RULESET_DEFS).filter(key => RULESET_DEFS[key].ready && RULESET_DEFS[key].characteristicModifiers);
}

/** Характеристики книги. */
export function characteristicKeysFor(ruleset) {
    return RULESET_DEFS[ruleset]?.characteristicKeys ?? CHARACTERISTIC_KEYS;
}

/** Порядок паков для поиска выданного по имени. */
export function contentPacksFor(ruleset) {
    return RULESET_DEFS[ruleset]?.contentPacks ?? CONTENT_PACKS;
}

/** Судьба по таблице: строка, в которую попал бросок. */
export function fateFromTable(total, table) {
    return (table ?? []).find(row => total >= row.min && total <= row.max)?.value ?? 0;
}
