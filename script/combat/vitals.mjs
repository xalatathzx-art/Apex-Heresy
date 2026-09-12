/**
 * Раны и критические раны при прямом изменении.
 *
 * Правило переполнения одно на всю систему: пока раны не заполнены, урон идёт
 * в них; всё, что сверх предела, становится критическим (DH2, стр. 232). Лечение
 * идёт в обратном порядке — сначала снимается критическое, потому что заживает
 * оно последним и держит персонажа у порога смерти.
 *
 * Модуль чистый: он не знает ни об актёре, ни о броске, и потому проверяем
 * отдельно от Foundry.
 */

/**
 * Куда лягут очки урона.
 * @param {{wounds: number, critical: number, max: number, amount: number}} state
 * @returns {{wounds: number, critical: number}}
 */
export function woundsAfterDamage({wounds, critical, max, amount}) {
    let left = Math.max(Number(wounds) || 0, 0);
    let crit = Math.max(Number(critical) || 0, 0);
    const limit = Math.max(Number(max) || 0, 0);
    const hit = Math.max(Number(amount) || 0, 0);
    if (hit === 0) return {wounds: left, critical: crit};

    if (left >= limit) {
        crit += hit;
    } else if (left + hit > limit) {
        crit += (left + hit) - limit;
        left = limit;
    } else {
        left += hit;
    }
    return {wounds: left, critical: crit};
}

/**
 * Куда лягут очки лечения. Критическое снимается первым.
 * @param {{wounds: number, critical: number, amount: number}} state
 * @returns {{wounds: number, critical: number}}
 */
export function woundsAfterHealing({wounds, critical, amount}) {
    let left = Math.max(Number(wounds) || 0, 0);
    let crit = Math.max(Number(critical) || 0, 0);
    let heal = Math.max(Number(amount) || 0, 0);

    const fromCritical = Math.min(heal, crit);
    crit -= fromCritical;
    heal -= fromCritical;
    left = Math.max(left - heal, 0);
    return {wounds: left, critical: crit};
}
