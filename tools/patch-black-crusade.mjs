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
import {MISSING_ITEMS, FIELD_FIXES} from "./lib/black-crusade-items.mjs";

const require = createRequire(import.meta.url);
const {ClassicLevel} = require("d:/Foundry/Foundry14/Foundry Virtual Tabletop/resources/app/node_modules/classic-level");

const DEST = "packs/black-crusade";

/** Идентификатор в том же виде, в каком их пишет сам Foundry. */
const randomId = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < 16; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
};
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

// Поля готовых карточек, сверенные с книгой.
const fields = [];
for await (const [key, value] of db.iterator({gte: "!items!", lt: "!items!￿"})) {
    const fix = FIELD_FIXES.find(entry => entry.type === value.type && entry.name === value.name);
    if (!fix || value.system?.[fix.path] === fix.value) continue;
    batch.put(key, {...value, system: {...value.system, [fix.path]: fix.value}});
    fields.push(`${value.name}: ${fix.path} ${value.system?.[fix.path] ?? "—"} -> ${fix.value}`);
}

// Записи книги, которых в паке не оказалось вовсе.
const present = new Set();
for await (const [, value] of db.iterator({gte: "!items!", lt: "!items!￿"}))
    present.add(`${value.type}:${value.name.toLowerCase()}`);
const added = [];
for (const item of MISSING_ITEMS) {
    if (present.has(`${item.type}:${item.name.toLowerCase()}`)) continue;
    const id = randomId();
    batch.put(`!items!${id}`, {...item, _id: id});
    added.push(`${item.type}: ${item.name}`);
}

if (check) {
    await batch.close();
    await db.close();
    console.log(changes.length ? `${changes.length} talents would change:` : "no talent would change");
    for (const line of changes) console.log("  " + line);
    console.log(added.length ? `${added.length} items would be added:` : "nothing to add");
    for (const line of added) console.log("  " + line);
    console.log(fields.length ? `${fields.length} fields would change:` : "no field would change");
    for (const line of fields) console.log("  " + line);
    if (unknown.length) console.log(`not in the book's tables (left alone): ${unknown.join(", ")}`);
    process.exit(0);
}

await batch.write();
await db.close();
console.log(`${changes.length} talents given their god, ${added.length} items added, ${fields.length} fields set`);
for (const line of [...changes, ...added, ...fields]) console.log("  " + line);
if (unknown.length) console.log(`not in the book's tables (left alone): ${unknown.join(", ")}`);
