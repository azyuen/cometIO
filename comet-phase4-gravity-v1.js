// Phase 4 gravity mechanics v1: Phase 3-style trajectory + orbital sacrifice for galaxies/clusters.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4) return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const MAX_T=.92,G=6.67430e-11,MIN_CORE_MEMBERS=1;
  const baseStart=proto.startEncounter,basePrompt=proto.drawPrompt,baseChoose=proto.choose,baseOutcome=proto.outcome,baseResult=proto.drawResult,baseBirth=proto.showPhase4SystemBirth,baseDrawHud=proto.drawHud;

  function phase4Tier(s){const t=Number(s?.tierIndex);return t>=GALAXY&&t<SUPERCLUSTER;}
  function labPhase4(s){return s?._labSandboxRun===true&&String(s?._labSandboxPhase||'').toUpperCase()==='PHS4';}
  function devPhase4(s){return s?._devPhase4Test===true&&s?._devModeActive!==true;}
  function active(s){return phase4Tier(s)&&(s?._p4GravityForce===true||labPhase4(s)||devPhase4(s)||!s?._devModeActive);}
  function traj(s){if(!Number.isFinite(Number(s._p4Trajectory)))s._p4Trajectory=0;return clamp(Number(s._p4Trajectory),-MAX_T,MAX_T);}
  function ang(t){return clamp((t+MAX_T)/(MAX_T*2),0,1);}
  function mLabel(a){return a<.34?'LOW':a<.67?'MEDIUM':'HIGH';}
  function tLabel(a){return a<.34?'RADIAL':a>.66?'TANGENTIAL':'OBLIQUE';}
  function members(s){return Array.isArray(s?.phase4Members)?s.phase4Members:[];}
  function maxSac(s){return Math.max(0,members(s).length-MIN_CORE_MEMBERS);}
  function sacCount(s){const n=Math.max(0,Math.floor(Number(s._p4OrbitalSacrificeCount)||0));s._p4OrbitalSacrificeCount=Math.min(n,maxSac(s));return s._p4OrbitalSacrificeCount;}
  function ratio(s){return Math.max(1e-8,Number(s.other?.massKg||1)/Math.max(1,Number(s.player?.massKg||1)));}
  function relV(s,p){const q=Number(p?.relV);if(Number.isFinite(q)&&q>0)return q;if(typeof relativeSpeed==='function'){const v=Number(relativeSpeed(s.player,s.other));if(Number.isFinite(v)&&v>0)return v;}const a=Number(s.player?.speedMS)||0,b=Number(s.other?.speedMS)||0;return Math.max(1,Math.sqrt(a*a+b*b));}
  function escV(s,p){const q=Number(p?.targetEscape);if(Number.isFinite(q)&&q>0)return q;if(typeof escapeVelocity==='function'){const v=Number(escapeVelocity(s.other));if(Number.isFinite(v)&&v>0)return v;}const m=Math.max(1,Number(s.other?.massKg)||1),r=Math.max(1,Number(s.other?.radiusM)||1);return Math.max(1,Math.sqrt(2*G*m/r));}
  function vRatio(s,p){return clamp(relV(s,p)/Math.max(1,escV(s,p)),.05,5);}
  function bind(v){return 1/(1+Math.pow(v/1.05,1.7));}
  function grazeV(v){const x=Math.log(Math.max(.05,v)/1.05);return Math.exp(-(x*x)/(.78*.78));}
  function pAdv(r){return 1/(1+Math.pow(Math.max(.01,r),.72));}
  function protection(n,c){return n?Math.exp(-c*Math.pow(n,.74)):1;}
  function lowMembers(s,n,exclude){exclude=exclude||new Set();return members(s).filter(x=>!exclude.has(x.memberId)).slice().sort((a,b)=>(Number(a.tier)-Number(b.tier))||(Number(a.massKg)-Number(b.massKg))).slice(0,Math.max(0,n)).map(x=>({...x}));}
  function sacrifices(s,n){return lowMembers(s,Math.min(n,maxSac(s)));}
  function incoming(s,n){n=Math.max(0,Math.floor(Number(n)||0));if(!n)return[];const src=Array.isArray(s.other?.phase4Members)?s.other.phase4Members.slice():[];if(!src.length){const o=s.other||{};return[{name:o.realName||o.name,realName:o.realName||o.name,tier:o.tier,radiusM:o.radiusM,massKg:o.massKg,speedMS:o.speedMS,kind:o.kind,color:o.color,galaxyProfile:o.galaxyProfile||null,clusterProfile:o.clusterProfile||null,source:'phase4-gravity-capture'}].slice(0,n);}const out=[];while(src.length&&out.length<n){const i=Math.floor(Math.random()*src.length),m=src.splice(i,1)[0];out.push({...m,source:'phase4-gravity-transfer'});}return out;}
  function losses(s,p,n,sac){const ex=new Set((sac||[]).map(x=>x.memberId)),extra=lowMembers(s,n,ex);p.transferOutMembers=[...(sac||[]),...extra];return extra.length;}
  function snap(s,p){const t=traj(s),a=ang(t),r=ratio(s),vr=vRatio(s,p);return{t,a,r,vr,b:bind(vr),g:Math.exp(-Math.pow((a-.53)/.24,2)),gv:grazeV(vr),pa:pAdv(r)};}
  function resetRisk(p){p.v7FatalCapture=false;p.v7TierRegression=false;p.v7RegressFrom=null;p.v7RegressTo=null;p.v4GalaxyJackpot=false;p.v5PreventSMBHRegression=false;}

  function capture(s,p,x,sac){
    const radial=1-x.a,logMass=Math.max(0,Math.log2(Math.max(1,x.r))),used=sac.length;
    let chance=clamp(.05+.47*radial+.27*x.b+.22*x.pa-.065*logMass,.035,.965);if(used)chance=1-(1-chance)*protection(used,.23);
    p.chance=chance;p.captureChance=chance;p.success=Math.random()<chance;p.transferInMembers=[];p.transferOutMembers=[...sac];
    if(p.success){const peer=x.r>=.62&&x.r<=1.65,n=s.other?.kind==='cluster'?1:peer?2:x.r<.55?3:2;p.result='capture';p.transferInMembers=incoming(s,n);p.phase4Failure=null;p.p4MajorMerger=peer&&x.a<.46&&x.vr<1.45;return;}
    let fatal=0;if(x.r>1.05){const threat=clamp(Math.log2(x.r)/2.6,0,1);fatal=clamp((.055+.23*threat+.14*radial+.11*x.b)*protection(used,.60),.01,.78);}else fatal=clamp(.012+.025*radial,.008,.05);
    p.fatalChance=fatal;p.v7FatalChance=fatal;
    if(Math.random()<fatal){p.result='captured';p.v7FatalCapture=true;p.phase4Failure='captured';losses(s,p,Math.max(1,members(s).length-sac.length),sac);return;}
    p.result='stripped';p.phase4Failure='tidal-loss';losses(s,p,x.r>2.5?2:1,sac);
  }

  function graze(s,p,x,sac){
    const used=sac.length,interaction=clamp(.14+.64*x.g+.20*x.gv,.10,.96),dom=clamp((Math.log2(x.r)+2.1)/4.2,0,1),radHaz=Math.pow(1-x.a,2)*(.12+.25*dom);
    let steal=interaction*clamp(.64-.48*dom,.10,.62),strip=(interaction*clamp(.17+.52*dom,.10,.72)+radHaz)*protection(used,.58);if(used)steal*=1+Math.min(.18,used*.045);
    let clean=Math.max(.08,1-Math.min(.90,steal+strip)),total=steal+strip+clean;steal/=total;strip/=total;clean/=total;
    const roll=Math.random();p.transferInMembers=[];p.transferOutMembers=[...sac];p.cleanChance=clean;p.stealChance=steal;p.stripChance=strip;p.chance=1-strip;
    if(roll<steal){p.result='steal';p.success=true;p.amount=interaction>.78&&s.other?.kind!=='cluster'?2:1;p.transferInMembers=incoming(s,p.amount);p.v7GrazeSeverity=0;return;}
    if(roll<steal+strip){p.result='stripped';p.success=false;const sev=clamp((.20+dom*.50+radHaz*.70+(1-x.gv)*.12)*protection(used,.46),0,1);p.v7GrazeSeverity=sev;losses(s,p,sev>.72?2:1,sac);if(s.tierIndex>=CLUSTER&&sev>.58&&Math.random()<clamp((sev-.55)*.72,0,.42)){p.v7TierRegression=true;p.v7RegressFrom=s.tierIndex;p.v7RegressTo=GALAXY;}return;}
    p.result='clean';p.success=true;p.v7GrazeSeverity=0;
  }

  function avoid(s,p,x,sac){
    const used=sac.length,massPenalty=.13*clamp(Math.log2(Math.max(1,x.r))/3,0,1),speedBonus=.22*clamp((x.vr-.40)/1.45,0,1);
    let chance=clamp(.28+.54*x.a+speedBonus-massPenalty,.16,.992);if(used)chance=1-(1-chance)*protection(used,.31);
    p.chance=chance;p.v7AvoidChance=chance;p.fatalChance=1-chance;p.transferInMembers=[];p.transferOutMembers=[...sac];p.success=Math.random()<chance;p.result=p.success?'clean':'stripped';if(!p.success)losses(s,p,x.r>3&&used===0?2:1,sac);
  }

  proto.startEncounter=function(...args){
    if(labPhase4(this)||devPhase4(this))this._p4GravityForce=true;
    if(active(this)||Number(this.tierIndex)===GALAXY){this._p4Trajectory=0;this._p4OrbitalSacrificeCount=0;}
    return baseStart.apply(this,args);
  };

  function sacrificeUI(scene) {
    const available=maxSac(scene);
    const selected=sacCount(scene);
    const cx=101,cy=scene.Y(617),w=178,h=32;
    const c=scene.add.container(cx,cy),g=scene.add.graphics();
    g.fillStyle(C.panel,.96).fillRoundedRect(-w/2,-h/2,w,h,5);
    g.lineStyle(1.15,selected?C.orange:C.cyan,.78).strokeRoundedRect(-w/2,-h/2,w,h,5);
    const label=scene.add.text(-48,-7,'ORBITAL SACRIFICE',{fontFamily:FONT,fontSize:'6.2px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5);
    const count=scene.add.text(0,7,`${selected} / ${available}`,{fontFamily:FONT,fontSize:'8.8px',fontStyle:'bold',color:selected?'#ff9d3d':'#f7fbff'}).setOrigin(.5);
    const minusBg=scene.add.rectangle(-69,6,28,24,0xffffff,.001).setInteractive({useHandCursor:true});
    const plusBg=scene.add.rectangle(69,6,28,24,0xffffff,.001).setInteractive({useHandCursor:true});
    const minus=scene.add.text(-69,6,'−',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected?'#20d9ff':'#526f7b'}).setOrigin(.5);
    const plus=scene.add.text(69,6,'+',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected<available?'#20d9ff':'#526f7b'}).setOrigin(.5);
    minusBg.on('pointerdown',()=>{if(sacCount(scene)<=0)return;scene._p4OrbitalSacrificeCount=Math.max(0,sacCount(scene)-1);scene.drawEncounter();});
    plusBg.on('pointerdown',()=>{if(sacCount(scene)>=maxSac(scene))return;scene._p4OrbitalSacrificeCount=Math.min(maxSac(scene),sacCount(scene)+1);scene.drawEncounter();});
    c.add([g,label,count,minusBg,plusBg,minus,plus]);scene.ui.add(c);
  }

  function trajectoryUI(scene) {
    const panelTop=scene.Y(646),panelHeight=60;
    const pg=scene.add.graphics();
    pg.fillStyle(C.panel,.97).fillRoundedRect(15,panelTop,390,panelHeight,7);
    pg.lineStyle(1.5,C.cyan,.82).strokeRoundedRect(15,panelTop,390,panelHeight,7);scene.ui.add(pg);

    const y=scene.Y(677),x0=74,x1=346,width=x1-x0;
    let t=traj(scene),a=ang(t);
    scene.addText(W/2,scene.Y(651),'TRAJECTORY',7.6,C.cyan,{ox:.5,bold:true});
    scene.addText(x0,scene.Y(663),'RADIAL',7.1,C.orange,{ox:.5,bold:true});
    scene.addText(x1,scene.Y(663),'TANGENTIAL',7.1,C.green,{ox:.5,bold:true});

    const track=scene.add.graphics();track.lineStyle(6,0x183248,1).lineBetween(x0,y,x1,y);track.lineStyle(2.5,C.cyan,.7).lineBetween(x0,y,x1,y);scene.ui.add(track);
    const thumb=scene.add.circle(x0+a*width,y,8,C.white,1).setStrokeStyle(2,C.cyan,1);scene.ui.add(thumb);
    const momentumText=scene.addText(W/2,scene.Y(693),'',6.6,C.white,{ox:.5,bold:true});

    function paint(value){
      scene._p4Trajectory=clamp(value,-MAX_T,MAX_T);t=traj(scene);a=ang(t);thumb.x=x0+a*width;
      const momentum=a<.34?'LOW':a<.67?'MEDIUM':'HIGH';momentumText.setText(`ANGULAR MOMENTUM: ${momentum}`);
      momentumText.setColor?.(a>.66?'#25f29a':a<.34?'#ff9d3d':'#f7fbff');
    }
    paint(t);
    const hit=scene.add.rectangle(W/2,y,width+34,34,0xffffff,.001).setInteractive({useHandCursor:true});scene.ui.add(hit);
    let dragging=false;const fromPointer=p=>((clamp(p.x,x0,x1)-x0)/width*2-1)*MAX_T;
    hit.on('pointerdown',p=>{dragging=true;paint(fromPointer(p));});
    hit.on('pointermove',p=>{if(dragging&&p.isDown)paint(fromPointer(p));});
    const finish=p=>{if(!dragging)return;dragging=false;if(p)paint(fromPointer(p));scene.drawEncounter();};
    hit.on('pointerup',finish);hit.on('pointerout',p=>{if(dragging&&!p.isDown)finish(p);});
  }

  function button(s,x,label,color,canonical,key){const y=s.Y(786),w=122,h=96,c=s.add.container(x,y),g=s.add.graphics();g.fillStyle(color,.17).fillRoundedRect(-w/2,-h/2,w,h,7);g.lineStyle(3,color,.95).strokeRoundedRect(-w/2,-h/2,w,h,7);let icon;if(s.textures?.exists(key))icon=s.add.image(0,-16,key).setDisplaySize(54,54);else{icon=s.add.graphics();icon.fillStyle(color,.9).fillCircle(0,-16,14);}const txt=s.add.text(0,27,label,{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);if(txt.setResolution)txt.setResolution(Math.min(window.devicePixelRatio||1,3));const hit=s.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',()=>s.choose(canonical));c.add([g,icon,txt,hit]);s.ui.add(c);}

  proto.drawHud=function(controls=false){
    const result=baseDrawHud.call(this,controls);
    if(!active(this)||!this.other)return result;
    const cardY=controls?SAFE_TOP+42:SAFE_TOP+18;
    const speedCardX=10+(96.25+5)+96.25/2;
    const vr=vRatio(this);
    this.addText(speedCardX,cardY+61,`REL ${vr.toFixed(vr>=2?1:2)} × Vesc`,5.4,C.cyan,{ox:.5,bold:true,width:88,align:'center'});
    return result;
  };

  proto.drawPrompt=function(...args){if(!active(this))return basePrompt.apply(this,args);sacrificeUI(this);trajectoryUI(this);button(this,73,'CAPTURE',C.green,'ABSORB','action-absorb-phase4');button(this,210,'GRAZE',C.orange,'DEFLECT','action-deflect-phase4');button(this,347,'AVOID',C.blue,'AVOID','action-avoid-phase4');};
  proto.outcome=function(choice){const p=baseOutcome.call(this,choice);if(!active(this)||!p)return p;resetRisk(p);const x=snap(this,p),sac=sacrifices(this,sacCount(this));p.p4GravityV1=true;p.phase4Trajectory=x.t;p.angularMomentum=x.a;p.trajectoryLabel=tLabel(x.a);p.p4VelocityRatio=x.vr;p.massRatio=x.r;p.v4MassRatio=x.r;p.relV=relV(this,p);p.targetEscape=escV(this,p);p.p4OrbitalSacrificeCount=sac.length;p.p4SacrificedMemberIds=sac.map(m=>m.memberId);p.v7RiskReward=true;if(choice==='ABSORB')capture(this,p,x,sac);else if(choice==='DEFLECT')graze(this,p,x,sac);else avoid(this,p,x,sac);return p;};
  proto.choose=function(choice){if(!active(this)||this.state!=='APPROACH')return baseChoose.call(this,choice);this.pending=this.outcome(choice);this.state='PHASE4_REVEAL';this.tweens.killAll();this.reveal(choice);};
  proto.drawResult=function(result){const r=this.pending;if(r?.p4GravityV1){result={...result};const n=Number(r.p4OrbitalSacrificeCount)||0,m=mLabel(Number(r.angularMomentum)||0),v=Number(r.p4VelocityRatio)||0;if(r.choice==='ABSORB'){if(r.success){result.title=r.p4MajorMerger?'MAJOR MERGER':'BOUND CAPTURE';result.reason=r.p4MajorMerger?'Low angular momentum and a sufficiently bound relative velocity let the comparable systems lose orbital energy and merge, with some material left in tidal debris.':'Low enough angular momentum and relative velocity let gravity bind material from the encounter into your system.';}else if(!r.v7FatalCapture){result.title='FAILED CAPTURE';result.reason='The encounter did not become gravitationally bound. The low-impact-parameter passage instead caused tidal stripping before separation.';}}else if(r.choice==='DEFLECT'){if(r.result==='steal'){result.title='TIDAL GAIN';result.reason='An intermediate-angular-momentum close passage produced strong tides without a full merger, leaving stripped material bound to your system.';}else if(r.result==='stripped'){result.title='TIDAL STRIPPING';result.reason='The close passage generated strong tides, but the mass balance and geometry favoured the other system and pulled bound members away.';}else{result.title='CLEAN GRAZE';result.reason='The systems distorted each other but separated without significant material transfer.';}}else if(r.success){result.title='SAFE FLYBY';result.reason='High angular momentum carried your system through without becoming bound. The course change still costs some speed.';}else{result.title='TIDAL FLYBY';result.reason='The escape trajectory was not tangential enough to keep the full system clear. The core escaped, but outer material was stripped.';}const tech='L: '+m+' • v/vesc '+v.toFixed(v>=2?1:2),sac=n?' • ORBITAL SACRIFICE '+n:'';result.detail=(result.detail||'')+(result.detail?' • ':'')+tech+sac;}return baseResult.call(this,result);};

  const baseShowDevLab=proto.showDevLab;
  if(typeof baseShowDevLab==='function')proto.showDevLab=function(...args){
    this._p4GravityForce=false;
    return baseShowDevLab.apply(this,args);
  };

  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(x=>walk(x,fn));}
  if(typeof baseBirth==='function')proto.showPhase4SystemBirth=function(...args){const out=baseBirth.apply(this,args);walk(this.ui,ch=>{if(typeof ch?.text!=='string'||typeof ch.setText!=='function')return;const x=ch.text;if(x==='PHASE 4 ACTIONS')ch.setText('PHASE 4 GRAVITY');else if(x==='Pull members into your system.')ch.setText('Low angular momentum favours binding.');else if(x==='Pass close — you may gain or lose members.')ch.setText('Intermediate paths drive tidal exchange.');else if(x==='Keep your distance and protect your system.')ch.setText('High angular momentum favours a flyby.');else if(/CAPTURE CAN END THE RUN/.test(x)){ch.setText('SET TRAJECTORY • READ RELATIVE VELOCITY • SACRIFICE ORBITALS IF NEEDED');ch.setFontSize?.('6.2px');}});return out;};

  window.CometPhase4GravityV1=Object.freeze({enabled:true,version:4,trajectoryEndpoints:['RADIAL','TANGENTIAL'],angularMomentum:true,relativeVelocityVsEscape:true,orbitalSacrifice:true,sacrificeUsesPersistentMembers:true,actions:['CAPTURE','GRAZE','AVOID'],tidalTransfer:true,partialMassLoss:true});
})();