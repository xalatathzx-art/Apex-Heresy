// ════════════════════════════════════════════════════════════════════════
//  Происхождение плюс ответы игрока = один плоский план выдач.
//
//  План — это то, что слой Foundry пишет на актора, и то, что Мастер создания
//  показывает игроку ДО всякой записи. Разделение важно: пока выбор не сделан,
//  план не сходится, и на актора не уходит ничего.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

import {normaliseOrigin} from "./origin-data.mjs";

/**
 * Пустой план.
 *
 * `duplicates` — выдачи, пришедшие дважды из разных источников. Rogue Trader
 * превращает их в Skill Mastery и Talented, остальные книги возвращают за них
 * опыт; сам план только отмечает факт.
 */
export function emptyPlan() {
    return {characteristics: {}, skills: [], specialities: [], talents: [], traits: [],
            equipment: [], aptitudes: [], duplicates: [],
            wounds: 0, corruption: 0, insanity: 0, influence: 0};
}

/**
 * Одно происхождение и ответы на его выборы → план плюс всё неотвеченное.
 *
 * @param {object} origin                    system-часть предмета происхождения
 * @param {object} picks                     {characteristicChoices, one, many, target}
 * @param {{intelligenceBonus?: number}} context
 * @returns {{plan: object, problems: string[]}}
 */
export function resolveGrantPlan(origin, picks = {}, context = {}) {
    const source = normaliseOrigin(origin);
    const problems = [];
    const plan = emptyPlan();

    for (const [key, value] of Object.entries(source.characteristics)) addCharacteristic(plan, key, value);
    for (const aptitude of source.aptitudes) if (!plan.aptitudes.includes(aptitude)) plan.aptitudes.push(aptitude);
    addGrants(plan, source.grants);

    source.characteristicChoices.forEach((choice, index) => {
        const picked = picks.characteristicChoices?.[index] ?? [];
        if (picked.length !== choice.pick) {
            problems.push(`"${choice.label}" needs ${choice.pick} characteristic(s), got ${picked.length}`);
            return;
        }
        if (new Set(picked).size !== picked.length) {
            problems.push(`"${choice.label}" picks the same characteristic twice`);
            return;
        }
        for (const option of picked) addCharacteristic(plan, choice.from[option], choice.value);
    });

    for (const choice of source.choices) {
        if (choice.type === "one") {
            const index = picks.one?.[choice.key];
            if (index == null) { problems.push(`choice "${choice.key}" is unanswered`); continue; }
            const option = choice.options?.[index];
            if (!option) { problems.push(`choice "${choice.key}" has no option ${index}`); continue; }
            addGrants(plan, option.grants ?? {});
        } else if (choice.type === "many") {
            const want = choice.count === "intelligenceBonus" ? (context.intelligenceBonus ?? 0) : (choice.count ?? 0);
            const got = picks.many?.[choice.key] ?? [];
            if (got.length !== want) {
                problems.push(`choice "${choice.key}" needs ${want} entries, got ${got.length}`);
                continue;
            }
            for (const entry of got) addSpeciality(plan, {key: entry.key, name: entry.name, advance: choice.advance ?? 0});
        } else if (choice.type === "target") {
            const target = picks.target?.[choice.key];
            if (!target?.value) { problems.push(`choice "${choice.key}" is unanswered`); continue; }
            // Цель лежит структурно, а не только в скобках имени: иначе талант формально
            // есть, но сопоставить его с кем-либо в бою нечем.
            addNamed(plan, "talents", "talent",
                     {name: choice.talentTemplate.replace("{v}", target.value), targets: [target]});
        }
    }

    return {plan, problems};
}

/**
 * Сложить планы нескольких шагов: характеристики суммируются, у навыка остаётся
 * лучшая обученность, одинаковые выдачи не дублируются.
 *
 * Аргументы не меняются.
 *
 * @param {...object} plans
 * @returns {object}
 */
export function mergePlans(...plans) {
    const out = emptyPlan();
    for (const plan of plans) {
        for (const [key, value] of Object.entries(plan.characteristics ?? {})) addCharacteristic(out, key, value);
        for (const skill of plan.skills ?? []) addSkill(out, skill);
        for (const spec of plan.specialities ?? []) addSpeciality(out, spec);
        for (const talent of plan.talents ?? []) addNamed(out, "talents", "talent", talent);
        for (const trait of plan.traits ?? []) addNamed(out, "traits", "trait", trait);
        for (const gear of plan.equipment ?? []) out.equipment.push({...gear});
        for (const aptitude of plan.aptitudes ?? []) if (!out.aptitudes.includes(aptitude)) out.aptitudes.push(aptitude);
        for (const duplicate of plan.duplicates ?? []) out.duplicates.push({...duplicate});
        for (const key of ["wounds", "corruption", "insanity", "influence"]) out[key] += plan[key] ?? 0;
    }
    return out;
}

function addCharacteristic(plan, key, value) {
    if (!key) return;
    plan.characteristics[key] = (plan.characteristics[key] ?? 0) + value;
}

function addGrants(plan, grants) {
    for (const skill of grants.skills ?? []) addSkill(plan, skill);
    for (const spec of grants.specialities ?? []) addSpeciality(plan, spec);
    for (const talent of grants.talents ?? []) addNamed(plan, "talents", "talent", talent);
    for (const trait of grants.traits ?? []) addNamed(plan, "traits", "trait", trait);
    for (const gear of grants.equipment ?? []) plan.equipment.push({...gear});
    for (const key of ["wounds", "corruption", "insanity", "influence"]) plan[key] += grants[key] ?? 0;
}

function addSkill(plan, skill) {
    const existing = plan.skills.find(s => s.key === skill.key);
    if (!existing) { plan.skills.push({...skill}); return; }
    plan.duplicates.push({kind: "skill", name: skill.key});
    existing.advance = Math.max(existing.advance, skill.advance);
}

function addSpeciality(plan, spec) {
    const existing = plan.specialities.find(s => s.key === spec.key && s.name === spec.name);
    if (!existing) { plan.specialities.push({...spec}); return; }
    plan.duplicates.push({kind: "speciality", name: `${spec.key} (${spec.name})`});
    existing.advance = Math.max(existing.advance ?? 0, spec.advance ?? 0);
}

function addNamed(plan, bucket, kind, entry) {
    if (plan[bucket].some(e => e.name === entry.name)) { plan.duplicates.push({kind, name: entry.name}); return; }
    plan[bucket].push({...entry});
}
