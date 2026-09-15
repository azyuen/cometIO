const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const state = fs.readFileSync('comet-collection-state-v2.js', 'utf8');
const collection = fs.readFileSync('comet-collection-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(!index.includes('comet-collection-integrity-v1.js'), 'obsolete collection integrity wrapper must not be loaded');
assert(index.includes('comet-collection-state-v2.js?v=1'), 'explicit toggle-map collection authority must replace integrity wrapper');
assert(state.includes("p.choice !== 'ABSORB'"), 'final authority must only register ABSORB outcomes');
assert(state.includes('p.compactGravityReverse'), 'reverse gravity capture must never count as collecting the target');
assert(state.includes("result === 'absorb' || result === 'merge'"), 'only absorb/merge should collect');
assert(state.includes('COMET_COLLECTIBLE_BY_ID?.[id]'), 'collection target must be a real collectible identity');
assert(state.includes('state[id] === true'), 'duplicate collection must be ignored');
assert(state.includes('scene.collectedIdentityIds = ids(scene.uniqueCollectionState)'), 'compatibility IDs must mirror explicit state');
assert(state.includes('scene._devModeActive || scene._labSandboxRun'), 'DEV/LAB must not mutate collection');
assert(collection.includes('showCollection'), 'existing collection catalogue UI should remain available');

console.log('explicit collection integrity regression checks passed');
