/**
 * The rounding rule of Dark Heresy Second Edition, p. 23 ("Rounding and
 * Multiplying"):
 *
 *   "If a fraction is generated when dividing, unless specified otherwise round
 *    the result up, even if the fraction is less than one-half."
 *
 * It is a general rule, so a halving anywhere in the system rounds up unless its
 * own rule says otherwise.
 *
 * Every halving in the codebase was audited against its own rule. Only the
 * Unnatural degrees of success were wrong. The others stay as they are, and the
 * reasons are recorded here so that a later reader applying p. 23 by reflex does
 * not "fix" correct code:
 *
 * - The fatigue penalty writes -floor(t/2) on purpose. ceil(t/2) === t -
 *   floor(t/2), so that expresses "the characteristic counts as half, rounding
 *   up" as a subtractive modifier. It already rounds up.
 * - A characteristic bonus is the tens digit, not a division.
 * - "+5, and another +5 for every two further degrees" is a step, not a half:
 *   the bonus is earned per completed pair, which is what floor means. The same
 *   pattern appears in Suppressing Fire, where "every extra two degrees of
 *   success" scores one more hit (p. 225).
 * - The blood loss death chance halves a value that ships as 10 in every
 *   ruleset, so floor and ceil agree; nothing turns on it.
 * - Horde kills from melee degrees are not a Dark Heresy rule. The horde is a
 *   Deathwatch and Only War concept, and that halving still needs checking
 *   against those books before it is touched.
 */

/**
 * Half of a value, rounded up.
 * @param {number} value
 * @returns {number}
 */
export function halfRoundedUp(value) {
    return Math.ceil((Number(value) || 0) / 2);
}
