// ════════════════════════════════════════════════════════════════════════
//  Величина цели и Чёрный Панцирь.
//
//  Одна таблица (Black Crusade, стр. 143) работает в две стороны: по крупной
//  цели легче попасть и ей же труднее прятаться. Десантник Хаоса громаден, но
//  Чёрный Панцирь срастил его с бронёй так, что стрелок этого не чувствует —
//  пока броня ему по размеру.
//
//  Терминаторская броня ему не по размеру (стр. 177): «Terminator armour is
//  just too big», и Панцирь перестаёт помогать. Отсюда и общее правило: Панцирь
//  гасит ровно габариты силовой брони, то есть ступень Hulking. Стал крупнее —
//  дарами богов, мутацией, терминаторской бронёй — и разница снова видна.
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
 * Поправка к попаданию по этой цели — с учётом того, кто она.
 *
 * @param {object} target
 * @param {number} target.size            ступень величины
 * @param {boolean} [target.spaceMarine]  включён ли режим десантника (Чёрный Панцирь)
 * @param {boolean} [target.terminator]   надета ли терминаторская броня
 * @returns {number}
 */
export function targetSizeModifier({size, spaceMarine = false, terminator = false} = {}) {
    const step = Number(size) || AVERAGE_SIZE;
    // Терминаторская броня слишком велика, чтобы Панцирь с ней справился (стр. 177):
    // в ней десантник стреляется как то, чем он выглядит.
    if (!spaceMarine || terminator) return sizeToHitModifier(step);
    return sizeToHitModifier(carapaceAdjustedSize(step));
}

/**
 * Терминаторская ли это броня.
 *
 * Отдельного поля у брони в системе нет, а заводить его ради одного правила
 * не стоит: и в книге, и в паке такая броня зовётся своим именем.
 *
 * @param {{name?: string, system?: {equipped?: boolean}}} item
 * @returns {boolean}
 */
export function isTerminatorArmour(item) {
    return /terminator/i.test(String(item?.name ?? ""));
}

/**
 * Носит ли боец терминаторскую броню прямо сейчас.
 * @param {{type?: string, name?: string, system?: {equipped?: boolean}}[]} items
 * @returns {boolean}
 */
export function wearsTerminatorArmour(items = []) {
    return (items ?? []).some(item =>
        item?.type === "armour" && item?.system?.equipped === true && isTerminatorArmour(item));
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
export function describeTargetSize({size, spaceMarine = false, terminator = false} = {}) {
    const step = Math.min(10, Math.max(1, Math.round(Number(size) || AVERAGE_SIZE)));
    const carapace = !!spaceMarine && !terminator;
    return {
        modifier: targetSizeModifier({size: step, spaceMarine, terminator}),
        size: step,
        sizeName: SIZE_NAMES[step],
        // Панцирь отмечаем только когда он что-то изменил: у обычного по размеру
        // десантника он и так ничего не гасит.
        carapace: carapace && sizeToHitModifier(step) !== targetSizeModifier({size: step, spaceMarine, terminator}),
        terminator: !!terminator && !!spaceMarine
    };
}
