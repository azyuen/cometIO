const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const collection = fs.readFileSync('comet-collection-state-v2.js', 'utf8');
const checkpoint = fs.readFileSync('comet-checkpoint-lock-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-collection-state-v2.js?v=1'), 'explicit collection authority must be loaded');
const pos = index.indexOf('comet-collection-state-v2.js?v=1');
assert(pos > index.indexOf('comet-result-fidelity-v1.js?v=1'), 'collection authority must load last');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override collection methods');
assert(!index.includes('comet-run-collection-v1.js'), 'old run collection wrapper must not be loaded');
assert(!index.includes('comet-permanent-collection-v1.js'), 'permanent ledger must not be loaded');

assert(collection.includes('state[identity.id] = false'), 'new run state must explicitly represent every collectible');
assert(collection.includes("result === 'absorb' || result === 'merge'"), 'only successful absorb/merge should collect');
assert(collection.includes('state[id] = true'), 'successful unique pickup should toggle its state');
assert(collection.includes('scene.score = (Number(scene.score) || 0) + BONUS'), 'new unique pickup should award +200 once');
assert(collection.includes('state[identity.id] !== true'), 'collected identities must be excluded from future rolls');
assert(collection.includes('data.collectionState = clean'), 'SAVE must embed the full toggle map in checkpoint data');
assert(collection.includes('this.uniqueCollectionState = blank()'), 'new run must start with a fresh collection');
assert(collection.includes('this.uniqueCollectionState = savedState()'), 'LOAD must restore the saved collection map');

assert(checkpoint.includes('collectedIdentityIds: collection'), 'legacy checkpoint layer should still preserve compatibility IDs');
assert(!checkpoint.includes("localStorage.removeItem(PROTECTED_CHECKPOINT_KEY)"), 'death/new run must not erase prior manual checkpoint');

console.log('explicit run collection + manual checkpoint regression checks passed');
