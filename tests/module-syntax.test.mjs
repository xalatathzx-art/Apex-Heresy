import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

/**
 * Every file under script/ must parse as an ES module.
 *
 * The rest of the suite loads script/dark-heresy.js in a vm with its import lines
 * stripped, so a syntax error inside one of the imported modules never reaches it:
 * an `await` written in a synchronous method once shipped that way and took the
 * whole system down in Foundry while 435 tests stayed green. This is the guard.
 */
const root = fileURLToPath(new URL('../script', import.meta.url));

function scripts(dir) {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return scripts(path);
        return /\.m?js$/.test(name) ? [path] : [];
    });
}

test('every script parses as a module, imports and all', () => {
    const files = scripts(root);
    assert.ok(files.length > 5, 'the sweep found the scripts');
    for (const file of files) {
        // node --check reads a .js as CommonJS, where `import` alone is an error,
        // so each file is checked through the module parser instead.
        const source = JSON.stringify(file);
        try {
            execFileSync(process.execPath,
                ['--input-type=module', '-e',
                 `import {readFileSync} from "node:fs";
                  import vm from "node:vm";
                  new vm.SourceTextModule(readFileSync(${source}, "utf8"));`],
                {stdio: ['ignore', 'ignore', 'pipe'], env: {...process.env, NODE_OPTIONS: '--experimental-vm-modules'}});
        } catch (err) {
            assert.fail(`${file} does not parse:\n${String(err.stderr).split('\n').slice(0, 6).join('\n')}`);
        }
    }
});
