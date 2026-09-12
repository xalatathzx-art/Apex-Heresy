/**
 * Which weapons a round fits.
 *
 * `DarkHeresyUtil.ammunitionFitsWeapon` matches a round's `system.weaponTypes`
 * against a weapon's `system.type`. All 110 rounds in the pack shipped with an
 * empty list, which that function reads as "fits anything", so the compatibility
 * system was inert and tagging rounds by hand could not help while the weapons
 * had no type either.
 *
 * Ammunition is named differently from the weapons it serves: a las weapon has
 * "las" in its name, but its ammunition is a "Charge Pack" or a "Cell", and bolt
 * ammunition is simply "Bolts". So the weapon classifier is tried first, and
 * these ammunition-specific patterns catch what it cannot see.
 */

import {classifyWeapon} from './weapon-types.mjs';

/**
 * Order matters here as it does for weapons. "Tempest Bolt Shells" are bolt
 * rounds rather than shotgun shells, so bolts are tested before the generic
 * solid-projectile words.
 */
const AMMUNITION_PATTERNS = [
    [/charge\s*pack|\bcell\b|lascarabine|lascarbine/i, 'las'],
    [/\bbolts\b|\bpsybolts?\b|bolt\s+(shells|rounds)/i, 'bolt'],
    [/\barrows?\b|\bquarrels?\b|\bstakes?\b/i, 'primitive'],
    [/\b(rounds?|bullets?|shells?|slugs?)\b/i, 'solidProjectile']
];

/**
 * Decide which weapon group a round belongs to.
 *
 * Returns null rather than guessing. An empty compatibility list means "fits
 * anything", which is the safe default for a round whose family the name does
 * not give away; a wrong group would silently refuse a legitimate reload.
 *
 * @param {string} name the ammunition's name
 * @returns {string|null} a key from WEAPON_TYPES, or null when undecidable
 */
export function classifyAmmunition(name) {
    const text = String(name ?? '');
    if (!text) return null;
    const byWeaponName = classifyWeapon(text);
    if (byWeaponName) return byWeaponName;
    for (const [pattern, key] of AMMUNITION_PATTERNS) if (pattern.test(text)) return key;
    return null;
}
