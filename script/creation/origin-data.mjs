// ════════════════════════════════════════════════════════════════════════
//  Схема предмета «Происхождение» — словарь и проверка.
//
//  Один тип предмета описывает блок ЛЮБОГО шага создания персонажа в любой из
//  пяти книг: родной мир Dark Heresy, право рождения Rogue Trader, компонент
//  полка Only War, архетип Black Crusade, орден Deathwatch. Отличаются они не
//  устройством, а числом и названиями шагов — их держит ruleset-data.mjs.
//
//  Модуль чистый: ни одной глобали Foundry, поэтому правила генерации
//  проверяются тестами без запуска мира.
// ════════════════════════════════════════════════════════════════════════

/** Книги, по которым может создаваться персонаж. */
export const RULESETS = ["dh2", "rt", "ow", "bc", "dw"];

/** Шаги каждой книги в книжном порядке. */
export const STAGES = {
    dh2: ["homeWorld", "background", "role", "divination"],
    rt:  ["homeWorld", "birthright", "lure", "trials", "motivation", "career"],
    ow:  ["regimentOrigin", "regimentCommander", "regimentType", "doctrine",
          "equipmentDoctrine", "standardKit", "speciality"],
    bc:  ["race", "archetype", "pride", "disgrace", "motivation"],
    dw:  ["chapter", "speciality"]
};

/** Ключи характеристик актора — те же и в том же порядке, что в template.json. */
export const CHARACTERISTIC_KEYS = ["weaponSkill", "ballisticSkill", "strength", "toughness",
    "agility", "intelligence", "perception", "willpower", "fellowship", "influence"];

/** Ключи навыков актора — те же и в том же порядке, что в template.json. */
export const SKILL_KEYS = ["acrobatics", "athletics", "awareness", "charm", "command", "commerce",
    "commonLore", "deceive", "dodge", "forbiddenLore", "inquiry", "interrogation", "intimidate",
    "linguistics", "logic", "medicae", "navigate", "operate", "parry", "psyniscience",
    "scholasticLore", "scrutiny", "security", "sleightOfHand", "stealth", "survival",
    "techUse", "trade"];

/** Склонности — те же, что раздают навыки и характеристики в template.json. */
export const APTITUDES = ["Agility", "Ballistic Skill", "Defence", "Fellowship", "Fieldcraft",
    "Finesse", "General", "Intelligence", "Knowledge", "Leadership", "Offence", "Perception",
    "Psyker", "Social", "Strength", "Tech", "Toughness", "Weapon Skill", "Willpower"];

/** Ступени обученности навыка, которые понимает модель актора. */
export const ADVANCES = [-20, 0, 10, 20];

/**
 * Виды выбора, который книга оставляет игроку.
 *  one    — ровно один вариант из перечисленных, вариант несёт свои выдачи;
 *  many   — N специализаций внутри названных групп навыков;
 *  target — против кого работает талант (Ненависть, Связи, Доброе имя).
 */
export const CHOICE_TYPES = ["one", "many", "target"];

const EMPTY_GRANTS = {
    skills: [], specialities: [], talents: [], traits: [], equipment: [], aptitudes: [],
    wounds: 0, corruption: 0, insanity: 0, influence: 0
};

/**
 * Заполнить пустыми значениями всё, чего автор не написал.
 *
 * Написанное всегда побеждает, а незнакомые ключи переживают проход: исходник
 * книги бывает богаче схемы, и терять его молча нельзя.
 *
 * @param {object} source  system-часть предмета
 * @returns {object}       независимая копия
 */
export function normaliseOrigin(source = {}) {
    const out = structuredClone(source);
    out.ruleset ??= "";
    out.stage ??= "";
    out.key ??= "";
    out.order ??= 0;
    out.cost ??= 0;
    out.characteristics ??= {};
    out.characteristicChoices ??= [];
    out.aptitudes ??= [];
    out.wounds = {formula: "", bonus: 0, doubleToughnessBonus: false, ...(out.wounds ?? {})};
    out.fate = {value: 0, blessing: 0, formula: "", ...(out.fate ?? {})};
    out.grants = {...structuredClone(EMPTY_GRANTS), ...(out.grants ?? {})};
    out.choices ??= [];
    out.bonuses ??= [];
    out.requires ??= {};
    out.adjacency ??= [];
    out.recommended ??= [];
    out.description ??= "";
    out.source ??= "";
    return out;
}

/**
 * Всё, что не так с происхождением, словами.
 *
 * @param {object} source  system-часть предмета
 * @returns {string[]}     пустой массив означает «пригодно»
 */
