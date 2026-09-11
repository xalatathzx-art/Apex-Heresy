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
import {resolveGrantPlan} from "./grant-data.mjs";
import {planToActorUpdate, planToItemData, revertUpdate,
        GRANT_FLAG_SCOPE, GRANT_FLAG_KEY} from "./origin-apply.mjs";
import {choiceBlocksHtml, readChoicePicks, restoreChoicePicks} from "./choice-blocks.mjs";
import {CHARACTERISTIC_KEYS} from "./origin-data.mjs";
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
        position: {width: 640, height: 780},
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
                : ""
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
            await this.actor.update({"system.ruleset": chosen});
            this.stepIndex = 0;
            this.answers = {};
            this.render(false);
        });

        this._wireCharacteristics(root);

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
        return true;
    }

    /** Откатить ранее закреплённый шаг. */
    async _revertStep(step) {
        if (step?.kind === "origin") await this._revertOriginStep(step);
        // Вернувшись к характеристикам, шаг снова можно закрепить — другим способом
        // или другими значениями. Само закрепление ставит значения, а не прибавляет,
        // так что повторное не наслаивается.
        if (step?.kind === "characteristics") await this.actor.unsetFlag(GRANT_FLAG_SCOPE, "creationRolls");
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
            const hit = index.contents.find(entry =>
                entry.name === name && GRANT_ITEM_TYPES[kind].includes(entry.type));
            if (!hit) continue;
            return (await pack.getDocument(hit._id)).toObject();
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
        source.flags = foundry.utils.mergeObject(source.flags ?? {},
            {[GRANT_FLAG_SCOPE]: {[GRANT_FLAG_KEY]: tag, picks}});
        const [carrier] = await actor.createEmbeddedDocuments("Item", [source]);

        const copies = new Map();
        for (const [kind, list] of [["talent", plan.talents], ["trait", plan.traits], ["equipment", plan.equipment]])
            for (const entry of list)
                copies.set(`${kind}:${entry.name}`, await this._lookupContent(kind, entry.name));
        const granted = planToItemData(plan, tag, carrier.id, (kind, name) => copies.get(`${kind}:${name}`));
        if (granted.length) await actor.createEmbeddedDocuments("Item", granted);

        const {update, applied} = planToActorUpdate(actor, plan,
            {characteristicMode: RULESET_DEFS[this.ruleset].characteristicModifiers});
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
                    formula: rollExpression(method, modifier),
                    // При закупке модификатор сдвигает СТАРТ, а не результат: «+» начинает
                    // с 30, «−» с 20 вместо 25.
                    start: POINT_BUY.base + modifier,
                    value: rolled?.values?.[key] ?? this._charValues?.[key] ?? ""
                };
            }),
            charLocked: !!rolled
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
        // Раны, выданные другими шагами, добавляются поверх книжного броска: он
        // ставится, а не прибавляется, и без этого их бы стёрло.
        let granted = 0;
        for (const item of actor.items)
            if (item.type === "origin") granted += item.getFlag(GRANT_FLAG_SCOPE, "applied")?.wounds ?? 0;
        update["system.wounds.max"] = update["system.wounds.value"] = wounds.total + granted;
        update["system.fate.max"] = update["system.fate.value"] = fate.total;

        await actor.update(update);
        await actor.setFlag(GRANT_FLAG_SCOPE, "creationRolls",
                            {method, values, wounds: wounds.total, fate: fate.total});
        return true;
    }

    /** Хвост последнего шага. Заглушка каркаса. */
    async _finish() {
        await this.close();
        this.actor?.sheet?.render(true, {focus: true});
    }
}

/** Открыть Мастера на акторе. */
export function openCharacterWizard(actor) {
    if (!actor) return null;
    const app = new CharacterWizard(actor);
    app.render(true);
    return app;
}
