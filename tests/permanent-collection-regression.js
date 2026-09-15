const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const collection = fs.readFileSync('comet-permanent-collection-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-permanent-collection-v1.js?v=1'), 'permanent collection authority must be loaded');
const pos = index.indexOf('comet-permanent-collection-v1.js?v=1');
assert(pos > index.indexOf('comet-early-encounters-v1.js?v=1'), 'permanent collection authority must load last');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override permanent collection methods');

assert(collection.includes("const LEDGER_KEY = 'cometio-permanent-collection-v1'"), 'dedicated permanent collection key missing');
assert(collection.includes("result === 'absorb' || result === 'merge'"), 'only successful absorb/merge outcomes should collect');
assert(collection.includes('if (pending.compactGravityReverse) return false'), 'reverse compact capture must not collect the target');
assert(collection.includes('scene._devModeActive || scene._labSandboxRun'), 'DEV/LAB must not mutate permanent collection');
assert(collection.includes('localStorage.setItem(LEDGER_KEY'), 'discoveries must persist immediately to dedicated storage');
assert(collection.includes("'cometio-protected-checkpoint-v2'"), 'existing checkpoint discoveries should migrate into permanent collection');
assert(collection.includes('score?.collection || score?.collectedIdentityIds'), 'legacy high-score discoveries should migrate too');
assert(collection.includes('scene.collectedIdentityIds = [...synced]'), 'live collection count must synchronize immediately');
assert(collection.includes('scene.score = (Number(scene.score) || 0) + UNIQUE_BONUS'), 'first-ever discovery bonus must be awarded exactly once');
assert(collection.includes('this._lastCollectionPickup = { ...pickup }'), 'existing polished result UI must receive the permanent pickup');
assert(collection.includes('syncScene(this);\n    return basePickOpponent.call(this)'), 'opponent generator must exclude permanently collected identities');
assert(collection.includes('if (result !== false) syncScene(this)'), 'LOAD must restore permanent collection after checkpoint state');
assert(collection.includes('saved: {'), 'collection catalogue must ignore stale checkpoint collection snapshot');
assert(collection.includes('updateHomeCount(this)'), 'Home collection counter must use permanent ledger');

console.log('permanent collection regression checks passed');
