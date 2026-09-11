# Character Creation Wizard — Specification

**Status:** accepted 2026-09-11.
**Scope:** one guided character builder covering the five supported rulebooks.

## Problem

Every supported book has its own creation procedure, and none of them is automated. The
system already ships the compendium content those procedures hand out (talents, traits,
gear, psychic powers) and already reserves the fields the procedures fill in
(`system.bio.homeWorld`, `system.bio.background`, `system.bio.role`, `system.race`,
`system.archetype`), but a player still has to read the book, do the arithmetic and drag
every item onto the sheet by hand.

The `race` item type is a half-built foundation: it carries `startingSkills`,
`startingTalents`, `startingTraits` and `startingEquipment` and has a working editor sheet
(`template/sheet/race.hbs`), but nothing ever applies it to an actor.

## Observation that drives the design

The five procedures differ in how many steps they have and in what the steps are called.
They do not differ in the shape of a step. A Dark Heresy home world, a Rogue Trader
birthright, an Only War regiment component, a Black Crusade archetype and a Deathwatch
Chapter are all the same record:

| Field | Example |
| --- | --- |
| Characteristic modifiers | `+5 Strength, +5 Toughness, −5 Fellowship`; sometimes `+3 to any two of Perception, Strength, Toughness` |
| Starting skills | a list, some entries "choose one of" |
| Starting talents | same |
| Starting traits | same, some with a rating |
| Starting equipment | same |
| Wounds | `9+1d5`, `15+1d5`, `2×TB + 1d5+1`, or `−1` to the base |
| Fate | a value plus an Emperor's Blessing threshold, or `1d10` against a range table |
| Aptitudes | one to three |
| Named bonus | free text ability |
| Restrictions | "Champions must be Chaos Space Marines"; Rogue Trader row adjacency |
| Cost | Only War regiment budget points |

So the data model is one item type, and the wizard is one application whose step list is a
function of the chosen ruleset.

## Reference implementation

`warhammer-dbc` (a separate system, present on this machine at
`D:/Foundry/DoomCrusade/Data/systems/warhammer-dbc`) solves the same problem for a single
homebrew ruleset. Design decisions worth copying, with their source:

1. **The wizard runs on an already-created actor and commits each step on "Next"**, not in
   one patch at the end (`module/apps/character-wizard.mjs`). A half-finished character is a
   valid document; the wizard can be closed and reopened.
2. **Option data lives in a compendium as typed items, not in code.** Constants are only a
   fallback, so a GM-authored entry shows up in the dropdowns immediately
   (`module/apps/origin-shared.mjs`, `module/apps/archetypes.mjs`).
3. **Player choices are rendered inline in the step, not as a stack of popup dialogs**
   (`grantChoiceBlocksHtml` / `wireGrantChoiceBlocks` / `readGrantChoicePicks`). The form is
   re-rendered often, so answers are restored from a snapshot on every render.
4. **Everything granted is tagged for rollback**: `flags.<system>.originGrant = <stage>` on
   each created item, plus the skill ranks it raised stored on the carrier item, so removing
   the carrier removes the consequences (`clearGrantedBy`).
5. **Entry point is a button in the Actors sidebar**, with a socket fallback to the GM when
   the player lacks `ACTOR_CREATE` (`module/apps/character-start.mjs`).

Not copied: their Mechanics Constructor (`module/apps/mechanics.mjs`, 3334 lines) — a
general AND/OR effect-authoring DSL. Character creation needs a flat grant list with three
kinds of choice, and that is what this spec defines.

## One character, five modes

A character says which book it belongs to in `system.ruleset`, and `Dh.rulesetFor` reads that
field before falling back to anything else.

Today it does not: the actor **type** decides, `heretic` → Black Crusade and `acolyte` →
Dark Heresy, with no third option. A Rogue Trader, Only War or Deathwatch character has no
type of its own, so it has to be an `acolyte` and is then silently played by Dark Heresy
rules — fatigue threshold, corruption track, psychic phenomena, the Righteous Fury label.
That is a live defect independent of this feature, and the wizard would multiply it, because
the wizard is the thing that creates characters for those three books.

