/**
 * The Overheats weapon quality, Dark Heresy Second Edition, p. 149:
 *
 *   "On an attack roll of 91 or higher, this weapon overheats. The wielder
 *    suffers Energy damage equal to the weapon's damage with a penetration of 0
 *    to an arm location (the arm holding the weapon if the weapon was fired
 *    one-handed, or a random arm if the weapon was fired with two hands). The
 *    wielder may choose to avoid taking the damage by dropping the weapon as a
 *    Free Action. A weapon that overheats must spend the round afterwards
 *    cooling down, and cannot be fired again until the second round after
 *    overheating. A weapon with this quality does not jam, and any effect that
 *    would cause the weapon to jam instead causes the weapon to overheat."
 *
 * The system cancelled the hit exactly as a jam does and stopped there, so an
 * overheat was a jam wearing a different word: it never burned anyone.
 */

/** An unmodified attack roll at or above this overheats the weapon. */
export const OVERHEAT_THRESHOLD = 91;

/**
 * Which arm the heat reaches.
 *
 * @param {{twoHanded: boolean, roll: number, holdingArm: string}} options
 *        roll is a 0-1 fraction used only for the two-handed random arm
 * @returns {'leftArm'|'rightArm'}
 */
export function overheatArm({twoHanded = false, roll = 0, holdingArm = 'rightArm'} = {}) {
    if (!twoHanded) return holdingArm === 'leftArm' ? 'leftArm' : 'rightArm';
    return roll < 0.5 ? 'leftArm' : 'rightArm';
}

/**
 * The damage the wielder takes, or null when the weapon is dropped instead.
 *
 * Penetration is 0 by the rule, so armour applies in full; the damage is the
 * weapon's own, and its type is Energy whatever the weapon normally deals.
 *
 * @param {{damage: number, dropped: boolean, arm: string}} options
 * @returns {{amount: number, penetration: number, location: string, type: string}|null}
 */
export function overheatSelfDamage({damage, dropped = false, arm = 'rightArm'}) {
    if (dropped) return null;
    return {
        amount: Math.max(Number(damage) || 0, 0),
        penetration: 0,
        location: arm,
        type: 'energy'
    };
}
