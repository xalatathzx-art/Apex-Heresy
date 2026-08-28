// script/environment-data.mjs
// ════════════════════════════════════════════════════════════════════════
//  Окружающая среда сцены (корбук «Опасности», стр. 483-484).
//  Параметры: Погода (флавор) · Температура (Жара/Холод) · Гравитация ·
//  Радиация. Хранится во флаге сцены warhammer-dbc.env; ГМ правит в окне,
//  игроки видят только виджет. Помощники возвращают и подпись, и механику
//  (модификатор теста T + частота), чтобы виджет/окно были едины с правилами.
// ════════════════════════════════════════════════════════════════════════

export const ENV_SCOPE = "dark-heresy";
export const ENV_FLAG  = "env";

// ── «Обстановка»: погода планеты + позиция/реальность корабля-в-пустоте.
//    grp: planet → в виджете подпись «ПОГОДА»; void → «ЛОКАЦИЯ». В корбуке
//    жёсткой таблицы нет — это флавор, задающий настроение сцены. ──────────
export const WEATHER = [
  // Планета — погода
  { key: "clear",     grp: "planet", label: "Clear",              icon: "☀",  tone: "#ffd98a" },
  { key: "clouds",    grp: "planet", label: "Overcast",           icon: "☁",  tone: "#b8c6d0" },
  { key: "rain",      grp: "planet", label: "Rain",             icon: "🌧", tone: "#6fa8d0" },
  { key: "storm",     grp: "planet", label: "Thunderstorm",             icon: "⛈", tone: "#8ab0e0" },
  { key: "snow",      grp: "planet", label: "Snow / blizzard",     icon: "❄",  tone: "#cfe8ff" },
  { key: "fog",       grp: "planet", label: "Fog",             icon: "🌫", tone: "#a8b4bc" },
  { key: "wind",      grp: "planet", label: "Gale winds",   icon: "💨", tone: "#bfe0d0" },
  { key: "heat",      grp: "planet", label: "Scorching heat",              icon: "🔥", tone: "#ff8a5a" },
  { key: "ash",       grp: "planet", label: "Ash storm",    icon: "🌋", tone: "#c08a6a" },
  { key: "acid",      grp: "planet", label: "Acid rain",   icon: "☣",  tone: "#9fd13f" },
  { key: "toxic",     grp: "planet", label: "Toxic smog",    icon: "🏭", tone: "#b6c04a" },
  { key: "radstorm",  grp: "planet", label: "Rad storm", icon: "☢",  tone: "#e8e04a" },
  // Корабль / пустота — позиция и реальность
  { key: "shipnorm",  grp: "void", label: "Ship interior",       icon: "🚀", tone: "#7fbf9c" },
  { key: "materium",  grp: "void", label: "In the Materium",          icon: "✦",  tone: "#6fa8d0" },
  { key: "orbit",     grp: "void", label: "In orbit",            icon: "🛰", tone: "#8ab0e0" },
  { key: "void",      grp: "void", label: "Open void",      icon: "🌌", tone: "#6a7fb0" },
  { key: "translation", grp: "void", label: "Warp translation",       icon: "🌀", tone: "#b477ff" },
  { key: "warp",      grp: "void", label: "In the Warp",              icon: "🕳", tone: "#9a5aff" },
  { key: "warpstorm", grp: "void", label: "Warp storm",           icon: "🌀", tone: "#e05aff" },
  { key: "gellar",    grp: "void", label: "Gellar field failure",  icon: "⚡", tone: "#ff5a5a" },
  { key: "breach",    grp: "void", label: "Hull breach",      icon: "💨", tone: "#ff8a5a" }
];
export const WEATHER_MAP = Object.fromEntries(WEATHER.map(w => [w.key, w]));
export function weatherMeta(key) { return WEATHER_MAP[key] || WEATHER_MAP.clear; }
export const WEATHER_GROUPS = [
  { grp: "planet", label: "Planet - weather" },
  { grp: "void",   label: "Ship / void - location" }
];
// Подпись строки виджета: планета → «Погода», пустота/корабль → «Локация».
export function weatherRowLabel(key) { return weatherMeta(key).grp === "void" ? "Location" : "Weather"; }

