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
    },
    {
        // Книга пишет, что трейты и таланты от органов уже перечислены среди стартовых
        // (стр. 50). Но шесть из них не сводятся ни к таланту, ни к трейту: они просто
        // работают. Без этой карточки игрок теряет их вместе с текстом.
        name: "Chaos Space Marine Implants",
        type: "trait",
        img: "icons/svg/aura.svg",
        system: {
            description: "<p>The organs and modifications of a Legionnaire. Those that grant Traits and Talents are listed among his starting abilities; these work on their own:</p>"
                + "<p><b>Larraman's Organ:</b> he has only a 5 percent chance of dying each round from Blood Loss, rather than the normal 10 percent.</p>"
                + "<p><b>Catalepsean Node:</b> he suffers no penalties to Perception-based Tests when awake for long periods of time.</p>"
                + "<p><b>Omophagea:</b> by devouring a portion of an enemy he gains access to certain information from the foe's memories, at the GM's discretion.</p>"
                + "<p><b>Sus-an Membrane:</b> he may enter suspended animation by meditating for 1d5 Rounds, and does so automatically when knocked unconscious by Critical Damage. His wounds neither worsen nor heal; reviving him takes chemical therapy, auto-suggestion and a Hard (-20) Medicae Test.</p>"
                + "<p><b>Betcher's Gland:</b> he may spit acid as a ranged weapon (Range 3m; Damage 1d5; Pen 4; Toxic). On three or more Degrees of Success he also blinds the opponent for 1d5 Rounds.</p>"
                + "<p><b>Black Carapace:</b> though a Space Marine in power armour has the Size (Hulking) Trait, his enemies gain no bonus to hit him.</p>",
            source: "Black Crusade, p. 50",
            cost: 0,
            starter: true
        }
    }
];
