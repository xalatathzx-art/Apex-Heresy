import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

/**
 * Run the fatigue sync over an actor carrying the given fatigue, and report
 * which conditions were added and removed.
 */
async function sync({value, max, conditions = [], type = 'acolyte'}) {
    const system = loadSystem();
    const held = new Set(conditions);
    const added = [];
    const removed = [];
    const actor = {
        type,
        name: 'Subject',
        system: {fatigue: {value, max}},
        characteristics: {toughness: {bonus: 3}},
        hasCondition: id => held.has(id),
        addCondition: async id => { held.add(id); added.push(id); },
        removeCondition: async id => { held.delete(id); removed.push(id); },
        getFlag: () => false,
        setFlag: async () => {},
        unsetFlag: async () => {},
        update: async () => {}
    };
    system.context.ChatMessage = {create: async () => ({}), getSpeaker: () => ({})};
    await system.get('syncFatigueState')(actor);
    return {added, removed, held};
}

test('fatigue above zero shows the fatigued status', async () => {
    const {added} = await sync({value: 2, max: 7});
    assert.ok(added.includes('fatigued'), 'the icon follows the counter');
});

test('fatigue back to zero takes the status off again', async () => {
    const {removed} = await sync({value: 0, max: 7, conditions: ['fatigued']});
    assert.ok(removed.includes('fatigued'));
});

test('the status is not re-applied when it is already there', async () => {
    const {added} = await sync({value: 3, max: 7, conditions: ['fatigued']});
    assert.equal(added.includes('fatigued'), false);
});

test('an unfatigued actor without the status is left alone', async () => {
    const {added, removed} = await sync({value: 0, max: 7});
    assert.deepEqual([...added], []);
    assert.deepEqual([...removed], []);
});

test('collapsing past the threshold still happens, and still shows fatigue', async () => {
    const {added} = await sync({value: 9, max: 7});
    assert.ok(added.includes('unconscious'), 'the existing collapse is unchanged');
    assert.ok(added.includes('fatigued'), 'and the counter is still reflected');
});
