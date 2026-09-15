const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-system-v2.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-system-v2.js?v=1'), 'Phase 4 system v2 must be loaded');
assert(index.indexOf('comet-phase4-system-v2.js?v=1') > index.indexOf('comet-lab-access-ui-v1.js?v=1'), 'Phase 4 system v2 must load after existing compatibility/LAB fixes');

assert(source.includes("actions:{ABSORB:'CAPTURE',DEFLECT:'GRAZE',AVOID:'AVOID'}"), 'Phase 4 must expose CAPTURE/GRAZE/AVOID semantics');
assert(source.includes("'ORBITALS',String(scene.phase4Members.length)"), 'Phase 4 HUD must show orbital/member count');
assert(source.includes("'SYSTEM MASS'"), 'Phase 4 HUD must retain system mass progression');
assert(source.includes("'A GALAXY BEGINS'"), 'SMBH transition must show the early-galaxy birth sequence');
assert(source.includes('phase4SeedScore'), 'Phase 3 score must contribute to starting system members');
assert(source.includes('phase4SeedInheritedOrbitals'), 'existing orbitals must contribute to the starting system');
assert(source.includes("TIERS.findIndex(t => t.name === 'NEBULA')"), 'starting system members must begin at Nebula tier or larger');
assert(source.includes('drawSystemArms'), 'player system must use animated Phaser spiral/web structures');
assert(source.includes('addEmbedded'), 'player system must embed existing object sprites');
assert(source.includes('MAX_VISIBLE_MEMBERS = 9'), 'visual members must be capped while the HUD retains the real total');

for (const name of ['ANDROMEDA GALAXY','MILKY WAY','WHIRLPOOL GALAXY','SOMBRERO GALAXY','PINWHEEL GALAXY','TRIANGULUM GALAXY']) {
  assert(source.includes(name), `named galaxy encounter missing: ${name}`);
}
for (const name of ['VIRGO CLUSTER','PERSEUS CLUSTER','COMA CLUSTER']) {
  assert(source.includes(name), `named cluster encounter missing: ${name}`);
}

assert(source.includes("return weightedPick([\n      { w:.34, value:() => galaxyObject"), 'Galaxy Cluster stage must draw from galaxies/clusters only');
assert(source.includes('noSuperclusterEncounters:true'), 'Superclusters must not appear as random encounters');
assert(source.includes("result=success?'capture':'stripped'"), 'CAPTURE must gain a member on success and support stripping failure');
assert(source.includes("result='captured'"), 'larger systems must be able to capture the player system');
assert(source.includes("result=r<steal?'steal':r<steal+lose?'stripped':'clean'"), 'GRAZE must support stealing, losing, or no exchange');
assert(source.includes("title='SYSTEM CAPTURED'"), 'severe capture failure must visibly collapse the system');
assert(source.includes("title=evolved?'SYSTEM EXPANDED!':'CAPTURE SUCCESS'"), 'successful capture must feed system-tier progression');
assert(!source.includes("'MERGE'"), 'normal Phase 4 encounters must not use a merge action');

assert(source.includes('phase4Members:Array.isArray(scene.phase4Members)?scene.phase4Members:[]'), 'Phase 4 members must persist in save data');
assert(source.includes('if (scene._labSandboxRun || scene._devModeActive || scene._devPhase4Test) return;'), 'LAB/DEV tests must not write Phase 4 member data');

console.log('Phase 4 dynamic-system regression checks passed.');
