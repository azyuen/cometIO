const fs = require('fs');

const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const visuals = fs.readFileSync('comet-visual-config.js', 'utf8');
const identities = fs.readFileSync('comet-identities.js', 'utf8');
const named = fs.readFileSync('comet-named-visuals.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

const variants = [
  'rockyPlanet_01', 'rockyPlanet_02', 'rockyPlanet_mystery_01',
  'planet_mercury', 'planet_venus', 'planet_earth', 'planet_mars'
];

for (const variant of variants) {
  const pattern = new RegExp(`${variant}:\\s*\\{ family: 'rockyPlanet',\\s*lods: \\[32, 64\\], version: 1 \\}`);
  assert(pattern.test(manifest), `${variant} must register 32/64 LODs`);
  assert(fs.existsSync(`assets/sprites/rockyPlanet/${variant}_32.png`), `${variant}_32.png missing`);
  assert(fs.existsSync(`assets/sprites/rockyPlanet/${variant}_64.png`), `${variant}_64.png missing`);
}

assert(visuals.includes("normalVariants: ['rockyPlanet_01', 'rockyPlanet_02']"), 'rocky planets should use the two generic normal variants');
assert(visuals.includes("mysteryVariants: ['rockyPlanet_mystery_01']"), 'rocky planets should use the anonymous mystery variant');

for (const planet of ['mercury', 'venus', 'earth', 'mars']) {
  assert(identities.includes(`id:'planet_${planet}'`), `planet_${planet} identity missing`);
  assert(identities.includes(`spriteVariant:'planet_${planet}'`), `planet_${planet} sprite mapping missing`);
}

assert(named.includes('if (mystery || !object?.identityId || !object?.namedSpriteBase)'), 'named planet art must remain hidden during mystery stage');
assert(index.includes('assets/sprites/sprite-manifest.js?v=6'), 'rocky planet manifest cache bust missing');

console.log('complete rocky planet sprite regression checks passed');
