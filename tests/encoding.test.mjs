import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, extname} from 'node:path';

/**
 * Every text file the system ships must be valid UTF-8 and free of C1 controls.
 *
 * A lost re-encoding once left a raw 0x82 inside a CSS `content:` value. It broke
 * nothing loudly: the byte simply vanished in the stencil font, and the marker
 * beside a wizard-filled field rendered as a bare "2", so the sheet read
 * "CHAPTER 2". Bytes in that range are never meant in this source, so the sweep
 * is the guard.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'packs', '.playwright-mcp', 'assets']);
const TEXT = new Set(['.css', '.js', '.mjs', '.json', '.hbs', '.md']);

function textFiles(dir) {
    return readdirSync(dir).flatMap(name => {
        if (SKIP.has(name)) return [];
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return textFiles(path);
        return TEXT.has(extname(name)) ? [path] : [];
    });
}

test('no shipped text file carries a broken byte', () => {
    const decoder = new TextDecoder('utf-8', {fatal: true});
    const files = textFiles(root);
    assert.ok(files.length > 50, 'the sweep found the source');
    for (const file of files) {
        const bytes = readFileSync(file);
        const relative = file.slice(root.length);
        let text;
        try { text = decoder.decode(bytes); }
        catch { assert.fail(`${relative} is not valid UTF-8`); }
        // C1 controls (U+0080-U+009F): never meant, and invisible when wrong.
        const stray = [...text].findIndex(ch => ch.charCodeAt(0) >= 0x80 && ch.charCodeAt(0) <= 0x9f);
        assert.equal(stray, -1,
            `${relative} carries a C1 control at ${stray}: ${JSON.stringify(text.slice(Math.max(0, stray - 40), stray + 10))}`);
    }
});
