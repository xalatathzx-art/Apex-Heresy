import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSystem} from './helpers/system.mjs';
import {RT_CHARACTERISTICS, RT_ABSENT_CHARACTERISTICS, RT_ADVANCE_TIERS,
        RT_CHARACTERISTIC_COSTS, RT_SKILLS, RT_ABSENT_SKILLS, rtCharacteristicCost, rtSkillType, rtSkillBase}
    from '../script/data/rogue-trader.mjs';

test('Rogue Trader has nine characteristics, and Influence is not one', () => {
    // The printed sheet on p. 398 lists nine; Influence belongs to Dark Heresy 2.
    assert.equal(RT_CHARACTERISTICS.length, 9);
    assert.equal(RT_CHARACTERISTICS.includes('influence'), false);
    assert.deepEqual([...RT_ABSENT_CHARACTERISTICS], ['influence']);
});

test('the advance ladder has four steps, not five', () => {
    // p. 46: Simple, Intermediate, Trained, Expert. Dark Heresy 2 adds Proficient.
    assert.deepEqual([...RT_ADVANCE_TIERS], ['simple', 'intermediate', 'trained', 'expert']);
    for (const key of RT_CHARACTERISTICS)
        assert.equal(RT_CHARACTERISTIC_COSTS[key].length, 4, key);
});

test('the cost depends on the characteristic, not on aptitudes', () => {
    // Rogue Trader has no aptitudes at all; the price is printed per row.
    assert.deepEqual([...RT_CHARACTERISTIC_COSTS.ballisticSkill], [100, 250, 500, 750]);
    assert.deepEqual([...RT_CHARACTERISTIC_COSTS.intelligence], [500, 750, 1000, 2500]);
    assert.deepEqual([...RT_CHARACTERISTIC_COSTS.weaponSkill], [250, 500, 750, 1000]);
});

test('advance costs accumulate, as the ladder is climbed in order', () => {
    assert.equal(rtCharacteristicCost('ballisticSkill', 0), 0);
    assert.equal(rtCharacteristicCost('ballisticSkill', 1), 100);
    assert.equal(rtCharacteristicCost('ballisticSkill', 3), 850);
    assert.equal(rtCharacteristicCost('ballisticSkill', 4), 1600);
});

test('the ladder stops at four, and nonsense costs nothing', () => {
    assert.equal(rtCharacteristicCost('ballisticSkill', 9), 1600);
    assert.equal(rtCharacteristicCost('influence', 2), 0, 'a characteristic RT does not have');
    assert.equal(rtCharacteristicCost('ballisticSkill', -3), 0);
});

test('skills are Basic or Advanced', () => {
    assert.equal(rtSkillType('dodge'), 'basic');
    assert.equal(rtSkillType('awareness'), 'basic');
    assert.equal(rtSkillType('medicae'), 'advanced');
    assert.equal(rtSkillType('techUse'), 'advanced');
});

test('an untrained Basic skill tests at half the characteristic, rounded down', () => {
    // p. 231, Table 9-1. The book says "round down" outright, which is why this
    // one goes against the general round-up rule.
    assert.deepEqual({...rtSkillBase({characteristic: 34, advance: -20, type: 'basic'})},
        {base: 17, usable: true});
    assert.deepEqual({...rtSkillBase({characteristic: 35, advance: -20, type: 'basic'})},
        {base: 17, usable: true});
});

test('an untrained Advanced skill cannot be tested at all', () => {
    assert.deepEqual({...rtSkillBase({characteristic: 40, advance: -20, type: 'advanced'})},
        {base: 0, usable: false});
});

test('training gives the full characteristic, mastery adds its bonus', () => {
    assert.equal(rtSkillBase({characteristic: 34, advance: 0, type: 'basic'}).base, 34);
    assert.equal(rtSkillBase({characteristic: 34, advance: 10, type: 'basic'}).base, 44);
    assert.equal(rtSkillBase({characteristic: 34, advance: 20, type: 'advanced'}).base, 54);
});

test("the book's own worked example comes out right", () => {
    // p. 231: Drake's Agility is 34 and he is untrained in Silent Move, a Basic
    // skill, so he tests at 17. Trained in Dodge, he tests at his full 34.
    assert.equal(rtSkillBase({characteristic: 34, advance: -20, type: 'basic'}).base, 17);
    assert.equal(rtSkillBase({characteristic: 34, advance: 0, type: 'basic'}).base, 34);
});

test('a missing characteristic cannot produce a negative target', () => {
    assert.equal(rtSkillBase({characteristic: -5, advance: 0, type: 'basic'}).base, 0);
});

