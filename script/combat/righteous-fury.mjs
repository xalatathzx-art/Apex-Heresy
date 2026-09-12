/**
 * Праведная ярость — и то, что книги считают её по-разному.
 *
 * Dark Heresy (а с ней Only War, Black Crusade и Deathwatch) на десятке кости
 * урона добавляет критический эффект: бросок 1d5 по таблице.
 *
 * Rogue Trader (стр. 245) не даёт крит вовсе. Десятка требует ВТОРОГО броска
 * атаки — того же самого, со всеми модификаторами. Попал — бросай ещё кость
 * урона (1d10) и прибавляй к итогу; выпала снова десятка — бросай ещё, и так
 * пока десятки идут. Если у атаки броска не было (например, она попадает
 * автоматически), второй бросок считается успешным.
 *
 * Здесь только правило. Кости бросает вызывающий: модулю передают уже выпавшие
 * числа, и потому его можно проверить без Foundry.
 */

/** Критический эффект: Dark Heresy, Only War, Black Crusade, Deathwatch. */
export const CRITICAL = "critical";

/** Дополнительные кости урона: Rogue Trader. */
export const EXTRA_DAMAGE = "extraDamage";

/**
 * Как книга считает Праведную ярость.
 *
 * Профиль без указания считается по Dark Heresy: так было до появления этого
 * модуля, и книга, которую ещё не разбирали, не должна менять поведение молча.
 *
 * @param {object} profile профиль книги (`Dh.rulesetFor(actor).righteousFury`)
 * @returns {string}
 */
export function righteousFuryMode(profile) {
    return profile?.mode === EXTRA_DAMAGE ? EXTRA_DAMAGE : CRITICAL;
}

/**
 * Подтвердила ли Праведную ярость вторая атака.
 *
 * «Если у исходной атаки не было броска, второй бросок считается успешным»
 * (стр. 245): цели нет — значит, попал.
 *
 * @param {number} roll результат второго броска атаки (d100)
 * @param {number|null|undefined} target та же цель, что у первой атаки
 * @returns {boolean}
 */
export function confirmationHits(roll, target) {
    // null и undefined — это «броска не было»; ноль — это цель, в которую не
    // попасть, и она проваливается, а не прощается.
    if (target === null || target === undefined) return true;
    const number = Number(target);
    if (!Number.isFinite(number)) return true;
    return Number(roll) <= number;
}

/** Кость, продолжающая ярость: натуральная десятка. */
export function explodes(die) {
    return Number(die) === 10;
}

/**
 * Итог цепочки дополнительных костей.
 *
 * @param {number[]} dice выпавшие числа, по порядку
 * @returns {number} прибавка к урону
 */
export function extraDamage(dice) {
    return (dice ?? []).reduce((sum, die) => sum + (Number(die) || 0), 0);
}

/** Предел на случай бесконечной цепочки: столько костей подряд не выпадает. */
export const MAX_CHAIN = 20;
