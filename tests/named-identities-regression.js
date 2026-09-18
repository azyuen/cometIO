const fs = require('fs');
const vm = require('vm');

const identitiesSource = fs.readFileSync('comet-identities.js', 'utf8');
const manifestSource = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');
const runtimeSource = fs.readFileSync('comet-identity-runtime.js', 'utf8');
const namedVisualsSource = fs.readFileSync('comet-named-visuals.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

const context = {};
vm.createContext(context);
vm.runInContext(`${identitiesSource}\nthis.TEST_IDENTITIES = COMET_NAMED_IDENTITIES; this.TEST_COLLECTIBLES = COMET_COLLECTIBLE_IDENTITIES; this.TEST_POOL = cometIdentityPoolForTier; this.TEST_COLLECTIBLE_POOL = cometCollectiblePoolForTier; this.TEST_TIERS = COMET_COLLECTIBLE_TIER_ORDER;`, context);
const identities = context.TEST_IDENTITIES;
const collectibles = context.TEST_COLLECTIBLES;
const pool = context.TEST_POOL;
const collectiblePool = context.TEST_COLLECTIBLE_POOL;
const collectibleTiers = context.TEST_TIERS;

function assert(ok, message) { if (!ok) throw new Error(message); }

const comets = identities.filter(x => x.scienceClass === 'COMET');
const dwarfs = identities.filter(x => x.gameplayTiers.includes('DWARF PLANET'));
const planets = identities.filter(x => x.status === 'planet');

assert(identities.length === 65, `expected 65 named identities including five non-collectible comets, got ${identities.length}`);
assert(collectibles.length === 60, `expected 60 collectible identities from Dwarf Planet onward, got ${collectibles.length}`);
assert(comets.length === 5, `expected 5 named comets, got ${comets.length}`);
assert(comets.every(x => x.collectible === false), 'named comets must remain non-collectible flavour encounters');
assert(dwarfs.length === 8, `expected 8 dwarf-planet identities, got ${dwarfs.length}`);
assert(planets.length === 8, `expected all 8 planets, got ${planets.length}`);
assert(dwarfs.filter(x => x.status === 'iau-recognized').length === 5, 'five dwarf planets must be flagged IAU-recognized');
assert(dwarfs.filter(x => x.status === 'candidate').length === 3, 'three additional dwarf-planet candidates must be flagged');

const smallComets = pool('SMALL COMET').map(x => x.id).sort();
const largeComets = pool('LARGER COMET').map(x => x.id).sort();
assert(JSON.stringify(smallComets) === JSON.stringify(largeComets), 'Small/Larger Comet must share the same named identity pool');
assert(smallComets.length === 5, 'both comet tiers should have all five identities available');
assert(collectiblePool('SMALL COMET').length === 0, 'collection must not begin at comet tiers');
assert(collectiblePool('LARGER COMET').length === 0, 'larger comets must not be collectibles');

const expectedTierCounts = {
  'DWARF PLANET': 8,
  'ROCKY PLANET': 4,
  'GAS PLANET': 4,
  'YELLOW DWARF STAR': 4,
  'BLUE GIANT STAR': 4,
  'RED HYPERGIANT STAR': 4,
  'NEBULA': 12,
  'PULSAR': 12,
  'BLACK HOLE': 4,
  'SUPER MASSIVE BLACK HOLE': 4
};

assert(collectibleTiers.length === 10, 'collection catalogue should contain ten gameplay-tier pages');
for (const [tier, expected] of Object.entries(expectedTierCounts)) {
  assert(collectiblePool(tier).length === expected, `${tier} should have ${expected} collectibles`);
}

assert(identities.find(x => x.id === 'planet_uranus').scienceClass === 'ICE GIANT', 'Uranus should be scientifically tagged as ice giant');
assert(identities.find(x => x.id === 'planet_neptune').scienceClass === 'ICE GIANT', 'Neptune should be scientifically tagged as ice giant');
assert(identities.find(x => x.id === 'redHypergiant_betelgeuse').scienceClass === 'RED SUPERGIANT', 'Betelgeuse science label should remain accurate');
assert(identities.find(x => x.id === 'nebula_helix').scienceClass === 'PLANETARY NEBULA', 'Helix should be tagged as a planetary nebula');
assert(identities.find(x => x.id === 'nebula_horsehead').scienceClass === 'DARK NEBULA', 'Horsehead should be tagged as a dark nebula');
assert(identities.find(x => x.id === 'nebula_ring').designation.includes('M57'), 'Ring Nebula should keep its M57 designation');

for (const identity of identities) {
  assert(manifestSource.includes(`${identity.spriteVariant}:`), `manifest placeholder missing for ${identity.spriteVariant}`);
}

assert(runtimeSource.includes('object.identityId = identity.id'), 'encounter identity is not attached to opponent');
assert(runtimeSource.includes('object.realName = identity.name'), 'revealed realName is not sourced from identity catalogue');
assert(namedVisualsSource.includes('if (mystery || !object?.identityId'), 'named art must remain hidden during mystery stage');
assert(namedVisualsSource.includes('availableNamedTexture'), 'named sprite fallback hook missing');
assert(indexSource.includes('comet-identities.js?v=4'), 'expanded pulsar identity catalogue cache bust missing');
assert(indexSource.includes('comet-identity-runtime.js'), 'identity runtime not loaded');
assert(indexSource.includes('comet-named-visuals.js'), 'named visual hook not loaded');

console.log('expanded named identity architecture regression checks passed');
