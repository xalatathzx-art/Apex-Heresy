// ════════════════════════════════════════════════════════════════════════
//  Названия умений Deathwatch → ключи этой системы.
//
//  Книга написана на первой редакции, и система теперь знает её умения своими
//  именами: Climb и Swim, Concealment и Silent Move, Carouse и Wrangling —
//  каждое отдельным ключом. Поэтому карта почти тождественна: она переводит
//  написание («Tech-Use» → techUse, «Lore: Common (Imperium)» → commonLore со
//  специализацией), а не сводит два умения в одно.
//
//  Так было не всегда. Пока система жила на одном наборе Dark Heresy 2, Climb и
//  Swim приходилось складывать в Athletics, а Carouse, Gamble, Performer и
//  Wrangling не имели наследника вовсе и уходили особой способностью — платой
//  без умения. Сведение потеряло бы смысл теперь, когда ключи есть: продвижение
//  «Wrangling +10» требует «Wrangling», и оба должны лечь в одно поле листа.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Умение первой редакции → ключ этой системы. */
export const SKILL_KEYS = {
    acrobatics: "acrobatics",
    awareness: "awareness",
    barter: "barter",
    blather: "blather",
    carouse: "carouse",
    charm: "charm",
    chemuse: "chemUse",
    climb: "climb",
    command: "command",
    concealment: "concealment",
    contortionist: "contortionist",
    deceive: "deceive",
    demolition: "demolition",
    disguise: "disguise",
    dodge: "dodge",
    evaluate: "evaluate",
    gamble: "gamble",
    inquiry: "inquiry",
    interrogation: "interrogation",
    intimidate: "intimidate",
    invocation: "invocation",
    literacy: "literacy",
    logic: "logic",
    medicae: "medicae",
    psyniscience: "psyniscience",
    scrutiny: "scrutiny",
    search: "search",
    security: "security",
    shadowing: "shadowing",
    silentmove: "silentMove",
    sleightofhand: "sleightOfHand",
    survival: "survival",
    swim: "swim",
    techuse: "techUse",
    tracking: "tracking",
    wrangling: "wrangling"
};

/** Умение со специализацией: «Lore: Common (Imperium)» → commonLore. */
export const SPECIALIST_KEYS = {
    "lore: common": "commonLore",
    "lore: forbidden": "forbiddenLore",
    "lore: scholastic": "scholasticLore",
    "common lore": "commonLore",
    "forbidden lore": "forbiddenLore",
    "scholastic lore": "scholasticLore",
    "speak language": "speakLanguage",
    "secret tongue": "secretTongue",
    "ciphers": "ciphers",
    "navigation": "navigate",
    "drive": "drive",
    "pilot": "pilot",
    "performer": "performer",
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
