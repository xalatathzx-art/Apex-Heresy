/** Preserve document metadata; never silently strip automation from source content. */
export function packEffectData(source) {
    const effects = source.effects ?? [];
    const flags = source.flags ?? {};
    if (!Array.isArray(effects)) throw new Error('effects must be an array');
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) throw new Error('flags must be an object');
    const ids = new Set();
    for (const effect of effects) {
        if (!effect || typeof effect !== 'object' || Array.isArray(effect)) throw new Error('Invalid effect document');
        if (effect._id) {
            if (ids.has(effect._id)) throw new Error(`Duplicate effect ID: ${effect._id}`);
            ids.add(effect._id);
        }
        const changes = effect.system?.changes ?? effect.changes;
        if (changes !== undefined && !Array.isArray(changes)) throw new Error('Effect changes must be an array');
    }
    return structuredClone({effects, flags});
}