// ── Reaching the sheet ────────────────────────────────────────────────────


const CHARACTERISTICS = ['weaponSkill', 'ballisticSkill', 'strength', 'toughness', 'agility',
                         'intelligence', 'perception', 'willpower', 'fellowship', 'influence'];

/** Derive an actor of the given book and report its characteristics. */
function characteristicsOf(ruleset) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    const characteristics = {};
    for (const key of CHARACTERISTICS)
        characteristics[key] = {base: 30, advance: 0, unnatural: 0, tempModifier: 0, label: key};

    const actor = Object.create(proto);
    actor.type = 'acolyte';
    actor.system = {
        ruleset, characteristics,
        fatigue: {value: 0, max: 0}, psy: {rating: 0, sustained: 0},
        initiative: {characteristic: 'agility'}, insanity: 0, corruption: 0
    };
    actor._getAdvanceCharacteristic = () => 0;
    proto._computeCharacteristics.call(actor);
    return actor.system.characteristics;
}

test('the Rogue Trader profile is no longer a clone of Dark Heresy', () => {
    const rulesets = loadSystem().get('Dh.rulesets');
    assert.deepEqual([...rulesets.rt.characteristics.absent], ['influence']);
    assert.equal(rulesets.rt.advances.tiers, 4);
    assert.equal(rulesets.rt.advances.aptitudes, false);
    assert.equal(rulesets.rt.skills.model, 'basicAdvanced');
    assert.equal(rulesets.rt.resource.profitFactor, true);
});

test('Only War is still an honest clone, and says so', () => {
    // It has not been audited, and pretending otherwise would be worse than
    // leaving it plainly inherited.
    const rulesets = loadSystem().get('Dh.rulesets');
    assert.equal(rulesets.ow.characteristics, undefined);
    assert.equal(rulesets.ow.id, 'ow');
});

test('an explorer shows nine characteristics, without Influence', () => {
    const shown = Object.entries(characteristicsOf('rt'))
        .filter(([, c]) => c.isLeft || c.isRight)
        .map(([key]) => key);
    assert.equal(shown.length, 9);
    assert.equal(shown.includes('influence'), false);
});

test('an acolyte still shows all ten', () => {
    const shown = Object.entries(characteristicsOf('dh2'))
        .filter(([, c]) => c.isLeft || c.isRight)
        .map(([key]) => key);
    assert.equal(shown.length, 10);
    assert.ok(shown.includes('influence'));
});

test('the two columns split the visible characteristics, not the stored ones', () => {
    // Nine split as five and four; a tenth hidden entry must not leave a gap.
    const rt = Object.values(characteristicsOf('rt'));
    assert.equal(rt.filter(c => c.isLeft).length, 5);
    assert.equal(rt.filter(c => c.isRight).length, 4);
});

test('Profit Factor is on the sheet, with the three fields the book prints', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const sheet = source.slice(source.indexOf('class RogueTraderSheet'));
    assert.match(sheet.slice(0, 400), /static vitals = \["wounds", "fate", "profit-factor", "fatigue"\]/);
    const panel = readFileSync(new URL('../template/sheet/actor/partial/vital-profit-factor.hbs', import.meta.url), 'utf8');
    for (const field of ['profitFactor.starting', 'profitFactor.value', 'profitFactor.misfortunes'])
        assert.match(panel, new RegExp(field.replace('.', '\.')), field);
});

test('the questionnaire asks what the printed sheet asks', () => {
    const bio = readFileSync(new URL('../template/sheet/actor/partial/bio-rogue-trader.hbs', import.meta.url), 'utf8');
    for (const key of ['BIO.CAREER_PATH', 'BIO.RANK', 'BIO.HOME_WORLD', 'BIO.MOTIVATION'])
        assert.match(bio, new RegExp(key.replace('.', '\.')), key);
});

// ── The two mechanics ─────────────────────────────────────────────────────

/** Derive an actor of the given book and report one skill. */
function skillOf(ruleset, skillKey, advance) {
    const system = loadSystem();
    const proto = system.get('DarkHeresyActor.prototype');
    const characteristics = {};
    for (const key of CHARACTERISTICS)
        characteristics[key] = {base: 34, advance: 0, unnatural: 0, tempModifier: 0,
                                label: key, total: 34, displayTotal: 34, aptitudes: []};

    const actor = Object.create(proto);
    actor.type = 'acolyte';
    actor.items = [];
    actor.system = {
        ruleset, characteristics,
        skills: {[skillKey]: {characteristics: ['Ag'], advance, aptitudes: []}}
    };
    actor._findCharacteristic = () => characteristics.agility;
    proto._computeSkills.call(actor);
    return actor.system.skills[skillKey];
}

