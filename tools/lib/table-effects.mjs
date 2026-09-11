/**
 * The mechanical part of a roll table row travels as a flag on the result.
 *
 * The wizard reads it and puts it through the same rollback bookkeeping as an origin's
 * grants. An empty object means there is nothing to apply automatically: the row depends on
 * what the character already has, or it offers a choice, and either way it is the player's
 * call rather than the table's.
 */
export function tableResultFlags(row) {
    const effect = row?.effect;
    if (!effect || typeof effect !== "object" || Array.isArray(effect)) return {};
    if (!Object.keys(effect).length) return {};
    return {"dark-heresy": {divinationEffect: structuredClone(effect)}};
}
