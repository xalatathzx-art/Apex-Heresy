# Character Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a guided character builder that creates a playable Dark Heresy 2 acolyte end to end, on an engine that the other four books plug into without rework.

**Architecture:** One new item type `origin` holds every creation-step block of every book. Pure ES modules under `script/creation/` do the reasoning (schema, grant resolution, dice, ruleset step lists) and are unit-tested with `node:test`; a thin Foundry-coupled layer applies grants to an actor, tags everything for rollback and renders an `ApplicationV2` wizard whose step list comes from the ruleset definition. Option data is authored in `packs-src/origins/` and built into a compendium with the existing `tools/build-items.mjs`.

**Tech Stack:** JavaScript ES modules, Foundry VTT 14.365 (`ApplicationV2` + `HandlebarsApplicationMixin`), Node 24 `node:test`, Handlebars, LevelDB packs via `classic-level`.

**Spec:** `docs/character-creation-spec.md`

## Global Constraints

- All code, comments, data, documentation and UI strings in this feature are **English**. The Russian comments elsewhere in the repo are pre-existing; do not add more.
- `script/dark-heresy.js` is UTF-8 with a BOM and mostly CRLF line endings. Edit it with Python (`io.open(path, encoding='utf-8-sig', newline='')`), write `\r\n` for new lines inside that file, assert the number of pattern matches before writing, and run `node --check script/dark-heresy.js` afterwards.
- New logic goes in **new files** under `script/creation/`, following the existing `script/environment.mjs` (Foundry-coupled) / `script/environment-data.mjs` (pure, testable) split. Do not grow `script/dark-heresy.js` beyond the registration lines each task names.
- Test command for the whole suite: `node --test "tests/*.test.mjs"` — the glob must be quoted. The suite is green at 59 tests before this plan starts; it must be green after every task.
- Compendium packs can only be **written** while the Foundry desktop app is closed (LevelDB `LOCK`). Every task before Task 17 must therefore run the builder with `--check` only.
- Characteristic keys are exactly the ten in `template.json` → `Actor.templates.characteristics`: `weaponSkill`, `ballisticSkill`, `strength`, `toughness`, `agility`, `intelligence`, `perception`, `willpower`, `fellowship`, `influence`.
- Skill keys are exactly the twenty-eight in `template.json` → `Actor.templates.skills.skills`. Skill training level is the existing `advance` scale: `-20` untrained, `0` known, `10` and `20` trained.
- Book text is extracted with the **pdf-mcp** plugin (`pdf_search`, `pdf_read_pages`). Do not write local PDF-parsing scripts.
- Every entry written from a book carries `system.source` in the form `"Dark Heresy Second Edition, p. 32"`, and the text is the book's wording, not a paraphrase.
- Commit after every task. Branch: `codex/v14-modernization` (current). Do not push.

## Loop instructions

An autonomous loop works this plan. Each iteration:

1. Open this file. The task for the iteration is the **first `### Task N:` heading that does
   not end in `— DONE`**. Read its Files block, its Interfaces block and every step.
2. Implement it test-first: write the failing test in `tests/`, run it and confirm it fails
   for the intended reason, write the smallest implementation, confirm it passes.
3. Verify: `node --test "tests/*.test.mjs"` green, `node --check script/dark-heresy.js` clean,
   `node tools/build-items.mjs origins --check` with no errors.
4. `git add` the files the task names and commit with an English message ending in the
   Co-Authored-By line this repo uses.
5. Append `— DONE` to that task's heading here, and add a Journal line saying what was built
   and what reading the book or the code changed.

Stop conditions and things the loop must not do:

- **Task 17 is out of scope for the loop.** Building a pack needs Foundry closed and live
  verification needs it open; both are the user's hands. The loop ends after Task 16.
- Never build a pack. `--check` only — Foundry holds a LevelDB `LOCK`.
- Book text comes from **pdf-mcp** (`pdf_search`, `pdf_read_pages`) and nowhere else. Every
  compendium entry carries `system.source` with a book page, and the text is the book's
  wording rather than a paraphrase.
- Comments inside `script/creation/*.mjs` are written in Russian, matching the files already
  there. Tests, compendium data, language strings and commit messages are English.
- **Task 14's `_originModifier` sketch is wrong — drop it.** A Dark Heresy characteristic
  modifier is already inside the generated value, both when rolling and under point buy
  (see the Journal entry for Task 8). Adding it on top counts it twice.

The loop's completion claim, `DH2 BUILDER CODE COMPLETE`, is true only when Tasks 9 through
16 all read `— DONE`, the three verification commands above pass, and nothing is uncommitted.

## Progress

Tasks are worked in order. A task is DONE when its marker says so in its heading.
The first heading without `— DONE` is the next task.

**Closed:** Tasks 0-8. 128 tests pass (`node --test "tests/*.test.mjs"`),
`node --check script/dark-heresy.js` is clean, and all four item packs check clean.

**Journal**

- Task 0 exposed a live defect: `Dh.rulesetFor` decided the rules from the actor type
  alone, so Rogue Trader, Only War and Deathwatch characters were silently played by
  Dark Heresy rules. `system.ruleset` now wins over the type.
- Task 7 fixed the builder: an empty object in `template.json` now means a free-form map,
  not a closed shape, so origin characteristic modifiers are not flagged as unknown fields.
- Task 8 settled what a characteristic modifier IS. In Dark Heresy it is a generation rule,
  not a number (p. 31): "+" rolls 3d10 keeping the best two, point buy starts at 30. The
  modifier is already inside the generated value. **Task 14 must not add it again** - the
  `_originModifier` sketch in that task is wrong and has to be dropped. `RULESET_DEFS[x]
  .characteristicModifiers` records this, and `auditedRulesets()` returns only `dh2`.
- Editing `script/dark-heresy.js` with Python: read AND write with plain `utf-8`, never
  `utf-8-sig`. The file carries a BOM in the MIDDLE (the imports were prepended before it);
  writing with `utf-8-sig` adds a second one at the front and the test harness stops
  stripping the import lines.
- `tests/helpers/system.mjs` runs the system in a `node:vm` realm. `assert.deepEqual`
  against a host-realm object fails on prototypes with a misleading message; spread both
  sides before comparing.

---

### Task 0: A character says which book it belongs to — DONE

**Files:**
- Modify: `template.json` (add `ruleset` to the `acolyte` and `heretic` types)
- Modify: `script/dark-heresy.js` (`Dh.rulesets`, `Dh.rulesetFor`)
- Modify: `template/sheet/actor/partial/` — the header partial the acolyte and heretic sheets share
- Modify: `lang/en.json`
- Test: `tests/ruleset-profile.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `Dh.rulesets.rt`, `Dh.rulesets.ow`, `Dh.rulesets.dw`; `Dh.rulesetFor(actor)` reads `actor.system.ruleset` before the actor type.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/ruleset-profile.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

test('every supported book has a ruleset profile', () => {
    const system = loadSystem();
    const rulesets = system.get('Dh.rulesets');
    assert.deepEqual(Object.keys(rulesets).sort(), ['bc', 'dh2', 'dw', 'ow', 'rt']);
    for (const [key, profile] of Object.entries(rulesets)) {
        assert.equal(profile.id, key);
        for (const field of ['fatigue', 'psychic', 'corruption', 'insanity', 'bloodLoss', 'toxic', 'righteousFury'])
            assert.ok(profile[field], `${key} has no ${field}`);
    }
});

test('an explicit ruleset on the character wins over the actor type', () => {
    const system = loadSystem();
    const rulesetFor = system.get('Dh.rulesetFor');
    assert.equal(rulesetFor({type: 'acolyte', system: {ruleset: 'dw'}}).id, 'dw');
    assert.equal(rulesetFor({type: 'heretic', system: {ruleset: 'rt'}}).id, 'rt');
});

test('the actor type still decides when the character names no ruleset', () => {
    const system = loadSystem();
    const rulesetFor = system.get('Dh.rulesetFor');
    assert.equal(rulesetFor({type: 'acolyte', system: {ruleset: ''}}).id, 'dh2');
    assert.equal(rulesetFor({type: 'heretic', system: {}}).id, 'bc');
    assert.equal(rulesetFor({type: 'npc', system: {ruleset: 'bc'}}).id, 'bc');
});

test('an unknown ruleset falls back instead of returning undefined', () => {
    const system = loadSystem();
    assert.equal(system.get('Dh.rulesetFor')({type: 'acolyte', system: {ruleset: 'dh9'}}).id, 'dh2');
});

test('both character types carry the ruleset field', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    for (const type of ['acolyte', 'heretic']) assert.equal(data.Actor[type].ruleset, '');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/ruleset-profile.test.mjs"`
Expected: FAIL — `Dh.rulesets` has only `bc` and `dh2`, and an explicit ruleset loses to the type.

- [ ] **Step 3: Register the three missing profiles**

Rogue Trader, Only War and Deathwatch have not been audited rule by rule, so they inherit the
Dark Heresy mechanics and differ only in identity. Saying so in the code is the point: a
character can state which book it comes from before anyone has done that audit, and each of
the three gets its real profile in its own follow-up plan.

In `script/dark-heresy.js`, after the `bc` profile inside `Dh.rulesets`:

```javascript
    // Rogue Trader, Only War and Deathwatch share Dark Heresy's mechanics until each book's
    // differences are audited. They are registered separately so a character can already name
    // its book, and so the audit changes one profile instead of hunting down type checks.
    rt: { ...null, id: "rt", label: "RULESET.RT" },
    ow: { ...null, id: "ow", label: "RULESET.OW" },
    dw: { ...null, id: "dw", label: "RULESET.DW" }
```

`{...null}` is not valid intent here — build them from the Dark Heresy profile instead, after
the object literal closes:

```javascript
for (const [id, label] of [["rt", "RULESET.RT"], ["ow", "RULESET.OW"], ["dw", "RULESET.DW"]])
    Dh.rulesets[id] = foundry.utils.mergeObject(foundry.utils.deepClone(Dh.rulesets.dh2), {id, label});
```

The test harness stubs `foundry.utils.deepClone` and `mergeObject`; check
`tests/helpers/system.mjs` and use `structuredClone` plus a plain spread if the stubbed
`mergeObject` is too shallow for this.

- [ ] **Step 4: Let the character name its own ruleset**

Replace the opening of `Dh.rulesetFor`:

```javascript
Dh.rulesetFor = function(actor) {
    // The character names its own book. This wins over the actor type, because the type only
    // distinguishes Dark Heresy from Black Crusade and there are five books — a Rogue Trader
    // or Deathwatch character is an acolyte too, and must not be played by Dark Heresy rules
    // just because of the sheet it was created on.
    const own = actor?.system?.ruleset;
    if (own && Dh.rulesets[own]) return Dh.rulesets[own];
    if (actor?.type === "heretic") return Dh.rulesets.bc;
    if (actor?.type === "acolyte") return Dh.rulesets.dh2;
    let world = "dh2";
    try {
        world = game.settings.get("dark-heresy", "ruleset") || "dh2";
    } catch (err) {
        // Settings are not registered yet during early data preparation — fall back to DH2.
    }
    return Dh.rulesets[world] ?? Dh.rulesets.dh2;
};
```

Update the doc comment above it: the type is now the fallback, not the decision.

- [ ] **Step 5: Add the field and the selector**

In `template.json`, add `"ruleset": ""` to the `acolyte` and `heretic` types, next to the other
top-level properties.

Add a selector to the header the two character sheets share. Find which partial under
`template/sheet/actor/partial/` both `acolyte.hbs` and `heretic.hbs` include for the name and
type line, and add there:

```handlebars
<div class="form-group">
    <label>{{localize "RULESET.LABEL"}}</label>
    <select name="system.ruleset">
        <option value="">{{localize "RULESET.BY_TYPE"}}</option>
        {{selectOptions system.ruleset (config "originRulesets") localize=true}}
    </select>
</div>
```

`Dh.originRulesets` is added in Task 6; until then, point the helper at a literal list of the
five keys, or move the `Dh.originRulesets` block from Task 6 forward into this task and drop
it from there.

Add to `lang/en.json`, merging into the `RULESET` block:

```json
"RULESET": {"LABEL": "Rulebook", "BY_TYPE": "— from the sheet type —"}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test "tests/ruleset-profile.test.mjs"`
Expected: PASS, 5 tests.

- [ ] **Step 7: Run the whole suite**

Run: `node --test "tests/*.test.mjs" && node --check script/dark-heresy.js`
Expected: PASS. Existing tests that call `Dh.rulesetFor` with a bare `{type: "acolyte"}` still
get Dark Heresy, because those actors name no ruleset.

- [ ] **Step 8: Commit**

```bash
git add template.json script/dark-heresy.js lang/en.json template/sheet/actor tests/ruleset-profile.test.mjs
git commit -m "Let a character name its rulebook instead of inferring it from the sheet type"
```

---

### Task 1: The `origin` item type and its schema module — DONE

**Files:**
- Modify: `template.json` (add `origin` to `Item.types` and an `Item.origin` block)
- Create: `script/creation/origin-data.mjs`
- Test: `tests/origin-data.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `RULESETS: string[]` — `["dh2","rt","ow","bc","dw"]`
  - `STAGES: Record<string, string[]>` — ruleset key → ordered stage keys
  - `CHARACTERISTIC_KEYS: string[]`, `SKILL_KEYS: string[]`
  - `normaliseOrigin(source: object): object` — fills every optional field with its empty default, leaves unknown keys untouched
  - `validateOrigin(source: object): string[]` — human-readable problems, empty array when valid

- [ ] **Step 1: Write the failing test**

```javascript
// tests/origin-data.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULESETS, STAGES, CHARACTERISTIC_KEYS, SKILL_KEYS,
        normaliseOrigin, validateOrigin} from '../script/creation/origin-data.mjs';

const base = {ruleset: 'dh2', stage: 'homeWorld', key: 'feralWorld', order: 1};

test('every ruleset declares an ordered stage list', () => {
    assert.deepEqual(RULESETS, ['dh2', 'rt', 'ow', 'bc', 'dw']);
    for (const ruleset of RULESETS) assert.ok(STAGES[ruleset].length > 0, ruleset);
    assert.deepEqual(STAGES.dh2, ['homeWorld', 'background', 'role', 'divination']);
});

test('normalising fills empty defaults without dropping authored content', () => {
    const filled = normaliseOrigin({...base, characteristics: {strength: 5}, note: 'keep me'});
    assert.deepEqual(filled.characteristics, {strength: 5});
    assert.deepEqual(filled.grants.talents, []);
    assert.deepEqual(filled.choices, []);
    assert.equal(filled.wounds.formula, '');
    assert.equal(filled.note, 'keep me');
});

test('normalising returns independent objects', () => {
    const one = normaliseOrigin({...base}), two = normaliseOrigin({...base});
    one.grants.talents.push({name: 'Nerves of Steel'});
    assert.deepEqual(two.grants.talents, []);
});

