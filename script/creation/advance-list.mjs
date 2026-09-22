// ════════════════════════════════════════════════════════════════════════
//  Продвижения списком — Deathwatch, стр. 57-58.
//
//  У других книг цена выводится: по склонностям, по покровителю, по ступени.
//  Здесь она просто напечатана рядом с каждой строкой, и строк этих четыре
//  списка сразу: орден, общий десантский, специальность и сам Караул Смерти.
//
//  Отсюда и модуль: собрать строки из всех списков, сказать цену, проверить
//  предпосылки и не дать купить то, что при создании ещё закрыто.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Откуда пришла строка. Порядок — как в книге, им же и сортируем. */
export const ADVANCE_SOURCES = ["chapter", "general", "speciality", "deathwatch"];

/**
 * Список Караула Смерти при создании закрыт: брат только что прибыл в крепость
 * Эриох и ещё ничему здешнему не научился (стр. 27).
 */
export const CLOSED_AT_CREATION = ["deathwatch"];

/**
 * Все строки, из которых персонаж может выбирать.
 *
 * @param {{source: string, rank?: number, advances: object[]}[]} lists
 * @param {{rank?: number, atCreation?: boolean}} [context]
 * @returns {object[]} строки с пометкой, откуда они и доступны ли
 */
export function gatherAdvances(lists = [], {rank = 1, atCreation = true} = {}) {
    const out = [];
    for (const list of lists ?? []) {
        const source = list?.source ?? "general";
        // Орденские продвижения ранга не требуют вовсе (стр. 58).
        const needsRank = source !== "chapter" ? (list?.rank ?? 1) : 0;
        const closed = atCreation && CLOSED_AT_CREATION.includes(source);
        for (const advance of list?.advances ?? []) {
            out.push({
                ...advance,
                source,
                rank: needsRank,
                // Слишком высокий ранг и закрытый список — разные причины, и сказать
                // о них нужно по-разному.
                lockedByRank: needsRank > rank,
                lockedAtCreation: closed
            });
        }
    }
    return out.sort((a, b) =>
        ADVANCE_SOURCES.indexOf(a.source) - ADVANCE_SOURCES.indexOf(b.source)
        || a.cost - b.cost
        || String(a.name).localeCompare(String(b.name)));
}

/**
 * Одна и та же строка нередко стоит в двух списках разной ценой: орден может
 * продавать то же умение дешевле. Платят меньшую — она и остаётся.
 *
 * @param {object[]} advances
 * @returns {object[]}
 */
export function cheapestOfEach(advances = []) {
    const best = new Map();
    for (const advance of advances) {
        const key = String(advance.name).toLowerCase().trim();
        const have = best.get(key);
        if (!have || advance.cost < have.cost) best.set(key, advance);
    }
    return [...best.values()];
}

/**
 * Строка, которую уже купили, из списка не исчезает: «Sound Constitution (x2)»
 * берут дважды. А вот обычную второй раз не продают.
 *
 * @param {string} name
 * @returns {{base: string, times: number}} сколько раз её вообще можно взять
 */
export function advanceTimes(name) {
    const text = String(name ?? "");
    const times = Number(text.match(/\(x(\d+)\)\s*$/i)?.[1]);
    return {
        base: text.replace(/\s*\(x\d+\)\s*$/i, "").trim(),
        times: Number.isFinite(times) && times > 1 ? times : 1
    };
}

/**
 * Что предложить игроку: цена, причина отказа и сколько ещё раз можно взять.
 *
 * Предпосылку книга печатает рядом со строкой («Wrangling +10 — требует
 * Wrangling»), и через неё не перепрыгивают. Саму проверку сюда передают
 * готовой: этот модуль чист и о листе персонажа ничего не знает.
 *
 * @param {object[]} advances  строки из gatherAdvances
 * @param {object} snapshot    {owned: string[], remaining: number, check: (text) => object[]}
 * @returns {object[]}
 */
export function advanceOffers(advances = [], {owned = [], remaining = Infinity, check = null} = {}) {
    const taken = new Map();
    for (const name of owned) {
        const {base} = advanceTimes(name);
        taken.set(base.toLowerCase(), (taken.get(base.toLowerCase()) ?? 0) + 1);
    }
    return advances.map(advance => {
        const {base, times} = advanceTimes(advance.name);
        const already = taken.get(base.toLowerCase()) ?? 0;
        const maxed = already >= times;
        // «unknown» не запирает: предпосылкой бывает строка, которую система не
        // умеет прочесть, и отказывать из-за собственного незнания нельзя.
        const prerequisites = check ? check(advance.prerequisites) : [];
        const unmet = prerequisites.some(entry => entry.status === "unmet");
        const blocked = advance.lockedByRank || advance.lockedAtCreation || maxed || unmet;
        return {
            ...advance,
            base, times, already, maxed, prerequisites, unmet,
            affordable: !blocked && advance.cost <= remaining,
            blocked
        };
    });
}

/** Сколько стоит то, что уже куплено. */
export function spentOnAdvances(purchases = []) {
    return (purchases ?? []).reduce((total, record) => total + (Number(record?.cost) || 0), 0);
}

/**
 * Ранг по общему потраченному опыту (таблица 2-2, стр. 58).
 *
 * Первый ранг начинается на 13 000: двенадцать тысяч — это то, чем брат уже
 * был, когда его призвали, а тысяча — то, что он тратит при создании.
 */
export const RANK_THRESHOLDS = [13000, 17000, 21000, 25000, 30000, 35000, 40000, 45000];

export function rankForExperience(total) {
    const spent = Number(total) || 0;
    let rank = 1;
    for (let index = 0; index < RANK_THRESHOLDS.length; index++)
        if (spent >= RANK_THRESHOLDS[index]) rank = index + 1;
    return rank;
}
