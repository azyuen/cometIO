const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const checkpoint = fs.readFileSync('comet-checkpoint-lock-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-checkpoint-lock-v1.js?v=1'), 'protected checkpoint authority must be loaded');
const checkpointIndex = index.indexOf('comet-checkpoint-lock-v1.js?v=1');
assert(checkpointIndex > index.indexOf('comet-dev-password-v1.js?v=1'), 'checkpoint authority must load last after all gameplay/LAB wrappers');
assert(index.slice(checkpointIndex).indexOf('<script src=') === -1, 'no later script may override protected checkpoint methods');

assert(checkpoint.includes("const PROTECTED_CHECKPOINT_KEY = 'cometio-protected-checkpoint-v2'"), 'dedicated protected checkpoint key missing');
assert(checkpoint.includes('localStorage.setItem(PROTECTED_CHECKPOINT_KEY, json)'), 'manual SAVE must write protected checkpoint');
assert(checkpoint.includes('const protectedData = parse(localStorage.getItem(PROTECTED_CHECKPOINT_KEY))'), 'LOAD must prefer protected checkpoint');
assert(!checkpoint.includes('localStorage.removeItem(PROTECTED_CHECKPOINT_KEY)'), 'no path may delete protected checkpoint');
assert(checkpoint.includes('if (silent) return true'), 'silent/autosave calls must remain no-ops');
assert(checkpoint.includes('GameScene.prototype.clearSave = function'), 'game-over clearSave must be overridden');
assert(checkpoint.includes('localStorage.removeItem(LEGACY_AUTO_KEY)'), 'clearSave may only clean legacy autosave debris');
assert(checkpoint.includes('resumeEncounter: exactEncounter'), 'SAVE must record exact encounter resumability');
assert(checkpoint.includes('this.other = { ...data.other }'), 'LOAD must restore the exact saved opponent');
assert(checkpoint.includes('this.drawEncounter()'), 'exact saved encounter must redraw directly');
assert(checkpoint.includes('LOAD never') || checkpoint.includes('deliberately read-only'), 'LOAD must be documented/read-only');
assert(checkpoint.includes('orbitalCount: whole(scene.orbitalCount)'), 'checkpoint must preserve orbitals');
assert(checkpoint.includes('collectedIdentityIds: collection'), 'checkpoint must preserve collection');
assert(checkpoint.includes('systemCaptures: whole(scene.systemCaptures)'), 'checkpoint must preserve Phase 4 state');
assert(checkpoint.includes('this.runActive = true'), 'LOAD must reactivate the saved run from Home/game over');

console.log('protected manual checkpoint persistence regression checks passed');
