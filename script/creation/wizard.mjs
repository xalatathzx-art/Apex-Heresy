// ════════════════════════════════════════════════════════════════════════
//  Мастер создания персонажа.
//
//  Работает поверх УЖЕ созданного актора и закрепляет каждый шаг по «Далее», а
//  не одним патчем в конце. Поэтому недоделанный персонаж — всё равно годный
//  документ: окно можно закрыть и открыть на нём заново.
//
//  Ветвлений по книге здесь нет. Мастер идёт по списку шагов из
//  ruleset-data.mjs, а `kind` шага решает, какая панель рисуется.
// ════════════════════════════════════════════════════════════════════════

import {RULESET_DEFS, stepsFor, auditedRulesets} from "./ruleset-data.mjs";
import {resolveGrantPlan, emptyPlan} from "./grant-data.mjs";
import {planToActorUpdate, planToItemData, revertUpdate, ownedAptitudes,
        GRANT_FLAG_SCOPE, GRANT_FLAG_KEY} from "./origin-apply.mjs";
import {choiceBlocksHtml, readChoicePicks, restoreChoicePicks} from "./choice-blocks.mjs";
import {CHARACTERISTIC_KEYS, normaliseOrigin, grantSummaryLines} from "./origin-data.mjs";
import {findContent} from "./content-lookup.mjs";
import {CHARACTERISTIC_COSTS, SKILL_COSTS, TALENT_COSTS, matchingAptitudes}
    from "./advancement-data.mjs";
import {POINT_BUY, pointBuyProblems, rollExpression, woundsExpression, fateExpression}
    from "./creation-roll-data.mjs";

/** Паки, где ищется выданное по имени: сначала общий, потом книжные. */
const CONTENT_PACKS = ["dark-heresy.dark-heresy", "dark-heresy.black-crusade",
    "dark-heresy.rogue-trader", "dark-heresy.only-war", "dark-heresy.deathwatch"];

/** Какие типы предметов считаются тем или иным видом выдачи. */
const GRANT_ITEM_TYPES = {
    talent: ["talent"],
    trait: ["trait"],
    equipment: ["weapon", "armour", "gear", "tool", "ammunition", "drug", "cybernetic", "forceField"]
};

