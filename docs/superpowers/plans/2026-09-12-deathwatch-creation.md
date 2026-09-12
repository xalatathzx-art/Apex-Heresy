# Deathwatch Character Creation Plan

**Goal:** The character wizard creates a playable Deathwatch Space Marine end to end, by the book:
characteristics, home Chapter, Speciality, wounds, Fate and movement, the 1,000 starting experience
spent from the right advance lists, starting equipment, and the life of the character — his past,
his armour's history and his demeanours.

**Architecture:** The wizard engine is reused. What makes Deathwatch different is the shape of its
experience: there is no ladder priced by aptitude or patron. Every advance is a line in a list with
its own price, and a character may buy from four lists at once — General Space Marine, his Chapter,
his Speciality, and (not at creation) the Deathwatch. So the ruleset gains an advance-list mode,
and the lists are data in `packs-src/origins/`.

**Source:** `Deathwatch.pdf` in the system root, read with pdf-mcp only. PDF page numbers below are
the PDF's; the printed page is one lower.

## Global constraints

- Same as the other book plans: English data, strings, tests and commits; Russian comments in
  `script/creation/*.mjs`; `node --test "tests/*.test.mjs"` green after every task; packs written
  only with Foundry closed; commit after every task; every entry carries `system.source`
  ("Deathwatch, p. N").
- Dark Heresy 2, Only War and Black Crusade must keep working exactly as they do now.

## What the book says (research, done)

| Rule | Deathwatch | Where |
|---|---|---|
| Stage order | Characteristics → Chapter → Speciality → Wounds/Fate/Movement/XP → Equipment → Life | p. 24 |
| Characteristics | 2d10 + 30 for all nine, one re-roll of any one result, must keep it | p. 26 |
| Point buy | 30 in each, 100 points, at most +20 on one | p. 27 |
| Chapter | six: Black Templars, Blood Angels, Dark Angels, Space Wolves, Storm Wardens, Ultramarines; gives characteristic modifiers, a Solo Mode ability and a Chapter Demeanour | pp. 24, 39-56 |
| Speciality | six, some closed to a Chapter: Apothecary not Space Wolves; Devastator and Librarian not Black Templars | Table 1-1, p. 27 |
| Wounds | 1d5 + 18 | p. 28 |
| Fate | 1d10: 1-7 → 3, 8-9 → 4, 10 → 5 | Table 1-2, p. 28 |
| Movement | by Agility bonus, and power armour adds 1 to that bonus for movement | p. 28 |
| Background experience | 12,000 xp, already spent — it is what he is, not what he buys | p. 28 |
| Starting experience | 1,000 xp, from Chapter advances, Rank 1 General Space Marine and Rank 1 of his Speciality; never from the Deathwatch list | p. 28 |
| Rank | Rank 1 is 13,000-16,999 total xp | Table 2-2, p. 59 |
| Characteristic advances | four steps, priced per Speciality (Tactical Willpower 200/500/1,000/1,500), cumulative | p. 58 |
| Skills and talents | lines in the advance lists, each with its own price; no aptitudes | pp. 58-59 |
| Every Space Marine | a fixed list of starting skills, talents and the two Unnatural traits | p. 37 |
| Deathwatch training | Common Lore (Deathwatch), Forbidden Lore (Xenos), Deathwatch Training talent | p. 37 |
| Unnatural | (x2) — it doubles the bonus, it does not add a number | pp. 37, 136 |
| Size | Space Marine in power armour is Hulking, but the Black Carapace denies attackers the bonus | p. 38 |
| Starting gear | power armour, bolt pistol, 3 frag, 3 krak, combat knife, repair cement, one Chapter Trapping, plus the Speciality's issue | p. 29 |
| Past | 1d5 on the table for his Chapter | pp. 30-32 |
| Armour history | 1d10 on Table 5-12 | p. 163 |
| Demeanours | one from his Chapter, one personal | pp. 33-35 |

## What the system already has

- `dark-heresy.deathwatch` pack built from `packs-src/deathwatch/`: weapons, armour, wargear,
  talents (158), traits (49), psychic powers (52), and — already — Space Marine abilities (26),
  Speciality abilities (19) and Solo/Squad Mode abilities (36).
- `packs-src/tables/power-armour-history.json` for the armour's quirks.
- The wizard's shop already knows how to offer named advances with their own price: Only War
  speciality advances work that way.

## The two things that are genuinely new

1. **Unnatural as a multiplier.** Every Space Marine has Unnatural Strength (x2) and Unnatural
   Toughness (x2): the bonus is doubled, and it must stay doubled when the characteristic grows.
   The system's `unnatural` field adds a number, which is right for Dark Heresy and Black Crusade
   and wrong here. A multiplier field is added beside it, and the bonus becomes
   `floor(total/10) × multiplier + unnatural`.
2. **Advance lists instead of a price ladder.** A `dw` character buys from lists, so the shop needs
   a mode where offers come from data rather than from a table keyed by aptitude.

## Tasks

