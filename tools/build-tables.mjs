/**
 * Собрать компендиум RollTable из исходных JSON в packs-src/tables.
 *
 * Идентификаторы выводятся из имён детерминированно: пересборка не должна
 * ломать ссылки на таблицы и строки, уже расставленные в мире.
 *
 * Запуск: node tools/build-tables.mjs
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ClassicLevel } = require("d:/Foundry/Foundry14/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const SRC = "packs-src/tables";
const DEST = "packs/bc-tables";
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Стабильный 16-символьный идентификатор Foundry из произвольного ключа. */
function idFor(key) {
    const digest = createHash("sha1").update(key).digest();
    let id = "";
    for (let i = 0; i < 16; i++) id += ALPHABET[digest[i] % ALPHABET.length];
    return id;
}

const stats = () => ({
    compendiumSource: null, coreVersion: "14.365", createdTime: null, duplicateSource: null,
    exportSource: null, lastModifiedBy: null, modifiedTime: null,
    systemId: "dark-heresy", systemVersion: "1.2.0"
});

// Foundry держит LOCK на загруженных паках. Сносить каталог вслепую нельзя:
// на полпути это оставило бы пак разобранным. Сначала проверяем, открывается ли
// он на запись, и только потом трогаем файлы.
try {
    const probe = new ClassicLevel(DEST, { valueEncoding: "json" });
    await probe.open();
    await probe.close();
} catch {
    console.error(`cannot write ${DEST}: the pack is locked. Close Foundry and run again.`);
    process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
const db = new ClassicLevel(DEST, { valueEncoding: "json" });
await db.open();
const batch = db.batch();

const folders = new Map();
const files = readdirSync(SRC).filter(f => f.endsWith(".json")).sort();
let tableCount = 0;
let resultCount = 0;

for (const file of files) {
    const src = JSON.parse(readFileSync(`${SRC}/${file}`, "utf8"));

    let folderId = null;
    if (src.folder) {
        folderId = idFor(`folder:${src.folder}`);
        if (!folders.has(folderId)) {
            folders.set(folderId, true);
            batch.put(`!folders!${folderId}`, {
                _id: folderId, name: src.folder, type: "RollTable", description: "",
                folder: null, sorting: "a", sort: 0, color: null, flags: {}, _stats: stats()
            });
        }
    }

    const tableId = idFor(`table:${src.name}`);
    const resultIds = [];

    src.results.forEach((row, index) => {
        const resultId = idFor(`result:${src.name}:${index}`);
        resultIds.push(resultId);
        resultCount++;
        batch.put(`!tables.results!${tableId}.${resultId}`, {
            _id: resultId, _stats: stats(), description: row.text, drawn: false, flags: {},
            img: row.img ?? null, name: row.name ?? "",
            range: row.range, type: "text", weight: 1
        });
    });

    batch.put(`!tables!${tableId}`, {
        _id: tableId, _stats: stats(), description: src.description ?? "",
        displayRoll: true, flags: {}, folder: folderId, formula: src.formula ?? "1d100",
        img: src.img ?? "icons/svg/d20-grey.svg", name: src.name,
        ownership: { default: 0 }, replacement: true, results: resultIds, sort: src.sort ?? 0
    });
    tableCount++;
}

await batch.write();
await db.close();
console.log(`built ${DEST}: ${tableCount} tables, ${resultCount} results, ${folders.size} folders`);
