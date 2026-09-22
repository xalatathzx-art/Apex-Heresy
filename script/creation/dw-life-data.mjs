// ════════════════════════════════════════════════════════════════════════
//  Чем брат Караула Смерти жил до Караула (Deathwatch, стр. 25, 29-32, 162).
//
//  Три вещи, которые книга просит дописать после характеристик и снаряжения:
//  что он совершил в своём ордене, что за нрав он носит лично, и какую
//  историю таскает за собой его силовая броня. Ни одна из них не механика —
//  это то, из чего складывается персонаж за столом, — но все три книга
//  бросает костью, и потому им место в данных, а не в голове игрока.
//
//  Таблица прошлого у каждого ордена своя и лежит на самом ордене
//  (rules.pastEvents): орден её и печатает. Здесь — общее: нравы и правила
//  броска.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/**
 * Таблица 1-10 (стр. 32): личный нрав.
 *
 * Орденский нрав брат носит всегда и сменить не может; личный он выбирает сам
 * и волен поменять, когда персонаж перерос прежний. Кость тут не обязательна —
 * книга прямо разрешает выбрать, — но она есть, и потому есть и здесь.
 */
export const PERSONAL_DEMEANOURS = [
    {roll: 1,  name: "Calculating", text: "The Space Marine's mind is highly analytical, constantly aware of the pros and cons of any decision he faces."},
    {roll: 2,  name: "Gregarious",  text: "The Space Marine is a charismatic and talkative sort, one who puts his Battle-Brothers and even normal humans at ease."},
    {roll: 3,  name: "Hot-Blooded", text: "The Space Marine is quick to temper and aggressive in all things."},
    {roll: 4,  name: "Studious",    text: "The Space Marine values lore and learning, preferring to think his way through a problem."},
    {roll: 5,  name: "Taciturn",    text: "The Space Marine is a brooding individual, little given to conversation."},
    {roll: 6,  name: "Pious",       text: "The Space Marine cherishes faith in his Primarch and the Emperor above all."},
    {roll: 7,  name: "Stoic",       text: "No test of endurance is too much for this Space Marine."},
    {roll: 8,  name: "Scornful",    text: "Pity has no place in this Space Marine's heart."},
    {roll: 9,  name: "Ambitious",   text: "This Space Marine's gaze is ever-lifted towards his goal."},
    {roll: 10, name: "Proud",       text: "Dignity and honour are important to this Space Marine."}
];

/** Формула броска личного нрава (таблица 1-10). */
export const PERSONAL_DEMEANOUR_FORMULA = "1d10";

/** Формула броска прошлого: у каждого ордена пять строк (стр. 29-30). */
export const PAST_EVENT_FORMULA = "1d5";

/** Имя таблицы истории силовой брони в компендиуме (таблица 5-12, стр. 162). */
export const ARMOUR_HISTORY_TABLE = "Power Armour History";

/**
 * Строка таблицы по броску.
 *
 * @param {{roll: number}[]} rows
 * @param {number} roll
 * @returns {object|null} null — бросок вне таблицы
 */
export function rowForRoll(rows, roll) {
    const value = Number(roll);
    return (rows ?? []).find(row => Number(row.roll) === value) ?? null;
}

/** Личный нрав по броску d10. */
export function personalDemeanourFor(roll) {
    return rowForRoll(PERSONAL_DEMEANOURS, roll);
}

/**
 * Прошлое ордена: строки в том виде, в каком их показывает Мастер.
 *
 * Орден без таблицы — не ошибка: у мира может лежать свой орден, дописанный
 * столом, и прошлое ему сочиняют, а не бросают.
 *
 * @param {object} chapter  system-часть предмета ордена
 */
export function pastEventsOf(chapter) {
    return chapter?.rules?.pastEvents ?? [];
}

/**
 * Что записывается в анкету: имя и описание одной строкой.
 *
 * Книга печатает прошлое абзацем, а на листе для него одно поле. Имя без
 * описания теряет смысл («Boarding Action» — какой?), описание без имени
 * не читается с одного взгляда, поэтому в поле идут оба.
 */
export function lifeLine(row) {
    if (!row) return "";
    const name = String(row.name ?? "").trim();
    const text = String(row.text ?? "").trim();
    return name && text ? `${name}: ${text}` : name || text;
}
