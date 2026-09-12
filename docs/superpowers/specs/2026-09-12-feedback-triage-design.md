# Player Feedback Triage — Design

**Date:** 2026-09-12
**Branch:** `codex/v14-modernization`
**Source:** a ~60-item feedback list from a playtesting GM, delivered as free prose.

## Goal

Turn one large unstructured feedback list into verified, book-checked fixes, without
trusting any single claim on its face and without fixing what is already correct.

Three things make this list different from a normal bug queue:

1. Several reported items are the **same defect** seen from different angles.
2. Some items are **already fixed** in the current tree — the reporter tested an older build.
3. Some items are **not defects at all** — the system already implements the printed rule,
   and the request is a house rule.

The design therefore starts with a triage discipline, not with a fix list.

## Triage Discipline

Every item gets one of five verdicts before any code is written:

| Verdict | Meaning | Evidence required |
|---|---|---|
| `CONFIRMED` | Defect reproduced in code or pack data | File and line, or a pack query |
| `ALREADY-FIXED` | Current tree is correct | The fix, plus the built artefact |
| `WORKS-AS-WRITTEN` | Behaviour matches the printed rule | Book page |
| `NEEDS-REPRO` | Cannot be settled statically | Named the unknown |
| `HOUSE-RULE` | Correct per book; reporter wants different | Book page + note |

A `HOUSE-RULE` item is never silently implemented as a fix. It is offered as an opt-in
setting or left out, and the book text is recorded next to it.

## Rules Determinations

These were read from the books with `pdf-mcp` and settle contested items.

**Rounding (DH2 p. 23, "Rounding and Multiplying").** "If a fraction is generated when
dividing, unless specified otherwise round the result up, even if the fraction is less than
one-half." This is a *global* rule and the single most consequential finding: every halving
in the codebase must round up unless its own rule says otherwise.

**Unnatural Characteristic (DH2 p. 140).** "Successful tests using a characteristic tied to
this trait gain a number of bonus degrees of success equal to half the Unnatural
Characteristic value." With p. 23, Unnatural (3) grants 2 bonus degrees, not 1.

**Machine (X) (DH2 p. 137).** "Machines have a certain number of Armour points (indicated by
the number in parentheses). This armour stacks with worn armour, but not with the Natural
Armour trait", and it does not protect against Fire (see p. 243). Two consequences: the trait
must grant AP (it currently grants none), and fire correctly bypasses it.

**Natural Armour (DH2 p. 136).** "Gain additional Armour points to all locations."

**Max Agility (DH2 p. 168).** "This is the maximum value a character wearing this armour can
count his Agility: if the character's Agility is higher than this number, it counts as this
number instead. If wearing multiple armour devices (such as a helmet and vest), a character
uses the lowest Max Ag value."

**Clearing a jam (DH2 p. 225).** "Clearing a jam is a Full Action that requires a Ballistic
Skill test. If the character attempting to clear the jam succeeds on the test, then the jam
has been cleared, though the weapon needs to be reloaded and any ammo in it is lost. If he
fails on the test, the weapon is still jammed, though he can attempt to clear it again next
round." All three of the reporter's sub-claims are correct.

## Confirmed Defects

| # | Defect | Location |
|---|---|---|
| 1 | Fatigue threshold omits Unnatural Toughness/Willpower | `script/dark-heresy.js:950-956` |
| 2 | Spray weapons cannot fire; dialog aborts silently | `script/dark-heresy.js:5024,5907,5914` |
| 3 | Clip smaller than RoF forbids the attack entirely | `script/dark-heresy.js:3452` |
| 4 | Snare rejects negative values, disabling the test | `script/dark-heresy.js:6998` |
| 5 | Target-condition chip is always labelled "Stunned" | `template/chat/roll.hbs:137` |
| 6 | Unnatural degrees of success halved with `floor` | `script/dark-heresy.js:4225` |
| 7 | `maxAgility` has no consumer in any roll | data field only |
| 8 | `fatigued` status never syncs with `system.fatigue.value` | `syncFatigueState` |
| 9 | Four Russian strings in the English locale | `lang/en.json:774,775,777,778` |
| 10 | Untouchable / Inquisitor talents absent | pack `dark-heresy` |
| 11 | 185 of 186 weapons have an empty `system.type` | pack `dark-heresy` |
| 12 | 110 of 110 ammunition items have empty compatibility | pack `dark-heresy` |
| 13 | Ammunition weight is `quantity x weight` | `script/dark-heresy.js:1096` + data |
| 14 | Machine / Natural Armour grant no Armour Points | no implementation |
| 15 | Clearing a jam skips BS test, magazine dump and reload | no implementation |

