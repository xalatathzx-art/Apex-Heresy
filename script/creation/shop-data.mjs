// ════════════════════════════════════════════════════════════════════════
//  Трата стартового опыта (Dark Heresy, стр. 78-81): что можно купить, почём,
//  и какая запись на лист у каждой покупки.
//
//  Покупка пишет в ТЕ ЖЕ поля, что читает движок опыта системы: прибавка к
//  характеристике — в advance (не в base: там стартовое значение), ранг навыка —
//  в advance навыка или специализации, талант — предметом со starter: false. Цена
//  пишется в поле cost, чтобы остаток на листе сходился и при выключенном
//  автоподсчёте.
//
//  Ступени проходят подряд (стр. 80), поэтому предлагается всегда только
//  СЛЕДУЮЩАЯ, а вернуть можно только верхнюю.
//
//  Модуль чистый: на вход — снимок актора, на выход — нагрузка для update.
// ════════════════════════════════════════════════════════════════════════

import {CHARACTERISTIC_LEVELS, SKILL_LEVELS, CHARACTERISTIC_STEP, advanceCost, matchingAptitudes}
    from "./advancement-data.mjs";

/** Влияние не покупается за опыт (стр. 79). */
export const UNPURCHASABLE_CHARACTERISTICS = ["influence"];

/** Ступень навыка по advance: -20 — не обучен, 0/10/20/30 — Known..Veteran. */
export function skillLevelIndex(advance) {
    const value = Number(advance ?? -20);
    return value < 0 ? -1 : Math.floor(value / 10);
}

const signed = value => `${value > 0 ? "+" : ""}${value}`;

/**
 * Характеристики, которые можно поднять, со следующей ступенью и её ценой.
 * @param {object} snapshot  {characteristics, aptitudes}
 */
export function characteristicOffers(snapshot) {
    const offers = [];
    for (const [key, entry] of Object.entries(snapshot.characteristics ?? {})) {
        if (UNPURCHASABLE_CHARACTERISTICS.includes(key)) continue;
        const steps = Math.floor((Number(entry.advance) || 0) / CHARACTERISTIC_STEP);
        const matched = matchingAptitudes(snapshot.aptitudes, entry.aptitudes);
        const nextLevel = CHARACTERISTIC_LEVELS[steps] ?? null;
        offers.push({
            key, steps, matched, nextLevel,
            cost: nextLevel ? advanceCost("characteristic", nextLevel, matched) : null,
            maxed: !nextLevel
        });
    }
    return offers;
}

/**
 * Навыки и специализации, которые можно поднять.
 *
 * У специалистского навыка предлагаются только специализации, которые уже есть на
 * листе хотя бы на Known: их двадцать с лишним на навык, и список «купить Known в
 * каждой» был бы стеной. Новая специализация покупается отдельно, по имени.
 *
 * @param {object} snapshot  {skills, aptitudes}
 */
export function skillOffers(snapshot) {
    const offers = [];
    const offer = (key, specKey, label, entry, skill) => {
        const index = skillLevelIndex(entry.advance);
        const nextLevel = SKILL_LEVELS[index + 1] ?? null;
        const matched = matchingAptitudes(snapshot.aptitudes, skill.aptitudes);
        offers.push({
            key, specKey, label, matched,
            level: SKILL_LEVELS[index] ?? null,
            nextLevel,
            cost: nextLevel ? advanceCost("skill", nextLevel, matched) : null,
            maxed: !nextLevel
        });
    };
    for (const [key, skill] of Object.entries(snapshot.skills ?? {})) {
        if (!skill.isSpecialist) { offer(key, null, skill.label ?? key, skill, skill); continue; }
        for (const [specKey, speciality] of Object.entries(skill.specialities ?? {}))
            if (skillLevelIndex(speciality.advance) >= 0)
                offer(key, specKey, speciality.label ?? specKey, speciality, skill);
    }
    return offers;
}

