// Phase 4 v5: Phase 4 starts at Galaxy, simplified action UI, tutorial panel,
// reliable standalone SMBH sprite rendering, and LAB orbital-control spacing.
(() => {
  if (!window.CometPhase4SystemV4 || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const SMBH = P4.firstTier;
  const GALAXY = P4.galaxyTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const V5 = 5;

  const baseDrawObject = proto.drawObject;
  const baseDrawPrompt = proto.drawPrompt;
  const baseOutcome = proto.outcome;
  const baseStartEncounter = proto.startEncounter;
  const baseStartLabPhaseRun = proto.startLabPhaseRun;
  const baseShowDevLab = proto.showDevLab;
  const baseShowPhaseCompleteCard = proto.showPhaseCompleteCard;

  function activePhase4(scene) {
    return !scene._devModeActive && scene.tierIndex >= GALAXY && scene.tierIndex < SUPERCLUSTER;
  }

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function promotePhase4ToGalaxy(scene, resetProgress = false) {
    if (scene.tierIndex < GALAXY) scene.tierIndex = GALAXY;
    const count = Array.isArray(scene.phase4Members) ? scene.phase4Members.length : 0;
    const startPct = clamp(.27 + Math.max(0, count - 3) * .028, .30, .56);
    if (resetProgress || !Number.isFinite(scene.growth) || scene.growth > TIERS[GALAXY].need) {
      scene.growth = TIERS[GALAXY].need * startPct;
    } else if (scene.growth <= 0) {
      scene.growth = TIERS[GALAXY].need * startPct;
    } else {
      scene.growth = Math.min(scene.growth, TIERS[GALAXY].need * .60);
    }
    scene.setPlayer(true);
    scene.systemCaptures = Array.isArray(scene.phase4Members) ? scene.phase4Members.length : whole(scene.systemCaptures);
    if (scene.player) {
      scene.player.phase4System = true;
      scene.player.phase4CaptureCount = scene.systemCaptures;
    }
  }

  function whole(value) { return Math.max(0, Math.floor(Number(value) || 0)); }

  function phase4Button(scene, x, label, color, canonical) {
    const y = scene.Y(771), w = 122, h = 96;
    const c = scene.add.container(x, y), g = scene.add.graphics(), icon = scene.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-w/2, -h/2, w, h, 7);

    if (label === 'CAPTURE') {
      icon.fillStyle(color, 1).fillCircle(0, -17, 5);
      icon.lineStyle(3, color, .95).arc(0, -17, 19, .18, Math.PI * 1.65, false).strokePath();
      icon.fillTriangle(18, -25, 9, -26, 15, -17);
    } else if (label === 'GRAZE') {
      icon.lineStyle(3, color, .95).arc(-7, -18, 13, -1.0, 1.05, false).strokePath();
      icon.lineStyle(3, C.white, .55).arc(8, -12, 13, 2.15, 4.2, false).strokePath();
      icon.fillStyle(color, .95).fillCircle(0, -15, 2.7);
    } else {
      icon.lineStyle(5, color, .95).arc(0, -14, 19, .3, 2, false).strokePath();
      icon.fillStyle(color).fillTriangle(18, -26, 7, -27, 14, -17);
    }

    const text = scene.add.text(0, 26, label, {
      fontFamily: FONT, fontSize:'16px', fontStyle:'bold', color:'#fff'
    }).setOrigin(.5);
    if (text.setResolution) text.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', () => scene.choose(canonical));
    c.add([g, icon, text, hit]); scene.ui.add(c); return c;
  }

  proto.drawPrompt = function() {
    if (!activePhase4(this)) return baseDrawPrompt.call(this);
    const y=this.Y(636),g=this.add.graphics();
    g.fillStyle(C.panel,.98).fillRoundedRect(10,y,400,78,8);
    g.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,y,400,78,8);this.ui.add(g);
    this.addText(W/2,y+17,'A COSMIC SYSTEM IS AHEAD.',14.5,C.white,{ox:.5,bold:true});
    this.addText(W/2,y+44,'HOW WILL YOUR SYSTEM INTERACT?',10.5,C.muted,{ox:.5,bold:true});
    phase4Button(this,73,'CAPTURE',C.green,'ABSORB');
    phase4Button(this,210,'GRAZE',C.orange,'DEFLECT');
    phase4Button(this,347,'AVOID',C.blue,'AVOID');
  };

  function lodForNamed(scene, variant, diameter) {
    const entry = typeof COMET_SPRITE_ASSETS !== 'undefined' ? COMET_SPRITE_ASSETS[variant] : null;
    if (!entry || !Array.isArray(entry.lods)) return null;
    const order = diameter >= 46 ? [64,32] : [32,64];
    for (const lod of order) {
      if (!entry.lods.includes(lod)) continue;
      const key = cometSpriteTextureKey(variant, lod);
      if (scene.textures?.exists?.(key)) return {key,lod};
    }
    return null;
  }

  function renderNamedSMBH(scene, x, y, radius, object, glow) {
    const diameter=Math.max(2,radius*2),named=lodForNamed(scene,object.namedSpriteBase,diameter);
    if (!named) return null;
    const c=scene.add.container(x,y),image=scene.add.image(0,0,named.key);
    const setDiameter=(value)=>{
      const d=Math.max(2,value),next=lodForNamed(scene,object.namedSpriteBase,d);
      if(next&&image.texture?.key!==next.key)image.setTexture(next.key);
      const iw=Math.max(1,image.width||1),ih=Math.max(1,image.height||iw);
      image.setDisplaySize(d,d*(ih/iw));
      c.cometVisual.baseDisplayDiameterPx=d;
      c.cometVisual.lod=next?.lod||c.cometVisual.lod;
      return c;
    };
    const texture=scene.textures.get?.(named.key);
    if(texture?.setFilter&&Phaser.Textures?.FilterMode)texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    if(glow){const aura=scene.add.graphics();aura.fillStyle(C.purple,.08).fillCircle(0,0,radius*1.35);c.add(aura);}
    c.add(image);scene.ui.add(c);
    c.cometVisual={scene,container:c,object,mystery:false,variant:object.namedSpriteBase,lod:named.lod,image,baseDisplayDiameterPx:diameter,fallback:false,namedIdentity:true};
    c.cometCollisionFamily='compact';
    c.setVisualDisplayDiameter=setDiameter;
    c.refreshVisualLOD=()=>setDiameter(c.cometVisual.baseDisplayDiameterPx);
    setDiameter(diameter);
    return c;
  }

  proto.drawObject = function(x,y,radius,object,mystery=false,glow=false) {
    if (!mystery && Number(object?.tier) === SMBH && object?.kind === 'blackhole' && object?.identityId && object?.namedSpriteBase) {
      const named=renderNamedSMBH(this,x,y,radius,object,glow);
      if(named)return named;
    }
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  proto.outcome = function(choice) {
    const pending=baseOutcome.call(this,choice);
    if (activePhase4(this) && pending?.result === 'captured') {
      pending.result='stripped';
      pending.success=false;
      pending.v5PreventSMBHRegression=true;
    }
    return pending;
  };

  proto.startEncounter = function() {
    if (!this._devModeActive && this.tierIndex === SMBH) {
      if (this.phase4BirthShown) {
        promotePhase4ToGalaxy(this, false);
        return baseStartEncounter.call(this);
      }
      return this.showPhase4SystemBirth();
    }
    return baseStartEncounter.call(this);
  };

  proto.showPhase4SystemBirth = function() {
    if (!Array.isArray(this.phase4Members)) this.phase4Members=[];
    promotePhase4ToGalaxy(this, true);
    this.phase4BirthShown=false;
    this.clearUI();this.state='P4_SYSTEM_BIRTH';

    // Match the Phase 1-3 opening-card hierarchy.
    this.addText(W/2,this.Y(36),'PHASE 4 BEGINS',20,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(70),'THE COSMIC AGE',11,C.cyan,{ox:.5,bold:true});
    // No grey explanatory subtitle here; match the cleaner Phase 1-3 header.

    this.drawObject(W/2,this.Y(270),76,this.player,false,true);
    this.addText(W/2,this.Y(350),'YOUR GALAXY',8.9,C.green,{ox:.5,bold:true,width:340,align:'center'});
    this.addText(W/2,this.Y(376),`STARTING ORBITALS ${Array.isArray(this.phase4Members)?this.phase4Members.length:0}`,7.8,C.cyan,{ox:.5,bold:true,width:350,align:'center'});

    const panel=this.add.graphics();
    panel.fillStyle(C.panel,.96).fillRoundedRect(24,this.Y(432),372,226,9);
    panel.lineStyle(1.5,C.cyan,.55).strokeRoundedRect(24,this.Y(432),372,226,9);this.ui.add(panel);
    this.addText(43,this.Y(449),'PHASE 4 ACTIONS',9.5,C.white,{bold:true});

    const explanationX=145;
    this.addText(46,this.Y(482),'• CAPTURE',10,C.green,{bold:true});
    this.addText(explanationX,this.Y(482),'Pull members into your system.',8.35,C.white,{bold:true,width:225});

    this.addText(46,this.Y(529),'• GRAZE',10,C.orange,{bold:true});
    this.addText(explanationX,this.Y(529),'Pass close — you may gain or lose members.',8.25,C.white,{bold:true,width:225});

    this.addText(46,this.Y(576),'• AVOID',10,C.blue,{bold:true});
    this.addText(explanationX,this.Y(576),'Keep your distance and protect your system.',8.25,C.white,{bold:true,width:225});

    this.addText(W/2,this.Y(631),'BUILD SYSTEM MASS TO BECOME A GALAXY CLUSTER.',7.25,C.muted,{ox:.5,bold:true,width:354,align:'center'});

    this.wideButton(W/2,this.Y(725),320,56,'BEGIN PHASE 4',C.cyan,()=>{
      this.phase4BirthShown=true;
      this.phase4V3Seeded=true;
      return this.startEncounter();
    });
  };

  proto.startLabPhaseRun = function(phase) {
    if (String(phase||'').toUpperCase() !== 'PHS4') return baseStartLabPhaseRun.call(this,phase);

    this.clearUI();
    this._labSandboxRun=true;this._labSandboxPhase='PHS4';this._devModeActive=false;this._devPhase4Test=false;
    this.runActive=true;this.state='LAB_PHASE_START';this.tierIndex=GALAXY;this.growth=0;this.craters=3;this.encounters=0;this.absorbs=0;this.score=0;
    this.regionId='hyperspace';this.lastRegionPromptEncounter=-1;this.runStarted=Date.now();this.other=null;this.pending=null;this.preEncounterPlayer=null;this.preEncounterOther=null;this.actionHistory=[];
    this.collectedIdentityIds=[];this.collectionBonusScore=0;this.manualSaves=0;this.manualLoads=0;this.scorePenalty=0;this.orbitalCount=3;this.orbitalProgress=0;this.orbitalsUnlocked=true;
    this.systemCaptures=3;this.finaleMergeCount=0;this.universeCount=0;
    this.phase4Members=[];this.phase4MembersInitialized=false;this.phase4V3Seeded=false;this.phase4BirthShown=false;this.phase4SeedScore=0;this.phase4SeedInheritedOrbitals=3;
    this.setPlayer(true);
    return this.showPhase4SystemBirth();
  };

  function spaceLabOrbitalControls(scene) {
    if (scene.state !== 'DEV_LAB') return;
    walk(scene.ui, child => {
      if (typeof child?.text === 'string') {
        if (child.text.startsWith('ORBITALS ')) child.y -= 8;
        if (child.text.startsWith('Objects are equal apparent size')) child.y += 12;
      }
      if (Array.isArray(child?.list)) {
        const label=child.list.find(item=>typeof item?.text==='string'&&(item.text==='+'||item.text==='−'));
        if(label && child.y >= scene.Y(468) && child.y <= scene.Y(505)) child.y += 10;
      }
    });
  }

  proto.showDevLab = function() {
    const result=baseShowDevLab.call(this);
    spaceLabOrbitalControls(this);
    return result;
  };

  if (typeof baseShowPhaseCompleteCard === 'function') {
    proto.showPhaseCompleteCard = function(phase) {
      const result=baseShowPhaseCompleteCard.call(this,phase);
      if (phase===4) {
        walk(this.ui, child=>{
          if(typeof child?.text==='string'&&child.text==='FROM GALACTIC NUCLEUS TO OBSERVABLE UNIVERSE.'&&typeof child.setText==='function') child.setText('FROM GALAXY TO OBSERVABLE UNIVERSE.');
        });
      }
      return result;
    };
  }

  window.CometPhase4SystemV5=Object.freeze({
    enabled:true,version:V5,phase4StartsAt:'GALAXY',actionSubtitles:false,
    tutorialActions:true,standaloneSMBHSprites:true,labOrbitalSpacing:true,
    noSMBHTierRegression:true
  });
})();