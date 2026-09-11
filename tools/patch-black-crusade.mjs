/**
 * Проставить талантам пака black-crusade их богов (таблицы 2-10..2-12, стр. 80-82).
 *
 * Пак пришёл собранным, без исходников в packs-src, и покровителя не знал ни один
 * талант — значит цена шла по союзной ставке, а счётчик принадлежности не рос.
 * Правка идемпотентна: повторный запуск ничего не меняет. Пак правится на месте,
 * поэтому Foundry должен быть закрыт — он держит LOCK на загруженных паках.
 *
 * Запуск: node tools/patch-black-crusade.mjs [--check]
 */
import {createRequire} from "node:module";
import {talentPatron} from "../script/creation/bc-talents.mjs";

const require = createRequire(import.meta.url);
const {ClassicLevel} = require("d:/Foundry/Foundry14/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const DEST = "packs/black-crusade";
const check = process.argv.includes("--check");

const db = new ClassicLevel(DEST, {valueEncoding: "json"});
try {
    await db.open();
} catch {
    console.error(`cannot open ${DEST}: the pack is locked. Close Foundry and run again.`);
    process.exit(1);
}

const batch = db.batch();
const changes = [];
const unknown = [];
for await (const [key, value] of db.iterator({gte: "!items!", lt: "!items!\uffff"})) {
    if (value.type !== "talent") continue;
    const book = talentPatron(value.name);
    if (!book) { unknown.push(value.name); continue; }
    if ((value.system?.patron ?? "undivided") === book.patron) continue;
    batch.put(key, {...value, system: {...value.system, patron: book.patron}});
    changes.push(`${value.name}: ${value.system?.patron ?? "—"} -> ${book.patron}`);
}

if (check) {
    await batch.close();
    await db.close();
    console.log(changes.length ? `${changes.length} talents would change:` : "nothing to change");
    for (const line of changes) console.log("  " + line);
    if (unknown.length) console.log(`not in the book's tables (left alone): ${unknown.join(", ")}`);
    process.exit(0);
}

await batch.write();
await db.close();
console.log(`${changes.length} talents given their god`);
for (const line of changes) console.log("  " + line);
if (unknown.length) console.log(`not in the book's tables (left alone): ${unknown.join(", ")}`);
