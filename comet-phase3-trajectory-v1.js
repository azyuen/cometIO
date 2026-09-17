// Phase 3 trajectory mechanics v5.
// RADIAL <-> TANGENTIAL is chosen before MERGE / SLING / ESCAPE.
// v5 further compacts the UI, keeps the opponent name clear, always shows orbital-assist +/- controls,
// and removes redundant captions beneath the three action buttons.
(() => {
  if (typeof GameScene === 'undefined') return;
  const proto = GameScene.prototype;
  const baseDrawArena = proto.drawArena;
  const baseDrawPrompt = proto.drawPrompt;
  const baseChoice = proto.choice;
  const baseChoose = proto.choose;
  const baseStartEncounter = proto.startEncounter;

  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const SMBH = TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE');
  const MAX_T = .92;

  function active(scene) {
    const tier = Number(scene?.tierIndex);
    const lab = scene?._labSandboxRun === true;
    return PULSAR >= 0 && SMBH >= 0 && tier >= PULSAR && tier <= SMBH && (!scene._devModeActive || lab);
  }
  function trajectory(scene) {
    if (!Number.isFinite(Number(scene._p3Trajectory))) scene._p3Trajectory = 0;
    return clamp(Number(scene._p3Trajectory), -MAX_T, MAX_T);
  }
  function angularMomentum(t) { return clamp((t + MAX_T) / (MAX_T * 2), 0, 1); }
  function curve(a, power = 1.65) { return Math.pow(clamp(a,0,1), power); }
  function availableOrbitals(scene) { return Math.max(0, Math.floor(Number(scene?.orbitalCount) || 0)); }
  function assistCount(scene) {
    if (scene._p3OrbitalAssistCount === true) scene._p3OrbitalAssistCount = 1;
    const n = Math.max(0, Math.floor(Number(scene._p3OrbitalAssistCount) || 0));
    scene._p3OrbitalAssistCount = Math.min(n, availableOrbitals(scene));
    return scene._p3OrbitalAssistCount;
  }
  function speedRatio(scene) {
    return clamp((Number(scene?.player?.speedMS)||1) / Math.max(1, Number(scene?.other?.speedMS)||1), .15, 3);
  }
  function speedAdjustment(scene) {
    return clamp(Math.log10(speedRatio(scene)) * .10, -.07, .07);
  }

  function predictedSurvival(scene, choice, a) {
    const gap = Math.max(0, Number(scene?.other?.tier||0)-Number(scene?.tierIndex||0));
    const high = curve(a);
    const speed = speedAdjustment(scene);
    if (choice === 'AVOID') return clamp(.16 + high*.76 - gap*.025 + speed, .08, .94);
    if (choice === 'DEFLECT') return clamp(.12 + high*.70 - gap*.035 + speed, .06, .88);
    return clamp(.06 + high*.60 - gap*.045 + speed*.5, .025, .72);
  }

  function assistRiskMultiplier(count, choice) {
    const n = Math.max(0, Number(count)||0);
    if (!n) return 1;
    const coefficient = choice === 'ABSORB' ? .48 : .80;
    return Math.exp(-coefficient * Math.pow(n, .72));
  }

  proto.startEncounter = function(...args) {
    this._p3Trajectory = 0;
    this._p3OrbitalAssistCount = 0;
    this._p3OrbitalAssist = false;
    return baseStartEncounter.apply(this,args);
  };

  proto.drawArena = function(...args) {
    const result=baseDrawArena.apply(this,args);
    if(!active(this)||!this.otherSprite?.active)return result;
    const x=this.otherSprite.x,y=this.otherSprite.y;
    try{this.otherSprite.destroy(true);}catch(e){}
    this.otherSprite=this.drawObject(x,y,42,this.other,false,true);
    const visit=node=>{if(!node)return;if(typeof node.text==='string'&&node.text.trim()==='UNKNOWN'){node.setText('IDENTIFIED');node.setColor?.('#ff9f43');}if(Array.isArray(node.list))node.list.forEach(visit);};
    visit(this.ui);
    this.addText(W-14,this.Y(620),this.other.realName||this.other.name,7.2,C.orange,{ox:1,bold:true,width:190,align:'right'});
    return result;
  };

  // Phase 3 now teaches risk through the trajectory/orbital controls themselves. The tiny text under
  // MERGE/SLING/ESCAPE was visually noisy and is intentionally removed.
  proto.choice=function(x,y,label,color,risk){
    if(active(this)) risk='';
    return baseChoice.call(this,x,y,label,color,risk);
  };

  function addOrbitalAssist(scene) {
    const available=availableOrbitals(scene);
    const selected=assistCount(scene);
    const cx=101,cy=scene.Y(617),w=178,h=32;
    const c=scene.add.container(cx,cy),g=scene.add.graphics();
    g.fillStyle(C.panel,.96).fillRoundedRect(-w/2,-h/2,w,h,5);
    g.lineStyle(1.15,selected?C.orange:C.cyan,.78).strokeRoundedRect(-w/2,-h/2,w,h,5);
    const label=scene.add.text(-48,-7,'ORBITAL ASSIST',{fontFamily:FONT,fontSize:'6.2px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5);
    const count=scene.add.text(0,7,`${selected} / ${available}`,{fontFamily:FONT,fontSize:'8.8px',fontStyle:'bold',color:selected?'#ff9d3d':'#f7fbff'}).setOrigin(.5);
    const minusBg=scene.add.rectangle(-69,6,28,24,0xffffff,.001).setInteractive({useHandCursor:true});
    const plusBg=scene.add.rectangle(69,6,28,24,0xffffff,.001).setInteractive({useHandCursor:true});
    const minus=scene.add.text(-69,6,'−',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected?'#20d9ff':'#526f7b'}).setOrigin(.5);
    const plus=scene.add.text(69,6,'+',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected<available?'#20d9ff':'#526f7b'}).setOrigin(.5);
    minusBg.on('pointerdown',()=>{if(assistCount(scene)<=0)return;scene._p3OrbitalAssistCount=Math.max(0,assistCount(scene)-1);scene.drawEncounter();});
    plusBg.on('pointerdown',()=>{if(assistCount(scene)>=availableOrbitals(scene))return;scene._p3OrbitalAssistCount=Math.min(availableOrbitals(scene),assistCount(scene)+1);scene.drawEncounter();});
    c.add([g,label,count,minusBg,plusBg,minus,plus]);scene.ui.add(c);
  }

  function addTrajectoryControl(scene) {
    const panelTop=scene.Y(646),panelHeight=60;
    const pg=scene.add.graphics();
    pg.fillStyle(C.panel,.97).fillRoundedRect(15,panelTop,390,panelHeight,7);
    pg.lineStyle(1.5,C.cyan,.82).strokeRoundedRect(15,panelTop,390,panelHeight,7);scene.ui.add(pg);

    const y=scene.Y(677),x0=74,x1=346,width=x1-x0;
    let t=trajectory(scene),a=angularMomentum(t);
    scene.addText(W/2,scene.Y(651),'TRAJECTORY',7.6,C.cyan,{ox:.5,bold:true});
    scene.addText(x0,scene.Y(663),'RADIAL',7.1,C.orange,{ox:.5,bold:true});
    scene.addText(x1,scene.Y(663),'TANGENTIAL',7.1,C.green,{ox:.5,bold:true});

    const track=scene.add.graphics();track.lineStyle(6,0x183248,1).lineBetween(x0,y,x1,y);track.lineStyle(2.5,C.cyan,.7).lineBetween(x0,y,x1,y);scene.ui.add(track);
    const thumb=scene.add.circle(x0+a*width,y,8,C.white,1).setStrokeStyle(2,C.cyan,1);scene.ui.add(thumb);
    // Raised closer to the slider so it does not sit against the bottom border.
    const momentumText=scene.addText(W/2,scene.Y(693),'',6.6,C.white,{ox:.5,bold:true});

    function paint(value){
      scene._p3Trajectory=clamp(value,-MAX_T,MAX_T);t=trajectory(scene);a=angularMomentum(t);thumb.x=x0+a*width;
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

  proto.drawPrompt=function(...args){
    if(!active(this))return baseDrawPrompt.apply(this,args);
    addOrbitalAssist(this); // always visible, including 0 / 0
    addTrajectoryControl(this);
    this.choice(73,this.Y(786),'ABSORB',C.green,'');
    this.choice(210,this.Y(786),'DEFLECT',C.orange,'');
    this.choice(347,this.Y(786),'AVOID',C.blue,'');
  };

  function fatalChance(p){
    if(Number.isFinite(Number(p?.fatalChance)))return clamp(Number(p.fatalChance),0,1);
    if(Number.isFinite(Number(p?.chance)))return clamp(1-Number(p.chance),0,1);
    return p?.success===false?1:0;
  }

  function applyTrajectory(scene,choice,pending){
    const t=trajectory(scene),a=angularMomentum(t),high=curve(a);
    pending.phase3Trajectory=t;pending.angularMomentum=a;pending.trajectoryLabel=a<.34?'RADIAL':a>.66?'TANGENTIAL':'OBLIQUE';

    if(choice==='ABSORB'){
      const baseSafe=clamp(Number(pending.chance)||(pending.success ? .6 : .2),.01,.99);
      let safe=clamp(baseSafe*(1.20-.55*a),.015,.985);
      if(pending.compactGravityReverse){
        safe=clamp(Math.max(1-fatalChance(pending),predictedSurvival(scene,'ABSORB',a)),.015,.92);
        pending.fatalChance=1-safe;pending.fragmentChance=safe;
      }
      pending.chance=safe;pending.success=Math.random()<safe;
      if(pending.compactGravityReverse)pending.result=pending.success?'fragment':'catastrophic';
      else if(!pending.success)pending.result=pending.result||'catastrophic';
    }else if(choice==='DEFLECT'){
      const survival=Math.max(1-fatalChance(pending),predictedSurvival(scene,'DEFLECT',a));
      const fatal=clamp(1-survival,.002,.94);
      const cleanBase=clamp(Number(pending.cleanChance)||.35,0,1-fatal);
      const cleanFloor=survival*clamp(.24+high*.58,.18,.78);
      const clean=clamp(Math.max(cleanBase,cleanFloor),.03,1-fatal);
      const roll=Math.random();pending.fatalChance=fatal;pending.cleanChance=clean;pending.chance=1-fatal;
      pending.result=roll<fatal?'catastrophic':roll<fatal+clean?'clean':'rough';pending.success=pending.result!=='catastrophic';
    }else{
      const legacy=clamp(Number(pending.chance)||.08,.01,.995);
      const chance=clamp(Math.max(legacy,predictedSurvival(scene,'AVOID',a)),.08,.995);
      pending.chance=chance;pending.fatalChance=1-chance;pending.success=Math.random()<chance;
    }

    const used=Math.min(assistCount(scene),availableOrbitals(scene));
    if(used>0){
      scene.orbitalCount=Math.max(0,availableOrbitals(scene)-used);scene.craters=scene.orbitalCount;
      pending.orbitalsSacrificed=used;pending.phase3OrbitalAssist=true;pending.phase3OrbitalAssistCount=used;
      const multiplier=assistRiskMultiplier(used,choice);

      if(choice==='ABSORB'){
        const fatal=Math.max(.025,fatalChance(pending)*multiplier);
        pending.fatalChance=fatal;pending.chance=1-fatal;pending.success=Math.random()>=fatal;
        if(pending.compactGravityReverse)pending.result=pending.success?'fragment':'catastrophic';
      }else if(choice==='DEFLECT'){
        const fatal=Math.max(.008,fatalChance(pending)*multiplier);
        pending.fatalChance=fatal;pending.chance=1-fatal;
        const cleanTarget=clamp((1-fatal)*(.72+.18*(1-Math.exp(-used*.35))),0,1-fatal);
        const clean=Math.max(Number(pending.cleanChance)||0,cleanTarget);
        pending.cleanChance=clean;
        const roll=Math.random();pending.result=roll<fatal?'catastrophic':roll<fatal+clean?'clean':'rough';pending.success=pending.result!=='catastrophic';
      }else{
        const fatal=Math.max(.005,(1-Number(pending.chance))*multiplier);
        pending.fatalChance=fatal;pending.chance=1-fatal;pending.success=Math.random()<pending.chance;
      }
    }
    return pending;
  }

  proto.choose=function(choice){
    if(!active(this)||this.state!=='APPROACH')return baseChoose.call(this,choice);
    let pending=this.outcome(choice);pending=applyTrajectory(this,choice,pending);
    this.pending=pending;this.state='REVEAL';this.tweens.killAll();this.reveal(choice);
  };

  window.CometPhase3Trajectory=Object.freeze({
    enabled:true,version:5,endpoints:['RADIAL','TANGENTIAL'],teachesAngularMomentum:true,
    preActionDecision:true,orbitalAssist:'multi-select-always-visible',orbitalAssistHardCap:null,
    orbitalAssistDiminishingReturns:true,oldHighRiskPopupBypassed:true,compactTrajectoryPanel:true,
    actionRiskCaptions:false
  });
})();
