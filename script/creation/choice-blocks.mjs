// ════════════════════════════════════════════════════════════════════════
//  Строки выбора происхождения — разметка, чтение ответов и их восстановление.
//
//  Вопрос и варианты видны прямо в форме шага, а не всплывают отдельным окном:
//  игрок должен видеть и то, и другое сразу.
//
//  Форма перерисовывается чаще, чем на неё отвечают (любой соседний клик), а
//  свежая разметка всегда пустая — поэтому ответы снимаются и возвращаются
//  обратно при каждом рендере.
//
//  Зависимостей от Foundry нет: `root` — что угодно с querySelectorAll, а
//  экранирование своё. Поэтому чтение ответов проверяется тестами.
// ════════════════════════════════════════════════════════════════════════

const ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};

/** Экранирование текста книги перед вставкой в разметку. */
export function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ESCAPES[char]);
}

/** Сколько записей просит выбор «any N»: число либо бонус Интеллекта. */
export function manyCount(choice, context = {}) {
    return choice.count === "intelligenceBonus" ? (context.intelligenceBonus ?? 0) : (choice.count ?? 0);
}

/**
 * Разметка всех строк выбора одного происхождения.
 *
 * @param {object} origin   system-часть предмета
 * @param {{intelligenceBonus?: number}} context
 * @returns {string}
 */
export function choiceBlocksHtml(origin = {}, context = {}) {
    const blocks = [];

    (origin.characteristicChoices ?? []).forEach((choice, index) => {
        const options = (choice.from ?? []).map((key, i) =>
            `<label class="wizard-choice-option"><input type="checkbox" data-charchoice="${index}" value="${i}"/> ${esc(key)}</label>`
        ).join("");
        blocks.push(`<div class="wizard-choice">
            <div class="wizard-choice-label">${esc(choice.label)} — pick ${choice.pick}</div>
            <div class="wizard-choice-options">${options}</div>
            <div class="wizard-choice-count" data-count-for="char:${index}">0 / ${choice.pick}</div>
        </div>`);
    });

    for (const choice of origin.choices ?? []) {
        if (choice.type === "one") blocks.push(oneBlock(choice));
        else if (choice.type === "many") blocks.push(manyBlock(choice, context));
        else if (choice.type === "target") blocks.push(targetBlock(choice));
    }

    return blocks.join("");
}

function oneBlock(choice) {
    const options = (choice.options ?? []).map((option, index) =>
        `<option value="${index}">${esc(option.label)}</option>`).join("");
    // Вариант, который сам требует уточнения («Resistance (Pick One)»), носит свой
    // ввод рядом; показывается он только когда выбран именно он — см. wireChoiceBlocks.
    const needsTarget = (choice.options ?? []).some(option => option.talentTemplate);
    const target = needsTarget
        ? `<input type="text" class="wizard-choice-target" data-option-target="${esc(choice.key)}" hidden
                  placeholder="${esc(choice.targetPlaceholder ?? "name it")}"/>`
        : "";
    return `<div class="wizard-choice">
        <div class="wizard-choice-label">${esc(choice.label)}</div>
        <select data-choice="${esc(choice.key)}"><option value="">— choose —</option>${options}</select>
        ${target}
    </div>`;
}

function manyBlock(choice, context) {
    const count = manyCount(choice, context);
    const rows = (choice.groups ?? []).map(group =>
        `<div class="wizard-many-group"><b>${esc(group)}</b>
            <input type="text" data-many="${esc(choice.key)}" data-group="${esc(group)}"
                   placeholder="comma separated"/></div>`).join("");
    return `<div class="wizard-choice">
        <div class="wizard-choice-label">${esc(choice.label)} — pick ${count}</div>
        ${rows}
        <div class="wizard-choice-count" data-count-for="many:${esc(choice.key)}">0 / ${count}</div>
    </div>`;
}

function targetBlock(choice) {
    return `<div class="wizard-choice">
        <div class="wizard-choice-label">${esc(choice.label)}</div>
        <input type="text" data-target="${esc(choice.key)}" placeholder="${esc(choice.targetPlaceholder ?? "name it")}"/>
    </div>`;
}

/**
 * Ответы отрисованных строк в том виде, какого ждёт resolveGrantPlan.
 *
 * @param {{querySelectorAll: Function}} root
 * @param {object} origin
 * @returns {object}
 */
export function readChoicePicks(root, origin = {}) {
    const picks = {characteristicChoices: [], one: {}, many: {}, target: {}};
    if (!root) return picks;

    (origin.characteristicChoices ?? []).forEach((choice, index) => {
        picks.characteristicChoices[index] = [...root.querySelectorAll(`input[data-charchoice="${index}"]`)]
            .filter(input => input.checked)
            .map(input => Number(input.value));
    });

    for (const select of root.querySelectorAll("select[data-choice]")) {
        if (select.value === "") continue;
        picks.one[select.dataset.choice] = Number(select.value);
    }

    // Уточнение варианта и самостоятельный выбор цели живут в одном ведре: и то, и
    // другое отвечает на «против чего», и resolveGrantPlan читает их одинаково.
    for (const input of root.querySelectorAll("input[data-option-target]")) {
        const value = String(input.value ?? "").trim();
        if (value) picks.target[input.dataset.optionTarget] = {kind: "text", value};
    }
    for (const input of root.querySelectorAll("input[data-target]")) {
        const value = String(input.value ?? "").trim();
        if (value) picks.target[input.dataset.target] = {kind: "text", value};
    }

    for (const input of root.querySelectorAll("input[data-many]")) {
        const list = picks.many[input.dataset.many] ??= [];
        for (const name of String(input.value ?? "").split(",").map(part => part.trim()).filter(Boolean))
            list.push({key: input.dataset.group, name});
    }

    return picks;
}

/**
 * Вернуть ранее снятые ответы в заново отрисованные строки.
 *
 * @param {{querySelectorAll: Function, querySelector: Function}} root
 * @param {object} snapshot  из readChoicePicks
 */
export function restoreChoicePicks(root, snapshot = {}) {
    if (!root || !snapshot) return;

    (snapshot.characteristicChoices ?? []).forEach((picked, index) => {
        for (const input of root.querySelectorAll(`input[data-charchoice="${index}"]`))
            input.checked = (picked ?? []).includes(Number(input.value));
    });

    for (const [key, index] of Object.entries(snapshot.one ?? {})) {
        const select = root.querySelector(`select[data-choice="${key}"]`);
        if (select) select.value = String(index);
    }

    for (const [key, target] of Object.entries(snapshot.target ?? {})) {
        const input = root.querySelector(`input[data-option-target="${key}"]`)
            ?? root.querySelector(`input[data-target="${key}"]`);
        if (input) input.value = target.value;
    }

    for (const [key, entries] of Object.entries(snapshot.many ?? {})) {
        const byGroup = {};
        for (const entry of entries) (byGroup[entry.key] ??= []).push(entry.name);
        for (const [group, names] of Object.entries(byGroup)) {
            const input = root.querySelector(`input[data-many="${key}"][data-group="${group}"]`);
            if (input) input.value = names.join(", ");
        }
    }
}
