const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const dev = fs.readFileSync('comet-dev-lab-v1.js', 'utf8');
const password = fs.readFileSync('comet-dev-password-v1.js', 'utf8');
const access = fs.readFileSync('comet-lab-access-ui-v1.js', 'utf8');
const parity = fs.readFileSync('comet-lab-visual-parity-v1.js', 'utf8');
const reward = fs.readFileSync('comet-phase4-dev-reward-v1.js', 'utf8');
const exact = fs.readFileSync('comet-dev-exact-scale-v1.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const compact = fs.readFileSync('comet-compact-gravity-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-dev-lab-v1.js?v=2'), 'dev lab script must be cache-busted');
assert(index.includes('comet-dev-exact-scale-v1.js?v=2'), 'DEV scale behaviour patch must be loaded');
assert(index.includes('comet-compact-gravity-v1.js?v=2'), 'compact gravity mechanics patch must be cache-busted');
assert(index.includes('comet-dev-password-v1.js?v=1'), 'text password override must be loaded');
assert(index.includes('comet-lab-visual-parity-v1.js?v=2'), 'LAB visual parity patch must be cache-busted');
assert(index.includes('comet-lab-access-ui-v1.js?v=1'), 'LAB access UI patch must be loaded');
assert(index.indexOf('comet-lab-access-ui-v1.js?v=1') > index.indexOf('comet-dev-password-v1.js?v=1'), 'LAB access UI must supersede DEV wording');
assert(index.indexOf('comet-lab-visual-parity-v1.js?v=2') > index.indexOf('comet-collection-state-v2.js?v=1'), 'LAB visual parity should load after gameplay/collection wrappers');

assert(password.includes("const DEV_PASSWORD = 'uniatom'"), 'LAB password must remain uniatom');
assert(password.includes("input.type = 'password'"), 'LAB access must use a masked password field');
assert(access.includes("child.setText('LAB ACCESS')"), 'access title must say LAB ACCESS');
assert(access.includes("if (node.tagName === 'BUTTON') node.remove()"), 'redundant UNLOCK DEV button must be removed');
assert(reward.includes("const DEV_PASSCODE = 'uniatom'"), 'Phase 4/LAB completion reward must reveal the same password');

assert(dev.includes("document.createElement('select')"), 'native object dropdown missing');
assert(dev.includes("fontSize: '16px'"), 'iOS dropdowns must use >=16px font to avoid focus zoom');
assert(exact.includes('const DEV_APPROACH_RADIUS = 16'), 'LAB approach size should match live 32px diameter');

// Clean planets can use 64px, but known rainbow/corrupt generic rocky sources must stay quarantined.
assert(parity.includes("'rockyPlanet_01', 'rockyPlanet_02', 'rockyPlanet_mystery_01'"), 'generic rocky corrupt 64px sources must be quarantined');
assert(parity.includes("'dwarf_ceres', 'dwarf_eris', 'planet_saturn', 'planet_neptune'"), 'known named corrupt 64px sources must remain quarantined');
assert(parity.includes("['rockyPlanet', 'gasPlanet'].includes(entry.family)"), 'clean planet family 64px promotion missing');
assert(parity.includes('if (!variant || BAD_64.has(variant)) return false'), 'quarantined variants must never be promoted');
assert(parity.includes('handle.lod = 64'), 'clean large planet visual handle should track 64px LOD');

assert(dev.includes('if (this._devModeActive) return this.showDevResult()'), 'collision LAB must remain isolated from permanent gameplay mutation');
assert(parity.includes('this._labCarryPlayer = clonePlayerForLab'), 'LAB must capture the visible post-action player');
assert(parity.includes('this._devObjectA = carry'), 'NEXT must use the carried player appearance');
assert(parity.includes('this.refreshDevPreview?.(false, false)'), 'carried LAB player must redraw immediately');

assert(stability.includes('GameScene.prototype.getRevealDisplayRadii'), 'canonical production reveal sizing helper missing');
assert(exact.includes('this.getRevealDisplayRadii(this.player, this.other)'), 'LAB result must call canonical reveal sizing');
assert(compact.includes('shouldUseForwardCompactCapture'), 'forward compact capture condition missing');
assert(compact.includes('targetCompactDominates'), 'target gravity-dominance test missing');

assert(dev.includes('return baseChoose.call(this, choice)'), 'lab actions must use the real gameplay choose/reveal pipeline');
assert(dev.includes('NO PROGRESSION, SAVE OR COLLECTION DATA WAS CHANGED'), 'collision lab result should state isolation');

console.log('LAB access + clean planet LOD + rocky quarantine + visual-continuity regression checks passed');
