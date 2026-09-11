// ════════════════════════════════════════════════════════════════════════
//  План → записи на актора, и обратно.
//
//  Модуль принимает объект формы актора и ВОЗВРАЩАЕТ полезную нагрузку для
//  update, а не пишет сам: поэтому бухгалтерия отката проверяется тестами без
//  запуска мира.
//
//  Всё выданное шагом помечается самим шагом и предметом-носителем, а поднятые
//  значения записываются на носитель. Тогда снять носитель — значит отменить
//  шаг ровно, без догадок, и игрок может вернуться и сменить родной мир.
// ════════════════════════════════════════════════════════════════════════

export const GRANT_FLAG_SCOPE = "dark-heresy";
export const GRANT_FLAG_KEY = "originGrant";

/** Заглушки для имён, которых нет ни в одном компендиуме: потерять выдачу молча нельзя. */
const STUB = {
    talent: {type: "talent", img: "icons/svg/upgrade.svg"},
    trait: {type: "trait", img: "icons/svg/aura.svg"},
    equipment: {type: "gear", img: "icons/svg/item-bag.svg"}
};

/**
 * Нагрузка для actor.update() по плану — и запись того, что она реально изменила.
 *
 * `characteristicMode` — чем книга считает модификатор характеристики:
 *   "flat"       — обычной прибавкой; пишется в base и потом откатывается;
 *   "generation" — правилом генерации (Dark Heresy, стр. 31). Модификатор попадёт
 *                  в значение сам — броском 3d10 с выбором двух костей, либо стартом
 *                  закупки с 30 вместо 25. Писать его ЕЩЁ и в base значит посчитать
 *                  дважды, поэтому он только записывается — шагу характеристик, чтобы
 *                  тот знал, какую формулу катать.
 *
 * @param {object} actor  объект формы актора (нужен только system)
 * @param {object} plan   из grant-data.mjs
 * @param {{characteristicMode?: "flat"|"generation"}} [options]
 * @returns {{update: object, applied: object}}
 */
export function planToActorUpdate(actor, plan, {characteristicMode = "flat"} = {}) {
    const update = {};
    const applied = {characteristics: {}, generationModifiers: {}, skills: {}, specialities: [],
                     aptitudes: [], wounds: 0, corruption: 0, insanity: 0, influence: 0};

    for (const [key, modifier] of Object.entries(plan.characteristics ?? {})) {
        const current = actor.system.characteristics?.[key];
        if (!current) continue;   // книга назвала характеристику, которой у этого листа нет
        if (characteristicMode === "generation") { applied.generationModifiers[key] = modifier; continue; }
        update[`system.characteristics.${key}.base`] = (current.base ?? 0) + modifier;
        applied.characteristics[key] = modifier;
    }

    // Навык только поднимается. Если другой источник уже дал больше, выдача ничего не
    // меняет — и в откат не попадает, иначе он опустил бы чужую обученность.
    for (const skill of plan.skills ?? []) {
        const current = actor.system.skills?.[skill.key];
        if (!current || (current.advance ?? -20) >= skill.advance) continue;
        update[`system.skills.${skill.key}.advance`] = skill.advance;
        applied.skills[skill.key] = {from: current.advance ?? -20, to: skill.advance};
    }

    for (const spec of plan.specialities ?? []) {
        const existing = actor.system.skills?.[spec.key]?.specialities?.[spec.name];
        if (existing && (existing.advance ?? -20) >= (spec.advance ?? 0)) continue;
        update[`system.skills.${spec.key}.specialities.${spec.name}.advance`] = spec.advance ?? 0;
        applied.specialities.push({key: spec.key, name: spec.name});
    }

    if (plan.wounds) {
        update["system.wounds.max"] = (actor.system.wounds?.max ?? 0) + plan.wounds;
        update["system.wounds.value"] = (actor.system.wounds?.value ?? 0) + plan.wounds;
        applied.wounds = plan.wounds;
    }
    for (const key of ["corruption", "insanity"]) {
        if (!plan[key]) continue;
        update[`system.${key}`] = (actor.system[key] ?? 0) + plan[key];
        applied[key] = plan[key];
    }
    // Влияние — характеристика, а не отдельный счётчик, хотя книги называют его отдельно.
    if (plan.influence) {
        const current = actor.system.characteristics?.influence;
        if (current) {
            update["system.characteristics.influence.base"] = (current.base ?? 0) + plan.influence;
            applied.influence = plan.influence;
        }
    }

    // Склонность, которая у актора уже есть, в откат не пишется: отменяя этот шаг,
    // нельзя отнять то, что дал другой.
    const granted = (plan.aptitudes ?? []).filter(aptitude => !actor.system.aptitudes?.[aptitude]);
    if (granted.length) {
        update["system.aptitudes"] = {...(actor.system.aptitudes ?? {}),
                                      ...Object.fromEntries(granted.map(aptitude => [aptitude, true]))};
        applied.aptitudes = granted;
    }

    return {update, applied};
}

