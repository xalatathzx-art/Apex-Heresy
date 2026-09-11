# Компендиум Deathwatch — план переноса

Источник: `Deathwatch.pdf` (402 стр.). Номер страницы книги = номер страницы
PDF − 1, как в Rogue Trader и Only War. В `source` пишется номер книги.

Пак: `packs/deathwatch`, тип Item, подпись «Deathwatch», в папке паков
«Warhammer 40,000 Roleplay» рядом с Only War.

## Как устроен перенос

- Исходники — `packs-src/deathwatch/NN-раздел.json`, каждый файл — массив предметов.
- Дерево папок и цвета — `packs-src/deathwatch/folders.json`; подпапки
  разделов, которых ещё нет (дисциплины, способности), добавляются в их фазах.
- Сборка — `node tools/build-items.mjs deathwatch`, проверка без записи —
  `node tools/build-items.mjs deathwatch --check`. Пак пишется только при
  закрытом Foundry.
- Текст книги вынимается плагином pdf-mcp и сохраняется в
  `scratchpad/dw-*.txt` с разметкой `@@@PAGE pdf N book M`. Текстовый слой
  перемешивает колонки таблиц — спорные строки сверяются рендером страницы.
- Идентификаторы детерминированные: пересборка не рвёт ссылки.

Запись предмета и вёрстка `bc-entry` — как в `packs-src/rogue-trader/PLAN.md`.
Отличия Deathwatch:

| Книга | Поле |
|---|---|
| Req (Requisition) | `requisition` — число; N/A и «только как Signature Gear» — 0, пояснение в описании |
| Renown (– / Respected / Distinguished / Famed / Hero) | `renown`: none / respected / distinguished / famed / hero |
| Availability | в таблицах Deathwatch её нет — `availability` остаётся по умолчанию |
| Class Mounted | `class` heavy, в описании — «Mounted» и ограничения крепления |
| Traditional Weapons | `type` lowtech |
| Relics, Chapter Trappings | оружие — `weapon`, броня — `armour`, прочее — `gear`; принадлежность ордену — в описании |
| Force Fields: Protection Rating, Overload Roll | `forceField`: `protectionRating`, `overloadChance` (верхняя граница броска) |
| Психические силы: Action, Opposed, Range, Sustained, Psychic Strength | `psychicPower`, `subtype` — раздел книги |
| Solo/Squad Mode, Speciality и Chapter abilities | `specialAbility`, `benefit` — одна строка сути |

## Фазы

Фаза закрыта, когда `--check` проходит без ошибок, а число предметов сверено с
таблицей книги.

- [x] **0. Инфраструктура.** Поля `requisition` и `renown` в шаблоне
      снаряжения, справочник `Dh.renown`, поля на листах предметов, строки,
      пак в `system.json` и `packFolders`, проверка `renown` в сборщике,
      `folders.json`.
- [x] **1. Дальнобойное оружие** — Table 5-5, стр. 145–150 (Bolt 6, Plasma 3,
      Melta 3, Flame 3, SP 4, Las 3, Launchers 3).
- [x] **2. Гранаты и ракеты** — Table 5-6, стр. 150–152 (15).
- [x] **3. Экзотическое оружие** — Table 5-7, стр. 152–153 (5).
- [x] **4. Оружие ближнего боя** — Table 5-8, стр. 153–156 (15).
- [x] **5. Улучшения оружия** — Table 5-9, стр. 156–157 (11).
- [x] **6. Боеприпасы** — Table 5-10 (9) и Table 5-11 Special Issue (9),
      стр. 158–160.
- [x] **7. Броня и силовые поля** — Table 5-13 (9), Table 5-14 (3),
      стр. 160–166.
- [x] **8. Реликвии и регалии орденов** — Table 5-15 (8), Chapter Trappings,
      стр. 167–170.