const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export class CharacterWizard extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "dh-character-wizard-{id}",
        classes: ["dark-heresy", "character-wizard"],
        // Высота по содержимому: шаги очень разной длины, и при фиксированной под
        // коротким шагом остаётся пустое поле в пол-экрана.
        position: {width: 640, height: "auto"},
        window: {resizable: true}
    };

    static PARTS = {
        body: {
            template: "systems/dark-heresy/template/apps/character-wizard.hbs",
            root: true,
            scrollable: [".wizard-step-body"]
        }
    };

    constructor(actor, options = {}) {
        super({id: `dh-character-wizard-${actor.id}`, ...options});
        this.actorId = actor.id;
        this.stepIndex = 0;
        // Ответы на строки выбора. Форма перерисовывается чаще, чем на неё отвечают,
        // а свежая разметка всегда пустая — без снимка ответ терялся бы от любого
        // соседнего клика.
        this.answers = {};
    }

    get actor() { return game.actors.get(this.actorId); }

    /** Книга, по которой ведётся персонаж: поле листа, а не флаг окна. */
    get ruleset() { return this.actor?.system?.ruleset ?? ""; }

    get steps() { return this.ruleset ? stepsFor(this.ruleset) : []; }
    get step() { return this.steps[this.stepIndex] ?? null; }

    get title() {
        return game.i18n.format("WIZARD.TITLE", {name: this.actor?.name ?? ""});
    }

    /** @override */
    async _prepareContext(options) {
        const actor = this.actor;
        if (!actor) return {missing: true};

        // Предлагаем только сверенные книги: по остальным Мастер вести не умеет,
        // и молча выдать по ним неверного персонажа хуже, чем не предложить вовсе.
        const audited = auditedRulesets();

        return {
            missing: false,
            name: actor.name,
            rulesetChosen: !!this.ruleset,
            rulesets: audited.map(key => ({
                key,
                label: game.i18n.localize(RULESET_DEFS[key].label),
                selected: key === this.ruleset
            })),
            unaudited: Object.keys(RULESET_DEFS)
                .filter(key => !audited.includes(key))
                .map(key => game.i18n.localize(RULESET_DEFS[key].label))
                .join(", "),
            steps: this.steps.map((step, index) => ({
                id: step.id,
                label: game.i18n.localize(step.label),
                active: index === this.stepIndex,
                done: index < this.stepIndex
            })),
            step: this.step ? {...this.step, label: game.i18n.localize(this.step.label)} : null,
            ...(this.step?.kind === "origin" ? await this._originStepContext(this.step) : {}),
            ...(this.step?.kind === "characteristics" ? this._characteristicsStepContext() : {}),
            ...(this.step?.kind === "experience" ? this._experienceStepContext() : {}),
            ...(this.step?.kind === "divination" ? this._divinationStepContext() : {}),
            isLastStep: this.stepIndex === this.steps.length - 1,
            backDisabled: this.stepIndex === 0 || this._busy,
            nextDisabled: !this.ruleset || this._busy,
            busy: !!this._busy
        };
    }

    /**
     * Контекст шага происхождения: список вариантов, строки выбора выбранного и —
     * если шаг уже закреплён — сводка того, что он дал.
     */
    async _originStepContext(step) {
        const carrier = this._carrierFor(step);
        const chosen = this._selectedOrigin?.[step.id] ?? carrier?.uuid ?? "";
        const source = carrier?.toObject()?.system ?? this._selectedSource?.[step.id] ?? null;

        return {
            originOptions: (await this._originsFor(step.stage)).map(entry => ({
                uuid: entry.uuid, name: entry.name, selected: entry.uuid === chosen
            })),
            // Закреплённый шаг больше не спрашивает: чтобы переспросить, нужно «Назад».
            originLocked: !!carrier,
            originName: carrier?.name ?? "",
            choiceRows: (!carrier && source)
                ? choiceBlocksHtml(source, {intelligenceBonus: this._intelligenceBonus})
                : "",
            // Текст книги показывается и до выбора (по наведённому в списке), и после
            // закрепления: игрок должен читать, что берёт, а не угадывать по названию.
            originBook: source ? {
                description: source.description ?? "",
                bonuses: source.bonuses ?? [],
                summary: grantSummaryLines(source),
                source: source.source ?? ""
            } : null
        };
    }

    /** @override */
    _onRender(context, options) {
        super._onRender?.(context, options);
        const root = this.element;
        if (!root) return;

        const originSelect = root.querySelector("select[data-origin-step]");
        if (originSelect) {
            originSelect.addEventListener("change", async ev => {
                const stepId = ev.currentTarget.dataset.originStep;
                const uuid = ev.currentTarget.value;
                (this._selectedOrigin ??= {})[stepId] = uuid;
                (this._selectedSource ??= {})[stepId] = uuid
                    ? (await fromUuid(uuid))?.toObject()?.system ?? null
                    : null;
                // Смена варианта делает прежние ответы бессмысленными.
                delete this.answers[stepId];
                this.render(false);
            });
            // Ответы читаются заново при каждом рендере, а свежая разметка пуста.
            restoreChoicePicks(root.querySelector(".wizard-choice-rows"), this.answers[this.step?.id]);
            this._wireOptionTargets(root);
        }

        root.querySelector(".wizard-ruleset")?.addEventListener("change", async ev => {
            const chosen = ev.currentTarget.value;
            if (!chosen) return;
            // Тип листа выбран до Мастера, а книга может просить другой (Black Crusade —
            // еретика). Молча подменить тип нельзя, поэтому говорим вслух.
            if (RULESET_DEFS[chosen].actorType !== this.actor.type)
                ui.notifications?.warn(game.i18n.localize("WIZARD.WRONG_TYPE"));
            await this.actor.update({"system.ruleset": chosen});
            this.stepIndex = 0;
            this.answers = {};
            this.render(false);
        });

        this._wireCharacteristics(root);
        root.querySelector(".wizard-roll-divination")?.addEventListener("click", async () => {
            if (this._busy) return;
            this._busy = true;
            this.render(false);
            try { await this._commitDivinationStep(); }
            finally { this._busy = false; if (this.rendered) this.render(false); }
        });

        root.querySelector(".wizard-reroll-divination")?.addEventListener("click", async () => {
            if (this._busy) return;
            this._busy = true;
            this.render(false);
            try {
                await this._revertDivination();
                await this._commitDivinationStep();
            } finally {
                this._busy = false;
                if (this.rendered) this.render(false);
            }
        });


        root.querySelector("[data-action='wizard-back']")?.addEventListener("click", () => this._onBack());
        root.querySelector("[data-action='wizard-next']")?.addEventListener("click", () => this._onNext());
    }

    /** Кости и счётчик очков на шаге характеристик. */
    _wireCharacteristics(root) {
        const method = root.querySelector(".wizard-char-method");
        if (method) method.addEventListener("change", ev => {
            this._charMethod = ev.currentTarget.value;
            this._charValues = null;   // способ сменился — прежние значения уже не те
            this.render(false);
        });

        const inputs = [...root.querySelectorAll("input[data-characteristic]")];
        const remember = () => {
            this._charValues = Object.fromEntries(inputs.map(i => [i.dataset.characteristic, Number(i.value) || 0]));
        };
        const budget = root.querySelector("[data-spent]");
        const recount = () => {
            if (!budget) return;
            const spent = inputs.reduce((sum, i) => sum + (Number(i.value) || 0) - Number(i.dataset.start), 0);
            budget.textContent = String(spent);
            budget.classList.toggle("over", spent > POINT_BUY.points);
        };
        for (const input of inputs) input.addEventListener("input", () => { remember(); recount(); });
        recount();

        const rollOne = async button => {
            const roll = await new Roll(button.dataset.formula).evaluate();
            const input = root.querySelector(`input[data-characteristic="${button.dataset.roll}"]`);
            if (input) input.value = String(roll.total);
            remember();
        };
        for (const button of root.querySelectorAll(".wizard-roll"))
            button.addEventListener("click", () => rollOne(button));
        root.querySelector(".wizard-roll-all")?.addEventListener("click", async () => {
            for (const button of root.querySelectorAll(".wizard-roll")) await rollOne(button);
        });
    }

    /**
     * Поле уточнения показывается, только когда выбран вариант, который его требует
     * («Resistance (Pick One)»), и прячется обратно при смене варианта — иначе игрок
     * заполняет поле, которое ни на что не влияет.
     */
    _wireOptionTargets(root) {
        for (const select of root.querySelectorAll("select[data-choice]")) {
            const target = root.querySelector(`input[data-option-target="${select.dataset.choice}"]`);
            if (!target) continue;
            const source = this._selectedSource?.[this.step?.id];
            const choice = (source?.choices ?? []).find(entry => entry.key === select.dataset.choice);
            const sync = () => {
                const option = choice?.options?.[Number(select.value)];
                target.hidden = !(select.value !== "" && option?.talentTemplate);
                if (target.hidden) target.value = "";
            };
            select.addEventListener("change", sync);
            sync();
        }
    }

    /**
     * «Далее». Шаги закрепляют свою работу сами; каркас только идёт по списку.
     * `_busy` защищает от второго клика, пока первый ещё внутри своего await:
     * иначе шаг применился бы дважды.
     */
    async _onNext() {
        if (this._busy) return;
        this._busy = true;
        this.render(false);
        try {
            if (!(await this._commitStep(this.step))) return;
            if (this.stepIndex >= this.steps.length - 1) { await this._finish(); return; }
            this.stepIndex += 1;
        } finally {
            this._busy = false;
            if (this.rendered) this.render(false);
        }
    }

    /** «Назад». Откат закреплённого шага делают сами шаги. */
    async _onBack() {
        if (this._busy || this.stepIndex === 0) return;
        this._busy = true;
        this.render(false);
        try {
            await this._revertStep(this.steps[this.stepIndex - 1]);
            this.stepIndex -= 1;
        } finally {
            this._busy = false;
            if (this.rendered) this.render(false);
        }
    }

    /**
     * Закрепить шаг.
     * @returns {Promise<boolean>} false — шаг не закрыт, дальше не идём
     */
    async _commitStep(step) {
        if (!step) return false;
        if (step.kind === "origin") return this._commitOriginStep(step);
        if (step.kind === "characteristics") return this._commitCharacteristicsStep();
        if (step.kind === "experience") return this._commitExperienceStep();
        if (step.kind === "divination") return this._commitDivinationStep();
        return true;
    }

    /** Откатить ранее закреплённый шаг. */
    async _revertStep(step) {
        if (step?.kind === "origin") await this._revertOriginStep(step);
        // Вернувшись к характеристикам, шаг снова можно закрепить — другим способом
        // или другими значениями. Само закрепление ставит значения, а не прибавляет,
        // так что повторное не наслаивается.
        if (step?.kind === "characteristics") await this.actor.unsetFlag(GRANT_FLAG_SCOPE, "creationRolls");
        if (step?.kind === "divination") await this._revertDivination();
    }

    // ── Шаг происхождения ────────────────────────────────────────────────

    /** Метка, которой помечено всё выданное этим шагом. */
    _tagFor(step) { return `${this.ruleset}:${step.stage}`; }

    /** Предмет-носитель шага, если игрок уже был здесь. */
    _carrierFor(step) {
        const tag = this._tagFor(step);
        return this.actor.items.find(item =>
            item.type === "origin" && item.getFlag(GRANT_FLAG_SCOPE, GRANT_FLAG_KEY) === tag);
    }

    /** Бонус Интеллекта — от него зависит, сколько знаний просит выбор «any N». */
    get _intelligenceBonus() {
        return Math.floor((this.actor?.system?.characteristics?.intelligence?.total ?? 0) / 10);
    }

    /** Происхождения пака для одной стадии текущей книги, в книжном порядке. */
    async _originsFor(stage) {
        const pack = game.packs.get("dark-heresy.origins");
        if (!pack) return [];
        const index = await pack.getIndex({fields: ["system.ruleset", "system.stage", "system.order"]});
        return index.contents
            .filter(entry => entry.system?.ruleset === this.ruleset && entry.system?.stage === stage)
            .sort((a, b) => (a.system.order ?? 0) - (b.system.order ?? 0) || a.name.localeCompare(b.name));
    }

    /**
     * Копия предмета из паков по виду и имени.
     * @returns {Promise<object|null>} null — такого имени нет ни в одном паке
     */
    async _lookupContent(kind, name) {
        for (const packId of CONTENT_PACKS) {
            const pack = game.packs.get(packId);
            if (!pack) continue;
            const index = await pack.getIndex();
            const hit = findContent(index.contents, GRANT_ITEM_TYPES[kind], name);
            if (!hit) continue;
            const data = (await pack.getDocument(hit._id)).toObject();
            // Имя с уточнением остаётся за копией: специалистский талант лежит в паке
            // одной записью «Weapon Training*», а на листе он «Weapon Training (Las)».
            data.name = name;
            return data;
        }
        return null;
    }

    /**
     * Закрепить выбранное происхождение.
     *
     * На актора не уходит НИЧЕГО, пока план не сойдётся: неотвеченный выбор
     * оставляет персонажа ровно таким, каким он был.
     */
    async _commitOriginStep(step) {
        const actor = this.actor;
        if (this._carrierFor(step)) return true;   // уже закреплено в прошлый заход

        const uuid = this.element?.querySelector(`select[data-origin-step="${step.id}"]`)?.value;
        if (!uuid) { ui.notifications?.warn(game.i18n.localize("WIZARD.PICK_ORIGIN")); return false; }

        const source = (await fromUuid(uuid))?.toObject();
        if (!source) { ui.notifications?.warn(game.i18n.localize("WIZARD.PICK_ORIGIN")); return false; }

        const picks = readChoicePicks(this.element.querySelector(".wizard-choice-rows"), source.system);
        this.answers[step.id] = picks;

        const {plan, problems} = resolveGrantPlan(source.system, picks,
                                                  {intelligenceBonus: this._intelligenceBonus});
        if (problems.length) { ui.notifications?.warn(problems.join("; ")); return false; }

        const tag = this._tagFor(step);
        // Носитель кладётся на актора как есть, поэтому его system сначала приводится
        // к схеме: пак, собранный более старым шаблоном, может нести пустые поля
        // значением null, а модель данных их не принимает и валит создание целиком.
        source.system = normaliseOrigin(source.system);
        source.flags = foundry.utils.mergeObject(source.flags ?? {},
            {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, picks}});
        const [carrier] = await actor.createEmbeddedDocuments("Item", [source]);

        const copies = new Map();
        const unresolved = [];
        for (const [kind, list] of [["talent", plan.talents], ["trait", plan.traits], ["equipment", plan.equipment]])
            for (const entry of list) {
                const copy = await this._lookupContent(kind, entry.name);
                copies.set(`${kind}:${entry.name}`, copy);
                if (!copy) unresolved.push(entry.name);
            }
        // Имя, которого нет ни в одном паке, становится пустой заглушкой. Молчать об
        // этом нельзя: на листе она выглядит настоящим предметом, только без правил.
        if (unresolved.length)
            ui.notifications?.warn(game.i18n.format("WIZARD.UNRESOLVED_GRANTS",
                                                    {names: unresolved.join(", ")}));
        // Сначала поля: план решает, какие склонности у актора ещё нет. Уже имеющуюся
        // повторно не выдаём — она записывается долгом (стр. 79).
        const {update, applied} = planToActorUpdate(actor, plan,
            {characteristicMode: RULESET_DEFS[this.ruleset].characteristicModifiers});
        const granted = planToItemData(plan, tag, carrier.id, (kind, name) => copies.get(`${kind}:${name}`),
                                       {aptitudes: applied.aptitudes});
        if (granted.length) await actor.createEmbeddedDocuments("Item", granted);
        // Название выбранного попадает в анкету ЗДЕСЬ, а не в конце: игрок видит, как
        // лист собирается под его руками. Поле остаётся обычным, редактируемым —
        // переименовать «Мир-улей» в «Десолеум» это игра, а не поломка.
        if (step.bioField) update[step.bioField] = carrier.name;
        if (Object.keys(update).length) await actor.update(update);
        await carrier.setFlag(GRANT_FLAG_SCOPE, "applied", applied);
        return true;
    }

    /** Снять закреплённый шаг, чтобы игрок мог выбрать иначе. */
    async _revertOriginStep(step) {
        const actor = this.actor;
        const carrier = this._carrierFor(step);
        if (!carrier) return;

        const update = revertUpdate(actor, carrier.getFlag(GRANT_FLAG_SCOPE, "applied") ?? {});
        if (Object.keys(update).length) await actor.update(update);

        // Подпись в анкете снимается только если она всё ещё та, что мы вписали.
        // Переписанное игроком — его текст, и откат шага его не трогает, той же
        // логикой, по которой откат не опускает навык, поднятый другим источником.
        if (step.bioField && foundry.utils.getProperty(actor, step.bioField) === carrier.name)
            await actor.update({[step.bioField]: ""});

        const granted = actor.items
            .filter(item => item.getFlag(GRANT_FLAG_SCOPE, "grantedBy") === carrier.id)
            .map(item => item.id);
        await actor.deleteEmbeddedDocuments("Item", [carrier.id, ...granted]);
    }

    // ── Шаг характеристик ────────────────────────────────────────────────

    /**
     * Сумма модификаторов происхождений для одной характеристики.
     *
     * Читается с носителей шагов. У книги с «generation» это НЕ прибавка к
     * результату, а указание, чем его катать: модификатор уже окажется внутри
     * значения. Складывать его сверху нельзя (DH2, стр. 31).
     */
    _originModifier(key) {
        let total = 0;
        for (const item of this.actor.items) {
            if (item.type !== "origin") continue;
            const applied = item.getFlag(GRANT_FLAG_SCOPE, "applied") ?? {};
            total += applied.generationModifiers?.[key] ?? applied.characteristics?.[key] ?? 0;
        }
        return total;
    }

    /** Контекст шага характеристик: способ, формулы и уже брошенные значения. */
    _characteristicsStepContext() {
        const rolled = this.actor.getFlag(GRANT_FLAG_SCOPE, "creationRolls");
        const method = this._charMethod ?? rolled?.method ?? RULESET_DEFS[this.ruleset].characteristicMethods[0];
        return {
            charMethods: RULESET_DEFS[this.ruleset].characteristicMethods.map(key => ({
                key, label: game.i18n.localize(`WIZARD.METHOD.${key.toUpperCase()}`), selected: key === method
            })),
            charMethod: method,
            charPointBuy: method === "pointBuy",
            charBase: POINT_BUY.base,
            charBudget: POINT_BUY.points,
            charRows: CHARACTERISTIC_KEYS.map(key => {
                const modifier = this._originModifier(key);
                return {
                    key,
                    label: game.i18n.localize(`CHARACTERISTIC.${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`),
                    modifier,
                    formula: rollExpression(RULESET_DEFS[this.ruleset].characteristicModifiers, modifier),
                    // При закупке модификатор сдвигает СТАРТ, а не результат: «+» начинает
                    // с 30, «−» с 20 вместо 25.
                    start: POINT_BUY.base + modifier,
                    value: rolled?.values?.[key] ?? this._charValues?.[key] ?? ""
                };
            }),
            charLocked: !!rolled,
            charBlessing: rolled?.blessing
                ? game.i18n.format(rolled.blessing.granted ? "WIZARD.BLESSING_GRANTED" : "WIZARD.BLESSING_MISSED",
                                   {rolled: rolled.blessing.rolled, threshold: rolled.blessing.threshold})
                : ""
        };
    }

    /**
     * Закрепить характеристики: записать значения, бросить Раны и Судьбу.
     *
     * Броски запоминаются флагом — вернувшись на шаг, персонаж не перекатывается.
     */
    async _commitCharacteristicsStep() {
        const actor = this.actor;
        if (actor.getFlag(GRANT_FLAG_SCOPE, "creationRolls")) return true;

        const root = this.element;
        const method = root?.querySelector(".wizard-char-method")?.value
            ?? RULESET_DEFS[this.ruleset].characteristicMethods[0];

        const values = {};
        for (const key of CHARACTERISTIC_KEYS)
            values[key] = Number(root?.querySelector(`input[data-characteristic="${key}"]`)?.value ?? 0);

        if (method === "pointBuy") {
            const problems = pointBuyProblems(values);
            if (problems.length) { ui.notifications?.warn(problems.join("; ")); return false; }
        } else if (CHARACTERISTIC_KEYS.some(key => !values[key])) {
            ui.notifications?.warn(game.i18n.localize("WIZARD.ROLL_ALL"));
            return false;
        }

        const update = {};
        // Значение ставится, а не прибавляется: модификатор уже внутри него.
        for (const key of CHARACTERISTIC_KEYS) update[`system.characteristics.${key}.base`] = values[key];

        const homeWorld = actor.items.find(item => item.type === "origin" && item.system.stage === "homeWorld");
        const toughnessBonus = Math.floor((values.toughness ?? 0) / 10);
        const wounds = await new Roll(woundsExpression(homeWorld?.system.wounds ?? {}, toughnessBonus)).evaluate();
        const fate = await new Roll(fateExpression(homeWorld?.system.fate ?? {})).evaluate();
        // Благословение Императора (стр. 30): кидается 1d10, и при результате не ниже
        // порога родного мира порог Судьбы поднимается на 1. Без этого броска персонаж
        // просто недополучает очко, о котором нигде не сказано.
        const blessingThreshold = homeWorld?.system.fate?.blessing ?? 0;
        let blessing = null;
        if (blessingThreshold > 0) {
            const roll = await new Roll("1d10").evaluate();
            blessing = {threshold: blessingThreshold, rolled: roll.total, granted: roll.total >= blessingThreshold};
        }
        const fateTotal = fate.total + (blessing?.granted ? 1 : 0);
        // Раны, выданные другими шагами, добавляются поверх книжного броска: он
        // ставится, а не прибавляется, и без этого их бы стёрло.
        let granted = 0;
        for (const item of actor.items)
            if (item.type === "origin") granted += item.getFlag(GRANT_FLAG_SCOPE, "applied")?.wounds ?? 0;
        update["system.wounds.max"] = update["system.wounds.value"] = wounds.total + granted;
        update["system.fate.max"] = update["system.fate.value"] = fateTotal;

        await actor.update(update);
        await actor.setFlag(GRANT_FLAG_SCOPE, "creationRolls",
                            {method, values, wounds: wounds.total, fate: fateTotal, blessing});
        return true;
    }

    // ── Шаг опыта ────────────────────────────────────────────────────────

    /** Стартовый опыт по книге. Dark Heresy, стр. 78. */
    static STARTING_EXPERIENCE = {dh2: 1000};

    /** Контекст шага опыта: пул, склонности и долг по повторным склонностям. */
    _experienceStepContext() {
        const owed = [];
        for (const item of this.actor.items) {
            if (item.type !== "origin") continue;
            owed.push(...(item.getFlag(GRANT_FLAG_SCOPE, "applied")?.duplicateAptitudes ?? []));
        }
        // Цены зависят от склонностей персонажа, а не от книги вообще: одна и та же
        // покупка стоит ему втрое дешевле соседа. Показываем ЕГО колонку, иначе
        // игроку придётся листать книгу с карандашом.
        const owned = ownedAptitudes(this.actor);
        const priceRow = (table, label) => ({
            label,
            two: Object.values(table[2]).join(" / "),
            one: Object.values(table[1]).join(" / "),
            none: Object.values(table[0]).join(" / ")
        });

        return {
            aptitudeChips: [...owned].sort(),
            priceRows: [
                priceRow(CHARACTERISTIC_COSTS, game.i18n.localize("WIZARD.PRICE_CHARACTERISTICS")),
                priceRow(SKILL_COSTS, game.i18n.localize("WIZARD.PRICE_SKILLS")),
                priceRow(TALENT_COSTS, game.i18n.localize("WIZARD.PRICE_TALENTS"))
            ],
            experiencePool: CharacterWizard.STARTING_EXPERIENCE[this.ruleset] ?? 0,
            experienceApplied: !!this.actor.getFlag(GRANT_FLAG_SCOPE, "startingExperienceApplied"),
            aptitudeList: [...owned].sort().join(", "),
            // Книга (стр. 79): повторная склонность меняется на другую характеристическую,
            // которой ещё нет. Выбирает игрок, поэтому Мастер только напоминает.
            owedAptitudes: [...new Set(owed)].join(", "),
            // Закупка снаряжения за бонус Влияния (стр. 78) в Мастер не входит.
            influenceBonus: Math.floor((this.actor.system.characteristics?.influence?.total ?? 0) / 10)
        };
    }

    /**
     * Выдать стартовый опыт.
     *
     * Признак — отдельный флаг, а не «опыт не ноль»: возврат за совпавшую выдачу
     * законно делает его ненулевым ДО этого шага, и проверка «> 0» пропустила бы
     * настоящую выдачу.
     */
    async _commitExperienceStep() {
        const actor = this.actor;
        if (actor.getFlag(GRANT_FLAG_SCOPE, "startingExperienceApplied")) return true;
        const pool = CharacterWizard.STARTING_EXPERIENCE[this.ruleset] ?? 0;
        await actor.update({"system.experience.value": (actor.system.experience?.value ?? 0) + pool});
        await actor.setFlag(GRANT_FLAG_SCOPE, "startingExperienceApplied", pool);
        return true;
    }

    // ── Шаг дивинации ────────────────────────────────────────────────────

    /** Таблица дивинаций: из мира, иначе из пака таблиц. */
    async _divinationTable() {
        const inWorld = game.tables?.find(table => table.name === "Divinations");
        if (inWorld) return inWorld;
        const pack = game.packs.get("dark-heresy.bc-tables");
        if (!pack) return null;
        const index = await pack.getIndex();
        const hit = index.contents.find(entry => entry.name === "Divinations");
        return hit ? pack.getDocument(hit._id) : null;
    }

    _divinationStepContext() {
        const record = this.actor.getFlag(GRANT_FLAG_SCOPE, "divination");
        const applied = record?.applied ?? {};
        const signed = value => `${value > 0 ? "+" : ""}${value}`;
        const effect = [
            ...Object.entries(applied.characteristics ?? {}).map(([key, value]) => `${key} ${signed(value)}`),
            ...(record?.fate ? [`Fate ${signed(record.fate)}`] : []),
            ...["wounds", "corruption", "insanity"]
                .filter(key => applied[key]).map(key => `${key} ${signed(applied[key])}`)
        ];
        return {
            divinationDrawn: !!record,
            divinationName: record?.name ?? "",
            divinationText: this.actor.system.bio?.divination ?? "",
            divinationEffect: effect
        };
    }

    /**
     * Бросить дивинацию. Механическая часть строки идёт через тот же учёт отката,
     * что и выдачи происхождения, — иначе переброс наслаивался бы.
     */
    async _commitDivinationStep() {
        const actor = this.actor;
        if (actor.getFlag(GRANT_FLAG_SCOPE, "divination")) return true;

        const table = await this._divinationTable();
        if (!table) { ui.notifications?.warn(game.i18n.localize("WIZARD.NO_DIVINATION_TABLE")); return false; }

        const draw = await table.draw({displayChat: false});
        const result = draw.results?.[0];
        const effect = result?.flags?.[GRANT_FLAG_SCOPE]?.divinationEffect ?? {};

        const plan = {...emptyPlan(), characteristics: effect.characteristics ?? {},
                      wounds: effect.wounds ?? 0, corruption: effect.corruption ?? 0,
                      insanity: effect.insanity ?? 0};
        // Дивинация меняет готовое значение, а не способ генерации: она приходит
        // ПОСЛЕ броска характеристик.
        const {update, applied} = planToActorUpdate(actor, plan, {characteristicMode: "flat"});
        update["system.bio.divination"] = result?.description ?? result?.name ?? "";
        if (effect.fate) {
            update["system.fate.max"] = (actor.system.fate?.max ?? 0) + effect.fate;
            update["system.fate.value"] = (actor.system.fate?.value ?? 0) + effect.fate;
        }
        await actor.update(update);
        await actor.setFlag(GRANT_FLAG_SCOPE, "divination",
                            {applied, fate: effect.fate ?? 0, name: result?.name ?? ""});
        return true;
    }

    /** Снять брошенную дивинацию — для переброса или для «Назад». */
    async _revertDivination() {
        const actor = this.actor;
        const record = actor.getFlag(GRANT_FLAG_SCOPE, "divination");
        if (!record) return;

        const update = revertUpdate(actor, record.applied ?? {});
        if (record.fate) {
            update["system.fate.max"] = Math.max(0, (actor.system.fate?.max ?? 0) - record.fate);
            update["system.fate.value"] = Math.max(0, (actor.system.fate?.value ?? 0) - record.fate);
        }
        update["system.bio.divination"] = "";
        await actor.update(update);
        await actor.unsetFlag(GRANT_FLAG_SCOPE, "divination");
    }

    /** Хвост: анкета заполнена по шагам, остаётся закрыть окно и поднять лист. */
    async _finish() {
        const actor = this.actor;
        await this.close();
        actor.sheet?.render(true, {focus: true});
    }
}

/** Открыть Мастера на акторе. */
export function openCharacterWizard(actor) {
    if (!actor) return null;
    const app = new CharacterWizard(actor);
    app.render(true);
    return app;
}