The two actor types stay. Collapsing them into one would mean migrating every existing world,
and they are already 95% the same document: `heretic` is `acolyte` plus seven fields (`race`,
`archetype`, `patron`, `alignment`, `pride`, `vice`, `aspiration`), and `HereticSheet` already
extends `AcolyteSheet` with nothing but a different template. What changes is that the
ruleset becomes an explicit, editable property of the character rather than an accident of
which type it was created as, exactly as it already works for NPCs.

Mechanical profiles exist for `dh2` and `bc` only. `rt`, `ow` and `dw` are registered with
their own id and label but currently inherit the `dh2` mechanics, so a character can state
which book it is from before anyone has audited that book's differences. Each of those three
profiles is filled in by its own follow-up plan, not guessed at here.

## Data model

A new item type `origin`. One type for every step block of every book.

```jsonc
{
  "ruleset": "dh2",             // dh2 | rt | ow | bc | dw
  "stage": "homeWorld",         // see the stage list below
  "order": 1,                   // position of the stage inside the ruleset
  "key": "feralWorld",          // stable identifier, unique per ruleset+stage
  "cost": 0,                    // Only War regiment budget points, 0 elsewhere
  "characteristics": { "strength": 5, "toughness": 5, "fellowship": -5 },
  "characteristicChoices": [
    { "label": "…", "pick": 2, "from": ["perception","strength","toughness"], "value": 3 }
  ],
  "aptitudes": ["Toughness"],
  "wounds": { "formula": "9+1d5", "bonus": 0, "doubleToughnessBonus": false },
  "fate": { "value": 2, "blessing": 3, "formula": "" },
  "grants": {
    "skills":       [{ "key": "survival", "advance": 0 }],
    "specialities": [{ "key": "commonLore", "name": "Imperium", "advance": 0 }],
    "talents":      [{ "name": "Nerves of Steel" }],
    "traits":       [{ "name": "Unnatural Strength", "rating": 4 }],
    "equipment":    [{ "name": "Laspistol", "quantity": 1 }],
    "wounds": 0, "corruption": 0, "insanity": 0, "influence": 0
  },
  "choices": [
    { "key": "omnissiah", "type": "one", "label": "Omnissiah's Chosen",
      "options": [{ "label": "Technical Knock", "grants": { "talents": [{ "name": "Technical Knock" }] } },
                  { "label": "Weapon-Tech",     "grants": { "talents": [{ "name": "Weapon-Tech" }] } }] }
  ],
  "bonus": { "name": "The Old Ways", "description": "<p>…</p>" },
  "requires": { "stage": "race", "anyOf": ["chaosSpaceMarine"] },
  "adjacency": [],              // Rogue Trader: keys in the previous row this option connects to
  "recommended": [],            // Dark Heresy "Recommended Backgrounds"
  "description": "", "source": "Dark Heresy Second Edition, p. 32"
}
```

`skills[].advance` uses the existing actor scale from `template.json`: `-20` untrained,
`0` known, `10` / `20` trained. Characteristic keys are the ten in
`template.json` → `Actor.templates.characteristics`.

Stage vocabulary, by book:

| Ruleset | Stages, in order |
| --- | --- |
| `dh2` | `homeWorld`, `background`, `role`, `divination` |
| `rt` | `homeWorld`, `birthright`, `lure`, `trials`, `motivation`, `career` |
| `ow` | `regimentOrigin`, `regimentCommander`, `regimentType`, `doctrine`, `equipmentDoctrine`, `standardKit`, `speciality` |
| `bc` | `race`, `archetype`, `pride`, `disgrace`, `motivation` |
| `dw` | `chapter`, `speciality` |

## Choice kinds

Three, all taken from the reference implementation:

- `one` — pick exactly one option; the option carries its own `grants`.
- `many` — pick N specialities inside named skill groups (`commonLore`, `forbiddenLore`,
  `scholasticLore`, `linguistics`, `trade`, `operate`, `navigate`). `count` may be the
  literal number or the string `"intelligenceBonus"`.
- `target` — pick what a talent applies to (Hatred, Peer, Good Reputation). Stored
  structurally on the talent, not just spelled into its name.

## Application and rollback

Applying an origin to an actor:

1. Create the carrier — the `origin` item itself — on the actor.
2. Create the granted talents, traits and equipment, copying them out of the system
   compendiums by name, each tagged
   `flags.dark-heresy.originGrant = "<ruleset>:<stage>"` and
   `flags.dark-heresy.grantedBy = <carrier id>`.
3. Raise characteristics, skill advances, wounds, fate, corruption and insanity by
   `actor.update()`, and record on the carrier exactly what was raised
   (`flags.dark-heresy.applied`), so the change can be undone with no guesswork.

Removing the carrier removes every item that points at it and reverts the recorded raises.
This is what makes a step replayable — the player can go back and change a home world.

## The sheet fills itself in

A choice made in the wizard lands on the sheet **as it is made**, not when the wizard
finishes. Choosing Feral World writes "Feral World" into `system.bio.homeWorld` at that
moment; the same for the background and the role, and for whatever field a later book's
stage corresponds to.

The same applies to the book itself: picking Dark Heresy in the wizard sets
`system.ruleset`, so the rulebook selector under the portrait already reads "Dark Heresy 2nd
Edition" without anyone touching it. It is the same field, so there is nothing to
synchronise — it just has to be written when the choice is made rather than at the end.

Those fields stay **editable, but marked as filled by the wizard**. They are not read-only:
a GM renaming a home world to something local ("Sepheris Secundus" instead of "Hive World")
is ordinary play, and locking the field would mean deleting the origin item to type a word.
What the sheet shows is that the value came from a chosen origin, and which one, so an
accidental overwrite is visible rather than silent.

The mechanism is the one the grants already use. The origin item on the actor is the record
of the choice; the bio field is a convenience copy of its name. Reverting a step clears the
copy along with the grants, and a value the player has since edited by hand is left alone —
the same rule that stops the undo lowering a skill another source has raised.

## Wizard

`CharacterWizard extends HandlebarsApplicationMixin(ApplicationV2)`, one Handlebars
template, steps taken from the ruleset definition:

```
dh2  ruleset → home world → background → role → characteristics → experience → divination
rt   ruleset → origin path grid (6 rows, adjacency) → career → characteristics → profit factor
ow   ruleset → regiment (12-point budget, shared by the group) → speciality → characteristics
bc   ruleset → race → characteristics → archetype → passions → experience
dw   ruleset → chapter → speciality → characteristics → renown
```

Characteristic generation offers the three book methods: `2d10+20` per characteristic,
`3d10` keeping the best two where a `+` modifier applies and the worst two where a `−`
applies, and point buy (25 base, 60 points, cap 40).

The entry point is a **Create Character** button in the Actors sidebar that creates an
`acolyte` (or `heretic`, for Black Crusade) and opens the wizard on it. Players without
`ACTOR_CREATE` go through a socket request to the active GM.

## Delivery order

Dark Heresy 2 first. It is the only linear procedure — four origin stages, no row
adjacency, no shared group budget — so it exercises the grant engine, the choice blocks and
the rollback without any book-specific widget. Rogue Trader and Only War follow, each
adding exactly one widget (the adjacency grid; the regiment budget counter). Black Crusade
and Deathwatch reuse what exists by then.

## Out of scope

- Advancement after creation (buying with XP beyond the starting pool).
- Elite Advances (`dh2`), Alternate Ranks, Elite Archetypes.
- Generating the group-level entities: warband, dynasty, kill-team.
- Only War comrades.
