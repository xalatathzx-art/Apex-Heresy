import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PERSONAL_DEMEANOURS, PERSONAL_DEMEANOUR_FORMULA, PAST_EVENT_FORMULA,
        ARMOUR_HISTORY_TABLE, rowForRoll, personalDemeanourFor, pastEventsOf,
        lifeLine} from '../script/creation/dw-life-data.mjs';
import {stepsFor} from '../script/creation/ruleset-data.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const chapters = read('../packs-src/origins/11-dw-chapters.json');
const wizard = readFileSync(new URL('../script/creation/wizard.mjs', import.meta.url), 'utf8');
const markup = readFileSync(new URL('../template/apps/character-wizard.hbs', import.meta.url), 'utf8');
const lang = read('../lang/en.json');

test('the life step is the last one the book asks for (p. 25)', () => {
    const steps = stepsFor('dw');
    assert.equal(steps.at(-1).id, 'life');
    assert.equal(steps.at(-1).kind, 'life');
    // And the wizard now answers for that kind, which it did not before.
    assert.match(wizard, /this\.step\?\.kind === "life" \? this\._lifeStepContext\(\)/);
    assert.match(wizard, /this\._wireLife\(root\);/);
});

test('every Chapter prints five pasts, rolled on 1d5 (pp. 29-30)', () => {
    assert.equal(PAST_EVENT_FORMULA, '1d5');
    for (const chapter of chapters) {
        const rows = pastEventsOf(chapter.system);
        assert.equal(rows.length, 5, chapter.name);
        assert.deepEqual(rows.map(row => row.roll), [1, 2, 3, 4, 5], chapter.name);
        for (const row of rows) {
            assert.ok(row.name, `${chapter.name}: a row has no name`);
            assert.ok(row.text.length > 40, `${chapter.name}: ${row.name} has no text`);
        }
    }
    const wolves = pastEventsOf(chapters.find(c => c.system.key === 'spaceWolves').system);
    assert.equal(rowForRoll(wolves, 1).name, 'Bitter Vengeance');
    assert.equal(rowForRoll(wolves, 5).name, 'The Great Hunt');
    assert.equal(rowForRoll(wolves, 6), null, 'nothing beyond the table');
    // A Chapter written by the table with no list of its own is not an error.
    assert.deepEqual(pastEventsOf({rules: {}}), []);
});

test('the personal Demeanour is Table 1-10, chosen or rolled on 1d10 (p. 32)', () => {
    assert.equal(PERSONAL_DEMEANOUR_FORMULA, '1d10');
    assert.equal(PERSONAL_DEMEANOURS.length, 10);
    assert.deepEqual(PERSONAL_DEMEANOURS.map(row => row.roll), [1,2,3,4,5,6,7,8,9,10]);
    assert.equal(personalDemeanourFor(1).name, 'Calculating');
    assert.equal(personalDemeanourFor(6).name, 'Pious');
    assert.equal(personalDemeanourFor(10).name, 'Proud');
    for (const row of PERSONAL_DEMEANOURS) assert.ok(row.text.length > 20, row.name);
});

test('a row goes into the biography as name and description together', () => {
    assert.equal(lifeLine({name: 'Stoic', text: 'No test of endurance is too much.'}),
        'Stoic: No test of endurance is too much.');
    // A name alone still reads; so does a description alone.
    assert.equal(lifeLine({name: 'Proud'}), 'Proud');
    assert.equal(lifeLine({text: 'Only prose.'}), 'Only prose.');
    assert.equal(lifeLine(null), '');
});

test('the step writes the three fields the book prints on its sheet', () => {
    for (const field of ['pastEvent', 'demeanour', 'armourHistory'])
        assert.ok(markup.includes(`data-life-field="${field}"`), field);
    // Each of the three can be rolled as well as chosen.
    assert.match(wizard, /_rollPastEvent\(\)/);
    assert.match(wizard, /_rollPersonalDemeanour\(\)/);
    assert.match(wizard, /_rollArmourHistory\(\)/);
    assert.match(markup, /wizard-roll-past/);
    assert.match(markup, /wizard-roll-demeanour-personal/);
    assert.match(markup, /wizard-roll-armour/);
});

test('the armour history comes from the compendium table, not a copy in the code', () => {
    assert.equal(ARMOUR_HISTORY_TABLE, 'Power Armour History');
    const table = read('../packs-src/tables/power-armour-history.json');
    assert.equal(table.name, ARMOUR_HISTORY_TABLE);
    assert.equal(table.results.length, 10, 'Table 5-12 is a d10');
    assert.match(wizard, /this\._lifeTable\(ARMOUR_HISTORY_TABLE\)/);
});

test('the Chapter Demeanour is shown but not chosen: it never changes (p. 32)', () => {
    assert.match(markup, /\{\{lifeChapterDemeanour\}\}/);
    assert.equal(markup.includes('data-life-field="chapterDemeanour"'), false,
        'it came with the Chapter and the book says it does not change');
    assert.ok(lang['WIZARD.CHAPTER_DEMEANOUR_IS']);
});

test('every string the step renders exists', () => {
    for (const key of ['WIZARD.LIFE', 'WIZARD.ROLL', 'WIZARD.CHOOSE', 'WIZARD.CHAPTER_DEMEANOUR_IS',
                       'WIZARD.NO_PAST_TABLE', 'WIZARD.NO_ARMOUR_TABLE',
                       'DEATHWATCH.PAST_EVENT', 'DEATHWATCH.PERSONAL_DEMEANOUR',
                       'DEATHWATCH.ARMOUR_HISTORY'])
        assert.ok(lang[key], key);
});
