const fs = require('fs');

const collection = fs.readFileSync('comet-collection-v1.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const identities = fs.readFileSync('comet-identities.js', 'utf8');
const visuals = fs.readFileSync('comet-visual-config.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(collection.includes('const UNIQUE_COLLECTION_BONUS = 200;'), 'unique collection bonus must remain modest and explicit');
assert(collection.includes('COMET_COLLECTIBLE_IDENTITIES.length'), 'collection total must use collectible identities only');
assert(collection.includes("pending.choice === 'ABSORB'"), 'collection must only register successful absorbs');
assert(collection.includes('identity?.collectible'), 'collection must ignore named non-collectible flavour identities');
assert(collection.includes('!collected.includes(identityId)'), 'collection must only score first-time identities');
assert(collection.includes('this.score = numberOrZero(this.score) + UNIQUE_COLLECTION_BONUS;'), 'first-time collection bonus must affect score');

assert(collection.includes('if (!identity?.collectible) return object;'), 'named comets must remain repeatable');
assert(collection.includes('cometCollectiblePoolForTier(object.name).filter(candidate => !collected.has(candidate.id))'), 'collected identities must be excluded from future collectible encounters');
assert(collection.includes('return stripNamedIdentity(object);'), 'exhausted named pools must fall back to generic encounters');
assert(collection.includes('object.realName = object.name;'), 'generic fallback must not reuse a named tier example');

assert(collection.includes('data.collectedIdentityIds = ids;'), 'save file must persist collection ids');
assert(collection.includes('data.collectionBonusScore = collectionBonusForIds(ids);'), 'save file must persist normalized collection bonus');
assert(collection.includes('data.version = Math.max(6'), 'phase-two collection save schema must advance to v6');
assert(collection.includes('this.collectedIdentityIds = savedIds;'), 'load must restore collection before encounter generation');
assert(collection.includes('function savedCollectionSnapshot()'), 'home must inspect collection without loading the save first');
assert(collection.includes('const saved = !this.runActive ? savedCollectionSnapshot() : null;'), 'fresh-launch home must use saved collection state');

assert(collection.includes('const COLLECTION_TIER_ORDER'), 'collection should have a tier-page order');
assert(collection.includes('const page = clampCollectionPage(options.page);'), 'collection UI should paginate');
assert(collection.includes("'COLLECTIONS BEGIN AT DWARF PLANET'"), 'collection UI should communicate phase-two start');
assert(collection.includes('collection,'), 'high-score entry must snapshot collection');
assert(collection.includes('collectionBonusScore,'), 'high-score entry must snapshot collection bonus');
assert(collection.includes("'TAP A SCORE TO VIEW ITS COLLECTION'"), 'high-score UI must advertise collection drill-down');
assert(collection.includes("hit.on('pointerdown', () => this.showCollection({ score, returnTo, page: 0 }))"), 'high-score cards must open their collection snapshot');
assert(collection.includes('GameScene.prototype.showCollection'), 'collection screen must exist');
assert(collection.includes('COLLECTION ${ids.length}/${TOTAL_UNIQUE_OBJECTS}'), 'home must expose collection count');

assert(identities.includes('const COMET_COLLECTIBLE_IDENTITIES ='), 'identity catalogue must expose collectible subset');
assert(identities.includes("collectible:false"), 'comets must explicitly be non-collectible');
assert(identities.includes("'SUPER MASSIVE BLACK HOLE'"), 'endgame collectible tier must be registered');

for (const prefix of ['yellowDwarf', 'blueGiant', 'redHypergiant']) {
  assert(visuals.includes(`${prefix}_01`), `${prefix} generic visual slot missing`);
  assert(visuals.includes(`${prefix}_mystery_01`), `${prefix} mystery visual slot missing`);
}
for (const variant of ['nebula_02', 'pulsar_02', 'blackHole_02', 'smbh_01', 'smbh_mystery_01']) {
  assert(manifest.includes(`${variant}:`), `${variant} manifest reservation missing`);
}

assert(index.includes('<script src="comet-collection-v1.js?v=2"></script>'), 'collection cache bust missing');
assert(index.includes('<script src="assets/sprites/sprite-manifest.js?v=7"></script>'), 'sprite manifest cache bust missing');
assert(index.indexOf('comet-collection-v1.js?v=2') > index.indexOf('comet-sprite-stability.js?v=3'), 'collection wrapper must load after existing gameplay/UI wrappers');

console.log('phase-two collection regression checks passed');