/**
 * Проверка предпосылок таланта по тексту книги.
 *
 * Разбираются два надёжных вида: порог характеристики («Willpower 50») и имя таланта
 * или черты («Strong Minded»). Остальное («Psy rating», «Mechanicus Implants» как
 * часть тела) помечается «проверить вручную» и покупку не блокирует: запретить по
 * тому, что не удалось прочитать, хуже, чем разрешить.
 *
 * @param {string} text
 * @param {object} snapshot  {characteristicValues, talents, traits}
 * @param {Record<string, string>} characteristicNames  «Willpower» → willpower
 * @returns {{text: string, status: "met"|"unmet"|"unknown"}[]}
 */
export function checkPrerequisites(text, snapshot, characteristicNames) {
    const raw = String(text ?? "").trim();
    if (!raw || /^none$/i.test(raw) || raw === "—" || raw === "-") return [];

    const owned = new Set([...(snapshot.talents ?? []), ...(snapshot.traits ?? [])]
        .map(entry => String(entry.name ?? entry).toLowerCase().replace(/\*$/, "").trim()));

    return raw.split(/,(?![^(]*\))/).map(part => part.trim()).filter(Boolean).map(part => {
        const threshold = /^(.+?)\s+(\d+)\+?$/.exec(part);
        if (threshold) {
            const key = characteristicNames[threshold[1].trim().toLowerCase()];
            if (key) {
                const value = Number(snapshot.characteristicValues?.[key] ?? 0);
                return {text: part, status: value >= Number(threshold[2]) ? "met" : "unmet"};
            }
        }
        const name = part.toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
        if (owned.has(name) || owned.has(part.toLowerCase())) return {text: part, status: "met"};
        return {text: part, status: "unknown"};
    });
}

/**
 * Таланты, которые можно взять, с ценой и состоянием предпосылок.
 *
 * @param {{name: string, tier: number, aptitudes: string, prerequisites: string, uuid?: string}[]} catalogue
 * @param {object} snapshot
 * @param {Record<string, string>} characteristicNames
 */
export function talentOffers(catalogue, snapshot, characteristicNames) {
    const owned = new Set((snapshot.talents ?? []).map(entry => String(entry.name ?? entry).toLowerCase()));
    const offers = [];
    for (const entry of catalogue ?? []) {
        const tier = Number(entry.tier);
        if (!(tier >= 1 && tier <= 3)) continue;
        // Специалистский талант («Weapon Training*») берут много раз с разными
        // специализациями, поэтому уже имеющаяся копия его не прячет.
        const specialist = String(entry.name).endsWith("*");
        if (!specialist && owned.has(String(entry.name).toLowerCase())) continue;
        const aptitudes = String(entry.aptitudes ?? "").split(",").map(part => part.trim()).filter(Boolean);
        const matched = matchingAptitudes(snapshot.aptitudes, aptitudes);
        const prerequisites = checkPrerequisites(entry.prerequisites, snapshot, characteristicNames);
        offers.push({
            name: entry.name, uuid: entry.uuid, tier, aptitudes, matched, specialist,
            cost: advanceCost("talent", tier, matched),
            prerequisites,
            blocked: prerequisites.some(check => check.status === "unmet")
        });
    }
    return offers.sort((a, b) => a.tier - b.tier || a.cost - b.cost || a.name.localeCompare(b.name));
}

/** Сумма цен набора покупок. */
export function spentOn(purchases) {
    return (purchases ?? []).reduce((total, purchase) => total + (Number(purchase.cost) || 0), 0);
}

/**
 * Покупка ступени характеристики.
 * @returns {{update: object, record: object}|null} null — покупать нечего
 */
export function purchaseCharacteristic(snapshot, key) {
    const offer = characteristicOffers(snapshot).find(entry => entry.key === key);
    if (!offer || offer.maxed) return null;
    const entry = snapshot.characteristics[key];
    const advance = (Number(entry.advance) || 0) + CHARACTERISTIC_STEP;
    // Поле cost — накопительная цена всех купленных ступеней: так его читает движок.
    let total = 0;
    for (let index = 0; index <= offer.steps; index++)
        total += advanceCost("characteristic", CHARACTERISTIC_LEVELS[index], offer.matched);
    return {
        update: {
            [`system.characteristics.${key}.advance`]: advance,
            [`system.characteristics.${key}.cost`]: total
        },
        record: {kind: "characteristic", key, level: offer.nextLevel, cost: offer.cost,
                 fromAdvance: Number(entry.advance) || 0, fromCost: Number(entry.cost) || 0,
                 label: `${key} ${signed(CHARACTERISTIC_STEP)}`}
    };
}

