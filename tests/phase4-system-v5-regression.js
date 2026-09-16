const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-system-v5.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-system-v5.js?v=1'), 'Phase 4 v5 must be loaded');
assert(index.indexOf('comet-phase4-system-v5.js?v=1') > index.indexOf('comet-phase4-system-v4-timing.js?v=1'), 'v5 must be the final Phase 4 layer');

assert(source.includes("phase4StartsAt:'GALAXY'"), 'Phase 4 must explicitly start at Galaxy');
assert(source.includes('if (scene.tierIndex < GALAXY) scene.tierIndex = GALAXY'), 'SMBH handoff must promote immediately to Galaxy');
assert(source.includes("this.tierIndex=GALAXY"), 'PHS4 LAB sandbox must start at Galaxy');
assert(source.includes("return this.showPhase4SystemBirth()"), 'PHS4 must enter through the real Galaxy-birth tutorial');
assert(source.includes('noSMBHTierRegression:true'), 'Phase 4 must not regress to an SMBH gameplay tier');
assert(source.includes("pending.result='stripped'"), 'catastrophic Phase 4 capture must strip rather than revert to Phase 3');

assert(source.includes("phase4Button(this,73,'CAPTURE'"), 'CAPTURE button must remain present');
assert(source.includes("phase4Button(this,210,'GRAZE'"), 'GRAZE button must remain present');
assert(source.includes("phase4Button(this,347,'AVOID'"), 'AVOID button must remain present');
assert(!source.includes("'BUILD SYSTEM'"), 'Phase 4 action buttons must not show old subtitles');
assert(!source.includes("'STRIP / STEAL'"), 'Phase 4 action buttons must not show old subtitles');
assert(!source.includes("'KEEP DISTANCE'"), 'Phase 4 action buttons must not show old subtitles');

assert(source.includes("'• CAPTURE'"), 'Galaxy-birth tutorial must explain CAPTURE');
assert(source.includes("'• GRAZE'"), 'Galaxy-birth tutorial must explain GRAZE');
assert(source.includes("'• AVOID'"), 'Galaxy-birth tutorial must explain AVOID');
assert(source.includes('BUILD SYSTEM MASS TO BECOME A GALAXY CLUSTER.'), 'opening tutorial must explain the Phase 4 goal');

assert(source.includes('standaloneSMBHSprites:true'), 'standalone named SMBHs must use real sprite rendering');
assert(source.includes("Number(object?.tier) === SMBH"), 'SMBH sprite fix must target the SMBH tier');
assert(source.includes('object?.identityId && object?.namedSpriteBase'), 'SMBH renderer must preserve named identity/sprite metadata');
assert(source.includes('setVisualDisplayDiameter=setDiameter'), 'SMBH sprite must support zoomed LAB/gameplay display sizes');

assert(source.includes('labOrbitalSpacing:true'), 'LAB orbital spacing fix must be enabled');
assert(source.includes("child.text.startsWith('ORBITALS ')"), 'LAB orbital labels must be explicitly repositioned');
assert(source.includes("item.text==='+'||item.text==='−'"), 'LAB +/- controls must be explicitly repositioned');

console.log('Phase 4 v5 Galaxy-start/UI regression checks passed.');