// ── Температура: Жара (корбук стр. 483) + симметричная шкала Холода ────────
// Жара — точная таблица книги. Холод — «по усмотрению ГМа» (значения дизайнер-
// ские, зеркалят суровость жары). test — модификатор к тесту T (порог), freq —
// как часто тест; tone — цвет индикатора; kind — hot|cold|ok.
const HEAT_TABLE = [
  { min: 65, kind: "hot", test: -20, freq: "every Round",     label: "Inside a burning building" },
  { min: 60, kind: "hot", test: -15, freq: "every minute",  label: "Street of a burning city" },
  { min: 55, kind: "hot", test: -10, freq: "every 5 minutes",  label: "Above a magma river" },
  { min: 50, kind: "hot", test:  -5, freq: "every 30 minutes", label: "Dayside of a tide-locked world" },
  { min: 45, kind: "hot", test:   0, freq: "every hour",     label: "Foundry manufactorum" },
  { min: 40, kind: "hot", test:   5, freq: "every 2 hours",   label: "Desert heat" },
  { min: 35, kind: "hot", test:  10, freq: "every 4 hours",   label: "Heat wave" },
  { min: 30, kind: "hot", test:  15, freq: "every 8 hours",  label: "Hot day without shade" }
];
const COLD_TABLE = [
  { max: -40, kind: "cold", test: -20, freq: "every Round",     label: "Cryogenics / open void" },
  { max: -30, kind: "cold", test: -15, freq: "every minute",  label: "Polar night on an ice world" },
  { max: -20, kind: "cold", test: -10, freq: "every 5 minutes",  label: "Bitter frost, blizzard" },
  { max: -10, kind: "cold", test:  -5, freq: "every 30 minutes", label: "Hard frost" },
  { max:   0, kind: "cold", test:   0, freq: "every hour",     label: "Frost" },
  { max:  10, kind: "cold", test:  10, freq: "every 8 hours",  label: "Biting cold" }
];

export function tempEffect(t) {
  const c = Number(t);
  for (const row of HEAT_TABLE) if (c >= row.min) return { ...row, active: true };
  for (const row of COLD_TABLE) if (c <= row.max) return { ...row, active: true };
  return { kind: "ok", test: null, freq: "", label: "Comfortable", active: false };
}
// Цвет по температуре (плавный: синий холод → бирюза норма → красный жар).
export function tempTone(t) {
  const c = Number(t);
  if (c >= 55) return "#ff4d3a";
  if (c >= 40) return "#ff8a3a";
  if (c >= 28) return "#ffcf5a";
  if (c >= 5)  return "#5affc0";
  if (c >= -15) return "#5ac8ff";
  return "#a0d8ff";
}

// ── Гравитация (корбук стр. 484): Высокая / Низкая / Невесомость ───────────
export function gravityEffect(g) {
  const G = Number(g);
  if (G <= 0) return {
    kind: "zero", label: "Zero gravity",
    note: "No carry limit; movement only by pushing off. Recoil and melee set the character spinning - Trade (Voidfarer) test. Mag-boots or thrusters remove the difficulty.",
    tone: "#b477ff"
  };
  if (G < 1) {
    const noRun = G <= 0.6;
    // Trade(Voidfarer) помогает при 0.6/0.5/0.4/0.3/0.2 → +0/+10/+20/+30
    return {
      kind: "low", label: `Low gravity ${G}G`,
      note: `Gear weight x${G.toFixed(1)}; the character is lighter by his body weight x(1-${G.toFixed(1)}). Jumps and throws reach further, falling damage is lower.${noRun ? " At 0.6G or less he cannot Run without Trade (Voidfarer)." : ""}`,
      tone: "#7fd0ff"
    };
  }
  if (G > 1) return {
    kind: "high", label: `High gravity ${G}G`,
    note: `All gear weight x${G.toFixed(1)}; extra load = body weight x(${G.toFixed(1)}-1). Jumps and throws fall short, falling damage is higher. If body weight at 1G exceeds his lift, he may only move slowly.`,
    tone: "#ff9a6a"
  };
  return { kind: "norm", label: "Normal (1G)", note: "Standard gravity - no penalties.", tone: "#8fe0b0" };
}

