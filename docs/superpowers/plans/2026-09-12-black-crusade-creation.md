# Black Crusade Character Creation Plan

**Goal:** The character wizard creates a playable Black Crusade Heretic end to end, by the book:
race, characteristics, archetype, passions (Pride, Disgrace, Motivation), experience spent against
the patron-priced tables, starting equipment by Infamy, and the chosen path of a Dark God.

**Architecture:** The DH2 wizard engine is reused. Book differences live in the ruleset definition
(`script/creation/ruleset-data.mjs`) and in pure data modules, never as `if (ruleset === "bc")`
scattered through the window. Book content is authored in `packs-src/origins/` and built into the
`origins` pack. Items granted by name resolve against `dark-heresy.black-crusade` first.

**Source:** `pdfcoffee.com_black-crusade-core-rulebook-pdf-free.pdf` in the system root, read with
pdf-mcp only. PDF page numbers below are the PDF's; the printed page is one lower.

## Global constraints

- Same as the DH2 and Only War plans: English data, strings, tests and commits; Russian comments in
  `script/creation/*.mjs`; `node --test "tests/*.test.mjs"` green after every task; packs are
  written only with Foundry closed; commit after every task; every book entry carries
  `system.source` ("Black Crusade, p. N") and the book's wording.
- DH2 and Only War behaviour must not change. Every rule difference is a ruleset field with the DH2
  value as default, pinned by a test.
- The heretic sheet already implements the Black Crusade economy (`Dh.bcCharacteristicCosts`,
  `Dh.bcSkillCosts`, `Dh.bcTalentCosts`, `Dh.bcCharacteristicPatrons`, `Dh.bcSkillPatrons`,
  `Dh.bcInfamyAdvanceCost`, `_computeAlignment`). The wizard consumes those tables; it does not
  grow a second copy of them.

## What the book says (research, done)

| Rule | Black Crusade | DH2 today | Where |
|---|---|---|---|
| Stage order | Race → Characteristics → Archetype → Passions → Experience → Equipment & Corruption → Dark God | Home world → Background → Role → Characteristics → XP → Equipment → Divination | p. 48 |
| Characteristics | 2d10 + 25 (human) or + 30 (Chaos Space Marine), one re-roll of any one result, must keep it | 2d10+20 with generation rules | p. 53 |
| Infamy | 1d5 + 19, rolled even under point buy; replaces Influence on the sheet | Influence | p. 53 |
| Point buy | 25 (human) or 30 (CSM) in each, 100 points, at most +20 on one | 25, different pool | p. 53 |
| Starting XP | 1,000 human, 500 Chaos Space Marine | 1,000 | p. 75 |
| Aptitudes | none — price comes from the patron god | aptitude matches | p. 76 |
| Characteristic ladder | Simple/Intermediate/Trained/Expert; True 100/250/500/750, Allied 250/500/750/1000, Opposed 500/750/1000/2500, cumulative | 5 steps by aptitude | Table 2-6, p. 78 |
| Infamy advance | flat 500 xp per +5, any number of times, only while Infamy < 40 | — | p. 78 |
| Skill ladder | Known/Trained/Experienced/Veteran (+0/+10/+20/+30); True 100/200/400/600, Allied 200/350/500/750, Opposed 250/500/750/1000 | +10 steps by aptitude | Table 2-7, p. 78 |
| Talent prices | Tier 1/2/3; True 200/300/400, Allied 250/500/750, Opposed 500/750/1000 | by aptitude | Table 2-9, p. 79 |
| Patron relations | Khorne↔Nurgle allied, Slaanesh↔Tzeentch allied, the pairs oppose each other, Unaligned is allied to all | — | Table 2-4, p. 76 |
| Alignment | every bought advance scores one point for its god; five more than any other god = Aligned; archetype and race grants do not count | — | pp. 76, 79 |
| Checking alignment | at each 10 Corruption threshold; during creation only after all starting xp is spent | — | p. 76 |
| Khorne and psykers | while Aligned to Khorne a character may not use psychic powers and does not count as having the Psyker trait | — | p. 79 |
| Aligned powers | a power affiliated with a god may only be bought while Devoted to that god | — | p. 79 |
| Marks of Chaos | 20 advances on one path, with at least five more than any other | — | pp. 79, 83 |
| Starting equipment | items equal to the Infamy bonus, each with a total Acquisition modifier no worse than −10, no test | Influence-based | p. 83 |
| Starting Corruption | 0, plus whatever the Disgrace or Motivation adds | home world | p. 84 |
| Choosing a path | free choice of Khorne, Nurgle, Slaanesh, Tzeentch or unaligned; no dice, no cost | divination roll | p. 84 |

