const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-system-v6.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-system-v6.js?v=1'), 'Phase 4 v6 must be loaded');
assert(index.indexOf('comet-phase4-system-v6.js?v=1') > index.indexOf('comet-phase4-system-v5.js?v=1'), 'v6 must load after v5');

assert(source.includes('animateAvoidFlyby'), 'Phase 4 AVOID must use a dedicated flyby animation');
assert(source.includes('const c1x=ox-96'), 'AVOID must bend the player trajectory around the encountered system');
assert(source.includes('targets:o,scale:1.035'), 'encountered system should remain the visual anchor during AVOID');
assert(source.includes("if (scene.pending?.success === false) scene.time.delayedCall(620,()=>strippedOnAvoid"), 'failed AVOID must still visibly strip the exact outgoing member');

assert(source.includes("['PHS2','PHASE 2']"), 'LAB must visibly rename PHS2 to PHASE 2');
assert(source.includes("['PHS3','PHASE 3']"), 'LAB must visibly rename PHS3 to PHASE 3');
assert(source.includes("['PHS4','PHASE 4']"), 'LAB must visibly rename PHS4 to PHASE 4');

assert(source.includes("systemMassUnit:'SOLAR_MASS'"), 'Phase 4 HUD must use a physical mass unit');
assert(source.includes('SOLAR_MASS_KG = 1.98847e30'), 'solar-mass conversion must be explicit');
assert(source.includes("M☉"), 'HUD mass formatter must display solar masses');
assert(source.includes("/^\\d+%$/"), 'v6 must replace the old percentage mass text while leaving tier-progress bar mechanics alone');

assert(source.includes('composedPhase4CompletionArt:true'), 'Phase 4 completion card must use composed Phaser cosmic visuals');
assert(source.includes('spiralGalaxy(scene'), 'completion art must include generated spiral galaxies');
assert(source.includes('galaxyCluster(scene'), 'completion art must include generated galaxy clusters');
assert(source.includes('superclusterPiece(scene'), 'completion art must include generated superclusters');
assert(source.includes('universeGlyph(scene'), 'completion art must include a composed universe glyph');

assert(source.includes('finaleSuperclusters:5'), 'finale must contain five superclusters total');
assert(source.includes('playerSuperclusterIsFirst:true'), 'player supercluster must be the first finale piece');
assert(source.includes('const FINALE_SLOTS=[[0,0],[0,-92],[92,0],[0,92],[-92,0]]'), 'finale must allocate one player centre slot plus four incoming slots');
assert(source.includes('this.finaleMergeCount>=4'), 'four merges must be required after the player supercluster');
assert(source.includes("`${this.finaleMergeCount+1} OF 5 SUPERCLUSTERS`"), 'finale UI must show five-piece progression');
assert(source.includes("'YOUR SUPERCLUSTER JOINS FOUR OTHERS ACROSS THE COSMIC WEB'"), 'finale must explain player-first assembly');
assert(source.includes("'FIVE SUPERCLUSTERS • ONE VISIBLE COSMOS'"), 'completed assembly must reflect all five pieces');

console.log('Phase 4 v6 polish/finale regression checks passed.');
