const fs = require('fs');

const legacyUi = fs.readFileSync('comet-collection-v1.js', 'utf8');
const state = fs.readFileSync('comet-collection-state-v2.js', 'utf8');
const approach = fs.readFileSync('comet-approach-visuals-v8.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const identities = fs.readFileSync('comet-identities.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(state.includes('const BONUS = 200;'), 'unique collection bonus must remain explicit');
assert(state.includes('for (const identity of COMET_COLLECTIBLE_IDENTITIES) state[identity.id] = false'), 'every collectible must have an explicit toggle');
assert(state.includes("result === 'absorb' || result === 'merge'"), 'collection must register only true absorb/merge results');
assert(state.includes('state[id] = true'), 'successful collection must toggle exact identity');
assert(state.includes('scene.score = (Number(scene.score) || 0) + BONUS'), 'first collection must award score bonus');
assert(state.includes('state[identity.id] !== true'), 'collected identities must be excluded from future rolls');
assert(state.includes('if (!available.length) return makeGeneric(object)'), 'exhausted unique pools must become generic');

assert(state.includes('data.collectionState = clean'), 'checkpoint must persist full collection toggle state');
assert(state.includes('data.collectedIdentityIds = collected'), 'checkpoint must retain compatibility IDs');
assert(state.includes('this.uniqueCollectionState = savedState()'), 'load must restore saved toggle state');
assert(state.includes('this.uniqueCollectionState = blank()'), 'new run must reset collection toggles');

assert(legacyUi.includes('GameScene.prototype.showCollection'), 'existing paged collection UI must remain available');
assert(legacyUi.includes("'COLLECTIONS BEGIN AT DWARF PLANET'"), 'collection UI should communicate phase-two start');
assert(legacyUi.includes('collection,'), 'high-score entries must retain collection snapshots');
assert(legacyUi.includes("'TAP A SCORE TO VIEW ITS COLLECTION'"), 'high-score UI must advertise collection drill-down');

assert(identities.includes('const COMET_COLLECTIBLE_IDENTITIES ='), 'identity catalogue must expose collectible subset');
assert(identities.includes("collectible:false"), 'named comets must remain non-collectible/repeatable');
assert(identities.includes("id:'planet_earth'"), 'Earth collectible identity missing');
assert(manifest.includes('planet_earth:'), 'Earth sprite must be in active manifest');
assert(manifest.includes("lods: [32, 64]"), 'named sprite LODs should remain active');

assert(approach.includes('namedCollectible ? this.other.realName : \'UNKNOWN\''), 'named collectibles should be visibly identified on approach');
assert(approach.includes('this.other, !namedCollectible, false'), 'named collectibles should use real art rather than mystery sprite');

assert(index.includes('comet-collection-v1.js?v=2'), 'legacy collection UI layer must remain loaded');
assert(index.includes('comet-collection-state-v2.js?v=1'), 'final explicit collection authority missing');
assert(index.includes('assets/sprites/sprite-manifest.js?v=8'), 'current sprite manifest cache bust missing');
assert(index.includes('comet-approach-visuals-v8.js?v=9'), 'named approach art cache bust missing');
assert(index.indexOf('comet-collection-state-v2.js?v=1') > index.indexOf('comet-result-fidelity-v1.js?v=1'), 'collection authority must load last');

console.log('explicit collection state + named collectible art regression checks passed');