The "7,000 starting experience" on p. 48 is a printing slip: p. 75 gives 1,000 and 500, and the p. 76
sidebar explains that a Black Crusade human is *equivalent* to a 7,000-xp Dark Heresy character.
The plan follows p. 75.

## What the system already has

- Heretic actor type with `race`, `archetype`, `patron`, `alignment`, `pride`, `vice`, `aspiration`
  and Infamy mapped onto the `influence` characteristic.
- `dark-heresy.black-crusade` pack: 598 items — 132 talents with tiers, 54 psychic powers with
  costs, 50 traits, 69 mutations, weapons, armour, gear.
- The sheet's whole Black Crusade economy, listed under Global constraints.

## Gaps this plan closes

1. All 132 pack talents carry `patron: "undivided"`, so talent prices and the alignment tally are
   wrong for every aligned talent (Task 2).
2. No origin data for races, archetypes or passions (Tasks 3-5).
3. The wizard has a `bc` step skeleton but no ruleset rules, no shop and no panels (Tasks 1, 6-10).

## Design decisions

1. **Race and archetype are origin items**, stages `race` and `archetype`, exactly like home worlds
   and roles. The archetype names the race it requires; the wizard filters the list.
2. **Passions are origin items too** (stages `pride`, `disgrace`, `motivation`), each carrying its
   characteristic modifiers, Corruption, Wounds and situational notes as a `rules` block. A d10 roll
   is offered, as the book allows, but choosing is the default.
3. **Prices come from the sheet's tables**, read through a thin pure module so the wizard and the
   sheet can never disagree — the same lesson as `powerPrice()`.
4. **Starting grants do not score alignment**: everything the race or archetype hands out is written
   with `starter: true`, which the sheet already honours.
5. **Alignment is checked once**, after the experience step, as the book says.

## Tasks

### Task 1: Ruleset rules for Black Crusade — DONE

**Files:** `script/creation/ruleset-data.mjs`, `script/creation/advancement-data.mjs`,
`tests/bc-ruleset.test.mjs`

Fill the `bc` entry: `ready: true`, `characteristicModifiers: "flat"`, `characteristicRerolls: 1`,
starting experience by race, point buy by race, `infamy: {formula: "1d5+19"}`, `contentPacks`
first-first, step list `race → characteristics → archetype → passions → experience → equipment →
darkGods`. Add the Black Crusade ladders to `advancement-data.mjs` keyed by patron relation.
Tests pin the tables against the book and prove DH2/OW are untouched.

### Task 2: Talent patrons in the pack (Tables 2-10, 2-11, 2-12, pp. 80-82) — DONE

**Files:** `tools/lib/dark-heresy-fixes.mjs`, `tests/bc-talent-patrons.test.mjs`

Read the three talent tables from the PDF, map every talent name to its Devotion, and patch the
pack idempotently. A test asserts a sample from each god and that no talent is left `undivided`
when the book names a god.

### Task 3: Races data (pp. 49-52) — DONE

**Files:** `packs-src/origins/07-bc-races.json`, `tests/bc-races.test.mjs`

Human and Chaos Space Marine as origin items: characteristic base, starting experience, starting
skills/talents/traits/equipment, the Quick and the Dead trait for humans.

### Task 4: Archetypes data (pp. 55-70) — DONE

**Files:** `packs-src/origins/08-bc-archetypes.json`, `tests/bc-archetypes.test.mjs`

