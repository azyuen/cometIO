const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const sanity = fs.readFileSync('comet-gameplay-sanity-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-gameplay-sanity-v1.js?v=1'), 'gameplay sanity patch must be loaded');
assert(index.indexOf('comet-gameplay-sanity-v1.js?v=1') > index.indexOf('comet-home-load-fix-v1.js?v=1'), 'sanity patch should load last');

assert(sanity.includes('SAVED • -${SAVE_COST} POINTS'), 'SAVE popup must explicitly show point deduction');
assert(sanity.includes("Number(result.gap) === 2 && result.result === 'fragment'"), 'two-tier fragment branch must be reinterpreted');
assert(sanity.includes("title: 'GRAZING ESCAPE'"), 'two-tier survival alternative must be grazing escape');
assert(sanity.includes('larger body stayed intact'), 'grazing result must make clear larger target was not fragmented');
assert(sanity.includes('GLANCE ${Math.round'), 'result odds must label GLANCE rather than FRAG');
assert(sanity.includes("twoTierAbsorbFallback: 'grazing-escape'"), 'sanity export should document two-tier fallback');

assert(sanity.includes('Number(this.player?.tier) === BLUE_GIANT'), 'Blue Giant orbital substitution missing');
assert(sanity.includes('Number(object?.tier) === YELLOW_DWARF'), 'Yellow Dwarf orbital detection missing');
assert(sanity.includes('planetReplacementFor(object)'), 'Blue Giant stellar orbital must be replaced by planet');
assert(sanity.includes("blueGiantOrbitals: 'planets'"), 'sanity export should document Blue Giant planet orbitals');

assert(sanity.includes("TIERS.findIndex(t => t.name === 'DWARF PLANET')"), 'Dwarf Planet boundary missing');
assert(sanity.includes('beforeTier < DWARF_PLANET && afterTier >= DWARF_PLANET'), 'Phase 2 must trigger on entering Dwarf Planet');
assert(sanity.includes('baseShowPhaseCompleteCard.call(this, 1)'), 'Phase 1 completion card must be shown at Dwarf Planet');
assert(sanity.includes("FROM DWARF PLANET TO NEBULA."), 'Phase 2 range label must begin at Dwarf Planet');
assert(sanity.includes('phase2StartTier: DWARF_PLANET'), 'sanity export should document Phase 2 start');

console.log('gameplay sanity regression checks passed');
