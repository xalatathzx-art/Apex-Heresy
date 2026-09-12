import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';

const CH = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility',
            'intelligence', 'perception', 'willpower', 'fellowship', 'influence'];

/** An actor of the given book, derived, with one plain and one specialist skill. */
function derived(ruleset) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    const characteristics = {};
    for (const key of CH)
        characteristics[key] = {base: 34, advance: 0, unnatural: 0, tempModifier: 0,
                                label: key, total: 34, displayTotal: 34, aptitudes: [], short: 'Ag'};
    const actor = Object.create(proto);
    actor.type = 'acolyte';
    actor.items = [];
    actor.system = {
        ruleset, characteristics,
        profitFactor: {starting: 40, value: 40, misfortunes: ''},
        skills: {
            medicae: {characteristics: ['Ag'], advance: -20, aptitudes: [], isSpecialist: false, specialities: {}},
            commonLore: {characteristics: ['Ag'], advance: -20, aptitudes: [], isSpecialist: true,
                         specialities: {imperium: {advance: -20, label: 'Imperium'}}},
            dodge: {characteristics: ['Ag'], advance: -20, aptitudes: [], isSpecialist: false, specialities: {}}
        }
    };
    actor._findCharacteristic = () => characteristics.agility;
    proto._computeSkills.call(actor);
    return actor.system;
}

test('a speciality of an Advanced skill is blocked too, not merely harder', () => {
    // Common Lore is Advanced in Rogue Trader, so "Common Lore (Imperium)" is
    // unusable untrained. Computing it by the other book's model would have let
    // a character walk round the ban through a sub-entry.
    const rt = derived('rt');
    assert.equal(rt.skills.commonLore.specialities.imperium.unusable, true);
    assert.equal(rt.skills.commonLore.specialities.imperium.total, 0);
});

test('a Basic speciality is still merely halved', () => {
    const rt = derived('rt');
    assert.equal(rt.skills.dodge.unusable, false);
    assert.equal(rt.skills.dodge.total, 17);
});

test('an acolyte keeps the old speciality arithmetic', () => {
    const dh2 = derived('dh2');
    assert.equal(dh2.skills.commonLore.specialities.imperium.total, 14);
    assert.equal(dh2.skills.commonLore.specialities.imperium.unusable, undefined);
});

test('a roll the book forbids is refused rather than rolled and failed', () => {
    // "Cannot perform a test with this Skill" is a ban, not a hard test. Rolling
    // against a target of zero spends the action and leaves a misleading card.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /_refuseUntrainedAdvanced\(this\.actor\.system\?\.skills\?\.\[skillName\]\)/);
    assert.match(source, /_refuseUntrainedAdvanced\(speciality\)/);
    const fn = source.slice(source.indexOf('_refuseUntrainedAdvanced(skill)'));
    assert.match(fn.slice(0, fn.indexOf('\n    }')), /SKILL\.UNTRAINED_ADVANCED/);
});

test('an explorer acquires against Profit Factor, not a hidden characteristic', () => {
    // Influence is not on the sheet any more, so acquisitions had to stop rolling
    // against it or the explorer would be testing a stat they cannot even see.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('async function rollAcquisition'));
    const body = fn.slice(0, fn.indexOf('const item ='));
    assert.match(body, /resource\?\.profitFactor/);
    assert.match(body, /actor\.system\.profitFactor\?\.value/);
    assert.match(body, /infamy\.displayTotal \?\? infamy\.total/, 'the other books are unchanged');
});

test('an explorer parries with Weapon Skill, because Parry is not a skill there', () => {
    // Table 3-1 has no Parry. Leaving the hidden skill in place would have had an
    // explorer parry untrained, at half characteristic — worse than the book.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /const parryIsSkill = !\(Dh\.rulesetFor\(actor\)\.skills\?\.absent \?\? \[\]\)\.includes\("parry"\)/);
    assert.match(source, /parry: parryIsSkill[\s\S]{0,200}createCharacteristicRollData\(actor, "weaponSkill"\)/);
});

test('an explorer can actually roll an acquisition', () => {
    // Profit Factor is the book's whole economy, and the button that rolls it
    // existed only on the Black Crusade sheet: the explorer had the resource and
    // no way to spend it. A stat nothing reads is the same defect as armour that
    // grants nothing.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const sheet = source.slice(source.indexOf('class RogueTraderSheet'));
    const body = sheet.slice(0, sheet.indexOf('\n}'));
    assert.match(body, /_getHeaderButtons\(\)/);
    assert.match(body, /prepareAcquisition\(this\.actor\)/);
});

test('the roll target matches the number printed on the sheet', () => {
    // Caught in the running application, not by these tests: the sheet showed an
    // untrained Dodge at 17 while the roll dialog offered 14, because the roll
    // added the raw -20 instead of halving. A sheet that disagrees with its own
    // dice is worse than one that is merely wrong.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    for (const fn of ['static createSkillRollData', 'static createSpecialtyRollData']) {
        const body = source.slice(source.indexOf(fn));
        const head = body.slice(0, body.indexOf('const defaultCharKey'));
        assert.match(head, /basicAdvanced/, `${fn} ignores the book's skill model`);
        assert.match(head, /rtSkillBase\(/, `${fn} does not use the rule`);
    }
});

test('a characteristic the book hides cannot be bought on the advances tab', () => {
    // The stats tab hid Influence and the progression tab went on selling it, so
    // the explorer could spend experience on a figure the sheet would not show.
    // Hiding something is not finished until every door to it is shut.
    const progression = readFileSync(
        new URL('../template/sheet/actor/tab/progression.hbs', import.meta.url), 'utf8');
    const at = progression.indexOf('name="system.characteristics.{{key}}.advance"');
    assert.ok(at > -1);
    assert.match(progression.slice(at - 400, at), /\{\{#unless characteristic\.absent\}\}/);
});

test('Initiative is rolled off a characteristic the book actually has', () => {
    const combat = readFileSync(
        new URL('../template/sheet/actor/tab/combat.hbs', import.meta.url), 'utf8');
    assert.match(combat, /selectOptions presentCharacteristics selected=system\.initiative\.characteristic/);
    assert.doesNotMatch(combat, /selectOptions system\.characteristics selected=system\.initiative/);
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const at = source.indexOf('data.presentCharacteristics =');
    assert.ok(at > -1, 'the filtered list is built for the template');
    assert.match(source.slice(at, at + 240), /filter\(\(\[, c\]\) => !c\.absent\)/);
});

test('every sheet that shows the combat tab is given the filtered list', () => {
    // The NPC sheet includes the same partial, so the key has to come from the
    // shared getData, not from a book sheet: an undefined list would empty the
    // dropdown instead of narrowing it.
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const at = source.indexOf('data.presentCharacteristics =');
    const before = source.slice(0, at);
    const owner = before.lastIndexOf('class ');
    const className = before.slice(owner, before.indexOf('\n', owner));
    assert.match(className, /class DarkHeresySheet /, `built in ${className.trim()}`);
});