test('unknown ruleset, stage, characteristic and skill keys are reported', () => {
    assert.deepEqual(validateOrigin(base), []);
    assert.match(validateOrigin({...base, ruleset: 'dh3'})[0], /ruleset/);
    assert.match(validateOrigin({...base, stage: 'planet'})[0], /stage/);
    assert.match(validateOrigin({...base, characteristics: {luck: 5}})[0], /luck/);
    assert.match(validateOrigin({...base, grants: {skills: [{key: 'cooking', advance: 0}]}})[0], /cooking/);
});

test('a skill advance outside the actor scale is reported', () => {
    assert.match(validateOrigin({...base, grants: {skills: [{key: 'survival', advance: 5}]}})[0], /advance/);
});

test('a choice must carry a key, a kind and at least one option', () => {
    assert.match(validateOrigin({...base, choices: [{type: 'one', options: []}]}).join(' '), /key/);
    assert.match(validateOrigin({...base, choices: [{key: 'a', type: 'two', options: [{label: 'x'}]}]})[0], /type/);
});

test('the key vocabularies match template.json', () => {
    const data = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.deepEqual(CHARACTERISTIC_KEYS, Object.keys(data.Actor.templates.characteristics.characteristics));
    assert.deepEqual(SKILL_KEYS, Object.keys(data.Actor.templates.skills.skills));
});
```

This last test is the one that stops the vocabulary drifting away from the actor model: if a
characteristic or skill is ever added to `template.json`, it fails until the module lists it too.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/origin-data.test.mjs"`
Expected: FAIL — `Cannot find module '../script/creation/origin-data.mjs'`

- [ ] **Step 3: Write the module**

```javascript
// script/creation/origin-data.mjs
// Schema vocabulary and validation for the `origin` item type. Pure: no Foundry globals,
// so the creation rules can be tested without booting a world.

export const RULESETS = ["dh2", "rt", "ow", "bc", "dw"];

export const STAGES = {
    dh2: ["homeWorld", "background", "role", "divination"],
    rt:  ["homeWorld", "birthright", "lure", "trials", "motivation", "career"],
    ow:  ["regimentOrigin", "regimentCommander", "regimentType", "doctrine",
          "equipmentDoctrine", "standardKit", "speciality"],
    bc:  ["race", "archetype", "pride", "disgrace", "motivation"],
    dw:  ["chapter", "speciality"]
};

export const CHARACTERISTIC_KEYS = ["weaponSkill", "ballisticSkill", "strength", "toughness",
    "agility", "intelligence", "perception", "willpower", "fellowship", "influence"];

export const SKILL_KEYS = ["acrobatics", "athletics", "awareness", "charm", "command", "commerce",
    "commonLore", "deceive", "dodge", "forbiddenLore", "inquiry", "interrogation", "intimidate",
    "linguistics", "logic", "medicae", "navigate", "operate", "parry", "psyniscience",
    "scholasticLore", "scrutiny", "security", "sleightOfHand", "stealth", "survival",
    "techUse", "trade"];

/** Skill training levels the actor model understands. */
export const ADVANCES = [-20, 0, 10, 20];

export const CHOICE_TYPES = ["one", "many", "target"];

const EMPTY_GRANTS = {
    skills: [], specialities: [], talents: [], traits: [], equipment: [],
    wounds: 0, corruption: 0, insanity: 0, influence: 0
};

/** Fill every optional field with its empty default; authored values win, unknown keys survive. */
export function normaliseOrigin(source = {}) {
    const out = structuredClone(source);
    out.ruleset ??= "";
    out.stage ??= "";
    out.key ??= "";
    out.order ??= 0;
    out.cost ??= 0;
    out.characteristics ??= {};
    out.characteristicChoices ??= [];
    out.aptitudes ??= [];
    out.wounds = {formula: "", bonus: 0, doubleToughnessBonus: false, ...(out.wounds ?? {})};
    out.fate = {value: 0, blessing: 0, formula: "", ...(out.fate ?? {})};
    out.grants = {...structuredClone(EMPTY_GRANTS), ...(out.grants ?? {})};
    out.choices ??= [];
    out.bonus = {name: "", description: "", ...(out.bonus ?? {})};
    out.requires ??= null;
    out.adjacency ??= [];
    out.recommended ??= [];
    out.description ??= "";
    out.source ??= "";
    return out;
}

/** Everything wrong with an origin, in words. Empty array means it is usable. */
export function validateOrigin(source = {}) {
    const o = normaliseOrigin(source);
    const problems = [];
    if (!RULESETS.includes(o.ruleset)) problems.push(`unknown ruleset "${o.ruleset}"`);
    else if (!STAGES[o.ruleset].includes(o.stage)) problems.push(`unknown stage "${o.stage}" for ruleset ${o.ruleset}`);
    if (!o.key) problems.push("missing key");

    for (const key of Object.keys(o.characteristics))
        if (!CHARACTERISTIC_KEYS.includes(key)) problems.push(`unknown characteristic "${key}"`);
    for (const choice of o.characteristicChoices) {
        for (const key of choice.from ?? []) if (!CHARACTERISTIC_KEYS.includes(key)) problems.push(`unknown characteristic "${key}"`);
        if (!(choice.pick > 0)) problems.push(`characteristic choice "${choice.label ?? ""}" picks nothing`);
    }

    problems.push(...grantProblems(o.grants, ""));
    for (const choice of o.choices) {
        const where = `choice "${choice.key ?? ""}"`;
        if (!choice.key) problems.push("a choice has no key");
        if (!CHOICE_TYPES.includes(choice.type)) problems.push(`${where} has unknown type "${choice.type}"`);
        if (choice.type === "one" && !(choice.options ?? []).length) problems.push(`${where} has no options`);
        for (const option of choice.options ?? []) problems.push(...grantProblems(option.grants ?? {}, `${where}: `));
    }
    return problems;
}

function grantProblems(grants, prefix) {
    const problems = [];
    for (const skill of grants.skills ?? []) {
        if (!SKILL_KEYS.includes(skill.key)) problems.push(`${prefix}unknown skill "${skill.key}"`);
        if (!ADVANCES.includes(skill.advance)) problems.push(`${prefix}skill "${skill.key}" has advance ${skill.advance}, expected one of ${ADVANCES.join(", ")}`);
    }
    for (const spec of grants.specialities ?? []) {
        if (!SKILL_KEYS.includes(spec.key)) problems.push(`${prefix}unknown skill "${spec.key}"`);
        if (!spec.name) problems.push(`${prefix}speciality of "${spec.key}" has no name`);
    }
    for (const talent of grants.talents ?? []) if (!talent.name) problems.push(`${prefix}a talent has no name`);
    for (const trait of grants.traits ?? []) if (!trait.name) problems.push(`${prefix}a trait has no name`);
    for (const gear of grants.equipment ?? []) if (!gear.name) problems.push(`${prefix}an equipment entry has no name`);
    return problems;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tests/origin-data.test.mjs"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add the item type to `template.json`**

Add `"origin"` to the end of `Item.types`, and this block alongside the other item type blocks:

```json
"origin": {
  "templates": ["itemDescription"],
  "ruleset": "dh2",
  "stage": "homeWorld",
  "order": 0,
  "key": "",
  "cost": 0,
  "characteristics": {},
  "characteristicChoices": [],
  "aptitudes": [],
  "wounds": {"formula": "", "bonus": 0, "doubleToughnessBonus": false},
  "fate": {"value": 0, "blessing": 0, "formula": ""},
  "grants": {"skills": [], "specialities": [], "talents": [], "traits": [], "equipment": [],
             "wounds": 0, "corruption": 0, "insanity": 0, "influence": 0},
  "choices": [],
  "bonus": {"name": "", "description": ""},
  "requires": null,
  "adjacency": [],
  "recommended": []
}
```

- [ ] **Step 6: Run the whole suite**

Run: `node --test "tests/*.test.mjs"`
Expected: PASS. `tests/data-models.test.mjs` already asserts that every shipped type resolves — it now covers `origin` too.

- [ ] **Step 7: Commit**

```bash
git add template.json script/creation/origin-data.mjs tests/origin-data.test.mjs
git commit -m "Add the origin item type and its schema vocabulary"
```

---

### Task 2: Resolving an origin plus player picks into a flat grant plan — DONE

**Files:**
- Create: `script/creation/grant-data.mjs`
- Test: `tests/grant-data.test.mjs`

**Interfaces:**
- Consumes: `normaliseOrigin`, `CHARACTERISTIC_KEYS` from `script/creation/origin-data.mjs`.
- Produces:
  - `emptyPlan(): Plan`
  - `resolveGrantPlan(origin: object, picks: object, context?: {intelligenceBonus?: number}): {plan: Plan, problems: string[]}`
  - `mergePlans(...plans: Plan[]): Plan`
  - `Plan` is `{characteristics: Record<string, number>, skills: [], specialities: [], talents: [], traits: [], equipment: [], aptitudes: string[], duplicates: {kind: string, name: string}[], wounds: number, corruption: number, insanity: number, influence: number}`. `duplicates` records a grant that arrived twice — Rogue Trader turns those into Skill Mastery and Talented, and the other books refund experience for them.
  - `picks` is `{characteristicChoices: number[][], one: Record<string, number>, many: Record<string, {key: string, name: string}[]>, target: Record<string, {kind: string, value: string}>}`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/grant-data.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan, resolveGrantPlan, mergePlans} from '../script/creation/grant-data.mjs';

const feral = {
    ruleset: 'dh2', stage: 'homeWorld', key: 'feralWorld', order: 1,
    characteristics: {strength: 5, toughness: 5, fellowship: -5},
    aptitudes: ['Toughness'],
    grants: {talents: [{name: 'Jaded'}], skills: [{key: 'survival', advance: 0}]}
};

test('a plan with no picks is the origin itself', () => {
    const {plan, problems} = resolveGrantPlan(feral, {});
    assert.deepEqual(problems, []);
    assert.deepEqual(plan.characteristics, {strength: 5, toughness: 5, fellowship: -5});
    assert.deepEqual(plan.talents, [{name: 'Jaded'}]);
    assert.deepEqual(plan.aptitudes, ['Toughness']);
});

test('a characteristic choice adds its value to each picked characteristic', () => {
    const origin = {...feral, characteristics: {}, characteristicChoices: [
        {label: 'Any two', pick: 2, value: 3, from: ['perception', 'strength', 'toughness']}
    ]};
    const {plan} = resolveGrantPlan(origin, {characteristicChoices: [[0, 2]]});
    assert.deepEqual(plan.characteristics, {perception: 3, toughness: 3});
});

test('picking fewer or repeating a characteristic is reported', () => {
    const origin = {...feral, characteristicChoices: [{label: 'Any two', pick: 2, value: 3, from: ['perception', 'strength']}]};
    assert.match(resolveGrantPlan(origin, {characteristicChoices: [[0]]}).problems[0], /two/i);
    assert.match(resolveGrantPlan(origin, {characteristicChoices: [[0, 0]]}).problems[0], /twice|repeat/i);
});

test('a "one" choice contributes only the picked option', () => {
    const origin = {...feral, choices: [{key: 'omnissiah', type: 'one', label: "Omnissiah's Chosen", options: [
        {label: 'Technical Knock', grants: {talents: [{name: 'Technical Knock'}]}},
        {label: 'Weapon-Tech', grants: {talents: [{name: 'Weapon-Tech'}]}}
    ]}]};
    const {plan} = resolveGrantPlan(origin, {one: {omnissiah: 1}});
    assert.deepEqual(plan.talents.map(t => t.name), ['Jaded', 'Weapon-Tech']);
});

test('an unanswered "one" choice is reported instead of silently defaulting', () => {
    const origin = {...feral, choices: [{key: 'omnissiah', type: 'one', label: 'x', options: [{label: 'a'}, {label: 'b'}]}]};
    assert.match(resolveGrantPlan(origin, {}).problems[0], /omnissiah/);
});

test('a "many" choice counts by intelligence bonus and rejects the wrong number', () => {
    const origin = {...feral, choices: [
        {key: 'lore', type: 'many', label: 'Lore', count: 'intelligenceBonus', groups: ['commonLore']}
    ]};
    const two = [{key: 'commonLore', name: 'Imperium'}, {key: 'commonLore', name: 'Tech'}];
    const ok = resolveGrantPlan(origin, {many: {lore: two}}, {intelligenceBonus: 2});
    assert.deepEqual(ok.problems, []);
    assert.deepEqual(ok.plan.specialities, [
        {key: 'commonLore', name: 'Imperium', advance: 0},
        {key: 'commonLore', name: 'Tech', advance: 0}
    ]);
    assert.match(resolveGrantPlan(origin, {many: {lore: two}}, {intelligenceBonus: 3}).problems[0], /3/);
});

test('a "target" choice names the talent and keeps the target structurally', () => {
    const origin = {...feral, choices: [
        {key: 'hatred', type: 'target', label: 'Hatred', talentTemplate: 'Hatred ({v})'}
    ]};
    const {plan} = resolveGrantPlan(origin, {target: {hatred: {kind: 'faction', value: 'Orks'}}});
    const hatred = plan.talents.find(t => t.name === 'Hatred (Orks)');
    assert.deepEqual(hatred.targets, [{kind: 'faction', value: 'Orks'}]);
});

test('merging plans sums characteristics and keeps the higher skill advance', () => {
    const a = {...emptyPlan(), characteristics: {strength: 5}, skills: [{key: 'survival', advance: 0}], wounds: 3};
    const b = {...emptyPlan(), characteristics: {strength: 3, toughness: 5}, skills: [{key: 'survival', advance: 10}], wounds: 2};
    const merged = mergePlans(a, b);
    assert.deepEqual(merged.characteristics, {strength: 8, toughness: 5});
    assert.deepEqual(merged.skills, [{key: 'survival', advance: 10}]);
    assert.equal(merged.wounds, 5);
});

test('merging records a duplicate talent once and reports it for the experience refund', () => {
    const a = {...emptyPlan(), talents: [{name: 'Jaded'}]};
    const merged = mergePlans(a, {...emptyPlan(), talents: [{name: 'Jaded'}]});
    assert.deepEqual(merged.talents, [{name: 'Jaded'}]);
    assert.deepEqual(merged.duplicates, [{kind: 'talent', name: 'Jaded'}]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/grant-data.test.mjs"`
Expected: FAIL — `Cannot find module '../script/creation/grant-data.mjs'`

- [ ] **Step 3: Write the module**

