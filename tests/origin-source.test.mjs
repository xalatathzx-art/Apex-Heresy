import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {validateOrigin, STAGES} from '../script/creation/origin-data.mjs';

const dir = new URL('../packs-src/origins/', import.meta.url);
const sourceFiles = () => existsSync(dir)
    ? readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'folders.json')
    : [];
const entriesOf = file => JSON.parse(readFileSync(new URL(file, dir), 'utf8'));

test('the origins source directory exists with a folder map', () => {
    assert.ok(existsSync(dir), 'packs-src/origins is missing');
    assert.ok(existsSync(new URL('folders.json', dir)), 'packs-src/origins/folders.json is missing');
});

test('every authored origin is valid and unique within its ruleset and stage', () => {
    const seen = new Set();
    for (const file of sourceFiles()) {
        const entries = entriesOf(file);
        assert.ok(Array.isArray(entries), `${file} must hold an array`);
        for (const entry of entries) {
            assert.equal(entry.type, 'origin', `${file}: ${entry.name} is ${entry.type}`);
            assert.ok(entry.name, `${file}: an entry has no name`);
            assert.ok(entry.system?.source, `${file}: ${entry.name} cites no book page`);
            const problems = validateOrigin(entry.system);
            assert.deepEqual(problems, [], `${file}: ${entry.name}: ${problems.join('; ')}`);
            const id = `${entry.system.ruleset}:${entry.system.stage}:${entry.system.key}`;
            assert.ok(!seen.has(id), `duplicate origin ${id}`);
            seen.add(id);
        }
    }
});

test('an origin that requires another stage names a stage of the same ruleset', () => {
    for (const file of sourceFiles())
        for (const entry of entriesOf(file)) {
            const requires = entry.system.requires;
            if (!requires) continue;
            assert.ok(STAGES[entry.system.ruleset].includes(requires.stage),
                `${file}: ${entry.name} requires unknown stage ${requires.stage}`);
        }
});

test('every folder an entry names exists in the folder map', () => {
    if (!existsSync(new URL('folders.json', dir))) return;
    const folders = new Set(Object.keys(JSON.parse(readFileSync(new URL('folders.json', dir), 'utf8'))));
    for (const file of sourceFiles())
        for (const entry of entriesOf(file))
            if (entry.folder) assert.ok(folders.has(entry.folder), `${file}: ${entry.name} is in unknown folder "${entry.folder}"`);
});

test('the origins pack is registered in system.json', () => {
    const system = JSON.parse(readFileSync(new URL('../system.json', import.meta.url), 'utf8'));
    const pack = system.packs.find(p => p.name === 'origins');
    assert.ok(pack, 'system.json declares no origins pack');
    assert.equal(pack.type, 'Item');
    assert.equal(pack.path, 'packs/origins');
});
