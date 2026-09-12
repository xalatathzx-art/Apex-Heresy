# Player Feedback Triage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the fifteen confirmed defects from the playtest feedback list, in an order where each fix can actually be tested, and finish triaging the items that could not be settled by reading code.

**Architecture:** Pack data is corrected first, because weapon typing gates ammunition matching which gates reloading — the later fixes are untestable until it lands. New rules logic goes into small pure modules under `script/data/` and `script/combat/` that are unit-tested directly, following the existing `environment-data.mjs` (pure) / `environment.mjs` (Foundry-coupled) split. `script/dark-heresy.js` receives only call-site edits, never new subsystems.

**Tech Stack:** JavaScript ES modules, Foundry VTT 14.365, Node 24 `node:test`, Handlebars, LevelDB packs via `classic-level`, `pdf-mcp` for book text.

**Spec:** `docs/superpowers/specs/2026-09-12-feedback-triage-design.md`

## Global Constraints

- All new code, comments, data, documentation and UI strings are **English**. Russian comments elsewhere are pre-existing; do not add more.
- `script/dark-heresy.js` is UTF-8 **without a BOM**, with CRLF line endings. Edit it with Python using `io.open(path, encoding='utf-8', newline='')`, write `\r\n` for new lines, assert the number of pattern matches before writing, and run `node --check script/dark-heresy.js` afterwards. Do **not** use `utf-8-sig` for writing — it would add a BOM the file does not have.
- New logic goes in **new files**. Do not grow `script/dark-heresy.js` beyond the call-site lines each task names.
- Test command: `node --test "tests/*.test.mjs"` — the glob must be quoted. The suite is green at **450 tests** before this plan starts; it must be green after every task.
- `node --check script/dark-heresy.js` is a separate gate: a syntax error in an imported script module does not fail the test suite on its own.
- `assert.deepStrictEqual` fails across the `node:vm` boundary. Spread both sides (`{...actual}`) or use `assert.deepEqual`.
- Compendium packs can only be **written** while the Foundry desktop app is closed (LevelDB `LOCK`). Tasks that write packs say so explicitly.
- Book text is extracted with **pdf-mcp** (`pdf_search`, `pdf_read_pages`). Do not write local PDF-parsing scripts.
- Every rules decision records its page as `Dark Heresy Second Edition, p. NN` in a comment.
- Commit after every task. Branch: `codex/v14-modernization`. Do not push.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

### Task 1: Finish the triage — DONE

Twelve reported items were never investigated. They are settled here, before any of them
reaches a fix task, so that no effort is spent on behaviour that is already correct.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-feedback-triage-design.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a `## Remaining Triage` section whose verdicts later planning reads.

- [x] **Step 1: Investigate each item and record a verdict**

Settle each of the following with a code location, a pack query, or a book page. Use the
five verdicts defined in the spec (`CONFIRMED`, `ALREADY-FIXED`, `WORKS-AS-WRITTEN`,
`NEEDS-REPRO`, `HOUSE-RULE`).

| Item | Where to look |
|---|---|
| Suppressing Fire applies the Fear condition | `grep -n "suppression" script/dark-heresy.js`, then the Fear application path |
| Overheat cancels the hit but never burns the wielder | `grep -n "overheat" script/dark-heresy.js`; book p. 181 |
| Weapon jam survives a re-roll | `grep -n "jam" script/dark-heresy.js`, look for state reset on re-roll |
| Forbidden Lore (Xenos) cannot set a specialisation | `grep -rn "Forbidden Lore" script/ packs-src/` |
| Synskin "also grants armour" — item not equippable | `grantsArmour` at `script/dark-heresy.js:1536`; check the item's `type` in the pack |
| Forcefields not equippable and inert | `script/dark-heresy.js:124`, `:2731`, `:2933` |
| Hot-Shot weapons should not need a Standard reload | pack query on Hot-Shot items; book p. 179 |
| Harlequin's Kiss lists `DMG-SB` as a special quality | pack query on the item's `system.special` |
| `Corrosive (*)` absent from the quality list | `script/dark-heresy.js:11619-11641` trait table |
| Laser Weapons folder should read `Las` | pack folder query |
| Scholastic Lore needs Common Lore equivalents | book p. 114; check the skill specialisation list |
| Special Ability text hard to read | `grep -rn "specialAbility" template/` |

- [x] **Step 2: Append the verdict table to the spec**

Add a `## Remaining Triage` section to the spec containing one row per item above, each with
its verdict and its evidence (file and line, pack query result, or book page). Items whose
verdict is `CONFIRMED` get a one-line statement of the intended fix. Items whose verdict is
`HOUSE-RULE` or `WORKS-AS-WRITTEN` record the book text that settles them.

- [x] **Step 3: Verify nothing else changed**

Run: `node --test "tests/*.test.mjs"`
Expected: 450 tests, 0 fail.

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-12-feedback-triage-design.md
git commit -m "Settle the twelve untriaged feedback items

Each now carries a verdict and the evidence behind it, so the fix tasks
work from confirmed defects rather than from reports.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: A weapon type vocabulary — DONE

`DarkHeresyUtil.ammunitionFitsWeapon` compares `ammunition.system.weaponTypes` against
`weapon.system.type`, but 185 of 186 weapons in the `dark-heresy` pack have an empty
`system.type` and the one that is set ("Chainaxe" as `las`) is wrong. Nothing can match.
This task builds the vocabulary and the classifier; Task 3 writes it into the pack.

**Files:**
- Create: `script/data/weapon-types.mjs`
- Create: `tests/weapon-types.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `WEAPON_TYPES` — a frozen array of `{key, label}` for the DH2 weapon groups.
  - `classifyWeapon(name, special) -> string|null` — the type key, or `null` when undecidable.

- [x] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEAPON_TYPES, classifyWeapon} from '../script/data/weapon-types.mjs';

test('the vocabulary covers the DH2 weapon groups', () => {
    const keys = WEAPON_TYPES.map(t => t.key);
    for (const key of ['las', 'solidProjectile', 'bolt', 'melta', 'plasma', 'flame',
                       'primitive', 'launcher', 'grenade', 'exotic', 'chain', 'shock',
                       'power', 'force'])
        assert.ok(keys.includes(key), `missing ${key}`);
});

test('weapons are classified by name', () => {
    assert.equal(classifyWeapon('Lasgun', ''), 'las');
    assert.equal(classifyWeapon('Hot-Shot Lasgun', ''), 'las');
    assert.equal(classifyWeapon('Bolt Pistol', ''), 'bolt');
    assert.equal(classifyWeapon('Chainaxe', ''), 'chain');
    assert.equal(classifyWeapon('Inferno Pistol', ''), 'melta');
    assert.equal(classifyWeapon('Hand Flamer', ''), 'flame');
});

test('a weapon that matches nothing is left undecided, never guessed', () => {
    assert.equal(classifyWeapon('Xenos Artefact', ''), null);
});

test('the classifier never returns a key outside the vocabulary', () => {
    const keys = new Set(WEAPON_TYPES.map(t => t.key));
    for (const name of ['Lasgun', 'Chainaxe', 'Xenos Artefact', ''])
        {
            const got = classifyWeapon(name, '');
            assert.ok(got === null || keys.has(got), `${name} -> ${got}`);
        }
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/weapon-types.test.mjs`
Expected: FAIL — cannot find module `../script/data/weapon-types.mjs`.

