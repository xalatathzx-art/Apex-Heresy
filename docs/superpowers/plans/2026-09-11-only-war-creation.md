# Only War Character Creation Plan

**Goal:** The character wizard creates a playable Only War Guardsman or Support Specialist end to end,
by the book: regiment (pre-made or built from components on a 12-point budget), characteristics,
speciality, wounds, fate and starting experience, and the Comrade.

**Architecture:** The DH2 wizard engine is reused. Book differences live in the ruleset definition
(`script/creation/ruleset-data.mjs`) and in pure data modules, never as `if (ruleset === "ow")`
scattered through the window. Book content is authored in `packs-src/origins/` and built into the
`origins` pack. Items granted by name resolve against the book's own pack first
(`dark-heresy.only-war`), then the shared one.

**Source:** `Only War.pdf` in the system root, read with pdf-mcp only. PDF page numbers below are
the PDF's; the printed page is one lower.

## Global constraints

- Same as the DH2 plan: English data, strings, tests and commits; Russian comments in
  `script/creation/*.mjs`; `node --test "tests/*.test.mjs"` green after every task; packs are
  written only with Foundry closed; commit after every task; every book entry carries
  `system.source` ("Only War, p. N") and the book's wording.
- DH2 behaviour must not change. Every rule difference is a ruleset field with the DH2 value as
  default, pinned by a test.

## What the book says (research, done)

| Rule | Only War | DH2 today | Where |
|---|---|---|---|
| Stage order | Regiment → Characteristics → Speciality → Wounds/Fate/XP → Life → Comrade | Home world → Background → Role → Characteristics → XP → Equipment → Divination | pp. 41, 74 |
| Characteristics | 2d10+20 each, re-roll any one result once (must keep it) | 2d10+20, ± by generation rule | p. 75 |
| Point buy | 20 in each, 100 points, at most +20 on one characteristic | 25, different pool | p. 76 |
| Characteristic modifiers | flat, applied after generation (regiment and speciality) | generation rule | pp. 41, 77 |
| Characteristic ladder | 4 steps: Simple, Intermediate, Trained, Expert (100/250/500/750 …) | 5 steps | p. 103 |
| Skill and talent prices | same tables as DH2 | — | pp. 103-104 |
| Starting XP | 600 Guardsman, 300 Support Specialist | 1000 | p. 101 |
| Wounds | speciality base + 1d5, plus regiment modifier | home world formula | pp. 77, 101 |
| Fate | 1d10: 1-7 → 1, 8-9 → 2, 10 → 3 | home world | p. 101 |
| Duplicate aptitude | take a characteristic aptitude you lack | same | p. 100 |
| Duplicate skill | extra advance: starts Trained | best of the two | p. 41 |
| Duplicate talent | +100 xp to spend at creation | not granted twice | p. 41 |
| Regiment "or" choices | each character picks for himself | — | p. 41 |
| Support Specialists | also gain the regiment's home world | — | p. 58 |
| Regiment budget | 12 points: one home world, one commander, exactly one regiment type, at most three doctrines in total | — | pp. 59-65 |
| Standard kit | universal kit + doctrine kit + 30 kit points (+2 per unused regiment point) from Table 2-6 | — | pp. 68-69 |
| Speciality | characteristic bonus, aptitudes, skills/talents with "or", traits (Ogryn), equipment, wounds, special ability, two Comrade advances (Commissar: his own) | — | pp. 77-100 |
| Sanctioned Psyker | Psyker trait, psy rating 2, 1d5 Corruption, up to 400 xp of powers free, psy rating advance 200 × new PR | — | pp. 95-96 |
| Psychic powers | bought with XP at their Value, with prerequisites; trees not found yet | trees | p. 230 |
| Comrade | name from Tables 3-19/3-20, demeanour from Table 3-21; none for some specialists | — | p. 111 |

## Design decisions

1. **Regiment as one origin.** Pre-made regiments (8, pp. 43-58) ship as origin items with stage
   `regiment`. A regiment built with the rules is composed into the same shape and saved as a
   world Item, so the whole squad picks the same regiment. Per-character "or" choices stay as
   choices on that item and are answered by each character.
2. **Components are origins too.** Home worlds, commanders, regiment types, training doctrines and
   equipment doctrines are origin items with their point `cost`, used only by the builder.
3. **Rule differences are ruleset fields**: characteristic ladder, point buy, re-roll, starting XP,
   fate table, wounds source, duplicate handling, pack lookup order, step list.
4. **Speciality carries its own starting XP** (600 or 300) so the pool is data, not a branch.
5. **Speciality advances** (Comrade advances, Commissar advances) are bought in the shop and land as
   special abilities carrying their cost, so the sheet counts them.
6. **Per-squad kit** (vehicles) and Logistics rating are shown as text; the sheet has no squad.

## Tasks

### Task 1: Ruleset rules for Only War
Characteristic ladder per ruleset (pure tables + sheet engine reading the actor's profile),
point buy and re-roll per ruleset, starting XP default, fate table, duplicate rules, pack lookup
order, `characteristicModifiers: "flat"`, step list in book order. Parity tests DH2 unchanged,
OW per book.

### Task 2: Regiment components data (pp. 59-70)
`packs-src/origins/04-ow-regiment-components.json`: 8 home worlds, 9 commanders, 8 regiment types,
7 training doctrines, 7 equipment doctrines, each with cost, modifiers, skills, talents, aptitudes,
wounds, special abilities (book text) and kit. Table 2-6 kit items as a pure data module.

### Task 3: Pre-made regiments data (pp. 43-58)
`packs-src/origins/05-ow-regiments.json`: 8 regiments with their fixed modifiers, choices, special
rules, wounds, standard kit and favoured weapons, plus the components they were built from.

### Task 4: Specialities data (pp. 77-100)
`packs-src/origins/06-ow-specialities.json`: 12 specialities with bonus, aptitudes, skills, talents,
traits, equipment, wounds, starting XP, special ability, advances, Comrade flag.

### Task 5: Regiment builder rules (pure)
Budget, one of each required component, at most three doctrines, composition into one origin,
kit points, validation. Tests against the eight pre-made regiments: each composes from its listed
components at its listed cost.

### Task 6: Wizard regiment step
Pick a pre-made or saved regiment, or build one (component selects, budget counter, home world
characteristic picks, kit points) and save it as a world Item.

### Task 7: Characteristics, speciality, wounds and fate
Roll with one re-roll, OW point buy, flat modifiers from regiment and speciality, wounds from the
speciality plus regiment, fate by table, duplicate rules between regiment and speciality.

### Task 8: Experience shop for Only War
Pool from the speciality plus duplicate-talent credit, 4-step characteristic ladder, the Only War
talent and power catalogues, psy rating, the Sanctioned Psyker's free 400 xp of powers, speciality
advances.

### Task 9: Life and Comrade
Demeanour, and the Comrade's name and demeanour rolled from the book tables and kept on the sheet.

### Task 10: Sheet and packs
Ruleset-aware labels on the sheet (Regiment, Speciality), Comrade on the sheet, pack rebuild with
Foundry closed, live run of a Guardsman, a Support Specialist, an Ogryn and a Sanctioned Psyker.

## Journal
