const fs = require('fs');

const identities = fs.readFileSync('comet-identities.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const named = fs.readFileSync('comet-named-visuals.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

const dwarfs = [
  'ceres', 'pluto', 'eris', 'haumea',
  'makemake', 'gonggong', 'quaoar', 'sedna'
];

for (const name of dwarfs) {
  const variant = `dwarf_${name}`;
  assert(identities.includes(`id:'${variant}'`), `${variant} identity missing`);
  assert(identities.includes(`spriteVariant:'${variant}'`), `${variant} sprite identity mapping missing`);

  const manifestPattern = new RegExp(`${variant}:\\s+\\{ family: 'rockyPlanet',\\s+lods: \\[32, 64\\], version: 1 \\}`);
  assert(manifestPattern.test(manifest), `${variant} must register 32/64 rockyPlanet LODs`);

  assert(fs.existsSync(`assets/sprites/rockyPlanet/${variant}_32.png`), `${variant}_32.png missing`);
  assert(fs.existsSync(`assets/sprites/rockyPlanet/${variant}_64.png`), `${variant}_64.png missing`);
}

// Identity artwork stays hidden until scale reveal / non-mystery rendering.
assert(named.includes('if (mystery || !object?.identityId || !object?.namedSpriteBase)'), 'named sprites must not render in mystery stage');

// Named sprites choose LOD from displayed size, not tier or mass.
assert(named.includes('diameterPx <= threshold ? 32 : 64'), 'named sprite LOD must be display-size based');
assert(named.includes('COMET_VISUAL_SETTINGS?.lodThresholds?.smallMaxPx ?? 48'), 'named LOD threshold must share the visual settings threshold');

// Crossing the LOD boundary may swap source texture but must preserve the exact requested size.
assert(named.includes('image.setTexture(nextNamed.key)'), 'dynamic named LOD texture swap missing');
assert(named.includes('setDisplayDiameter(image, nextDiameter)'), 'named LOD swap must reapply exact display diameter');
assert(named.indexOf('image.setTexture(nextNamed.key)') < named.indexOf('setDisplayDiameter(image, nextDiameter)'), 'texture should swap before exact size is reapplied');

// Cache-bust both manifest and named-renderer changes for installed Home Screen mode.
assert(index.includes('assets/sprites/sprite-manifest.js?v=5'), 'dwarf manifest cache bust missing');
assert(index.includes('comet-named-visuals.js?v=4'), 'named visual cache bust missing');

console.log('named dwarf planet sprite regression checks passed');
