const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const state = fs.readFileSync('comet-collection-state-v2.js', 'utf8');
const approach = fs.readFileSync('comet-approach-visuals-v8.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-collection-state-v2.js?v=1'), 'explicit collection state must be loaded');
const pos = index.indexOf('comet-collection-state-v2.js?v=1');
assert(pos > index.indexOf('comet-result-fidelity-v1.js?v=1'), 'explicit collection state must load last');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override collection state methods');
assert(!index.includes('comet-run-collection-v1.js'), 'obsolete run collection wrapper should no longer be loaded');
assert(!index.includes('comet-collection-integrity-v1.js'), 'obsolete collection integrity wrapper should no longer be loaded');

assert(state.includes('for (const identity of COMET_COLLECTIBLE_IDENTITIES) state[identity.id] = false'), 'every collectible needs an explicit false toggle');
assert(state.includes("result === 'absorb' || result === 'merge'"), 'only successful absorb/merge should toggle collection');
assert(state.includes('state[id] = true'), 'successful unique pickup must toggle exact identity true');
assert(state.includes('scene.collectedIdentityIds = ids(scene.uniqueCollectionState)'), 'legacy ID list must mirror toggle state');
assert(state.includes('state[identity.id] !== true'), 'opponent selection must exclude collected toggles');
assert(state.includes('if (!available.length) return makeGeneric(object)'), 'exhausted unique tier should become generic instead of repeating');
assert(state.includes('data.collectionState = clean'), 'manual checkpoint must store full boolean map');
assert(state.includes('data.collectedIdentityIds = collected'), 'checkpoint must preserve compatibility ID list');
assert(state.includes('this.uniqueCollectionState = blank()'), 'new run must reset every toggle');
assert(state.includes('this.uniqueCollectionState = savedState()'), 'LOAD must restore saved toggle map');

assert(index.includes('comet-approach-visuals-v8.js?v=9'), 'named-encounter approach update must be cache-busted');
assert(approach.includes('const namedCollectible = !!COMET_COLLECTIBLE_BY_ID?.[this.other?.identityId]'), 'approach must identify collectible named encounters');
assert(approach.includes('this.other, !namedCollectible, false'), 'collectible named encounters must use real art instead of mystery art');
assert(approach.includes("namedCollectible ? this.other.realName : 'UNKNOWN'"), 'named collectible label must show real identity');

console.log('explicit collection toggle state + named approach art regression checks passed');
