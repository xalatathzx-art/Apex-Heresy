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
            isLastStep: this.stepIndex === this.steps.length - 1,
            backDisabled: this.stepIndex === 0 || this._busy,
            nextDisabled: !this.ruleset || this._busy,
            busy: !!this._busy
        };
    }

    /** @override */
    _onRender(context, options) {
        super._onRender?.(context, options);
        const root = this.element;
        if (!root) return;

        root.querySelector(".wizard-ruleset")?.addEventListener("change", async ev => {
            const chosen = ev.currentTarget.value;
            if (!chosen) return;
            await this.actor.update({"system.ruleset": chosen});
            this.stepIndex = 0;
            this.answers = {};
            this.render(false);
        });

        root.querySelector("[data-action='wizard-back']")?.addEventListener("click", () => this._onBack());
        root.querySelector("[data-action='wizard-next']")?.addEventListener("click", () => this._onNext());
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
     * Закрепить шаг. Заглушка каркаса: панели шагов приходят следующими задачами.
     * @returns {Promise<boolean>} false — шаг не закрыт, дальше не идём
     */
    async _commitStep(step) { return !!step; }

    /** Откатить ранее закреплённый шаг. Заглушка каркаса. */
    async _revertStep(step) { return step; }

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
