// Phase opening tutorial cards for Phases 1-3.
// Phase 3 explicitly teaches trajectory/angular momentum and pre-action orbital assist.
(() => {
  const proto = GameScene.prototype;
  const baseStartNewRun = proto.startNewRun;
  const baseStartEncounter = proto.startEncounter;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;

  const INTRO = {
    1: {
      title:'PHASE 1 BEGINS',
      age:'THE AGE OF ACCRETION',
      subtitle:'START SMALL. GROW THROUGH SAFE COLLISIONS. Collisions and gravity build larger objects from smaller material.',
      objectLabel:'YOU BEGIN AS AN ATOM',
      actions:[
        ['ABSORB', C.green, 'Smaller objects are usually safer to absorb.'],
        ['DEFLECT', C.orange, 'Redirect an uncertain collision without taking it in.'],
        ['AVOID', C.blue, 'Pass by a dangerous object. Safest, but may cost speed.']
      ],
      rule:'APPARENT SIZE IS YOUR MAIN CLUE.'
    },
    2: {
      title:'PHASE 2 BEGINS',
      age:'THE AGE OF SYSTEMS',
      subtitle:'A DWARF PLANET FORMS. MOONS AND ORBITALS NOW MATTER. Gravity does more than collide objects — it can hold them in stable orbital systems.',
      objectLabel:'YOU ARE NOW A DWARF PLANET\nORBITALS UNLOCK',
      actions:[
        ['ABSORB', C.green, 'Keep growing through worlds, stars and nebulae.'],
        ['DEFLECT', C.orange, 'Build orbital protection for future dangerous encounters.'],
        ['AVOID', C.blue, 'Keep your distance when the size matchup looks bad.']
      ],
      rule:'SIZE STILL MATTERS — ORBITALS NOW PROTECT YOU.'
    },
    3: {
      title:'PHASE 3 BEGINS',
      age:'THE AGE OF GRAVITY',
      subtitle:'A COMPACT REMNANT FORMS. A neutron star or black hole can pack enormous mass into a tiny region.',
      objectLabel:'YOU ARE NOW A PULSAR'
    }
  };

  function phaseObject(scene, phase) {
    if (scene.player) return scene.player;
    const names={1:'HYDROGEN ATOM',2:'DWARF PLANET',3:'PULSAR'};
    const wanted=names[phase];
    let index=TIERS.findIndex(t=>t.name===wanted);
    if(index<0) index=phase===1?0:phase===2?Math.max(0,TIERS.findIndex(t=>t.name==='DWARF PLANET')):Math.max(0,TIERS.findIndex(t=>t.name==='PULSAR'));
    const t=TIERS[index]||TIERS[0];
    return {name:t.name,realName:t.name,tier:index,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,hint:t.hint};
  }

  function actionLine(scene, y, label, color, explanation) {
    scene.addText(46,scene.Y(y),`• ${label}`,10,color,{bold:true});
    // Keep all instructional copy on one clean left edge regardless of action-label length.
    scene.addText(145,scene.Y(y),explanation,8.35,C.white,{bold:true,width:225,lineSpacing:2});
  }

  function phase3Teaching(scene) {
    // Phase 3 introduces two genuinely new controls. Explain those controls clearly here,
    // while leaving the detailed probabilities to the live encounter HUD.
    const top=scene.Y(398),height=278;
    const panel=scene.add.graphics();
    panel.fillStyle(C.panel,.96).fillRoundedRect(24,top,372,height,9);
    panel.lineStyle(1.5,C.cyan,.62).strokeRoundedRect(24,top,372,height,9);
    scene.ui.add(panel);

    scene.addText(W/2,scene.Y(420),'GRAVITY CHANGES THE RULES',9.6,C.white,{ox:.5,bold:true});

    scene.addText(48,scene.Y(452),'TRAJECTORY',8.8,C.cyan,{bold:true});
    scene.addText(48,scene.Y(476),'Move the slider before choosing an action.',7.55,C.white,{bold:true,width:324});
    scene.addText(48,scene.Y(499),'RADIAL',8.2,C.green,{bold:true});
    scene.addText(150,scene.Y(499),'lower angular momentum • favours MERGE',7.15,C.muted,{bold:true,width:220});
    scene.addText(48,scene.Y(522),'TANGENTIAL',8.2,C.orange,{bold:true});
    scene.addText(150,scene.Y(522),'higher angular momentum • favours SLING / AVOID',7.15,C.muted,{bold:true,width:220});

    // No divider here: keeping this open makes the tutorial feel less boxed-in.
    scene.addText(48,scene.Y(560),'ORBITAL ASSIST',8.8,C.cyan,{bold:true});
    scene.addText(48,scene.Y(584),'Use  − / +  to choose how many orbitals to sacrifice.',7.45,C.white,{bold:true,width:324});
    scene.addText(48,scene.Y(607),'More sacrificed orbitals reduce capture risk.',7.25,C.muted,{bold:true,width:324});

    scene.addText(W/2,scene.Y(642),'MERGE  •  SLING  •  AVOID',9.0,C.white,{ox:.5,bold:true});
  }

  proto.showPhaseStartCard = function(phase) {
    phase=Number(phase)||1;
    const cfg=INTRO[phase];
    if(!cfg) return this.startEncounter();

    this.tweens.killAll();
    this.clearUI();
    this.state='PHASE_START_CARD';
    this._activePhaseStart=phase;

    const bg=this.add.graphics();
    bg.fillStyle(C.bg,.94).fillRect(-10,-10,W+20,H+20);
    for(let i=0;i<76;i++){
      const x=Phaser.Math.Between(8,W-8),y=Phaser.Math.Between(this.Y(8),H-10),size=Phaser.Math.RND.pick([1,1,1,2]);
      bg.fillStyle(i%17===0?C.cyan:i%29===0?C.purple:C.star,Phaser.Math.RND.pick([.15,.24,.36,.52])).fillRect(x,y,size,size);
    }
    this.ui.add(bg);

    this.addText(W/2,this.Y(36),cfg.title,20,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(70),cfg.age,11,C.cyan,{ox:.5,bold:true});
    // Keep the opening header deliberately spare: title + age only.

    const object=phaseObject(this,phase);
    const visual=this.drawObject(W/2,this.Y(270),phase===1?47:phase===2?56:58,object,false,true);
    if(visual) this.tweens.add({targets:visual,y:'-=4',duration:1100,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    this.addText(W/2,this.Y(350),cfg.objectLabel,8.7,phase===3?C.purple:C.green,{ox:.5,bold:true,width:340,align:'center'});
    // The object label already says ATOM / DWARF PLANET / PULSAR, so do not repeat the object name below it.

    if(phase===3){
      phase3Teaching(this);
      this.wideButton(W/2,this.Y(728),320,54,'BEGIN PHASE 3',C.cyan,()=>{
        if(this.state!=='PHASE_START_CARD')return;
        this._activePhaseStart=null;
        this.state='PHASE_START_EXIT';
        return baseStartEncounter.call(this);
      });
    } else {
      const panel=this.add.graphics();
      panel.fillStyle(C.panel,.96).fillRoundedRect(24,this.Y(432),372,226,9);
      panel.lineStyle(1.5,C.cyan,.55).strokeRoundedRect(24,this.Y(432),372,226,9);
      this.ui.add(panel);
      this.addText(43,this.Y(449),`PHASE ${phase} ACTIONS`,9.5,C.white,{bold:true});
      actionLine(this,482,...cfg.actions[0]);
      actionLine(this,529,...cfg.actions[1]);
      actionLine(this,576,...cfg.actions[2]);
      this.addText(W/2,this.Y(631),cfg.rule,7.25,C.muted,{ox:.5,bold:true,width:354,align:'center'});
      this.wideButton(W/2,this.Y(725),320,56,`BEGIN PHASE ${phase}`,C.cyan,()=>{
        if(this.state!=='PHASE_START_CARD')return;
        this._activePhaseStart=null;
        this.state='PHASE_START_EXIT';
        return baseStartEncounter.call(this);
      });
    }
    this.cameras.main.fadeIn(180,0,0,0);
  };

  proto.startNewRun = function() {
    this._pendingPhaseStartIntro=1;
    return baseStartNewRun.call(this);
  };

  proto.startEncounter = function() {
    if(this._pendingPhaseStartIntro){
      const phase=this._pendingPhaseStartIntro;
      this._pendingPhaseStartIntro=0;
      return this.showPhaseStartCard(phase);
    }
    return baseStartEncounter.call(this);
  };

  proto.continueFromPhaseCard = function(config) {
    if(config && !config.final && (config.phase===1 || config.phase===2) && this.state==='PHASE_COMPLETE_CARD'){
      if(Array.isArray(this._phaseCardQueue)&&this._phaseCardQueue.length) return baseContinueFromPhaseCard.call(this,config);
      this.state='PHASE_CARD_EXIT';
      this._activePhaseCard=null;
      return this.showPhaseStartCard(config.phase+1);
    }
    return baseContinueFromPhaseCard.call(this,config);
  };

  window.CometPhaseIntros=Object.freeze({
    enabled:true,
    phases:[1,2,3],
    phase1Lesson:'APPARENT SIZE',
    phase2Lesson:'ORBITALS',
    phase3Lesson:'TRAJECTORY + ANGULAR MOMENTUM + ORBITAL ASSIST',
    phase3Actions:['MERGE','SLING','AVOID'],
    phase3TrajectoryEndpoints:['RADIAL','TANGENTIAL'],
    phase3TeachesOrbitalAssist:true,
    phase4UsesGalaxyIntro:true
  });
})();