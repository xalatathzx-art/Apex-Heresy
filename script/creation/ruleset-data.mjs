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
//  `characteristicModifiers` — чем является модификатор характеристики:
//    "generation" — правилом генерации, а не числом. Dark Heresy при «+» кидает
//                   3d10 и берёт две лучшие, при «–» две худшие, а при закупке
//                   начинает с 30 вместо 25 и с 20 вместо 25 (стр. 31). Модификатор
//                   уже сидит в полученном значении, и прибавлять его ВТОРОЙ раз
//                   нельзя.
//    "flat"       — обычной прибавкой к готовому значению.
//    null         — книга на этот счёт ещё не сверена; Мастер такую не ведёт.
// ════════════════════════════════════════════════════════════════════════

export const RULESET_DEFS = {
    dh2: {
        label: "RULESET.DH2", actorType: "acolyte",
        characteristicModifiers: "generation",
        characteristicMethods: ["roll", "rollModified", "pointBuy"],
        steps: [
            {id: "homeWorld",       label: "ORIGIN.STAGE.HOME_WORLD",  kind: "origin", stage: "homeWorld"},
            {id: "background",      label: "ORIGIN.STAGE.BACKGROUND",  kind: "origin", stage: "background"},
            {id: "role",            label: "ORIGIN.STAGE.ROLE",        kind: "origin", stage: "role"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"},
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
        characteristicModifiers: null,
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            // Полк собирается из компонентов за общий бюджет и один на всю группу —
            // отсюда счётчик очков вместо простого выбора.
            {id: "regiment",        label: "WIZARD.REGIMENT",          kind: "origin", stage: "regimentOrigin", widget: "budget"},
            {id: "speciality",      label: "ORIGIN.STAGE.SPECIALITY",  kind: "origin", stage: "speciality"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "experience",      label: "WIZARD.EXPERIENCE",        kind: "experience"}
        ]
    },
    bc: {
        label: "RULESET.BC", actorType: "heretic",
        characteristicModifiers: null,
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "race",            label: "ORIGIN.STAGE.RACE",        kind: "origin", stage: "race"},
            {id: "characteristics", label: "WIZARD.CHARACTERISTICS",   kind: "characteristics"},
            {id: "archetype",       label: "ORIGIN.STAGE.ARCHETYPE",   kind: "origin", stage: "archetype"},
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

/** Книги, по которым Мастер реально умеет вести: сверенные, а не просто описанные. */
export function auditedRulesets() {
    return Object.keys(RULESET_DEFS).filter(key => RULESET_DEFS[key].characteristicModifiers);
}
