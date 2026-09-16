// Phase 4 continuity v1.
// - Do not skip the Supercluster tier-up/result screen.
// - Phase 4 completion art reuses the player's actual Galaxy, Cluster and newly formed Supercluster.
// - The finale starts with that exact Supercluster; incoming Superclusters receive distinct member layouts.
(() => {
  if(!window.CometPhase4EndingV4||!window.CometPhase4||typeof GameScene==='undefined')return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const baseResolve=proto.resolve;
  const baseStartEncounter=proto.startEncounter;
  const baseShowPhaseCompleteCard=proto.showPhaseCompleteCard;
  const baseStartUniverseFinale=proto.startUniverseFinale;
  const baseDrawObject=proto.drawObject;

  function cloneObject(o){
    if(!o)return null;
    const out={};Object.keys(o).forEach(k=>{const v=o[k];if(typeof v!=='function')out[k]=Array.isArray(v)?v.map(x=>typeof x==='object'&&x?{...x}:x):(v&&typeof v==='object'?{...v}:v);});return out;
  }
  function cloneMembers(list){return Array.isArray(list)?list.map(m=>cloneObject(m)).filter(Boolean):[];}
  function snapshot(scene,tier){
    return {tier,player:cloneObject(scene.player),members:cloneMembers(scene.phase4Members),systemCaptures:Number(scene.systemCaptures)||0,createdAt:Date.now()};
  }
  function saveSnapshot(scene,tier){
    if(tier===GALAXY)scene._phase4GalaxySnapshot=snapshot(scene,GALAXY);
    else if(tier===CLUSTER)scene._phase4ClusterSnapshot=snapshot(scene,CLUSTER);
    else if(tier===SUPERCLUSTER)scene._phase4SuperclusterSnapshot=snapshot(scene,SUPERCLUSTER);
  }

  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  function relabelSuperclusterResult(scene){
    walk(scene.ui,n=>{
      if(typeof n?.text!=='string'||typeof n.setText!=='function')return;
      if(n.text==='BEGIN FINAL MERGE'||n.text==='NEXT ENCOUNTER')n.setText('NEXT');
    });
  }

  proto.resolve=function(){
    const before=Number(this.tierIndex)||0;
    if(before>=GALAXY&&before<=SUPERCLUSTER)saveSnapshot(this,before);
    const result=baseResolve.call(this);
    const after=Number(this.tierIndex)||0;
    if(after>=GALAXY&&after<=SUPERCLUSTER)saveSnapshot(this,after);
    if(before<SUPERCLUSTER&&after>=SUPERCLUSTER&&!this._devModeActive){
      // comet-phase4-ending-v4 schedules a card after the resolve. Keep the result screen instead;
      // our showPhaseCompleteCard wrapper ignores that automatic call until NEXT is pressed.
      this._phase4AwaitingCompletionCard=true;
      this._phase4CardRequestedByNext=false;
      relabelSuperclusterResult(this);
    }
    return result;
  };

  proto.startEncounter=function(){
    if(this._phase4AwaitingCompletionCard&&Number(this.tierIndex)>=SUPERCLUSTER&&!this._devModeActive){
      this._phase4AwaitingCompletionCard=false;
      this._phase4CardRequestedByNext=true;
      const r=this.showPhaseCompleteCard(4);
      this._phase4CardRequestedByNext=false;
      return r;
    }
    return baseStartEncounter.call(this);
  };

  function starBackground(scene){
    const g=scene.add.graphics();g.fillStyle(C.bg,1).fillRect(-20,-20,W+40,H+40);
    for(let i=0;i<92;i++){
      const x=Phaser.Math.Between(7,W-7),y=Phaser.Math.Between(scene.Y(6),H-10),s=Phaser.Math.RND.pick([1,1,1,2]);
      g.fillStyle(i%19===0?C.purple:i%13===0?C.cyan:C.star,Phaser.Math.RND.pick([.17,.25,.36,.52,.70])).fillRect(x,y,s,s);
    }
    scene.ui.addAt(g,0);
  }

  function fallbackMembers(tier){
    const profiles=['andromeda','milkyway','whirlpool','pinwheel','triangulum','generic'];
    if(tier===GALAXY){
      const names=['NEBULA','PULSAR','BLACK HOLE','NEBULA','PULSAR','BLACK HOLE'];
      return names.map((name,i)=>{const ti=Math.max(0,TIERS.findIndex(t=>t.name===name)),t=TIERS[ti];return {memberId:`card-g-${i}`,name:t.name,realName:t.name,tier:ti,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,source:'card-fallback'};});
    }
    return Array.from({length:tier===CLUSTER?9:12},(_,i)=>{const t=TIERS[GALAXY];return {memberId:`card-c-${tier}-${i}`,name:'MEMBER GALAXY',realName:'MEMBER GALAXY',tier:GALAXY,radiusM:t.r*(.68+(i%4)*.09),massKg:t.m*(.65+(i%5)*.10),speedMS:t.v,kind:'galaxy',color:i%3===0?C.purple:C.cyan,galaxyProfile:profiles[i%profiles.length],source:'card-fallback'};});
  }

  function fallbackSnapshot(scene,tier){
    const t=TIERS[tier];return {tier,player:{name:t.name,realName:t.name,tier,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:false,phase4System:true},members:fallbackMembers(tier),systemCaptures:0};
  }

  function drawSnapshot(scene,x,y,radius,snap,glow=false){
    const s=snap||fallbackSnapshot(scene,GALAXY);
    const old={tierIndex:scene.tierIndex,player:scene.player,phase4Members:scene.phase4Members,systemCaptures:scene.systemCaptures,dev:scene._devModeActive};
    scene._devModeActive=false;scene.tierIndex=s.tier;scene.player=cloneObject(s.player)||fallbackSnapshot(scene,s.tier).player;scene.phase4Members=cloneMembers(s.members);scene.systemCaptures=s.systemCaptures||scene.phase4Members.length;
    if(scene.player){scene.player.phase4System=true;scene.player.phase4CaptureCount=scene.phase4Members.length;}
    let visual;
    try{visual=baseDrawObject.call(scene,x,y,radius,scene.player,false,glow);}finally{
      scene.tierIndex=old.tierIndex;scene.player=old.player;scene.phase4Members=old.phase4Members;scene.systemCaptures=old.systemCaptures;scene._devModeActive=old.dev;
    }
    return visual;
  }

  function completionButton(scene){
    const c=scene.add.container(W/2,scene.Y(754)),g=scene.add.graphics(),w=330,h=58;
    g.fillStyle(C.cyan,.14).fillRoundedRect(-w/2,-h/2,w,h,8);g.lineStyle(2,C.cyan,.95).strokeRoundedRect(-w/2,-h/2,w,h,8);
    const t=scene.add.text(0,0,'WHAT NEXT?',{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));
    const hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});
    hit.on('pointerdown',()=>{if(scene.state!=='PHASE_COMPLETE_CARD')return;scene.state='PHASE4_EPILOGUE_TRANSITION';scene._phase4EpilogueUnlocked=true;scene._activePhaseCard=null;scene.finaleMergeCount=0;scene._finalJoinedSuperclusters=[];scene.startUniverseFinale();});
    c.add([g,t,hit]);scene.ui.add(c);
  }

  function drawContinuityCard(scene){
    if(!scene._phase4SuperclusterSnapshot)saveSnapshot(scene,SUPERCLUSTER);
    scene.tweens.killAll();scene.clearUI();scene.state='PHASE_COMPLETE_CARD';scene._phase4CompletionShown=true;
    scene._activePhaseCard={phase:4,epilogue:true,final:false,button:'WHAT NEXT?'};
    starBackground(scene);
    scene.addText(18,scene.Y(16),'COMET IO',15,C.white,{bold:true});scene.addText(18,scene.Y(38),'SMALL THINGS GO FAR',6.5,C.cyan,{bold:true});
    const topLine=scene.add.graphics();topLine.lineStyle(1.5,C.cyan,.88).lineBetween(0,scene.Y(59),W,scene.Y(59));scene.ui.add(topLine);
    scene.addText(W/2,scene.Y(91),'PHASE 4 COMPLETE',20,C.green,{ox:.5,bold:true});
    const frame=scene.add.graphics();frame.fillStyle(C.panel,.56).fillRoundedRect(27,scene.Y(126),366,118,9);frame.lineStyle(1.8,C.cyan,.90).strokeRoundedRect(27,scene.Y(126),366,118,9);scene.ui.add(frame);
    scene.addText(W/2,scene.Y(151),'THE COSMIC AGE',27,C.white,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(207),'THE SAME SYSTEM YOU BUILT, SEEN AT THREE COSMIC SCALES.',8.4,C.muted,{ox:.5,bold:true,width:352,align:'center'});

    const galaxy=scene._phase4GalaxySnapshot||fallbackSnapshot(scene,GALAXY);
    const cluster=scene._phase4ClusterSnapshot||fallbackSnapshot(scene,CLUSTER);
    const supercluster=scene._phase4SuperclusterSnapshot||fallbackSnapshot(scene,SUPERCLUSTER);
    const path=scene.add.graphics();path.lineStyle(2,C.cyan,.17).lineBetween(94,scene.Y(418),176,scene.Y(432)).lineBetween(244,scene.Y(432),324,scene.Y(448));scene.ui.add(path);
    drawSnapshot(scene,68,scene.Y(405),31,galaxy,false);
    drawSnapshot(scene,210,scene.Y(430),37,cluster,false);
    drawSnapshot(scene,352,scene.Y(454),43,supercluster,true);
    scene.addText(68,scene.Y(493),'YOUR\nGALAXY',6.6,C.white,{ox:.5,bold:true,align:'center'});
    scene.addText(210,scene.Y(520),'YOUR GALAXY\nCLUSTER',6.4,C.white,{ox:.5,bold:true,align:'center'});
    scene.addText(352,scene.Y(548),'YOUR\nSUPERCLUSTER',6.3,C.white,{ox:.5,bold:true,align:'center'});
    scene.addText(W/2,scene.Y(641),'FROM GALAXY TO SUPERCLUSTER.',8.2,C.muted,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(681),'PHASE 4 ENDS HERE. BUT YOUR SUPERCLUSTER CONTINUES.',9.2,C.white,{ox:.5,bold:true,width:380,align:'center'});
    completionButton(scene);
  }

  proto.showPhaseCompleteCard=function(phase){
    if(Number(phase)!==4)return baseShowPhaseCompleteCard.call(this,phase);
    // Suppress the automatic post-resolve card. The player must see the Supercluster merged/result
    // screen and press NEXT before this card is allowed to appear.
    if(this._phase4AwaitingCompletionCard&&!this._phase4CardRequestedByNext)return null;
    return drawContinuityCard(this);
  };

  const incomingProfiles=['whirlpool','andromeda','pinwheel','triangulum','milkyway','generic'];
  function variedIncomingMembers(list,index){
    const src=cloneMembers(list);if(!src.length)return src;
    const rotated=src.slice(index%src.length).concat(src.slice(0,index%src.length));
    return rotated.map((m,i)=>({...m,galaxyProfile:m.kind==='galaxy'||Number(m.tier)>=GALAXY?incomingProfiles[(i+index*2)%incomingProfiles.length]:m.galaxyProfile,color:(i+index)%4===0?C.purple:(i+index)%3===0?C.cyan:m.color,memberId:`epilogue-${index}-${i}-${Date.now().toString(36)}`}));
  }

  proto.startUniverseFinale=function(){
    // Seed finale piece #1 from the exact Supercluster that just appeared on the completion card.
    if(!Array.isArray(this._finalJoinedSuperclusters)||!this._finalJoinedSuperclusters.length){
      const snap=this._phase4SuperclusterSnapshot||snapshot(this,SUPERCLUSTER);
      this._finalJoinedSuperclusters=[{object:cloneObject(snap.player)||this.player,members:cloneMembers(snap.members),player:true}];
    }
    const originalMembers=this.phase4Members;
    const index=Math.max(1,(this._finalJoinedSuperclusters?.length||1));
    this.phase4Members=variedIncomingMembers(originalMembers,index);
    let result;
    try{result=baseStartUniverseFinale.call(this);}finally{this.phase4Members=originalMembers;}
    // Incoming systems use the same renderer, but distinct member ordering/profile mixes and a
    // different orientation make each one visibly its own supercluster.
    if(this._finalIncomingVisual){
      const angles=[-18,14,31,-29,22];this._finalIncomingVisual.setAngle(angles[index%angles.length]);
    }
    return result;
  };

  window.CometPhase4ContinuityV1=Object.freeze({enabled:true,superclusterResultPause:true,completionUsesRunSnapshots:true,playerSuperclusterPersistsIntoFinale:true,variedIncomingSuperclusters:true});
})();