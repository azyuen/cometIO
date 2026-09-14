const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const renderMode = fs.readFileSync('comet-render-mode.js', 'utf8');
const renderer = fs.readFileSync('comet-visual-renderer.js', 'utf8');
const familyPolicy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');
const namedVisuals = fs.readFileSync('comet-named-visuals.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// Home Screen mode must use the normal Phaser.AUTO path. Forcing Canvas with a high-DPI
// resolution + Scale.FIT caused the installed iOS view to zoom/jumble the scene.
assert(index.includes('comet-render-mode.js?v=3'), 'restored renderer shim must be cache-busted');
assert(index.indexOf('comet-render-mode.js?v=3') < index.indexOf('comet-game.js'), 'renderer shim should still load before the game');
assert(renderMode.includes("__COMET_RENDER_MODE = 'AUTO'"), 'renderer shim should explicitly document AUTO mode');
assert(renderMode.includes('__COMET_RENDER_MODE_LEGACY_NOOP'), 'renderer shim should remain a no-op for stale cached indexes');
assert(!renderMode.includes('Phaser.CANVAS'), 'iOS Home Screen mode must not force Canvas');
assert(!renderMode.includes('Phaser.Game ='), 'renderer shim must not monkey-patch Phaser.Game');

// The rainbow rectangles were literal pixels in some 64px PNG sources. Force clean 32px
// counterparts for the affected packs until those source assets are replaced.
assert(renderer.includes("entry.family === 'atomic' || entry.family === 'gasPlanet'"), 'generic renderer must force clean 32px affected packs');
assert(renderer.includes('return 32;'), 'generic affected-pack fallback must resolve to 32px');
assert(familyPolicy.includes("if (def.visualFamily === 'atomic') return 32"), 'fixed-LOD atom renderer must force clean 32px source');
assert(namedVisuals.includes("entry.family === 'gasPlanet' && lods.includes(32)"), 'named gas planets must prefer clean 32px source');
assert(namedVisuals.includes('return [32, ...lods.filter(lod => lod !== 32)]'), 'named gas planet LOD order must put 32px first');

for (const src of [
  'assets/sprites/sprite-manifest.js?v=8',
  'comet-render-mode.js?v=3',
  'comet-visual-renderer.js?v=1',
  'comet-family-lod-policy.js?v=6',
  'comet-named-visuals.js?v=5',
  'comet-sprite-stability.js?v=6'
]) {
  assert(index.includes(src), `${src} cache bust missing`);
}

assert(stability.includes('setVisualDisplayDiameter(startDiameter)'), 'sprite reveal must initialize via display diameter');
assert(stability.includes('setVisualDisplayDiameter(tween.getValue())'), 'sprite reveal must tween display diameter');
assert(stability.includes('GameScene.prototype.getRevealDisplayRadii'), 'canonical reveal sizing helper missing');
assert(stability.includes('GameScene.prototype.getGameDisplayScaleRatio'), 'progression display-scale helper missing');
assert(stability.includes('Math.pow(2, tierGap) * (oWithin / pWithin)'), 'display scaling must follow tier progression gameRatio');
assert(stability.includes('NEBULA < PULSAR < BLACK HOLE < SUPER MASSIVE BLACK HOLE'), 'compact-remnant progression rule must be documented');
assert(stability.includes('const sizing = this.getRevealDisplayRadii(this.player, this.other)'), 'live reveal must use canonical sizing helper');
assert(!stability.includes('const ratio = other.radiusM / player.radiusM'), 'live reveal must not use literal astronomical radius ratio');
assert(!stability.includes("'LOCKED IN'"), 'reveal choice panel should not include redundant LOCKED IN text');
assert(index.indexOf('comet-sprite-stability.js?v=6') > index.indexOf('comet-approach-visuals-v8.js'), 'stability reveal patch must load after approach visuals');

// Standalone sprite transforms remain conservative as a separate safeguard.
assert(familyPolicy.includes('isStandaloneSafeMode()'), 'standalone safe transform mode missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.tintEnabled) return null'), 'standalone tint disable missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.allowRotation) return 0'), 'standalone rotation disable missing');
assert(familyPolicy.includes('!isStandaloneSafeMode() && def.allowFlip'), 'standalone flip disable missing');

for (const variant of ['atom_01', 'atom_02', 'atom_03']) {
  const re = new RegExp(`${variant}:\\s+\\{ family: 'atomic',\\s+lods: \\[32, 64\\], version: 4 \\}`);
  assert(re.test(manifest), `${variant} must remain cache-busted to version 4`);
}

console.log('iOS sprite rendering + progression scaling regression checks passed');
