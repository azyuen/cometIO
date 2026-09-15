const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const fidelity = fs.readFileSync('comet-result-fidelity-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-result-fidelity-v1.js?v=1'), 'result fidelity patch must be loaded');
const pos = index.indexOf('comet-result-fidelity-v1.js?v=1');
assert(pos > index.indexOf('comet-sprite-continuity-v1.js?v=1'), 'result fidelity patch must load after continuity');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override result fidelity methods');

assert(fidelity.includes('snapshot.cometVisualVariant = handle.variant'), 'comparison snapshot must preserve rendered variant');
assert(fidelity.includes('snapshot.cometVisualRotation = angle'), 'comparison snapshot must preserve rendered rotation');
assert(fidelity.includes('snapshot.cometVisualFlipX = !!image.flipX'), 'comparison snapshot must preserve rendered flip');
assert(fidelity.includes('freezeComparison(this, p, o)'), 'comparison must freeze immediately before action animation');
assert(fidelity.includes('this.preEncounterPlayer = { ...this._resultComparisonPlayer }'), 'result renderer must use frozen player snapshot');
assert(fidelity.includes('this.preEncounterOther = { ...this._resultComparisonOther }'), 'result renderer must use frozen opponent snapshot');

assert(fidelity.includes("scene.pending?.result === 'fragment'"), 'normal fragment animation condition missing');
assert(fidelity.includes('!scene.pending?.highTierGlance'), 'special high-tier grazing animation must remain separate');
assert(fidelity.includes('!scene.pending?.compactGravityReverse'), 'reverse compact capture must remain separate');
assert(fidelity.includes('animateFragmentRicochet'), 'fragment ricochet animation missing');
assert(fidelity.includes("angle: '+=112'"), 'target should visibly ricochet away');
assert(fidelity.includes('These chips come from the PLAYER side'), 'fragment debris should represent player mass loss');
assert(fidelity.includes('material was stripped from you, but the other body ricocheted away'), 'fragment result explanation should match animation');

console.log('result sprite fidelity + fragment ricochet regression checks passed');
