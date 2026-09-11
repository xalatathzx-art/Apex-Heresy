/**
 * Применить сверенные с книгой правки к паку dark-heresy (см. lib/dark-heresy-fixes.mjs).
 *
 * Правки идемпотентны: повторный запуск ничего не меняет. Пак правится на месте,
 * поэтому Foundry должен быть закрыт — он держит LOCK на загруженных паках.
 *
 * Запуск: node tools/patch-dark-heresy.mjs
 */
import {createRequire} from "node:module";
import {fixDocument} from "./lib/dark-heresy-fixes.mjs";

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
for await (const [key, value] of db.iterator({gte: "!items!", lt: "!items!\uffff"})) {
    const {doc, changed} = fixDocument(value);
    if (!changed) continue;
    batch.put(key, doc);
    report.push(`${value.type}: ${value.name}${doc.name !== value.name ? ` -> ${doc.name}` : ""}`
        + `${doc.system?.cost !== value.system?.cost ? ` (cost ${doc.system.cost})` : ""}`);
}
await batch.write();
await db.close();
console.log(report.length ? report.join("\n") : "nothing to change");
console.log(`changed: ${report.length}`);