// ── Радиация (корбук стр. 484): интенсивность 1-10 + защита ────────────────
export const RAD_TABLE = [
  { lvl: 1,  freq: "every 8 hours",  label: "Volcano slopes / deep mines" },
  { lvl: 2,  freq: "every 4 hours",   label: "Hive industrial zone / forge" },
  { lvl: 3,  freq: "every 2 hours",   label: "Inside a mine / refinery" },
  { lvl: 4,  freq: "every hour",     label: "Hive world / forge world wastes" },
  { lvl: 5,  freq: "every 30 minutes", label: "Waste dumps, open void" },
  { lvl: 6,  freq: "every 15 minutes", label: "Fallout zone after a nuclear blast" },
  { lvl: 7,  freq: "every 5 minutes",  label: "Radioactive fallout, reactor venting" },
  { lvl: 8,  freq: "every minute",  label: "Exposed reactor / Warp drive core" },
  { lvl: 9,  freq: "every Round",      label: "Close to a reactor / Warp drive core" },
  { lvl: 10, freq: "5 per Round",        label: "Inside a reactor / fuelling a Warp drive" }
];
export const RAD_PROTECTION = [
  { label: "Sealed armour / chem suit", val: "−1" },
  { label: "Void armour / rad suit", val: "−2" },
  { label: "Power armour",                       val: "−1" },
  { label: "Terminator armour",                val: "Immune" },
  { label: "Machine trait",                       val: "−1" },
  { label: "Active Melanochrome (gene-seed)",    val: "−1" },
  { label: "Stuff of Nightmares trait",           val: "Immune" },
  { label: "Inside a tin structure",             val: "−1" },
  { label: "Inside a rockcrete structure",           val: "−2" },
  { label: "Inside a bunker / cave",             val: "−3" },
  { label: "Inside a rad bunker",        val: "Immune" }
];
export function radEffect(lvl) {
  const l = Math.max(0, Math.min(10, Math.round(Number(lvl) || 0)));
  if (l <= 0) return { lvl: 0, label: "Background normal", freq: "", active: false, tone: "#8fe0b0" };
  const row = RAD_TABLE.find(r => r.lvl === l) || RAD_TABLE[RAD_TABLE.length - 1];
  // Цвет усиливается с уровнем (зелёный → жёлтый → оранжевый → красный).
  const tone = l >= 8 ? "#ff3a3a" : l >= 6 ? "#ff7a2a" : l >= 4 ? "#ffd23a" : "#b6e04a";
  return { ...row, active: true, tone };
}


// ── Мощность дозы: научная шкала вместо безымянных уровней ────────────────
// Хранится всегда в мкЗв/ч — это каноническая единица состояния; в каком виде
// её показывать, решает отдельный флаг. Игровой «уровень» 1-10 из RAD_TABLE
// никуда не делся: он выводится из дозы и по-прежнему задаёт частоту проверок.
// Границы — логарифмическая лестница, примерно по половине порядка на ступень.
export const RAD_BANDS = [
  { min: 0,          lvl: 0,  label: "Natural background",   tone: "#8fe0b0" },
  { min: 0.3,        lvl: 1,  label: "Elevated background",  tone: "#b6e04a" },
  { min: 3,          lvl: 2,  label: "Mildly elevated",      tone: "#d6e04a" },
  { min: 30,         lvl: 3,  label: "Contaminated",         tone: "#ffd23a" },
  { min: 300,        lvl: 4,  label: "Hazardous",            tone: "#ffb02a" },
  { min: 3000,       lvl: 5,  label: "Severe",               tone: "#ff8a2a" },
  { min: 30000,      lvl: 6,  label: "Acute hazard",         tone: "#ff6a2a" },
  { min: 300000,     lvl: 7,  label: "Radiation sickness",   tone: "#ff4a2a" },
  { min: 1000000,    lvl: 8,  label: "Acute radiation syndrome", tone: "#ff3a3a" },
  { min: 5000000,    lvl: 9,  label: "Lethal exposure",      tone: "#ff2a6a" },
  { min: 20000000,   lvl: 10, label: "Immediately fatal",    tone: "#ff5ad8" }
];

// Единицы показа. Хранение всегда в мкЗв/ч, показ — в выбранной.
export const RAD_UNITS = {
  uSv: { key: "uSv", label: "µSv/h", factor: 1 },
  mSv: { key: "mSv", label: "mSv/h", factor: 1000 },
  Sv:  { key: "Sv",  label: "Sv/h",  factor: 1000000 }
};
export const RAD_UNIT_ORDER = ["uSv", "mSv", "Sv"];

/** Диапазон, в который попадает мощность дозы (мкЗв/ч). */
export function radBand(dose) {
  const d = Math.max(0, Number(dose) || 0);
  let band = RAD_BANDS[0];
  for (const b of RAD_BANDS) if (d >= b.min) band = b;
  return band;
}

/** Игровой уровень 1-10 по дозе — от него зависит частота проверок. */
export function radLevelFromDose(dose) { return radBand(dose).lvl; }

/** Представительная доза для игрового уровня — для переноса старых сцен. */
export function radDoseFromLevel(lvl) {
  const l = Math.max(0, Math.min(10, Math.round(Number(lvl) || 0)));
  const band = RAD_BANDS.find(b => b.lvl === l) || RAD_BANDS[0];
  return band.min;
}

/**
 * Доза в выбранных единицах: значение и подпись.
 * Крупные числа режем до трёх значащих, чтобы не разъезжалась вёрстка.
 */
