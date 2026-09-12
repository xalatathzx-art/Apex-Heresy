import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FATE_ABILITIES, FATE_INITIATIVE_ROLL, fateHealing, fateOwnerId} from '../script/combat/fate.mjs';

const ids = FATE_ABILITIES.map(a => a.id);

test('all seven uses from p. 294 are offered', () => {
    for (const id of ['reroll', 'bonus', 'degree', 'initiative', 'heal', 'stun', 'fatigue'])
        assert.ok(ids.includes(id), `missing ${id}`);
    assert.equal(FATE_ABILITIES.length, 7);
});

test('the two the table has to adjudicate are marked as such', () => {
    // "+10 to a test" and "add a degree" depend on which test, which the system
    // cannot know; the card announces them instead of pretending to apply them.
    const byId = new Map(FATE_ABILITIES.map(a => [a.id, a]));
    assert.equal(byId.get('bonus').resolves, false);
    assert.equal(byId.get('degree').resolves, false);
    assert.equal(byId.get('reroll').resolves, false);
});

test('the four the system can finish are marked as such', () => {
    const byId = new Map(FATE_ABILITIES.map(a => [a.id, a]));
    for (const id of ['initiative', 'heal', 'stun', 'fatigue'])
        assert.equal(byId.get(id).resolves, true, id);
});

test('Initiative counts as a rolled 10', () => {
    assert.equal(FATE_INITIATIVE_ROLL, 10);
});

test('healing removes the roll, capped by the wounds actually taken', () => {
    assert.deepEqual({...fateHealing({wounds: 7, roll: 4})}, {healed: 4, wounds: 3});
    assert.deepEqual({...fateHealing({wounds: 2, roll: 5})}, {healed: 2, wounds: 0});
});

test('healing never touches Critical damage', () => {
    // p. 294: "This cannot be used to remove Critical damage." The function is
    // not even given the critical total, so it cannot spend itself on one.
    const healed = fateHealing({wounds: 0, roll: 5});
    assert.deepEqual({...healed}, {healed: 0, wounds: 0});
    const source = readFileSync(new URL('../script/combat/fate.mjs', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('export function fateHealing'));
    assert.doesNotMatch(fn.slice(0, fn.indexOf('\n}')), /critical/i);
});

test('an unhurt character wastes nothing on healing', () => {
    assert.equal(fateHealing({wounds: 0, roll: 3}).healed, 0);
});

test('the Fate spent on an evasion is the evader’s, not the attacker’s', () => {
    // The card belongs to the attacker; the evading character is recorded
    // separately. Charging the attacker for someone else's re-roll is theft.
    const rollData = {
        ownerId: 'attacker',
        flags: {isEvasion: true},
        evasions: {selected: 'dodge', dodge: {ownerId: 'evader'}}
    };
    assert.equal(fateOwnerId(rollData), 'evader');
});

test('an ordinary roll spends the roller’s own Fate', () => {
    assert.equal(fateOwnerId({ownerId: 'someone', flags: {}}), 'someone');
    assert.equal(fateOwnerId({ownerId: 'someone'}), 'someone');
});

test('a malformed evasion falls back to the card owner rather than nobody', () => {
    assert.equal(fateOwnerId({ownerId: 'attacker', flags: {isEvasion: true}}), 'attacker');
    assert.equal(fateOwnerId(null), null);
});

// ── Reaching the sheet ────────────────────────────────────────────────────

test('the Fate bar carries a spend button, as the Infamy bar always did', () => {
    const panel = readFileSync(new URL('../template/sheet/actor/partial/vital-fate.hbs', import.meta.url), 'utf8');
    assert.match(panel, /class="fate-spend"/);
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /\.fate-spend"\)\.click/);
    assert.match(source, /async _onFateSpend\(\)/);
});

test('the four mechanical uses are carried out', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('async function spendFatePoint'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /case "fatigue":[\s\S]{0,120}system\.fatigue\.value"\] = 0/);
    assert.match(body, /case "heal":[\s\S]{0,400}fateHealing/);
    assert.match(body, /case "initiative":[\s\S]{0,400}FATE_INITIATIVE_ROLL/);
    assert.match(body, /case "stun":[\s\S]{0,120}removeCondition\("stunned"\)/);
});

test('the Fate heal leaves Critical damage alone, unlike the Infamy one', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fate = source.slice(source.indexOf('async function spendFatePoint'));
    const fateBody = fate.slice(0, fate.indexOf('\n}'));
    assert.doesNotMatch(fateBody, /wounds\.critical/, 'Fate never clears critical wounds');
    const infamy = source.slice(source.indexOf('async function spendInfamyPoint'));
    assert.match(infamy.slice(0, infamy.indexOf('\n}')), /wounds\.critical"\] = 0/,
        'while Infamy still does, which is its own rule');
});

test('a re-roll charges the character who actually rolled', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('function rerollTest(rollData)'));
    assert.match(fn.slice(0, fn.indexOf('\n}')), /_fateActorFor\(rollData\)/);
    assert.match(source, /let actor = _fateActorFor\(message\.getRollData\(\)\);/,
        'and the menu offers it to them, not to the card owner');
});

test('every ability has a string', () => {
    const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    for (const ability of FATE_ABILITIES) assert.ok(lang[ability.label], ability.id);
    for (const key of ['FATE_SPEND_TITLE', 'FATE_SPEND_PROMPT', 'FATE_SPEND', 'FATE_NO_POINTS', 'FATE_HEALED'])
        assert.ok(lang[key], key);
});
