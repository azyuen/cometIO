const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const familyPolicy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');
const namedVisuals = fs.readFileSync('comet-named-visuals.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// Home Screen mode must use the same Phaser renderer/scaling path as browser mode.
assert(!index.includes('comet-render-mode.js'), 'standalone Canvas renderer override must not be loaded');
assert(!fs.existsSync('comet-render-mode.js'), 'standalone Canvas renderer override file should be removed');

// Sprite reveal animation still avoids large container-scale resampling.
assert(stability.includes('setVisualDisplayDiameter(startDiameter)'), 'sprite reveal must initialize via display diameter');
assert(stability.includes('setVisualDisplayDiameter(tween.getValue())'), 'sprite reveal must tween display diameter');
assert(index.indexOf('comet-sprite-stability.js') > index.indexOf('comet-approach-visuals-v8.js'), 'stability reveal patch must load last');

// Real sprites stay real sprites at large display sizes; procedural fallback is missing-texture only.
assert(!familyPolicy.includes('MAX_SAFE_SPRITE_SCALE'), 'large fixed-LOD sprites must not revert to prototype graphics');
assert(!namedVisuals.includes('MAX_SAFE_NAMED_SCALE'), 'large named sprites must not revert to generic/prototype graphics');
assert(familyPolicy.includes('Only a genuinely missing/bad texture falls back'), 'fallback policy should be missing-texture only');

// PWA mode keeps source sprite pixels simple to reduce iOS transform corruption.
assert(familyPolicy.includes('isStandaloneSafeMode()'), 'standalone safe transform mode missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.tintEnabled) return null'), 'standalone tint disable missing');
assert(familyPolicy.includes('if (isStandaloneSafeMode() || !def.allowRotation) return 0'), 'standalone rotation disable missing');
assert(familyPolicy.includes('!isStandaloneSafeMode() && def.allowFlip'), 'standalone flip disable missing');

// Cache bust the normalized current sprite packs.
for (const [family, variants] of Object.entries({
  atomic: ['atom_01', 'atom_02', 'atom_03'],
  rock: ['rock_01', 'rock_02', 'rock_03'],
  comet: ['comet_01', 'comet_02', 'comet_03']
})) {
  for (const variant of variants) {
    const re = new RegExp(`${variant}:\\s+\\{ family: '${family}',\\s+lods: \\[32, 64\\], version: 3 \\}`);
    assert(re.test(manifest), `${variant} must be cache-busted to version 3`);
  }
}

console.log('iOS sprite rendering regression checks passed');