- [x] **Step 3: Write the minimal implementation**

Create `script/data/weapon-types.mjs`. Order matters in `PATTERNS`: the first match wins, so
more specific patterns come first (`Hot-Shot Lasgun` must reach `las`, not fall through).

```javascript
/**
 * The weapon groups of Dark Heresy Second Edition (p. 170-181) and the
 * classifier that assigns one to a weapon by its name.
 *
 * Shipped pack data left system.type empty on 185 of 186 weapons, which made
 * ammunition compatibility inert: ammunitionFitsWeapon matches a round's
 * weaponTypes against this key. The vocabulary lives here so the pack patch,
 * the sheet and the matcher all read one list.
 */
export const WEAPON_TYPES = Object.freeze([
    {key: 'las', label: 'WEAPON.TYPE.LAS'},
    {key: 'solidProjectile', label: 'WEAPON.TYPE.SOLID_PROJECTILE'},
    {key: 'bolt', label: 'WEAPON.TYPE.BOLT'},
    {key: 'melta', label: 'WEAPON.TYPE.MELTA'},
    {key: 'plasma', label: 'WEAPON.TYPE.PLASMA'},
    {key: 'flame', label: 'WEAPON.TYPE.FLAME'},
    {key: 'primitive', label: 'WEAPON.TYPE.PRIMITIVE'},
    {key: 'launcher', label: 'WEAPON.TYPE.LAUNCHER'},
    {key: 'grenade', label: 'WEAPON.TYPE.GRENADE'},
    {key: 'exotic', label: 'WEAPON.TYPE.EXOTIC'},
    {key: 'chain', label: 'WEAPON.TYPE.CHAIN'},
    {key: 'shock', label: 'WEAPON.TYPE.SHOCK'},
    {key: 'power', label: 'WEAPON.TYPE.POWER'},
    {key: 'force', label: 'WEAPON.TYPE.FORCE'}
]);

const PATTERNS = [
    [/\b(las(gun|pistol|carbine|cannon)?|hellgun|hellpistol|hot-?shot)\b/i, 'las'],
    [/\b(bolt(gun|er|_pistol)?|bolt\s|storm bolter)\b/i, 'bolt'],
    [/\b(melta|inferno pistol|multi-?melta)\b/i, 'melta'],
    [/\bplasma\b/i, 'plasma'],
    [/\b(flame(r|)|burner|incinerator)\b/i, 'flame'],
    [/\bchain(sword|axe|blade|knife)?\b/i, 'chain'],
    [/\bshock\s|\bshock(maul|whip|staff)\b/i, 'shock'],
    [/\bpower\s(sword|axe|fist|maul|blade|hammer)\b/i, 'power'],
    [/\bforce\s(sword|staff|axe|rod)\b/i, 'force'],
    [/\b(missile|rocket)\s?launcher\b/i, 'launcher'],
    [/\bgrenade\b/i, 'grenade'],
    [/\b(auto(gun|pistol|cannon)|stub|shotgun|rifle|sniper|bolt-?action)\b/i, 'solidProjectile'],
    [/\b(bow|crossbow|sling|spear|club|axe|sword|knife|hammer)\b/i, 'primitive']
];

/**
 * Decide a weapon's group from its name.
 * Returns null rather than guessing: an unset type is honest, a wrong one
 * silently breaks reloading.
 * @param {string} name
 * @param {string} special the weapon's special-qualities text, reserved for
 *                         future disambiguation
 * @returns {string|null}
 */
export function classifyWeapon(name, special = '') {
    const text = String(name || '');
    for (const [pattern, key] of PATTERNS) if (pattern.test(text)) return key;
    return null;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tests/weapon-types.test.mjs`
Expected: PASS, 4 tests.

- [x] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 454 tests, 0 fail.

- [x] **Step 6: Commit**

```bash
git add script/data/weapon-types.mjs tests/weapon-types.test.mjs
git commit -m "Add the weapon type vocabulary and its classifier

Ammunition compatibility matches a round's weaponTypes against a weapon's
system.type, which shipped empty on 185 of 186 weapons. This is the list
both sides will read; the pack patch follows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Write weapon types into the pack — DONE

**Files:**
- Modify: `tools/lib/dark-heresy-fixes.mjs`
- Create: `tests/weapon-type-coverage.test.mjs`

**Interfaces:**
- Consumes: `classifyWeapon` from Task 2.
- Produces: `fixDocument` now sets `system.type` on weapon documents.

- [x] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

const weapon = (name, type = '') => ({type: 'weapon', name, system: {type}});

test('a weapon with no type is classified', () => {
    const {doc, changed} = fixDocument(weapon('Lasgun'));
    assert.equal(changed, true);
    assert.equal(doc.system.type, 'las');
});

test('the miscategorised Chainaxe is corrected, not left as las', () => {
    const {doc} = fixDocument(weapon('Chainaxe', 'las'));
    assert.equal(doc.system.type, 'chain');
});

test('an unclassifiable weapon is left alone rather than guessed', () => {
    const {doc} = fixDocument(weapon('Xenos Artefact'));
    assert.equal(doc.system.type, '');
});

test('the patch is idempotent', () => {
    const first = fixDocument(weapon('Lasgun'));
    const second = fixDocument(first.doc);
    assert.equal(second.changed, false);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/weapon-type-coverage.test.mjs`
Expected: FAIL — `changed` is `false` and `system.type` stays `''`.

- [x] **Step 3: Write the minimal implementation**

Add the import at the top of `tools/lib/dark-heresy-fixes.mjs`:

```javascript
import {classifyWeapon} from '../../script/data/weapon-types.mjs';
```

And inside `fixDocument`, before the `return`:

```javascript
    // Weapon group. Shipped data left this empty on almost every weapon, which
    // made ammunition compatibility inert (ammunitionFitsWeapon matches a
    // round's weaponTypes against it). An unclassifiable weapon keeps its empty
    // type: a wrong group is worse than none, because it silently blocks reloads.
    if (doc.type === 'weapon') {
        const classified = classifyWeapon(doc.name, doc.system?.special ?? '');
        if (classified && doc.system?.type !== classified) {
            doc.system = {...doc.system, type: classified};
            changed = true;
        }
    }
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tests/weapon-type-coverage.test.mjs`
Expected: PASS, 4 tests.

- [x] **Step 5: Apply the patch to the pack**

Foundry must be closed. Run: `node tools/patch-dark-heresy.mjs`
Expected: a report listing the weapons whose type changed, and a non-zero `changed:` count.

- [x] **Step 6: Confirm coverage in the built pack**

