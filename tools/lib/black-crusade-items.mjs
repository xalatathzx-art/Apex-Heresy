/**
 * Записи книги, которых в собранном паке black-crusade не оказалось.
 *
 * Пак пришёл готовым и исходников в packs-src не имеет, поэтому недостающее
 * дописывается сюда, а не пересборкой: пересборка стёрла бы остальные 598
 * предметов. Каждая запись сверена со страницей.
 *
 * Модуль чистый: patch-black-crusade.mjs только кладёт их в LevelDB.
 */

export const MISSING_ITEMS = [
    {
        name: "The Quick and the Dead",
        type: "trait",
        img: "icons/svg/aura.svg",
        system: {
            description: "<p>To survive in the Vortex, particularly as a human, one must be quick, both in wits and action. Sometimes fast reflexes can compensate for ceramite armour. All Heretics with this Trait add a +2 bonus to Initiative Rolls.</p>",
            source: "Black Crusade, p. 51",
            cost: 0,
            starter: true
        }
    }
];
