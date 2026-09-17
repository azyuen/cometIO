// Phase opening tutorial cards for Phases 1-3.
// Phase 3 now explicitly teaches trajectory/angular momentum and pre-action orbital assist.
(() => {
  const proto = GameScene.prototype;
  const baseStartNewRun = proto.startNewRun;
  const baseStartEncounter = proto.startEncounter;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;

  const INTRO = {
    1: {
      title:'PHASE 1 BEGINS',
      age:'THE AGE OF ACCRETION',
      subtitle:'START SMALL. GROW THROUGH SAFE COLLISIONS.',
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
      subtitle:'WORLDS GATHER. STARS IGNITE. ORBITALS NOW MATTER.',
      objectLabel:'YOUR SYSTEM CAN NOW BUILD ORBITALS',
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
      subtitle:'COMPACT OBJECTS CAN LOOK SMALL BUT CONTROL THE ENCOUNTER.',
      objectLabel:'GRAVITY BECOMES THE DOMINANT FORCE'
    }
  };

  function phaseObject(scene, phase) {
    if (scene.player) return scene.player;
    const names={1:'HYDROGEN ATOM',2:'ROCKY PLANET',3:'PULSAR'};
    const wanted=names[phase];
    let index=TIERS.findIndex(t=>t.name===wanted);
    if(index<0) index=phase===1?0:phase===2?Math.max(0,TIERS.findIndex(t=>t.name==='ROCKY PLANET')):Math.max(0,TIERS.findIndex(t=>t.name==='PULSAR'));
    const t=TIERS[index]||TIERS[0];
    return {name:t.name,realName:t.name,tier:index,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,hint:t.hint};
  }

  function actionLine(scene, y, label, color, explanation) {
    scene.addText(46,scene.Y(y),`• ${label}`,10,color,{bold:true});
    const x=label==='ABSORB'?132:label==='DEFLECT'?137:120;
    scene.addText(x,scene.Y(y),explanation,8.55,C.white,{bold:true,width:248,lineSpacing:2});
  }

  function phase3Teaching(scene) {
    const panel=scene.add.graphics();
    panel.fillStyle(C.panel,.96).fillRoundedRect(24,scene.Y(418),372,286,9);
    panel.lineStyle(1.5,C.cyan,.62).strokeRoundedRect(24,scene.Y(418),372,286,9);
    scene.ui.add(panel);

    scene.addText(W/2,scene.Y(437),'SET YOUR APPROACH BEFORE YOU ACT',9.4,C.white,{ox:.5,bold:true});

    scene.addText(43,scene.Y(468),'TRAJECTORY',8.7,C.cyan,{bold:true});
    scene.addText(43,scene.Y(489),'RADIAL',8.2,C.orange,{bold:true});
    scene.addText(105,scene.Y(489),'LOWER ANGULAR MOMENTUM',7.45,C.white,{bold:true});
    scene.addText(43,scene.Y(510),'TANGENTIAL',8.2,C.green,{bold:true});
    scene.addText(129,scene.Y(510),'HIGHER ANGULAR MOMENTUM',7.45,C.white,{bold:true});
    scene.addText(43,scene.Y(535),'Radial approaches favour MERGE but increase capture risk.',7.25,C.muted,{bold:true,width:332});
    scene.addText(43,scene.Y(554),'Tangential approaches improve SLING and ESCAPE.',7.25,C.muted,{bold:true,width:332});

    scene.addText(43,scene.Y(585),'ORBITAL ASSIST',8.7,C.orange,{bold:true});
    scene.addText(43,scene.Y(606),'Use  − / +  to choose how many orbitals to sacrifice.',7.35,C.white,{bold:true,width:330});
    scene.addText(43,scene.Y(626),'More orbitals reduce capture risk, with diminishing returns.',7.15,C.muted,{bold:true,width:330});

    scene.addText(W/2,scene.Y(659),'MERGE  •  SLING  •  ESCAPE',9.2,C.white,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(681),'YOUR SETTINGS LOCK WHEN YOU CHOOSE AN ACTION.',7.1,C.cyan,{ox:.5,bold:true,width:345,align:'center'});
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
    this.addText(W/2,this.Y(100),cfg.subtitle,7.8,C.muted,{ox:.5,bold:true,width:380,align:'center'});

    const object=phaseObject(this,phase);
    const visual=this.drawObject(W/2,this.Y(270),phase===1?47:phase===2?56:58,object,false,true);
    if(visual) this.tweens.add({targets:visual,y:'-=4',duration:1100,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    this.addText(W/2,this.Y(350),cfg.objectLabel,8.7,phase===3?C.purple:C.green,{ox:.5,bold:true,width:360,align:'center'});
    this.addText(W/2,this.Y(376),object.realName||object.name,7.8,C.muted,{ox:.5,bold:true,width:350,align:'center'});

    if(phase===3){
      phase3Teaching(this);
      this.wideButton(W/2,this.Y(752),320,54,'BEGIN PHASE 3',C.cyan,()=>{
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
    phase3Actions:['MERGE','SLING','ESCAPE'],
    phase3TrajectoryEndpoints:['RADIAL','TANGENTIAL'],
    phase3TeachesOrbitalAssist:true,
    phase4UsesGalaxyIntro:true
  });
})();
