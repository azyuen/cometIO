const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase-intros-v1.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase-intros-v1.js?v=1'), 'phase intro module must be loaded');
assert(index.indexOf('comet-phase-intros-v1.js?v=1') > index.indexOf('comet-phase4-system-v6.js?v=1'), 'phase intros must load after current gameplay/Phase 4 layers');

assert(source.includes("title:'PHASE 1 BEGINS'"), 'Phase 1 opening card must exist');
assert(source.includes("age:'THE AGE OF ACCRETION'"), 'Phase 1 must use Age of Accretion framing');
assert(source.includes("rule:'APPARENT SIZE IS YOUR MAIN CLUE.'"), 'Phase 1 must teach apparent size');

assert(source.includes("title:'PHASE 2 BEGINS'"), 'Phase 2 opening card must exist');
assert(source.includes("age:'THE AGE OF SYSTEMS'"), 'Phase 2 must use Age of Systems framing');
assert(source.includes('Build orbital protection for future dangerous encounters.'), 'Phase 2 must teach orbital protection');
assert(source.includes("rule:'SIZE STILL MATTERS — ORBITALS NOW PROTECT YOU.'"), 'Phase 2 must distinguish size plus orbital mechanics');

assert(source.includes("title:'PHASE 3 BEGINS'"), 'Phase 3 opening card must exist');
assert(source.includes("age:'THE AGE OF GRAVITY'"), 'Phase 3 must use Age of Gravity framing');
assert(source.includes('Compare gravitational strength — not just visible size.'), 'Phase 3 ABSORB instruction must teach gravity rather than visible size');
assert(source.includes("rule:'MASS, DENSITY AND GRAVITY MATTER MORE THAN SIZE.'"), 'Phase 3 must explicitly teach mass/density/gravity');

assert(source.includes('this._pendingPhaseStartIntro=1'), 'START NEW RUN must queue Phase 1 intro');
assert(source.includes('return this.showPhaseStartCard(phase)'), 'first encounter must be intercepted by the queued intro');
assert(source.includes('(config.phase===1 || config.phase===2)'), 'completion transition must intercept Phase 1 and Phase 2 cards');
assert(source.includes('return this.showPhaseStartCard(config.phase+1)'), 'Phase 1 completion must lead to Phase 2 intro and Phase 2 completion to Phase 3 intro');
assert(source.includes('Phase 3 continues through the established flow'), 'Phase 3 completion must retain the existing Phase 4 Galaxy intro flow');
assert(source.includes("phase4UsesGalaxyIntro:true"), 'existing Phase 4 Galaxy intro must remain authoritative');

assert(source.includes("['ABSORB', C.green"), 'all early phase cards must explain ABSORB');
assert(source.includes("['DEFLECT', C.orange"), 'all early phase cards must explain DEFLECT');
assert(source.includes("['AVOID', C.blue"), 'all early phase cards must explain AVOID');
assert(source.includes('phaseObject(scene, phase)'), 'intro must render the actual current player object');

console.log('Phase 1-3 intro regression checks passed.');
