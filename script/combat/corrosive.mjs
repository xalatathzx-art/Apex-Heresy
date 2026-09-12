/**
 * The Corrosive weapon quality, Dark Heresy Second Edition, p. 146:
 *
 *   "If a target is struck by an attack from a Corrosive weapon, the Armour
 *    points of any armour worn by the target in that location are reduced by
 *    1d10 points. If the Armour points of the armour are reduced below 0 or the
 *    target is not wearing any armour in that location, the excess amount of
 *    Armour point damage (or the whole amount if the target is wearing no
 *    armour in that location) is dealt to the target. This excess damage is not
 *    reduced by Toughness. A target's armour can be reduced multiple times by
 *    the effects of a Corrosive weapon, and the Armour point damage is
 *    cumulative. A suit of armour can be repaired with a successful Challenging
 *    (+0) Tech-Use test."
 *
 * Six weapons in the pack carry this quality in their text and the trait
 * vocabulary did not know the word, so it was parsed away and never happened.
 */

/**
 * How much armour the acid eats, and how much of it reaches the wearer.
 *
 * @param {{roll: number, armourAtLocation: number}} options
 *        armourAtLocation is the worn Armour points at the hit location, before
 *        Toughness — the acid eats armour, not the body's resilience.
 * @returns {{armourLost: number, toTarget: number}}
 */
export function corrosiveBite({roll, armourAtLocation}) {
    const bite = Math.max(Number(roll) || 0, 0);
    const armour = Math.max(Number(armourAtLocation) || 0, 0);
    const armourLost = Math.min(bite, armour);
    return {armourLost, toTarget: bite - armourLost};
}
