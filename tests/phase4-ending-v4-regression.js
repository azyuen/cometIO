const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const cluster=fs.readFileSync(path.join(root,'comet-phase4-cluster-network-v1.js'),'utf8');
const finale=fs.readFileSync(path.join(root,'comet-phase4-finale-v3.js'),'utf8');
const ending=fs.readFileSync(path.join(root,'comet-phase4-ending-v4.js'),'utf8');
const fixes=fs.readFileSync(path.join(root,'comet-phase4-ending-v4-fixes.js'),'utf8');

assert(index.includes('comet-phase4-cluster-network-v1.js?v=2'),'revised cluster visual must be cache-busted');
assert(index.includes('comet-phase4-finale-v3.js?v=2'),'revised five-supercluster finale must be cache-busted');
assert(index.includes('comet-phase4-ending-v4.js?v=1'),'new ending flow must load');
assert(index.includes('comet-phase4-ending-v4-fixes.js?v=3'),'ending state guards must load');
assert(index.indexOf('comet-phase4-ending-v4.js?v=1')>index.indexOf('comet-universe-sprite-v1.js?v=1'),'ending flow must be the late finale override');
assert(index.indexOf('comet-phase4-ending-v4-fixes.js?v=3')>index.indexOf('comet-phase4-ending-v4.js?v=1'),'state guards must load last');

assert(cluster.includes('clusterCloud:true'),'galaxy cluster must use irregular cluster-cloud geometry');
assert(cluster.includes('filamentPlacement:false'),'old arm/filament placement must be disabled');
assert(cluster.includes('sparseRandomLinks:true'),'cluster must use sparse irregular links');
assert(cluster.includes('function clusterSlot'),'cluster galaxies must use scattered positions');
assert(cluster.includes('function sparseLinks'),'cluster links must be nearest-neighbour style rather than radial spokes');
assert(!cluster.includes('const arms=5,arm=index%arms'),'old five-arm spider placement must be removed');

assert(ending.includes("phase4Endpoint:'SUPERCLUSTER'"),'Supercluster must be the Phase 4 endpoint');
assert(ending.includes("'PHASE 4 COMPLETE'"),'reaching Supercluster must show the Phase 4 completion pane');
assert(ending.includes("'FROM GALAXY TO SUPERCLUSTER.'"),'Phase 4 completion range must stop at Supercluster');
assert(ending.includes("'WHAT NEXT?'"),'Phase 4 completion pane must use WHAT NEXT?');
assert(ending.includes('before<SUPERCLUSTER&&Number(this.tierIndex)>=SUPERCLUSTER'),'crossing into Supercluster must trigger Phase 4 completion');
assert(ending.includes('if(this._phase4EpilogueUnlocked)return this.startUniverseFinale()'),'epilogue must begin only after the completion pane');

assert(finale.includes("'BEYOND PHASE 4'"),'five-supercluster sequence must be framed as post-Phase-4');
assert(finale.includes('totalSuperclusters:5'),'epilogue must connect five superclusters');
assert(finale.includes("'FIVE SUPERCLUSTERS CONNECTED'"),'five-connected pause must remain visible');
assert(finale.includes("'YOU ARE NOW THE OBSERVABLE UNIVERSE'"),'five connected superclusters must announce the Observable Universe');
assert(finale.includes("kind:'universe'"),'connected structure must shrink into the dedicated universe object');
assert(finale.includes("'ZOOMING OUT TO THE OBSERVABLE HORIZON…'"),'universe reveal must use horizon language');

assert(ending.includes("'BEYOND THE OBSERVABLE HORIZON…'"),'final encounter must use observable-horizon wording');
assert(ending.includes('const r=40'),'Universe and unknown Atom must use one equal apparent radius');
assert(ending.includes('this._universeSprite=this.drawObject(118,this.Y(345),r'),'Universe must use equal-size encounter radius');
assert(ending.includes('this._finalAtomSprite=this.drawObject(302,this.Y(475),r'),'Atom must use equal-size encounter radius');
assert(ending.includes("this.tweens.add({targets:u,x:cx,y:cy,duration:560,ease:'Cubic.in'})"),'Universe must collide into the shared impact point');
assert(ending.includes("this.tweens.add({targets:a,x:cx,y:cy,duration:560,ease:'Cubic.in'})"),'Atom must collide into the same impact point');
assert(ending.includes("'ONE NEW ATOM'"),'final collision must resolve into one new Atom');

assert(ending.includes("this.state='GAME_COMPLETE'"),'final collision must lead to a true game-complete screen');
assert(ending.includes("'FINAL SCORE'"),'game-complete screen must show final score');
assert(ending.includes("'COLLISION LAB PASSWORD'"),'game-complete screen must show Collision Lab password');
assert(ending.includes("const LAB_PASSCODE='UNIATOM'"),'Collision Lab password must remain UNIATOM');
assert(ending.includes("'CONTINUE AS A NEW ATOM'"),'game-complete screen must allow continuation');
assert(ending.includes("'OPEN COLLISION LAB'"),'full game completion must offer Collision Lab');
assert(ending.includes("'PHS4 LAB PREVIEW • SCORE NOT SAVED'"),'PHS4 must show the same end screen without writing a score');
assert(ending.includes('if(scene._labSandboxRun)return {saved:false,topFive:false,preview:true}'),'LAB ending must remain non-persistent');
assert(fixes.includes('labExitThroughoutEpilogue:true'),'LAB exit must remain available through the epilogue');
assert(fixes.includes('phs4EndingShortcut:true'),'PHS4 must expose a direct ending preview shortcut');
assert(fixes.includes("'ENDING'"),'PHS4 birth screen must expose an ENDING shortcut');
assert(fixes.includes('this.finaleMergeCount=0'),'WHAT NEXT? must begin a clean five-supercluster sequence');

console.log('Phase 4 ending v4 regression checks passed.');