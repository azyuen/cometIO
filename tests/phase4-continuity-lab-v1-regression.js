const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const continuity=fs.readFileSync(path.join(root,'comet-phase4-continuity-v1.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'comet-lab-polish-v2.js'),'utf8');
const atoms=fs.readFileSync(path.join(root,'comet-cosmic-sprite-assets-v1.js'),'utf8');

assert(index.includes('comet-cosmic-sprite-assets-v1.js?v=2'),'Atom stability config must be cache-busted');
assert(index.includes('comet-phase4-continuity-v1.js?v=1'),'Phase 4 continuity layer must load');
assert(index.includes('comet-lab-polish-v2.js?v=1'),'LAB polish layer must load');
assert(index.indexOf('comet-phase4-continuity-v1.js?v=1')>index.indexOf('comet-phase4-ending-v4.js?v=1'),'continuity must override the prior ending flow');
assert(index.indexOf('comet-phase4-continuity-v1.js?v=1')<index.indexOf('comet-phase4-ending-v4-fixes.js?v=3'),'ending guards must wrap continuity finale start');
assert(index.indexOf('comet-lab-polish-v2.js?v=1')>index.indexOf('comet-phase4-ending-v4-fixes.js?v=3'),'LAB polish must be final UI/render override');

assert(atoms.includes("family: 'atomic'"),'Atom family must use renderer corruption safeguard');
assert(atoms.includes('stable32Workaround: true'),'stable 32px Atom workaround must remain enabled');
assert(atoms.includes('fixedLods: { mystery: 32, normal: 32 }'),'Atom display must stay on clean 32px source');

assert(continuity.includes('this._phase4AwaitingCompletionCard=true'),'Supercluster evolution must pause on its result screen');
assert(continuity.includes("n.text==='BEGIN FINAL MERGE'||n.text==='NEXT ENCOUNTER'"),'Supercluster result action must be relabelled NEXT');
assert(continuity.includes('if(this._phase4AwaitingCompletionCard&&!this._phase4CardRequestedByNext)return null'),'automatic Phase 4 card must be suppressed until NEXT');
assert(continuity.includes("'WHAT NEXT?'"),'Phase 4 completion card must retain WHAT NEXT?');
assert(continuity.includes('_phase4GalaxySnapshot'),'Galaxy visual continuity snapshot must be retained');
assert(continuity.includes('_phase4ClusterSnapshot'),'Cluster visual continuity snapshot must be retained');
assert(continuity.includes('_phase4SuperclusterSnapshot'),'Supercluster visual continuity snapshot must be retained');
assert(continuity.includes('drawSnapshot(scene,68'),'completion card must render the real Galaxy snapshot');
assert(continuity.includes('drawSnapshot(scene,210'),'completion card must render the real Cluster snapshot');
assert(continuity.includes('drawSnapshot(scene,352'),'completion card must render the real Supercluster snapshot');
assert(continuity.includes('_finalJoinedSuperclusters=[{object:cloneObject(snap.player)'), 'finale piece #1 must be the saved player Supercluster');
assert(continuity.includes('variedIncomingMembers'),'incoming finale Superclusters must vary their member layouts/profiles');
assert(continuity.includes('_finalIncomingVisual.setAngle'),'incoming Superclusters must also vary in orientation');

assert(lab.includes('phase4VisualParity:true'),'LAB must opt into gameplay Phase 4 rendering');
assert(lab.includes('this._devModeActive=false;this.tierIndex=Number(object.tier);this.player=object'),'Galaxy+ LAB objects must be rendered through Phase 4 gameplay context');
assert(lab.includes('containedResultSizing:true'),'LAB result sizing must be constrained');
assert(lab.includes('const max=42,min=7'),'comparison radii must have readable contained bounds');
assert(lab.includes('reliableOrbitalSteppers:true'),'LAB orbital controls must use replacement stable steppers');
assert(lab.includes('removeOldSteppers'),'old +/- controls must be removed before replacements are installed');
assert(lab.includes("scene.toast?.('ORBITALS UNLOCK AT DWARF PLANET'"),'invalid orbital changes must be safely rejected');
assert(lab.includes('experimentOrbitalClamp:true'),'experiment orbitals must be clamped too');
assert(lab.includes('labReturnTopRight:true'),'LAB return buttons must move to the top right on title/finale screens');

console.log('Phase 4 continuity/LAB regression checks passed.');