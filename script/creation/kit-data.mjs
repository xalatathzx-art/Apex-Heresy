// ════════════════════════════════════════════════════════════════════════
//  Стандартный комплект полка Only War (стр. 68-69).
//
//  Комплект собирается из трёх слоёв: универсальный набор каждого гвардейца,
//  набор типа полка и доктрин (он заменяет основное оружие и броню, а не
//  добавляется к ним), и покупки по таблице 2-6 за очки комплекта: 30 плюс 2 за
//  каждое неистраченное очко полка.
//
//  Предметом выдаётся только то, что лежит в паке Only War под тем же именем.
//  Униформа, рюкзак, котелок и прочее, чего в паке нет, остаются текстом книги:
//  заглушка без правил на листе хуже честной строки.
//
//  Модуль чистый: ни одной глобали Foundry.
// ════════════════════════════════════════════════════════════════════════

/** Универсальный набор (стр. 68). */
export const UNIVERSAL_KIT = {
    mainWeapon: [{name: "Laspistol"}, {name: "Charge Pack (Pistol)", quantity: 2}],
    armour: [{name: "Flak Vest"}],
    items: [{name: "Knife"}, {name: "Glow-globe/Lamp Pack"}, {name: "Uplifting Primer"}],
    text: "One uniform, one set of poor weather gear, one rucksack or sling bag, one set of basic tools, "
        + "one mess kit and one water canteen, one blanket and one sleep bag, one grooming kit, one set of "
        + "cognomen tags or equivalent identification, combat sustenance rations, two weeks’ supply."
};

export const KIT_POINTS = 30;
export const KIT_POINTS_PER_UNUSED = 2;

/** Очки комплекта: база (30, у Penal Colony 15) плюс 2 за каждое неистраченное очко полка. */
export function kitPoints({unusedRegimentPoints = 0, base = KIT_POINTS} = {}) {
    return base + KIT_POINTS_PER_UNUSED * Math.max(0, unusedRegimentPoints);
}

const add = (...items) => ({type: "add", items});
const text = value => ({type: "text", text: value});
const row = (key, label, cost, effect, extra = {}) => ({key, label, cost, effect, limit: null, requires: null, ...extra});
const once = {limit: 1};
const twice = {limit: 2};
const gm = {gmDiscretion: true};

