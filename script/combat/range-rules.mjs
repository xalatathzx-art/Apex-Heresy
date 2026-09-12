/**
 * Дальность и ближний бой, Dark Heresy Second Edition, стр. 231:
 *
 *   "When a character makes a ranged attack against a target that is two metres
 *    away or closer, that target is at Point-Blank range. Ballistic Skill tests
 *    made to attack a target at this range gain a +30 bonus. This bonus does not
 *    apply when the attacker and the target are engaged in melee combat with
 *    each other."
 *
 * Это правило, а не домашняя поправка: пистолет в свалке не даёт +30. «Сцеплены
 * в ближнем бою» система не отслеживает — это состояние стола, а не расстояние,
 * поэтому спрашивается тумблером в окне атаки.
 */

/** Бонус за стрельбу в упор. */
export const POINT_BLANK_BONUS = 30;

/**
 * Убрать бонус за упор, если стрелок и цель сцеплены в ближнем бою.
 *
 * Полоса дальности сохраняется: цель по-прежнему в упор, просто преимущества
 * это больше не даёт. Подпись поэтому остаётся, а число обнуляется — иначе
 * карточка соврала бы о том, где стоит цель.
 *
 * @param {{rangeMod: number, rangeModText: string}} range
 * @param {boolean} engagedInMelee
 * @returns {{rangeMod: number, rangeModText: string, pointBlankDenied: boolean}}
 */
export function applyMeleeEngagement(range, engagedInMelee) {
    const mod = Number(range?.rangeMod) || 0;
    const text = range?.rangeModText ?? "";
    if (!engagedInMelee || mod !== POINT_BLANK_BONUS) {
        return {rangeMod: mod, rangeModText: text, pointBlankDenied: false};
    }
    return {rangeMod: 0, rangeModText: text, pointBlankDenied: true};
}
