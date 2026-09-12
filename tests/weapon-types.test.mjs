import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEAPON_TYPES, classifyWeapon} from '../script/data/weapon-types.mjs';

test('the vocabulary covers the DH2 weapon groups', () => {
    const keys = WEAPON_TYPES.map(t => t.key);
    for (const key of ['las', 'solidProjectile', 'bolt', 'melta', 'plasma', 'flame',
                       'primitive', 'launcher', 'grenade', 'exotic', 'chain', 'shock',
                       'power', 'force'])
        assert.ok(keys.includes(key), `missing ${key}`);
});

test('the classifier never returns a key outside the vocabulary', () => {
    const keys = new Set(WEAPON_TYPES.map(t => t.key));
    for (const name of ['Lasgun', 'Chainaxe', 'Xenos Artefact', '', 'Shield']) {
        const got = classifyWeapon(name);
        assert.ok(got === null || keys.has(got), `${name} -> ${got}`);
    }
});

test('las weapons are recognised by every name the pack uses', () => {
    for (const name of ['Lasgun', 'Laspistol', 'Long Las', 'Laslock', 'Hot-shot Lasgun',
                        'Hot-shot Laspistol', 'Hellrifle', 'Laser Karabiner: Cas-Schema'])
        assert.equal(classifyWeapon(name), 'las', name);
});

test('bolt weapons are recognised, including the named patterns', () => {
    for (const name of ['Bolt Gun', 'Bolt Pistol', 'Heavy Bolter', 'Storm Bolter',
                        'Godwyn-De’az Bolt Gun', 'Godwyn-De’az Storm Bolter'])
        assert.equal(classifyWeapon(name), 'bolt', name);
});

test('a grenade launcher is a launcher, not a grenade', () => {
    assert.equal(classifyWeapon('Grenade Launcher'), 'launcher');
    assert.equal(classifyWeapon('Missile Launcher'), 'launcher');
    assert.equal(classifyWeapon('Rokkit Launcha'), 'launcher');
});

test('a plasma grenade is a grenade, not a plasma weapon', () => {
    assert.equal(classifyWeapon('Eldar Plasma Grenade'), 'grenade');
    assert.equal(classifyWeapon('Graviton Grenade'), 'grenade');
    assert.equal(classifyWeapon('Krak Grenade'), 'grenade');
    assert.equal(classifyWeapon('Stikkbomb'), 'grenade');
});

test('plasma, melta and flame weapons are separated', () => {
    assert.equal(classifyWeapon('Plasma Gun'), 'plasma');
    assert.equal(classifyWeapon('Sentinel Plasma Rifle'), 'plasma');
    assert.equal(classifyWeapon('Meltagun'), 'melta');
    assert.equal(classifyWeapon('Inferno Pistol'), 'melta');
    assert.equal(classifyWeapon('Hand Flamer'), 'flame');
    assert.equal(classifyWeapon('Cerberus Heavy Flamer'), 'flame');
    assert.equal(classifyWeapon('Incinerator'), 'flame');
});

test('melee power groups are separated from each other', () => {
    assert.equal(classifyWeapon('Chainaxe'), 'chain');
    assert.equal(classifyWeapon('Chainsword'), 'chain');
    assert.equal(classifyWeapon('Force Sword'), 'force');
    assert.equal(classifyWeapon('Force Staff'), 'force');
    assert.equal(classifyWeapon('Power Sword'), 'power');
    assert.equal(classifyWeapon('Power Fist'), 'power');
    assert.equal(classifyWeapon('Shock Maul'), 'shock');
    assert.equal(classifyWeapon('Shock Whip'), 'shock');
});

test('solid projectile weapons are recognised', () => {
    for (const name of ['Autogun', 'Autopistol', 'Autocannon', 'Heavy Stubber',
                        'Stub Automatic', 'Stub Revolver', 'Shotgun', 'Sniper Rifle'])
        assert.equal(classifyWeapon(name), 'solidProjectile', name);
});

test('ork weapons map onto the groups they stand in for', () => {
    assert.equal(classifyWeapon('Shoota'), 'solidProjectile');
    assert.equal(classifyWeapon('Big Shoota'), 'solidProjectile');
    assert.equal(classifyWeapon('Slugga'), 'solidProjectile');
    assert.equal(classifyWeapon('Choppa'), 'primitive');
    assert.equal(classifyWeapon('Big Choppa'), 'primitive');
});

test('the xeno families the pack carries are recognised as exotic', () => {
    assert.equal(classifyWeapon('Firesprite Needler'), 'exotic');
    assert.equal(classifyWeapon('Grav Pistol'), 'exotic');
    assert.equal(classifyWeapon('Graviton Gun'), 'exotic');
});

test('a weapon that matches nothing is left undecided, never guessed', () => {
    assert.equal(classifyWeapon('Praesidium Protectiva'), null);
    assert.equal(classifyWeapon(''), null);
    assert.equal(classifyWeapon(null), null);
});