test('an explorer untrained in a Basic skill tests at half, rounded down', () => {
    const skill = skillOf('rt', 'dodge', -20);
    assert.equal(skill.total, 17, 'Agility 34 halves to 17');
    assert.equal(skill.unusable, false);
});

test('an explorer untrained in an Advanced skill cannot test at all', () => {
    const skill = skillOf('rt', 'medicae', -20);
    assert.equal(skill.unusable, true);
    assert.equal(skill.untrainedType, 'advanced');
});

test('training and mastery give the full characteristic and its bonus', () => {
    assert.equal(skillOf('rt', 'dodge', 0).total, 34);
    assert.equal(skillOf('rt', 'dodge', 10).total, 44);
    assert.equal(skillOf('rt', 'medicae', 20).total, 54);
});

test('an acolyte keeps the Dark Heresy model, untrained at -20 and never barred', () => {
    assert.equal(skillOf('dh2', 'dodge', -20).total, 14);
    assert.equal(skillOf('dh2', 'medicae', -20).total, 14);
    assert.equal(skillOf('dh2', 'medicae', -20).unusable, undefined);
});

test("an explorer's advances are priced by the characteristic, not by aptitudes", () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('const characteristicCosts = Dh.rulesetFor'));
    const body = fn.slice(0, fn.indexOf('for (let skill of'));
    assert.match(body, /advances\?\.aptitudes === false/);
    assert.match(body, /rtCharacteristicCost\(characteristicKey/);
});

// ── The skill list ────────────────────────────────────────────────────────

test('all forty-eight skills of Table 3-1 are present', () => {
    assert.equal(RT_SKILLS.length, 48);
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    const stored = Object.keys(template.Actor.templates.skills.skills);
    for (const key of RT_SKILLS) assert.ok(stored.includes(key), `no storage for ${key}`);
});

test('twenty are Basic and twenty-eight Advanced, as the table splits them', () => {
    const basic = RT_SKILLS.filter(key => rtSkillType(key) === 'basic');
    assert.equal(basic.length, 20);
    assert.equal(RT_SKILLS.length - basic.length, 28);
});

test("the skills Rogue Trader does not have are named and hidden", () => {
    // Athletics is its Climb and Swim, Linguistics its Literacy, Secret Tongue
    // and Speak Language, Operate its Drive and Pilot, Stealth its Concealment
    // and Silent Move. Parry is not a skill at all: it is a Weapon Skill test.
    assert.deepEqual([...RT_ABSENT_SKILLS], ['athletics', 'linguistics', 'operate', 'parry', 'stealth']);
    for (const key of RT_ABSENT_SKILLS) assert.equal(RT_SKILLS.includes(key), false, key);
});

test('what the book split, the system now stores separately', () => {
    for (const key of ['climb', 'swim', 'literacy', 'secretTongue', 'speakLanguage',
                       'drive', 'pilot', 'concealment', 'silentMove'])
        assert.ok(RT_SKILLS.includes(key), key);
});

test('Lip Reading is not added, because the rules table does not have it', () => {
    // The printed sheet on p. 398 lists it, but Table 3-1 and the rules text do
    // not: it is a leftover from the Dark Heresy 1 sheet. The table wins.
    assert.equal(RT_SKILLS.includes('lipReading'), false);
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.equal('lipReading' in template.Actor.templates.skills.skills, false);
});

test('every skill the sheet can show has a label', () => {
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    for (const [key, skill] of Object.entries(template.Actor.templates.skills.skills))
        assert.ok(lang[skill.label], `${key} has no string for ${skill.label}`);
});

test('the Performer skill now exists, which it never did', () => {
    // It was registered as a module attribute key while having no storage, so an
    // effect aimed at it went nowhere. Adding the Rogue Trader list fixes that.
    const template = JSON.parse(readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
    assert.ok('performer' in template.Actor.templates.skills.skills);
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /"performer"/, 'and it is still offered to modules');
});

test('an absent skill is hidden on the sheet rather than deleted', () => {
    // Storage is shared so a character can be re-pointed at another book; only
    // the rendering follows the book.
    const stats = readFileSync(new URL('../template/sheet/actor/tab/stats.hbs', import.meta.url), 'utf8');
    const progression = readFileSync(new URL('../template/sheet/actor/tab/progression.hbs', import.meta.url), 'utf8');
    for (const [name, file] of [['stats', stats], ['progression', progression]])
        assert.match(file, /\{\{#unless skill\.absent\}\}/, name);
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /skill\.absent = absentSkills\.includes\(skillKey\)/);
});