Run a pack query counting weapons with an empty `system.type`. Record the number in the
commit message. Weapons that remain unclassified are expected; the count must be small and
each remaining name should be genuinely ambiguous.

- [x] **Step 7: Run the whole suite and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 458 tests, 0 fail; no syntax output.

- [x] **Step 8: Commit**

```bash
git add tools/lib/dark-heresy-fixes.mjs tests/weapon-type-coverage.test.mjs packs/dark-heresy
git commit -m "Give the pack's weapons their weapon group

Ammunition compatibility was inert because system.type was empty on 185 of
186 weapons, and the one that was set called a Chainaxe a las weapon.
Unclassifiable weapons keep an empty type rather than a guessed one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Spray weapons can fire again — DONE

A flamer skips the attack roll, so `prepareCombatRoll` forces `attackType.name = "standard"`
at `script/dark-heresy.js:5907`. `_weaponSupportsAttackType` then demands `rof.single`, which
a flamer does not have, and returns `false` at line 5024 **without a notification**. The
caller at line 5914 does a bare `return`, so the dialog freezes with no message — the
reported symptom.

Two defects: Spray must not be gated on rate of fire at all, and the `standard` branch must
never fail silently.

**Files:**
- Modify: `script/dark-heresy.js:5010-5035` (`_weaponSupportsAttackType`)
- Modify: `lang/en.json`
- Create: `tests/spray-attack.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports; `_weaponSupportsAttackType` gains a Spray short-circuit.

- [x] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const sprayWeapon = () => ({
    isRange: true,
    name: 'Hand Flamer',
    rateOfFire: {single: 0, burst: 0, full: 0},
    traits: {skipAttackRoll: true}
});

test('a Spray weapon may fire even though it has no rate of fire', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    assert.equal(supports({weapon: sprayWeapon(), attackType: {name: 'standard'}}), true);
});

