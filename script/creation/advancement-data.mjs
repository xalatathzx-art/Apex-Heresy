// ════════════════════════════════════════════════════════════════════════
//  Цены продвижений — таблицы 2-2, 2-4 и 2-6 (Dark Heresy, стр. 80-81).
//
//  Цена зависит от того, сколько склонностей персонажа совпало с покупкой:
//  две, одна или ни одной. Совпадений всегда не больше двух, потому что у
//  самой покупки их не больше двух.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Ступени характеристики, по порядку. Пройти можно только подряд. */
export const CHARACTERISTIC_LEVELS = ["simple", "intermediate", "trained", "proficient", "expert"];

/** Ступени навыка, по порядку. Untrained — это отсутствие первой. */
export const SKILL_LEVELS = ["known", "trained", "experienced", "veteran"];

/** Уровни таланта. */
export const TALENT_TIERS = [1, 2, 3];

/** Прибавка к характеристике за одну ступень (стр. 80). */
export const CHARACTERISTIC_STEP = 5;

/** Модификатор теста, который даёт ступень навыка (стр. 80). */
export const SKILL_ADVANCE = {known: 0, trained: 10, experienced: 20, veteran: 30};

/**
 * Таблица 2-2: Characteristic Advances. Ключ — число совпавших склонностей.
 */
export const CHARACTERISTIC_COSTS = {
    2: {simple: 100, intermediate: 250, trained: 500, proficient: 750, expert: 1250},
    1: {simple: 250, intermediate: 500, trained: 750, proficient: 1000, expert: 1500},
    0: {simple: 500, intermediate: 750, trained: 1000, proficient: 1500, expert: 2500}
};

/** Таблица 2-4: Skill Advances. */
export const SKILL_COSTS = {
    2: {known: 100, trained: 200, experienced: 300, veteran: 400},
    1: {known: 200, trained: 400, experienced: 600, veteran: 800},
    0: {known: 300, trained: 600, experienced: 900, veteran: 1200}
};

/** Таблица 2-6: Talent Advances, по уровню таланта. */
export const TALENT_COSTS = {
    2: {1: 200, 2: 300, 3: 400},
    1: {1: 300, 2: 450, 3: 600},
    0: {1: 600, 2: 900, 3: 1200}
};

/**
 * Сколько склонностей покупки есть у персонажа.
 *
 * У покупки их обычно две, у редкой — одна; больше двух не бывает, поэтому
 * результат всегда 0, 1 или 2.
 *
 * @param {Record<string, boolean>|string[]} owned  склонности персонажа
 * @param {string[]} required                       склонности покупки
 * @returns {0|1|2}
 */
export function matchingAptitudes(owned, required = []) {
    const has = Array.isArray(owned) ? new Set(owned) : new Set(Object.keys(owned ?? {}));
    const unique = [...new Set(required)];
    return Math.min(2, unique.filter(aptitude => has.has(aptitude)).length);
}

/**
 * Цена одной покупки.
 *
 * @param {"characteristic"|"skill"|"talent"} kind
 * @param {string|number} level  ступень характеристики/навыка либо уровень таланта
 * @param {0|1|2} matches        из matchingAptitudes
 * @returns {number|null}        null — такой ступени в таблице нет
 */
export function advanceCost(kind, level, matches) {
    const table = kind === "characteristic" ? CHARACTERISTIC_COSTS
        : kind === "skill" ? SKILL_COSTS
        : kind === "talent" ? TALENT_COSTS
        : null;
    return table?.[matches]?.[level] ?? null;
}

/**
 * Во что обойдётся поднять характеристику или навык с текущей ступени до целевой.
 *
 * Цены накопительные: ступени проходят подряд, и пропустить оплаченную нельзя
 * (стр. 80). `from` — уже пройденная ступень, null означает «ни одной».
 *
 * @param {"characteristic"|"skill"} kind
 * @param {string|null} from
 * @param {string} to
 * @param {0|1|2} matches
 * @returns {number|null} null — ступени неизвестны или идут вспять
 */
export function cumulativeCost(kind, from, to, matches) {
    const levels = kind === "characteristic" ? CHARACTERISTIC_LEVELS
        : kind === "skill" ? SKILL_LEVELS
        : null;
    if (!levels) return null;

    const start = from == null ? -1 : levels.indexOf(from);
    const end = levels.indexOf(to);
    if (start < -1 || end < 0 || end <= start) return null;

    let total = 0;
    for (let index = start + 1; index <= end; index++) {
        const step = advanceCost(kind, levels[index], matches);
        if (step == null) return null;
        total += step;
    }
    return total;
}
