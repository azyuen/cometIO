const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const dev = fs.readFileSync('comet-dev-lab-v1.js', 'utf8');
const exact = fs.readFileSync('comet-dev-exact-scale-v1.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-dev-lab-v1.js?v=2'), 'dev lab script must be cache-busted');
assert(index.includes('comet-dev-exact-scale-v1.js?v=1'), 'exact DEV scale patch must be loaded');
assert(index.indexOf('comet-dev-exact-scale-v1.js?v=1') > index.indexOf('comet-dev-lab-v1.js?v=2'), 'exact DEV scale patch must load after dev lab');
assert(index.indexOf('comet-dev-lab-v1.js?v=2') > index.indexOf('comet-gameplay-refine-v1.js?v=2'), 'dev lab must load after gameplay refinements');

// Home entry must be PIN-gated with an on-screen numeric keypad.
assert(dev.includes("const DEV_PIN = '8888'"), 'DEV PIN must be configured');
assert(dev.includes("'DEV', C.purple, () => this.showDevPinGate()"), 'Home DEV button must open the PIN gate');
assert(dev.includes("this.state = 'DEV_PIN'"), 'DEV PIN screen state missing');
assert(dev.includes("'ENTER 4-DIGIT CODE'"), 'DEV PIN prompt missing');
assert(dev.includes("'CLEAR'"), 'numpad CLEAR key missing');
assert(dev.includes("'⌫'"), 'numpad backspace key missing');
assert(dev.includes("'INCORRECT CODE'"), 'wrong-PIN feedback missing');
assert(dev.includes("'ACCESS GRANTED'"), 'successful-PIN feedback missing');
assert(dev.includes('const value = digit++'), 'numpad digit handlers must capture each individual digit');
assert(dev.includes('this._devPinEntry === DEV_PIN'), 'PIN validation missing');

// Two native dropdowns.
assert(dev.includes("document.createElement('select')"), 'native object dropdown missing');
assert(dev.includes("document.createElement('optgroup')"), 'object dropdown should be grouped by tier');
assert(dev.includes("fontSize: '16px'"), 'iOS dropdowns must use >=16px font to avoid focus zoom');
assert(dev.includes('COMET_NAMED_IDENTITIES'), 'named identities must be available in dev selectors');
assert(dev.includes('GENERIC ${tier.name}'), 'generic tier variants must be available in dev selectors');

// Representative likely physics.
assert(dev.includes('radiusM: tier.r * randomFactor(.055)'), 'dev object should get a likely radius');
assert(dev.includes('massKg: tier.m * randomFactor(.09)'), 'dev object should get a likely mass');

// DEV must use the exact production reveal-size calculation, not its old normalized comparison.
assert(stability.includes('GameScene.prototype.getRevealDisplayRadii'), 'canonical production reveal sizing helper missing');
assert(exact.includes('this.getRevealDisplayRadii(a, b)'), 'DEV preview must call canonical production sizing helper');
assert(exact.includes('EXACT IN-GAME REVEAL SIZE'), 'DEV should label exact game sizing clearly');
assert(exact.includes('GAME Ø ${Math.round(sizing.playerRadius * 2)} px'), 'DEV should show player display diameter');
assert(exact.includes('GAME Ø ${Math.round(sizing.otherRadius * 2)} px'), 'DEV should show opponent display diameter');
assert(!exact.includes('relativePreviewRadii'), 'exact DEV patch must not use normalized preview sizing');

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

console.log('dev collision lab + PIN + exact scale regression checks passed');