test('a non-Spray weapon with no single shot is still refused', () => {
    const supports = loadSystem().get('_weaponSupportsAttackType');
    const weapon = {...sprayWeapon(), traits: {}};
    assert.equal(supports({weapon, attackType: {name: 'standard'}}), false);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/spray-attack.test.mjs`
Expected: FAIL — the first test returns `false`.

- [x] **Step 3: Write the minimal implementation**

Edit with Python. In `_weaponSupportsAttackType`, immediately after the melee branch, add:

```javascript
    // Spray weapons skip the hit roll entirely (DH2 p. 179), so rate of fire
    // never applies to them. prepareCombatRoll relabels them "standard", and
    // demanding rof.single here froze the attack dialog with no message.
    if (rollData.weapon?.traits?.skipAttackRoll) return true;
```

Then replace the silent refusal so it explains itself:

```javascript
    if (["standard", "called_shot"].includes(name) && !has(rof.single)) {
        ui.notifications.warn(game.i18n.format("WEAPON.NO_SINGLE_SHOT",
            { weapon: rollData.weapon.name || rollData.name }));
        return false;
    }
```

Add to `lang/en.json`, next to the existing `WEAPON.NO_SEMI_AUTO`:

```json
"WEAPON.NO_SINGLE_SHOT": "{weapon} has no single-shot rate of fire.",
```

- [x] **Step 4: Run the test and the syntax gate**

Run: `node --test tests/spray-attack.test.mjs` then `node --check script/dark-heresy.js`
Expected: PASS, 2 tests; no syntax output.

- [x] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 460 tests, 0 fail.

- [x] **Step 6: Commit**

```bash
git add script/dark-heresy.js lang/en.json tests/spray-attack.test.mjs
git commit -m "Let flamers fire, and stop the silent refusal behind it

Spray skips the hit roll, so rate of fire never applied; forcing the attack
type to standard then demanding rof.single froze the dialog. The standard
branch also refused without a notification, so any weapon with missing rate
of fire data failed with no explanation.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: A short magazine caps the hits instead of forbidding the shot — DONE

`_checkAmmo` returns `enough: clipValue >= required`, and the caller refuses the attack. A
weapon with RoF 10 and 9 rounds left should fire, scoring at most 9 hits.

**Files:**
- Modify: `script/dark-heresy.js:3434-3456` (`_checkAmmo`)
- Modify: `script/dark-heresy.js:5947-5949` (the caller's guard)
- Create: `tests/short-magazine.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `_checkAmmo` returns `{enough, required, available, fired}` where `fired` is the
  number of rounds actually spent — `Math.min(required, available)`.

- [x] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

const rollData = (value, full) => ({
    weapon: {isRange: true, clip: {value, max: 30}, rateOfFire: {single: 0, burst: 0, full}},
    attackType: {name: 'full_auto'}
});

test('a magazine shorter than the rate of fire still fires, capped', () => {
    const check = loadSystem().get('_checkAmmo');
    const got = check(rollData(9, 10));
    assert.equal(got.enough, true);
    assert.equal(got.fired, 9);
});

test('an empty magazine still refuses', () => {
    const check = loadSystem().get('_checkAmmo');
    assert.equal(check(rollData(0, 10)).enough, false);
});

test('a full magazine spends exactly the rate of fire', () => {
    const check = loadSystem().get('_checkAmmo');
    assert.equal(check(rollData(30, 10)).fired, 10);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/short-magazine.test.mjs`
Expected: FAIL — the first test gets `enough: false` and `fired: undefined`.

- [x] **Step 3: Write the minimal implementation**

Replace the return of `_checkAmmo`:

```javascript
    const required = _calculateRequiredAmmo(rollData);
    // A magazine shorter than the rate of fire does not forbid the burst: the
    // weapon fires what it has and the hits are capped at that (DH2 p. 218).
    // Only an empty magazine stops the attack.
    const fired = Math.min(required, clipValue);
    return {
        enough: clipValue > 0,
        required: required,
        available: clipValue,
        fired: fired
    };
```

Then make the hit ceiling respect `fired`. In `_computeRateOfFire`, the maximum hits for the
selected attack type must be `Math.min(maxHits, rollData.ammoFired ?? maxHits)`, where
`prepareCombatRoll` sets `rollData.ammoFired = ammoCheck.fired` right after calling
`_checkAmmo`. Consume `fired` rounds, not `required`, in `_consumeAmmo`.

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test tests/short-magazine.test.mjs` then `node --check script/dark-heresy.js`
Expected: PASS, 3 tests; no syntax output.

- [x] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 463 tests, 0 fail.

- [x] **Step 6: Commit**

```bash
git add script/dark-heresy.js tests/short-magazine.test.mjs
git commit -m "Fire the rounds that are left instead of refusing the burst

A weapon with ten rounds of rate of fire and nine in the magazine now fires
nine and caps the hits at nine. Only an empty magazine stops the attack.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Round the way the book rounds — DONE

DH2 p. 23 makes rounding up the default for every division. `_getUnnaturalDosBonus` uses
`Math.floor`, so Unnatural (3) grants one bonus degree where the book grants two.

One existing halving must **not** change: `script/dark-heresy.js:17353` writes
`-Math.floor(total / 2)` deliberately, because `ceil(t/2) === t - floor(t/2)` expresses
"counts as half, rounding up" as a subtractive modifier. Its comment says so. Leave it.

**Files:**
- Create: `script/data/rounding.mjs`
- Modify: `script/dark-heresy.js:4225`
- Create: `tests/rounding.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `halfRoundedUp(value) -> number`.

- [x] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {halfRoundedUp} from '../script/data/rounding.mjs';
import {loadSystem} from './helpers/system.mjs';

test('halving rounds up, even below one half (DH2 p. 23)', () => {
    assert.equal(halfRoundedUp(1), 1);
    assert.equal(halfRoundedUp(2), 1);
    assert.equal(halfRoundedUp(3), 2);
    assert.equal(halfRoundedUp(5), 3);
    assert.equal(halfRoundedUp(0), 0);
});

test('Unnatural grants half its value in degrees, rounded up (DH2 p. 140)', () => {
    const actor = {system: {characteristics: {strength: {unnatural: 3}}}};
    const bonus = loadSystem().get('_getUnnaturalDosBonus');
    globalThis.game.actors.set('a1', actor);
    assert.equal(bonus({actorId: 'a1', characteristicKey: 'strength'}), 2);
});
```

Adapt the second test's actor plumbing to whatever `tests/helpers/system.mjs` already offers
for stubbing `game.actors.get`; read an existing test that stubs an actor before writing it.

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test tests/rounding.test.mjs`
Expected: FAIL — module missing, and the Unnatural bonus returns 1.

- [x] **Step 3: Write the minimal implementation**

Create `script/data/rounding.mjs`:

```javascript
/**
 * The rounding rule of Dark Heresy Second Edition, p. 23:
 * "If a fraction is generated when dividing, unless specified otherwise round
 * the result up, even if the fraction is less than one-half."
 */

/**
 * Half of a value, rounded up.
 * @param {number} value
 * @returns {number}
 */
export function halfRoundedUp(value) {
    return Math.ceil((Number(value) || 0) / 2);
}
```

Then at `script/dark-heresy.js:4225`, replace `return Math.floor(unnatural / 2);` with a call
to `halfRoundedUp(unnatural)`, importing it at the top of the file alongside the other
`script/data/` imports.

- [x] **Step 4: Audit the three remaining halvings**

Check each against its own rule with pdf-mcp and either route it through `halfRoundedUp` or
leave it with a comment saying which page keeps it as it is:

- `script/dark-heresy.js:3332` — `Math.floor(rollData.attackDos / 2)`, horde kills.
- `script/dark-heresy.js:10300` — `5 + 5 * Math.floor(degrees / 2)`.
- `script/dark-heresy.js:17632` — `Math.floor(chance / 2)`, a halved percentage.

Do **not** touch `:17353`.

- [x] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 465 tests, 0 fail; no syntax output.

- [x] **Step 6: Commit**

```bash
git add script/data/rounding.mjs script/dark-heresy.js tests/rounding.test.mjs
git commit -m "Round divisions up, as the book does

DH2 p. 23 makes rounding up the default for every division, so Unnatural (3)
grants two bonus degrees of success, not one. The deliberate floor at the
fatigue penalty stays: it expresses ceil(t/2) as a subtractive modifier.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Fatigue threshold counts Unnatural

`_computeDerived` builds `tb` and `wb` from `(base + advance) / 10`, which skips the
`unnatural` addend and the `unnaturalMultiplier` that `characteristic.bonus` already carries
at `script/dark-heresy.js:846`.

**Files:**
- Modify: `script/dark-heresy.js:950-957`
- Create: `tests/fatigue-threshold.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('Unnatural Toughness raises the fatigue threshold', () => {
    const system = loadSystem();
    const actor = system.get('makeActor')({
        toughness: {base: 40, advance: 0, unnatural: 2},
        willpower: {base: 30, advance: 0, unnatural: 0}
    });
    // Toughness bonus 4 + 2 unnatural = 6, Willpower bonus 3 -> threshold 9.
    assert.equal(actor.system.fatigue.max, 9);
});
```

Use whatever actor factory `tests/helpers/system.mjs` exposes; if none exists, follow the
pattern in `tests/aptitude-debt.test.mjs`, which already builds an actor for derived-stat
assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fatigue-threshold.test.mjs`
Expected: FAIL — threshold is 7, not 9.

- [ ] **Step 3: Write the minimal implementation**

Replace the `tb` / `wb` computation with the already-derived bonuses, which include the
unnatural addend and multiplier:

```javascript
        // Both bonuses come from the characteristics themselves so that Unnatural
        // counts: characteristic.bonus already folds in the unnatural addend and
        // multiplier (see _computeCharacteristics). Recomputing from base+advance
        // here silently dropped it (DH2 p. 233).
        const tb = Number(this.characteristics.toughness.bonus) || 0;
        const wb = Number(this.characteristics.willpower.bonus) || 0;
```

- [ ] **Step 4: Run the test and the syntax gate**

Run: `node --test tests/fatigue-threshold.test.mjs` then `node --check script/dark-heresy.js`
Expected: PASS; no syntax output.

- [ ] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 466 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add script/dark-heresy.js tests/fatigue-threshold.test.mjs
git commit -m "Count Unnatural toward the fatigue threshold

The threshold recomputed the bonuses from base plus advance, which drops the
unnatural addend and multiplier that characteristic.bonus already carries.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Name the target's condition on the roll card

`template/chat/roll.hbs:137` hardcodes `CONDITION.STUNNED` for the aggregate target
modifier, so Prone reads as "Stunned (-10)" and Grappled as "Stunned (+20)". The modifiers
themselves are right. `_getActorConditionModifier` already solves this for the attacker with
an `actorConditionSources` string; mirror it.

**Files:**
- Modify: `script/dark-heresy.js:17176-17212` (`_getTargetConditionModifier`)
- Modify: `script/dark-heresy.js:3781-3786` (the call site)
- Modify: `template/chat/roll.hbs:135-138`
- Create: `tests/target-condition-label.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `rollData.targetConditionSources` — a comma-joined string of
  `"<localised condition> (<signed modifier>)"`, matching `actorConditionSources`.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('a prone target is named Prone, not Stunned', () => {
    const system = loadSystem();
    const rollData = system.get('makeRangedRollAgainst')(['prone']);
    system.get('_getTargetConditionModifier')(rollData);
    assert.match(rollData.targetConditionSources, /Prone \(-10\)/);
    assert.doesNotMatch(rollData.targetConditionSources, /Stunned/);
});

test('a grappled target in melee is named Grappled', () => {
    const system = loadSystem();
    const rollData = system.get('makeMeleeRollAgainst')(['grappled']);
    system.get('_getTargetConditionModifier')(rollData);
    assert.match(rollData.targetConditionSources, /Grappled \(\+20\)/);
});

test('several conditions are all listed', () => {
    const system = loadSystem();
    const rollData = system.get('makeMeleeRollAgainst')(['stunned', 'prone']);
    system.get('_getTargetConditionModifier')(rollData);
    assert.match(rollData.targetConditionSources, /Stunned \(\+20\)/);
    assert.match(rollData.targetConditionSources, /Prone \(\+10\)/);
});
```

Build the `makeRangedRollAgainst` / `makeMeleeRollAgainst` helpers in the test file itself if
`tests/helpers/system.mjs` does not already stub a targeted token; `_getTargetConditionModifier`
needs `canvas.tokens.get` and `_hasCondition` to answer.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/target-condition-label.test.mjs`
Expected: FAIL — `targetConditionSources` is `undefined`.

- [ ] **Step 3: Write the minimal implementation**

Give `_getTargetConditionModifier` the same `note` helper the actor version uses, and record
the sources on `rollData`:

```javascript
    const sources = [];
    const note = (key, value) => {
        modifier += value;
        sources.push(`${game.i18n.localize(key)} (${value > 0 ? "+" : ""}${value})`);
    };
```

Replace each `modifier += N` with the matching `note("CONDITION.STUNNED", 20)`,
`note("CONDITION.UNCONSCIOUS", 30)`, `note("CONDITION.PRONE", isMelee ? 10 : -10)` and
`note("CONDITION.GRAPPLED", 20)`. Before returning, add
`if (rollData) rollData.targetConditionSources = sources.join(", ");`.

Then in `template/chat/roll.hbs`:

```handlebars
                {{#if targetConditionModifier}}
                    <dt>{{localize "CHAT.TARGET_CONDITION"}}</dt>
                    <dd>{{#if targetConditionSources}}{{targetConditionSources}}{{else}}{{signed targetConditionModifier}}{{/if}}</dd>
                {{/if}}
```

Confirm `CONDITION.PRONE`, `CONDITION.GRAPPLED` and `CONDITION.UNCONSCIOUS` exist in
`lang/en.json`; add any that do not.

- [ ] **Step 4: Run the test and the syntax gate**

Run: `node --test tests/target-condition-label.test.mjs` then `node --check script/dark-heresy.js`
Expected: PASS, 3 tests; no syntax output.

- [ ] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 469 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add script/dark-heresy.js template/chat/roll.hbs lang/en.json tests/target-condition-label.test.mjs
git commit -m "Say which condition the target is actually in

The roll card labelled every target modifier Stunned, so Prone read as
Stunned (-10) and Grappled as Stunned (+20). The modifiers were already
correct; only the label was wrong. Mirrors actorConditionSources.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Snare accepts a negative value

`extractNumberedTrait(/Snare[^,;()]*?\(\d+\)/gi, ...)` cannot match `Snare (-1)`, so
`traits.snare` is not an integer, `Number.isInteger(traits.snare)` at
`script/dark-heresy.js:4107` is false, and no test is rolled at all — the quality vanishes.

**Files:**
- Modify: `script/dark-heresy.js:6998`
- Create: `tests/snare-negative.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('Snare keeps a negative value instead of disappearing', () => {
    const traits = loadSystem().get('DarkHeresyUtil').extractWeaponTraits('Snare (-1)');
    assert.equal(traits.snare, -1);
});

test('Snare still reads a positive value', () => {
    const traits = loadSystem().get('DarkHeresyUtil').extractWeaponTraits('Snare (2)');
    assert.equal(traits.snare, 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/snare-negative.test.mjs`
Expected: FAIL — `traits.snare` is `undefined` for the negative case.

- [ ] **Step 3: Write the minimal implementation**

Widen the numeric group to accept a sign. Check `extractNumberedTrait` parses with something
that keeps the sign (`Number`/`parseInt` both do); if it strips non-digits, fix that too:

```javascript
            snare: this.extractNumberedTrait(/Snare[^,;()]*?\(-?\d+\)|Опутывающее[^,;()]*?\(-?\d+\)/gi, traits),
```

- [ ] **Step 4: Run the test and the syntax gate**

Run: `node --test tests/snare-negative.test.mjs` then `node --check script/dark-heresy.js`
Expected: PASS, 2 tests; no syntax output.

- [ ] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 471 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add script/dark-heresy.js tests/snare-negative.test.mjs
git commit -m "Let Snare carry a negative value

The pattern demanded unsigned digits, so a bonus to the Snare test made the
quality parse as absent and no test was rolled at all.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The four Russian strings in the English locale

**Files:**
- Modify: `lang/en.json:774,775,777,778`
- Create: `tests/locale-language.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the English locale contains no Cyrillic', () => {
    const lang = JSON.parse(readFileSync('lang/en.json', 'utf8'));
    const bad = Object.entries(lang).filter(([, v]) => /[Ѐ-ӿ]/.test(String(v)));
    assert.deepEqual(bad.map(([k]) => k), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/locale-language.test.mjs`
Expected: FAIL — four keys listed: `WEAPON.JAM`, `WEAPON.OVERHEAT`, `WEAPON.SHOCK_STUNNED`, `WEAPON.SHOCK_EFFECTS_APPLIED`.

- [ ] **Step 3: Write the minimal implementation**

```json
"WEAPON.JAM": "{weapon} - Jammed!",
"WEAPON.OVERHEAT": "{weapon} - Overheated!",
"WEAPON.SHOCK_STUNNED": "Stunned for {rounds} rounds",
"WEAPON.SHOCK_EFFECTS_APPLIED": "{actor} is stunned for {rounds} rounds and takes 1 level of Fatigue from the Shock weapon.",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/locale-language.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: 472 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add lang/en.json tests/locale-language.test.mjs
git commit -m "Translate the four Russian strings in the English locale

Jam and overheat alerts reached English tables in Russian. The test keeps
Cyrillic out of en.json from now on.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Max Agility limits the wearer

`maxAgility` is stored, shown on the armour sheet and printed on the chat card, but no roll
reads it. DH2 p. 168: a character's Agility counts as the armour's Max Ag when it is higher,
and the **lowest** Max Ag applies when several pieces are worn.

**Files:**
- Create: `script/data/max-agility.mjs`
- Modify: `script/dark-heresy.js` — the characteristic derivation, after armour is summed
- Create: `tests/max-agility.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `effectiveMaxAgility(items) -> number|null` — the lowest `maxAgility` among
  equipped items that declare one, or `null` when none do.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectiveMaxAgility} from '../script/data/max-agility.mjs';

const worn = maxAgility => ({isEquipped: true, system: {maxAgility}});

test('no armour with a cap leaves Agility alone', () => {
    assert.equal(effectiveMaxAgility([worn(null), worn(0)]), null);
});

test('the lowest cap among worn pieces applies (DH2 p. 168)', () => {
    assert.equal(effectiveMaxAgility([worn(45), worn(35), worn(50)]), 35);
});

test('unequipped armour does not cap anything', () => {
    const stowed = {isEquipped: false, system: {maxAgility: 20}};
    assert.equal(effectiveMaxAgility([stowed, worn(45)]), 45);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/max-agility.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the minimal implementation**

```javascript
/**
 * Max Agility, Dark Heresy Second Edition, p. 168:
 * "This is the maximum value a character wearing this armour can count his
 * Agility: if the character's Agility is higher than this number, it counts as
 * this number instead. If wearing multiple armour devices (such as a helmet and
 * vest), a character uses the lowest Max Ag value."
 */

/**
 * The lowest Max Agility among equipped items that declare one.
 * @param {Array} items
 * @returns {number|null} null when nothing caps Agility
 */
export function effectiveMaxAgility(items) {
    const caps = (items ?? [])
        .filter(item => item?.isEquipped)
        .map(item => Number(item?.system?.maxAgility) || 0)
        .filter(cap => cap > 0);
    return caps.length ? Math.min(...caps) : null;
}
```

Then, in the actor's characteristic derivation, after `agility.total` is known, clamp it:

```javascript
        // Heavy armour caps the Agility a character may count (DH2 p. 168).
        const agilityCap = effectiveMaxAgility(this.items);
        if (agilityCap !== null && this.characteristics.agility.total > agilityCap) {
            this.characteristics.agility.total = agilityCap;
        }
```

The clamp must run **before** `agility.bonus` and the skills derived from Agility are
computed, so that the cap reaches every roll rather than only the displayed number. Confirm
the ordering in `_computeCharacteristics` / `_computeSkills` before placing it, and add a
test asserting that an Agility-based skill total drops with the cap.

- [ ] **Step 4: Run the test and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 475 tests, 0 fail; no syntax output.

- [ ] **Step 5: Commit**

```bash
git add script/data/max-agility.mjs script/dark-heresy.js tests/max-agility.test.mjs
git commit -m "Make Max Agility actually limit the wearer

The field was stored, shown on the sheet and printed on the chat card, but no
roll read it. The lowest cap among worn pieces now clamps Agility before the
bonus and the Agility skills are derived.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Machine and Natural Armour grant Armour Points

DH2 p. 136-137: Natural Armour grants AP to all locations; Machine (X) grants AP that
"stacks with worn armour, but not with the Natural Armour trait". Fire correctly ignores it
— that is not a defect and no toggle is added.

**Files:**
- Create: `script/data/armour-traits.mjs`
- Modify: `script/dark-heresy.js:1528-1560` (the armour aggregation)
- Create: `tests/armour-traits.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `traitArmour(traits) -> {value: number, source: 'machine'|'naturalArmour'|null}` —
  the AP the creature's traits grant to every location, taking the higher of Machine and
  Natural Armour rather than their sum.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {traitArmour} from '../script/data/armour-traits.mjs';

test('Natural Armour grants its value to all locations (DH2 p. 136)', () => {
    assert.deepEqual({...traitArmour({naturalArmour: 3})}, {value: 3, source: 'naturalArmour'});
});

test('Machine grants its value (DH2 p. 137)', () => {
    assert.deepEqual({...traitArmour({machine: 5})}, {value: 5, source: 'machine'});
});

test('Machine and Natural Armour do not stack with each other', () => {
    assert.equal(traitArmour({machine: 5, naturalArmour: 3}).value, 5);
    assert.equal(traitArmour({machine: 2, naturalArmour: 4}).value, 4);
});

test('no armour trait grants nothing', () => {
    assert.deepEqual({...traitArmour({})}, {value: 0, source: null});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/armour-traits.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the minimal implementation**

```javascript
/**
 * Armour granted by creature traits.
 *
 * Natural Armour (DH2 p. 136): "Gain additional Armour points to all locations."
 * Machine (X) (DH2 p. 137): armour points that "stack with worn armour, but not
 * with the Natural Armour trait". Machine armour does not protect against Fire
 * (p. 243) — that exclusion lives with the fire damage path, not here.
 */

/**
 * The Armour Points a creature's traits grant to every location.
 * @param {object} traits
 * @returns {{value: number, source: 'machine'|'naturalArmour'|null}}
 */
export function traitArmour(traits) {
    const machine = Number(traits?.machine) || 0;
    const natural = Number(traits?.naturalArmour) || 0;
    if (machine === 0 && natural === 0) return {value: 0, source: null};
    return machine >= natural
        ? {value: machine, source: 'machine'}
        : {value: natural, source: 'naturalArmour'};
}
```

Feed the result into the armour aggregation as an **additive** source across all locations,
alongside the existing `armourSources` list, so it stacks with worn armour as the book says.

- [ ] **Step 4: Confirm fire still ignores Machine armour**

Add a test asserting that fire damage does not subtract the Machine AP. This encodes p. 137
and p. 243 and prevents a later "fix" from breaking the printed rule.

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 480 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add script/data/armour-traits.mjs script/dark-heresy.js tests/armour-traits.test.mjs
git commit -m "Grant the armour that Machine and Natural Armour promise

Both traits printed a value that nothing read. They now add Armour Points to
every location and, per p. 137, take the higher of the two rather than the
sum. Fire still ignores Machine armour, which is the printed rule.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Clearing a jam follows the book

DH2 p. 225: "Clearing a jam is a Full Action that requires a Ballistic Skill test. If the
character attempting to clear the jam succeeds on the test, then the jam has been cleared,
though the weapon needs to be reloaded and any ammo in it is lost. If he fails on the test,
the weapon is still jammed, though he can attempt to clear it again next round."

**Files:**
- Create: `script/combat/jam.mjs`
- Modify: `script/dark-heresy.js` — the jam clearing call site
- Create: `tests/jam-clearing.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveJamClear({success}) -> {cleared: boolean, emptyMagazine: boolean, needsReload: boolean}`.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveJamClear} from '../script/combat/jam.mjs';

test('a successful test clears the jam, dumps the magazine and demands a reload', () => {
    assert.deepEqual({...resolveJamClear({success: true})},
        {cleared: true, emptyMagazine: true, needsReload: true});
});

test('a failed test leaves the weapon jammed and the magazine untouched', () => {
    assert.deepEqual({...resolveJamClear({success: false})},
        {cleared: false, emptyMagazine: false, needsReload: false});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/jam-clearing.test.mjs`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the minimal implementation**

```javascript
/**
 * Clearing a weapon jam, Dark Heresy Second Edition, p. 225.
 *
 * "Clearing a jam is a Full Action that requires a Ballistic Skill test. If the
 * character attempting to clear the jam succeeds on the test, then the jam has
 * been cleared, though the weapon needs to be reloaded and any ammo in it is
 * lost. If he fails on the test, the weapon is still jammed, though he can
 * attempt to clear it again next round."
 */

/**
 * What a jam-clearing attempt does to the weapon.
 * @param {{success: boolean}} test the resolved Ballistic Skill test
 * @returns {{cleared: boolean, emptyMagazine: boolean, needsReload: boolean}}
 */
export function resolveJamClear(test) {
    const success = !!test?.success;
    return {cleared: success, emptyMagazine: success, needsReload: success};
}
```

Wire the call site so clearing a jam prompts a Ballistic Skill test rather than clearing the
flag outright, and applies `emptyMagazine` by setting `system.clip.value` to 0.

- [ ] **Step 4: Check that a jam does not survive a re-roll**

The feedback also reports that a jam persists across re-rolls. Task 1 assigns this a verdict;
if it is `CONFIRMED`, fix it here — the jam flag must be cleared when the attack roll that
set it is re-rolled — and add a test. If Task 1 found otherwise, record that instead.

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 482 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add script/combat/jam.mjs script/dark-heresy.js tests/jam-clearing.test.mjs
git commit -m "Clear jams the way the book clears them

Clearing a jam now takes a Ballistic Skill test, loses the ammunition in the
weapon and demands a reload, per p. 225. A failed test leaves the weapon
jammed for another attempt next round.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: The fatigued status reflects the fatigue counter

`system.fatigue.value` drives the real penalties, but the `fatigued` status icon is set only
by hand and means nothing. `syncFatigueState` already reacts to fatigue changes; it just
never touches the icon.

**Files:**
- Modify: `script/dark-heresy.js` — `syncFatigueState`
- Create: `tests/fatigued-status.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Assert that raising `system.fatigue.value` above zero adds the `fatigued` condition, that
lowering it to zero removes it, and that the existing unconscious-at-threshold behaviour is
unchanged. Follow the actor-stubbing pattern already used in `tests/blood-loss.test.mjs`,
which exercises `syncFatigueState`'s neighbours.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/fatigued-status.test.mjs`
Expected: FAIL — the condition is never added.

- [ ] **Step 3: Write the minimal implementation**

In `syncFatigueState`, before the unconscious branch:

```javascript
    // The icon and the counter were two unlinked representations: the counter
    // drove every penalty while the status meant nothing. Keep them in step.
    const fatigued = actor.hasCondition("fatigued");
    if (value > 0 && !fatigued) await actor.addCondition("fatigued", { type: "minor" });
    else if (value === 0 && fatigued) await actor.removeCondition("fatigued");
```

- [ ] **Step 4: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 485 tests, 0 fail; no syntax output.

- [ ] **Step 5: Commit**

```bash
git add script/dark-heresy.js tests/fatigued-status.test.mjs
git commit -m "Tie the fatigued status to the fatigue counter

The counter drove the penalties while the icon was decorative, so a fatigued
character showed nothing and a toggled icon did nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Ammunition weight and quantity mean different things

Pack data stores "shots in the magazine" in `system.quantity`, and
`script/dark-heresy.js:1096` reads it as "how many I carry", so a Standard Lasgun Cell
(`quantity: 60`, `weight: 0.4`) weighs 24 kg.

**Files:**
- Modify: `tools/lib/dark-heresy-fixes.mjs`
- Create: `tests/ammunition-weight.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `fixDocument` normalises ammunition `quantity` and `weight`.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

test('a magazine is one carried item, not sixty', () => {
    const {doc} = fixDocument({
        type: 'ammunition', name: 'Standard Lasgun Cell',
        system: {quantity: 60, weight: 0.4, clip: {max: 0}}
    });
    assert.equal(doc.system.quantity, 1);
});

test('the shots per magazine are preserved, not discarded', () => {
    const {doc} = fixDocument({
        type: 'ammunition', name: 'Standard Lasgun Cell',
        system: {quantity: 60, weight: 0.4, clip: {max: 0}}
    });
    assert.equal(doc.system.clip.max, 60);
});

test('the patch is idempotent', () => {
    const once = fixDocument({
        type: 'ammunition', name: 'Standard Lasgun Cell',
        system: {quantity: 60, weight: 0.4, clip: {max: 0}}
    });
    assert.equal(fixDocument(once.doc).changed, false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/ammunition-weight.test.mjs`
Expected: FAIL — quantity stays 60.

- [ ] **Step 3: Write the minimal implementation**

Move the shot count into the magazine capacity and set the carried count to one, only when
the document still carries the old shape (`quantity > 1` and no clip capacity). Guard on that
condition so the patch stays idempotent.

- [ ] **Step 4: Apply the patch and confirm the weights**

Foundry must be closed. Run `node tools/patch-dark-heresy.mjs`, then query the pack for any
ammunition whose `quantity * weight` still exceeds 5 kg and list what remains.

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 488 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add tools/lib/dark-heresy-fixes.mjs tests/ammunition-weight.test.mjs packs/dark-heresy
git commit -m "Stop counting a magazine's shots as carried magazines

Ammunition stored shots-per-clip in quantity, which the encumbrance sum reads
as how many you carry, so one lasgun cell weighed 24 kg.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Ammunition declares what it fits

With weapon types in place (Task 3), ammunition can finally say what it fits. All 110
ammunition items ship with empty `weaponTypes` and `weaponClasses`, which
`ammunitionFitsWeapon` reads as "fits everything".

**Files:**
- Modify: `tools/lib/dark-heresy-fixes.mjs`
- Create: `tests/ammunition-fit.test.mjs`

**Interfaces:**
- Consumes: `WEAPON_TYPES`, `classifyWeapon` from Task 2.
- Produces: `fixDocument` sets `system.weaponTypes` on ammunition documents.

- [ ] **Step 1: Write the failing test**

```javascript
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixDocument} from '../tools/lib/dark-heresy-fixes.mjs';

const ammo = name => ({type: 'ammunition', name, system: {weaponTypes: []}});

test('a lasgun cell fits las weapons', () => {
    assert.deepEqual(fixDocument(ammo('Standard Lasgun Cell')).doc.system.weaponTypes, ['las']);
});

test('a bolt magazine fits bolt weapons', () => {
    assert.deepEqual(fixDocument(ammo('Standard Bolt Magazine')).doc.system.weaponTypes, ['bolt']);
});

test('ammunition whose weapon cannot be named stays universal', () => {
    assert.deepEqual(fixDocument(ammo('Purity Bolts')).doc.system.weaponTypes, []);
});
```

Confirm the third case against the pack before asserting it: if "Purity Bolts" is in fact
bolt ammunition, choose a genuinely ambiguous name for the universal case.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/ammunition-fit.test.mjs`
Expected: FAIL — `weaponTypes` stays empty.

- [ ] **Step 3: Write the minimal implementation**

Classify ammunition by the weapon name embedded in its own name, reusing `classifyWeapon`.
Leave `weaponTypes` empty when nothing matches: empty means universal, which is the safe
default for a round the patch cannot place.

- [ ] **Step 4: Apply the patch and measure coverage**

Foundry must be closed. Run `node tools/patch-dark-heresy.mjs` and record how many of the 110
ammunition items now declare a type.

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 491 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add tools/lib/dark-heresy-fixes.mjs tests/ammunition-fit.test.mjs packs/dark-heresy
git commit -m "Let ammunition say which weapons it fits

All 110 rounds shipped with empty compatibility, which the matcher reads as
fits-everything. Rounds the patch cannot place stay universal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Reloading finds a compatible round

`_reloadWeapon` resolves only a pre-set `weapon.system.ammunitionId` and never searches the
inventory, which is why the reporter's lasgun would not reload and why tagging the ammunition
did not help. With Tasks 3 and 16 landed, a search can succeed.

**Files:**
- Modify: `script/dark-heresy.js:3576-3650` (`_reloadWeapon`)
- Create: `tests/reload-selection.test.mjs`

**Interfaces:**
- Consumes: `ammunitionFitsWeapon`.
- Produces: `_reloadWeapon` falls back to the first compatible carried round when
  `ammunitionId` is unset, and reports `reason: "no_compatible_ammunition"` when none fits.

- [ ] **Step 1: Write the failing test**

Assert that a lasgun with no `ammunitionId` and a Standard Lasgun Cell in the inventory
reloads; that a lasgun with only bolt rounds carried fails with
`reason: "no_compatible_ammunition"`; and that an explicit `ammunitionId` still wins over the
search.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/reload-selection.test.mjs`
Expected: FAIL — the first case returns `reason: "no_ammunition"`.

- [ ] **Step 3: Write the minimal implementation**

When `ammunitionRef` is empty, search `actor.items` for ammunition satisfying
`DarkHeresyUtil.ammunitionFitsWeapon(item, weapon)` with a quantity above zero, and use the
first match. Keep the explicit reference as the priority path.

- [ ] **Step 4: Fix the empty-weapon reload prompt**

The feedback reports that the reload prompt claims no ammunition is available, then reloads
anyway, decrements the chosen round and applies none of its effects. Task 1 assigns a
verdict; if `CONFIRMED`, fix it here so the prompt's claim and the outcome agree, and add a
test covering "prompt says none available" implying "nothing is consumed".

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 495 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add script/dark-heresy.js tests/reload-selection.test.mjs
git commit -m "Reload from the ammunition the character is carrying

Reloading only ever resolved a pre-set ammunitionId, so a lasgun with cells
in the pack refused to reload and tagging the ammunition could not help.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: The missing talents

Untouchable, Inquisitor and the Sisters of Battle talents are absent from the `dark-heresy`
pack — confirmed by a query returning no match across its 774 items.

**Files:**
- Modify: `tools/lib/dark-heresy-fixes.mjs`
- Create: `tests/missing-talents.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: an exported `MISSING_TALENTS` array the patch script adds to the pack.

- [ ] **Step 1: Read the talents from the books**

Use `pdf_search` to find each talent's tier, prerequisites, aptitudes and description. Record
the page for each; the entries carry `system.source` as
`"Dark Heresy Second Edition, p. NN"`.

- [ ] **Step 2: Write the failing test**

Assert that `MISSING_TALENTS` contains each expected talent name, that every entry has a
non-empty `system.source` matching `/, p\. \d+$/`, and that every entry declares a tier and
prerequisites.

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test tests/missing-talents.test.mjs`
Expected: FAIL — export missing.

- [ ] **Step 4: Write the minimal implementation**

Add the talent documents and have `patch-dark-heresy.mjs` insert any that the pack lacks,
keyed by name so a re-run does not duplicate them. Reuse the deterministic id derivation from
`tools/build-items.mjs` so ids are stable across rebuilds.

- [ ] **Step 5: Apply the patch and confirm**

Foundry must be closed. Run `node tools/patch-dark-heresy.mjs`, then query the pack for each
talent by name.

- [ ] **Step 6: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 499 tests, 0 fail; no syntax output.

- [ ] **Step 7: Commit**

```bash
git add tools/lib/dark-heresy-fixes.mjs tools/patch-dark-heresy.mjs tests/missing-talents.test.mjs packs/dark-heresy
git commit -m "Add the talents the pack never shipped

Untouchable, Inquisitor and the Sisters of Battle talents were absent from
all 774 items. Each entry carries its book page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 19: The remaining interface reports

Six reports are cosmetic or could not be settled by reading code. They are grouped because
each is small and none blocks another.

**Files:**
- Modify: `css/dark-heresy.css:4036-4044` (the armour total box)
- Modify: the suppression difficulty template
- Modify: `template/sheet/item/effects.hbs:1` (the item-sheet effect category)
- Create: `tests/armour-display.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: no new exports.

- [ ] **Step 1: Armour values of 10 or more**

`.total` is a fixed 52x52 box at `--dh-text-xl`. Two digits overflow it. Let the box grow with
its content (`min-width` instead of `width`, with horizontal padding) rather than shrinking
the font, and add a test asserting the stylesheet no longer pins a fixed `width` on `.total`.

- [ ] **Step 2: The suppression difficulty dropdown**

The options read "Challenging" where the rest of the system reads "Challenging (+0)". Find
the template building that list and reuse the same localisation keys the other difficulty
dropdowns use.

- [ ] **Step 3: Effects added on an item sheet are always passive**

`template/sheet/item/effects.hbs:1` passes `category="passive"` unconditionally, so an item
sheet cannot create a temporary effect. The actor sheet passes the right category and
`_onEffectCreate` reads it correctly — Foundry v14's duration schema is `{value, units}` and
`isTemporary` is true for a finite `value`, so the handler is not at fault. Offer the three
categories on the item sheet the way the actor sheet does.

- [ ] **Step 4: Record what still needs a live reproduction**

Journal text colour and font persistence, and passive effects not reaching Perception, cannot
be settled from source. Append a `## Needs Live Reproduction` section to the spec naming each,
what was ruled out, and the exact steps a tester should follow.

- [ ] **Step 5: Run the tests and the syntax gate**

Run: `node --test "tests/*.test.mjs"` then `node --check script/dark-heresy.js`
Expected: 500 tests, 0 fail; no syntax output.

- [ ] **Step 6: Commit**

```bash
git add css/dark-heresy.css template tests/armour-display.test.mjs docs/superpowers/specs/2026-09-12-feedback-triage-design.md
git commit -m "Fix the interface reports and record what needs a live repro

Armour values of ten or more fit their box, the suppression dropdown shows
its modifiers, and an item sheet can create a temporary effect. The reports
that cannot be settled from source are written down with repro steps.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage.** Every confirmed defect in the spec maps to a task: 1 -> Task 7, 2 -> Task 4,
3 -> Task 5, 4 -> Task 9, 5 -> Task 8, 6 -> Task 6, 7 -> Task 11, 8 -> Task 14, 9 -> Task 10,
10 -> Task 18, 11 -> Tasks 2 and 3, 12 -> Task 16, 13 -> Task 15, 14 -> Task 12, 15 -> Task 13.
The spec's twelve untriaged items are Task 1. The `NEEDS-REPRO` items are Task 19 step 4. The
out-of-scope new mechanics are deliberately absent and get their own plan.

**Ordering.** The spec's causal chain is honoured: weapon types (Tasks 2-3) precede ammunition
compatibility (Task 16), which precedes reload selection (Task 17).

**Known risk.** Tasks 3, 15, 16 and 18 write to the LevelDB pack and therefore require Foundry
to be closed. Tasks 1, 2, 4-14, 17 and 19 do not.
