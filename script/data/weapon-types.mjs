/**
 * The weapon groups of Dark Heresy Second Edition (p. 170-181) and the
 * classifier that assigns one to a weapon by its name.
 *
 * Shipped pack data left system.type empty on 185 of 186 weapons, which made
 * ammunition compatibility inert: ammunitionFitsWeapon matches a round's
 * weaponTypes against this key, so with no key nothing could ever match and
 * tagging the ammunition could not help. The vocabulary lives here so the pack
 * patch, the sheet and the matcher all read one list.
 */

export const WEAPON_TYPES = Object.freeze([
    {key: 'las', label: 'WEAPON.TYPE.LAS'},
    {key: 'solidProjectile', label: 'WEAPON.TYPE.SOLID_PROJECTILE'},
    {key: 'bolt', label: 'WEAPON.TYPE.BOLT'},
    {key: 'melta', label: 'WEAPON.TYPE.MELTA'},
    {key: 'plasma', label: 'WEAPON.TYPE.PLASMA'},
    {key: 'flame', label: 'WEAPON.TYPE.FLAME'},
    {key: 'primitive', label: 'WEAPON.TYPE.PRIMITIVE'},
    {key: 'launcher', label: 'WEAPON.TYPE.LAUNCHER'},
    {key: 'grenade', label: 'WEAPON.TYPE.GRENADE'},
    {key: 'exotic', label: 'WEAPON.TYPE.EXOTIC'},
    {key: 'chain', label: 'WEAPON.TYPE.CHAIN'},
    {key: 'shock', label: 'WEAPON.TYPE.SHOCK'},
    {key: 'power', label: 'WEAPON.TYPE.POWER'},
    {key: 'force', label: 'WEAPON.TYPE.FORCE'}
]);

/**
 * Order matters: the first match wins, and several names belong to two families
 * at once. A Grenade Launcher is a launcher, not a grenade, so launchers are
 * tested first. An Eldar Plasma Grenade is a grenade, not a plasma gun, so
 * grenades are tested before the energy weapons. A Sentinel Plasma Rifle is a
 * plasma weapon, not a rifle, so the energy weapons are tested before the
 * solid-projectile catch-all.
 */
const PATTERNS = [
    [/launch(er|a)\b/i, 'launcher'],
    [/\bgrenade\b|stikkbomb|nailbomb/i, 'grenade'],
    [/\blas(gun|pistol|lock|er)\b|\blas\b|hellrifle/i, 'las'],
    [/\bbolt\s?(gun|pistol)\b|\bbolter\b|boltgun/i, 'bolt'],
    [/\bmelta\b|meltagun|inferno pistol/i, 'melta'],
    [/\bplasma\b/i, 'plasma'],
    [/flamer?\b|incinerator|longflame|\bburna\b/i, 'flame'],
    [/\bchain(axe|blade|sword|knife)?\b|eviscerator/i, 'chain'],
    [/\bforce\s+(sword|staff|hammer|axe|rod|blade)\b|nemesis daemon hammer/i, 'force'],
    [/\bpower\s+(sword|axe|fist|maul|blade|glaive|stake|shield|hammer)\b|thunder hammer|omnissian axe/i, 'power'],
    [/\bshock\s+(maul|whip|staff)\b|electro-|agoniser|agonizer/i, 'shock'],
    [/shuriken|splinter|\bpulse\s+(rifle|carbine|pistol)\b|kroot|webber|\bweb\s+pistol\b|needle\s+(rifle|pistol)|needler|shardcarbine|xenarch|quillgun|\bgrav\b|graviton/i, 'exotic'],
    [/\bauto(gun|pistol|cannon)\b|\bstub|shotgun|\brifle\b|sniper|musket|arquebus|flintlock|hand cannon|shoota|slugga/i, 'solidProjectile'],
    [/\b(bow|crossbow|spear|knife|sword|axe|hammer|club|whip|staff|flail|shield|bolas|sling)\b|choppa|warhammer|truncheon|knuckles/i, 'primitive']
];

/**
 * Decide a weapon's group from its name.
 *
 * Returns null rather than guessing: an unset type is honest, while a wrong one
 * silently blocks reloading, which is the failure this whole change exists to
 * remove.
 *
 * @param {string} name the weapon's name
 * @param {string} special the weapon's special-qualities text, reserved for
 *                         disambiguation that the name alone cannot settle
 * @returns {string|null} a key from WEAPON_TYPES, or null when undecidable
 */
export function classifyWeapon(name, special = '') {
    const text = String(name ?? '');
    if (!text) return null;
    for (const [pattern, key] of PATTERNS) if (pattern.test(text)) return key;
    return null;
}
