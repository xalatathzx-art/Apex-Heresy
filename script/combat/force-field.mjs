/**
 * Force fields, Dark Heresy Second Edition, p. 169-170.
 *
 * A field is tested with a single 1d100 against its Protection Rating. On a
 * result at or below the rating, the attack is negated outright — the field is
 * not armour and does not reduce anything, it either turns the attack aside or
 * it does not.
 *
 *   "Fields can also overload. Compare the 1d100 roll to avoid damage to Table
 *    5-13: Field Overload Chance. If the result is lower than or equal to the
 *    listed number, the field overloads. It ceases to function until it is
 *    recharged or repaired, requiring a successful Very Hard (-30) Tech-Use
 *    test."
 *
 * The same roll decides both, which is why one number is passed around rather
 * than two.
 *
 * Ten fields shipped in the pack with ratings from 25 to 80 and nothing read
 * any of them, so a Rosarius that should stop half of everything stopped none
 * of it, silently.
 */

/** Table 5-13: Field Overload Chance, by the field's craftsmanship. */
export const OVERLOAD_BY_CRAFTSMANSHIP = Object.freeze({
    poor: 15,
    common: 10,
    good: 5,
    best: 1
});

/** Craftsmanship the books treat as ordinary when an item does not say. */
const DEFAULT_CRAFTSMANSHIP = "common";

/**
 * A Power Field "does not defend against ranged attacks made within 1 metre, or
 * attacks in melee" (p. 170). Nothing in the data marks this, so it is read from
 * the name, as the weapon qualities are.
 */
const NO_CLOSE_QUARTERS = /power field/i;

/**
 * The roll at or below which this field burns out.
 *
 * The pack stores a flat 10 on every field, which is only correct for Common
 * craftsmanship, so craftsmanship decides unless the item states its own number
 * and that number differs from the Common default.
 *
 * @param {{overloadChance: number, craftsmanship: string}} field
 * @returns {number}
 */
export function overloadChanceFor(field) {
    const craftsmanship = String(field?.craftsmanship || DEFAULT_CRAFTSMANSHIP).toLowerCase();
    const byCraft = OVERLOAD_BY_CRAFTSMANSHIP[craftsmanship] ?? OVERLOAD_BY_CRAFTSMANSHIP[DEFAULT_CRAFTSMANSHIP];
    const stated = Number(field?.overloadChance) || 0;
    // A stated number that merely repeats the Common default carries no
    // information, so craftsmanship wins; anything else is a deliberate override.
    if (stated > 0 && stated !== OVERLOAD_BY_CRAFTSMANSHIP[DEFAULT_CRAFTSMANSHIP]) return stated;
    return byCraft;
}

/**
 * Whether this field protects against an attack made at close quarters.
 * @param {{name: string}} field
 * @param {{isMelee: boolean, rangeMetres: number|null}} attack
 * @returns {boolean}
 */
export function fieldCoversAttack(field, {isMelee = false, rangeMetres = null} = {}) {
    if (!NO_CLOSE_QUARTERS.test(String(field?.name ?? ""))) return true;
    if (isMelee) return false;
    return !(typeof rangeMetres === "number" && rangeMetres <= 1);
}

/**
 * Put one attack to the field.
 *
 * @param {object} options
 * @param {{name: string, protectionRating: number, overloadChance: number,
 *          craftsmanship: string, overloaded: boolean}} options.field
 * @param {number} options.roll the 1d100 result
 * @param {boolean} options.isMelee
 * @param {number|null} options.rangeMetres distance to the attacker, when known
 * @returns {{blocked: boolean, overloaded: boolean, reason: string|null}}
 */
export function fieldProtects({field, roll, isMelee = false, rangeMetres = null}) {
    if (!field) return {blocked: false, overloaded: false, reason: null};
    if (field.overloaded) return {blocked: false, overloaded: true, reason: "overloaded"};
    if (!fieldCoversAttack(field, {isMelee, rangeMetres})) {
        return {blocked: false, overloaded: false, reason: "closeQuarters"};
    }

    const rating = Number(field.protectionRating) || 0;
    const result = Number(roll) || 0;
    return {
        blocked: result > 0 && result <= rating,
        overloaded: result > 0 && result <= overloadChanceFor(field),
        reason: null
    };
}