- [x] **9. Снаряжение** — Table 5-17 Equipment (8), 5-18 Drugs (10),
      5-19 Tools (24), 5-20 Cybernetics (9), 5-22 Servitors (3), стр. 171–178.
- [x] **10. Таланты** — глава IV, стр. 108–129.
- [x] **11. Черты и импланты Механикус** — стр. 130–137.
- [x] **12. Психические силы** — глава VI, стр. 189–201.
- [x] **13. Способности космодесантника и орденов** — глава I, стр. 36–55.
- [x] **14. Способности специальностей** — глава II, стр. 68–91.
- [x] **15. Solo Mode и Squad Mode** — стр. 215–225.
- [x] **16. Таблицы** — в `packs-src/tables`: Power Armour History (5-12),
      Power Unit Critical Effects (5-13) и то, чем правила Deathwatch
      отличаются от уже собранных таблиц.
- [x] **17. Сборка и проверка.** Полный `--check`; сборка при закрытом
      Foundry; в игре — счёт по папкам, болтер стреляет с листа, поле держит
      удар, Req/Renown видны на листе предмета.

## Вне предметного компендиума

Противники главы XIII, сервиторы как профили (стр. 376) и НИП — это актёры.
Их место — отдельная работа после фазы 17.

## Журнал

- **Итерация 1, фаза 0.** Поля `requisition` (число) и `renown`
  (none/respected/distinguished/famed/hero) в шаблоне снаряжения, справочник
  `Dh.renown`, оба поля на девяти листах предметов под «Доступностью», строки
  en, пак `deathwatch` в `system.json` и `packFolders`, проверка `renown` в
  сборщике. `folders.json` — 39 папок.

- **Итерация 1, фазы 1–9.** `01-ranged-weapons.json` 25, `02-grenades-missiles.json`
  15, `03-exotic-weapons.json` 5, `04-melee-weapons.json` 15,
  `05-weapon-upgrades.json` 11, `06-ammunition.json` 18,
  `07-armour.json` 12 (9 брони, в том числе Masking Screen как `gear`, и 3
  поля), `08-relics-trappings.json` 20, `09-wargear.json` 54. Проверка чистая,
  175 предметов; предупреждения только о Volatile — качества Deathwatch в
  системе нет. Расхождения и решения:
  - Req «N/A» записан как 0 с книжной фразой о N/A в описании; сноски «†»
    перенесены в описание дословно.
  - Класс Mounted (Assault Cannon, Cyclone) — `heavy`, Chainfist — `melee`;
    правило класса Mounted — в описании.
  - Плазменным стволам и Deathroar добавлено качество Maximal: в таблице его
    нет, но врезка «Firing Plasma Weapons» даёт его всем астартес-плазмам.
    Мельта-правило «+1d10 на короткой дистанции» — только текстом, качество
    Melta системы работает иначе.
  - Craftsmanship реликвий и артефактной брони оставлен common: книга говорит,
    что бонусы урона уже в профилях; «всегда Master-Crafted» — в описании.
  - Броня Remorseless Crusader разбита на броню и отдельный профиль меча.
  - Ceremonial Sword и Sacris Claymore стоят в Table 5-8 и потому лежат в
    Melee Weapons/Traditional, а не в регалиях; описание — со стр. 170.
  - В таблице Tools 24 строки, в Grenades 15 — в плане было ошибочно 23 и 16.

- **Итерация 1, фазы 10–11.** `10-talents-1/2/3.json` — 158 талантов Table 4-1,
  `11-traits.json` — 49 черт: 46 строк Table 4-3, Mechanicus Implants (врезка
  на стр. 133, своя подпапка) и Shadow in the Warp (описана на стр. 134, в
  таблице её нет). Проверка чистая, 382 предмета. Текстовый слой глав IV
  перемешан колонками: абзацы сопоставлены с заголовками по строке
  «Prerequisites» и сути, сверенной с Benefit из Table 4-1. Расхождения:
  - Hot Shot Pilot стоит в Table 4-1 без требований, пользы и описания — не
    перенесён.
  - У Polyglot и Master Enginseer требования в таблице и в описании разные;
    в поле — описание, табличный вариант — примечанием в тексте.
  - Talent Groups (Peer, Enemy, Weapon Training и т. п.) — отдельной строкой
    в начале правила, как в книге.

