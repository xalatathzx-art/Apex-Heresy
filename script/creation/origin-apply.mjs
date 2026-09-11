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
//
//  Запись идёт в ТЕ ЖЕ поля, что читает система, по её правилам:
//    склонности    — предметы типа aptitude (их показывает вкладка «Продвижение» и
//                    считает движок опыта; объект system.aptitudes не читает никто);
//    специализации — ключи с подписью (adeptusArbites: {label: "Adeptus Arbites"});
//    стартовое     — флаг starter: движок опыта не берёт за такой ранг ни очка.
// ════════════════════════════════════════════════════════════════════════

export const GRANT_FLAG_SCOPE = "dark-heresy";
export const GRANT_FLAG_KEY = "originGrant";

/** Склонность, которая по книге есть у всех (стр. 79). */
export const UNIVERSAL_APTITUDE = "General";

/** Заглушки для имён, которых нет ни в одном компендиуме: потерять выдачу молча нельзя. */
const STUB = {
    talent: {type: "talent", img: "icons/svg/upgrade.svg"},
    trait: {type: "trait", img: "icons/svg/aura.svg"},
    equipment: {type: "gear", img: "icons/svg/item-bag.svg"},
    aptitude: {type: "aptitude", img: "icons/svg/book.svg"}
};

const normalise = value => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Склонности актора — по предметам, как их читает система, плюс General.
 * @param {{items?: Iterable<{type: string, name: string}>}} actor
 * @returns {Set<string>}
 */
export function ownedAptitudes(actor) {
    const owned = new Set([UNIVERSAL_APTITUDE]);
    for (const item of actor?.items ?? []) if (item?.type === "aptitude" && item.name) owned.add(item.name.trim());
    return owned;
}

/**
 * Ключ специализации навыка под отображаемое имя.
 *
 * Существующая специализация находится по подписи (регистр и пробелы не важны),
 * новой ключ строится из имени так же, как в template.json: «Tactica Imperialis»
 * → tacticaImperialis.
 *
 * @param {object} skill  system.skills[key]
 * @param {string} name
 * @returns {{specKey: string, created: boolean}}
 */
export function specialityKeyFor(skill, name) {
    const wanted = normalise(name);
    for (const [specKey, entry] of Object.entries(skill?.specialities ?? {}))
        if (normalise(entry?.label) === wanted || normalise(specKey) === wanted) return {specKey, created: false};
    const words = String(name ?? "").trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
    const specKey = words.map((word, index) => index === 0
        ? word.toLowerCase()
        : word[0].toUpperCase() + word.slice(1).toLowerCase()).join("");
    return {specKey, created: true};
}

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
 * Склонности здесь только учитываются: создаются они предметами, см. planToItemData.
 *
 * @param {object} actor  объект формы актора (нужны system и items)
 * @param {object} plan   из grant-data.mjs
 * @param {{characteristicMode?: "flat"|"generation"}} [options]
 * @returns {{update: object, applied: object}}
 */
export function planToActorUpdate(actor, plan, {characteristicMode = "flat"} = {}) {
    const update = {};
    const applied = {characteristics: {}, generationModifiers: {}, skills: {}, specialities: [],
                     aptitudes: [], duplicateAptitudes: [],
                     wounds: 0, corruption: 0, insanity: 0, influence: 0};

    for (const [key, modifier] of Object.entries(plan.characteristics ?? {})) {
        const current = actor.system.characteristics?.[key];
        if (!current) continue;   // книга назвала характеристику, которой у этого листа нет
        if (characteristicMode === "generation") { applied.generationModifiers[key] = modifier; continue; }
        update[`system.characteristics.${key}.base`] = (current.base ?? 0) + modifier;
        applied.characteristics[key] = modifier;
    }

    // Навык только поднимается. Если другой источник уже дал больше, выдача ничего не
    // меняет — и в откат не попадает, иначе он опустил бы чужую обученность.
    // Выданный ранг — стартовый: движок опыта не должен брать за него очков.
    for (const skill of plan.skills ?? []) {
        const current = actor.system.skills?.[skill.key];
        if (!current || (current.advance ?? -20) >= skill.advance) continue;
        update[`system.skills.${skill.key}.advance`] = skill.advance;
        update[`system.skills.${skill.key}.starter`] = true;
        applied.skills[skill.key] = {from: current.advance ?? -20, to: skill.advance, starterWas: !!current.starter};
    }

    for (const spec of plan.specialities ?? []) {
        const skill = actor.system.skills?.[spec.key];
        if (!skill) continue;
        const {specKey, created} = specialityKeyFor(skill, spec.name);
        const existing = skill.specialities?.[specKey];
        const advance = spec.advance ?? 0;
        if (existing && (existing.advance ?? -20) >= advance) continue;
        const path = `system.skills.${spec.key}.specialities.${specKey}`;
        if (created) {
            update[path] = {label: String(spec.name).trim(), advance, starter: true, cost: 0};
        } else {
            update[`${path}.advance`] = advance;
            update[`${path}.starter`] = true;
        }
        applied.specialities.push({key: spec.key, specKey, created,
                                   from: existing?.advance ?? -20, starterWas: !!existing?.starter});
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

    // Склонность, которая у актора уже есть, повторно не выдаётся и в откат не пишется:
    // отменяя этот шаг, нельзя отнять то, что дал другой. Но и пропасть она не должна —
    // по книге (стр. 79) повторная меняется на другую, характеристическую. Выбор за
    // игроком, поэтому здесь только отмечаем долг. General есть у всех, долгом не считается.
    const owned = ownedAptitudes(actor);
    for (const aptitude of plan.aptitudes ?? []) {
        if (!owned.has(aptitude)) { applied.aptitudes.push(aptitude); owned.add(aptitude); }
        else if (aptitude !== UNIVERSAL_APTITUDE) applied.duplicateAptitudes.push(aptitude);
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
 * @param {{aptitudes?: string[]}} [options]  какие склонности создать; по умолчанию все из плана
 * @returns {object[]}
 */
export function planToItemData(plan, tag, carrierId, lookup, {aptitudes} = {}) {
    const flags = {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, grantedBy: carrierId}};
    const out = [];

    for (const talent of plan.talents ?? []) {
        const data = copy("talent", talent.name, lookup);
        if (talent.targets) data.system.targets = talent.targets;
        // Талант от происхождения — стартовый: движок опыта за него не списывает.
        data.system.starter = true;
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
    for (const name of aptitudes ?? plan.aptitudes ?? []) {
        if (name === UNIVERSAL_APTITUDE) continue;
        out.push({name, ...STUB.aptitude, system: {}, flags});
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
 * Предметы (таланты, черты, снаряжение, склонности) снимаются вместе с носителем —
 * здесь только значения полей.
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
    for (const [key, record] of Object.entries(applied.skills ?? {})) {
        if (actor.system.skills?.[key]?.advance !== record.to) continue;
        update[`system.skills.${key}.advance`] = record.from;
        update[`system.skills.${key}.starter`] = !!record.starterWas;
    }

    for (const spec of applied.specialities ?? []) {
        const path = `system.skills.${spec.key}.specialities`;
        // Созданную выдачей специализацию убираем целиком; существовавшую — возвращаем:
        // она часть списка навыка, а не наша.
        if (spec.created) { update[`${path}.-=${spec.specKey}`] = null; continue; }
        update[`${path}.${spec.specKey}.advance`] = spec.from ?? -20;
        update[`${path}.${spec.specKey}.starter`] = !!spec.starterWas;
    }

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

    return update;
}
