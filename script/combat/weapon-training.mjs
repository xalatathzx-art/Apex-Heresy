/**
 * Обученность владению оружием, Dark Heresy Second Edition, стр. 151:
 *
 *   "Each weapon type (Las, Chain, Low-Tech, etc.) requires the appropriate
 *    Weapon Training talent for best use... There are always circumstances when
 *    a character needs to use a weapon for which he does not have the
 *    appropriate talent, though, and doing so imposes a -20 untrained penalty
 *    on the relevant test."
 *
 * Группа оружия — это тот самый system.type, который проставлен стволам в паке,
 * поэтому систему не надо спрашивать: она сама видит, есть ли нужный талант.
 * Ручной тумблер остаётся для случаев, которых данные не знают.
 */

/** Штраф за отсутствие подходящего таланта. */
export const UNTRAINED_PENALTY = -20;

/**
 * Названия специализаций, которыми книги зовут каждую группу.
 *
 * Force-оружие считается «лучшим моно-вариантом эквивалентного Low-Tech»
 * (стр. 146), поэтому обучение Low-Tech его покрывает.
 */
const TRAINING_NAMES = Object.freeze({
    las: ["las"],
    solidProjectile: ["solid projectile", "solid-projectile", "sp"],
    bolt: ["bolt"],
    melta: ["melta"],
    plasma: ["plasma"],
    flame: ["flame"],
    primitive: ["low-tech", "low tech", "primitive"],
    launcher: ["launcher", "heavy"],
    grenade: ["thrown", "grenade", "low-tech", "low tech"],
    exotic: ["exotic"],
    chain: ["chain"],
    shock: ["shock"],
    power: ["power"],
    force: ["force", "low-tech", "low tech"]
});

/** Что стоит в скобках у таланта: «Weapon Training (Las)» → «las». */
function specialisationOf(name) {
    const found = /\(([^)]+)\)/.exec(String(name ?? ""));
    return found ? found[1].trim().toLowerCase() : "";
}

/**
 * Есть ли у персонажа обучение этой группе оружия.
 *
 * Оружие без группы считается освоенным: пустой тип означает «не знаем», а
 * наказывать за пробел в данных нельзя — это тот же принцип, по которому пустая
 * совместимость патрона значит «подходит всему».
 *
 * @param {string[]} talentNames названия талантов персонажа
 * @param {string} weaponType ключ группы из WEAPON_TYPES
 * @returns {boolean}
 */
export function isTrainedWith(talentNames, weaponType) {
    if (!weaponType) return true;
    const accepted = TRAINING_NAMES[weaponType];
    if (!accepted) return true;

    for (const name of talentNames ?? []) {
        const text = String(name ?? "");
        if (!/weapon training/i.test(text)) continue;
        const specialisation = specialisationOf(text);
        // «Weapon Training» без скобок оставлено мастером как заготовка и ничего
        // не покрывает: иначе одна незаполненная запись снимала бы все штрафы.
        if (!specialisation) continue;
        if (accepted.includes(specialisation)) return true;
    }
    return false;
}

/**
 * Поправка к броску за обученность.
 * @param {string[]} talentNames
 * @param {string} weaponType
 * @returns {number} 0 или UNTRAINED_PENALTY
 */
export function trainingModifier(talentNames, weaponType) {
    return isTrainedWith(talentNames, weaponType) ? 0 : UNTRAINED_PENALTY;
}
