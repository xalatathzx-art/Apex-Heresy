// ════════════════════════════════════════════════════════════════════════
//  Таланты и боги — таблицы 2-10, 2-11 и 2-12 (Black Crusade, стр. 80-82).
//
//  Цену таланта задаёт его бог, поэтому без этой разметки еретик покупает
//  всё по цене союзника, а счётчик принадлежности стоит на нуле. Пак пришёл
//  собранным и покровителей не знал — карта нужна, чтобы их проставить.
//
//  Списки по богам, а не «имя → бог»: так их видно теми же столбцами, что в
//  книге, и сверять глазами легче. Обратная карта строится здесь же.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Таблица 2-10: таланты первого уровня (стр. 80). */
export const TIER_ONE = {
    undivided: ["Ambidextrous", "Ancient Warrior", "Cold Hearted", "Combat Sense", "Cursed Heirloom",
        "Disarm", "Double Team", "Enemy", "Ferric Summons", "Legion Weapon Training",
        "Lesser Minion of Chaos", "Orthoproxy", "Peer", "Quick Draw", "Raptor", "Takedown",
        "Technical Knock", "Weapon-Tech", "Weapon Training"],
    khorne: ["Berserk Charge", "Flesh Render", "Frenzy", "Pity the Weak", "Street Fighting",
        "Unarmed Warrior"],
    nurgle: ["Die Hard", "Disturbing Voice", "Iron Jaw", "Jaded", "Resistance", "Sound Constitution"],
    slaanesh: ["Air of Authority", "Catfall", "Excessive Wealth", "Leap Up", "Lightning Reflexes",
        "Mimic", "Radiant Presence", "Rapid Reload", "Sure Strike", "Unremarkable"],
    tzeentch: ["Blind Fighting", "Combat Formation", "Deadeye Shot", "Heightened Senses",
        "Light Sleeper", "Meditation", "Polyglot", "Total Recall", "Warp Sense"]
};

/** Таблица 2-11: таланты второго уровня (стр. 81). */
export const TIER_TWO = {
    undivided: ["Armour-Monger", "Betrayer", "Child of the Warp", "Counter Attack", "Deflect Shot",
        "Exotic Weapon Training", "Hip Shooting", "Hotshot Pilot", "Independent Targeting",
        "Luminen Shock", "Maglev Transcendence", "Marksman", "Mechadendrite Use", "Minion of Chaos",
        "Sacrifice", "Sharpshooter", "Two-Weapon Wielder"],
    khorne: ["Battle Rage", "Combat Master", "Furious Assault", "Hatred", "Killing Strike",
        "Storm of Iron", "Swift Attack", "Unarmed Master", "Whirlwind of Death"],
    nurgle: ["Baleful Dirge", "Bulging Biceps", "Corpus Conversion", "Hardy", "Nerves of Steel",
        "Prosanguine", "Unshakeable Will"],
    slaanesh: ["Crippling Strike", "Hard Target", "Inspire Wrath", "Iron Discipline", "Precise Blow",
        "Rapid Reaction"],
    tzeentch: ["Crack Shot", "Foresight", "Paranoia", "Strong Minded", "Warp Conduit",
        "Wisdom of the Ancients"]
};

/** Таблица 2-12: таланты третьего уровня (стр. 82). */
export const TIER_THREE = {
    undivided: ["Arms Master", "Blade Dancer", "Bolter Drill", "Greater Minion of Chaos", "Gunslinger",
        "Luminen Blast", "Master Enginseer", "Mastery", "Psy Rating", "Sidearm", "Step Aside",
        "Target Selection", "Unholy Devotion"],
    khorne: ["Blademaster", "Blood God's Contempt", "Crushing Blow", "Hammer Blow", "Lightning Attack",
        "Thunder Charge"],
    nurgle: ["Fearless", "Master Chirurgeon", "Mighty Shot", "Never Die", "True Grit", "War Cry"],
    slaanesh: ["Assassin Strike", "Demagogue", "Into the Jaws of Hell", "Preternatural Speed", "Sprint"],
    tzeentch: ["Bastion of Iron Will", "Blasphemous Incantation", "Eye of Vengeance",
        "Favoured by the Warp", "Infused Knowledge", "Warp Lock"]
};

/** Уровень таланта задаёт цену вместе с богом (стр. 79). */
export const TALENT_TABLES = [TIER_ONE, TIER_TWO, TIER_THREE];

/**
 * «Psychic Power» книга помечает не богом, а словом Special: покровителя ей даёт
 * сама сила, которую за неё берут (стр. 80). В таблицах уровней её поэтому нет.
 */
export const SPECIAL_TALENTS = ["Psychic Power"];

const byName = new Map();
TALENT_TABLES.forEach((table, index) => {
    for (const [god, names] of Object.entries(table))
        for (const name of names) byName.set(normalise(name), {patron: god, tier: index + 1});
});

/**
 * Имя в таблицах и имя в паке расходятся вёрсткой, а не сутью: апострофы бывают
 * машинописные и типографские, а групповые таланты записаны с уточнением в скобках
 * («Hatred (Servants of Chaos)»). Сравниваем по основе имени.
 */
function normalise(name) {
    return String(name ?? "")
        .replace(/[‘’ʼ]/g, "'")
        .replace(/\s*\(.*$/, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

/**
 * Бог таланта и его уровень по книге.
 *
 * @param {string} name  имя таланта, хоть с уточнением группы
 * @returns {{patron: string, tier: number}|null} null — таланта нет в книге
 */
export function talentPatron(name) {
    return byName.get(normalise(name)) ?? null;
}

/** Сколько талантов книга разметила — для проверки полноты пака. */
export const TALENT_COUNT = byName.size;

/**
 * Бог таланта или психосилы так, как его видит лист.
 *
 * В карточке покровитель по умолчанию записан Неделимым, и отличить «книга так
 * и говорит» от «никто не размечал» по ней нельзя. Поэтому размеченная карточка
 * верит себе, а неразмеченная спрашивает книгу — и талант из старого пака всё
 * равно считается по своей цене.
 *
 * @param {{name?: string, system?: {patron?: string}}} item
 * @returns {string} khorne | nurgle | slaanesh | tzeentch | undivided
 */
export function patronOf(item) {
    const own = item?.system?.patron;
    if (own && own !== "undivided") return own;
    return talentPatron(item?.name)?.patron ?? "undivided";
}
