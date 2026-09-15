// Five-tab LAB suite.
// Replaces the old DEV collision landing screen with:
// LAB  - object-vs-object collision lab
// EXP  - mass/speed/orbital collision experiment
// PHS2 - sandbox run starting at Dwarf Planet
// PHS3 - sandbox run starting at Pulsar
// PHS4 - sandbox run starting at the Supermassive Black Hole system
// All phase sandboxes use real gameplay but cannot save, load over a run, or write high scores.
(() => {
  const proto = GameScene.prototype;
  const previousShowHome = proto.showHome;
  const previousShowDevPinGate = proto.showDevPinGate;
  const previousShowDevResult = proto.showDevResult;
  const previousChoose = proto.choose;
  const previousOutcome = proto.outcome;
  const previousSave = proto.save;
  const previousLoad = proto.load;
  const previousQualifies = proto.qualifies;
  const previousRecordScore = proto.recordScore;
  const previousSaveScoreAs = proto.saveScoreAs;
  const previousResetRun = proto.resetRun;
  const previousStartUniverseFinale = proto.startUniverseFinale;
  const previousCompleteUniverseAssembly = proto.completeUniverseAssembly;
  const previousShowUniverseAtomEncounter = proto.showUniverseAtomEncounter;
  const previousFinishUniverse = proto.finishUniverse;

  const DOM_CLASS = 'comet-dev-object-select'; // Existing clearUI already removes this class.
  const TAB_Y = 83;
  const DEV_APPROACH_RADIUS = 16;
  const MAX_LAB_ORBITALS = 6;
  const ORBITAL_RISK_MULTIPLIER = Number(window.CometOrbitals?.riskMultiplierPerOrbital) || .63;
  const MAX_ORBITAL_SACRIFICE = Number(window.CometOrbitals?.maxSacrifice) || 3;
  const ORBITAL_UNLOCK_TIER = Number(window.CometOrbitals?.unlockTier) || Math.max(0, TIERS.findIndex(t => t.name === 'DWARF PLANET'));
  const PHS2_TIER = Math.max(0, TIERS.findIndex(t => t.name === 'DWARF PLANET'));
  const PHS3_TIER = Math.max(0, TIERS.findIndex(t => t.name === 'PULSAR'));
  const PHS4_TIER = Number(window.CometPhase4?.firstTier ?? TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE'));

  const whole = v => Math.max(0, Math.floor(Number(v) || 0));
  const clamp01 = v => clamp(Number(v) || 0, 0, 1);

  function optionKeyForTier(tierIndex) { return `tier:${tierIndex}`; }
  function optionKeyForIdentity(identity, tierIndex) { return `identity:${identity.id}:${tierIndex}`; }

  function parseOptionKey(key) {
    const parts = String(key || '').split(':');
    if (parts[0] === 'identity') return { type: 'identity', id: parts[1], tierIndex: Number(parts[2]) };
    return { type: 'tier', tierIndex: Number(parts[1]) };
  }

  function randomFactor(logRange) { return Math.pow(10, Phaser.Math.FloatBetween(-logRange, logRange)); }

  function objectFromOption(key) {
    const parsed = parseOptionKey(key);
    const tierIndex = clamp(Number.isInteger(parsed.tierIndex) ? parsed.tierIndex : 0, 0, TIERS.length - 1);
    const tier = TIERS[tierIndex];
    const identity = parsed.type === 'identity' && typeof COMET_IDENTITY_BY_ID !== 'undefined'
      ? COMET_IDENTITY_BY_ID[parsed.id]
      : null;
    const object = {
      name: tier.name,
      realName: identity?.name || `GENERIC ${tier.name}`,
      tier: tierIndex,
      radiusM: tier.r * randomFactor(.055),
      massKg: tier.m * randomFactor(.09),
      speedMS: tier.v * Phaser.Math.FloatBetween(.90, 1.10),
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      hint: tier.hint,
      gap: 0
    };
    if (identity) {
      object.identityId = identity.id;
      object.namedSpriteBase = identity.spriteVariant;
      object.scienceClass = identity.scienceClass;
      object.identityStatus = identity.status;
    }
    return object;
  }

  function buildSelectOptions(select) {
    TIERS.forEach((tier, tierIndex) => {
      const group = document.createElement('optgroup');
      group.label = tier.name;
      const generic = document.createElement('option');
      generic.value = optionKeyForTier(tierIndex);
      generic.textContent = `GENERIC ${tier.name}`;
      group.appendChild(generic);
      if (typeof COMET_NAMED_IDENTITIES !== 'undefined') {
        COMET_NAMED_IDENTITIES
          .filter(identity => Array.isArray(identity.gameplayTiers) && identity.gameplayTiers.includes(tier.name))
          .forEach(identity => {
            const option = document.createElement('option');
            option.value = optionKeyForIdentity(identity, tierIndex);
            option.textContent = identity.name;
            group.appendChild(option);
          });
      }
      select.appendChild(group);
    });
  }

  function canvasRect(scene) { return scene.game?.canvas?.getBoundingClientRect?.() || { left:0, top:0, width:W, height:H }; }

  function positionDom(scene, node, x, y, width, height) {
    if (!node) return;
    const rect = canvasRect(scene), sx = rect.width / W, sy = rect.height / H, uiShift = Number(scene.ui?.y || 0);
    node.style.left = `${Math.round(rect.left + x * sx)}px`;
    node.style.top = `${Math.round(rect.top + (y + uiShift) * sy)}px`;
    node.style.width = `${Math.round(width * sx)}px`;
    if (height) node.style.height = `${Math.max(30, Math.round(height * sy))}px`;
  }

  function registerReposition(scene, fn) {
    if (scene._devSelectResizeHandler) {
      window.removeEventListener('resize', scene._devSelectResizeHandler);
      window.removeEventListener('orientationchange', scene._devSelectResizeHandler);
    }
    scene._devSelectResizeHandler = fn;
    window.addEventListener('resize', fn, { passive:true });
    window.addEventListener('orientationchange', fn, { passive:true });
  }

  function createObjectSelect(scene, value, x, y, width, onChange) {
    const select = document.createElement('select');
    select.className = DOM_CLASS;
    buildSelectOptions(select);
    if ([...select.options].some(o => o.value === value)) select.value = value;
    Object.assign(select.style, {
      position:'fixed', zIndex:'99999', background:'#071829', color:'#f7fbff', border:'1.5px solid #20d9ff',
      borderRadius:'7px', padding:'4px 8px', fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
      fontSize:'16px', fontWeight:'700', outline:'none'
    });
    select.addEventListener('change', () => onChange(select.value));
    document.body.appendChild(select);
    positionDom(scene, select, x, y, width, 37);
    return select;
  }

  function createSlider(scene, spec) {
    const wrap = document.createElement('div');
    wrap.className = DOM_CLASS;
    Object.assign(wrap.style, {
      position:'fixed', zIndex:'99999', display:'grid', gridTemplateRows:'16px 26px',
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", color:'#f7fbff'
    });
    const label = document.createElement('div');
    Object.assign(label.style, { fontSize:'10px', fontWeight:'800', letterSpacing:'.4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' });
    const input = document.createElement('input');
    input.type = 'range'; input.min = spec.min; input.max = spec.max; input.step = spec.step; input.value = spec.value;
    Object.assign(input.style, { width:'100%', margin:'0', accentColor:'#20d9ff' });
    wrap.append(label, input); document.body.appendChild(wrap);
    const refresh = () => label.textContent = `${spec.label}  ${spec.format(Number(input.value))}`;
    input.addEventListener('input', () => { refresh(); spec.onInput(Number(input.value)); });
    refresh(); positionDom(scene, wrap, spec.x, spec.y, spec.width, 43);
    return { wrap, input, label, reposition:() => positionDom(scene, wrap, spec.x, spec.y, spec.width, 43) };
  }

  function destroyPreview(scene) {
    (scene._labPreviewObjects || []).forEach(o => { try { o?.destroy?.(true); } catch (e) {} });
    scene._labPreviewObjects = [];
  }
  function track(scene, object) { scene._labPreviewObjects ||= []; scene._labPreviewObjects.push(object); return object; }

  function orbitalAllowed(object) { return Number(object?.tier) >= ORBITAL_UNLOCK_TIER; }

  function drawOrbitals(scene, x, y, count, color = C.cyan, radius = 16) {
    count = clamp(whole(count), 0, MAX_LAB_ORBITALS);
    if (!count) return null;
    const g = scene.add.graphics();
    for (let i = 0; i < count; i++) {
      const rx = radius * (1.65 + i * .20), ry = radius * (.62 + i * .075);
      g.lineStyle(1, color, .13).strokeEllipse(x, y, rx * 2, ry * 2);
      const a = (Math.PI * 2 * i / count) + .42;
      g.fillStyle(i % 2 ? color : 0xffe8ac, .92).fillCircle(x + Math.cos(a) * rx, y + Math.sin(a) * ry, Math.max(2.1, radius * .15));
    }
    scene.ui.add(g); return g;
  }

  function tabs(scene, active) {
    const names = ['LAB','EXP','PHS2','PHS3','PHS4'];
    const xs = [45,127,209,291,373];
    names.forEach((name, i) => scene.miniButton(xs[i], scene.Y(TAB_Y), 72, 32, name, name === active ? C.purple : C.cyan, () => {
      if (name === 'LAB') return scene.showDevLab();
      if (name === 'EXP') return scene.showLabExperiment();
      return scene.startLabPhaseRun(name);
    }));
  }

  function renameVisibleDev(scene) {
    (scene.ui?.list || []).forEach(child => {
      if (typeof child?.text === 'string') {
        if (child.text === 'DEV ACCESS') child.setText('LAB ACCESS');
        if (child.text === 'DEV RESULT') child.setText(scene._labExperimentResult ? 'EXP RESULT' : 'LAB RESULT');
      }
      const list = child?.list;
      if (Array.isArray(list)) list.forEach(grand => {
        if (typeof grand?.text === 'string' && grand.text === 'DEV') grand.setText('LAB');
      });
    });
  }

  proto.showHome = function () {
    if (this._labSandboxRun) return this.returnFromLabPhase();
    const result = previousShowHome.call(this);
    renameVisibleDev(this);
    return result;
  };

  proto.showDevPinGate = function () {
    const result = previousShowDevPinGate.call(this);
    renameVisibleDev(this);
    return result;
  };

  proto.showDevLab = function () {
    this.clearUI();
    this.state = 'DEV_LAB';
    this._devModeActive = true;
    this._labSandboxRun = false;
    this._labSandboxPhase = null;
    this._labExperimentResult = false;

    if (!this._devSelectedA) {
      const startTier = Number.isInteger(this._devRunSnapshot?.tierIndex) ? this._devRunSnapshot.tierIndex : 0;
      this._devSelectedA = optionKeyForTier(clamp(startTier, 0, TIERS.length - 1));
    }
    if (!this._devSelectedB) {
      const startTier = Number.isInteger(this._devRunSnapshot?.tierIndex) ? this._devRunSnapshot.tierIndex : 0;
      this._devSelectedB = optionKeyForTier(clamp(startTier + 1, 0, TIERS.length - 1));
    }
    this._devObjectA = objectFromOption(this._devSelectedA);
    this._devObjectB = objectFromOption(this._devSelectedB);
    this._labOrbitalsA = clamp(whole(this._labOrbitalsA), 0, MAX_LAB_ORBITALS);
    this._labOrbitalsB = clamp(whole(this._labOrbitalsB), 0, MAX_LAB_ORBITALS);

    const bg = this.add.graphics(); bg.fillStyle(C.bg,.82).fillRect(0,SAFE_TOP,W,H-SAFE_TOP); this.ui.add(bg);
    this.addText(W/2,this.Y(35),'COLLISION LAB',17,C.white,{ox:.5,bold:true});
    tabs(this,'LAB');
    this.addText(W/2,this.Y(119),'SELECT TWO OBJECTS • SAME IN-GAME APPROACH SIZE',7.6,C.muted,{ox:.5,bold:true,width:390,align:'center'});

    this.addText(22,this.Y(151),'OBJECT A • PLAYER',8.8,C.green,{bold:true});
    this.addText(218,this.Y(151),'OBJECT B • TARGET',8.8,C.orange,{bold:true});

    const panel=this.add.graphics();
    panel.fillStyle(C.panel,.95).fillRoundedRect(14,this.Y(216),392,330,10);
    panel.lineStyle(1.5,C.cyan,.42).strokeRoundedRect(14,this.Y(216),392,330,10);
    panel.lineStyle(1,C.cyan,.17).lineBetween(W/2,this.Y(228),W/2,this.Y(526)); this.ui.add(panel);
    this.addText(W/2,this.Y(237),'IN-GAME APPROACH',7.3,C.muted,{ox:.5,bold:true});

    const refreshPreview=()=>{
      destroyPreview(this);
      const a=this._devObjectA,b=this._devObjectB, ay=this.Y(327),by=this.Y(327);
      if(orbitalAllowed(a)) track(this,drawOrbitals(this,105,ay,this._labOrbitalsA,C.green,DEV_APPROACH_RADIUS));
      if(orbitalAllowed(b)) track(this,drawOrbitals(this,315,by,this._labOrbitalsB,C.orange,DEV_APPROACH_RADIUS));
      track(this,this.drawObject(105,ay,DEV_APPROACH_RADIUS,a,false,false));
      track(this,this.drawObject(315,by,DEV_APPROACH_RADIUS,b,false,false));
      track(this,this.addText(105,this.Y(389),a.realName,8.1,C.green,{ox:.5,bold:true,width:175,align:'center'}));
      track(this,this.addText(315,this.Y(389),b.realName,8.1,C.orange,{ox:.5,bold:true,width:175,align:'center'}));
      track(this,this.addText(105,this.Y(420),`PHYSICAL Ø ${this.sizeText(a.radiusM)}`,6.9,C.muted,{ox:.5,bold:true,width:178,align:'center'}));
      track(this,this.addText(315,this.Y(420),`PHYSICAL Ø ${this.sizeText(b.radiusM)}`,6.9,C.muted,{ox:.5,bold:true,width:178,align:'center'}));
      const aOrb=orbitalAllowed(a)?`ORBITALS ${this._labOrbitalsA}`:'ORBITALS N/A';
      const bOrb=orbitalAllowed(b)?`ORBITALS ${this._labOrbitalsB}`:'ORBITALS N/A';
      track(this,this.addText(105,this.Y(457),aOrb,7.5,orbitalAllowed(a)?C.cyan:C.muted,{ox:.5,bold:true}));
      track(this,this.addText(315,this.Y(457),bOrb,7.5,orbitalAllowed(b)?C.cyan:C.muted,{ox:.5,bold:true}));
      track(this,this.addText(W/2,this.Y(512),'Objects are equal apparent size here. True reveal scale appears after you act.',7.1,C.muted,{ox:.5,bold:true,width:355,align:'center'}));
    };
    this._labRefreshPreview=refreshPreview;
    refreshPreview();

    if(orbitalAllowed(this._devObjectA)){
      this.miniButton(70,this.Y(484),38,28,'−',C.cyan,()=>{this._labOrbitalsA=Math.max(0,this._labOrbitalsA-1);refreshPreview();});
      this.miniButton(140,this.Y(484),38,28,'+',C.cyan,()=>{this._labOrbitalsA=Math.min(MAX_LAB_ORBITALS,this._labOrbitalsA+1);refreshPreview();});
    }
    if(orbitalAllowed(this._devObjectB)){
      this.miniButton(280,this.Y(484),38,28,'−',C.cyan,()=>{this._labOrbitalsB=Math.max(0,this._labOrbitalsB-1);refreshPreview();});
      this.miniButton(350,this.Y(484),38,28,'+',C.cyan,()=>{this._labOrbitalsB=Math.min(MAX_LAB_ORBITALS,this._labOrbitalsB+1);refreshPreview();});
    }

    this.addText(W/2,this.Y(572),'RUN COLLISION AS…',9.2,C.white,{ox:.5,bold:true});
    this.choice(73,this.Y(642),'ABSORB',C.green);
    this.choice(210,this.Y(642),'DEFLECT',C.orange);
    this.choice(347,this.Y(642),'AVOID',C.blue);
    this.addText(W/2,this.Y(699),'A orbitals auto-protect the test using the real orbital risk formula. B orbitals are visual only.',6.8,C.muted,{ox:.5,bold:true,width:360,align:'center'});
    this.wideButton(W/2,this.Y(757),270,40,'BACK HOME',C.muted,()=>this.exitDevLab());

    this._devSelectA=createObjectSelect(this,this._devSelectedA,22,this.Y(176),180,value=>{this._devSelectedA=value;this._devObjectA=objectFromOption(value);if(!orbitalAllowed(this._devObjectA))this._labOrbitalsA=0;refreshPreview();});
    this._devSelectB=createObjectSelect(this,this._devSelectedB,218,this.Y(176),180,value=>{this._devSelectedB=value;this._devObjectB=objectFromOption(value);if(!orbitalAllowed(this._devObjectB))this._labOrbitalsB=0;refreshPreview();});
    const reposition=()=>{positionDom(this,this._devSelectA,22,this.Y(176),180,37);positionDom(this,this._devSelectB,218,this.Y(176),180,37);};
    registerReposition(this,reposition);
  };

  function logMassRange() {
    const min = Math.log10(Math.max(TIERS[0]?.m || 1e-27,1e-300));
    const max = Math.log10(Math.max(TIERS[TIERS.length-1]?.m || 1e47,1e-299));
    return {min,max};
  }
  const MASS_LOG_RANGE=logMassRange();
  function massFromSlider(v){return Math.pow(10,MASS_LOG_RANGE.min+(MASS_LOG_RANGE.max-MASS_LOG_RANGE.min)*(v/100));}
  function speedFromSlider(v){const lo=2,hi=Math.log10(1.5e6);return Math.pow(10,lo+(hi-lo)*(v/100));}
  function nearestTierForMass(mass){let best=0,dist=Infinity;TIERS.forEach((t,i)=>{const d=Math.abs(Math.log10(Math.max(t.m,1e-300))-Math.log10(Math.max(mass,1e-300)));if(d<dist){dist=d;best=i;}});return best;}
  function experimentObject(scene,side){
    const mass=massFromSlider(scene[`_expMass${side}`]);
    const speed=speedFromSlider(scene[`_expSpeed${side}`]);
    const tierIndex=nearestTierForMass(mass),tier=TIERS[tierIndex];
    const massScale=Math.max(.02,mass/Math.max(tier.m,1e-300));
    return {name:tier.name,realName:`EXPERIMENT ${side}`,tier:tierIndex,radiusM:tier.r*Math.cbrt(massScale),massKg:mass,speedMS:speed,kind:tier.kind,color:tier.color,solid:tier.solid,hint:tier.hint,gap:0};
  }

  proto.showLabExperiment=function(){
    this.clearUI(); this.state='DEV_EXP'; this._devModeActive=true; this._labSandboxRun=false; this._labExperimentResult=false;
    this._expMassA=Number.isFinite(this._expMassA)?this._expMassA:46;
    this._expMassB=Number.isFinite(this._expMassB)?this._expMassB:50;
    this._expSpeedA=Number.isFinite(this._expSpeedA)?this._expSpeedA:48;
    this._expSpeedB=Number.isFinite(this._expSpeedB)?this._expSpeedB:48;
    this._expOrbitalsA=clamp(whole(this._expOrbitalsA),0,MAX_LAB_ORBITALS);
    this._expOrbitalsB=clamp(whole(this._expOrbitalsB),0,MAX_LAB_ORBITALS);

    const bg=this.add.graphics();bg.fillStyle(C.bg,.82).fillRect(0,SAFE_TOP,W,H-SAFE_TOP);this.ui.add(bg);
    this.addText(W/2,this.Y(35),'COLLISION EXPERIMENT',17,C.white,{ox:.5,bold:true}); tabs(this,'EXP');
    this.addText(W/2,this.Y(119),'CONTROL THE VARIABLES • A ACTS ON B',7.6,C.muted,{ox:.5,bold:true});
    this.addText(22,this.Y(151),'OBJECT A • PLAYER',8.8,C.green,{bold:true}); this.addText(218,this.Y(151),'OBJECT B • TARGET',8.8,C.orange,{bold:true});

    const panel=this.add.graphics();panel.fillStyle(C.panel,.95).fillRoundedRect(14,this.Y(180),392,270,10);panel.lineStyle(1.5,C.cyan,.42).strokeRoundedRect(14,this.Y(180),392,270,10);panel.lineStyle(1,C.cyan,.17).lineBetween(W/2,this.Y(190),W/2,this.Y(440));this.ui.add(panel);

    const preview=()=>{
      destroyPreview(this);const a=experimentObject(this,'A'),b=experimentObject(this,'B');this._expObjectA=a;this._expObjectB=b;
      if(this._expOrbitalsA)track(this,drawOrbitals(this,105,this.Y(256),this._expOrbitalsA,C.green,DEV_APPROACH_RADIUS));
      if(this._expOrbitalsB)track(this,drawOrbitals(this,315,this.Y(256),this._expOrbitalsB,C.orange,DEV_APPROACH_RADIUS));
      track(this,this.drawObject(105,this.Y(256),DEV_APPROACH_RADIUS,a,false,false));track(this,this.drawObject(315,this.Y(256),DEV_APPROACH_RADIUS,b,false,false));
      track(this,this.addText(105,this.Y(309),TIERS[a.tier].name,7.6,C.green,{ox:.5,bold:true,width:178,align:'center'}));track(this,this.addText(315,this.Y(309),TIERS[b.tier].name,7.6,C.orange,{ox:.5,bold:true,width:178,align:'center'}));
      track(this,this.addText(105,this.Y(337),this.massText(a.massKg),7.2,C.white,{ox:.5,bold:true}));track(this,this.addText(315,this.Y(337),this.massText(b.massKg),7.2,C.white,{ox:.5,bold:true}));
      track(this,this.addText(105,this.Y(359),this.speedText(a.speedMS),7.2,C.white,{ox:.5,bold:true}));track(this,this.addText(315,this.Y(359),this.speedText(b.speedMS),7.2,C.white,{ox:.5,bold:true}));
      track(this,this.addText(W/2,this.Y(422),'Mass chooses the nearest game tier/visual; apparent approach size stays equal.',6.8,C.muted,{ox:.5,bold:true,width:350,align:'center'}));
    };
    preview();

    const sliders=[];
    const add=(spec)=>sliders.push(createSlider(this,{...spec,onInput:v=>{spec.onInput(v);preview();}}));
    add({label:'MASS',min:0,max:100,step:.5,value:this._expMassA,x:22,y:this.Y(468),width:176,format:v=>this.massText(massFromSlider(v)),onInput:v=>this._expMassA=v});
    add({label:'MASS',min:0,max:100,step:.5,value:this._expMassB,x:222,y:this.Y(468),width:176,format:v=>this.massText(massFromSlider(v)),onInput:v=>this._expMassB=v});
    add({label:'SPEED',min:0,max:100,step:1,value:this._expSpeedA,x:22,y:this.Y(523),width:176,format:v=>this.speedText(speedFromSlider(v)),onInput:v=>this._expSpeedA=v});
    add({label:'SPEED',min:0,max:100,step:1,value:this._expSpeedB,x:222,y:this.Y(523),width:176,format:v=>this.speedText(speedFromSlider(v)),onInput:v=>this._expSpeedB=v});
    add({label:'ORBITALS',min:0,max:MAX_LAB_ORBITALS,step:1,value:this._expOrbitalsA,x:22,y:this.Y(578),width:176,format:v=>String(whole(v)),onInput:v=>this._expOrbitalsA=whole(v)});
    add({label:'ORBITALS',min:0,max:MAX_LAB_ORBITALS,step:1,value:this._expOrbitalsB,x:222,y:this.Y(578),width:176,format:v=>String(whole(v)),onInput:v=>this._expOrbitalsB=whole(v)});

    this.addText(W/2,this.Y(641),'RUN EXPERIMENT',8.9,C.white,{ox:.5,bold:true});
    this.miniButton(73,this.Y(688),112,42,'ABSORB',C.green,()=>this.runLabExperiment('ABSORB'));
    this.miniButton(210,this.Y(688),112,42,'DEFLECT',C.orange,()=>this.runLabExperiment('DEFLECT'));
    this.miniButton(347,this.Y(688),112,42,'AVOID',C.blue,()=>this.runLabExperiment('AVOID'));
    this.addText(W/2,this.Y(732),'A orbitals use real protection maths automatically. B orbitals are shown but do not invent a target-defence rule.',6.6,C.muted,{ox:.5,bold:true,width:355,align:'center'});
    this.wideButton(W/2,this.Y(784),250,36,'BACK HOME',C.muted,()=>this.exitDevLab());

    const reposition=()=>sliders.forEach(s=>s.reposition());registerReposition(this,reposition);
  };

  proto.runLabExperiment=function(choice){
    this._devObjectA={...experimentObject(this,'A')};this._devObjectB={...experimentObject(this,'B')};
    this._labOrbitalsA=this._expOrbitalsA;this._labOrbitalsB=this._expOrbitalsB;
    this._labExperimentRunning=true;this._labExperimentResult=true;this._labReturnTab='EXP';
    this.state='DEV_LAB';
    return this.choose(choice);
  };

  function fatalChance(pending){
    if(Number.isFinite(Number(pending?.fatalChance)))return clamp01(Number(pending.fatalChance));
    if(Number.isFinite(Number(pending?.chance)))return clamp01(1-Number(pending.chance));
    return pending?.success===false?1:0;
  }

  function applyLabOrbitals(pending,count){
    const used=clamp(whole(count),0,MAX_ORBITAL_SACRIFICE),baseFatal=fatalChance(pending);
    pending.labOrbitalsUsed=used;pending.labBaseFatalChance=baseFatal;
    if(!used||baseFatal<=0)return pending;
    const newFatal=clamp01(baseFatal*Math.pow(ORBITAL_RISK_MULTIPLIER,used));
    const oldSafe=1-baseFatal,newSafe=1-newFatal,scale=oldSafe>0?newSafe/oldSafe:0,roll=Math.random();
    pending.fatalChance=newFatal;pending.chance=newSafe;
    if(pending.choice==='ABSORB'){
      const keys=['absorbChance','cleanChance','mergeChance','fragmentChance','setbackChance'].filter(k=>Number(pending[k])>0);
      if(oldSafe>0&&keys.length)keys.forEach(k=>pending[k]=Number(pending[k])*scale);
      if(roll<newFatal){pending.result='catastrophic';pending.success=false;return pending;}
      let cursor=newFatal;const ordered=[['absorbChance','absorb'],['cleanChance','clean'],['mergeChance','merge'],['fragmentChance','fragment'],['setbackChance','setback']].filter(([k])=>Number(pending[k])>0);
      pending.result=ordered.length?ordered[ordered.length-1][1]:'fragment';
      for(const[k,result]of ordered){cursor+=Number(pending[k]);if(roll<cursor){pending.result=result;break;}}
      pending.success=pending.result!=='catastrophic';return pending;
    }
    if(pending.choice==='DEFLECT'){
      const clean=Math.max(0,Number(pending.cleanChance)||0),rough=Math.max(0,oldSafe-clean);
      pending.cleanChance=oldSafe>0?clean*scale:newSafe*.45;pending.roughChance=oldSafe>0?rough*scale:newSafe*.55;
      pending.result=roll<newFatal?'catastrophic':roll<newFatal+pending.cleanChance?'clean':'rough';pending.success=pending.result!=='catastrophic';return pending;
    }
    pending.success=roll>=newFatal;return pending;
  }

  proto.outcome=function(choice){
    const pending=previousOutcome.call(this,choice);
    const inLabTest=this._devModeActive&&(this.state==='DEV_LAB'||this._labExperimentRunning);
    if(!inLabTest)return pending;
    return applyLabOrbitals(pending,this._labOrbitalsA);
  };

  proto.choose=function(choice){
    if(this._devModeActive&&this.state==='DEV_LAB'){
      this.orbitalCount=clamp(whole(this._labOrbitalsA),0,MAX_LAB_ORBITALS);
      this.orbitalProgress=0;this.orbitalsUnlocked=this.player?.tier>=ORBITAL_UNLOCK_TIER||this._devObjectA?.tier>=ORBITAL_UNLOCK_TIER;
    }
    return previousChoose.call(this,choice);
  };

  proto.showDevResult=function(){
    const result=previousShowDevResult.call(this);renameVisibleDev(this);
    if(this.pending?.labOrbitalsUsed>0){
      this.addText(W/2,this.Y(600),`A ORBITALS AUTO-USED ${this.pending.labOrbitalsUsed} • FATAL RISK ${Math.round(this.pending.labBaseFatalChance*100)}% → ${Math.round((this.pending.fatalChance||0)*100)}%`,6.8,C.purple,{ox:.5,bold:true,width:360,align:'center'});
    }
    this._labExperimentRunning=false;
    return result;
  };

  const originalShowDevLab=proto.showDevLab;
  proto.showDevLab=function(){
    if(this._labReturnTab==='EXP'){this._labReturnTab=null;return this.showLabExperiment();}
    return originalShowDevLab.call(this);
  };

  function preferredRegion(id,fallback='outer-heliosphere'){return REGIONS.some(r=>r.id===id)?id:(REGIONS.some(r=>r.id===fallback)?fallback:REGIONS[0]?.id);}

  proto.startLabPhaseRun=function(phase){
    phase=String(phase||'PHS2').toUpperCase();
    let tierIndex=PHS2_TIER,region=preferredRegion('kuiper-belt'),orbitals=0;
    if(phase==='PHS3'){tierIndex=PHS3_TIER;region=preferredRegion('hyperspace');orbitals=2;}
    if(phase==='PHS4'){tierIndex=PHS4_TIER;region='hyperspace';orbitals=3;}

    this.clearUI();
    this._labSandboxRun=true;this._labSandboxPhase=phase;this._devModeActive=false;this._devPhase4Test=false;
    this.runActive=true;this.state='LAB_PHASE_START';this.tierIndex=tierIndex;this.growth=0;this.craters=orbitals;this.encounters=0;this.absorbs=0;this.score=0;
    this.regionId=region;this.lastRegionPromptEncounter=-1;this.runStarted=Date.now();this.other=null;this.pending=null;this.preEncounterPlayer=null;this.preEncounterOther=null;this.actionHistory=[];
    this.collectedIdentityIds=[];this.collectionBonusScore=0;this.manualSaves=0;this.manualLoads=0;this.scorePenalty=0;this.orbitalCount=orbitals;this.orbitalProgress=0;this.orbitalsUnlocked=tierIndex>=ORBITAL_UNLOCK_TIER;
    this.systemCaptures=phase==='PHS4'?3:0;this.finaleMergeCount=0;this.universeCount=0;
    this.setPlayer(true);if(this.player&&phase==='PHS4')this.player.phase4CaptureCount=this.systemCaptures;
    return this.startEncounter();
  };

  proto.returnFromLabPhase=function(){
    this._labSandboxRun=false;this._labSandboxPhase=null;this._devModeActive=true;this._devPhase4Test=false;this.other=null;this.pending=null;
    return this.showDevLab();
  };

  proto.save=function(silent=false){
    if(this._labSandboxRun){if(!silent)this.toast(`${this._labSandboxPhase} LAB • SAVE DISABLED`,C.orange);return true;}
    return previousSave.call(this,silent);
  };
  proto.load=function(){if(this._labSandboxRun){this.toast(`${this._labSandboxPhase} LAB • LOAD DISABLED`,C.orange);return false;}return previousLoad.call(this);};
  proto.qualifies=function(){if(this._labSandboxRun)return false;return previousQualifies.call(this);};
  proto.recordScore=function(){if(this._labSandboxRun)return;return previousRecordScore.call(this);};
  proto.saveScoreAs=function(name){if(this._labSandboxRun)return;return previousSaveScoreAs.call(this,name);};

  proto.resetRun=function(){if(this._labSandboxRun){const phase=this._labSandboxPhase;return this.startLabPhaseRun(phase);}return previousResetRun.call(this);};

  function addLabReturn(scene,label='LAB'){if(scene._labSandboxRun)scene.miniButton(48,scene.Y(18),72,24,label,C.purple,()=>scene.returnFromLabPhase());}
  proto.startUniverseFinale=function(){const result=previousStartUniverseFinale.call(this);addLabReturn(this);return result;};
  proto.completeUniverseAssembly=function(){const result=previousCompleteUniverseAssembly.call(this);addLabReturn(this);return result;};
  proto.showUniverseAtomEncounter=function(){const result=previousShowUniverseAtomEncounter.call(this);addLabReturn(this);return result;};
  proto.finishUniverse=function(){const result=previousFinishUniverse.call(this);addLabReturn(this);return result;};

  window.CometLabSuite=Object.freeze({
    tabs:['LAB','EXP','PHS2','PHS3','PHS4'],
    phaseStarts:{PHS2:PHS2_TIER,PHS3:PHS3_TIER,PHS4:PHS4_TIER},
    sandboxSaves:false,
    experiment:{mass:'logarithmic',speed:'logarithmic',orbitals:[0,MAX_LAB_ORBITALS],playerOrbitalsUseGameRiskFormula:true,targetOrbitalsVisualOnly:true}
  });
})();
