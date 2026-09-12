import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../script/dark-heresy.js', import.meta.url), 'utf8');
const env = readFileSync(new URL('../script/environment.mjs', import.meta.url), 'utf8');
const lang = JSON.parse(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));

test('the scene controls carry a toggle for the environment panel', () => {
    // Requested beside the ruler, in the left controls: there was no way to
    // put the panel away at all.
    assert.match(source, /Hooks\.on\("getSceneControlButtons"/);
    const hook = source.slice(source.indexOf('Hooks.on("getSceneControlButtons"'));
    const body = hook.slice(0, hook.indexOf('\n});'));
    assert.match(body, /tools\.dhEnvironment = \{/);
    assert.match(body, /toggle: true/);
});

test('the toggle reflects the state it will change', () => {
    const hook = source.slice(source.indexOf('Hooks.on("getSceneControlButtons"'));
    const body = hook.slice(0, hook.indexOf('\n});'));
    assert.match(body, /active: !isEnvWidgetHidden\(\)/);
    assert.match(body, /onChange: \(event, active\) => setEnvWidgetHidden\(!active\)/);
});

test('it survives a missing control group rather than throwing', () => {
    // Another module can reshape the controls; a system that explodes there
    // takes the whole toolbar with it.
    const hook = source.slice(source.indexOf('Hooks.on("getSceneControlButtons"'));
    assert.match(hook.slice(0, hook.indexOf('\n});')), /if \(!tools\) return;/);
});

test('hiding removes the panel instead of making it invisible', () => {
    // A transparent panel still swallows clicks on the canvas underneath.
    const fn = env.slice(env.indexOf('export function refreshEnvWidget'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    assert.match(body, /isEnvWidgetHidden\(\)\) \{ el\?\.remove\(\); return; \}/);
});

test('the choice belongs to the user, not the scene', () => {
    assert.match(env, /const ENV_HIDDEN_KEY = "wh-env-hidden"/);
    assert.match(env, /localStorage\.setItem\(ENV_HIDDEN_KEY/);
});

test('storage that refuses to answer does not break the panel', () => {
    const fn = env.slice(env.indexOf('export function isEnvWidgetHidden'));
    assert.match(fn.slice(0, fn.indexOf('\n}')), /catch \(e\) \{ return false; \}/);
});

test('the toggle has a label', () => {
    assert.ok(lang['ENVIRONMENT_TOGGLE']);
});
