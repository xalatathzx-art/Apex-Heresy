// ════════════════════════════════════════════════════════════════════════
//  Повторные склонности при создании (DH2, стр. 79).
//
//  Если одна и та же склонность пришла из разных источников, второй раз её не
//  дают: игрок выбирает взамен склонность характеристики, которой у него ещё
//  нет. Источник записывает повтор в duplicateAptitudes, выбор — в
//  replacedAptitudes; долг — это разница.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Склонности, названные по характеристике (таблица на стр. 80). */
export const CHARACTERISTIC_APTITUDES = ["Weapon Skill", "Ballistic Skill", "Strength", "Toughness",
    "Agility", "Intelligence", "Perception", "Willpower", "Fellowship"];

/**
 * Невозмещённые повторы.
 *
 * @param {{source: string, duplicateAptitudes?: string[], replacedAptitudes?: {duplicate: string}[]}[]} records
 * @returns {{source: string, duplicate: string}[]}
 */
export function owedAptitudes(records) {
    const owed = [];
    for (const record of records ?? []) {
        const replaced = (record.replacedAptitudes ?? []).map(entry => entry.duplicate);
        for (const duplicate of record.duplicateAptitudes ?? []) {
            const index = replaced.indexOf(duplicate);
            if (index >= 0) { replaced.splice(index, 1); continue; }
            owed.push({source: record.source, duplicate});
        }
    }
    return owed;
}

/** Чем можно возместить повтор: склонности характеристик, которых ещё нет. */
export function replacementOptions(owned) {
    const has = owned instanceof Set ? owned : new Set(owned ?? []);
    return CHARACTERISTIC_APTITUDES.filter(name => !has.has(name));
}
