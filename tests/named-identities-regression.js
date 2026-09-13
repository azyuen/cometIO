const fs = require('fs');
const vm = require('vm');

const identitiesSource = fs.readFileSync('comet-identities.js', 'utf8');
const manifestSource = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const runtimeSource = fs.readFileSync('comet-identity-runtime.js', 'utf8');
const namedVisualsSource = fs.readFileSync('comet-named-visuals.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

const context = {};
vm.createContext(context);
vm.runInContext(`${identitiesSource}\nthis.TEST_IDENTITIES = COMET_NAMED_IDENTITIES; this.TEST_POOL = cometIdentityPoolForTier;`, context);
const identities = context.TEST_IDENTITIES;
const pool = context.TEST_POOL;

function assert(ok, message) { if (!ok) throw new Error(message); }

const comets = identities.filter(x => x.scienceClass === 'COMET');
const dwarfs = identities.filter(x => x.gameplayTiers.includes('DWARF PLANET'));
const planets = identities.filter(x => x.status === 'planet');

assert(comets.length === 5, `expected 5 named comets, got ${comets.length}`);
assert(dwarfs.length === 8, `expected 8 dwarf-planet identities, got ${dwarfs.length}`);
assert(planets.length === 8, `expected all 8 planets, got ${planets.length}`);
assert(dwarfs.filter(x => x.status === 'iau-recognized').length === 5, 'five dwarf planets must be flagged IAU-recognized');
assert(dwarfs.filter(x => x.status === 'candidate').length === 3, 'three additional dwarf-planet candidates must be flagged');

const smallComets = pool('SMALL COMET').map(x => x.id).sort();
const largeComets = pool('LARGER COMET').map(x => x.id).sort();
assert(JSON.stringify(smallComets) === JSON.stringify(largeComets), 'Small/Larger Comet must share the same named identity pool');
assert(smallComets.length === 5, 'both comet tiers should have all five identities available');

assert(pool('ROCKY PLANET').length === 4, 'rocky planet pool must contain Mercury, Venus, Earth and Mars');
assert(pool('GAS PLANET').length === 4, 'giant planet gameplay pool must contain Jupiter, Saturn, Uranus and Neptune');
assert(identities.find(x => x.id === 'planet_uranus').scienceClass === 'ICE GIANT', 'Uranus should be scientifically tagged as ice giant');
assert(identities.find(x => x.id === 'planet_neptune').scienceClass === 'ICE GIANT', 'Neptune should be scientifically tagged as ice giant');

for (const identity of identities) {
  assert(manifestSource.includes(`${identity.spriteVariant}:`), `manifest placeholder missing for ${identity.spriteVariant}`);
}

assert(runtimeSource.includes('object.identityId = identity.id'), 'encounter identity is not attached to opponent');
assert(runtimeSource.includes('object.realName = identity.name'), 'revealed realName is not sourced from identity catalogue');
assert(namedVisualsSource.includes('if (mystery || !object?.identityId'), 'named art must remain hidden during mystery stage');
assert(namedVisualsSource.includes('availableNamedTexture'), 'named sprite fallback hook missing');
assert(indexSource.includes('comet-identities.js'), 'identity catalogue not loaded');
assert(indexSource.includes('comet-identity-runtime.js'), 'identity runtime not loaded');
assert(indexSource.includes('comet-named-visuals.js'), 'named visual hook not loaded');

console.log('named identity architecture regression checks passed');
