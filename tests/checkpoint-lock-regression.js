const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const checkpoint = fs.readFileSync('comet-checkpoint-lock-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-checkpoint-lock-v1.js?v=2'), 'protected checkpoint authority must be cache-busted');
const checkpointIndex = index.indexOf('comet-checkpoint-lock-v1.js?v=2');
assert(checkpointIndex > index.indexOf('comet-dev-password-v1.js?v=1'), 'checkpoint authority must load last after all gameplay/LAB wrappers');
assert(index.slice(checkpointIndex).indexOf('<script src=') === -1, 'no later script may override protected checkpoint methods');

assert(checkpoint.includes("const PROTECTED_CHECKPOINT_KEY = 'cometio-protected-checkpoint-v2'"), 'dedicated protected checkpoint key missing');
assert(checkpoint.includes("const PROTECTED_BACKUP_KEY = 'cometio-protected-checkpoint-v2-backup'"), 'checkpoint backup key missing');
assert(checkpoint.includes('localStorage.setItem(PROTECTED_CHECKPOINT_KEY, json)'), 'manual SAVE must write primary checkpoint');
assert(checkpoint.includes('localStorage.setItem(PROTECTED_BACKUP_KEY, json)'), 'manual SAVE must write checkpoint backup');
assert(checkpoint.includes('const primary = parse(localStorage.getItem(PROTECTED_CHECKPOINT_KEY))'), 'LOAD must prefer primary checkpoint');
assert(checkpoint.includes('const backup = parse(localStorage.getItem(PROTECTED_BACKUP_KEY))'), 'LOAD must recover from backup');
assert(!checkpoint.includes('localStorage.removeItem(PROTECTED_CHECKPOINT_KEY)'), 'no path may delete protected checkpoint');
assert(!checkpoint.includes('localStorage.removeItem(PROTECTED_BACKUP_KEY)'), 'no path may delete protected backup');
assert(checkpoint.includes('verify.checkpointId !== data.checkpointId'), 'SAVE must verify its own storage write');
assert(checkpoint.includes('if (silent) return true'), 'silent/autosave calls must remain no-ops');
assert(checkpoint.includes('GameScene.prototype.clearSave = function'), 'game-over clearSave must be overridden');
assert(checkpoint.includes('localStorage.removeItem(LEGACY_AUTO_KEY)'), 'clearSave may only clean legacy autosave debris');
assert(checkpoint.includes('resumeEncounter: exactEncounter'), 'SAVE must record exact encounter resumability');
assert(checkpoint.includes('scene.other = { ...data.other }'), 'LOAD must restore the exact saved opponent');
assert(checkpoint.includes("scene.state = 'APPROACH'"), 'LOAD must force encounter state before redraw');
assert(checkpoint.includes('scene.drawEncounter()'), 'exact saved encounter must redraw directly');
assert(checkpoint.includes('clearTemporaryModes(scene)'), 'LOAD must clear stale LAB/DEV state');
assert(checkpoint.includes('orbitalCount: whole(scene.orbitalCount)'), 'checkpoint must preserve orbitals');
assert(checkpoint.includes('collectedIdentityIds: collection'), 'checkpoint must preserve collection');
assert(checkpoint.includes('systemCaptures: whole(scene.systemCaptures)'), 'checkpoint must preserve Phase 4 state');
assert(checkpoint.includes('runActive: true'), 'LOAD must reactivate saved run from Home/game over');
assert(checkpoint.includes("'NO MANUAL CHECKPOINT'"), 'Home/load must clearly report missing checkpoint');
assert(checkpoint.includes('CHECKPOINT • ${tier}'), 'Home must visibly describe the stored checkpoint');

console.log('protected checkpoint backup + verification + recovery regression checks passed');
