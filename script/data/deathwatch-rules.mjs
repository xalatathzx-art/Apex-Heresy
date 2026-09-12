// ════════════════════════════════════════════════════════════════════════
//  Правила Deathwatch, которых нет ни у одной другой книги.
//
//  Брат Караула Смерти живёт по другим меркам. Порча до сотни очков не делает
//  с ним ничего — у него Порог Чистоты (стр. 282). Безумие идёт своей дорожкой
//  с Проклятием примарха вместо Рудиментов (таблица 9-8, стр. 278). Снаряжение
//  выдаётся не за деньги и не за Влияние, а по Известности (таблица 5-2,
//  стр. 140). А единство отряда — общий запас, который считается от вожака
//  (таблица 7-8, стр. 212).
//
//  Всё это числа и пороги, а не поведение Foundry, поэтому они живут здесь:
//  профиль правил в dark-heresy.js только называет их по имени.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/**
 * Таблица 5-2 (стр. 140): рейтинг Известности → ранг.
 *
 * Ранг решает, что брату выдадут из арсенала: у предмета стоит требование,
 * и ранг брата должен быть не ниже. Порядок в списке — это и есть старшинство.
 */
export const RENOWN_RANKS = [
    {key: "initiated",     label: "RENOWN.INITIATED",     min: 0,  max: 19},
    {key: "respected",     label: "RENOWN.RESPECTED",     min: 20, max: 39},
    {key: "distinguished", label: "RENOWN.DISTINGUISHED", min: 40, max: 59},
    {key: "famed",         label: "RENOWN.FAMED",         min: 60, max: 79},
    {key: "hero",          label: "RENOWN.HERO",          min: 80, max: Infinity}
];

/** Ранг Известности по рейтингу. Ниже нуля рейтинг не бывает. */
export function renownRankFor(rating) {
    const points = Math.max(0, Number(rating) || 0);
    return RENOWN_RANKS.find(rank => points >= rank.min && points <= rank.max) ?? RENOWN_RANKS[0];
}

/**
 * Таблица 9-8 (стр. 278): дорожка Безумия.
 *
 * Проверка на Боевую травму делается за каждые 10 очков Безумия, и штраф к ней
 * берётся отсюда же. Вторая колонка — уровень Проклятия примарха: у брата
 * безумие проявляется не бредом, а тем, что его собственные и орденские изъяны
 * растут. На сотне он выходит из игры.
 */
export const INSANITY_TRACK = [
    {max: 30,       modifier: 0,   curse: 0},
    {max: 60,       modifier: -10, curse: 1},
    {max: 90,       modifier: -20, curse: 2},
    {max: 99,       modifier: -30, curse: 3},
    {max: Infinity, modifier: -30, curse: 3, removedFromPlay: true}
];

/** Ступень дорожки Безумия, в которую попал брат. */
export function insanityStep(insanity) {
    const points = Math.max(0, Number(insanity) || 0);
    return INSANITY_TRACK.find(step => points <= step.max) ?? INSANITY_TRACK[INSANITY_TRACK.length - 1];
}

/** Штраф к проверке на Боевую травму (стр. 279). */
export function traumaModifier(insanity) {
    return insanityStep(insanity).modifier;
}

/**
 * Порог Чистоты (стр. 282): до сотни очков Порча не делает с братом ничего.
 * Ни Рудиментов, ни мутаций — его душа закована в броню. На сотне он выбывает.
 */
export const PURITY_THRESHOLD = 100;

/** Перешагнул ли брат Порог Чистоты. */
export function purityBroken(corruption) {
    return (Number(corruption) || 0) >= PURITY_THRESHOLD;
}

/**
 * Таблица 7-8 (стр. 212): запас Единства отряда.
 *
 * Считается от вожака: его бонус Общительности плюс лучшая надбавка за ранг и
 * лучшая — за Командование. «Лучшая» здесь буквально: надбавки внутри своей
 * колонки не складываются.
 */
export const COHESION_RANK_BONUS = [{rank: 6, bonus: 2}, {rank: 4, bonus: 1}];
export const COHESION_COMMAND_BONUS = [{advance: 20, bonus: 3}, {advance: 10, bonus: 2}, {advance: 0, bonus: 1}];

/**
 * @param {object} leader
 * @param {number} leader.fellowshipBonus  бонус Общительности вожака
 * @param {number} [leader.rank]           его ранг
 * @param {number|null} [leader.commandAdvance]  ступень Командования (−20 — не обучен)
 * @returns {{total: number, fellowshipBonus: number, rankBonus: number, commandBonus: number}}
 */
export function cohesionPool({fellowshipBonus = 0, rank = 1, commandAdvance = null} = {}) {
    const base = Math.max(0, Number(fellowshipBonus) || 0);
    const step = Number(rank) || 0;
    const rankBonus = COHESION_RANK_BONUS.find(row => step >= row.rank)?.bonus ?? 0;
    // Умения у брата может не быть вовсе, и это не то же, что ступень «0»:
    // нулевая ступень — обученное Командование, а отсутствие — пустое место.
    const advance = commandAdvance === null || commandAdvance === undefined
        ? NaN : Number(commandAdvance);
    const commandBonus = Number.isFinite(advance)
        ? (COHESION_COMMAND_BONUS.find(row => advance >= row.advance)?.bonus ?? 0)
        : 0;
    return {total: base + rankBonus + commandBonus, fellowshipBonus: base, rankBonus, commandBonus};
}

/**
 * Бросок Единства (стр. 212): 1d10 не выше нынешнего запаса отряда.
 * Порог, а не модификатор: проверка идёт по кубику, а не по характеристике.
 */
export function cohesionChallengeTarget(cohesion) {
    return Math.max(0, Number(cohesion) || 0);
}

/**
 * Проверка Сосредоточения провалена всегда на 91-00 (стр. 186), сколько бы
 * ни давал рейтинг. В других книгах такого потолка нет: там автопровал только
 * на натуральной сотне.
 */
export const FOCUS_AUTO_FAIL = 91;
