/**
 * Counter Attack, Dark Heresy Second Edition, стр. 122 и 126.
 *
 *   Tier: 2. Prerequisite: Weapon Skill 40. Aptitudes: Weapon Skill, Defence.
 *   "Once per turn, after successfully Parrying an opponent's attack, this
 *    character [may make an attack]."
 *
 * В отчёте это названо «типом атаки», которого не хватает. Типом атаки оно не
 * является: это талант, срабатывающий в чужой ход, после удачного парирования —
 * и потому живёт в потоке уклонения, а не в выпадающем списке.
 *
 * Уклонение в ответ не годится: книга требует именно Парирования.
 */

/** Флаг, которым помечен уже использованный в этом ходу ответный удар. */
export const COUNTER_ATTACK_FLAG = "counterAttackUsed";

/** Название таланта в том виде, в каком его носят на листе. */
const TALENT = /^\s*counter\s*-?\s*attack\s*$/i;

/**
 * Есть ли у персонажа этот талант.
 * @param {string[]} talentNames
 * @returns {boolean}
 */
export function hasCounterAttack(talentNames) {
    return (talentNames ?? []).some(name => TALENT.test(String(name ?? "")));
}

/**
 * Можно ли предложить ответный удар.
 *
 * Все четыре условия обязательны: талант, именно Парирование, именно успех и
 * неизрасходованность в этом ходу.
 *
 * @param {object} options
 * @param {string} options.selected какой реакцией оборонялись
 * @param {boolean} options.success удалась ли она
 * @param {string[]} options.talents таланты оборонявшегося
 * @param {boolean} options.usedThisTurn уже отвечал в этом ходу
 * @returns {boolean}
 */
export function canCounterAttack({selected, success, talents, usedThisTurn = false}) {
    if (usedThisTurn) return false;
    if (selected !== "parry") return false;
    if (!success) return false;
    return hasCounterAttack(talents);
}
