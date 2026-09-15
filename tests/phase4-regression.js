const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-v1.js'), 'utf8');
const tuning = fs.readFileSync(path.join(root, 'comet-phase4-tuning-v1.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-v1.js?v=1'), 'Phase 4 module must be loaded by index.html');
assert(index.includes('comet-phase4-tuning-v1.js?v=1'), 'Phase 4 compatibility tuning must be loaded');
assert(
  index.indexOf('comet-phase4-v1.js?v=1') > index.indexOf('comet-deflect-rewards-v1.js?v=1'),
  'Phase 4 must wrap the final encounter mechanics'
);
assert(
  index.indexOf('comet-phase4-tuning-v1.js?v=1') > index.indexOf('comet-phase4-v1.js?v=1'),
  'Phase 4 compatibility tuning must load after Phase 4'
);

assert(source.includes("name: 'GALAXY'"), 'Phase 4 must add the Galaxy tier');
assert(source.includes("name: 'GALAXY CLUSTER'"), 'Phase 4 must add the Galaxy Cluster tier');
assert(source.includes("name: 'SUPERCLUSTER'"), 'Phase 4 must end normal progression at Supercluster');
assert(source.includes("['SYSTEM MASS', `${pct}%`]"), 'Phase 4 HUD must expose simple System Mass progress');
assert(source.includes("this.choice(73, this.Y(771), 'ABSORB'"), 'Phase 4 must reuse the existing Absorb action');
assert(source.includes("this.choice(210, this.Y(771), 'DEFLECT'"), 'Phase 4 must reuse the existing Deflect action');
assert(source.includes("this.choice(347, this.Y(771), 'AVOID'"), 'Phase 4 must reuse the existing Avoid action');
assert(source.includes("phase4Failure: !success && ratio > 1.55 ? 'captured' : 'tidal-loss'"), 'failed captures must use the captured/tidal-loss outcomes');
assert(source.includes("'CAPTURED — THEN ESCAPED'"), 'larger systems may temporarily capture the player without ending the run');
assert(source.includes("'TIDAL LOSS'"), 'failed Phase 4 absorbs must be able to strip bound material');

assert(source.includes('GameScene.prototype.startUniverseFinale'), 'Supercluster must transition into the final merge sequence');
assert(source.includes("'MERGE'"), 'the finale must use a single Merge action');
assert(source.includes('this.finaleMergeCount >= 3'), 'three merges must complete the four-piece universe');
assert(source.includes("'OBSERVABLE UNIVERSE FORMED'"), 'four superclusters must form the Observable Universe');
assert(source.includes('GameScene.prototype.showUniverseAtomEncounter'), 'the universe must zoom out into the final atom encounter');
assert(source.includes("'CONTINUE AS AN ATOM'"), 'the completed universe must loop into the next universe as an atom');
assert(source.includes('bankUniverseScore(this, completed)'), 'universe completion must bank a high-score attempt');
assert(source.includes('this.universeCount = completed'), 'universe completions must persist as prestige progress');

assert(tuning.includes('const f = p / Math.max(1, SMBH_INDEX)'), 'legacy difficulty must still scale against the original SMBH endpoint');
assert(tuning.includes('idx = clamp(p + gap, 0, SMBH_INDEX)'), 'pre-Phase-4 opponents must remain capped at SMBH');
assert(tuning.includes('preservesLegacyEncounterCurve: true'), 'compatibility layer must advertise preserved legacy balance');
assert(tuning.includes('preservesSmbhSprite: true'), 'Phase 4 must retain the existing SMBH sprite as the nucleus');
assert(tuning.includes('container.addAt(g, 0)'), 'Phase 4 orbital markers must sit behind the existing SMBH sprite');

console.log('Phase 4 regression checks passed.');
