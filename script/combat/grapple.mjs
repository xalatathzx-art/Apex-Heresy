/**
 * Захват, Dark Heresy Second Edition, стр. 222-223.
 *
 * Действие «Grapple» — Половинное или Полное, Атака/Ближний бой, и применяется
 * только когда захват уже идёт. Контролирующий обязан объявить его Полным
 * действием, иначе захват немедленно кончается; схваченный объявляет его
 * Половинным — «this is part of the penalty for being Grappled».
 *
 * Почти всё решается противоборством Силы, поэтому модуль считает не броски, а
 * последствия: что именно случилось, когда та или иная сторона победила.
 */

/** Что может сделать тот, кто держит захват. */
export const CONTROLLER_OPTIONS = Object.freeze([
    {id: "damage", label: "GRAPPLE.DAMAGE", test: "strength"},
    {id: "throwDown", label: "GRAPPLE.THROW_DOWN", test: "strength"},
    {id: "push", label: "GRAPPLE.PUSH", test: "strength"}
]);

/** Что может сделать тот, кого держат. */
export const TARGET_OPTIONS = Object.freeze([
    {id: "breakFree", label: "GRAPPLE.BREAK_FREE", test: "strength"},
    {id: "slipFree", label: "GRAPPLE.SLIP_FREE", test: "acrobatics"},
    {id: "takeControl", label: "GRAPPLE.TAKE_CONTROL", test: "strength"}
]);

/** Урон голыми руками: 1d5−3 плюс бонус Силы (стр. 222). */
export const UNARMED_DAMAGE = "1d5-3";

/** Прибавка к дальнейшим противоборствам, пока сбитый лежит. */
export const PRONE_GRAPPLE_BONUS = 10;

/**
 * Последствия одной попытки в захвате.
 *
 * @param {object} options
 * @param {string} options.option какая из шести опций выбрана
 * @param {boolean} options.won победила ли активная сторона
 * @param {number} options.degrees ступени успеха — нужны только толчку
 * @param {number} options.halfMove половина хода толкающего, в метрах
 * @returns {{freed: boolean, prone: boolean, controlSwapped: boolean,
 *            damage: boolean, fatigue: number, metres: number,
 *            proneBonus: number, endsGrapple: boolean}}
 */
export function grappleOutcome({option, won, degrees = 0, halfMove = 0}) {
    const nothing = {
        freed: false, prone: false, controlSwapped: false,
        damage: false, fatigue: 0, metres: 0, proneBonus: 0, endsGrapple: false
    };
    if (!won) return nothing;

    switch (option) {
        case "damage":
            // «Inflicts unarmed damage (1d5-3+SB) to his opponent's Body
            // location and one level of Fatigue.»
            return {...nothing, damage: true, fatigue: 1};

        case "throwDown":
            // Сбитый лежит, и дальнейшие противоборства идут с +10 — сверх
            // обычного +10 за атаку по лежачему, а не вместо него.
            return {...nothing, prone: true, proneBonus: PRONE_GRAPPLE_BONUS};

        case "push": {
            // «One metre in a direction of his choice, plus one additional metre
            // for each degree of success», но не дальше половины своего хода.
            const wanted = 1 + Math.max(Number(degrees) || 0, 0);
            const limit = Math.max(Number(halfMove) || 0, 0);
            return {...nothing, metres: limit > 0 ? Math.min(wanted, limit) : wanted};
        }

        case "breakFree":
        case "slipFree":
            return {...nothing, freed: true, endsGrapple: true};

        case "takeControl":
            return {...nothing, controlSwapped: true};

        default:
            return nothing;
    }
}

/**
 * Какие опции доступны этой стороне.
 * @param {"controller"|"target"} side
 * @returns {ReadonlyArray} список опций
 */
export function optionsFor(side) {
    return side === "controller" ? CONTROLLER_OPTIONS : TARGET_OPTIONS;
}
