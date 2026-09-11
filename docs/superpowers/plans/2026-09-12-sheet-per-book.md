# A Character Sheet per Book

**Goal:** Each of the five books gets its own player-character sheet — its own fields, its own
labels and its own tabs — and the sheet follows the book the character names, without anyone
having to pick the right actor type first.

**Architecture:** The two actor types stay as they are (`acolyte` and `heretic`), because a
document's type cannot be changed in Foundry and existing characters must not be re-created. The
seven fields only the heretic had move into a shared template, so any character can belong to any
book. On top of that sit five sheet classes — one per book — registered for both types; the sheet
class is chosen from `system.ruleset`, and switching the book switches the sheet.

**Why not five actor types:** `Actor#type` is immutable. Five types would mean re-creating every
existing character, which breaks the tokens, scene references and journal links pointing at them.

## Global constraints

- Same as the book plans: English data, strings, tests and commits; Russian comments in
  `script/creation/*.mjs`; `node --test "tests/*.test.mjs"` green after every task; commit after
  every task.
- No existing character changes type, loses a field, or opens on a blank sheet.
- Dark Heresy 2, Only War and Black Crusade creation must keep working exactly as they do now.

## What is wrong today

1. The book is a field on the character (`system.ruleset`), but two of its consequences are tied to
   the actor *type* instead: the data model (only the heretic has `patron`, `alignment`, `race`,
   `archetype`, `pride`, `vice`, `aspiration`) and the sheet template (`acolyte.hbs` or
   `heretic.hbs`).
2. So a Black Crusade character built on an acolyte gets the wizard's warning
   ("This book builds a different kind of sheet. Ask your Gamemaster to create one of the right
   type.") and, if he ignores it, a sheet with nowhere to put his patron.
3. And an Only War character gets the Dark Heresy sheet with Influence, Fate and a Divination
   field, none of which his book has, while his regiment, his speciality and his Comrade have no
   home of their own.

## Design decisions

1. **The book decides the sheet, the type only decides storage.** `Dh.sheetFor(actor)` maps
   `system.ruleset` to a sheet class; a character with no book falls back to his type's default.
2. **One shared field set.** The seven heretic-only fields move into a shared template, so the
   same character can be re-pointed at another book without losing what he wrote.
3. **The frame is shared, the contents are not.** Portrait, name, characteristics and the tab strip
   come from partials; each book's sheet supplies its own biography fields, its own vitals row and
   its own list of tabs.
4. **Unaudited books get an honest sheet.** Rogue Trader and Deathwatch have not been checked
   against their rulebooks yet, so their sheets carry the right labels (Origin Path and Career;
   Chapter and Speciality) over the Dark Heresy tab set, and nothing is invented.

## Tasks

### Task 1: One field set for every character — DONE

**Files:** `template.json`, `script/creation/ruleset-data.mjs`, `script/creation/wizard.mjs`,
`lang/en.json`, `tests/sheet-per-book.test.mjs`

Move `race`, `archetype`, `patron`, `alignment`, `pride`, `vice`, `aspiration` into a shared
template used by both character types. Drop `actorType` from the ruleset definitions and the
wizard's wrong-type warning with it. A test proves both types carry every field a book writes.

### Task 2: The sheet follows the book — DONE

**Files:** `script/dark-heresy.js`, `tests/sheet-per-book.test.mjs`

A `BookSheet` base class holding what all five share (the wizard button, aptitude editing, the
scale logic), five subclasses, and registration of all five for both character types. `Dh.sheetFor`
picks by ruleset; changing the book on the sheet sets `core.sheetClass` so the window re-opens as
the right sheet.

### Task 3: Shared frame, Dark Heresy sheet — DONE

**Files:** `template/sheet/actor/part/*.hbs`, `template/sheet/actor/dark-heresy.hbs`,
`css/dark-heresy.css`

Split the common header into partials and rebuild today's acolyte sheet on them: home world,
background, role, Influence, Fate, divination, and the eight tabs it has now.

### Task 4: Black Crusade sheet — DONE

**Files:** `template/sheet/actor/black-crusade.hbs`, `template/sheet/actor/tab/gifts.hbs`

Race, archetype, pact, patron and aspiration; Infamy where Influence sits and Infamy Points where
Fate sits; Corruption with its alignment tally; and a Gifts of the Gods tab for the mutations and
rewards the pack already carries.

### Task 5: Only War sheet — DONE

**Files:** `template/sheet/actor/only-war.hbs`, `template/sheet/actor/tab/squad.hbs`

Regiment, speciality and demeanour; no Influence; a Squad tab for the Comrade — his name, his
demeanour and the orders the speciality bought.

### Task 6: Rogue Trader and Deathwatch sheets — DONE

**Files:** `template/sheet/actor/rogue-trader.hbs`, `template/sheet/actor/deathwatch.hbs`

The Dark Heresy tab set under each book's own labels, with a note in the file saying which parts
still wait on an audit of that rulebook.

### Task 7: Live run — DONE

Open every book's sheet in Foundry on a character built by the wizard, check that switching the
book switches the sheet and loses nothing, and re-run creation for Dark Heresy, Only War and
Black Crusade.

## Journal

- 2026-09-12: Done. The frame turned out to be one template, not five: `character.hbs` holds what
  every book shares, and each sheet class names its own biography partial, its own vitals and its
  own tab list. That is why five books cost five short classes instead of five copies of 130 lines.
- 2026-09-12: One bug worth remembering — a partial called from inside `{{#each}}` gets the row as
  its context, not the sheet, so every tab rendered without `system` and `items` and fell over on
  the first `selectOptions`. Fixed by passing `../this`, and pinned by a test.
- 2026-09-12: Live run: an ordinary acolyte was pointed at Black Crusade in the wizard. No warning,
  the sheet became BlackCrusadeSheet on the spot, and the wizard opened at Race. All five sheets
  render with their own fields and tabs.
- 2026-09-12: Plan written. The decision that shapes it: `Actor#type` is immutable in Foundry, so
  five actor types would mean re-creating every existing character. Five sheets over two types
  gives the same thing to the player and costs nobody their tokens.