```javascript
// script/creation/grant-data.mjs
// An origin plus the player's answers becomes one flat plan. Pure; the plan is what the
// Foundry layer writes to an actor, and what the wizard previews before writing anything.

import {normaliseOrigin} from "./origin-data.mjs";

export function emptyPlan() {
    return {characteristics: {}, skills: [], specialities: [], talents: [], traits: [],
            equipment: [], aptitudes: [], duplicates: [],
            wounds: 0, corruption: 0, insanity: 0, influence: 0};
}

/** One origin + the answers to its choices → a plan, plus everything unanswered or impossible. */
export function resolveGrantPlan(origin, picks = {}, context = {}) {
    const o = normaliseOrigin(origin);
    const problems = [];
    const plan = emptyPlan();

    for (const [key, value] of Object.entries(o.characteristics)) addCharacteristic(plan, key, value);
    plan.aptitudes.push(...o.aptitudes);
    addGrants(plan, o.grants);

    o.characteristicChoices.forEach((choice, index) => {
        const picked = picks.characteristicChoices?.[index] ?? [];
        if (picked.length !== choice.pick) {
            problems.push(`"${choice.label}" needs ${choice.pick} characteristic(s), got ${picked.length}`);
            return;
        }
        if (new Set(picked).size !== picked.length) {
            problems.push(`"${choice.label}" picks the same characteristic twice`);
            return;
        }
        for (const index of picked) addCharacteristic(plan, choice.from[index], choice.value);
    });

    for (const choice of o.choices) {
        if (choice.type === "one") {
            const index = picks.one?.[choice.key];
            if (index == null) { problems.push(`choice "${choice.key}" is unanswered`); continue; }
            const option = choice.options[index];
            if (!option) { problems.push(`choice "${choice.key}" has no option ${index}`); continue; }
            addGrants(plan, option.grants ?? {});
        } else if (choice.type === "many") {
            const want = choice.count === "intelligenceBonus" ? (context.intelligenceBonus ?? 0) : (choice.count ?? 0);
            const got = picks.many?.[choice.key] ?? [];
            if (got.length !== want) { problems.push(`choice "${choice.key}" needs ${want} entries, got ${got.length}`); continue; }
            for (const entry of got) plan.specialities.push({key: entry.key, name: entry.name, advance: choice.advance ?? 0});
        } else if (choice.type === "target") {
            const target = picks.target?.[choice.key];
            if (!target?.value) { problems.push(`choice "${choice.key}" is unanswered`); continue; }
            plan.talents.push({name: choice.talentTemplate.replace("{v}", target.value), targets: [target]});
        }
    }
    return {plan, problems};
}

/** Combine plans from several stages: characteristics add up, the best training wins, grants dedupe. */
export function mergePlans(...plans) {
    const out = emptyPlan();
    for (const plan of plans) {
        for (const [key, value] of Object.entries(plan.characteristics ?? {})) addCharacteristic(out, key, value);
        for (const skill of plan.skills ?? []) addSkill(out, skill);
        for (const spec of plan.specialities ?? []) addSpeciality(out, spec);
        for (const talent of plan.talents ?? []) addNamed(out, "talents", "talent", talent);
        for (const trait of plan.traits ?? []) addNamed(out, "traits", "trait", trait);
        out.equipment.push(...(plan.equipment ?? []));
        for (const aptitude of plan.aptitudes ?? []) if (!out.aptitudes.includes(aptitude)) out.aptitudes.push(aptitude);
        out.duplicates.push(...(plan.duplicates ?? []));
        for (const key of ["wounds", "corruption", "insanity", "influence"]) out[key] += plan[key] ?? 0;
    }
    return out;
}

function addCharacteristic(plan, key, value) {
    if (!key) return;
    plan.characteristics[key] = (plan.characteristics[key] ?? 0) + value;
}

function addGrants(plan, grants) {
    for (const skill of grants.skills ?? []) addSkill(plan, skill);
    for (const spec of grants.specialities ?? []) addSpeciality(plan, spec);
    for (const talent of grants.talents ?? []) addNamed(plan, "talents", "talent", talent);
    for (const trait of grants.traits ?? []) addNamed(plan, "traits", "trait", trait);
    plan.equipment.push(...(grants.equipment ?? []));
    for (const key of ["wounds", "corruption", "insanity", "influence"]) plan[key] += grants[key] ?? 0;
}

function addSkill(plan, skill) {
    const existing = plan.skills.find(s => s.key === skill.key);
    if (!existing) { plan.skills.push({...skill}); return; }
    plan.duplicates.push({kind: "skill", name: skill.key});
    existing.advance = Math.max(existing.advance, skill.advance);
}

function addSpeciality(plan, spec) {
    const existing = plan.specialities.find(s => s.key === spec.key && s.name === spec.name);
    if (!existing) { plan.specialities.push({...spec}); return; }
    plan.duplicates.push({kind: "speciality", name: `${spec.key} (${spec.name})`});
    existing.advance = Math.max(existing.advance, spec.advance ?? 0);
}

function addNamed(plan, bucket, kind, entry) {
    if (plan[bucket].some(e => e.name === entry.name)) { plan.duplicates.push({kind, name: entry.name}); return; }
    plan[bucket].push({...entry});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tests/grant-data.test.mjs"`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test "tests/*.test.mjs"
git add script/creation/grant-data.mjs tests/grant-data.test.mjs
git commit -m "Resolve an origin and its player picks into a flat grant plan"
```

---

### Task 3: Characteristic generation, wounds and fate — DONE

**Files:**
- Create: `script/creation/creation-roll-data.mjs`
- Test: `tests/creation-roll-data.test.mjs`

**Interfaces:**
- Consumes: `CHARACTERISTIC_KEYS` from `script/creation/origin-data.mjs`.
- Produces:
  - `CHARACTERISTIC_METHODS: string[]` — `["roll", "rollModified", "pointBuy"]`
  - `rollExpression(method: string, modifier: number): string` — the dice formula for one characteristic
  - `POINT_BUY: {base: number, points: number, cap: number}` — `{base: 25, points: 60, cap: 40}`
  - `pointBuyProblems(values: Record<string, number>): string[]`
  - `woundsExpression(wounds: {formula, bonus, doubleToughnessBonus}, toughnessBonus: number): string`
  - `fateExpression(fate: {value, blessing, formula}): string`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/creation-roll-data.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERISTIC_METHODS, rollExpression, POINT_BUY, pointBuyProblems,
        woundsExpression, fateExpression} from '../script/creation/creation-roll-data.mjs';

test('the three book methods are offered', () => {
    assert.deepEqual(CHARACTERISTIC_METHODS, ['roll', 'rollModified', 'pointBuy']);
});

test('plain rolling ignores the modifier, modified rolling keeps two of three dice', () => {
    assert.equal(rollExpression('roll', 0), '2d10+20');
    assert.equal(rollExpression('roll', 5), '2d10+20+5');
    assert.equal(rollExpression('rollModified', 0), '2d10+20');
    assert.equal(rollExpression('rollModified', 5), '3d10kh2+20');
    assert.equal(rollExpression('rollModified', -5), '3d10kl2+20');
});

test('point buy enforces the budget and the cap', () => {
    assert.deepEqual(POINT_BUY, {base: 25, points: 60, cap: 40});
    const even = Object.fromEntries(['weaponSkill','ballisticSkill','strength','toughness','agility',
        'intelligence','perception','willpower','fellowship','influence'].map(k => [k, 31]));
    assert.deepEqual(pointBuyProblems(even), []);
    assert.match(pointBuyProblems({...even, strength: 32})[0], /61|budget/i);
    // The cap and the base are reported per characteristic, in key order, before the budget.
    assert.match(pointBuyProblems({...even, strength: 41})[0], /40|cap/i);
    assert.match(pointBuyProblems({...even, weaponSkill: 24})[0], /25|below/i);
});

test('wounds combine the book formula, a flat bonus and doubled toughness bonus', () => {
    assert.equal(woundsExpression({formula: '9+1d5', bonus: 0, doubleToughnessBonus: false}, 4), '9+1d5');
    assert.equal(woundsExpression({formula: '1d5+1', bonus: 0, doubleToughnessBonus: true}, 4), '8+1d5+1');
    assert.equal(woundsExpression({formula: '8+1d5', bonus: -1, doubleToughnessBonus: false}, 3), '8+1d5-1');
});

test('fate is a flat value unless the book rolls for it', () => {
    assert.equal(fateExpression({value: 2, blessing: 3, formula: ''}), '2');
    assert.equal(fateExpression({value: 0, blessing: 0, formula: '1d10'}), '1d10');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/creation-roll-data.test.mjs"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```javascript
// script/creation/creation-roll-data.mjs
// The dice side of creation: how a characteristic is generated, and how wounds and fate are
// spelled as roll formulas. Pure — the caller evaluates the strings with Foundry's Roll.

import {CHARACTERISTIC_KEYS} from "./origin-data.mjs";

export const CHARACTERISTIC_METHODS = ["roll", "rollModified", "pointBuy"];

export const POINT_BUY = {base: 25, points: 60, cap: 40};

/**
 * The formula for one characteristic.
 * "roll" is the flat 2d10+20 with the modifier added afterwards; "rollModified" is the
 * book's alternative where a positive modifier rolls three dice and keeps the best two,
 * and a negative one keeps the worst two.
 */
export function rollExpression(method, modifier = 0) {
    if (method === "rollModified") {
        if (modifier > 0) return "3d10kh2+20";
        if (modifier < 0) return "3d10kl2+20";
        return "2d10+20";
    }
    if (!modifier) return "2d10+20";
    return `2d10+20${modifier > 0 ? "+" : "-"}${Math.abs(modifier)}`;
}

/** Everything wrong with a point-buy spread. */
export function pointBuyProblems(values = {}) {
    const problems = [];
    let spent = 0;
    for (const key of CHARACTERISTIC_KEYS) {
        const value = values[key];
        if (typeof value !== "number") { problems.push(`${key} has no value`); continue; }
        if (value < POINT_BUY.base) problems.push(`${key} is ${value}, below the base of ${POINT_BUY.base}`);
        if (value > POINT_BUY.cap) problems.push(`${key} is ${value}, above the cap of ${POINT_BUY.cap}`);
        spent += value - POINT_BUY.base;
    }
    if (spent > POINT_BUY.points) problems.push(`spent ${spent} of a ${POINT_BUY.points} point budget`);
    return problems;
}

/** Starting wounds as a roll formula. */
export function woundsExpression(wounds = {}, toughnessBonus = 0) {
    const parts = [];
    if (wounds.doubleToughnessBonus) parts.push(String(toughnessBonus * 2));
    if (wounds.formula) parts.push(wounds.formula);
    let out = parts.join("+") || "0";
    if (wounds.bonus) out += `${wounds.bonus > 0 ? "+" : "-"}${Math.abs(wounds.bonus)}`;
    return out;
}