### Task 1: Ruleset rules and the Unnatural multiplier

**Files:** `script/creation/ruleset-data.mjs`, `template.json`, `script/dark-heresy.js`,
`script/creation/origin-apply.mjs`, `tests/dw-ruleset.test.mjs`

Fill the `dw` entry: step order, 2d10+30, one re-roll, point buy, wounds `1d5+18`, the Fate table,
1,000 starting experience with 12,000 of background. Add `unnaturalMultiplier` to the characteristic
schema, make the bonus read it, and have a granted "(x2)" trait set it.

### Task 2: Every Space Marine (p. 37)

**Files:** `packs-src/origins/10-dw-space-marine.json`, `tests/dw-space-marine.test.mjs`

The common origin every Deathwatch character carries: the starting skills, talents and traits of
p. 37, the Deathwatch hypno-conditioning and training, Size (Hulking), the spaceMarine flag, and
the standard issue of p. 29. First-edition skill names are mapped onto this system's keys, with
the mapping written down where it can be read.

### Task 3: The six Chapters (pp. 39-56)

**Files:** `packs-src/origins/11-dw-chapters.json`, `tests/dw-chapters.test.mjs`

Characteristic modifiers, Solo Mode ability, Chapter Demeanour, the Chapter's own advance list, its
past-events table, and which Specialities it closes.

### Task 4: The six Specialities (pp. 69-92)

**Files:** `packs-src/origins/12-dw-specialities.json`, `tests/dw-specialities.test.mjs`

Starting skills and talents, standard issue, the special ability to choose, the characteristic
advance prices, and the Rank 1 advance list.

### Task 5: General Space Marine advances, Rank 1 (pp. 61-64)

**Files:** `packs-src/origins/13-dw-general-advances.json`, `tests/dw-advances.test.mjs`

The list every Space Marine may buy from at creation, with prices.

### Task 6: The wizard's Deathwatch steps

**Files:** `script/creation/wizard.mjs`, `template/apps/character-wizard.hbs`, `lang/en.json`

Characteristics first, then Chapter, then Speciality filtered by that Chapter; wounds, Fate and
movement rolled where the book says; the life step for past, armour history and demeanours.

### Task 7: The advance-list shop

**Files:** `script/creation/advance-list.mjs`, `script/creation/wizard.mjs`, `tests/dw-shop.test.mjs`

Offers gathered from the four lists, priced as printed, with prerequisites checked and the
Deathwatch list withheld at creation.

### Task 8: Live run

A Space Wolf Assault Marine and an Ultramarine Librarian built end to end in Foundry, plus a
regression pass over the three books that already work.

## Journal

- 2026-09-12: Research done from the PDF (pp. 23-30, 37-38, 58-59). Two findings shape the plan:
  Deathwatch prices every advance individually rather than by a ladder, and its Unnatural trait is
  a multiplier where the other books use an addition.
- 2026-09-12: Tasks 1-5 and 7 done. Task 9 added and done: the book's own rules profile and the
  book's own character sheet.
  - `Dh.rulesets.dw` no longer clones Dark Heresy. Read against the book: Focus Power is +5 per
    rating point with Fettered halving (pp. 185-186), 91-00 always fails, a double on a Push
    costs a level of Fatigue, and Unnatural Willpower adds its multiplier to the Psy Rating and
    to the degrees on an opposed psychic test (p. 186). The phenomena table is named on the chat
    card so the Deathwatch table is rolled, not the Dark Heresy one beside it in the compendium.
    Corruption is a Purity Threshold of 100 with nothing before it (p. 282); Insanity follows
    Table 9-8 with the Primarch's Curse (p. 278); Fatigue is a flat -10 with no death at double
    the threshold (p. 251); Larraman's Organ means a Battle-Brother never suffers Blood Loss
    (p. 36). New pure module: `script/data/deathwatch-rules.mjs`.
  - The sheet now asks what the book's sheet asks (p. 397): Chapter, Speciality, Rank (counted,
    not typed), Past Event, Chapter Demeanour, Personal Demeanour, Power Armour History. The
    book's second page became a tab of its own: Renown with its rank off Table 5-2, the Kill-team,
    the Purity Threshold, Cohesion with the pool Table 7-8 would give, the Oath, and Solo and
    Squad Mode abilities split by `system.mode` with Required Rank and Cohesion Cost.
  - Fixed along the way: `_experienceStepContext` had an `await` in a synchronous method, which
    made the whole system fail to load in Foundry — no sheet of any book would open. The advance
    lists are now read in `_experienceContextLoaded` and cached. `tests/module-syntax.test.mjs`
    parses every script so this cannot pass unseen again: the vm helper strips import lines, so
    a broken imported module never reached the suite.
  - Still to do: rebuild the `deathwatch` pack with Foundry closed (the mode fields are in
    `packs-src` but not yet in the compendium), Task 6 (the wizard's life step) and Task 8
    (the live build of a Space Wolf Assault Marine and an Ultramarine Librarian).