/** Таблица 2-6: Additional Standard Kit Items. Подписи — формулировки книги. */
export const ADDITIONAL_KIT = [
    row("goodCraftsmanship", "Improve a single item of standard kit wargear from Common Craftsmanship to Good Craftsmanship", 5, {type: "craftsmanship", quality: "good"}),
    row("bestCraftsmanship", "Improve a single item of standard kit wargear from Common Craftsmanship to Best Craftsmanship", 10, {type: "craftsmanship", quality: "best"}),
    row("lascarbine", "Replace laspistol (Main Weapon) with lascarbine (Main Weapon)", 5, {type: "replaceMain", from: ["Laspistol"], replace: [{name: "Las Carbine"}]}),
    row("lasgun", "Replace lascarbine (Main Weapon) with M36 lasgun (Main Weapon)", 5, {type: "replaceMain", from: ["Las Carbine"], replace: [{name: "M36 Lasgun"}]}),
    row("extraKnife", "Add an additional knife", 2, add({name: "Knife"})),
    row("laspistolSidearm", "Add a laspistol and 2 charge packs as a sidearm", 5, add({name: "Laspistol"}, {name: "Charge Pack (Pistol)", quantity: 2}), once),
    row("autopistolSidearm", "Add an autopistol and 2 clips as a sidearm", 8, add({name: "Autopistol"}), once),
    row("stubAutomaticSidearm", "Add a stub automatic and 2 clips as a sidearm", 8, add({name: "Stub Automatic"}), once),
    row("stubRevolverSidearm", "Add a stub revolver and 12 bullets as a sidearm", 3, add({name: "Stub Revolver"}), once),
    row("extraFragGrenade", "Add an additional frag grenade to standard kit", 5, add({name: "Frag Grenade"}), twice),
    row("extraSmokeGrenade", "Add an additional smoke grenade to standard kit", 5, add({name: "Smoke Grenade"}), twice),
    row("extraKrakGrenade", "Add an additional krak grenade to standard kit", 15, add({name: "Krak Grenade"}), twice),
    row("combatShotgun", "Replace a M36 lasgun (Main Weapon) or lascarbine (Main Weapon) with a combat shotgun (Main Weapon) and 4 clips", 10,
        {type: "replaceMain", from: ["M36 Lasgun", "Las Carbine"], replace: [{name: "Combat Shotgun"}]},
        {requires: {regimentType: ["lineInfantry", "lightInfantry", "siegeInfantry", "dropTroops"]}}),
    row("chrono", "Add a chrono to standard kit", 2, text("A chrono.")),
    row("clipDropHarness", "Add a clip/drop harness to standard kit", 5, add({name: "Clip/Drop Harness"})),
    row("fieldUniform", "Add an additional uniform for field use to standard kit", 2, text("An additional uniform for field use.")),
    row("dressUniform", "Add an additional uniform for dress or parade use to standard kit", 5, text("An additional uniform for dress or parade use.")),
    row("filtrationPlugs", "Add filtration plugs to standard kit", 5, add({name: "Filtration Plugs"})),
    row("munitorumManual", "Add the Munitorum Manual to standard kit", 3, add({name: "Munitorum Manual"})),
    row("photoVisor", "Add a photo-visor or set of photo-contacts to standard kit", 8, add({name: "Photo-Visors/Contacts"})),
    row("preysenseGoggles", "Add preysense goggles to standard kit", 15, add({name: "Preysense Goggles"})),
    row("puritySeals", "Add purity seals to standard kit", 8, text("Purity seals."), {requires: {homeWorld: "penitent"}}),
    row("respirator", "Add respirator or gas mask to standard kit", 8, add({name: "Respirator/Gas Mask"})),
    row("survivalSuit", "Add survival suit to standard kit", 8, add({name: "Survival Suit"})),
    row("deTox", "Add 1 dose of de-tox and an injector to standard kit", 15, add({name: "De-Tox"}, {name: "Injector"})),
    row("advancedMedikit", "Add a single advanced medikit to the squad as standard kit", 15, text("A single advanced medikit for the squad."), once),
    row("extraRations", "Add 2 weeks’ worth of additional ration packs to standard kit", 3, text("Two weeks’ worth of additional ration packs.")),
    row("slaught", "Add 1 dose of slaught to standard kit", 10, add({name: "Slaught"}), {requires: {doctrine: "combatDrugs"}}),
    row("frenzon", "Add 1 dose of frenzon to standard kit", 20, add({name: "Frenzon"}), {requires: {doctrine: "combatDrugs"}}),
    row("stimm", "Add 1 dose of stimm and an injector to standard kit", 8, add({name: "Stimm"}, {name: "Injector"})),
    row("auspex", "Add a single auspex or scanner to the squad as standard kit", 10, text("A single auspex or scanner for the squad."), once),
    row("grapnel", "Add a grapnel to standard kit", 5, add({name: "Grapnel & Line"})),
    row("magnoculars", "Add magnoculars to standard kit", 8, add({name: "Magnoculars"})),
    row("microBead", "Add a micro-bead to standard kit", 8, add({name: "Micro-bead"})),
    row("pictRecorder", "Add a pict recorder to standard kit", 8, add({name: "Pict Recorder"})),
    row("screamers", "Add screamers (one box of 6) to the squad as standard kit", 10, text("Screamers (one box of 6) for the squad.")),
    row("stummer", "Add a single stummer to standard kit", 8, add({name: "Stummer"})),
    row("targeter", "Add a targeter to standard kit", 10, add({name: "Targeter"}), {requires: {doctrine: "sharpshooters"}}),
    row("ubiquitousItem", "Add an additional item of Ubiquitous availability to standard kit", 1, {type: "availability", availability: "ubiquitous"}, gm),
    row("abundantItem", "Add an additional item of Abundant availability to standard kit", 2, {type: "availability", availability: "abundant"}, gm),
    row("plentifulItem", "Add an additional item of Plentiful availability to standard kit", 3, {type: "availability", availability: "plentiful"}, gm),
    row("commonItem", "Add an additional item of Common availability to standard kit", 5, {type: "availability", availability: "common"}, gm),
    row("averageItem", "Add an additional item of Average availability to standard kit", 8, {type: "availability", availability: "average"}, gm),
    row("scarceItem", "Add an additional item of Scarce availability to standard kit", 10, {type: "availability", availability: "scarce"}, gm),
    row("rareItem", "Add an additional item of Rare availability to standard kit", 15, {type: "availability", availability: "rare"}, gm),
    row("veryRareItem", "Add an additional item of Very Rare availability to standard kit", 20, {type: "availability", availability: "very-rare"}, gm),
    row("favouredBasicWeapon", "Add one Favoured Basic Weapon", 10, {type: "favoured", weapon: "basic"}, once),
    row("favouredHeavyWeapon", "Add one Favoured Heavy Weapon", 15, {type: "favoured", weapon: "heavy"}, once)
];
