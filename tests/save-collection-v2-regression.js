const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const v2 = fs.readFileSync('comet-save-collection-v2.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-save-collection-v2.js?v=1'), 'save/collection v2 script must be loaded');
assert(index.indexOf('comet-save-collection-v2.js?v=1') > index.indexOf('comet-collection-v1.js?v=2'), 'v2 overrides must load after collection v1');

// Manual checkpoints and silent autosaves must be separate.
assert(v2.includes('const AUTO_SAVE_KEY = `${SAVE_KEY}:autosave-v2`'), 'separate autosave slot missing');
assert(v2.includes('const key = manual ? SAVE_KEY : AUTO_SAVE_KEY'), 'manual/auto save routing missing');
assert(v2.includes('const manual = readStorage(SAVE_KEY)'), 'manual checkpoint load missing');
assert(v2.includes('const auto = readStorage(AUTO_SAVE_KEY)'), 'autosave fallback load missing');
assert(v2.includes('localStorage.removeItem(AUTO_SAVE_KEY)'), 'new run must clear autosave as well');
assert(v2.includes('resumeEncounter'), 'manual save should preserve the current encounter');
assert(v2.includes('this.other = data.other'), 'manual load should restore the exact saved opponent');

// Gameplay LOAD becomes COLLECTION while Home keeps its LOAD SAVE button.
assert(v2.includes("label === 'LOAD' && this.state === 'APPROACH'"), 'gameplay LOAD replacement guard missing');
assert(v2.includes("'COLLECTION', C.blue"), 'gameplay collection button missing');
assert(!v2.includes("label === 'LOAD SAVE'"), 'Home LOAD SAVE must not be replaced');

// Collection is acquired-only, ordered, sprite-based and vertically scrollable.
assert(v2.includes('identities = ids.map'), 'collection should derive rows only from acquired ids');
assert(!v2.includes("'UNKNOWN'"), 'collection must not reveal missing entries as UNKNOWN rows');
assert(v2.includes('objectForIdentity(identity)'), 'collection sprite object builder missing');
assert(v2.includes('this.drawObject(72, y + 47, 31'), 'recognisable collection sprite rendering missing');
assert(v2.includes('index * rowHeight'), 'collection acquisition-order list missing');
assert(v2.includes("hit.on('pointermove'"), 'touch scrolling missing');
assert(v2.includes("this.input.on('wheel'"), 'desktop wheel scrolling missing');
assert(v2.includes('BACK TO GAME'), 'gameplay collection return path missing');

console.log('save/collection v2 regression checks passed');