/**
 * Покупка ранга навыка или специализации.
 * @returns {{update: object, record: object}|null}
 */
export function purchaseSkill(snapshot, key, specKey = null) {
    const offer = skillOffers(snapshot).find(entry => entry.key === key && (entry.specKey ?? null) === specKey);
    if (!offer || offer.maxed) return null;
    const skill = snapshot.skills[key];
    const entry = specKey ? skill.specialities[specKey] : skill;
    const path = specKey ? `system.skills.${key}.specialities.${specKey}` : `system.skills.${key}`;
    const nextIndex = skillLevelIndex(entry.advance) + 1;
    // Стартовый ранг бесплатен, и в cost он не входит — ровно так считает движок.
    let total = 0;
    for (let index = entry.starter ? 1 : 0; index <= nextIndex; index++)
        total += advanceCost("skill", SKILL_LEVELS[index], offer.matched);
    return {
        update: {[`${path}.advance`]: nextIndex * 10, [`${path}.cost`]: total},
        record: {kind: "skill", key, specKey, level: offer.nextLevel, cost: offer.cost,
                 fromAdvance: Number(entry.advance ?? -20), fromCost: Number(entry.cost) || 0,
                 label: specKey ? `${key} (${offer.label}) ${offer.nextLevel}` : `${key} ${offer.nextLevel}`}
    };
}

/**
 * Покупка новой специализации на Known — по имени, которого в списке навыка нет.
 * @returns {{update: object, record: object}|null}
 */
export function purchaseNewSpeciality(snapshot, key, name, specKey) {
    const skill = snapshot.skills?.[key];
    if (!skill?.isSpecialist || !String(name ?? "").trim() || skill.specialities?.[specKey]) return null;
    const matched = matchingAptitudes(snapshot.aptitudes, skill.aptitudes);
    const cost = advanceCost("skill", SKILL_LEVELS[0], matched);
    return {
        update: {[`system.skills.${key}.specialities.${specKey}`]:
                     {label: String(name).trim(), advance: 0, starter: false, cost}},
        record: {kind: "skill", key, specKey, level: SKILL_LEVELS[0], cost, created: true,
                 label: `${key} (${String(name).trim()}) ${SKILL_LEVELS[0]}`}
    };
}

/**
 * Возврат покупки. Можно вернуть только верхнюю ступень — иначе посередине лестницы
 * осталась бы дыра, которой не бывает по книге.
 *
 * @param {object} snapshot
 * @param {object} record  из purchase*
 * @returns {object|null}  null — эта покупка уже не верхняя
 */
export function refundUpdate(snapshot, record) {
    if (record.kind === "characteristic") {
        const entry = snapshot.characteristics?.[record.key];
        if (!entry) return null;
        const expected = record.fromAdvance + CHARACTERISTIC_STEP;
        if ((Number(entry.advance) || 0) !== expected) return null;
        return {[`system.characteristics.${record.key}.advance`]: record.fromAdvance,
                [`system.characteristics.${record.key}.cost`]: record.fromCost};
    }
    if (record.kind === "skill") {
        const skill = snapshot.skills?.[record.key];
        const path = record.specKey
            ? `system.skills.${record.key}.specialities.${record.specKey}` : `system.skills.${record.key}`;
        if (record.created) return {[`system.skills.${record.key}.specialities.-=${record.specKey}`]: null};
        const entry = record.specKey ? skill?.specialities?.[record.specKey] : skill;
        if (!entry) return null;
        const expected = (skillLevelIndex(record.fromAdvance) + 1) * 10;
        if (Number(entry.advance) !== expected) return null;
        return {[`${path}.advance`]: record.fromAdvance, [`${path}.cost`]: record.fromCost};
    }
    return null;
}
