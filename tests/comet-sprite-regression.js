const fs = require('fs');

const config = fs.readFileSync('comet-visual-config.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const policy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');

function assert(ok, msg) { if (!ok) throw new Error(msg); }

assert(config.includes("'SMALL COMET': { visualFamily: 'comet' }"), 'Small Comet not mapped to comet family');
assert(config.includes("'LARGER COMET': { visualFamily: 'comet' }"), 'Larger Comet not mapped to comet family');
assert(config.includes("sharedVariants: ['comet_01', 'comet_02', 'comet_03']"), 'shared comet variant pool missing');
assert(config.includes("fixedLods: { mystery: 32, normal: 64 }"), 'comet 32/64 LOD config missing');
assert(config.includes('lodByDisplayedSize: true'), 'comet LOD must use displayed size');
assert(config.includes("collisionFamily: 'icy'"), 'comet collision family must be icy');
assert(config.includes('effects: { back: null, front: null }'), 'normal comet effects must not render a tail');
assert(config.includes('rotationStep: 90'), 'pixel-art rotation should be quantized');
assert(config.includes('allowFlip: true'), 'comet horizontal flip should remain enabled');

for (const variant of ['comet_01', 'comet_02', 'comet_03']) {
  assert(manifest.includes(`${variant}:`), `${variant} missing from manifest`);
  assert(manifest.includes("family: 'comet'"), 'comet family manifest registration missing');
}
assert(manifest.match(/comet_0[123]:\s+\{ family: 'comet',\s+lods: \[32, 64\]/g)?.length === 3,
  'all three comet variants must register both 32 and 64 LODs');

assert(policy.includes('selectLod(def, mystery, diameter)'), 'display-size LOD selector missing');
assert(policy.includes('diameter <= COMET_VISUAL_SETTINGS.lodThresholds.smallMaxPx'), 'LOD threshold is not display-size based');
assert(policy.includes('setDisplayDiameter(image, diameter)'), 'sprite display size preservation missing');
assert(policy.includes('MAX_SAFE_SPRITE_SCALE'), 'oversized low-res sprite fallback guard missing');
assert(policy.includes('forceProceduralFallback'), 'missing-asset fallback missing');

console.log('comet sprite regression checks passed');