/**
 * Данные вложенных предметов для всего, что раздаёт план.
 *
 * @param {object} plan
 * @param {string} tag        "<книга>:<шаг>" — им помечается выданное
 * @param {string} carrierId  идентификатор предмета-носителя
 * @param {(kind: string, name: string) => object|null} lookup  копия из компендиума по виду и имени
 * @returns {object[]}
 */
export function planToItemData(plan, tag, carrierId, lookup) {
    const flags = {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, grantedBy: carrierId}};
    const out = [];

    for (const talent of plan.talents ?? []) {
        const data = copy("talent", talent.name, lookup);
        if (talent.targets) data.system.targets = talent.targets;
        out.push({...data, flags});
    }
    for (const trait of plan.traits ?? []) {
        const data = copy("trait", trait.name, lookup);
        if (trait.rating != null) data.system.rating = trait.rating;
        out.push({...data, flags});
    }
    for (const gear of plan.equipment ?? []) {
        const data = copy("equipment", gear.name, lookup);
        if (gear.quantity > 1) data.system.quantity = gear.quantity;
        out.push({...data, flags});
    }

    return out;
}

/** Копия из компендиума или заглушка; идентификатор пака за копией не тянется. */
function copy(kind, name, lookup) {
    const found = lookup?.(kind, name);
    const data = found ? {...found} : {name, ...STUB[kind], system: {}};
    delete data._id;
    data.system = {...(data.system ?? {})};
    return data;
}

/**
 * Нагрузка для actor.update(), отменяющая записанное применение.
 *
 * @param {object} actor
 * @param {object} applied  из planToActorUpdate
 * @returns {object}
 */
export function revertUpdate(actor, applied = {}) {
    const update = {};

    for (const [key, modifier] of Object.entries(applied.characteristics ?? {})) {
        const current = actor.system.characteristics?.[key];
        if (current) update[`system.characteristics.${key}.base`] = (current.base ?? 0) - modifier;
    }
    // Если после выдачи навык подняли ещё выше, трогать его нельзя: этот шаг его
    // больше не держит.
    for (const [key, record] of Object.entries(applied.skills ?? {}))
        if (actor.system.skills?.[key]?.advance === record.to) update[`system.skills.${key}.advance`] = record.from;

    for (const spec of applied.specialities ?? [])
        update[`system.skills.${spec.key}.specialities.-=${spec.name}`] = null;

    if (applied.wounds) {
        update["system.wounds.max"] = Math.max(0, (actor.system.wounds?.max ?? 0) - applied.wounds);
        update["system.wounds.value"] = Math.max(0, (actor.system.wounds?.value ?? 0) - applied.wounds);
    }
    for (const key of ["corruption", "insanity"])
        if (applied[key]) update[`system.${key}`] = Math.max(0, (actor.system[key] ?? 0) - applied[key]);

    if (applied.influence) {
        const current = actor.system.characteristics?.influence;
        if (current) update["system.characteristics.influence.base"] = (current.base ?? 0) - applied.influence;
    }

    if (applied.aptitudes?.length) {
        const kept = {...(actor.system.aptitudes ?? {})};
        for (const aptitude of applied.aptitudes) delete kept[aptitude];
        update["system.aptitudes"] = kept;
    }

    return update;
}
