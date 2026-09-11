// ════════════════════════════════════════════════════════════════════════
//  Стартовое снаряжение Dark Heresy (стр. 82).
//
//  Кроме выданного фоном, персонаж берёт из Арсенала столько предметов, каков
//  его стартовый бонус Влияния, и каждый — доступности Scarce (–10) или лучше.
//  Броска нет: это выбор, а не закупка. Оружие приходит с двумя обоймами
//  стандартных боеприпасов — они не отдельный предмет, Мастер о них пишет.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Шкала доступности от самой лёгкой к самой редкой — как Dh.availability. */
export const AVAILABILITY_ORDER = ["ubiquitous", "abundant", "plentiful", "common", "average", "scarce",
    "rare", "very-rare", "extremely-rare", "near-unique", "unique"];

/** Худшая доступность, которую можно взять при создании. */
export const CREATION_AVAILABILITY_LIMIT = "scarce";

/** Типы предметов главы V «Арсенал». */
export const ARMOURY_TYPES = ["weapon", "armour", "forceField", "gear", "tool", "drug", "cybernetic",
    "ammunition", "weaponModification"];

export function availableAtCreation(availability) {
    const index = AVAILABILITY_ORDER.indexOf(availability);
    return index >= 0 && index <= AVAILABILITY_ORDER.indexOf(CREATION_AVAILABILITY_LIMIT);
}

/** Сколько предметов можно взять: бонус Влияния. */
export function acquisitionAllowance(influence) {
    return Math.max(0, Math.floor((Number(influence) || 0) / 10));
}

/**
 * Предметы Арсенала, доступные при создании, по имени.
 *
 * @param {{uuid: string, name: string, type: string, availability: string}[]} catalogue
 * @param {{uuid: string}[]} picks  уже взятые
 * @param {{allowance: number}} options
 */
export function equipmentOffers(catalogue, picks, {allowance = 0} = {}) {
    const picked = new Set((picks ?? []).map(entry => entry.uuid));
    const full = picked.size >= allowance;
    return (catalogue ?? [])
        .filter(entry => ARMOURY_TYPES.includes(entry.type) && availableAtCreation(entry.availability))
        .map(entry => ({...entry, picked: picked.has(entry.uuid), allowed: !full && !picked.has(entry.uuid)}))
        // Кавычки в начале имени («"Emperor's Wrath" Shard Bolts») сортировку не решают.
        .sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)));
}

function sortName(name) {
    return String(name ?? "").replace(/^[^\p{L}\p{N}]+/u, "");
}
