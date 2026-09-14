const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const renderMode = fs.readFileSync('comet-render-mode.js', 'utf8');
const familyPolicy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');
const namedVisuals = fs.readFileSync('comet-named-visuals.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// The remaining RGB/rainbow rectangle corruption reproduced on unrelated transparent PNGs
// (Atom and Saturn), so iOS/iPadOS Home Screen mode now avoids the WebGL texture path entirely.
assert(index.includes('comet-render-mode.js?v=2'), 'iOS renderer guard must be loaded');
assert(index.indexOf('comet-render-mode.js?v=2') < index.indexOf('comet-game.js'), 'renderer guard must load before Phaser.Game is created');
assert(renderMode.includes('window.COMET_STANDALONE'), 'renderer override must be standalone-only');
assert(renderMode.includes('/iPad|iPhone|iPod/i'), 'renderer override must be iOS-targeted');
assert(renderMode.includes("platform === 'MacIntel'"), 'renderer override must cover modern iPadOS user agents');
assert(renderMode.includes('type: Phaser.CANVAS'), 'iOS Home Screen mode must use Canvas to avoid WebGL sprite corruption');
assert(renderMode.includes('...config'), 'renderer override must preserve the existing Phaser config and Scale.FIT settings');

// Force fresh PWA copies of files involved in the latest sprite stability work.
for (const src of [
  'assets/sprites/sprite-manifest.js?v=8',
  'comet-render-mode.js?v=2',
  'comet-family-lod-policy.js?v=5',
  'comet-named-visuals.js?v=4',
  'comet-sprite-stability.js?v=3'
]) {
  assert(index.includes(src), `${src} cache bust missing`);
}

// Sprite reveal animation still avoids large container-scale resampling.
assert(stability.includes('setVisualDisplayDiameter(startDiameter)'), 'sprite reveal must initialize via display diameter');
assert(stability.includes('setVisualDisplayDiameter(tween.getValue())'), 'sprite reveal must tween display diameter');
assert(index.indexOf('comet-sprite-stability.js?v=3') > index.indexOf('comet-approach-visuals-v8.js'), 'stability reveal patch must load last');

// Real sprites stay real sprites at large display sizes; procedural fallback is missing-texture only.
assert(!familyPolicy.includes('MAX_SAFE_SPRITE_SCALE'), 'large fixed-LOD sprites must not revert to prototype graphics');
assert(!namedVisuals.includes('MAX_SAFE_NAMED_SCALE'), 'large named sprites must not revert to generic/prototype graphics');
assert(familyPolicy.includes('Only a genuinely missing/bad texture falls back'), 'fallback policy should be missing-texture only');

// Standalone sprite transforms remain conservative as a second layer of protection.
assert(familyPolicy.includes('isStandaloneSafeMode()'), 'standalone safe transform mode missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.tintEnabled) return null'), 'standalone tint disable missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.allowRotation) return 0'), 'standalone rotation disable missing');
assert(familyPolicy.includes('!isStandaloneSafeMode() && def.allowFlip'), 'standalone flip disable missing');

// Atom uses its already-hardened source PNG directly; no runtime CanvasTexture conversion.
for (const variant of ['atom_01', 'atom_02', 'atom_03']) {
  const re = new RegExp(`${variant}:\\s+\\{ family: 'atomic',\\s+lods: \\[32, 64\\], version: 4 \\}`);
  assert(re.test(manifest), `${variant} must remain cache-busted to version 4`);
}
assert(!familyPolicy.includes('scene.textures.createCanvas'), 'Atom renderer must not create runtime CanvasTextures');
assert(!familyPolicy.includes('standalone-hard-alpha'), 'legacy Atom CanvasTexture key must be removed');
assert(familyPolicy.includes('this.add.image(0, 0, key)'), 'fixed-LOD renderer should use the original loaded texture directly');

// Corrected rock/comet packs remain cache-busted so Home Screen mode cannot reuse bad image bytes.
for (const [family, variants] of Object.entries({
  rock: ['rock_01', 'rock_02', 'rock_03'],
  comet: ['comet_01', 'comet_02', 'comet_03']
})) {
  for (const variant of variants) {
    const re = new RegExp(`${variant}:\\s+\\{ family: '${family}',\\s+lods: \\[32, 64\\], version: 3 \\}`);
    assert(re.test(manifest), `${variant} must remain on version 3`);
  }
}

console.log('iOS sprite rendering regression checks passed');