/** Starting fate as a roll formula. */
export function fateExpression(fate = {}) {
    return fate.formula || String(fate.value ?? 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tests/creation-roll-data.test.mjs"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test "tests/*.test.mjs"
git add script/creation/creation-roll-data.mjs tests/creation-roll-data.test.mjs
git commit -m "Add characteristic generation, wounds and fate formulas"
```

---

### Task 4: Ruleset step definitions — DONE

**Files:**
- Create: `script/creation/ruleset-data.mjs`
- Test: `tests/ruleset-data.test.mjs`

**Interfaces:**
- Consumes: `STAGES`, `RULESETS` from `script/creation/origin-data.mjs`.
- Produces:
  - `RULESET_DEFS: Record<string, {label, actorType, steps: Step[], characteristicMethods: string[]}>`
  - `Step` is `{id: string, label: string, kind: "origin"|"characteristics"|"experience"|"divination"|"finish", stage?: string, widget?: "grid"|"budget"}`
  - `stepsFor(ruleset: string): Step[]`
  - `originStepsFor(ruleset: string): Step[]` — only the `kind: "origin"` steps

- [ ] **Step 1: Write the failing test**

```javascript
// tests/ruleset-data.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RULESETS, STAGES} from '../script/creation/origin-data.mjs';
import {RULESET_DEFS, stepsFor, originStepsFor} from '../script/creation/ruleset-data.mjs';

test('every ruleset has a definition with an actor type and at least one step', () => {
    for (const ruleset of RULESETS) {
        const def = RULESET_DEFS[ruleset];
        assert.ok(def, ruleset);
        assert.ok(['acolyte', 'heretic'].includes(def.actorType), `${ruleset}: ${def.actorType}`);
        assert.ok(def.steps.length > 0, ruleset);
    }
});

test('every origin step names a stage that the ruleset declares', () => {
    for (const ruleset of RULESETS)
        for (const step of originStepsFor(ruleset))
            assert.ok(STAGES[ruleset].includes(step.stage), `${ruleset}/${step.stage}`);
});

test('step ids are unique inside a ruleset', () => {
    for (const ruleset of RULESETS) {
        const ids = stepsFor(ruleset).map(s => s.id);
        assert.equal(new Set(ids).size, ids.length, ruleset);
    }
});

test('Dark Heresy runs home world, background, role, characteristics, experience, divination', () => {
    assert.deepEqual(stepsFor('dh2').map(s => s.id),
        ['homeWorld', 'background', 'role', 'characteristics', 'experience', 'divination']);
    assert.equal(RULESET_DEFS.dh2.actorType, 'acolyte');
});

test('Black Crusade builds a heretic and asks for the race before the archetype', () => {
    const ids = stepsFor('bc').map(s => s.id);
    assert.equal(RULESET_DEFS.bc.actorType, 'heretic');
    assert.ok(ids.indexOf('race') < ids.indexOf('archetype'));
});

test('only Rogue Trader uses the adjacency grid and only Only War the budget counter', () => {
    assert.deepEqual(RULESETS.filter(r => stepsFor(r).some(s => s.widget === 'grid')), ['rt']);
    assert.deepEqual(RULESETS.filter(r => stepsFor(r).some(s => s.widget === 'budget')), ['ow']);
});

test('an unknown ruleset has no steps rather than throwing', () => {
    assert.deepEqual(stepsFor('dh3'), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/ruleset-data.test.mjs"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```javascript
// script/creation/ruleset-data.mjs
// What the wizard asks, book by book. The wizard itself has no per-book branches: it walks
// this list, and a step's `kind` decides which panel renders.

export const RULESET_DEFS = {
    dh2: {
        label: "Dark Heresy 2nd Edition", actorType: "acolyte",
        characteristicMethods: ["roll", "rollModified", "pointBuy"],
        steps: [
            {id: "homeWorld",       label: "Home World",      kind: "origin", stage: "homeWorld"},
            {id: "background",      label: "Background",      kind: "origin", stage: "background"},
            {id: "role",            label: "Role",            kind: "origin", stage: "role"},
            {id: "characteristics", label: "Characteristics", kind: "characteristics"},
            {id: "experience",      label: "Experience",      kind: "experience"},
            {id: "divination",      label: "Divination",      kind: "divination"}
        ]
    },
    rt: {
        label: "Rogue Trader", actorType: "acolyte",
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "originPath",      label: "Origin Path",     kind: "origin", stage: "homeWorld", widget: "grid"},
            {id: "career",          label: "Career",          kind: "origin", stage: "career"},
            {id: "characteristics", label: "Characteristics", kind: "characteristics"},
            {id: "experience",      label: "Experience",      kind: "experience"}
        ]
    },
    ow: {
        label: "Only War", actorType: "acolyte",
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "regiment",        label: "Regiment",        kind: "origin", stage: "regimentOrigin", widget: "budget"},
            {id: "speciality",      label: "Speciality",      kind: "origin", stage: "speciality"},
            {id: "characteristics", label: "Characteristics", kind: "characteristics"},
            {id: "experience",      label: "Experience",      kind: "experience"}
        ]
    },
    bc: {
        label: "Black Crusade", actorType: "heretic",
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "race",            label: "Race",            kind: "origin", stage: "race"},
            {id: "characteristics", label: "Characteristics", kind: "characteristics"},
            {id: "archetype",       label: "Archetype",       kind: "origin", stage: "archetype"},
            {id: "pride",           label: "Pride",           kind: "origin", stage: "pride"},
            {id: "disgrace",        label: "Disgrace",        kind: "origin", stage: "disgrace"},
            {id: "experience",      label: "Experience",      kind: "experience"}
        ]
    },
    dw: {
        label: "Deathwatch", actorType: "acolyte",
        characteristicMethods: ["roll", "pointBuy"],
        steps: [
            {id: "chapter",         label: "Chapter",         kind: "origin", stage: "chapter"},
            {id: "speciality",      label: "Speciality",      kind: "origin", stage: "speciality"},
            {id: "characteristics", label: "Characteristics", kind: "characteristics"},
            {id: "experience",      label: "Experience",      kind: "experience"}
        ]
    }
};

/** The wizard's step list for a ruleset; an unknown ruleset simply has none. */
export function stepsFor(ruleset) { return RULESET_DEFS[ruleset]?.steps ?? []; }

/** Only the steps that pick an origin item. */
export function originStepsFor(ruleset) { return stepsFor(ruleset).filter(s => s.kind === "origin"); }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tests/ruleset-data.test.mjs"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test "tests/*.test.mjs"
git add script/creation/ruleset-data.mjs tests/ruleset-data.test.mjs
git commit -m "Describe each book's creation steps as data"
```

---

### Task 5: Applying a plan to an actor, and taking it back — DONE

**Files:**
- Create: `script/creation/origin-apply.mjs`
- Test: `tests/origin-apply.test.mjs`

The module takes an actor-shaped object and a document factory, so it is testable without Foundry. The wizard passes the real `Actor` and a factory that copies documents out of the compendiums.

**Interfaces:**
- Consumes: `Plan` from `script/creation/grant-data.mjs`.
- Produces:
  - `GRANT_FLAG_SCOPE = "dark-heresy"`, `GRANT_FLAG_KEY = "originGrant"`
  - `planToActorUpdate(actor: object, plan: object): {update: object, applied: object}` — the `actor.update()` payload and the record of exactly what it raised
  - `planToItemData(plan: object, tag: string, carrierId: string, lookup: (kind, name) => object|null): object[]`
  - `revertUpdate(actor: object, applied: object): object` — the `actor.update()` payload that undoes `applied`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/origin-apply.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan} from '../script/creation/grant-data.mjs';
import {planToActorUpdate, planToItemData, revertUpdate,
        GRANT_FLAG_SCOPE, GRANT_FLAG_KEY} from '../script/creation/origin-apply.mjs';

const actor = () => ({system: {
    characteristics: {strength: {base: 30}, toughness: {base: 28}, fellowship: {base: 31}},
    skills: {survival: {advance: -20, specialities: {}}, commonLore: {advance: -20, specialities: {}}},
    wounds: {max: 0, value: 0}, fate: {max: 0, value: 0},
    corruption: 0, insanity: 0, aptitudes: {}
}});

test('characteristic modifiers raise base values and are recorded for the undo', () => {
    const plan = {...emptyPlan(), characteristics: {strength: 5, fellowship: -5}};
    const {update, applied} = planToActorUpdate(actor(), plan);
    assert.equal(update['system.characteristics.strength.base'], 35);
    assert.equal(update['system.characteristics.fellowship.base'], 26);
    assert.deepEqual(applied.characteristics, {strength: 5, fellowship: -5});
});

test('a skill is only raised, never lowered, and only the raise is recorded', () => {
    const a = actor();
    a.system.skills.survival.advance = 10;
    const {update, applied} = planToActorUpdate(a, {...emptyPlan(), skills: [{key: 'survival', advance: 0}]});
    assert.equal(update['system.skills.survival.advance'], undefined);
    assert.deepEqual(applied.skills, {});
});

test('an untrained skill moves to the granted advance', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), skills: [{key: 'survival', advance: 0}]});
    assert.equal(update['system.skills.survival.advance'], 0);
    assert.deepEqual(applied.skills, {survival: {from: -20, to: 0}});
});

test('specialities are added under their skill without touching siblings', () => {
    const plan = {...emptyPlan(), specialities: [{key: 'commonLore', name: 'Imperium', advance: 0}]};
    const {update, applied} = planToActorUpdate(actor(), plan);
    assert.equal(update['system.skills.commonLore.specialities.Imperium.advance'], 0);
    assert.deepEqual(applied.specialities, [{key: 'commonLore', name: 'Imperium'}]);
});

test('wounds, fate, corruption and insanity add to what is already there', () => {
    const a = actor();
    a.system.wounds.max = 9; a.system.wounds.value = 9;
    const plan = {...emptyPlan(), wounds: 2, corruption: 3, insanity: 1};
    const {update, applied} = planToActorUpdate(a, plan);
    assert.equal(update['system.wounds.max'], 11);
    assert.equal(update['system.wounds.value'], 11);
    assert.equal(update['system.corruption'], 3);
    assert.deepEqual(applied.wounds, 2);
});

test('aptitudes are recorded so the undo can remove exactly the ones granted', () => {
    const {update, applied} = planToActorUpdate(actor(), {...emptyPlan(), aptitudes: ['Toughness']});
    assert.deepEqual(update['system.aptitudes'], {Toughness: true});
    assert.deepEqual(applied.aptitudes, ['Toughness']);
});

test('granted items are tagged with the stage and the carrier that produced them', () => {
    const lookup = (kind, name) => kind === 'talent' && name === 'Jaded'
        ? {name: 'Jaded', type: 'talent', system: {description: 'from the compendium'}} : null;
    const plan = {...emptyPlan(), talents: [{name: 'Jaded'}, {name: 'Nonexistent'}],
                  traits: [{name: 'Sturdy', rating: 3}]};
    const data = planToItemData(plan, 'dh2:homeWorld', 'carrier1', lookup);
    const jaded = data.find(d => d.name === 'Jaded');
    assert.equal(jaded.system.description, 'from the compendium');
    assert.equal(jaded.flags[GRANT_FLAG_SCOPE][GRANT_FLAG_KEY], 'dh2:homeWorld');
    assert.equal(jaded.flags[GRANT_FLAG_SCOPE].grantedBy, 'carrier1');
    // A name the compendiums do not carry still produces a stub, so nothing is lost silently.
    assert.equal(data.find(d => d.name === 'Nonexistent').type, 'talent');
    assert.equal(data.find(d => d.name === 'Sturdy').system.rating, 3);
});

test('the undo restores exactly the recorded raises and nothing else', () => {
    const a = actor();
    const {update, applied} = planToActorUpdate(a, {...emptyPlan(),
        characteristics: {strength: 5}, skills: [{key: 'survival', advance: 0}], wounds: 2, aptitudes: ['Toughness']});
    Object.assign(a.system.characteristics.strength, {base: update['system.characteristics.strength.base']});
    a.system.skills.survival.advance = update['system.skills.survival.advance'];
    a.system.wounds.max = update['system.wounds.max'];
    a.system.aptitudes = update['system.aptitudes'];

    const back = revertUpdate(a, applied);
    assert.equal(back['system.characteristics.strength.base'], 30);
    assert.equal(back['system.skills.survival.advance'], -20);
    assert.equal(back['system.wounds.max'], 0);
    assert.deepEqual(back['system.aptitudes'], {});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/origin-apply.test.mjs"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```javascript
// script/creation/origin-apply.mjs
// Turning a plan into writes, and back again. Pure: it takes an actor-shaped object and
// returns update payloads, so the rollback bookkeeping is testable without a world.
//
// Everything a stage grants is tagged with the stage and with the carrier item, and the
// raises it made are recorded on the carrier. Removing the carrier can then undo the stage
// exactly, which is what lets a player go back and change their home world.

export const GRANT_FLAG_SCOPE = "dark-heresy";
export const GRANT_FLAG_KEY = "originGrant";

const STUB_IMAGES = {
    talent: "icons/svg/upgrade.svg",
    trait: "icons/svg/aura.svg",
    gear: "icons/svg/item-bag.svg"
};

/** The actor.update() payload for a plan, and the record of what it actually changed. */
export function planToActorUpdate(actor, plan) {
    const update = {};
    const applied = {characteristics: {}, skills: {}, specialities: [], aptitudes: [],
                     wounds: 0, corruption: 0, insanity: 0, influence: 0};

    for (const [key, modifier] of Object.entries(plan.characteristics ?? {})) {
        const current = actor.system.characteristics?.[key];
        if (!current) continue;
        update[`system.characteristics.${key}.base`] = (current.base ?? 0) + modifier;
        applied.characteristics[key] = modifier;
    }

    for (const skill of plan.skills ?? []) {
        const current = actor.system.skills?.[skill.key];
        if (!current || (current.advance ?? -20) >= skill.advance) continue;
        update[`system.skills.${skill.key}.advance`] = skill.advance;
        applied.skills[skill.key] = {from: current.advance ?? -20, to: skill.advance};
    }

    for (const spec of plan.specialities ?? []) {
        const existing = actor.system.skills?.[spec.key]?.specialities?.[spec.name];
        if (existing && (existing.advance ?? -20) >= (spec.advance ?? 0)) continue;
        update[`system.skills.${spec.key}.specialities.${spec.name}.advance`] = spec.advance ?? 0;
        applied.specialities.push({key: spec.key, name: spec.name});
    }

    if (plan.wounds) {
        update["system.wounds.max"] = (actor.system.wounds?.max ?? 0) + plan.wounds;
        update["system.wounds.value"] = (actor.system.wounds?.value ?? 0) + plan.wounds;
        applied.wounds = plan.wounds;
    }
    for (const key of ["corruption", "insanity"]) {
        if (!plan[key]) continue;
        update[`system.${key}`] = (actor.system[key] ?? 0) + plan[key];
        applied[key] = plan[key];
    }
    if (plan.influence) {
        const current = actor.system.characteristics?.influence;
        if (current) {
            update["system.characteristics.influence.base"] = (current.base ?? 0) + plan.influence;
            applied.influence = plan.influence;
        }
    }

    const granted = (plan.aptitudes ?? []).filter(a => !actor.system.aptitudes?.[a]);
    if (granted.length) {
        update["system.aptitudes"] = {...(actor.system.aptitudes ?? {}),
                                      ...Object.fromEntries(granted.map(a => [a, true]))};
        applied.aptitudes = granted;
    }
    return {update, applied};
}

/**
 * Embedded item data for everything a plan hands out.
 * @param {(kind: string, name: string) => object|null} lookup  compendium copy by kind and name
 */
export function planToItemData(plan, tag, carrierId, lookup) {
    const flags = {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, grantedBy: carrierId}};
    const out = [];

    for (const talent of plan.talents ?? []) {
        const data = lookup("talent", talent.name) ?? {name: talent.name, type: "talent", img: STUB_IMAGES.talent, system: {}};
        delete data._id;
        data.system = {...data.system};
        if (talent.targets) data.system.targets = talent.targets;
        out.push({...data, flags});
    }
    for (const trait of plan.traits ?? []) {
        const data = lookup("trait", trait.name) ?? {name: trait.name, type: "trait", img: STUB_IMAGES.trait, system: {}};
        delete data._id;
        data.system = {...data.system};
        if (trait.rating != null) data.system.rating = trait.rating;
        out.push({...data, flags});
    }
    for (const gear of plan.equipment ?? []) {
        const data = lookup("equipment", gear.name) ?? {name: gear.name, type: "gear", img: STUB_IMAGES.gear, system: {}};
        delete data._id;
        data.system = {...data.system};
        if (gear.quantity > 1) data.system.quantity = gear.quantity;
        out.push({...data, flags});
    }
    return out;
}

/** The actor.update() payload that undoes a recorded application. */
export function revertUpdate(actor, applied = {}) {
    const update = {};
    for (const [key, modifier] of Object.entries(applied.characteristics ?? {})) {
        const current = actor.system.characteristics?.[key];
        if (current) update[`system.characteristics.${key}.base`] = (current.base ?? 0) - modifier;
    }
    for (const [key, record] of Object.entries(applied.skills ?? {}))
        if (actor.system.skills?.[key]?.advance === record.to) update[`system.skills.${key}.advance`] = record.from;
    for (const spec of applied.specialities ?? [])
        update[`system.skills.${spec.key}.specialities.-=${spec.name}`] = null;
    if (applied.wounds) {
        update["system.wounds.max"] = Math.max(0, (actor.system.wounds?.max ?? 0) - applied.wounds);
        update["system.wounds.value"] = Math.max(0, (actor.system.wounds?.value ?? 0) - applied.wounds);
    }
    for (const key of ["corruption", "insanity"])
        if (applied[key]) update[`system.${key}`] = Math.max(0, (actor.system[key] ?? 0) - applied[key]);
    if (applied.influence) {
        const current = actor.system.characteristics?.influence;
        if (current) update["system.characteristics.influence.base"] = (current.base ?? 0) - applied.influence;
    }
    if (applied.aptitudes?.length) {
        const kept = {...(actor.system.aptitudes ?? {})};
        for (const aptitude of applied.aptitudes) delete kept[aptitude];
        update["system.aptitudes"] = kept;
    }
    return update;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test "tests/origin-apply.test.mjs"`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
node --test "tests/*.test.mjs"
git add script/creation/origin-apply.mjs tests/origin-apply.test.mjs
git commit -m "Apply a grant plan to an actor and record the undo"
```

---

### Task 6: The origin item sheet — DONE

**Files:**
- Create: `template/sheet/origin.hbs`
- Modify: `script/dark-heresy.js` (config block after `Dh.renown`; the `preloadHandlebarsTemplates` list; the sheet class section; the `registerSheet` block near line 16344)
- Modify: `lang/en.json`

**Interfaces:**
- Consumes: `RULESETS`, `STAGES` from `script/creation/origin-data.mjs`.
- Produces: `Dh.originRulesets`, `Dh.originStages`, class `OriginSheet` registered for `types: ["origin"]`.

- [ ] **Step 1: Add the config tables**

In `script/dark-heresy.js`, immediately after the `Dh.renown = {...};` block, insert:

```javascript
Dh.originRulesets = {
    dh2: "RULESET.DH2",
    rt: "RULESET.RT",
    ow: "RULESET.OW",
    bc: "RULESET.BC",
    dw: "RULESET.DW"
};

Dh.originStages = {
    homeWorld: "ORIGIN.STAGE.HOME_WORLD",
    background: "ORIGIN.STAGE.BACKGROUND",
    role: "ORIGIN.STAGE.ROLE",
    divination: "ORIGIN.STAGE.DIVINATION",
    birthright: "ORIGIN.STAGE.BIRTHRIGHT",
    lure: "ORIGIN.STAGE.LURE",
    trials: "ORIGIN.STAGE.TRIALS",
    motivation: "ORIGIN.STAGE.MOTIVATION",
    career: "ORIGIN.STAGE.CAREER",
    regimentOrigin: "ORIGIN.STAGE.REGIMENT_ORIGIN",
    regimentCommander: "ORIGIN.STAGE.REGIMENT_COMMANDER",
    regimentType: "ORIGIN.STAGE.REGIMENT_TYPE",
    doctrine: "ORIGIN.STAGE.DOCTRINE",
    equipmentDoctrine: "ORIGIN.STAGE.EQUIPMENT_DOCTRINE",
    standardKit: "ORIGIN.STAGE.STANDARD_KIT",
    speciality: "ORIGIN.STAGE.SPECIALITY",
    race: "ORIGIN.STAGE.RACE",
    archetype: "ORIGIN.STAGE.ARCHETYPE",
    pride: "ORIGIN.STAGE.PRIDE",
    disgrace: "ORIGIN.STAGE.DISGRACE",
    chapter: "ORIGIN.STAGE.CHAPTER"
};
```

Use a Python edit as the Global Constraints require. Put the new configuration in a plain
file first (`scratch/origin-config.js`, outside the repo tree or removed afterwards), then
splice it in with CRLF line endings:

```python
import io
path = 'script/dark-heresy.js'
source = io.open(path, encoding='utf-8-sig', newline='').read()
anchor = 'Dh.renown = {'
assert source.count(anchor) == 1, source.count(anchor)
end = source.index('};', source.index(anchor)) + 2
block = io.open('scratch/origin-config.js', encoding='utf-8').read().replace('\n', '\r\n').rstrip('\r\n')
source = source[:end] + '\r\n\r\n' + block + source[end:]
io.open(path, 'w', encoding='utf-8-sig', newline='').write(source)
```

- [ ] **Step 2: Verify the file still parses**

Run: `node --check script/dark-heresy.js`
Expected: no output, exit 0.

- [ ] **Step 3: Write the sheet template**

`template/sheet/origin.hbs`, following the shape of `template/sheet/race.hbs`:

```handlebars
<form class="{{cssClass}}" autocomplete="off">
    {{> "systems/dark-heresy/template/sheet/item/header.hbs"}}
    <div class="sheet-body">
        <div class="form-group">
            <label>{{localize "ORIGIN.RULESET"}}</label>
            <select name="system.ruleset">{{selectOptions system.ruleset (config "originRulesets") localize=true}}</select>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.STAGE_LABEL"}}</label>
            <select name="system.stage">{{selectOptions system.stage (config "originStages") localize=true}}</select>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.KEY"}}</label>
            <input type="text" name="system.key" value="{{system.key}}"/>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.ORDER"}}</label>
            <input type="number" name="system.order" value="{{system.order}}"/>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.COST"}}</label>
            <input type="number" name="system.cost" value="{{system.cost}}"/>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.BONUS_NAME"}}</label>
            <input type="text" name="system.bonus.name" value="{{system.bonus.name}}"/>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.WOUNDS"}}</label>
            <input type="text" name="system.wounds.formula" value="{{system.wounds.formula}}"/>
        </div>
        <div class="form-group">
            <label>{{localize "ORIGIN.FATE"}}</label>
            <input type="number" name="system.fate.value" value="{{system.fate.value}}"/>
            <label>{{localize "ORIGIN.BLESSING"}}</label>
            <input type="number" name="system.fate.blessing" value="{{system.fate.blessing}}"/>
        </div>
        <div class="form-group stacked">
            <label>{{localize "ORIGIN.GRANTS"}}</label>
            <pre class="origin-grants">{{grantSummary}}</pre>
        </div>
        {{editor descriptionHTML target="system.description" button=true editable=editable engine="prosemirror"}}
    </div>
</form>
```

Check `template/sheet/race.hbs` for the exact header partial path in use and match it; if there is no shared header partial, copy the markup `race.hbs` uses.

- [ ] **Step 4: Register the sheet**

Next to the other item sheet classes in `script/dark-heresy.js`, add:

```javascript
class OriginSheet extends DarkHeresyItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["dark-heresy", "sheet", "origin"],
            template: "systems/dark-heresy/template/sheet/origin.hbs"
        });
    }

    /** Read-only summary of the grant lists; editing them is the builder's job, not this sheet's. */
    async getData() {
        const data = await super.getData();
        const g = this.item.system.grants ?? {};
        data.grantSummary = [
            g.skills?.length ? `Skills: ${g.skills.map(s => `${s.key} ${s.advance}`).join(", ")}` : "",
            g.specialities?.length ? `Specialities: ${g.specialities.map(s => `${s.key} (${s.name})`).join(", ")}` : "",
            g.talents?.length ? `Talents: ${g.talents.map(t => t.name).join(", ")}` : "",
            g.traits?.length ? `Traits: ${g.traits.map(t => t.name).join(", ")}` : "",
            g.equipment?.length ? `Equipment: ${g.equipment.map(e => e.name).join(", ")}` : ""
        ].filter(Boolean).join("\n");
        return data;
    }
}
```

Match the base class name actually used by the neighbouring item sheets (`RaceSheet` at `script/dark-heresy.js:12451` shows the pattern). Add to the registration block:

```javascript
foundry.documents.collections.Items.registerSheet("dark-heresy", OriginSheet, { types: ["origin"], makeDefault: true });
```

Add to `preloadHandlebarsTemplates`:

```javascript
"systems/dark-heresy/template/sheet/origin.hbs",
```

And a default icon next to the other `CONFIG.Item.defaultIcons` lines:

```javascript
CONFIG.Item.defaultIcons.origin = "systems/dark-heresy/assets/icons/misc/inquisition.webp";
```

- [ ] **Step 5: Add the language keys**

Add to `lang/en.json`:

```json
"RULESET": {"DH2": "Dark Heresy 2nd Edition", "RT": "Rogue Trader", "OW": "Only War",
            "BC": "Black Crusade", "DW": "Deathwatch"},
"ORIGIN": {
  "RULESET": "Ruleset", "STAGE_LABEL": "Stage", "KEY": "Key", "ORDER": "Order", "COST": "Cost",
  "BONUS_NAME": "Bonus", "WOUNDS": "Wounds", "FATE": "Fate", "BLESSING": "Emperor's Blessing",
  "GRANTS": "Grants",
  "STAGE": {
    "HOME_WORLD": "Home World", "BACKGROUND": "Background", "ROLE": "Role",
    "DIVINATION": "Divination", "BIRTHRIGHT": "Birthright", "LURE": "Lure of the Void",
    "TRIALS": "Trials and Travails", "MOTIVATION": "Motivation", "CAREER": "Career",
    "REGIMENT_ORIGIN": "Regiment Home World", "REGIMENT_COMMANDER": "Commanding Officer",
    "REGIMENT_TYPE": "Regiment Type", "DOCTRINE": "Training Doctrine",
    "EQUIPMENT_DOCTRINE": "Special Equipment Doctrine", "STANDARD_KIT": "Standard Kit",
    "SPECIALITY": "Speciality", "RACE": "Race", "ARCHETYPE": "Archetype",
    "PRIDE": "Pride", "DISGRACE": "Disgrace", "CHAPTER": "Chapter"
  }
}
```

- [ ] **Step 6: Verify**

Run: `node --check script/dark-heresy.js && node --test "tests/*.test.mjs" && node -e "JSON.parse(require('fs').readFileSync('lang/en.json','utf8'))"`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add template/sheet/origin.hbs script/dark-heresy.js lang/en.json
git commit -m "Add an editor sheet for origin items"
```

---

### Task 7: Building origins into a compendium — DONE

**Files:**
- Modify: `tools/build-items.mjs` (add origin validation to the per-item checks)
- Create: `packs-src/origins/folders.json`
- Modify: `system.json` (`packs` and `packFolders`)
- Test: `tests/origin-source.test.mjs`

**Interfaces:**
- Consumes: `validateOrigin` from `script/creation/origin-data.mjs`.
- Produces: pack `origins` labelled "Character Origins"; `node tools/build-items.mjs origins --check` validates every authored file.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/origin-source.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {validateOrigin, STAGES} from '../script/creation/origin-data.mjs';

const dir = new URL('../packs-src/origins/', import.meta.url);

test('the origins source directory exists with a folder map', () => {
    assert.ok(existsSync(dir), 'packs-src/origins is missing');
    assert.ok(existsSync(new URL('folders.json', dir)));
});

test('every authored origin is valid and unique within its ruleset and stage', () => {
    const seen = new Set();
    const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'folders.json');
    for (const file of files) {
        const entries = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
        assert.ok(Array.isArray(entries), `${file} must hold an array`);
        for (const entry of entries) {
            assert.equal(entry.type, 'origin', `${file}: ${entry.name} is ${entry.type}`);
            assert.ok(entry.name, `${file}: an entry has no name`);
            assert.ok(entry.system?.source, `${file}: ${entry.name} has no book source`);
            const problems = validateOrigin(entry.system);
            assert.deepEqual(problems, [], `${file}: ${entry.name}: ${problems.join('; ')}`);
            const id = `${entry.system.ruleset}:${entry.system.stage}:${entry.system.key}`;
            assert.ok(!seen.has(id), `duplicate origin ${id}`);
            seen.add(id);
        }
    }
});

test('an origin that requires another stage names a stage of the same ruleset', () => {
    const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'folders.json');
    for (const file of files)
        for (const entry of JSON.parse(readFileSync(new URL(file, dir), 'utf8'))) {
            const requires = entry.system.requires;
            if (!requires) continue;
            assert.ok(STAGES[entry.system.ruleset].includes(requires.stage),
                `${file}: ${entry.name} requires unknown stage ${requires.stage}`);
        }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "tests/origin-source.test.mjs"`
Expected: FAIL — `packs-src/origins is missing`.

- [ ] **Step 3: Create the source directory**

`packs-src/origins/folders.json`:

```json
{
  "Dark Heresy": {"color": "#5c2b2b", "sort": 100},
  "Dark Heresy/Home Worlds": {},
  "Dark Heresy/Backgrounds": {},
  "Dark Heresy/Roles": {},
  "Rogue Trader": {"color": "#2b4a5c", "sort": 200},
  "Only War": {"color": "#3d5c2b", "sort": 300},
  "Black Crusade": {"color": "#5c2b52", "sort": 400},
  "Deathwatch": {"color": "#2b2b5c", "sort": 500}
}
```

`packs-src/origins/00-placeholder.json` with `[]` so the builder has a file to read; delete it in Task 8 when the real file lands.

- [ ] **Step 4: Teach the builder about origins**

In `tools/build-items.mjs`, where the per-item checks run, add a branch that calls the shared validator. Import it at the top:

```javascript
import {validateOrigin} from "../script/creation/origin-data.mjs";
```

and in the item loop, alongside the existing `check(sys.renown, ...)` calls:

```javascript
if (item.type === "origin") {
    const problems = validateOrigin(sys);
    for (const problem of problems) fail(`${item.name}: ${problem}`);
}
```

Match `fail` to whatever the file's existing error-collecting helper is called; read the surrounding code before editing.

- [ ] **Step 5: Register the pack**

In `system.json`, add to `packs`:

```json
{"name": "origins", "label": "Character Origins", "path": "packs/origins", "type": "Item",
 "system": "dark-heresy", "ownership": {"PLAYER": "OBSERVER", "ASSISTANT": "OWNER", "GAMEMASTER": "OWNER"}}
```

and list `"origins"` in the matching `packFolders` entry, following how `deathwatch` was added.

- [ ] **Step 6: Verify**

Run: `node --test "tests/origin-source.test.mjs" && node tools/build-items.mjs origins --check`
Expected: tests pass; the builder reports 0 items and no errors.

- [ ] **Step 7: Commit**

```bash
git add tools/build-items.mjs packs-src/origins system.json tests/origin-source.test.mjs
git commit -m "Add the origins compendium and validate its sources"
```

---

### Task 8: Dark Heresy home worlds — DONE

**Files:**
- Create: `packs-src/origins/01-dh2-home-worlds.json`
- Delete: `packs-src/origins/00-placeholder.json`

**Source:** Dark Heresy Second Edition, PDF pages 30–44 (book pages 29–43). Book page = PDF page − 1. Read with `mcp__pdf-mcp__pdf_read_pages`.

**Six entries, in the order of Table 2–1: Random Home World:** Feral World (01–15), Forge World (16–33), Highborn (34–44), Hive World (45–69), Shrine World (70–85), Voidborn (86–100).

Each book entry has a rules box with these labelled lines, which map onto the schema:

| Book line | Field |
| --- | --- |
| Characteristic Modifiers | `system.characteristics` |
| Fate Threshold / Emperor's Blessing N+ | `system.fate.value`, `system.fate.blessing` |
| Home World Bonus | `system.bonus.name`, `system.bonus.description` |
| Home World Aptitude | `system.aptitudes` |
| Wounds | `system.wounds.formula` |
| Recommended Backgrounds | `system.recommended` |
| Skills / Talents named in the bonus text | `system.grants` or a `choices` entry when the book says "choose" |

- [ ] **Step 1: Read the Feral World pages**

Use `pdf_read_pages` on the Dark Heresy PDF, pages 30–32, and confirm the rules box values.

- [ ] **Step 2: Write the file with Feral World first**

```json
[
  {
    "name": "Feral World",
    "type": "origin",
    "folder": "Dark Heresy/Home Worlds",
    "img": "systems/dark-heresy/assets/icons/misc/inquisition.webp",
    "system": {
      "ruleset": "dh2",
      "stage": "homeWorld",
      "order": 1,
      "key": "feralWorld",
      "characteristics": {"strength": 5, "toughness": 5, "influence": -5},
      "aptitudes": ["Toughness"],
      "wounds": {"formula": "9+1d5", "bonus": 0, "doubleToughnessBonus": false},
      "fate": {"value": 2, "blessing": 3, "formula": ""},
      "bonus": {
        "name": "The Old Ways",
        "description": "<div class='bc-entry'><p>…the book's wording…</p></div>"
      },
      "grants": {},
      "recommended": ["Adeptus Ministorum", "Imperial Guard", "Outcast"],
      "description": "<div class='bc-entry'><p class='bc-lead'>…the book's opening paragraph…</p></div>",
      "source": "Dark Heresy Second Edition, p. 30"
    }
  }
]
```

The `influence` modifier is the book's `−5 Fellowship`; check which of Fellowship and Influence the book actually names before writing, and use the matching key.

- [ ] **Step 3: Verify Feral World**

Run: `node --test "tests/origin-source.test.mjs"`
Expected: PASS.

- [ ] **Step 4: Add the remaining five the same way**

Forge World, Highborn, Hive World, Shrine World, Voidborn. Forge World's "Omnissiah's Chosen" is a `choices` entry of type `one` with two options, Technical Knock and Weapon-Tech — it is the template for every "choose one" bonus in the book:

```json
"choices": [
  {"key": "omnissiahsChosen", "type": "one", "label": "Omnissiah's Chosen",
   "options": [
     {"label": "Technical Knock", "grants": {"talents": [{"name": "Technical Knock"}]}},
     {"label": "Weapon-Tech", "grants": {"talents": [{"name": "Weapon-Tech"}]}}
   ]}
]
```

- [ ] **Step 5: Verify all six**

Run: `node --test "tests/origin-source.test.mjs" && node tools/build-items.mjs origins --check`
Expected: tests pass; the builder reports 6 items, no errors.

- [ ] **Step 6: Cross-check against the book's own table**

Confirm the six names and their d100 ranges against Table 2–1 on PDF page 31. Any mismatch is a transcription error, not a book misprint — fix the entry.

- [ ] **Step 7: Commit**

```bash
git rm packs-src/origins/00-placeholder.json
git add packs-src/origins/01-dh2-home-worlds.json
git commit -m "Add the six Dark Heresy home worlds"
```

---

### Task 9: Dark Heresy backgrounds

**Files:**
- Create: `packs-src/origins/02-dh2-backgrounds.json`

**Source:** Dark Heresy Second Edition, PDF pages 45–60 (book 44–59).

**Seven entries:** Adeptus Administratum, Adeptus Arbites, Adeptus Astra Telepathica, Adeptus Mechanicus, Adeptus Ministorum, Imperial Guard, Outcast.

Background boxes carry `Background Aptitude`, `Starting Skills`, `Starting Talents`, `Starting Equipment`, `Background Bonus` and a recommended-roles line. Skills granted at "known" are `advance: 0`; where the book writes a skill "+10" use `advance: 10`.

- [ ] **Step 1: Read the Adeptus Administratum pages**

`pdf_read_pages` on pages 45–47.

- [ ] **Step 2: Write the first entry**

```json
[
  {
    "name": "Adeptus Administratum",
    "type": "origin",
    "folder": "Dark Heresy/Backgrounds",
    "img": "systems/dark-heresy/assets/icons/misc/inquisition.webp",
    "system": {
      "ruleset": "dh2", "stage": "background", "order": 2, "key": "adeptusAdministratum",
      "aptitudes": ["Knowledge"],
      "grants": {
        "skills": [{"key": "commerce", "advance": 0}, {"key": "inquiry", "advance": 0}],
        "specialities": [{"key": "commonLore", "name": "Administratum", "advance": 0}],
        "talents": [],
        "equipment": [{"name": "Autoquill", "quantity": 1}]
      },
      "choices": [],
      "bonus": {"name": "Master of Paperwork", "description": "<div class='bc-entry'><p>…</p></div>"},
      "recommended": ["Chirurgeon", "Hierophant", "Sage", "Seeker"],
      "description": "<div class='bc-entry'><p class='bc-lead'>…</p></div>",
      "source": "Dark Heresy Second Edition, p. 44"
    }
  }
]
```

The skills, talents and equipment above are placeholders for the shape only — write what the book's box actually lists.

- [ ] **Step 3: Add the remaining six**

Where a background lets the player choose (for example "any one Common Lore"), use a `many` choice with `count: 1` and the matching group, or a `one` choice when the book enumerates the options.

- [ ] **Step 4: Verify**

Run: `node --test "tests/origin-source.test.mjs" && node tools/build-items.mjs origins --check`
Expected: 13 items, no errors.

- [ ] **Step 5: Commit**

```bash
git add packs-src/origins/02-dh2-backgrounds.json
git commit -m "Add the seven Dark Heresy backgrounds"
```

---

### Task 10: Dark Heresy roles

**Files:**
- Create: `packs-src/origins/03-dh2-roles.json`

**Source:** Dark Heresy Second Edition, PDF pages 61–78 (book 60–77).

**Eight entries:** Assassin, Chirurgeon, Desperado, Hierophant, Mystic, Sage, Seeker, Warrior.

A role box carries `Role Aptitudes` (two), a `Role Bonus`, and a "Talents" line offering a choice between several talents. Roles grant no equipment.

- [ ] **Step 1: Read the Assassin pages**

`pdf_read_pages` on pages 61–63.

- [ ] **Step 2: Write all eight**

The talent choice is a `one` choice:

```json
"choices": [
  {"key": "roleTalent", "type": "one", "label": "Starting Talent",
   "options": [
     {"label": "Catfall", "grants": {"talents": [{"name": "Catfall"}]}},
     {"label": "Leap Up", "grants": {"talents": [{"name": "Leap Up"}]}},
     {"label": "Rapid Reload", "grants": {"talents": [{"name": "Rapid Reload"}]}}
   ]}
]
```

- [ ] **Step 3: Verify**

Run: `node --test "tests/origin-source.test.mjs" && node tools/build-items.mjs origins --check`
Expected: 21 items, no errors.

- [ ] **Step 4: Cross-check the aptitudes**

Every role must list exactly two aptitudes, and each must be a name the actor model knows — compare against `aptitude` items already in the `dark-heresy` pack.

- [ ] **Step 5: Commit**

```bash
git add packs-src/origins/03-dh2-roles.json
git commit -m "Add the eight Dark Heresy roles"
```

---

### Task 11: The divination table

**Files:**
- Create: `packs-src/tables/divinations-dh2.json`

**Source:** Dark Heresy Second Edition, Table 2–9: Divinations, PDF pages 86–88.

The divination is a d100 roll whose result is a sentence the character lives by plus a small mechanical effect ("+1 to Willpower", "+1 Fate", "gain 1 Insanity Point"). Each row is authored as a table result carrying the mechanical part in a flag the wizard reads.

**Interfaces:**
- Produces: RollTable "Divinations" in the `bc-tables` pack, with `flags["dark-heresy"].divinationEffect` on each result.

- [ ] **Step 1: Read the table**

`pdf_read_pages` on pages 86–88.

- [ ] **Step 2: Write the source file**

Follow the existing table source schema (`{name, folder, formula, sort, description, results:[{name, range, text}]}`), extended with the effect:

```json
{
  "name": "Divinations",
  "folder": "Character Creation",
  "formula": "1d100",
  "sort": 100,
  "description": "Rolled once at character creation. Dark Heresy Second Edition, Table 2-9 (p. 85).",
  "results": [
    {"name": "Mutation is the mark of the unclean upon the soul.",
     "range": [1, 3], "text": "Mutation is the mark of the unclean upon the soul.",
     "effect": {"characteristics": {"willpower": 1}}}
  ]
}
```

Rows with no mechanical part carry `"effect": {}`. An effect may be `{"characteristics": {...}}`, `{"fate": 1}`, `{"wounds": 1}`, `{"insanity": 1}` or `{"corruption": 1}` — no other shapes appear in the table.

- [ ] **Step 3: Teach the table builder to carry the effect**

In `tools/build-tables.mjs`, write each result's `effect` into `flags["dark-heresy"].divinationEffect`. Read the file first; the existing result mapping is where this goes.

- [ ] **Step 4: Verify**

Run: `node tools/build-tables.mjs --check` if the tool supports it, otherwise confirm the JSON parses and holds exactly 100 rows covering 1–100 with no gaps:

```bash
node -e "const t=require('./packs-src/tables/divinations-dh2.json');const seen=new Set();for(const r of t.results)for(let i=r.range[0];i<=r.range[1];i++){if(seen.has(i))throw new Error('overlap at '+i);seen.add(i)}if(seen.size!==100)throw new Error('covered '+seen.size);console.log('100 rows, no gaps')"
```

- [ ] **Step 5: Commit**

```bash
git add packs-src/tables/divinations-dh2.json tools/build-tables.mjs
git commit -m "Add the Dark Heresy divination table with its mechanical effects"
```

---

### Task 12: The wizard shell

**Files:**
- Create: `script/creation/wizard.mjs`
- Create: `template/apps/character-wizard.hbs`
- Modify: `script/dark-heresy.js` (preload the template; export the class on `game.darkHeresy`)
- Modify: `css/dark-heresy.css`

No unit test: this is the Foundry-coupled layer. It is verified by opening it in a live world.

**Interfaces:**
- Consumes: `stepsFor`, `RULESET_DEFS` from `script/creation/ruleset-data.mjs`.
- Produces: `class CharacterWizard`, `openCharacterWizard(actor)`.

- [ ] **Step 1: Write the application**

```javascript
// script/creation/wizard.mjs
// The character builder. It runs on an actor that already exists and commits each step when
// the player presses Next, so a half-finished character is still a valid document and the
// wizard can be closed and reopened on it.

import {RULESET_DEFS, stepsFor} from "./ruleset-data.mjs";

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

// The chosen book lives on the character itself (system.ruleset, Task 0), not in a wizard
// flag: it keeps deciding which rules the character is played by long after creation.

export class CharacterWizard extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "dh-character-wizard-{id}",
        classes: ["dark-heresy", "character-wizard"],
        position: {width: 640, height: 780},
        window: {resizable: true},
        actions: {back: CharacterWizard.#onBack, next: CharacterWizard.#onNext}
    };

    static PARTS = {
        body: {template: "systems/dark-heresy/template/apps/character-wizard.hbs", root: true,
               scrollable: [".wizard-step-body"]}
    };

    constructor(actor, options = {}) {
        super({id: `dh-character-wizard-${actor.id}`, ...options});
        this.actorId = actor.id;
        this.stepIndex = 0;
        // Answers are re-read from the form on every render, so they survive a re-render
        // triggered by something other than the control the player just touched.
        this.answers = {};
    }

    get actor() { return game.actors.get(this.actorId); }
    get ruleset() { return this.actor?.system?.ruleset ?? ""; }
    get steps() { return this.ruleset ? stepsFor(this.ruleset) : []; }
    get step() { return this.steps[this.stepIndex] ?? null; }
    get title() { return game.i18n.format("WIZARD.TITLE", {name: this.actor?.name ?? ""}); }

    async _prepareContext() {
        const actor = this.actor;
        if (!actor) return {missing: true};
        return {
            missing: false,
            name: actor.name,
            rulesetChosen: !!this.ruleset,
            rulesets: Object.entries(RULESET_DEFS).map(([key, def]) =>
                ({key, label: def.label, selected: key === this.ruleset})),
            steps: this.steps.map((s, i) => ({...s, active: i === this.stepIndex, done: i < this.stepIndex})),
            step: this.step,
            isFirstStep: this.stepIndex === 0,
            isLastStep: this.stepIndex === this.steps.length - 1,
            backDisabled: this.stepIndex === 0,
            nextDisabled: !this.ruleset
        };
    }

    _onRender(context, options) {
        super._onRender?.(context, options);
        this.element.querySelector(".wizard-ruleset")?.addEventListener("change", async ev => {
            await this.actor.update({"system.ruleset": ev.currentTarget.value});
            this.stepIndex = 0;
            this.render(false);
        });
    }

    static #onBack() { this.stepIndex = Math.max(0, this.stepIndex - 1); this.render(false); }

    static #onNext() {
        // Steps commit their own work in later tasks; the shell only walks the list.
        this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
        this.render(false);
    }
}

/** Open the builder on an actor, reusing the window if it is already up. */
export function openCharacterWizard(actor) {
    if (!actor) return null;
    const app = new CharacterWizard(actor);
    app.render(true);
    return app;
}
```

- [ ] **Step 2: Write the template**

`template/apps/character-wizard.hbs`:

```handlebars
{{#if missing}}
<div class="wizard-missing">{{localize "WIZARD.NO_ACTOR"}}</div>
{{else}}
<div class="character-wizard-body">
    <nav class="wizard-steps">
        {{#each steps as |s|}}
        <span class="wizard-step-chip{{#if s.active}} active{{/if}}{{#if s.done}} done{{/if}}">{{s.label}}</span>
        {{/each}}
    </nav>

    <div class="wizard-step-body">
        {{#unless rulesetChosen}}
        <div class="form-group">
            <label>{{localize "WIZARD.RULESET"}}</label>
            <select class="wizard-ruleset">
                <option value="">{{localize "WIZARD.CHOOSE"}}</option>
                {{#each rulesets as |r|}}
                <option value="{{r.key}}" {{#if r.selected}}selected{{/if}}>{{r.label}}</option>
                {{/each}}
            </select>
        </div>
        {{else}}
        <h2 class="wizard-step-title">{{step.label}}</h2>
        <div class="wizard-step-content" data-step="{{step.id}}" data-kind="{{step.kind}}"></div>
        {{/unless}}
    </div>

    <footer class="wizard-footer">
        <button type="button" data-action="back" {{#if backDisabled}}disabled{{/if}}>{{localize "WIZARD.BACK"}}</button>
        <button type="button" data-action="next" {{#if nextDisabled}}disabled{{/if}}>
            {{#if isLastStep}}{{localize "WIZARD.FINISH"}}{{else}}{{localize "WIZARD.NEXT"}}{{/if}}
        </button>
    </footer>
</div>
{{/if}}
```

- [ ] **Step 3: Wire it into the system**

Add to `preloadHandlebarsTemplates`:

```javascript
"systems/dark-heresy/template/apps/character-wizard.hbs",
```

Import at the top of `script/dark-heresy.js` (LF line endings, matching the two existing import lines):

```javascript
import { CharacterWizard, openCharacterWizard } from "./creation/wizard.mjs";
```

and expose it where `game.darkHeresy` is assembled:

```javascript
game.darkHeresy.openCharacterWizard = openCharacterWizard;
```

Add the language keys to `lang/en.json`:

```json
"WIZARD": {"TITLE": "Character Creation — {name}", "RULESET": "Rulebook", "CHOOSE": "— choose —",
           "BACK": "Back", "NEXT": "Next", "FINISH": "Finish", "NO_ACTOR": "This character no longer exists."}
```

Add minimal styling to `css/dark-heresy.css`:

```css
.dark-heresy.character-wizard .wizard-steps { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
.dark-heresy.character-wizard .wizard-step-chip { padding: 2px 8px; border: 1px solid var(--color-border-dark); opacity: 0.5; }
.dark-heresy.character-wizard .wizard-step-chip.active { opacity: 1; font-weight: bold; }
.dark-heresy.character-wizard .wizard-step-chip.done { opacity: 0.8; }
.dark-heresy.character-wizard .wizard-footer { display: flex; justify-content: space-between; margin-top: 8px; }
```

- [ ] **Step 4: Verify**

Run: `node --check script/dark-heresy.js && node --test "tests/*.test.mjs"`
Expected: pass.

Then, in a live world: create an `acolyte`, run `game.darkHeresy.openCharacterWizard(actor)` in the console, confirm the ruleset dropdown appears, pick Dark Heresy, confirm six step chips appear and Back/Next walk them.

- [ ] **Step 5: Commit**

```bash
git add script/creation/wizard.mjs template/apps/character-wizard.hbs script/dark-heresy.js lang/en.json css/dark-heresy.css
git commit -m "Add the character wizard shell"
```

---

### Task 13: Origin steps inside the wizard

**Files:**
- Create: `script/creation/choice-blocks.mjs`
- Modify: `script/creation/wizard.mjs`
- Modify: `template/apps/character-wizard.hbs`

**Interfaces:**
- Consumes: `resolveGrantPlan` (`grant-data.mjs`), `planToActorUpdate`, `planToItemData`, `revertUpdate`, `GRANT_FLAG_SCOPE`, `GRANT_FLAG_KEY` (`origin-apply.mjs`), `SKILL_KEYS` (`origin-data.mjs`).
- Produces:
  - `choiceBlocksHtml(origin: object, context: {intelligenceBonus: number}): string`
  - `readChoicePicks(root: HTMLElement, origin: object): object` — the `picks` shape `resolveGrantPlan` expects
  - `restoreChoicePicks(root: HTMLElement, snapshot: object): void`
  - On the wizard: `#applyOriginStep(step)`, `#revertOriginStep(step)`

- [ ] **Step 1: Write the choice-block module**

```javascript
// script/creation/choice-blocks.mjs
// The inline answer rows for an origin's choices. Rendered inside the step, not in a popup,
// so the player sees the question and the option list at the same time.
//
// The form is re-rendered on every change, and fresh HTML always starts blank, so answers
// are restored from a snapshot on each render — otherwise an unrelated click nearby wipes them.

const esc = value => foundry.utils.escapeHTML(String(value ?? ""));

export function choiceBlocksHtml(origin, context = {}) {
    const blocks = [];

    (origin.characteristicChoices ?? []).forEach((choice, index) => {
        const options = choice.from.map((key, i) =>
            `<label><input type="checkbox" data-charchoice="${index}" value="${i}"/> ${esc(key)}</label>`).join("");
        blocks.push(`<div class="wizard-choice">
            <div class="wizard-choice-label">${esc(choice.label)} — pick ${choice.pick}</div>
            <div class="wizard-choice-options">${options}</div></div>`);
    });

    for (const choice of origin.choices ?? []) {
        if (choice.type === "one") {
            const options = choice.options.map((o, i) =>
                `<option value="${i}">${esc(o.label)}</option>`).join("");
            blocks.push(`<div class="wizard-choice">
                <div class="wizard-choice-label">${esc(choice.label)}</div>
                <select data-choice="${esc(choice.key)}"><option value="">— choose —</option>${options}</select></div>`);
        } else if (choice.type === "many") {
            const count = choice.count === "intelligenceBonus" ? (context.intelligenceBonus ?? 0) : (choice.count ?? 0);
            const rows = (choice.groups ?? []).map(group =>
                `<div class="wizard-many-group"><b>${esc(group)}</b>
                 <input type="text" data-many="${esc(choice.key)}" data-group="${esc(group)}"
                        placeholder="comma separated"/></div>`).join("");
            blocks.push(`<div class="wizard-choice">
                <div class="wizard-choice-label">${esc(choice.label)} — pick ${count}</div>
                ${rows}
                <div class="wizard-choice-count" data-count-for="${esc(choice.key)}">0 / ${count}</div></div>`);
        } else if (choice.type === "target") {
            blocks.push(`<div class="wizard-choice">
                <div class="wizard-choice-label">${esc(choice.label)}</div>
                <input type="text" data-target="${esc(choice.key)}" placeholder="target"/></div>`);
        }
    }
    return blocks.join("");
}

/** Read the rendered rows into the picks shape resolveGrantPlan expects. */
export function readChoicePicks(root, origin) {
    const picks = {characteristicChoices: [], one: {}, many: {}, target: {}};

    (origin.characteristicChoices ?? []).forEach((choice, index) => {
        picks.characteristicChoices[index] = [...root.querySelectorAll(`input[data-charchoice="${index}"]:checked`)]
            .map(el => Number(el.value));
    });
    for (const select of root.querySelectorAll("select[data-choice]")) {
        if (select.value === "") continue;
        picks.one[select.dataset.choice] = Number(select.value);
    }
    for (const input of root.querySelectorAll("input[data-many]")) {
        const list = picks.many[input.dataset.many] ??= [];
        for (const name of String(input.value).split(",").map(s => s.trim()).filter(Boolean))
            list.push({key: input.dataset.group, name});
    }
    for (const input of root.querySelectorAll("input[data-target]")) {
        if (!input.value.trim()) continue;
        picks.target[input.dataset.target] = {kind: "text", value: input.value.trim()};
    }
    return picks;
}

/** Put a previously read set of answers back into freshly rendered rows. */
export function restoreChoicePicks(root, snapshot = {}) {
    (snapshot.characteristicChoices ?? []).forEach((picked, index) => {
        for (const el of root.querySelectorAll(`input[data-charchoice="${index}"]`))
            el.checked = picked.includes(Number(el.value));
    });
    for (const [key, index] of Object.entries(snapshot.one ?? {})) {
        const select = root.querySelector(`select[data-choice="${key}"]`);
        if (select) select.value = String(index);
    }
    for (const [key, entries] of Object.entries(snapshot.many ?? {})) {
        const byGroup = {};
        for (const entry of entries) (byGroup[entry.key] ??= []).push(entry.name);
        for (const [group, names] of Object.entries(byGroup)) {
            const input = root.querySelector(`input[data-many="${key}"][data-group="${group}"]`);
            if (input) input.value = names.join(", ");
        }
    }
    for (const [key, target] of Object.entries(snapshot.target ?? {})) {
        const input = root.querySelector(`input[data-target="${key}"]`);
        if (input) input.value = target.value;
    }
}
```

- [ ] **Step 2: Add the origin step to the wizard**

Add to `script/creation/wizard.mjs`:

```javascript
import {resolveGrantPlan} from "./grant-data.mjs";
import {planToActorUpdate, planToItemData, revertUpdate,
        GRANT_FLAG_SCOPE, GRANT_FLAG_KEY} from "./origin-apply.mjs";
import {choiceBlocksHtml, readChoicePicks, restoreChoicePicks} from "./choice-blocks.mjs";

/** Packs searched, in order, when a grant names a talent, trait or piece of gear. */
const CONTENT_PACKS = ["dark-heresy.dark-heresy", "dark-heresy.black-crusade",
                       "dark-heresy.rogue-trader", "dark-heresy.only-war", "dark-heresy.deathwatch"];

const ITEM_TYPES = {
    talent: ["talent"], trait: ["trait"],
    equipment: ["weapon", "armour", "gear", "tool", "ammunition", "drug", "cybernetic", "forceField"]
};
```

and these methods on `CharacterWizard`:

```javascript
    /** Every origin in the pack for one stage of the current ruleset, in book order. */
    async _originsFor(stage) {
        const pack = game.packs.get("dark-heresy.origins");
        if (!pack) return [];
        const index = await pack.getIndex({fields: ["system.ruleset", "system.stage", "system.order", "system.key"]});
        return index.contents
            .filter(e => e.system?.ruleset === this.ruleset && e.system?.stage === stage)
            .sort((a, b) => (a.system.order ?? 0) - (b.system.order ?? 0) || a.name.localeCompare(b.name));
    }

    /** The origin item already committed for a step, if the player has been here before. */
    _carrierFor(step) {
        const tag = `${this.ruleset}:${step.stage}`;
        return this.actor.items.find(i => i.getFlag(GRANT_FLAG_SCOPE, GRANT_FLAG_KEY) === tag && i.type === "origin");
    }

    /** Copy a named document out of the content packs, or null when no pack carries it. */
    async _lookupContent(kind, name) {
        for (const packId of CONTENT_PACKS) {
            const pack = game.packs.get(packId);
            if (!pack) continue;
            const index = await pack.getIndex();
            const hit = index.contents.find(e => e.name === name && ITEM_TYPES[kind].includes(e.type));
            if (!hit) continue;
            const doc = await pack.getDocument(hit._id);
            return doc.toObject();
        }
        return null;
    }

    /**
     * Commit the chosen origin. Nothing is written until the plan resolves cleanly, so an
     * unanswered choice leaves the actor exactly as it was.
     */
    async _applyOriginStep(step) {
        const actor = this.actor;
        if (this._carrierFor(step)) return true;           // already committed on an earlier visit

        const uuid = this.element.querySelector(`select[data-origin-step="${step.id}"]`)?.value;
        if (!uuid) { ui.notifications?.warn(game.i18n.localize("WIZARD.PICK_ORIGIN")); return false; }

        const source = (await fromUuid(uuid)).toObject();
        const picks = readChoicePicks(this.element.querySelector(".wizard-choice-rows"), source.system);
        this.answers[step.id] = picks;

        const intelligenceBonus = Math.floor((actor.system.characteristics?.intelligence?.total ?? 0) / 10);
        const {plan, problems} = resolveGrantPlan(source.system, picks, {intelligenceBonus});
        if (problems.length) { ui.notifications?.warn(problems.join("; ")); return false; }

        const tag = `${this.ruleset}:${step.stage}`;
        source.flags = foundry.utils.mergeObject(source.flags ?? {},
            {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, picks}});
        const [carrier] = await actor.createEmbeddedDocuments("Item", [source]);

        const lookups = new Map();
        for (const [kind, list] of [["talent", plan.talents], ["trait", plan.traits], ["equipment", plan.equipment]])
            for (const entry of list) lookups.set(`${kind}:${entry.name}`, await this._lookupContent(kind, entry.name));
        const granted = planToItemData(plan, tag, carrier.id, (kind, name) => lookups.get(`${kind}:${name}`));
        if (granted.length) await actor.createEmbeddedDocuments("Item", granted);

        const {update, applied} = planToActorUpdate(actor, plan);
        if (Object.keys(update).length) await actor.update(update);
        await carrier.setFlag(GRANT_FLAG_SCOPE, "applied", applied);
        return true;
    }

    /** Undo a committed step so the player can choose differently. */
    async _revertOriginStep(step) {
        const actor = this.actor;
        const carrier = this._carrierFor(step);
        if (!carrier) return;

        const applied = carrier.getFlag(GRANT_FLAG_SCOPE, "applied") ?? {};
        const update = revertUpdate(actor, applied);
        if (Object.keys(update).length) await actor.update(update);

        const ids = actor.items
            .filter(i => i.getFlag(GRANT_FLAG_SCOPE, "grantedBy") === carrier.id)
            .map(i => i.id);
        await actor.deleteEmbeddedDocuments("Item", [carrier.id, ...ids]);
    }
```

Wire them into the navigation handlers:

```javascript
    static async #onNext() {
        if (this._busy) return;                            // a second click during an await would double-apply
        this._busy = true;
        try {
            const step = this.step;
            if (step?.kind === "origin" && !(await this._applyOriginStep(step))) return;
            this.stepIndex = Math.min(this.steps.length - 1, this.stepIndex + 1);
        } finally {
            this._busy = false;
            this.render(false);
        }
    }

    static async #onBack() {
        if (this._busy) return;
        this._busy = true;
        try {
            const previous = this.steps[this.stepIndex - 1];
            if (previous?.kind === "origin") await this._revertOriginStep(previous);
            this.stepIndex = Math.max(0, this.stepIndex - 1);
        } finally {
            this._busy = false;
            this.render(false);
        }
    }
```

And render the step in `_prepareContext`, adding to the returned object:

```javascript
            originOptions: this.step?.kind === "origin"
                ? (await this._originsFor(this.step.stage)).map(e =>
                    ({uuid: e.uuid, name: e.name, selected: e.uuid === this._selectedOrigin}))
                : [],
            choiceRows: this._selectedOriginSource
                ? choiceBlocksHtml(this._selectedOriginSource.system,
                    {intelligenceBonus: Math.floor((this.actor.system.characteristics?.intelligence?.total ?? 0) / 10)})
                : ""
```

where `_selectedOrigin` is set by a `change` listener on `select[data-origin-step]` that also
loads `_selectedOriginSource = (await fromUuid(uuid)).toObject()` and re-renders. In
`_onRender`, call `restoreChoicePicks(this.element.querySelector(".wizard-choice-rows"), this.answers[this.step.id])`
so answers survive the re-render.

In the template, replace the empty `.wizard-step-content` div with:

```handlebars
{{#if (eq step.kind "origin")}}
<div class="form-group">
    <label>{{step.label}}</label>
    <select data-origin-step="{{step.id}}">
        <option value="">{{localize "WIZARD.CHOOSE"}}</option>
        {{#each originOptions as |o|}}
        <option value="{{o.uuid}}" {{#if o.selected}}selected{{/if}}>{{o.name}}</option>
        {{/each}}
    </select>
</div>
<div class="wizard-choice-rows">{{{choiceRows}}}</div>
{{/if}}
```

- [ ] **Step 3: Verify in a live world**

Create an acolyte, open the wizard, pick Dark Heresy and then Feral World. Confirm:

- Strength and Toughness each rise by 5 on the sheet, Fellowship drops by 5;
- Survival appears trained;
- the Toughness aptitude appears;
- the origin item "Feral World" is on the actor;
- pressing Back removes all of it and the characteristics return to their previous values;
- picking Forge World presents the Omnissiah's Chosen dropdown and refuses Next until it is answered.

- [ ] **Step 4: Commit**

```bash
git add script/creation/choice-blocks.mjs script/creation/wizard.mjs template/apps/character-wizard.hbs
git commit -m "Pick and apply origins inside the wizard, with rollback on Back"
```

---

### Task 14: The characteristics step

**Files:**
- Modify: `script/creation/wizard.mjs`
- Modify: `template/apps/character-wizard.hbs`

**Interfaces:**
- Consumes: `CHARACTERISTIC_METHODS`, `rollExpression`, `POINT_BUY`, `pointBuyProblems`, `woundsExpression`, `fateExpression` from `script/creation/creation-roll-data.mjs`; `CHARACTERISTIC_KEYS` from `script/creation/origin-data.mjs`.
- Produces: `#applyCharacteristicsStep()` on the wizard.

- [ ] **Step 1: Render the three methods**

A method selector limited to `RULESET_DEFS[ruleset].characteristicMethods`, and below it:

- `roll` / `rollModified` — a Roll button per characteristic showing the formula from `rollExpression(method, modifier)` where `modifier` is the sum of everything the origin steps granted for that characteristic, plus a "roll all" button and a per-characteristic reroll;
- `pointBuy` — ten number inputs starting at `POINT_BUY.base`, a live "spent N of 60" counter, and `pointBuyProblems` shown inline.

The origin steps have already written their modifiers into `base`, so the characteristics step must set `base` to the generated value **plus** the recorded modifiers, not overwrite them. Read the modifiers back from the carrier items' `flags["dark-heresy"].applied.characteristics`.

Concretely, the modifier for one characteristic is the sum of what the committed origins recorded:

```javascript
    /** What the origin steps already added to a characteristic, read back from the carriers. */
    _originModifier(key) {
        let total = 0;
        for (const item of this.actor.items) {
            if (item.type !== "origin") continue;
            total += item.getFlag(GRANT_FLAG_SCOPE, "applied")?.characteristics?.[key] ?? 0;
        }
        return total;
    }
```

- [ ] **Step 2: Roll wounds and fate on commit**

Dark Heresy puts both the wounds formula and the fate value on the home world, so the commit
reads them off that carrier. The rolled totals are recorded on the actor, so returning to this
step does not re-roll a character that is already generated:

```javascript
    async _applyCharacteristicsStep() {
        const actor = this.actor;
        if (actor.getFlag(GRANT_FLAG_SCOPE, "creationRolls")) return true;   // already generated

        const method = this.element.querySelector(".wizard-char-method")?.value ?? "roll";
        const values = {};
        for (const key of CHARACTERISTIC_KEYS) {
            const input = this.element.querySelector(`input[data-characteristic="${key}"]`);
            values[key] = Number(input?.value ?? 0);
        }
        if (method === "pointBuy") {
            const problems = pointBuyProblems(values);
            if (problems.length) { ui.notifications?.warn(problems.join("; ")); return false; }
        } else if (CHARACTERISTIC_KEYS.some(key => !values[key])) {
            ui.notifications?.warn(game.i18n.localize("WIZARD.ROLL_ALL"));
            return false;
        }

        const update = {};
        for (const key of CHARACTERISTIC_KEYS)
            update[`system.characteristics.${key}.base`] = values[key] + this._originModifier(key);

        const homeWorld = this.actor.items.find(i => i.type === "origin" && i.system.stage === "homeWorld");
        const toughnessBonus = Math.floor((values.toughness + this._originModifier("toughness")) / 10);
        const wounds = await new Roll(woundsExpression(homeWorld?.system.wounds ?? {}, toughnessBonus)).evaluate();
        const fate = await new Roll(fateExpression(homeWorld?.system.fate ?? {})).evaluate();
        update["system.wounds.max"] = update["system.wounds.value"] = wounds.total;
        update["system.fate.max"] = update["system.fate.value"] = fate.total;

        await actor.update(update);
        await actor.setFlag(GRANT_FLAG_SCOPE, "creationRolls",
                            {method, values, wounds: wounds.total, fate: fate.total});
        return true;
    }
```

The wounds roll is the book's own formula, so it already includes any flat bonus the home
world applies; do not add `plan.wounds` on top of it — that number belongs to backgrounds and
roles, and `_applyOriginStep` has already written it.

A reroll button clears the flag and reverts the wounds and fate values before re-running the
commit, so a second generation never stacks on the first.

- [ ] **Step 3: Verify in a live world**

With a Feral World acolyte: pick `rollModified`, confirm Strength and Toughness offer `3d10kh2+20` and Fellowship offers `3d10kl2+20`; roll all ten; confirm wounds land in 10–14 (`9+1d5`) and fate is 2. Switch to point buy on a fresh character and confirm the budget counter refuses an eleventh point over 60 and a value over 40.

- [ ] **Step 4: Commit**

```bash
git add script/creation/wizard.mjs template/apps/character-wizard.hbs
git commit -m "Generate characteristics, wounds and fate in the wizard"
```

---

### Task 15: The experience and divination steps, and finishing

**Files:**
- Modify: `script/creation/wizard.mjs`
- Modify: `template/apps/character-wizard.hbs`
- Modify: `lang/en.json`

**Interfaces:**
- Consumes: `emptyPlan` (`grant-data.mjs`); `planToActorUpdate`, `revertUpdate`, `GRANT_FLAG_SCOPE` (`origin-apply.mjs`) — all already imported by Task 13 except `emptyPlan`, which this task adds to the import line.
- Produces: `_applyExperienceStep()`, `_applyDivinationStep()`, `_revertDivination()`, `_finish()` on `CharacterWizard`; language keys `WIZARD.NO_DIVINATION_TABLE` and `WIZARD.ROLL_ALL`, `WIZARD.PICK_ORIGIN` (the latter two are used by Tasks 13 and 14 and must exist by the end of this task).

- [ ] **Step 1: The experience step**

Dark Heresy starts a character with 1,000 experience. The step shows the pool and the
aptitudes the three origin steps granted, so the player knows what is cheap, and leaves the
spending itself to the existing sheet.

The guard is a dedicated flag, not a test of whether experience is non-zero: a refund for a
duplicate grant can legitimately put experience above zero before this step ever runs, and
`> 0` would then skip the real award.

```javascript
    /** Dark Heresy, p. 78: an acolyte begins with 1,000 experience to spend. */
    static STARTING_EXPERIENCE = {dh2: 1000};

    async _applyExperienceStep() {
        const actor = this.actor;
        if (actor.getFlag(GRANT_FLAG_SCOPE, "startingExperienceApplied")) return true;
        const pool = CharacterWizard.STARTING_EXPERIENCE[this.ruleset] ?? 0;
        await actor.update({"system.experience.value": (actor.system.experience?.value ?? 0) + pool});
        await actor.setFlag(GRANT_FLAG_SCOPE, "startingExperienceApplied", pool);
        return true;
    }
```

- [ ] **Step 2: The divination step**

The roll goes through the same plan machinery as every other grant, so the divination's
mechanical part is recorded and can be taken back by a reroll:

```javascript
    async _applyDivinationStep() {
        const actor = this.actor;
        await this._revertDivination();                    // a reroll undoes the previous result first

        const table = game.tables.find(t => t.name === "Divinations")
            ?? await game.packs.get("dark-heresy.bc-tables")?.getDocuments()
                 .then(docs => docs.find(d => d.name === "Divinations"));
        if (!table) { ui.notifications?.warn(game.i18n.localize("WIZARD.NO_DIVINATION_TABLE")); return false; }

        const draw = await table.draw({displayChat: false});
        const result = draw.results[0];
        const effect = result?.flags?.[GRANT_FLAG_SCOPE]?.divinationEffect ?? {};

        const plan = {...emptyPlan(), characteristics: effect.characteristics ?? {},
                      wounds: effect.wounds ?? 0, corruption: effect.corruption ?? 0,
                      insanity: effect.insanity ?? 0};
        const {update, applied} = planToActorUpdate(actor, plan);
        update["system.bio.divination"] = result?.text ?? result?.name ?? "";
        if (effect.fate) {
            update["system.fate.max"] = (actor.system.fate?.max ?? 0) + effect.fate;
            update["system.fate.value"] = (actor.system.fate?.value ?? 0) + effect.fate;
        }
        await actor.update(update);
        await actor.setFlag(GRANT_FLAG_SCOPE, "divination", {applied, fate: effect.fate ?? 0});
        return true;
    }

    async _revertDivination() {
        const record = this.actor.getFlag(GRANT_FLAG_SCOPE, "divination");
        if (!record) return;
        const update = revertUpdate(this.actor, record.applied ?? {});
        if (record.fate) {
            update["system.fate.max"] = Math.max(0, (this.actor.system.fate?.max ?? 0) - record.fate);
            update["system.fate.value"] = Math.max(0, (this.actor.system.fate?.value ?? 0) - record.fate);
        }
        update["system.bio.divination"] = "";
        await this.actor.update(update);
        await this.actor.unsetFlag(GRANT_FLAG_SCOPE, "divination");
    }
```

- [ ] **Step 3: Finish**

```javascript
    async _finish() {
        const actor = this.actor;
        const named = stage => actor.items.find(i => i.type === "origin" && i.system.stage === stage)?.name ?? "";
        await actor.update({
            "system.bio.homeWorld": named("homeWorld"),
            "system.bio.background": named("background"),
            "system.bio.role": named("role")
        });
        await this.close();
        actor.sheet?.render(true, {focus: true});
    }
```

`#onNext` calls `_applyExperienceStep`, `_applyDivinationStep` or `_finish` according to
`this.step.kind`, in the same shape as the `origin` branch added in Task 13.

- [ ] **Step 4: Verify in a live world**

Run the whole Dark Heresy path start to finish on a new acolyte and confirm the sheet shows: home world, background and role filled in; the three named bonuses present as items; characteristics, wounds and fate set; 1,000 experience; a divination sentence.

- [ ] **Step 5: Commit**

```bash
git add script/creation/wizard.mjs template/apps/character-wizard.hbs
git commit -m "Add the experience and divination steps and finish the wizard"
```

---

### Task 16: The sidebar entry point

**Files:**
- Create: `script/creation/start.mjs`
- Modify: `script/dark-heresy.js`
- Modify: `lang/en.json`

**Interfaces:**
- Consumes: `openCharacterWizard` (`wizard.mjs`), `RULESET_DEFS` (`ruleset-data.mjs`).
- Produces: `registerCharacterStartButton()`, `startCharacterCreation()`, socket action `startCharacter`.

- [ ] **Step 1: Write the module**

```javascript
// script/creation/start.mjs
// "Create Character" in the Actors sidebar: makes an empty sheet and opens the builder on it.
//
// Players create their own characters, so the button is shown to everyone — but Foundry only
// grants ACTOR_CREATE to Assistants and GMs by default. Without the right, the button asks
// the active GM over the system socket; the GM creates the actor, hands ownership to the
// requester and answers, and the sheet and wizard open on the player's side.

import {openCharacterWizard} from "./wizard.mjs";

export const NEW_CHARACTER_NAME = "New Character";
const SOCKET = "system.dark-heresy";

export async function startCharacterCreation() {
    if (!game.user?.can?.("ACTOR_CREATE")) return requestCharacterFromGM();
    const actor = await Actor.create({name: NEW_CHARACTER_NAME, type: "acolyte"});
    if (!actor) return null;
    await openStartedCharacter(actor);
    return actor;
}

function requestCharacterFromGM() {
    if (!game.users?.activeGM) {
        ui.notifications?.warn(game.i18n.localize("WIZARD.NO_GM"));
        return null;
    }
    game.socket?.emit(SOCKET, {action: "startCharacter", userId: game.user.id});
    ui.notifications?.info(game.i18n.localize("WIZARD.ASKING_GM"));
    return null;
}

export async function openStartedCharacter(actor) {
    if (!actor) return null;
    await actor.sheet?.render(true);
    openCharacterWizard(actor);
    return actor;
}

/** Handle a player's request on the GM's client. */
export async function handleStartCharacterRequest(userId) {
    if (!game.user?.isActiveGM) return;
    const actor = await Actor.create({name: NEW_CHARACTER_NAME, type: "acolyte",
                                      ownership: {[userId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}});
    if (actor) game.socket?.emit(SOCKET, {action: "characterStarted", userId, actorId: actor.id});
}

export function registerCharacterStartButton() {
    Hooks.on("renderActorDirectory", (app, html) => {
        if (!game.user) return;
        const root = html?.[0] ?? html;
        if (!root?.querySelector || root.querySelector(".dh-start-character")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "dh-start-character";
        button.innerHTML = `<i class="fas fa-user-plus"></i> ${game.i18n.localize("WIZARD.START")}`;
        button.addEventListener("click", ev => { ev.preventDefault(); startCharacterCreation(); });

        const header = root.querySelector(".directory-header .header-actions, .directory-header, .header-actions");
        if (header) header.appendChild(button);
        else root.prepend(button);
    });
}
```

- [ ] **Step 2: Wire the socket and the hook**

Find the existing `game.socket.on("system.dark-heresy", ...)` handler in `script/dark-heresy.js` and add the two actions; if there is no handler yet, register one in the `ready` hook. Call `registerCharacterStartButton()` from the `init` hook.

The `characterStarted` branch runs on the requesting client:

```javascript
if (data.action === "characterStarted" && data.userId === game.user.id)
    openStartedCharacter(game.actors.get(data.actorId));
```

- [ ] **Step 3: Add the language keys**

```json
"WIZARD": {"START": "Create Character",
           "NO_GM": "No Gamemaster is online to create the character.",
           "ASKING_GM": "Asking the Gamemaster to create the sheet…"}
```

Merge these into the existing `WIZARD` block rather than adding a second one.

- [ ] **Step 4: Verify in a live world**

As GM: the button appears in the Actors sidebar and creates a character with the wizard open. As a player without create rights (use a second browser profile or a player login): the button appears, the GM's client creates the actor, and the sheet plus wizard open on the player's side with the player as owner.

- [ ] **Step 5: Commit**

```bash
git add script/creation/start.mjs script/dark-heresy.js lang/en.json
git commit -m "Add a Create Character button to the Actors sidebar"
```

---

### Task 17: Build the pack and verify against the book

**Files:**
- Modify: `packs/origins/**` (generated)
- Modify: `packs/bc-tables/**` (generated)
- Create: `docs/character-creation-verification.md`

- [ ] **Step 1: Close Foundry**

The desktop app holds a LevelDB `LOCK` on the pack directories. Ask the user to close Foundry before running the builders; do not attempt to work around the lock.

- [ ] **Step 2: Build**

```bash
node tools/build-items.mjs origins
node tools/build-tables.mjs
```

Expected: 21 origin items across 3 folders; the tables pack gains the Divinations table.

- [ ] **Step 3: Verify the built content**

With Foundry running again, open the "Character Origins" compendium and check three entries against the book, field by field: Feral World (p. 30), Adeptus Mechanicus (p. 51), Warrior (p. 74). Confirm characteristic modifiers, aptitudes, wounds formula, fate value and threshold, granted skills and talents, and the bonus text.

- [ ] **Step 4: Run the full path once more**

Build a complete character through the wizard and record the result in `docs/character-creation-verification.md`: the choices made, the values produced, and the book pages they come from. This is the document a reviewer checks the feature against.

- [ ] **Step 5: Run the whole suite**

Run: `node --test "tests/*.test.mjs" && node --check script/dark-heresy.js`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packs/origins packs/bc-tables docs/character-creation-verification.md
git commit -m "Build the origins compendium and record the Dark Heresy verification run"
```

---

## After this plan

Three follow-up plans, each reusing everything above:

1. **Rogue Trader** — five origin-path stages plus careers, and one new widget: the 6-column grid with the adjacency rule between rows, plus the Skill Mastery / Talented rule for a duplicate grant (the `plan.duplicates` list already records them).
2. **Only War** — regiment creation as a shared, budgeted set of origin stages stored in a world setting, plus the fourteen specialities.
3. **Black Crusade and Deathwatch** — races, archetypes and passions; Chapters and specialities. No new widgets.
