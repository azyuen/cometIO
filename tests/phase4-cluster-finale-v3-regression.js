const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const cluster=fs.readFileSync(path.join(root,'comet-phase4-cluster-network-v1.js'),'utf8');
const labels=fs.readFileSync(path.join(root,'comet-phase4-cluster-labels-v1.js'),'utf8');
const finale=fs.readFileSync(path.join(root,'comet-phase4-finale-v3.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert(index.includes('comet-phase4-cluster-network-v1.js?v=1'),'cluster network layer must load');
assert(index.includes('comet-phase4-cluster-labels-v1.js?v=1'),'cluster labels layer must load');
assert(index.includes('comet-phase4-finale-v3.js?v=1'),'final merge loop must load');
assert(index.indexOf('comet-phase4-finale-v3.js?v=1')>index.indexOf('comet-phase4-finale-v2.js?v=1'),'v3 finale must override v2');

assert(cluster.includes("memberScale:'GALAXIES'"),'Galaxy Cluster persistent members must be galaxy-scale');
assert(cluster.includes("source:'cluster-member-galaxy'"),'lower-tier Phase 4 members must be promoted into member galaxies at cluster scale');
assert(cluster.includes('blackHoleCore:hasBlackHoleCore'),'black-hole identity must be retained inside host galaxies');
assert(cluster.includes('filamentSlot'),'member galaxies must be distributed along cluster filaments');
assert(cluster.includes('noOrbitalRotation:true'),'cluster network must not rotate like an orbital plane');
assert(cluster.includes("strokeCircle(0,0,Math.max(2.6,radius*.27))"),'black-hole host galaxies must show a distinct dark/purple core');
assert(labels.includes("n.setText('GALAXIES')"),'cluster HUD must rename ORBITALS to GALAXIES');
assert(labels.includes("replace(/ORBITALS/g,'GALAXIES')"),'cluster result text must use GALAXIES terminology');

assert(finale.includes("lineBetween(0,this.Y(610),W,this.Y(226))"),'Final Phase must reuse the normal diagonal encounter divider');
assert(finale.includes("'action-absorb-phase4'"),'MERGE must use the supplied Capture sprite');
assert(finale.includes("'MERGE'"),'Final Phase must expose MERGE');
assert(!finale.includes("'AVOID',C.blue"),'Final Phase v3 must not expose an Avoid button');
assert(finale.includes("onlyAction:'MERGE'"),'Final Phase capability must declare one action');
assert(finale.includes('this._finalJoinedSuperclusters.push(incoming)'),'each merge must persist the newly joined supercluster');
assert(finale.includes('this.finaleMergeCount=this._finalJoinedSuperclusters.length-1'),'merge progress must follow the persistent joined object');
assert(finale.includes("'THIS CONNECTED STRUCTURE IS NOW YOUR OBJECT.'"),'post-merge screen must explicitly carry the joined structure forward');
assert(finale.includes('totalSuperclusters:5'),'Final Phase must end after five connected superclusters');
assert(finale.includes('layouts[5]'),'five-part player structure must have a persistent final layout');

console.log('Phase 4 cluster network + final merge-loop regression checks passed.');
