const fs = require('fs');
const vm = require('vm');

const configSource = fs.readFileSync('comet-visual-config.js', 'utf8');
const manifestSource = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const policySource = fs.readFileSync('comet-family-lod-policy.js', 'utf8');

const context = { TIERS: [{ name: 'ATOM' }] };
vm.createContext(context);
vm.runInContext(`${configSource}\nthis.TEST_FAMILIES = COMET_VISUAL_FAMILIES; this.TEST_OBJECTS = COMET_OBJECT_VISUALS;`, context);
vm.runInContext(`${manifestSource}\nthis.TEST_ASSETS = COMET_SPRITE_ASSETS;`, context);

function assert(ok, message) { if (!ok) throw new Error(message); }

const atomic = context.TEST_FAMILIES.atomic;
const assets = context.TEST_ASSETS;
const expected = ['atom_01', 'atom_02', 'atom_03'];

assert(context.TEST_OBJECTS.ATOM.visualFamily === 'atomic', 'Atom must remain in atomic visual family');
assert(JSON.stringify(atomic.sharedVariants) === JSON.stringify(expected), 'Atom must share all three replacement variants');
assert(JSON.stringify(atomic.normalVariants) === JSON.stringify(expected), 'normal Atom variants incorrect');
assert(JSON.stringify(atomic.mysteryVariants) === JSON.stringify(expected), 'mystery Atom variants incorrect');
assert(atomic.fixedLods.mystery === 32 && atomic.fixedLods.normal === 64, 'Atom LODs must be 32/64');
assert(atomic.lodByDisplayedSize === true, 'Atom LOD must be display-size based');
assert(atomic.allowRotation === true && atomic.rotationStep === 90, 'Atom rotation must be stable quarter-turn variation');
assert(atomic.allowFlip === true, 'Atom horizontal flip should remain available');
assert(atomic.effects.back === null && atomic.effects.front === null, 'Atom must not add orbit/glow/particle effects');
assert(atomic.tintEnabled === true, 'subtle Atom tint variation should be enabled');
assert(atomic.tintPalette.every(v => v >= 0xd7d9d7 && v <= 0xffffff), 'Atom tint palette must stay restrained/near-neutral');

for (const variant of expected) {
  assert(assets[variant], `${variant} missing from manifest`);
  assert(assets[variant].family === 'atomic', `${variant} must use atomic folder`);
  assert(JSON.stringify(assets[variant].lods) === JSON.stringify([32, 64]), `${variant} must have 32/64 LODs`);
}
assert(!assets.atomic_01 && !assets.atomic_mystery_01, 'superseded Atom manifest variants should be removed');
assert(assets.atom_01.version === 2, 'atom_01 cache version must be bumped after artwork replacement');

assert(policySource.includes('selectLod(def, mystery, diameter)'), 'display-size LOD selector missing');
assert(policySource.includes('setDisplayDiameter(image, diameter)'), 'display-size preservation path missing');
assert(policySource.includes('forceProceduralFallback'), 'procedural fallback must remain available');
assert(policySource.includes('MAX_SAFE_SPRITE_SCALE'), 'very-large sprite safety fallback missing');

console.log('Atom replacement regression checks passed');
