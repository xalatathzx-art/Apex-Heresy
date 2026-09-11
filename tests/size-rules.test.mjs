import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sizeToHitModifier, targetSizeModifier, carapaceAdjustedSize, armourSizeModifier,
    describeTargetSize, SIZE_NAMES, AVERAGE_SIZE, SPACE_MARINE_SIZE}
    from '../script/data/size-rules.mjs';

test('the size table is the book\'s, step for step (p. 143)', () => {
    const printed = {1: -30, 2: -20, 3: -10, 4: 0, 5: 10, 6: 20, 7: 30, 8: 40, 9: 50, 10: 60};
    for (const [step, modifier] of Object.entries(printed))
        assert.equal(sizeToHitModifier(Number(step)), modifier, SIZE_NAMES[step]);
    assert.equal(AVERAGE_SIZE, 4);
    assert.equal(SPACE_MARINE_SIZE, 5, 'Armoured Space Marines are Hulking');
    // Nothing sensible comes of a missing or silly value, so it reads as average.
    assert.equal(sizeToHitModifier(undefined), 0);
    assert.equal(sizeToHitModifier(99), 60);
    assert.equal(sizeToHitModifier(0), -30);
});

test('an ordinary target is priced by its size alone', () => {
    assert.equal(targetSizeModifier({size: 4}), 0, 'a human');
    assert.equal(targetSizeModifier({size: 5}), 10, 'an Ork Nob');
    assert.equal(targetSizeModifier({size: 3}), -10, 'a gretchin');
    assert.equal(targetSizeModifier({}), 0, 'no size given, no modifier');
});

test('the Black Carapace hides the bulk of his own armour, and no more (p. 50)', () => {
    // Hulking would be +10; the Carapace takes the shooter's advantage away entirely.
    assert.equal(targetSizeModifier({size: 5, spaceMarine: true}), 0);
    assert.equal(carapaceAdjustedSize(5), AVERAGE_SIZE);
    // A Legionnaire who somehow shrank is not made bigger by the flag.
    assert.equal(targetSizeModifier({size: 3, spaceMarine: true}), -10);
});

test('grow past a Legionnaire and the difference shows again', () => {
    // Gifts of the gods, a mutation, a suit too big — the Carapace covers one step,
    // so an Enormous Heretic is still shot at as Hulking.
    assert.equal(targetSizeModifier({size: 6, spaceMarine: true}), 10);
    assert.equal(targetSizeModifier({size: 7, spaceMarine: true}), 20);
    assert.equal(carapaceAdjustedSize(6), 5);
    // Without the flag those same steps read straight off the table.
    assert.equal(targetSizeModifier({size: 6}), 20);
    assert.equal(targetSizeModifier({size: 7}), 30);
});

test('armour adds its own modifier on top, and that is where Terminator plate lives (p. 177)', () => {
    // The suit's +10 is a number on its card, not a name the code recognises.
    assert.equal(targetSizeModifier({size: 5, spaceMarine: true, armour: 10}), 10,
        'the Carapace still hides his own bulk; the suit on top of it does not hide');
    assert.equal(targetSizeModifier({size: 4, armour: 10}), 10, 'a human in the same suit');
    assert.equal(targetSizeModifier({size: 6, spaceMarine: true, armour: 10}), 20);
    // A suit can just as well make its wearer harder to see.
    assert.equal(targetSizeModifier({size: 4, armour: -10}), -10);
});

test('only worn armour counts, and its number is read from the card', () => {
    const worn = {type: 'armour', name: 'Legion Terminator Armour', system: {equipped: true, sizeModifier: 10}};
    const carried = {type: 'armour', name: 'Legion Terminator Armour', system: {equipped: false, sizeModifier: 10}};
    const plain = {type: 'armour', name: 'Legion Power Armour', system: {equipped: true, sizeModifier: 0}};
    assert.equal(armourSizeModifier([worn]), 10);
    assert.equal(armourSizeModifier([carried]), 0, 'carrying it is not wearing it');
    assert.equal(armourSizeModifier([plain]), 0);
    assert.equal(armourSizeModifier([worn, plain]), 10, 'worn pieces add up');
    assert.equal(armourSizeModifier([{type: 'weapon', system: {equipped: true, sizeModifier: 10}}]), 0);
    assert.equal(armourSizeModifier([]), 0);
});

test('the system asks the module rather than keeping a second table', () => {
    const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
    assert.match(source, /import \{targetSizeModifier, sizeToHitModifier, armourSizeModifier, describeTargetSize\}/);
    assert.match(source, /return targetSizeModifier\(\{/);
    assert.equal(source.includes('const sizeModifiers = {'), false, 'the old copy of the table is gone');
});

test('the card can say where the number came from', () => {
    // A plain target: just how big it is.
    assert.deepEqual(describeTargetSize({size: 5}),
        {modifier: 10, size: 5, sizeName: 'hulking', carapace: false, armour: 0});
    // A Legionnaire: zero, and the card must be able to say why it is zero.
    assert.deepEqual(describeTargetSize({size: 5, spaceMarine: true}),
        {modifier: 0, size: 5, sizeName: 'hulking', carapace: true, armour: 0});
    // Grown past his armour: the Carapace still helps, but no longer hides him.
    assert.deepEqual(describeTargetSize({size: 6, spaceMarine: true}),
        {modifier: 10, size: 6, sizeName: 'enormous', carapace: true, armour: 0});
    // In Terminator plate the Carapace still covers his own bulk, and the suit shows above it.
    assert.deepEqual(describeTargetSize({size: 5, spaceMarine: true, armour: 10}),
        {modifier: 10, size: 5, sizeName: 'hulking', carapace: true, armour: 10});
});

test('the chat card shows the line even when the modifier is zero', () => {
    const card = readFileSync(new URL('../template/chat/roll.hbs', import.meta.url), 'utf8');
    // Keyed on the label, not the number: a zero from the Black Carapace is a rule
    // that fired, not a rule that was missing.
    assert.match(card, /\{\{#if targetSizeLabel\}\}/);
    assert.match(card, /\{\{targetSizeLabel\}\} \(\{\{signed targetSizeModifier\}\}\)/);
    const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    for (const step of Object.values(SIZE_NAMES))
        assert.ok(lang[`SIZE_STEP.${step.toUpperCase()}`], step);
    assert.ok(lang['BLACK_CARAPACE']);
    assert.ok(lang['TERMINATOR_ARMOUR']);
});
