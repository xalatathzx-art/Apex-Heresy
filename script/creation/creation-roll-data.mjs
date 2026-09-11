// ════════════════════════════════════════════════════════════════════════
//  Кости при создании: как получается характеристика, и чем записываются
//  стартовые Раны и Судьба.
//
//  Модуль отдаёт СТРОКИ формул, а не числа: бросает их вызывающая сторона
//  через Roll самого Foundry, поэтому здесь нет ни одной глобали и всё
//  проверяется тестами.
// ════════════════════════════════════════════════════════════════════════

import {CHARACTERISTIC_KEYS} from "./origin-data.mjs";

/**
 * Способы получить характеристику: костями или распределением очков.
 * Третьего книга не предлагает.
 */
export const CHARACTERISTIC_METHODS = ["roll", "pointBuy"];

/** База, бюджет и потолок распределения очков. */
export const POINT_BUY = {base: 25, points: 60, cap: 40};

/**
 * Распределение очков по книгам. Only War (стр. 75): 20 в каждой, 100 очков, не больше
 * +20 на одну характеристику — то есть потолок 40.
 */
export const POINT_BUY_RULES = {dh2: POINT_BUY, ow: {base: 20, points: 100, cap: 40}};

export function pointBuyRules(ruleset) { return POINT_BUY_RULES[ruleset] ?? POINT_BUY; }

/**
 * Формула одной характеристики.
 *
 * Чем является модификатор, решает книга, а не игрок:
 *   "generation" — Dark Heresy, стр. 31. «+» значит кинуть 3d10 и взять две лучшие,
 *                  «−» — две худшие. Прибавки к результату книга не знает вовсе.
 *   "flat"       — модификатор прибавляется к готовому броску.
 *
 * @param {"generation"|"flat"} modifierMode  из RULESET_DEFS[…].characteristicModifiers
 * @param {number} modifier                   сумма модификаторов происхождения
 * @returns {string}                          выражение для Roll
 */
export function rollExpression(modifierMode, modifier = 0) {
    if (!modifier) return "2d10+20";
    if (modifierMode === "generation") return modifier > 0 ? "3d10kh2+20" : "3d10kl2+20";
    return `2d10+20${modifier > 0 ? "+" : "-"}${Math.abs(modifier)}`;
}

/**
 * Всё, что не так с распределением очков.
 *
 * Недотратить бюджет можно — это выбор игрока; перетратить, уйти ниже базы или
 * выше потолка нельзя.
 *
 * @param {Record<string, number>} values  характеристика → значение
 * @param {{base: number, points: number, cap: number}} [rules]  правила книги
 * @param {string[]} [keys]  характеристики книги: у Only War нет Влияния
 * @returns {string[]}
 */
export function pointBuyProblems(values = {}, rules = POINT_BUY, keys = CHARACTERISTIC_KEYS) {
    const problems = [];
    let spent = 0;

    for (const key of keys) {
        const value = values[key];
        if (typeof value !== "number") { problems.push(`${key} has no value`); continue; }
        if (value < rules.base) problems.push(`${key} is ${value}, below the base of ${rules.base}`);
        if (value > rules.cap) problems.push(`${key} is ${value}, above the cap of ${rules.cap}`);
        spent += value - rules.base;
    }
    if (spent > rules.points) problems.push(`spent ${spent} of a ${rules.points} point budget`);

    return problems;
}

/**
 * Стартовые Раны формулой.
 *
 * @param {{formula?: string, bonus?: number, doubleToughnessBonus?: boolean}} wounds
 * @param {number} toughnessBonus  бонус Стойкости, если книга его удваивает
 * @returns {string}
 */
export function woundsExpression(wounds = {}, toughnessBonus = 0) {
    const parts = [];
    if (wounds.doubleToughnessBonus) parts.push(String(toughnessBonus * 2));
    if (wounds.formula) parts.push(wounds.formula);

    let out = parts.join("+") || "0";
    if (wounds.bonus) out += `${wounds.bonus > 0 ? "+" : "-"}${Math.abs(wounds.bonus)}`;
    return out;
}

/**
 * Стартовая Судьба формулой. Порог Благословения Императора здесь не участвует:
 * он не бросается, а просто хранится рядом.
 *
 * @param {{value?: number, formula?: string}} fate
 * @returns {string}
 */
export function fateExpression(fate = {}) {
    return fate.formula || String(fate.value ?? 0);
}
