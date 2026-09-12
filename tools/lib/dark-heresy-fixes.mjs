/**
 * Правки данных пака dark-heresy, сверенные с книгой.
 *
 * У пака нет исходников в packs-src: он пришёл уже собранным, поэтому правится
 * точечно, а не пересборкой. Каждая правка названа и сверена со страницей.
 *
 * Модуль чистый: patch-dark-heresy.mjs только пишет результат в LevelDB.
 */
import {DISCIPLINES} from "../../script/creation/psychic-data.mjs";
import {classifyWeapon} from "../../script/data/weapon-types.mjs";
import {classifyAmmunition} from "../../script/data/ammunition-fit.mjs";

/** Обрезанные и двоящиеся пробелом имена → имена из таблиц 4-1..4-3 (стр. 120-122). */
export const NAME_FIXES = {
    talent: {
        "Blinding Fight": "Blind Fighting",
        "Clues from  the Crowds": "Clues from the Crowds",
        "Devastating Assau": "Devastating Assault",
        "Eye of Vengeanc": "Eye of Vengeance",
        "Favoured by  the Warp": "Favoured by the Warp",
        "Independent Targetin": "Independent Targeting",
        "Nowhere to Hid": "Nowhere to Hide",
        "Whirlwind of Deat": "Whirlwind of Death"
    },
    trait: {
        "Touched by  the Fates": "Touched by the Fates"
    }
};

/** Потерянные при вёрстке символы в тексте. Frenzy: «–20 penalty», стр. 127. */
export const TEXT_FIXES = [
    {type: "talent", name: "Frenzy", field: "description", from: "&ndash; 0 penalty", to: "&ndash;20 penalty"}
];

/** Цена силы из её статьи (Value), по имени — только пять дисциплин основной книги. */
const POWER_VALUES = new Map(DISCIPLINES.flatMap(d => d.powers).map(p => [p.name, p.value]));

/**
 * Применить правки к одному документу.
 * @returns {{doc: object, changed: boolean}} doc — копия, вход не меняется
 */
export function fixDocument(source) {
    const doc = structuredClone(source);
    let changed = false;

    const rename = NAME_FIXES[doc.type]?.[doc.name];
    if (rename) { doc.name = rename; changed = true; }

    for (const fix of TEXT_FIXES) {
        if (fix.type !== doc.type || fix.name !== doc.name) continue;
        const text = doc.system?.[fix.field];
        if (typeof text === "string" && text.includes(fix.from)) {
            doc.system[fix.field] = text.replace(fix.from, fix.to);
            changed = true;
        }
    }

    if (doc.type === "psychicPower" && POWER_VALUES.has(doc.name)) {
        const value = POWER_VALUES.get(doc.name);
        if (Number(doc.system?.cost) !== value) { doc.system.cost = value; changed = true; }
    }

    // Синскин (стр. 173): «grants 2 Armour points to all locations not already
    // armoured». «Ещё не защищённым» — это правило максимума, а не прибавка:
    // где доспех лучше, считается доспех. В паке стояло enabled: false с нулями
    // и вдобавок isAdditive: true, то есть неверны были все три поля разом.
    if (doc.type === "gear" && doc.name === "Synskin") {
        const granted = doc.system?.grantsArmour ?? {};
        const part = Object.fromEntries(
            ["head", "leftArm", "rightArm", "body", "leftLeg", "rightLeg"].map(location => [location, 2]));
        const wrong = !granted.enabled || granted.isAdditive
            || Object.values(granted.part ?? {}).some(value => Number(value) !== 2);
        if (wrong) {
            doc.system = {...doc.system, grantsArmour: {...granted, enabled: true, isAdditive: false, part}};
            changed = true;
        }
    }

    // Ammunition quantity. Shipped data put the magazine's capacity here: the
    // Lasgun's clip is 60 and its cell reads 60, the Bolt Pistol's clip is 8 and
    // its clip reads 8, and so on for every round in the pack. Encumbrance sums
    // quantity times weight, so one lasgun cell weighed 24 kg. Capacity already
    // lives on the weapon, so nothing is lost by carrying one magazine.
    if (doc.type === "ammunition" && (Number(doc.system?.quantity) || 0) > 1) {
        doc.system = {...doc.system, quantity: 1};
        changed = true;
    }

    // Which weapons a round fits. All 110 rounds shipped with an empty list,
    // which ammunitionFitsWeapon reads as "fits anything". A list a GM has
    // already filled in is left alone; a round the classifier cannot place keeps
    // its empty list, since a wrong group would silently refuse a real reload.
    if (doc.type === "ammunition" && !(doc.system?.weaponTypes ?? []).length) {
        const fits = classifyAmmunition(doc.name);
        if (fits) {
            doc.system = {...doc.system, weaponTypes: [fits]};
            changed = true;
        }
    }

    // Weapon group. Shipped data left this empty on 185 of 186 weapons, and the
    // one that was set called a Chainaxe a las weapon. That made ammunition
    // compatibility inert: ammunitionFitsWeapon matches a round's weaponTypes
    // against this key. A weapon the classifier cannot place keeps its empty
    // type, because a wrong group silently blocks reloading.
    if (doc.type === "weapon") {
        const classified = classifyWeapon(doc.name, doc.system?.special ?? "");
        if (classified && doc.system?.type !== classified) {
            doc.system = {...doc.system, type: classified};
            changed = true;
        }
    }

    return {doc, changed};
}
