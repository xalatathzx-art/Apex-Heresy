/**
 * Rogue Trader: то, чем книга отличается от Dark Heresy 2.
 *
 * До сих пор профиль Rogue Trader был клоном dh2 с другой подписью — так и было
 * написано в коде. Здесь собрано то, что книга говорит на самом деле, и собрано
 * отдельным модулем: правила чистые, проверяются без Foundry и не растворяются
 * в общем файле.
 */

/**
 * Девять характеристик (стр. 15, 46 и печатный лист на стр. 398).
 * Влиятельности среди них нет — это характеристика Dark Heresy 2.
 */
export const RT_CHARACTERISTICS = Object.freeze([
    "weaponSkill", "ballisticSkill", "strength", "toughness", "agility",
    "intelligence", "perception", "willpower", "fellowship"
]);

/** Характеристики, которых у Rogue Trader нет. */
export const RT_ABSENT_CHARACTERISTICS = Object.freeze(["influence"]);

/**
 * Стоимость продвижений характеристик (стр. 46).
 *
 * Ступеней четыре, а не пять, и цена зависит не от склонностей, а от самой
 * характеристики: склонностей в Rogue Trader нет вовсе.
 */
export const RT_ADVANCE_TIERS = Object.freeze(["simple", "intermediate", "trained", "expert"]);

export const RT_CHARACTERISTIC_COSTS = Object.freeze({
    weaponSkill:    [250, 500, 750, 1000],
    ballisticSkill: [100, 250, 500, 750],
    strength:       [100, 250, 500, 750],
    toughness:      [250, 500, 750, 1000],
    agility:        [100, 250, 500, 750],
    intelligence:   [500, 750, 1000, 2500],
    perception:     [500, 750, 1000, 2500],
    willpower:      [500, 750, 1000, 2500],
    fellowship:     [250, 500, 750, 1000]
});

/**
 * Сколько стоит купить столько-то продвижений одной характеристики.
 *
 * Цены накопительные, как и в Dark Heresy: чтобы взять третью ступень, надо
 * купить первые две. Сверх четвёртой книга продвижений не даёт.
 *
 * @param {string} characteristic ключ характеристики
 * @param {number} advances сколько ступеней куплено
 * @returns {number} суммарная цена в очках опыта
 */
export function rtCharacteristicCost(characteristic, advances) {
    const ladder = RT_CHARACTERISTIC_COSTS[characteristic];
    if (!ladder) return 0;
    const steps = Math.min(Math.max(Number(advances) || 0, 0), ladder.length);
    let total = 0;
    for (let i = 0; i < steps; i++) total += ladder[i];
    return total;
}

/**
 * Базовые и продвинутые навыки (стр. 76).
 *
 * Разница не в списке, а в том, что делать без обучения: базовый можно пробовать
 * на половине характеристики, продвинутый нельзя вовсе.
 *
 * Названия здесь — ключи навыков этой системы, а не заголовки книги: книга ведёт
 * свои сорок восемь навыков, система — двадцать восемь объединённых, и сведение
 * одного списка к другому решается отдельно. Здесь сказано лишь то, к какому
 * типу книга относит каждый из существующих.
 */
/**
 * Все сорок восемь навыков Rogue Trader (Таблица 3-1, стр. 76), ключами этой
 * системы. Порядок книжный — по алфавиту её собственных названий.
 *
 * Печатный лист на стр. 398 перечисляет ещё Lip Reading, но ни в таблице, ни в
 * тексте правил такого навыка нет: это остаток бланка Dark Heresy 1. Следуем
 * таблице правил, а не опечатке в бланке.
 */
export const RT_SKILLS = Object.freeze([
    "acrobatics", "awareness", "barter", "blather", "carouse", "charm", "chemUse",
    "ciphers", "climb", "commerce", "command", "commonLore", "concealment",
    "contortionist", "deceive", "demolition", "disguise", "dodge", "drive",
    "evaluate", "forbiddenLore", "gamble", "inquiry", "interrogation", "intimidate",
    "invocation", "literacy", "logic", "medicae", "navigate", "performer", "pilot",
    "psyniscience", "scholasticLore", "scrutiny", "search", "secretTongue",
    "security", "shadowing", "silentMove", "sleightOfHand", "speakLanguage",
    "survival", "swim", "techUse", "tracking", "trade", "wrangling"
]);

/**
 * Навыки этой системы, которых у Rogue Trader нет.
 *
 * Четыре из них книга не объединяла: Атлетика у неё разделена на Climb и Swim,
 * Языки — на Literacy, Secret Tongue и Speak Language, Управление — на Drive и
 * Pilot, Скрытность — на Concealment и Silent Move. Парирование навыком не
 * является вовсе: это проверка Владения оружием.
 */
export const RT_ABSENT_SKILLS = Object.freeze([
    "athletics", "linguistics", "operate", "parry", "stealth"
]);

/** Продвинутые навыки: без обучения ими пользоваться нельзя (стр. 76). */
export const RT_ADVANCED_SKILLS = Object.freeze([
    "acrobatics", "blather", "chemUse", "ciphers", "commerce", "commonLore",
    "demolition", "drive", "forbiddenLore", "interrogation", "invocation",
    "literacy", "medicae", "navigate", "performer", "pilot", "psyniscience",
    "scholasticLore", "secretTongue", "security", "shadowing", "sleightOfHand",
    "speakLanguage", "survival", "techUse", "tracking", "trade", "wrangling"
]);

export function rtSkillType(skillKey) {
    return RT_ADVANCED_SKILLS.includes(skillKey) ? "advanced" : "basic";
}

/**
 * Значение, против которого бросают навык (Таблица 9-1, стр. 231).
 *
 *   Untrained Basic Skill    — половина характеристики, округляя ВНИЗ
 *   Untrained Advanced Skill — проверка невозможна
 *   Trained                  — полная характеристика
 *   Mastered                 — полная и +10 или +20
 *
 * Округление вниз здесь названо прямо и потому идёт против общего правила
 * округления вверх: книга оговаривает этот случай отдельно.
 *
 * Ситуационные поправки книга требует прибавлять ПОСЛЕ деления, поэтому здесь
 * их нет вовсе — сюда приходит чистая характеристика.
 *
 * @param {object} options
 * @param {number} options.characteristic чистое значение характеристики
 * @param {number} options.advance ступень обученности: <0 не обучен, 0 обучен, 10 и 20 освоено
 * @param {"basic"|"advanced"} options.type
 * @returns {{base: number, usable: boolean}}
 */
export function rtSkillBase({characteristic, advance, type}) {
    const stat = Math.max(Number(characteristic) || 0, 0);
    const step = Number(advance) || 0;

    if (step < 0) {
        if (type === "advanced") return {base: 0, usable: false};
        return {base: Math.floor(stat / 2), usable: true};
    }
    return {base: stat + step, usable: true};
}