Item 5 alone accounts for three separate reports (Prone read as Stunned on ranged attacks,
Prone read as Stunned when attacked, Grappled read as Stunned +20). The underlying
modifiers at `script/dark-heresy.js:17199-17208` are correct; only the label is wrong.

## Causal Chains

Two clusters must be fixed in order, because the later item cannot be tested while the
earlier one is broken.

**Weapon typing -> ammunition fit -> reload.** `DarkHeresyUtil.ammunitionFitsWeapon`
compares `ammunition.system.weaponTypes` against `weapon.system.type`. Both sides are empty
in shipped data, so the compatibility system is inert and the reporter's attempt to fix it by
tagging ammunition could not have worked. Additionally `_reloadWeapon` resolves only a
pre-set `weapon.system.ammunitionId` and never searches the inventory for a compatible
round. Data must land first, then the matching, then the reload UX.

**Quantity overload.** Pack data stores "shots in the magazine" in `system.quantity`, which
the encumbrance sum reads as "how many I carry". Fixing the weight without splitting the two
meanings would only move the error.

## Rejected and Deferred

`Machine bypassed by fire` is **WORKS-AS-WRITTEN** (p. 137). The requested toggle is a house
rule and is deferred out of the fix work.

`Blinding Fight -> Blind Fighting` is **ALREADY-FIXED** in `tools/lib/dark-heresy-fixes.mjs`
and present as `Blind Fighting` in the built pack.

`Dodge evasion penalty while Prone` is **ALREADY-FIXED**: `script/dark-heresy.js:17387-17389`
applies -20 to evasion. The reporter's sentence is ambiguous in the original English.

## Architecture

The repository already separates pure, testable modules from Foundry-coupled ones
(`script/environment-data.mjs` vs `script/environment.mjs`). All new logic follows that split
and lands in new files, so `script/dark-heresy.js` does not grow:

- `script/data/rounding.mjs` — the p. 23 rule as one function; every halving routes through it.
- `script/data/armour-traits.mjs` — Machine / Natural Armour AP, stacking, fire interaction.
- `script/data/ammunition-fit.mjs` — weapon typing vocabulary and compatibility matching.
- `script/combat/jam.mjs` — jam state machine: set, clear test, magazine dump, reload demand.

Pack data corrections extend the existing idempotent patch pipeline in
`tools/lib/dark-heresy-fixes.mjs`; the `dark-heresy` pack has no `packs-src` sources.

## Testing

Every defect gets a failing test first, in `tests/`, run with `node --test "tests/*.test.mjs"`.
The suite is green at 450 tests before this work and must be green after every task. Pure
modules are unit-tested directly; Foundry-coupled behaviour is tested through the existing
`tests/helpers` vm harness.

Two known harness hazards apply and are called out in the plan: `deepStrictEqual` fails
across the `node:vm` boundary (spread both sides), and a syntax error inside an imported
script module does not fail the suite on its own, so `node --check script/dark-heresy.js`
runs as a separate gate.

## Editing Constraints

`script/dark-heresy.js` is UTF-8 **without** a BOM, with CRLF line endings. It is edited with
Python using `io.open(path, encoding='utf-8', newline='')`, writing CRLF for new lines, and
asserting the number of pattern matches before writing. (An earlier plan in this repository
records the file as having a BOM; that is no longer true, and `utf-8-sig` would introduce one.)

All new code, comments, data and UI strings are English.

## Out of Scope

The ~20 new-mechanic requests (Counter Attack, Grapple tests, player-rolled initiative,
looting, talent toggles, Fear-test button, damage/heal buttons, pistol-in-melee toggle,
lighting presets) are real requests but are design work, not repair. They are planned
separately once the repair clusters are green, so that a regression in new mechanics cannot
be confused with an unfixed report.

## Open Question

`script/dark-heresy.js` is 18,473 lines. It is the reason several of these defects were
invisible and it is a standing risk to the new-mechanics work. No refactor is proposed here,
because none was requested; the risk is recorded so the decision is explicit.
