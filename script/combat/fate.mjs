/**
 * Очки Судьбы, Dark Heresy Second Edition, стр. 294.
 *
 *   "A Fate point can be used at any time, either on the character's own turn or
 *    in reaction to the action of another character. Spending a Fate point is a
 *    Free Action, and allows a Player Character to do one of the following:
 *      • Re-roll a test.
 *      • Gain a +10 bonus to a test. This must be chosen before the dice are rolled.
 *      • Add 1 degree of success to a successful test. This may be chosen after
 *        the dice are rolled.
 *      • Count as having rolled 10 for Initiative.
 *      • Instantly remove 1d5 damage from the character. This cannot be used to
 *        remove Critical damage.
 *      • Instantly recover from being Stunned.
 *      • Remove all levels of Fatigue."
 *
 * Ресурс тот же, что у Дурной славы еретика, и поле то же — system.fate. Отличие
 * в списке: у еретика он открывается по уровню Порчи и покровителю, у аколита
 * доступен целиком и сразу.
 *
 * `resolves` говорит, доводит ли система дело до конца сама. «+10 к следующей
 * проверке» и «добавь ступень успеха» — уговор за столом: карточка их объявляет,
 * как это уже сделано с критами и с Тёмной славой.
 */

export const FATE_ABILITIES = Object.freeze([
    {id: "reroll", label: "FATE_ABILITY_REROLL", resolves: false},
    {id: "bonus", label: "FATE_ABILITY_BONUS", resolves: false},
    {id: "degree", label: "FATE_ABILITY_DEGREE", resolves: false},
    {id: "initiative", label: "FATE_ABILITY_INITIATIVE", resolves: true},
    {id: "heal", label: "FATE_ABILITY_HEAL", resolves: true},
    {id: "stun", label: "FATE_ABILITY_STUN", resolves: true},
    {id: "fatigue", label: "FATE_ABILITY_FATIGUE", resolves: true}
]);

/** Инициатива, засчитанная за десятку, плюс бонус ловкости. */
export const FATE_INITIATIVE_ROLL = 10;

/**
 * Сколько ран снимет очко Судьбы.
 *
 * «This cannot be used to remove Critical damage» — поэтому критические раны не
 * трогаются вовсе, и лечение упирается в число обычных. Этим Судьба отличается
 * от Тёмной славы, которая критические как раз обнуляет.
 *
 * @param {{wounds: number, roll: number}} state
 * @returns {{healed: number, wounds: number}}
 */
export function fateHealing({wounds, roll}) {
    const taken = Math.max(Number(wounds) || 0, 0);
    const rolled = Math.max(Number(roll) || 0, 0);
    const healed = Math.min(rolled, taken);
    return {healed, wounds: taken - healed};
}

/**
 * Кому принадлежит Судьба в этом броске.
 *
 * У броска уклонения бросавший и владелец карточки — разные люди: карточку
 * создаёт атакующий, а уклоняется цель. Списывать очко у атакующего за чужой
 * переброс нельзя, поэтому уклонение спрашивается отдельно.
 *
 * @param {object} rollData
 * @returns {string|null} идентификатор владельца очка
 */
export function fateOwnerId(rollData) {
    if (rollData?.flags?.isEvasion && rollData?.evasions?.selected) {
        const evasion = rollData.evasions[rollData.evasions.selected];
        if (evasion?.ownerId) return evasion.ownerId;
    }
    return rollData?.ownerId ?? null;
}