- **Итерация 1, фаза 12.** `12-psychic-powers.json` — 52 силы: Telepathy 8
  (Table 6-3), Divination 6 (6-6), Codex 9 (6-12), Blood Angels 6, Dark Angels 6,
  Space Wolves 5, Storm Wardens 6, Ultramarines 6 (6-13…6-17). Проверка чистая,
  434 предмета. `cost` — XP из таблицы, `prerequisite` — оттуда же; строка
  Action/Opposed/Range/Sustained — первым абзацем правила, внутренние таблицы
  сил (Mind Probe, Augury, Reading и др.) — списком. Абзацы разметены колонками
  страниц и сопоставлены по блоку характеристик и сути. Таблицы 6-1 Psychic
  Phenomena и 6-2 Perils of the Warp Deathwatch — в фазу 16.

- **Итерация 1, фазы 13–15.** `13-space-marine-abilities.json` — 26:
  пакет «Space Marine Abilities» (стартовые навыки, таланты, черты,
  гипноиндоктринация и обучение Deathwatch), 19 имплантов со стр. 36–37 и
  6 орденов (бонусы характеристик, Solo-способность, ограничения, деменор).
  `14-speciality-abilities.json` — 19: 6 специальностей и 13 их особых
  способностей. `15-mode-abilities.json` — 36: Solo Mode 6 кодексных и 6
  орденских (Table 7-10, 7-11), Squad Mode 6+6 боевых схем (7-12, 7-13) и
  6+6 оборонительных стоек (7-14, 7-15). Проверка чистая, 515 предметов.
  Заметки:
  - У девастатора в книге нет строки Starting Skills — в записи её и нет.
  - Техномарин получает обе особые способности, у остальных — «выбери одну»;
    у штурмовика Angel of Death даётся всегда плюс выбор из двух.
  - Абзацы глав II и VII разъезжаются колонками: сопоставлены по строке
    Action/Cost/Sustained и Required Rank из таблиц 7-10…7-15.

- **Итерация 1, фаза 16.** В `packs-src/tables` добавлены пять таблиц
  Deathwatch: Power Armour History (5-12), Power Unit Critical Effects (5-13),
  Haywire Field Effects (Deathwatch) (5-4), Psychic Phenomena (Deathwatch)
  (6-1) и Perils of the Warp (Deathwatch) (6-2). У трёх последних к имени
  добавлено «(Deathwatch)»: одноимённые таблицы Black Crusade уже лежат в
  паке и отличаются и формулой, и строками. Критические таблицы главы VIII
  (стр. 250–260) не переносились — это 16 отдельных таблиц, отдельная работа.

- **Итерация 1, фаза 17.** Собрано при закрытом Foundry:
  `packs/deathwatch` — 515 предметов, 54 папки; `packs/bc-tables` пересобран —
  73 таблицы, 757 строк. Проверка в запущенной игре через Foundry MCP: пак
  «Deathwatch» виден в списке паков; Astartes Bolter (Godwyn) — basic/bolt,
  100 м, S/2/4, 2d10+5 X, Pen 5, клип 28, Full, Tearing, 18 кг, Req 5,
  Renown «—»; Astartes Artificer Armour — power, 12 брони на все зоны, 100 кг,
  Req 60, Renown Hero. Пять новых таблиц на месте. Хелпер `config` отдаёт
  `Dh`, поэтому выпадающий список Renown на листах предметов заполняется из
  нового справочника. Скриншот листа предмета не снимался: Chrome MCP занят
  другим профилем, а клиентом выступает десктопный Foundry.