export function formatDose(dose, unitKey) {
  const unit = RAD_UNITS[unitKey] || RAD_UNITS.uSv;
  const v = (Math.max(0, Number(dose) || 0)) / unit.factor;
  // Хвостовые нули срезаем целиком: «5», а не «5.0» и не «5.00».
  const trim = t => t.includes(".") ? t.replace(/0+$/, "").replace(/\.$/, "") : t;
  let text;
  if (v === 0) text = "0";
  else if (v >= 100) text = String(Math.round(v));
  else if (v >= 10) text = trim(v.toFixed(1));
  else if (v >= 1) text = trim(v.toFixed(2));
  else text = trim(v.toPrecision(2));
  return { value: v, text, unit: unit.label, unitKey: unit.key };
}

/** Полное состояние радиации: доза, диапазон, игровой уровень и частота. */
export function radState(dose, unitKey) {
  const d = Math.max(0, Number(dose) || 0);
  const band = radBand(d);
  const row = RAD_TABLE.find(r => r.lvl === band.lvl);
  return {
    dose: d,
    ...formatDose(d, unitKey),
    band: band.label,
    lvl: band.lvl,
    tone: band.tone,
    active: band.lvl > 0,
    freq: row ? row.freq : "",
    source: row ? row.label : ""
  };
}

// ── Состояние сцены: чтение/запись ────────────────────────────────────────
export function defaultEnv() {
  return { weather: "clear", weatherText: "", temp: 20, gravity: 1, radDose: 0, radUnit: "uSv", note: "" };
}
export function normalizeEnv(raw) {
  const d = defaultEnv();
  if (!raw) return d;
  return {
    weather:     raw.weather || d.weather,
    weatherText: raw.weatherText || "",
    temp:        Number.isFinite(Number(raw.temp)) ? Number(raw.temp) : d.temp,
    gravity:     Number.isFinite(Number(raw.gravity)) ? Number(raw.gravity) : d.gravity,
    // Сцены, сохранённые до перехода на дозу, держат уровень 0-10 — переводим
    // его в представительную дозу диапазона, чтобы ничего не потерялось.
    radDose:     Number.isFinite(Number(raw.radDose))
                   ? Math.max(0, Number(raw.radDose))
                   : radDoseFromLevel(raw.rad),
    radUnit:     RAD_UNITS[raw.radUnit] ? raw.radUnit : d.radUnit,
    note:        raw.note || ""
  };
}
export function readEnv(scene) { return normalizeEnv(scene?.getFlag?.(ENV_SCOPE, ENV_FLAG)); }
export async function writeEnv(scene, env) {
  if (!scene || !game.user.isGM) return;
  await scene.setFlag(ENV_SCOPE, ENV_FLAG, env);
}

// Полный «вид» окружения — единый источник для окна и виджета. Принимает уже
// нормализованный env (резолвится группо-осознанно вызывающим — см. Нексус).
export function envView(e) {
  const w = weatherMeta(e.weather);
  const temp = tempEffect(e.temp);
  const grav = gravityEffect(e.gravity);
  const rad  = radState(e.radDose, e.radUnit);
  const testSigned = temp.test == null ? "" : (temp.test >= 0 ? `+${temp.test}` : `${temp.test}`);
  return {
    raw: e,
    weather: { key: e.weather, label: e.weatherText || w.label, icon: w.icon, tone: w.tone, custom: !!e.weatherText, grp: w.grp, rowLabel: weatherRowLabel(e.weather) },
    temp: { value: e.temp, tone: tempTone(e.temp), testSigned, ...temp },
    gravity: { value: e.gravity, ...grav },
    rad: { value: e.radDose, ...rad },
    note: e.note
  };
}

// ── Совместимость с окном: контейнер окружения ────────────────────────────
// В системе-доноре окружение могло принадлежать группе сцен («Нексус»). Здесь
// групп нет, поэтому источник всегда один — флаг самой сцены. Форма контейнера
// сохранена: появится группировка сцен — меняется только этот блок.
export function primaryGroupForScene() { return null; }
export function envSceneHasOverride(scene) { return !!scene?.getFlag?.(ENV_SCOPE, ENV_FLAG); }
export function resolveEnvContainer(scene) {
  return {
    kind: "scene", id: scene?.id || "", label: scene?.name || "",
    read:  () => normalizeEnv(scene?.getFlag?.(ENV_SCOPE, ENV_FLAG)),
    write: (v) => scene?.setFlag?.(ENV_SCOPE, ENV_FLAG, v),
    clear: () => scene?.unsetFlag?.(ENV_SCOPE, ENV_FLAG)
  };
}
export function readEnvForScene(scene) { return resolveEnvContainer(scene).read(); }
