const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const fix = fs.readFileSync('comet-home-load-fix-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-home-load-fix-v1.js?v=1'), 'Home load fix must be loaded');
assert(index.indexOf('comet-home-load-fix-v1.js?v=1') > index.indexOf('comet-checkpoint-lock-v1.js?v=2'), 'Home load fix must load after checkpoint authority');
assert(fix.includes("findButtonContainer(this, 'LOAD SAVE')"), 'legacy LOAD SAVE button must be located/replaced');
assert(fix.includes('oldLoad.destroy(true)'), 'legacy LOAD SAVE button must be removed');
assert(fix.includes("'LOAD SAVE'"), 'replacement button title missing');
assert(fix.includes('checkpointSubtitle()'), 'checkpoint detail must render inside the button');
assert(fix.includes('scene.ui.add(container)'), 'replacement load button must be added last/on top');
assert(fix.includes("hit.on('pointerdown'"), 'replacement load button needs its own hit area');
assert(fix.includes('GameScene.prototype.load.call(scene)'), 'replacement must call final protected loader directly');
assert(fix.includes('removeStandaloneCheckpointText(this)'), 'old overlapping checkpoint message must be removed');
assert(fix.includes('scene._labSandboxRun = false'), 'Home recovery path must clear stale LAB state');

console.log('direct Home LOAD SAVE button regression checks passed');
