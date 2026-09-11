// ════════════════════════════════════════════════════════════════════════
//  «Оживление» персонажа Only War: характер и Comrade (стр. 104-110).
//
//  Характер (Demeanour) — это игровая подсказка, а не механика: таблица 3-21
//  бросается d100 и для персонажа, и для его Comrade (стр. 110).
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

const row = (min, max, name) => ({min, max, name});

/** Таблица 3-21: Demeanours (стр. 107-109). */
export const DEMEANOURS = [
    row(1, 2, "Addict"), row(3, 4, "Affable"), row(5, 6, "Backwater"), row(7, 8, "Heroic"),
    row(9, 10, "Bilious"), row(11, 12, "Boisterous"), row(13, 14, "Braggart"), row(15, 16, "Cocky"),
    row(17, 18, "Cook"), row(19, 20, "Coward"), row(21, 22, "Death-Wish"), row(23, 24, "Dissenter"),
    row(25, 26, "Dreamer"), row(27, 28, "Gambler"), row(29, 30, "Green"), row(31, 32, "Incompetent"),
    row(33, 34, "Jaded"), row(35, 36, "Joker"), row(37, 38, "Lateral Thinker"), row(39, 40, "Loner"),
    row(41, 42, "Loose Cannon"), row(43, 44, "Loyal"), row(45, 46, "Lucky"), row(47, 48, "Mentor"),
    row(49, 50, "Leech"), row(51, 52, "Never Bathes"), row(53, 54, "Nihilist"), row(55, 56, "Numb"),
    row(57, 58, "Oblivious"), row(59, 60, "Obsessive"), row(61, 62, "Old"), row(63, 64, "Optimist"),
    row(65, 66, "Pessimist"), row(67, 68, "Pious"), row(69, 70, "Psycho"), row(71, 72, "Quiet"),
    row(73, 74, "Reckless"), row(75, 76, "Sarcastic"), row(77, 78, "Sensible"), row(79, 80, "Shell-Shocked"),
    row(81, 82, "Slacker"), row(83, 84, "Slow"), row(85, 86, "Smooth"), row(87, 88, "Steely"),
    row(89, 90, "Strict"), row(91, 92, "Superstitious"), row(93, 94, "Talkative"), row(95, 96, "Thief"),
    row(97, 98, "Twitchy"), row(99, 100, "Unlucky")
];

/** Характер по броску d100. */
export function demeanourFor(roll) {
    return DEMEANOURS.find(entry => roll >= entry.min && roll <= entry.max)?.name ?? "";
}
