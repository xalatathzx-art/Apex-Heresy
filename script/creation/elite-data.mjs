// ════════════════════════════════════════════════════════════════════════
//  Элитные продвижения Dark Heresy, доступные при создании (стр. 86-92).
//
//  Inquisitor сюда не входит: его дают указом действующего Инквизитора
//  (стр. 88), а не выбором при создании, и Influence 75 новичку недостижим.
//
//  Где лежит продвижение на листе: имя в поле анкеты «Elite» (bio.elite),
//  списком через запятую. Это то же поле, которое игрок правит руками, и
//  Мастер читает его, а не свой флаг — иначе вписанное вручную не считалось бы.
//
//  Цена продвижения ложится на предмет, который его несёт: у Psyker это черта
//  Psyker, у Untouchable — особая способность с тем же именем. Движок опыта
//  листа суммирует cost у черт и особых способностей, так что лист и Мастер
//  считают одинаково.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

import {checkPrerequisites} from "./shop-data.mjs";

export const ELITE_ADVANCES = [
    {key: "psyker", name: "Psyker", cost: 300, prerequisites: "Willpower 40", excludes: ["untouchable"], page: 90},
    {key: "untouchable", name: "Untouchable", cost: 300, prerequisites: "", excludes: ["psyker"], page: 91}
];

const lower = text => String(text ?? "").toLowerCase().trim();
const byKey = key => ELITE_ADVANCES.find(entry => entry.key === key) ?? null;

/** Ключи продвижений, названных в поле анкеты. Незнакомые имена пропускаются. */
export function eliteKeysIn(text) {
    const names = String(text ?? "").split(/[,;]/).map(lower).filter(Boolean);
    return new Set(ELITE_ADVANCES.filter(entry => names.includes(lower(entry.name))).map(entry => entry.key));
}

/** Поле анкеты с добавленным именем — без повтора. */
export function eliteText(current, name) {
    const names = String(current ?? "").split(",").map(part => part.trim()).filter(Boolean);
    if (!names.some(part => lower(part) === lower(name))) names.push(name);
    return names.join(", ");
}

/** Поле анкеты без имени. */
export function eliteTextWithout(current, name) {
    return String(current ?? "").split(",").map(part => part.trim())
        .filter(part => part && lower(part) !== lower(name)).join(", ");
}

/**
 * Продвижения магазина: имеющиеся, исключённые другим продвижением и с предпосылками.
 *
 * @param {object} snapshot  снимок магазина плюс {elite: Set<string>}
 * @param {Record<string, string>} characteristicNames
 */
export function eliteOffers(snapshot, characteristicNames) {
    const owned = snapshot.elite ?? new Set();
    return ELITE_ADVANCES.map(entry => {
        const prerequisites = checkPrerequisites(entry.prerequisites, snapshot, characteristicNames);
        const excluded = entry.excludes.some(key => owned.has(key));
        return {
            key: entry.key, name: entry.name, cost: entry.cost, page: entry.page,
            owned: owned.has(entry.key), excluded, prerequisites,
            blocked: owned.has(entry.key) || excluded || prerequisites.some(check => check.status === "unmet")
        };
    });
}

/**
 * Что продвижение даёт сразу («Instant Changes»).
 *
 * @param {string} key
 * @param {{free?: boolean, riders?: object[], traits?: string[]}} options
 *   free   — выдано происхождением даром (стр. 87: без опыта и предпосылок);
 *   riders — eliteRiders всех закреплённых происхождений;
 *   traits — имена черт, уже имеющихся у персонажа.
 * @returns {object|null} null — такого продвижения при создании нет
 */
export function elitePlan(key, {free = false, riders = [], traits = []} = {}) {
    const entry = byKey(key);
    if (!entry) return null;
    const cost = free ? 0 : entry.cost;
    const plan = {key, name: entry.name, cost, traits: [], talents: [], specialAbilities: [],
                  aptitudes: [], psyRating: null, corruption: null};
    const ownedTraits = new Set(traits.map(lower));
    const riderTraits = riders.filter(rider => rider.elite === key)
        .flatMap(rider => rider.traits ?? []).map(trait => trait.name);

    if (key === "psyker") {
        const sanctioned = ownedTraits.has("sanctioned") || riderTraits.some(name => lower(name) === "sanctioned");
        plan.traits.push({name: "Psyker", cost});
        for (const name of riderTraits)
            if (!ownedTraits.has(lower(name)) && !plan.traits.some(trait => lower(trait.name) === lower(name)))
                plan.traits.push({name, cost: 0});
        plan.aptitudes.push("Psyker");
        // Черта Sanctioned (стр. 138): рейтинг 2 вместо 1 и без Порчи от открывшегося Варпа.
        plan.psyRating = sanctioned ? 2 : 1;
        plan.corruption = sanctioned ? null : "1d10+3";
    } else if (key === "untouchable") {
        plan.talents.push("Resistance (Psychic Powers)");
        plan.specialAbilities.push({name: "Untouchable", cost});
    }
    return plan;
}
