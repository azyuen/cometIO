const fs = require('fs');

const legacyRules = fs.readFileSync('comet-save-score-v1.js', 'utf8');
const refine = fs.readFileSync('comet-gameplay-refine-v1.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(refine.includes('const MANUAL_SAVE_PENALTY = 500'), 'manual save penalty should be substantial');
assert(refine.includes("const MANUAL_SLOT_KEY = 'cometio-manual-checkpoint-v1'"), 'dedicated manual checkpoint key missing');
assert(refine.includes('if (silent) return true'), 'silent/autosave calls must be no-ops');
assert(refine.includes('this.manualSaves = previous.manualSaves + 1'), 'manual save counter increment missing');
assert(refine.includes('this.score = previous.score - MANUAL_SAVE_PENALTY'), 'manual save score deduction missing');
assert(refine.includes('localStorage.setItem(MANUAL_SLOT_KEY, json)'), 'canonical manual checkpoint write missing');
assert(refine.includes('manualSaves: integerOrZero(scene.manualSaves)'), 'save counter must persist in checkpoint');
assert(refine.includes('LOAD never writes either storage slot'), 'load must leave the checkpoint unchanged');
assert(!refine.includes('this.manualLoads += 1'), 'loads must no longer increment a usage counter');
assert(!refine.includes('SUCCESSFUL_LOAD_PENALTY'), 'loads must no longer have a score penalty');
assert(refine.includes('loadPenalty: 0'), 'public save/load rules must report free loads');
assert(refine.includes('localStorage.removeItem(LEGACY_AUTO_SAVE_KEY)'), 'legacy autosave must be removed');
assert(!refine.includes('localStorage.removeItem(MANUAL_SLOT_KEY)'), 'restart/game over must never delete canonical manual checkpoint');
assert(!refine.includes('localStorage.removeItem(SAVE_KEY)'), 'restart/game over must never delete compatibility mirror');

assert(refine.includes('delay: 1900'), 'save confirmation should stay visible longer');
assert(refine.includes('const width = 350'), 'save confirmation should be wide enough for its text');
assert(refine.includes('• SAVES ${saves}`'), 'high-score action line must end with saves count');
assert(refine.includes('164 + i * 116'), 'high-score cards should be shifted below subtitle');
assert(refine.includes('TAP A SCORE TO VIEW ITS COLLECTION'), 'high-score collection subtitle missing');

assert(index.includes('comet-gameplay-refine-v1.js?v=2'), 'gameplay refinement script must be cache-busted');
assert(index.indexOf('comet-gameplay-refine-v1.js?v=2') > index.indexOf('comet-save-collection-v2.js?v=1'), 'manual-only save refinement must load last');
assert(index.includes('comet-save-score-v1.js?v=1'), 'legacy scoring layer remains loaded for backward-compatible score fields');
assert(legacyRules.includes('saves: integerOrZero(this.manualSaves)'), 'legacy high-score schema must still understand saves');

console.log('manual save/high-score regression checks passed');
