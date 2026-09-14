const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const dev = fs.readFileSync('comet-dev-lab-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-dev-lab-v1.js?v=1'), 'dev lab script must be loaded');
assert(index.indexOf('comet-dev-lab-v1.js?v=1') > index.indexOf('comet-gameplay-refine-v1.js?v=2'), 'dev lab must load after gameplay refinements');

// Home entry + two native dropdowns.
assert(dev.includes("'DEV', C.purple"), 'Home DEV button missing');
assert(dev.includes("document.createElement('select')"), 'native object dropdown missing');
assert(dev.includes("document.createElement('optgroup')"), 'object dropdown should be grouped by tier');
assert(dev.includes("fontSize: '16px'"), 'iOS dropdowns must use >=16px font to avoid focus zoom');
assert(dev.includes('COMET_NAMED_IDENTITIES'), 'named identities must be available in dev selectors');
assert(dev.includes('GENERIC ${tier.name}'), 'generic tier variants must be available in dev selectors');

// Representative likely physics + relative-scale preview.
assert(dev.includes('radiusM: tier.r * randomFactor(.055)'), 'dev object should get a likely radius');
assert(dev.includes('massKg: tier.m * randomFactor(.09)'), 'dev object should get a likely mass');
assert(dev.includes('RELATIVE SCALE PREVIEW'), 'relative-scale preview missing');
assert(dev.includes('this.scaleRelation(radii.ratio)'), 'preview should use real scale relationship text');

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

console.log('dev collision lab regression checks passed');
