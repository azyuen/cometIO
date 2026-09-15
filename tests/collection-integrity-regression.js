const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const integrity = fs.readFileSync('comet-collection-integrity-v1.js', 'utf8');
const collection = fs.readFileSync('comet-collection-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-collection-integrity-v1.js?v=1'), 'collection integrity guard must be loaded');
assert(index.indexOf('comet-collection-integrity-v1.js?v=1') > index.indexOf('comet-lab-suite-fixes-v1.js?v=1'), 'collection guard should load after gameplay/LAB wrappers');

assert(integrity.includes("pending.choice !== 'ABSORB'"), 'guard must only register ABSORB outcomes');
assert(integrity.includes('pending.compactGravityReverse'), 'reverse gravity capture must never count as collecting the target');
assert(integrity.includes("type === 'absorb' || type === 'merge' || type === 'clean'"), 'only true absorb/merge outcomes should collect');
assert(integrity.includes('COMET_COLLECTIBLE_BY_ID?.[identityId]'), 'guard must require a collectible named identity');
assert(integrity.includes('if (ids.includes(identityId))'), 'guard must be idempotent with the original collection layer');
assert(integrity.includes('scene.collectedIdentityIds = ids'), 'collected ID must be written to live run state');
assert(integrity.includes('scene.collectionBonusScore = ids.length * UNIQUE_COLLECTION_BONUS'), 'collection bonus state must stay synchronized');
assert(integrity.includes('scene._lastCollectionPickup ='), 'new pickup must still feed result-screen collection messaging');
assert(integrity.includes('scene._devModeActive'), 'DEV/LAB collisions must not mutate collection');

// Original collection implementation remains in place for saves, exclusions, high-score snapshots and UI.
assert(collection.includes('collectedIdentityIds'), 'original collection state must remain active');
assert(collection.includes('COMET_COLLECTIBLE_BY_ID'), 'original collection validation must remain active');

console.log('collection integrity regression checks passed');