export function validateOrigin(source = {}) {
    const origin = normaliseOrigin(source);
    const problems = [];

    if (!RULESETS.includes(origin.ruleset)) problems.push(`unknown ruleset "${origin.ruleset}"`);
    else if (!STAGES[origin.ruleset].includes(origin.stage))
        problems.push(`unknown stage "${origin.stage}" for ruleset ${origin.ruleset}`);
    if (!origin.key) problems.push("missing key");

    for (const key of Object.keys(origin.characteristics))
        if (!CHARACTERISTIC_KEYS.includes(key)) problems.push(`unknown characteristic "${key}"`);

    for (const choice of origin.characteristicChoices) {
        for (const key of choice.from ?? [])
            if (!CHARACTERISTIC_KEYS.includes(key)) problems.push(`unknown characteristic "${key}"`);
        if (!(choice.pick > 0)) problems.push(`characteristic choice "${choice.label ?? ""}" picks nothing`);
    }

    for (const aptitude of origin.aptitudes)
        if (!APTITUDES.includes(aptitude)) problems.push(`unknown aptitude "${aptitude}"`);

    for (const bonus of origin.bonuses) if (!bonus.name) problems.push("a bonus has no name");

    problems.push(...grantProblems(origin.grants, ""));

    for (const choice of origin.choices) {
        const where = `choice "${choice.key ?? ""}"`;
        if (!choice.key) problems.push("a choice has no key");
        if (!CHOICE_TYPES.includes(choice.type)) problems.push(`${where} has unknown type "${choice.type}"`);
        if (choice.type === "one" && !(choice.options ?? []).length) problems.push(`${where} has no options`);
        if (choice.type === "target" && !choice.talentTemplate)
            problems.push(`${where} names no talent to apply the target to`);
        for (const option of choice.options ?? []) {
            problems.push(...grantProblems(option.grants ?? {}, `${where}: `));
            if (option.talentTemplate && !option.talentTemplate.includes("{v}"))
                problems.push(`${where}: option "${option.label ?? ""}" has a talent template with no {v}`);
        }
    }

    // Пустой объект означает «без условий»: null в шаблоне типа невозможен — модель
    // данных делает из него ObjectField, который null не принимает.
    if (origin.requires?.stage && !STAGES[origin.ruleset]?.includes(origin.requires.stage))
        problems.push(`requires unknown stage "${origin.requires.stage}"`);

    return problems;
}

/**
 * Человекочитаемая сводка выдач — для листа предмета, где она только читается.
 *
 * @param {object} source  system-часть предмета
 * @returns {string[]}     по строке на непустой раздел
 */
export function grantSummaryLines(source = {}) {
    const origin = normaliseOrigin(source);
    const lines = [];
    const signed = value => `${value > 0 ? "+" : ""}${value}`;

    const characteristics = Object.entries(origin.characteristics);
    if (characteristics.length)
        lines.push(`Characteristics: ${characteristics.map(([key, value]) => `${key} ${signed(value)}`).join(", ")}`);
    for (const choice of origin.characteristicChoices)
        lines.push(`Characteristics: ${signed(choice.value)} to ${choice.pick} of ${(choice.from ?? []).join(", ")}`);

    if (origin.aptitudes.length) lines.push(`Aptitudes: ${origin.aptitudes.join(", ")}`);

    const grants = origin.grants;
    if (grants.skills.length)
        lines.push(`Skills: ${grants.skills.map(s => `${s.key} ${s.advance}`).join(", ")}`);
    if (grants.specialities.length)
        lines.push(`Specialities: ${grants.specialities.map(s => `${s.key} (${s.name})`).join(", ")}`);
    if (grants.talents.length) lines.push(`Talents: ${grants.talents.map(t => t.name).join(", ")}`);
    if (grants.traits.length)
        lines.push(`Traits: ${grants.traits.map(t => t.rating != null ? `${t.name} (${t.rating})` : t.name).join(", ")}`);
    if (grants.equipment.length)
        lines.push(`Equipment: ${grants.equipment.map(e => e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name).join(", ")}`);
    if (grants.aptitudes.length) lines.push(`Aptitudes: ${grants.aptitudes.join(", ")}`);
    for (const key of ["wounds", "corruption", "insanity", "influence"])
        if (grants[key]) lines.push(`${key[0].toUpperCase()}${key.slice(1)}: ${signed(grants[key])}`);

    for (const choice of origin.choices) {
        const options = (choice.options ?? [])
            .map(o => o.talentTemplate ? `${o.label} →` : o.label).join(" / ");
        lines.push(`Choice "${choice.key}" (${choice.type}): ${options || choice.label}`);
    }

    return lines;
}

/** Проверка одного набора выдач — общая для самого происхождения и для варианта выбора. */
function grantProblems(grants, prefix) {
    const problems = [];

    for (const skill of grants.skills ?? []) {
        if (!SKILL_KEYS.includes(skill.key)) problems.push(`${prefix}unknown skill "${skill.key}"`);
        if (!ADVANCES.includes(skill.advance))
            problems.push(`${prefix}skill "${skill.key}" has advance ${skill.advance}, expected one of ${ADVANCES.join(", ")}`);
    }
    for (const spec of grants.specialities ?? []) {
        if (!SKILL_KEYS.includes(spec.key)) problems.push(`${prefix}unknown skill "${spec.key}"`);
        if (!spec.name) problems.push(`${prefix}speciality of "${spec.key}" has no name`);
    }
    for (const talent of grants.talents ?? []) if (!talent.name) problems.push(`${prefix}a talent has no name`);
    for (const trait of grants.traits ?? []) if (!trait.name) problems.push(`${prefix}a trait has no name`);
    for (const gear of grants.equipment ?? []) if (!gear.name) problems.push(`${prefix}an equipment entry has no name`);
    for (const aptitude of grants.aptitudes ?? [])
        if (!APTITUDES.includes(aptitude)) problems.push(`${prefix}unknown aptitude "${aptitude}"`);

    return problems;
}
