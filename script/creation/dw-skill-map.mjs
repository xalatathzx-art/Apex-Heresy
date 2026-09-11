// ════════════════════════════════════════════════════════════════════════
//  Названия умений Deathwatch → ключи этой системы.
//
//  Книга написана на первой редакции: там отдельно Climb и Swim, отдельно
//  Concealment и Silent Move, а знания зовутся «Lore: Common (Imperium)».
//  Система живёт на наборе Dark Heresy 2, где Climb и Swim — это Athletics,
//  Concealment и Silent Move — Stealth, а знание записывается специализацией.
//
//  Поэтому карта. Она не полна и полна быть не может: у Carouse, Gamble и
//  Performer в Dark Heresy 2 наследника нет вовсе. Такие продвижения остаются
//  собой — записью на листе за свою цену, — а не подгоняются к чужому ключу.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Умение первой редакции → ключ этой системы. */
export const SKILL_KEYS = {
    acrobatics: "acrobatics",
    awareness: "awareness",
    charm: "charm",
    climb: "athletics",
    swim: "athletics",
    command: "command",
    commerce: "commerce",
    evaluate: "commerce",
    concealment: "stealth",
    silentmove: "stealth",
    shadowing: "stealth",
    contortionist: "acrobatics",
    deceive: "deceive",
    dodge: "dodge",
    inquiry: "inquiry",
    interrogation: "interrogation",
    intimidate: "intimidate",
    logic: "logic",
    medicae: "medicae",
    psyniscience: "psyniscience",
    scrutiny: "scrutiny",
    search: "awareness",
    security: "security",
    survival: "survival",
    tracking: "survival",
    techuse: "techUse",
    demolition: "techUse",
    chemuse: "medicae",
    invocation: "scholasticLore",
    sleightofhand: "sleightOfHand"
};

/** Умение со специализацией: «Lore: Common (Imperium)» → commonLore. */
export const SPECIALIST_KEYS = {
    "lore: common": "commonLore",
    "lore: forbidden": "forbiddenLore",
    "lore: scholastic": "scholasticLore",
    "common lore": "commonLore",
    "forbidden lore": "forbiddenLore",
    "scholastic lore": "scholasticLore",
    "speak language": "linguistics",
    "ciphers": "linguistics",
    "literacy": "linguistics",
    "navigation": "navigate",
    "drive": "operate",
    "pilot": "operate",
    "trade": "trade",
    "tactics": "scholasticLore"
};

const normalise = text => String(text ?? "").toLowerCase().replace(/[^a-z: ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Что означает строка продвижения-умения.
 *
 * @param {string} name  «Awareness», «Tracking +10», «Lore: Common (Imperium)»
 * @returns {{key: string, name?: string, advance: number, any: boolean}|null}
 *          null — умения с таким названием в этой системе нет вовсе
 */
export function skillFromAdvance(name) {
    const text = String(name ?? "").trim();
    // «+10» в конце — это следующая ступень того же умения, а не новое умение.
    const advance = Number(text.match(/\+(\d+)\s*$/)?.[1]) || 0;
    const withoutRank = text.replace(/\s*\+\d+\s*$/, "").trim();
    const speciality = withoutRank.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    const head = normalise(speciality ? speciality[1] : withoutRank);
    const inside = speciality ? speciality[2].trim() : "";

    const specialist = SPECIALIST_KEYS[head];
    if (specialist) {
        // «(any)» значит, что специализацию выбирает игрок.
        const any = /^any$/i.test(inside) || inside === "";
        return {key: specialist, name: any ? "" : inside, advance, any};
    }
    const plain = SKILL_KEYS[head.replace(/[: ]/g, "")];
    if (plain) return {key: plain, name: "", advance, any: false};
    return null;
}

/**
 * Талант ли это продвижение — по тому, как книга его пометила.
 * @param {{type?: string}} advance
 */
export function isTalentAdvance(advance) {
    return String(advance?.type ?? "").toLowerCase() === "talent";
}

/**
 * Имя, под которым талант ищется в компендиуме: «Sound Constitution (x2)» лежит
 * там просто «Sound Constitution», кратность — правило покупки, а не имя.
 */
export function talentLookupName(name) {
    return String(name ?? "").replace(/\s*\(x\d+\)\s*$/i, "").replace(/\s*\(any\)\s*$/i, "").trim();
}
