const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const fidelity = fs.readFileSync('comet-result-fidelity-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-result-fidelity-v1.js?v=2'), 'result fidelity patch must be cache-busted');
assert(index.indexOf('comet-result-fidelity-v1.js?v=2') > index.indexOf('comet-sprite-continuity-v1.js?v=1'), 'result fidelity patch must load after continuity');

assert(fidelity.includes('snapshot.cometVisualVariant = handle.variant'), 'comparison snapshot must preserve rendered variant');
assert(fidelity.includes('snapshot.cometVisualRotation = angle'), 'comparison snapshot must preserve rendered rotation');
assert(fidelity.includes('snapshot.cometVisualFlipX = !!image.flipX'), 'comparison snapshot must preserve rendered flip');
assert(fidelity.includes('freezeComparison(this, p, o)'), 'comparison must freeze immediately before action animation');
assert(fidelity.includes('this.preEncounterPlayer = { ...this._resultComparisonPlayer }'), 'result renderer must use frozen player snapshot');
assert(fidelity.includes('this.preEncounterOther = { ...this._resultComparisonOther }'), 'result renderer must use frozen opponent snapshot');

assert(fidelity.includes("scene.pending?.result === 'fragment'"), 'normal fragment animation condition missing');
assert(fidelity.includes('!scene.pending?.highTierGlance'), 'special high-tier grazing animation must remain separate');
assert(fidelity.includes('!scene.pending?.compactGravityReverse'), 'reverse compact capture must remain separate');
assert(fidelity.includes('const playerIsSmaller = playerRadius < targetRadius'), 'fragment animation must compare body sizes');
assert(fidelity.includes('if (playerIsSmaller)'), 'smaller-player rebound branch missing');
assert(fidelity.includes('x: -Math.max(34'), 'smaller player should rebound away from larger target');
assert(fidelity.includes('x: W + Math.max(34'), 'smaller target should rebound away from larger player');
assert(fidelity.includes('verticalSign * 46'), 'fragment rebound should use a shallow glancing offset');
assert(fidelity.includes('verticalSign * 28'), 'fragment rebound rotation should remain modest');
assert(!fidelity.includes("angle: '+=112'"), 'old sharp pinball ricochet must be removed');
assert(fidelity.includes('smaller-body-shallow-ricochet'), 'fragment animation model should be documented');

console.log('result sprite fidelity + size-aware fragment ricochet regression checks passed');
