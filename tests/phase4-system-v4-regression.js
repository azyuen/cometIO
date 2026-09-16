const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-phase4-system-v4.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('comet-phase4-system-v4.js?v=1'), 'Phase 4 v4 must be loaded');
assert(index.indexOf('comet-phase4-system-v4.js?v=1') > index.indexOf('comet-phase4-system-v3.js?v=1'), 'v4 must load after v3');

assert(source.includes('anchoredDominantFlybys:true'), 'larger system must stay dominant during galaxy flybys');
assert(source.includes('const dominant = opponentDominant ? o : p'), 'galaxy animation must explicitly select the dominant stationary system');
assert(source.includes('parkDominant(scene, dominant'), 'dominant galaxy must be parked centrally');
assert(source.includes('orbitFlyby(scene, mover, dominant'), 'smaller galaxy must perform the flyby/orbit');
assert(source.includes('preservesLowerTierCapture:true'), 'smooth lower-tier capture choreography must be preserved');

assert(source.includes('clusterZoomPass:true'), 'cluster encounters must use dedicated zoom-pass choreography');
assert(source.includes('parkDominant(scene, cluster, cx, cy, 1.42'), 'cluster must zoom and stay central during its pass');
assert(source.includes("title:'CLUSTER STRIPPING'"), 'cluster losses must have distinct result language');
assert(source.includes("title:this.pending.choice==='ABSORB'?'CLUSTER-EDGE CAPTURE':'CLUSTER TIDAL GAIN'"), 'cluster gains must have distinct result language');

assert(source.includes('galaxyJackpot:true'), 'rare whole-small-galaxy jackpot must be enabled');
assert(source.includes('pending.v4GalaxyJackpot = true'), 'successful smaller-galaxy capture must be able to trigger jackpot');
assert(source.includes('smbhCoreFromGalaxy(scene.other)'), 'jackpot must preserve the captured galaxy core as a real member');
assert(source.includes('...members.map(m => cloneMember(m, \'galaxy-jackpot\'))'), 'jackpot must transfer all modelled galaxy members');
assert(source.includes("title:'GALAXY JACKPOT!'"), 'jackpot must be clearly surfaced to the player');

assert(source.includes('TIERS[GALAXY].need = Math.min'), 'Galaxy progression requirement must be reduced');
assert(source.includes('4.35'), 'Galaxy-to-cluster progression target must use the faster tuning');
assert(source.includes('ensureTransferCount(scene, pending, ratio < .72 ? 3 : 2)'), 'successful capture of smaller galaxies must award multiple members');

console.log('Phase 4 v4 flyby/progression regression checks passed.');
