/**
 * Противоборство, Dark Heresy Second Edition, стр. 25:
 *
 *   "In an Opposed test, each participant makes his appropriate test normally
 *    and whoever succeeds wins the test. If both parties succeed, the party with
 *    the most degrees of success wins the test. If the number of successes is
 *    equal, then the party with the highest characteristic bonus wins. If there
 *    is still a tie, then the lowest die roll wins. Should both parties fail,
 *    then one of two things occurs: either the test ends in a stalemate and
 *    nothing happens, or both parties re-roll until there is a clear winner."
 *
 * Обоюдный провал книга оставляет на усмотрение ведущего, поэтому здесь он и
 * остаётся ничьей: перебрасывать за столом решают сами, а система не вправе
 * выбрать за них.
 */

/**
 * @typedef {object} OpposedSide
 * @property {boolean} success удалась ли проверка
 * @property {number} degrees ступени успеха
 * @property {number} bonus бонус характеристики — первый разрыв ничьей
 * @property {number} roll выпавшее на кости — второй разрыв
 */

/**
 * Кто победил в противоборстве.
 *
 * @param {OpposedSide} a активная сторона
 * @param {OpposedSide} b противник
 * @returns {{winner: "a"|"b"|null, margin: number, reason: string}}
 */
export function resolveOpposed(a, b) {
    const left = a ?? {};
    const right = b ?? {};
    const stalemate = {winner: null, margin: 0, reason: "stalemate"};

    if (!left.success && !right.success) return stalemate;
    if (left.success && !right.success) {
        return {winner: "a", margin: Math.max(Number(left.degrees) || 0, 1), reason: "success"};
    }
    if (!left.success && right.success) {
        return {winner: "b", margin: Math.max(Number(right.degrees) || 0, 1), reason: "success"};
    }

    const leftDegrees = Number(left.degrees) || 0;
    const rightDegrees = Number(right.degrees) || 0;
    if (leftDegrees !== rightDegrees) {
        return leftDegrees > rightDegrees
            ? {winner: "a", margin: leftDegrees - rightDegrees, reason: "degrees"}
            : {winner: "b", margin: rightDegrees - leftDegrees, reason: "degrees"};
    }

    const leftBonus = Number(left.bonus) || 0;
    const rightBonus = Number(right.bonus) || 0;
    if (leftBonus !== rightBonus) {
        return {winner: leftBonus > rightBonus ? "a" : "b", margin: 0, reason: "bonus"};
    }

    // «The lowest die roll wins»: ниже бросок — точнее исполнено.
    const leftRoll = Number(left.roll) || 0;
    const rightRoll = Number(right.roll) || 0;
    if (leftRoll !== rightRoll) {
        return {winner: leftRoll < rightRoll ? "a" : "b", margin: 0, reason: "roll"};
    }

    return stalemate;
}
