const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const v2 = fs.readFileSync('comet-save-collection-v2.js', 'utf8');
const refine = fs.readFileSync('comet-gameplay-refine-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-save-collection-v2.js?v=1'), 'save/collection v2 script must still be loaded');
assert(index.includes('comet-gameplay-refine-v1.js?v=1'), 'manual-only checkpoint refinement must be loaded');
assert(index.indexOf('comet-gameplay-refine-v1.js?v=1') > index.indexOf('comet-save-collection-v2.js?v=1'), 'manual-only checkpoint behavior must override v2 autosave behavior');

// Final behavior: one explicit checkpoint only. Silent save calls are ignored and restart/death do not delete it.
assert(refine.includes('if (silent) return true'), 'autosave calls must be disabled');
assert(refine.includes('writeManualSave(checkpointPayload(this))'), 'manual save must own the only checkpoint write');
assert(refine.includes("saveType: 'manual'"), 'checkpoint must identify itself as manual');
assert(refine.includes('resumeEncounter: canResumeEncounter'), 'manual save should preserve the current encounter');
assert(refine.includes('this.other = data.other'), 'manual load should restore the exact saved opponent');
assert(refine.includes('localStorage.removeItem(LEGACY_AUTO_SAVE_KEY)'), 'stale autosave slot should be cleaned up');
assert(!refine.includes('localStorage.removeItem(SAVE_KEY)'), 'new run/game over must preserve the manual checkpoint');
assert(refine.includes('Deliberately do NOT rewrite SAVE_KEY here'), 'load must be read-only');

// Gameplay LOAD becomes COLLECTION while Home keeps its LOAD SAVE button.
assert(v2.includes("label === 'LOAD' && this.state === 'APPROACH'"), 'gameplay LOAD replacement guard missing');
assert(v2.includes("'COLLECTION', C.blue"), 'gameplay collection button missing');
assert(!v2.includes("label === 'LOAD SAVE'"), 'Home LOAD SAVE must not be replaced');

// Collection remains acquired-only, ordered, sprite-based and vertically scrollable.
assert(v2.includes('identities = ids.map'), 'collection should derive rows only from acquired ids');
assert(!v2.includes("'UNKNOWN'"), 'collection must not reveal missing entries as UNKNOWN rows');
assert(v2.includes('objectForIdentity(identity)'), 'collection sprite object builder missing');
assert(v2.includes('this.drawObject(72, y + 47, 31'), 'recognisable collection sprite rendering missing');
assert(v2.includes('index * rowHeight'), 'collection acquisition-order list missing');
assert(v2.includes("hit.on('pointermove'"), 'touch scrolling missing');
assert(v2.includes("this.input.on('wheel'"), 'desktop wheel scrolling missing');
assert(v2.includes('BACK TO GAME'), 'gameplay collection return path missing');

console.log('manual checkpoint/collection regression checks passed');
