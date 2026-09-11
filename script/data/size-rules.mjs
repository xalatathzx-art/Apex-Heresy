// ════════════════════════════════════════════════════════════════════════
//  Величина цели и Чёрный Панцирь.
//
//  Одна таблица (Black Crusade, стр. 143) работает в две стороны: по крупной
//  цели легче попасть и ей же труднее прятаться. Десантник Хаоса громаден, но
//  Чёрный Панцирь срастил его с бронёй так, что стрелок этого не чувствует —
//  пока броня ему по размеру.
//
//  Броня может сделать носителя заметнее — у терминаторской это +10 (стр. 177):
//  «Terminator armour is just too big», Панцирь с ней не справляется. Система
//  такую броню не угадывает: цифра стоит в самой карточке брони, полем, и меняет
//  её тот, кто правит снаряжение, а не тот, кто правит код.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Ступени величины по имени — те же, что печатает таблица. */
export const SIZE_NAMES = Object.freeze({
    1: "miniscule", 2: "puny", 3: "weedy", 4: "average", 5: "hulking",
    6: "enormous", 7: "massive", 8: "immense", 9: "monumental", 10: "titanic"
});

/** Обычный человек — четвёртая ступень. */
export const AVERAGE_SIZE = 4;

/** Десантник в силовой броне: пятая ступень, «Armoured Space Marines» из таблицы. */
export const SPACE_MARINE_SIZE = 5;

/**
 * Поправка к попаданию за величину цели: −30 у крошечной, +60 у титанической.
 * @param {number} size  ступень 1..10
 * @returns {number}
 */
export function sizeToHitModifier(size) {
    const step = Number(size);
    if (!Number.isFinite(step)) return 0;
    const clamped = Math.min(10, Math.max(1, Math.round(step)));
    return (clamped - AVERAGE_SIZE) * 10;
}

/**
 * Насколько Чёрный Панцирь гасит величину.
 *
 * Он не делает десантника невидимым: он снимает то, что добавила его собственная
 * броня, и не больше. Поэтому громадный (5) стреляется как обычный (4), а всё,
 * что выше пятой ступени, продолжает считаться — за вычетом той же одной ступени.
 *
 * @param {number} size  настоящая ступень цели
 * @returns {number}     ступень, по которой считается попадание
 */
export function carapaceAdjustedSize(size) {
    const step = Number(size) || AVERAGE_SIZE;
    if (step <= SPACE_MARINE_SIZE) return Math.min(step, AVERAGE_SIZE);
    return step - (SPACE_MARINE_SIZE - AVERAGE_SIZE);
}

/**
 * Поправка к попаданию по этой цели.
 *
 * Складывается из двух вещей: какова цель сама (с поправкой на Чёрный Панцирь) и
 * что к ней добавляет надетая броня.
 *
 * @param {object} target
 * @param {number} target.size            ступень величины
 * @param {boolean} [target.spaceMarine]  включён ли режим десантника (Чёрный Панцирь)
 * @param {number} [target.armour]        сумма поправок надетой брони
 * @returns {number}
 */
export function targetSizeModifier({size, spaceMarine = false, armour = 0} = {}) {
    const step = Number(size) || AVERAGE_SIZE;
    const own = spaceMarine ? sizeToHitModifier(carapaceAdjustedSize(step)) : sizeToHitModifier(step);
    return own + (Number(armour) || 0);
}

/**
 * Что к заметности носителя добавляет надетая броня.
 *
 * Читается из поля карточки, а не угадывается по имени: брони с такой особенностью
 * в книгах не одна, и правит их тот, кто ведёт игру.
 *
 * @param {{type?: string, system?: {equipped?: boolean, sizeModifier?: number}}[]} items
 * @returns {number}
 */
export function armourSizeModifier(items = []) {
    let total = 0;
    for (const item of items ?? []) {
        if (item?.type !== "armour" || item?.system?.equipped !== true) continue;
        total += Number(item.system.sizeModifier) || 0;
    }
    return total;
}

/**
 * Из чего сложилась поправка — чтобы карточка броска могла это объяснить.
 *
 * Игроку мало числа: «+10» и «0» выглядят как отсутствие правила, а на деле за
 * нулём стоит Чёрный Панцирь, за десяткой — броня, которая ему велика. Поэтому
 * возвращаем и слагаемые, а слова к ним подбирает уже интерфейс.
 *
 * @param {{size?: number, spaceMarine?: boolean, terminator?: boolean}} target
 * @returns {{modifier: number, size: number, sizeName: string, carapace: boolean, terminator: boolean}}
 */
export function describeTargetSize({size, spaceMarine = false, armour = 0} = {}) {
    const step = Math.min(10, Math.max(1, Math.round(Number(size) || AVERAGE_SIZE)));
    const fromArmour = Number(armour) || 0;
    return {
        modifier: targetSizeModifier({size: step, spaceMarine, armour: fromArmour}),
        size: step,
        sizeName: SIZE_NAMES[step],
        // Панцирь отмечаем только когда он что-то изменил.
        carapace: !!spaceMarine && sizeToHitModifier(step) !== sizeToHitModifier(carapaceAdjustedSize(step)),
        armour: fromArmour
    };
}
