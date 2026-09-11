// ════════════════════════════════════════════════════════════════════════
//  Боги и цены — Black Crusade, стр. 76-79.
//
//  Склонностей в этой книге нет вовсе. Цену улучшения задаёт бог, которому
//  улучшение принадлежит, и то, как он относится к покровителю персонажа:
//  свой (True), союзный (Allied) или враждебный (Opposed).
//
//  Таблицы живут здесь, а лист и Мастер их только читают: разъехавшиеся
//  копии цен — это персонаж, которому кнопка обещает одно, а лист считает
//  другое.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Четыре бога и Хаос Неделимый. Порядок — книжный. */
export const PATRONS = ["khorne", "nurgle", "slaanesh", "tzeentch"];
export const UNDIVIDED = "undivided";

/**
 * Таблица 2-4: союзники и противники (стр. 76).
 *
 * Кхорн с Нурглом заодно, Слаанеш с Тзинчем заодно, а эти пары враждуют.
 * Неделимый союзен всем и всем союзник — он никому не враг.
 */
export const PATRON_RELATIONS = {
    khorne:    {khorne: "own", nurgle: "ally", slaanesh: "enemy", tzeentch: "enemy", undivided: "ally"},
    nurgle:    {khorne: "ally", nurgle: "own", slaanesh: "enemy", tzeentch: "enemy", undivided: "ally"},
    slaanesh:  {khorne: "enemy", nurgle: "enemy", slaanesh: "own", tzeentch: "ally", undivided: "ally"},
    tzeentch:  {khorne: "enemy", nurgle: "enemy", slaanesh: "ally", tzeentch: "own", undivided: "ally"},
    undivided: {khorne: "ally", nurgle: "ally", slaanesh: "ally", tzeentch: "ally", undivided: "ally"}
};

/**
 * Кем приходится бог покупки покровителю персонажа.
 *
 * Неразмеченная покупка идёт Неделимому, а не самому дорогому разряду: книга
 * относит к Неделимому всё, у чего бога нет (стр. 76).
 */
export function patronRelation(patron, god) {
    const row = PATRON_RELATIONS[patron || UNDIVIDED] ?? PATRON_RELATIONS[UNDIVIDED];
    return row[god || UNDIVIDED] ?? "ally";
}

/** Таблица 2-6: характеристики (стр. 78). Ступени Simple, Intermediate, Trained, Expert. */
export const BC_CHARACTERISTIC_COSTS = {
    own:   [100, 250, 500, 750],
    ally:  [250, 500, 750, 1000],
    enemy: [500, 750, 1000, 2500]
};

/** Таблица 2-7: навыки (стр. 78). Ступени Known, Trained, Experienced, Veteran. */
export const BC_SKILL_COSTS = {
    own:   [100, 200, 400, 600],
    ally:  [200, 350, 500, 750],
    enemy: [250, 500, 750, 1000]
};

/** Таблица 2-9: таланты (стр. 79). Уровни 1, 2, 3. */
export const BC_TALENT_COSTS = {
    own:   [200, 300, 400],
    ally:  [250, 500, 750],
    enemy: [500, 750, 1000]
};

/**
 * Тёмная слава живёт вне таблицы (стр. 78): каждые +5 стоят 500 ОО при любом
 * покровителе, брать можно сколько угодно раз, но только пока показатель ниже
 * 40 — дальше славу зарабатывают деяниями, а не опытом.
 */
export const BC_INFAMY_ADVANCE = {cost: 500, cap: 40};

/**
 * Таблица 2-5: бог характеристики (стр. 77).
 *
 * Покровитель есть только у четырёх; всё остальное, включая саму Тёмную славу,
 * принадлежит Неделимому и в списке не значится.
 */
export const BC_CHARACTERISTIC_PATRONS = {
    strength: "khorne",
    toughness: "nurgle",
    willpower: "tzeentch",
    fellowship: "slaanesh"
};

/** Таблица 2-8: бог навыка (стр. 79). В списке только те, кто не Неделимый. */
export const BC_SKILL_PATRONS = {
    acrobatics: "slaanesh",
    charm: "slaanesh",
    deceive: "slaanesh",
    dodge: "slaanesh",
    athletics: "khorne",
    command: "khorne",
    parry: "khorne",
    survival: "nurgle",
    intimidate: "nurgle",
    medicae: "nurgle",
    forbiddenLore: "tzeentch",
    logic: "tzeentch",
    scrutiny: "tzeentch",
    psyniscience: "tzeentch"
};

/** Ступени, по порядку: перескочить через ступень книга не даёт. */
export const BC_CHARACTERISTIC_LEVELS = ["simple", "intermediate", "trained", "expert"];
export const BC_SKILL_LEVELS = ["known", "trained", "experienced", "veteran"];

const LADDERS = {characteristic: BC_CHARACTERISTIC_COSTS, skill: BC_SKILL_COSTS, talent: BC_TALENT_COSTS};

/**
 * Цена ОДНОЙ ступени.
 *
 * @param {"characteristic"|"skill"|"talent"} kind
 * @param {"own"|"ally"|"enemy"} relation
 * @param {number} step  номер ступени с нуля (у таланта это уровень минус один)
 * @returns {number|null} null, если ступени за пределами лестницы
 */
export function stepCost(kind, relation, step) {
    const ladder = LADDERS[kind]?.[relation];
    if (!ladder || step < 0 || step >= ladder.length) return null;
    return ladder[step];
}

/**
 * Во сколько обошлись первые `steps` ступеней.
 *
 * Оплата накопительная: четвёртая ступень стоит суммы всех четырёх, потому что
 * до неё пришлось купить три предыдущие (стр. 78).
 */
export function ladderTotal(kind, relation, steps) {
    const ladder = LADDERS[kind]?.[relation] ?? [];
    let total = 0;
    for (let i = 0; i < steps && i < ladder.length; i++) total += ladder[i];
    return total;
}

/** Сколько стоит поднять Тёмную славу ещё на +5; null — если она уже 40 и выше. */
export function infamyAdvanceCost(value) {
    return (Number(value) || 0) >= BC_INFAMY_ADVANCE.cap ? null : BC_INFAMY_ADVANCE.cost;
}

/**
 * Кому персонаж принадлежит по счёту улучшений (стр. 76).
 *
 * Выровненным становится тот, кто оторвался от КАЖДОГО из остальных на пять
 * улучшений. У Неделимого счётчика нет: к нему приходят не по очкам, а по их
 * отсутствию.
 */
export function alignmentLeader(counts = {}, threshold = 5) {
    const ranked = PATRONS.map(god => [god, Number(counts[god]) || 0]).sort((a, b) => b[1] - a[1]);
    const [leader, lead] = ranked[0];
    const runnerUp = ranked[1]?.[1] ?? 0;
    return (lead - runnerUp) >= threshold ? leader : UNDIVIDED;
}

/** Сколько улучшений по одному пути даёт Знак Хаоса (стр. 79). */
export const MARK_OF_CHAOS_ADVANCES = 20;
