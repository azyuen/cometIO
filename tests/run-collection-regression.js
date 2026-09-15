const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const collection = fs.readFileSync('comet-run-collection-v1.js', 'utf8');
const checkpoint = fs.readFileSync('comet-checkpoint-lock-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-run-collection-v1.js?v=1'), 'run collection authority must be loaded');
const pos = index.indexOf('comet-run-collection-v1.js?v=1');
assert(pos > index.indexOf('comet-early-encounters-v1.js?v=1'), 'run collection authority must load last');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override run collection methods');
assert(!index.includes('comet-permanent-collection-v1.js'), 'permanent collection ledger must no longer be loaded');

assert(collection.includes("result === 'absorb' || result === 'merge'"), 'only successful absorb/merge should collect');
assert(collection.includes('this.collectedIdentityIds = []'), 'new run must start a fresh collection');
assert(collection.includes('scene.score = (Number(scene.score) || 0) + UNIQUE_BONUS'), 'new unique pickup should award +200 once');
assert(collection.includes('if (ids.includes(target.id)) return null'), 'duplicate pickup must not award twice in same run');
assert(collection.includes("localStorage.removeItem(STALE_PERMANENT_LEDGER)"), 'obsolete permanent ledger must be cleared');
assert(collection.includes("model: 'run-and-manual-checkpoint'"), 'collection model should be documented');

assert(checkpoint.includes('collectedIdentityIds: collection'), 'SAVE checkpoint must capture current collection');
assert(checkpoint.includes('collectedIdentityIds: collection,'), 'LOAD restore payload must include saved collection');
assert(!checkpoint.includes("localStorage.removeItem(PROTECTED_CHECKPOINT_KEY)"), 'death/new run must not erase prior manual checkpoint');

console.log('run-scoped collection + manual checkpoint regression checks passed');
