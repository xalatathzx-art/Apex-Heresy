/**
 * Применить сверенные с книгой правки к паку dark-heresy (см. lib/dark-heresy-fixes.mjs).
 *
 * Правки идемпотентны: повторный запуск ничего не меняет. Пак правится на месте,
 * поэтому Foundry должен быть закрыт — он держит LOCK на загруженных паках.
 *
 * Запуск: node tools/patch-dark-heresy.mjs
 */
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {fixDocument} from "./lib/dark-heresy-fixes.mjs";
import {MISSING_TALENTS} from "./lib/missing-talents.mjs";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Стабильный идентификатор Foundry из имени — тот же вывод, что у build-items. */
function idFor(key) {
    const digest = createHash("sha1").update(key).digest();
    let id = "";
    for (let i = 0; i < 16; i++) id += ALPHABET[digest[i] % ALPHABET.length];
    return id;
}

const require = createRequire(import.meta.url);
const {ClassicLevel} = require("d:/Foundry/Foundry14/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const DEST = "packs/dark-heresy";
const db = new ClassicLevel(DEST, {valueEncoding: "json"});
try {
    await db.open();
} catch {
    console.error(`cannot write ${DEST}: the pack is locked. Close Foundry and run again.`);
    process.exit(1);
}

const batch = db.batch();
const report = [];
const present = new Set();
for await (const [key, value] of db.iterator({gte: "!items!", lt: "!items!\uffff"})) {
    present.add(value.name);
    const {doc, changed} = fixDocument(value);
    if (!changed) continue;
    batch.put(key, doc);
    report.push(`${value.type}: ${value.name}${doc.name !== value.name ? ` -> ${doc.name}` : ""}`
        + `${doc.system?.cost !== value.system?.cost ? ` (cost ${doc.system.cost})` : ""}`);
}

// \u0422\u0430\u043b\u0430\u043d\u0442\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0445 \u0432 \u043f\u0430\u043a\u0435 \u043d\u0435 \u0431\u044b\u043b\u043e \u0432\u043e\u0432\u0441\u0435. \u0414\u043e\u0431\u0430\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u043f\u043e \u0438\u043c\u0435\u043d\u0438: \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u044b\u0439 \u0437\u0430\u043f\u0443\u0441\u043a
// \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0451\u0442 \u0432\u0442\u043e\u0440\u0443\u044e \u043a\u043e\u043f\u0438\u044e, \u0430 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u0432\u044b\u0432\u043e\u0434\u0438\u0442\u0441\u044f \u0438\u0437 \u0438\u043c\u0435\u043d\u0438, \u043f\u043e\u044d\u0442\u043e\u043c\u0443 \u0441\u0441\u044b\u043b\u043a\u0438
// \u043d\u0430 \u0443\u0436\u0435 \u043f\u0435\u0440\u0435\u0442\u0430\u0449\u0435\u043d\u043d\u044b\u0439 \u0442\u0430\u043b\u0430\u043d\u0442 \u043f\u0435\u0440\u0435\u0436\u0438\u0432\u0430\u044e\u0442 \u043f\u0435\u0440\u0435\u0441\u0431\u043e\u0440\u043a\u0443.
const systemVersion = JSON.parse(readFileSync("system.json", "utf8")).version;
const stats = () => ({
    compendiumSource: null, coreVersion: "14.365", createdTime: null, duplicateSource: null,
    exportSource: null, lastModifiedBy: null, modifiedTime: null,
    systemId: "dark-heresy", systemVersion
});
for (const entry of MISSING_TALENTS) {
    if (present.has(entry.name)) continue;
    const _id = idFor(`talent:${entry.name}`);
    batch.put(`!items!${_id}`, {...entry, _id, _stats: stats()});
    report.push(`added talent: ${entry.name}`);
}
await batch.write();
await db.close();
console.log(report.length ? report.join("\n") : "nothing to change");
console.log(`changed: ${report.length}`);
