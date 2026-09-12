/**
 * Clearing a weapon jam, Dark Heresy Second Edition, p. 225:
 *
 *   "Clearing a jam is a Full Action that requires a Ballistic Skill test. If
 *    the character attempting to clear the jam succeeds on the test, then the
 *    jam has been cleared, though the weapon needs to be reloaded and any ammo
 *    in it is lost. If he fails on the test, the weapon is still jammed, though
 *    he can attempt to clear it again next round."
 *
 * The system used to clear a jam by unsetting a flag: no test, no lost rounds,
 * no reload. A jam cost nothing but a click.
 */

/**
 * What a jam-clearing attempt does to the weapon.
 *
 * @param {{success: boolean}} test the resolved Ballistic Skill test
 * @returns {{cleared: boolean, emptyMagazine: boolean, needsReload: boolean}}
 */
export function resolveJamClear(test) {
    const success = !!test?.success;
    return {cleared: success, emptyMagazine: success, needsReload: success};
}
