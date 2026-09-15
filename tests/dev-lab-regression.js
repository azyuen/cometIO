const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const dev = fs.readFileSync('comet-dev-lab-v1.js', 'utf8');
const password = fs.readFileSync('comet-dev-password-v1.js', 'utf8');
const reward = fs.readFileSync('comet-phase4-dev-reward-v1.js', 'utf8');
const exact = fs.readFileSync('comet-dev-exact-scale-v1.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const compact = fs.readFileSync('comet-compact-gravity-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-dev-lab-v1.js?v=2'), 'dev lab script must be cache-busted');
assert(index.includes('comet-dev-exact-scale-v1.js?v=2'), 'DEV scale behaviour patch must be loaded');
assert(index.includes('comet-compact-gravity-v1.js?v=2'), 'compact gravity mechanics patch must be cache-busted');
assert(index.includes('comet-dev-password-v1.js?v=1'), 'text password override must be loaded');
assert(index.indexOf('comet-dev-password-v1.js?v=1') > index.indexOf('comet-lab-suite-fixes-v1.js?v=1'), 'password override must load after LAB wrappers');
assert(index.indexOf('comet-dev-exact-scale-v1.js?v=2') > index.indexOf('comet-dev-lab-v1.js?v=2'), 'DEV scale patch must load after dev lab');
assert(index.indexOf('comet-compact-gravity-v1.js?v=2') > index.indexOf('comet-dev-exact-scale-v1.js?v=2'), 'compact gravity mechanics must load after DEV scale patch');

// Home still calls showDevPinGate dynamically, but the final loaded implementation is a masked
// alphabetic password field. The old numeric keypad remains only as a superseded fallback layer.
assert(dev.includes("'DEV', C.purple, () => this.showDevPinGate()"), 'Home DEV/LAB button must open the access gate');
assert(password.includes("const DEV_PASSWORD = 'uniatom'"), 'DEV password must be uniatom');
assert(password.includes("input.type = 'password'"), 'DEV access must use a masked password field');
assert(password.includes("this.state = 'DEV_PASSWORD'"), 'text password screen state missing');
assert(password.includes("'INCORRECT PASSWORD'"), 'wrong-password feedback missing');
assert(password.includes("'ACCESS GRANTED'"), 'successful-password feedback missing');
assert(password.includes(".toLowerCase() === DEV_PASSWORD"), 'password validation missing');
assert(reward.includes("const DEV_PASSCODE = 'uniatom'"), 'Phase 4/LAB completion reward must reveal the same password');
assert(!reward.includes('PASSCODE 8888'), 'old numeric password must not be advertised');

// Two native dropdowns.
assert(dev.includes("document.createElement('select')"), 'native object dropdown missing');
assert(dev.includes("document.createElement('optgroup')"), 'object dropdown should be grouped by tier');
assert(dev.includes("fontSize: '16px'"), 'iOS dropdowns must use >=16px font to avoid focus zoom');
assert(dev.includes('COMET_NAMED_IDENTITIES'), 'named identities must be available in dev selectors');
assert(dev.includes('GENERIC ${tier.name}'), 'generic tier variants must be available in dev selectors');

// Representative likely physics.
assert(dev.includes('radiusM: tier.r * randomFactor(.055)'), 'dev object should get a likely radius');
assert(dev.includes('massKg: tier.m * randomFactor(.09)'), 'dev object should get a likely mass');

// Selection preview mirrors live APPROACH: same apparent size before the player commits.
assert(exact.includes('const DEV_APPROACH_RADIUS = 16'), 'DEV approach size should match live 32px diameter');
assert(exact.includes('IN-GAME APPROACH SIZE'), 'DEV selector should identify approach sizing');
assert(exact.includes('APPROACH Ø 32 px'), 'DEV selector should show the live approach diameter');

// Post-choice reveal/result uses the exact production PHYSICAL scale.
assert(stability.includes('GameScene.prototype.getRevealDisplayRadii'), 'canonical production reveal sizing helper missing');
assert(stability.includes('GameScene.prototype.getPhysicalDisplayScaleRatio'), 'canonical physical display ratio missing');
assert(stability.includes('this.getPhysicalDisplayScaleRatio(player, other)'), 'reveal must use physical radius relationship');
assert(exact.includes('this.getRevealDisplayRadii(this.player, this.other)'), 'DEV result must call canonical production reveal sizing');

// Compact successful absorbs use gravitational capture instead of a normal impact.
assert(compact.includes('shouldUseForwardCompactCapture'), 'forward compact capture condition missing');
assert(compact.includes("pending.result === 'absorb' || pending.result === 'merge'"), 'forward compact capture should require successful absorb/merge');
assert(compact.includes('animatePulsarCapture'), 'pulsar capture animation missing');
assert(compact.includes('pulsarCaptureBurst'), 'pulsar light-puff effect missing');
assert(compact.includes('animateBlackHoleCapture'), 'black-hole spiral capture missing');
assert(compact.includes('blackHoleLensing'), 'black-hole lensing/accretion effect missing');
assert(compact.includes('setDisplayDiameter(captured, Math.max(1.8'), 'captured black-hole target should shrink toward a tiny dot');

// Finish emphasis must enlarge only the gravity object, never zoom/pan the camera/frame.
assert(compact.includes('emphasizeCompactObject'), 'compact object visual emphasis missing');
assert(compact.includes('this is deliberately NOT a camera zoom'), 'fixed-frame intent should be explicit');
assert(!compact.includes('camera.zoomTo'), 'compact capture must not zoom the camera');
assert(!compact.includes('camera.pan'), 'compact capture must not pan the camera');

// Gravity dominance must reverse a naive size-based absorb when the TARGET is compact.
assert(compact.includes('targetCompactDominates'), 'target gravity-dominance test missing');
assert(compact.includes("choice === 'ABSORB' && targetCompactDominates(this)"), 'reverse ABSORB mechanics missing');
assert(compact.includes('compactGravityReverse: true'), 'reverse compact capture flag missing');
assert(compact.includes('absorbChance: 0'), 'gravity-dominant compact target must not be absorbable by radius alone');
assert(compact.includes("title: 'GRAVITY CAPTURED YOU'"), 'reverse compact fatal result missing');
assert(compact.includes("'TIDALLY FRAGMENTED'"), 'reverse black-hole fragmentation result missing');

// DEFLECT against a compact gravity-dominant target must get its own odds and trajectory treatment.
assert(compact.includes("choice === 'DEFLECT' && targetCompactDominates(this)"), 'compact-target DEFLECT mechanics missing');
assert(compact.includes('compactGravityDeflect: true'), 'compact DEFLECT flag missing');
assert(compact.includes('animateCompactDeflect'), 'compact DEFLECT animation missing');
assert(compact.includes("result === 'catastrophic'"), 'failed compact DEFLECT should feed into capture animation');
assert(compact.includes('tidal forces stripped material away'), 'rough compact DEFLECT explanation missing');

// Real action/reveal/animation pipeline, isolated resolver.
assert(dev.includes('return baseChoose.call(this, choice)'), 'dev actions must use the real gameplay choose/reveal pipeline');
assert(dev.includes("this.choice(73, this.Y(625), 'ABSORB'"), 'Absorb dev action missing');
assert(dev.includes("this.choice(210, this.Y(625), 'DEFLECT'"), 'Deflect dev action missing');
assert(dev.includes("this.choice(347, this.Y(625), 'AVOID'"), 'Avoid dev action missing');
assert(dev.includes('if (this._devModeActive) return this.showDevResult()'), 'dev resolver must intercept permanent gameplay mutation');
assert(dev.includes('NO PROGRESSION, SAVE OR COLLECTION DATA WAS CHANGED'), 'dev result should state isolation');

// Loop + live-run restoration.
assert(dev.includes('copyRunState(this)'), 'dev lab must snapshot an existing run');
assert(dev.includes('restoreRunState(this, snapshot)'), 'dev lab must restore the existing run');
assert(dev.includes("'NEXT', C.cyan, () => this.showDevLab()"), 'NEXT must loop back to selectors');
assert(dev.includes("'BACK HOME'"), 'dev lab must provide a Home exit');

console.log('dev collision lab + uniatom password + bidirectional compact gravity regression checks passed');
