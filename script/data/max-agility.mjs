/**
 * Max Agility, Dark Heresy Second Edition, p. 168:
 *
 *   "This is the maximum value a character wearing this armour can count his
 *    Agility: if the character's Agility is higher than this number, it counts
 *    as this number instead. If wearing multiple armour devices (such as a
 *    helmet and vest), a character uses the lowest Max Ag value."
 *
 * The field was stored, shown on the armour sheet and printed on the chat card,
 * but nothing read it, so heavy armour slowed no one down.
 */

/**
 * The lowest Max Agility among the equipped items that declare one.
 *
 * A missing or zero value means the piece does not restrict Agility, which is
 * how most armour in the books is written; only heavy plate carries a maximum.
 *
 * @param {Array} items the actor's items
 * @returns {number|null} the binding maximum, or null when nothing restricts Agility
 */
export function effectiveMaxAgility(items) {
    const caps = (items ?? [])
        .filter(item => item?.isEquipped)
        .map(item => Number(item?.system?.maxAgility) || 0)
        .filter(cap => cap > 0);
    return caps.length ? Math.min(...caps) : null;
}