Eight archetypes with their race requirement, characteristic bonus, starting skills and talents
including the "or" choices, gear, wounds formula, special ability text, and the psychic block for
the Sorcerer (Psy Rating 2, 500 xp of powers) and the Psyker (Psy Rating 3, 500 xp of powers,
Psyker trait).

### Task 5: Passions data (Tables 2-1, 2-2, 2-3, pp. 72-74) — DONE

**Files:** `packs-src/origins/09-bc-passions.json`, `tests/bc-passions.test.mjs`

Ten Prides, ten Disgraces, ten Motivations with their modifiers. The OCR text interleaves the rows,
so each row is verified against a rendered page before it is written.

### Task 6: Wizard race and characteristics steps — DONE

**Files:** `script/creation/wizard.mjs`, `template/apps/character-wizard.hbs`, `lang/en.json`

Race step, then characteristics with the race's base, one re-roll, and Infamy rolled on 1d5+19 even
under point buy.

### Task 7: Wizard archetype and passions steps — DONE

**Files:** `script/creation/wizard.mjs`, `template/apps/character-wizard.hbs`, `lang/en.json`

Archetype list filtered by race, its choices resolved like any origin; a passions panel with three
pickers and a d10 roll each.

### Task 8: Experience shop for Black Crusade — DONE

**Files:** `script/creation/shop-data.mjs`, `script/creation/psychic-data.mjs`,
`script/creation/wizard.mjs`, `tests/bc-shop.test.mjs`

Prices by patron relation; skill ladder of four ranks; talents by tier; Infamy at 500 a step up to
40; powers priced from the pack, aligned powers locked to their god, all powers locked while
Aligned to Khorne.

### Task 9: Equipment step by Infamy (p. 83) — DONE

**Files:** `script/creation/equipment-data.mjs`, `script/creation/wizard.mjs`,
`tests/bc-equipment.test.mjs`

Offer the armoury filtered to a total Acquisition modifier no worse than −10, with as many picks as
the Infamy bonus, using the existing `Dh.acquisitionAvailability` table.

### Task 10: Dark God step, alignment check and live run — IN PROGRESS

**Files:** `script/creation/wizard.mjs`, `template/apps/character-wizard.hbs`, `lang/en.json`,
`tests/bc-alignment.test.mjs`

Path picker writing `system.patron`; the alignment check runs once the experience step is left;
then a live run in Foundry for a human Apostate, a Chaos Space Marine Champion and a Sorcerer,
plus a DH2 and an Only War regression pass.

## Journal

- 2026-09-12: Research done straight from the PDF (pp. 47-84). Found that the heretic sheet already
  carries the whole Black Crusade economy, and that every talent in the pack is `undivided` — the
  single biggest data gap, promoted to Task 2.
- 2026-09-12: Tasks 1-9 done. The patron tables moved into `script/creation/patron-data.mjs` so the
  sheet and the wizard read one copy; `bc-talents.mjs` carries Tables 2-10 to 2-12 and answers for
  any card the pack left unmarked. Data written: two races, eight archetypes, thirty passions.
- 2026-09-12: Live run in Foundry, with the origin data loaded as world items because the packs are
  locked while Foundry runs. A human Apostate walked all seven steps: 2d10+25 with Infamy on
  1d5+19, archetypes filtered to his race, the three passion tables rolled on one panel, the shop
  priced by patron (Fellowship 250 allied, Infamy 500 flat, Charm 500 opposed), three equipment
  picks off an Infamy bonus of 3, and the five paths of Stage 7. A Chaos Space Marine Sorcerer
  came out at 2d10+30, psy rating 2, Bound, 1 Corruption, Psy Rating twice, and 500 xp of free
  powers with the Nurgle ones locked behind devotion.
- 2026-09-12: Two bugs the live run caught and fixed — wounds were read from a hardcoded pair of
  stages (so the archetype never rolled them), and a talent granted twice collapsed into one card
  (so the Sorcerer had one Psy Rating instead of two).
