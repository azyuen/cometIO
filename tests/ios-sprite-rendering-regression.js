const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const renderMode = fs.readFileSync('comet-render-mode.js', 'utf8');
const renderer = fs.readFileSync('comet-visual-renderer.js', 'utf8');
const familyPolicy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');
const namedVisuals = fs.readFileSync('comet-named-visuals.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-render-mode.js?v=3'), 'restored renderer shim must be cache-busted');
assert(index.indexOf('comet-render-mode.js?v=3') < index.indexOf('comet-game.js'), 'renderer shim should still load before the game');
assert(renderMode.includes("__COMET_RENDER_MODE = 'AUTO'"), 'renderer shim should explicitly document AUTO mode');
assert(!renderMode.includes('Phaser.CANVAS'), 'iOS Home Screen mode must not force Canvas');

// Known corrupt 64px sources stay on clean 32px fallbacks, but clean planets are allowed to use
// their 64px art again so they do not all look low-detail/blurry.
assert(renderer.includes("variant.startsWith('rockyPlanet_')"), 'generic rocky planet fallback missing');
assert(renderer.includes("variant === 'dwarf_eris'"), 'Eris clean-source fallback missing');
assert(renderer.includes("variant === 'dwarf_ceres'"), 'Ceres clean-source fallback missing');
assert(renderer.includes("variant === 'planet_saturn'"), 'Saturn clean-source fallback missing');
assert(renderer.includes("variant === 'planet_neptune'"), 'Neptune clean-source fallback missing');
assert(renderer.includes("variant.startsWith('yellowDwarf_')"), 'yellow dwarf/Sun clean-source fallback missing');
assert(renderer.includes('Phaser.Textures.FilterMode.NEAREST'), 'sprite renderer must use nearest-neighbour filtering');
assert(familyPolicy.includes("if (def.visualFamily === 'atomic') return 32"), 'fixed-LOD atom renderer must force clean 32px source');

assert(namedVisuals.includes("variant === 'dwarf_eris'"), 'named Eris fallback missing');
assert(namedVisuals.includes("variant === 'planet_saturn'"), 'named Saturn fallback missing');
assert(namedVisuals.includes("String(variant || '').startsWith('yellowDwarf_')"), 'named yellow dwarf/Sun fallback missing');
assert(!namedVisuals.includes("entry.family === 'rockyPlanet'"), 'clean rocky planets should not all be forced to 32px');
assert(!namedVisuals.includes("entry.family === 'gasPlanet'"), 'clean gas planets should not all be forced to 32px');

for (const src of [
  'assets/sprites/sprite-manifest.js?v=8',
  'comet-render-mode.js?v=3',
  'comet-visual-renderer.js?v=4',
  'comet-family-lod-policy.js?v=6',
  'comet-named-visuals.js?v=8',
  'comet-sprite-stability.js?v=6'
]) {
  assert(index.includes(src), `${src} cache bust missing`);
}

assert(stability.includes('setVisualDisplayDiameter(startDiameter)'), 'sprite reveal must initialize via display diameter');
assert(stability.includes('setVisualDisplayDiameter(tween.getValue())'), 'sprite reveal must tween display diameter');
assert(stability.includes('GameScene.prototype.getRevealDisplayRadii'), 'canonical reveal sizing helper missing');
assert(stability.includes('GameScene.prototype.getPhysicalDisplayScaleRatio'), 'physical reveal-scale helper missing');
assert(stability.includes('this.getPhysicalDisplayScaleRatio(player, other)'), 'live reveal must use physical radius relationship');
assert(index.indexOf('comet-sprite-stability.js?v=6') > index.indexOf('comet-approach-visuals-v8.js'), 'stability reveal patch must load after approach visuals');

assert(familyPolicy.includes('isStandaloneSafeMode()'), 'standalone safe transform mode missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.tintEnabled) return null'), 'standalone tint disable missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.allowRotation) return 0'), 'standalone rotation disable missing');

for (const variant of ['atom_01', 'atom_02', 'atom_03']) {
  const re = new RegExp(`${variant}:\\s+\\{ family: 'atomic',\\s+lods: \\[32, 64\\], version: 4 \\}`);
  assert(re.test(manifest), `${variant} must remain cache-busted to version 4`);
}

console.log('iOS sprite rendering + targeted clean-source regression checks passed');
