// LAB polish v2.
// - Phase cards keep LAB return access at top-right instead of covering headings.
// - Collision/experiment results use contained, readable reveal-scale visuals.
// - Galaxy+ LAB objects use the same Phase 4 system illustrations as gameplay.
// - Collision LAB orbital +/- controls remain reliable across object selection changes.
(() => {
  if(typeof GameScene==='undefined'||!window.CometLabSuite||!window.CometPhase4)return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const ORBITAL_UNLOCK=Math.max(0,TIERS.findIndex(t=>t.name==='DWARF PLANET'));
  const MAX_ORBITALS=6;
  const baseDrawObject=proto.drawObject;
  const baseShowDevLab=proto.showDevLab;
  const baseShowLabExperiment=proto.showLabExperiment;
  const baseRunLabExperiment=proto.runLabExperiment;
  const baseShowPhaseCompleteCard=proto.showPhaseCompleteCard;
  const baseStartUniverseFinale=proto.startUniverseFinale;
  const baseShowJoinedSuperclusterResult=proto.showJoinedSuperclusterResult;
  const baseCompleteUniverseAssembly=proto.completeUniverseAssembly;
  const baseShowUniverseAtomEncounter=proto.showUniverseAtomEncounter;

  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  function clampInt(v,min,max){return Math.max(min,Math.min(max,Math.floor(Number(v)||0)));}
  function orbitalAllowed(object){return Number(object?.tier)>=ORBITAL_UNLOCK;}

  function phase4PreviewMembers(object){
    if(Array.isArray(object?.phase4Members)&&object.phase4Members.length)return object.phase4Members;
    const profiles=['andromeda','milkyway','whirlpool','pinwheel','triangulum','generic'];
    let members=[];
    if(Number(object?.tier)===GALAXY){
      const names=['NEBULA','PULSAR','BLACK HOLE','NEBULA','PULSAR','BLACK HOLE','NEBULA'];
      members=names.map((name,i)=>{const ti=Math.max(0,TIERS.findIndex(t=>t.name===name)),t=TIERS[ti];return {memberId:`lab-g-${i}`,name:t.name,realName:t.name,tier:ti,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,source:'lab-phase4-preview'};});
    }else{
      const count=Number(object?.tier)>=SUPERCLUSTER?12:9,t=TIERS[GALAXY];
      members=Array.from({length:count},(_,i)=>({memberId:`lab-c-${object.tier}-${i}`,name:'MEMBER GALAXY',realName:`MEMBER GALAXY ${i+1}`,tier:GALAXY,radiusM:t.r*(.65+(i%4)*.09),massKg:t.m*(.62+(i%5)*.11),speedMS:t.v,kind:'galaxy',color:i%3===0?C.purple:C.cyan,galaxyProfile:profiles[i%profiles.length],source:'lab-phase4-preview'}));
    }
    object.phase4Members=members;
    return members;
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    if(!this._labPhase4Rendering&&this._devModeActive&&!mystery&&Number(object?.tier)>=GALAXY&&Number(object?.tier)<=SUPERCLUSTER){
      const old={dev:this._devModeActive,tier:this.tierIndex,player:this.player,members:this.phase4Members,captures:this.systemCaptures};
      this._labPhase4Rendering=true;
      this._devModeActive=false;this.tierIndex=Number(object.tier);this.player=object;this.phase4Members=phase4PreviewMembers(object).map(m=>({...m}));this.systemCaptures=this.phase4Members.length;
      object.phase4System=true;object.phase4CaptureCount=this.phase4Members.length;
      try{return baseDrawObject.call(this,x,y,radius,object,false,glow);}finally{
        this._devModeActive=old.dev;this.tierIndex=old.tier;this.player=old.player;this.phase4Members=old.members;this.systemCaptures=old.captures;this._labPhase4Rendering=false;
      }
    }
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  function buttonText(container){
    if(!Array.isArray(container?.list))return null;
    return container.list.find(x=>typeof x?.text==='string')?.text||null;
  }
  function removeOldSteppers(scene){
    const doomed=[];
    walk(scene.ui,n=>{const t=buttonText(n);if((t==='+'||t==='−')&&Number(n.y)>=scene.Y(455)&&Number(n.y)<=scene.Y(525))doomed.push(n);});
    doomed.forEach(n=>{try{n.destroy(true);}catch(e){}});
  }
  function step(scene,side,delta){
    const obj=side==='A'?scene._devObjectA:scene._devObjectB,key=side==='A'?'_labOrbitalsA':'_labOrbitalsB';
    if(!orbitalAllowed(obj)){scene[key]=0;scene.toast?.('ORBITALS UNLOCK AT DWARF PLANET',C.orange);scene._labRefreshPreview?.();return;}
    scene[key]=clampInt((scene[key]||0)+delta,0,MAX_ORBITALS);scene._labRefreshPreview?.();
  }
  function installSteppers(scene){
    removeOldSteppers(scene);
    scene.miniButton(72,scene.Y(491),38,28,'−',C.cyan,()=>step(scene,'A',-1));
    scene.miniButton(138,scene.Y(491),38,28,'+',C.cyan,()=>step(scene,'A',1));
    scene.miniButton(282,scene.Y(491),38,28,'−',C.cyan,()=>step(scene,'B',-1));
    scene.miniButton(348,scene.Y(491),38,28,'+',C.cyan,()=>step(scene,'B',1));
  }

  proto.showDevLab=function(){const r=baseShowDevLab.call(this);if(this.state==='DEV_LAB')installSteppers(this);return r;};

  if(typeof baseRunLabExperiment==='function'){
    proto.runLabExperiment=function(choice){
      this._expOrbitalsA=clampInt(this._expOrbitalsA,0,MAX_ORBITALS);this._expOrbitalsB=clampInt(this._expOrbitalsB,0,MAX_ORBITALS);
      if(this._expObjectA&&!orbitalAllowed(this._expObjectA))this._expOrbitalsA=0;
      if(this._expObjectB&&!orbitalAllowed(this._expObjectB))this._expOrbitalsB=0;
      return baseRunLabExperiment.call(this,choice);
    };
  }

  function readableRadii(a,b){
    const ratio=Math.max(1e-12,Number(b?.radiusM||1)/Math.max(Number(a?.radiusM)||1,1e-300));
    const max=42,min=7;let ar=32,br=ar*ratio;
    if(ratio>=.22&&ratio<=4.5){
      if(br>max){const s=max/br;br=max;ar=Math.max(min,ar*s);}else if(ar>max){const s=max/ar;ar=max;br=Math.max(min,br*s);}
    }else if(ratio>4.5){br=max;ar=min;}else{ar=max;br=min;}
    if(Number(a?.tier)>=GALAXY)ar=Math.min(ar,37);
    if(Number(b?.tier)>=GALAXY)br=Math.min(br,37);
    return {a:Math.max(min,ar),b:Math.max(min,br),ratio};
  }
  function resultTitle(p){
    if(!p)return {title:'RESULT',color:C.cyan};
    if(p.choice==='ABSORB'){
      if(p.result==='absorb'||p.result==='clean'||p.result==='capture')return {title:'ABSORBED',color:C.green};
      if(p.result==='merge')return {title:'MERGED',color:C.cyan};
      if(p.result==='fragment'||p.result==='setback'||p.result==='stripped')return {title:'FRAGMENTED',color:C.orange};
      return {title:'OVERWHELMED',color:C.red};
    }
    if(p.choice==='DEFLECT'){
      if(p.success===false||p.result==='catastrophic')return {title:'DEFLECTION FAILED',color:C.red};
      if(p.result==='rough')return {title:'ROUGH DEFLECTION',color:C.orange};
      return {title:'CLEAN DEFLECTION',color:C.green};
    }
    return p.success===false?{title:'AVOID FAILED',color:C.red}:{title:'AVOIDED',color:C.green};
  }

  proto.showDevResult=function(){
    const p=this.pending,a=this.player,b=this.other,title=resultTitle(p),radii=readableRadii(a,b),exp=!!this._labExperimentResult;
    this.clearUI();this.state='DEV_RESULT';
    this.addText(W/2,this.Y(36),exp?'EXP RESULT':'LAB RESULT',11,C.muted,{ox:.5,bold:true});
    this.addText(W/2,this.Y(74),title.title,18,title.color,{ox:.5,bold:true});
    this.addText(W/2,this.Y(109),p?.choice||'—',9,C.white,{ox:.5,bold:true});
    const panel=this.add.graphics();panel.fillStyle(C.panel,.97).fillRoundedRect(16,this.Y(142),388,486,10);panel.lineStyle(1.5,title.color,.62).strokeRoundedRect(16,this.Y(142),388,486,10);panel.lineStyle(1,C.cyan,.14).lineBetween(W/2,this.Y(168),W/2,this.Y(382));this.ui.add(panel);
    this.drawObject(105,this.Y(285),radii.a,a,false,false);this.drawObject(315,this.Y(285),radii.b,b,false,false);
    this.addText(105,this.Y(360),a.realName||a.name,8.3,C.green,{ox:.5,bold:true,align:'center',width:174});
    this.addText(315,this.Y(360),b.realName||b.name,8.3,C.orange,{ox:.5,bold:true,align:'center',width:174});
    this.addText(W/2,this.Y(397),this.scaleRelation(radii.ratio),8.6,C.cyan,{ox:.5,bold:true,width:360,align:'center'});
    this.addText(34,this.Y(438),'SIZE',7.5,C.muted,{bold:true});this.addText(196,this.Y(438),this.sizeText(a.radiusM),8,C.white,{ox:1,bold:true});this.addText(224,this.Y(438),this.sizeText(b.radiusM),8,C.white,{bold:true});
    this.addText(34,this.Y(474),'MASS',7.5,C.muted,{bold:true});this.addText(196,this.Y(474),this.massText(a.massKg),8,C.white,{ox:1,bold:true});this.addText(224,this.Y(474),this.massText(b.massKg),8,C.white,{bold:true});
    if(p?.labOrbitalsUsed>0)this.addText(W/2,this.Y(525),`A ORBITALS USED ${p.labOrbitalsUsed} • FATAL RISK ${Math.round((p.labBaseFatalChance||0)*100)}% → ${Math.round((p.fatalChance||0)*100)}%`,6.8,C.purple,{ox:.5,bold:true,width:360,align:'center'});
    this.addText(W/2,this.Y(566),'VISUALS ARE FIT TO THIS PANEL; PHYSICAL SCALE IS SHOWN ABOVE.',6.9,C.muted,{ox:.5,bold:true,width:360,align:'center'});
    this.wideButton(W/2,this.Y(682),330,52,'NEXT',C.cyan,()=>this.showDevLab());
    this.wideButton(W/2,this.Y(750),270,42,'BACK HOME',C.muted,()=>this.exitDevLab());
    this._labExperimentRunning=false;
  };

  function moveLabReturnRight(scene){
    if(!scene._labSandboxRun)return;
    walk(scene.ui,n=>{
      if(!Array.isArray(n?.list))return;
      const t=n.list.find(x=>typeof x?.text==='string'&&x.text==='LAB');
      if(t&&Number(n.x)<W/2&&Number(n.y)<=scene.Y(60))n.x=W-48;
    });
  }

  proto.showPhaseCompleteCard=function(phase){const r=baseShowPhaseCompleteCard.call(this,phase);moveLabReturnRight(this);return r;};
  if(typeof baseStartUniverseFinale==='function')proto.startUniverseFinale=function(){const r=baseStartUniverseFinale.call(this);moveLabReturnRight(this);return r;};
  if(typeof baseShowJoinedSuperclusterResult==='function')proto.showJoinedSuperclusterResult=function(){const r=baseShowJoinedSuperclusterResult.call(this);moveLabReturnRight(this);return r;};
  if(typeof baseCompleteUniverseAssembly==='function')proto.completeUniverseAssembly=function(){const r=baseCompleteUniverseAssembly.call(this);moveLabReturnRight(this);return r;};
  if(typeof baseShowUniverseAtomEncounter==='function')proto.showUniverseAtomEncounter=function(){const r=baseShowUniverseAtomEncounter.call(this);moveLabReturnRight(this);return r;};

  window.CometLabPolishV2=Object.freeze({enabled:true,phase4VisualParity:true,containedResultSizing:true,reliableOrbitalSteppers:true,experimentOrbitalClamp:true,labReturnTopRight:true});
})();