// Phase-specific strategic regions.
// Four fixed region buttons are reused in every phase; each phase supplies four real astronomical environments.
// Region choice is now the main encounter-distribution risk/reward control.
(() => {
  const proto = GameScene.prototype;
  const P4 = window.CometPhase4 || {};
  const ROCKY = TIERS.findIndex(t => t.name === 'ROCKY PLANET');
  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const GALAXY = P4.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY');
  const CLUSTER = P4.clusterTier ?? TIERS.findIndex(t => t.name === 'GALAXY CLUSTER');
  const SUPERCLUSTER = P4.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER');

  const PHASE_REGIONS = Object.freeze({
    1: Object.freeze([
      {id:'zodiacal-cloud',name:'ZODIACAL CLOUD',short:'ZODIACAL CLOUD',science:'Interplanetary dust around the Sun',common:'atoms • dust • tiny debris',chance:.88,pool:[0,0,0,1,1,1,1,2,2,3],risk:'SAFER'},
      {id:'main-asteroid-belt',name:'MAIN ASTEROID BELT',short:'MAIN ASTEROID BELT',science:'Rocky belt between Mars and Jupiter',common:'meteorites • asteroids • debris',chance:.88,pool:[1,2,2,3,3,3,6,6,6,7],risk:'RISKY'},
      {id:'kuiper-belt',name:'KUIPER BELT',short:'KUIPER BELT',science:'Icy belt beyond Neptune',common:'comets • icy bodies • dwarf planets',chance:.90,pool:[4,4,4,5,5,5,6,7,7],risk:'HIGHER RISK'},
      {id:'scattered-disc',name:'SCATTERED DISC',short:'SCATTERED DISC',science:'Dynamically scattered outer-system objects',common:'large comets • asteroids • dwarf planets',chance:.92,pool:[5,5,6,6,6,7,7,7,7],risk:'FASTEST / RISKIEST'}
    ]),
    2: Object.freeze([
      {id:'inner-solar-system',name:'INNER SOLAR SYSTEM',short:'INNER SOLAR SYSTEM',science:'Rocky worlds in the Sunward system',common:'rocky planets • the Sun',chance:.88,pool:[8,8,8,8,8,10,10],risk:'SAFER'},
      {id:'outer-solar-system',name:'OUTER SOLAR SYSTEM',short:'OUTER SOLAR SYSTEM',science:'Realm of the giant planets',common:'gas planets • distant worlds • stars',chance:.88,pool:[8,9,9,9,9,9,10,10],risk:'STEADY'},
      {id:'solar-neighbourhood',name:'SOLAR NEIGHBOURHOOD',short:'SOLAR NEIGHBOURHOOD',science:'Nearby stars around the Milky Way',common:'yellow dwarfs • giant stars',chance:.90,pool:[9,10,10,10,10,11,11,12],risk:'HIGHER RISK'},
      {id:'orion-molecular-cloud',name:'ORION MOLECULAR CLOUD',short:'ORION MOLECULAR CLOUD',science:'Nearby massive star-forming complex',common:'young stars • giants • nebulae',chance:.92,pool:[10,11,11,11,12,12,13,13,13],risk:'FASTEST / RISKIEST'}
    ]),
    3: Object.freeze([
      {id:'supernova-remnant',name:'SUPERNOVA REMNANT',short:'SUPERNOVA REMNANT',science:'Debris surrounding a dead massive star',common:'pulsars • stellar black holes',chance:.90,pool:[14,14,14,14,14,15,15,16],risk:'SAFER'},
      {id:'globular-cluster',name:'GLOBULAR CLUSTER',short:'GLOBULAR CLUSTER',science:'Dense ancient stellar population',common:'pulsars • stellar black holes',chance:.90,pool:[14,14,14,15,15,15,15,16],risk:'STEADY'},
      {id:'galactic-bulge',name:'GALACTIC BULGE',short:'GALACTIC BULGE',science:'Dense inner region of the Milky Way',common:'black holes • compact remnants',chance:.92,pool:[14,15,15,15,15,16,16],risk:'HIGHER RISK'},
      {id:'galactic-centre',name:'GALACTIC CENTRE',short:'GALACTIC CENTRE',science:'Extreme environment around the galactic nucleus',common:'black holes • supermassive black holes',chance:.94,pool:[15,15,15,16,16,16,16,16],risk:'FASTEST / RISKIEST'}
    ]),
    4: Object.freeze([
      {id:'local-group',name:'LOCAL GROUP',short:'LOCAL GROUP',science:'Our nearby family of galaxies',common:'dwarf galaxies • peer galaxies',chance:1,pool:[15,16,17,17,17,17,18],risk:'SAFER',p4Weights:{compact:.12,dwarf:.28,galaxy:.50,cluster:.10}},
      {id:'virgo-cluster',name:'VIRGO CLUSTER',short:'VIRGO CLUSTER',science:'A rich nearby galaxy cluster',common:'galaxies • groups • galaxy clusters',chance:1,pool:[16,17,17,17,18,18,18],risk:'STEADY',p4Weights:{compact:.04,dwarf:.16,galaxy:.48,cluster:.32}},
      {id:'laniakea-supercluster',name:'LANIAKEA SUPERCLUSTER',short:'LANIAKEA SUPERCLUSTER',science:'The supercluster containing our local region',common:'galaxies • groups • rich clusters',chance:1,pool:[17,17,18,18,18,18,18],risk:'HIGHER RISK',p4Weights:{compact:.02,dwarf:.08,galaxy:.35,cluster:.55}},
      {id:'cosmic-web',name:'COSMIC WEB',short:'COSMIC WEB',science:'Filaments and nodes of large-scale structure',common:'massive galaxies • rich clusters',chance:1,pool:[17,18,18,18,18,18,18,18],risk:'FASTEST / RISKIEST',p4Weights:{compact:.01,dwarf:.04,galaxy:.20,cluster:.75}}
    ])
  });

  const ALL_REGIONS = Object.values(PHASE_REGIONS).flat();
  const REGION_BY_ID = new Map(ALL_REGIONS.map(r => [r.id, r]));
  const LEGACY_MAP = Object.freeze({
    'outer-heliosphere':'zodiacal-cloud','oort-cloud':'kuiper-belt','scattered-disk':'scattered-disc',
    'kuiper-belt':'kuiper-belt','asteroid-belt':'main-asteroid-belt','inner-solar':'inner-solar-system',
    'outer-solar':'outer-solar-system','hyperspace':'cosmic-web','deep-cosmos':'local-group'
  });

  // Keep the historical global REGIONS array authoritative for save validation and older wrappers.
  REGIONS.splice(0, REGIONS.length, ...ALL_REGIONS);

  function phaseForTier(tierIndex) {
    const t = Number(tierIndex) || 0;
    if (ROCKY >= 0 && t < ROCKY) return 1;
    if (PULSAR >= 0 && t < PULSAR) return 2;
    if (GALAXY >= 0 && t < GALAXY) return 3;
    return 4;
  }

  function regionsFor(scene) {
    return PHASE_REGIONS[phaseForTier(scene.tierIndex)] || PHASE_REGIONS[1];
  }

  function currentRegion(scene) {
    const available = regionsFor(scene);
    let r = REGION_BY_ID.get(scene.regionId);
    if (r && available.includes(r)) return r;

    const migrated = REGION_BY_ID.get(LEGACY_MAP[scene.regionId]);
    if (migrated && available.includes(migrated)) r = migrated;
    else r = available[0];
    scene.regionId = r.id;
    return r;
  }

  function weightedIndex(pool) {
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  function localTier(scene, phase) {
    const ranges = {1:[0,7],2:[8,13],3:[14,16]};
    const [lo,hi] = ranges[phase];
    const p = clamp(Number(scene.tierIndex) || lo, lo, hi);
    const choices = [p,p,p,p,clamp(p-1,lo,hi),clamp(p+1,lo,hi),clamp(p+1,lo,hi)];
    if (p + 2 <= hi) choices.push(p + 2);
    return weightedIndex(choices);
  }

  function objectForTier(scene, index, region) {
    const t = TIERS[index];
    const o = {
      name:t.name,
      realName:scene.exampleName(t),
      tier:index,
      radiusM:t.r*Math.pow(10,Phaser.Math.FloatBetween(-.08,.08)),
      massKg:t.m*Math.pow(10,Phaser.Math.FloatBetween(-.14,.14)),
      speedMS:t.v*Phaser.Math.FloatBetween(.78,1.28),
      kind:t.kind,color:t.color,solid:t.solid,hint:t.hint,
      gap:index-scene.tierIndex,
      originRegionId:region.id
    };
    if (typeof pickCometNamedIdentity === 'function') {
      const identity = pickCometNamedIdentity(o.name);
      if (identity) {
        o.identityId=identity.id;
        o.realName=identity.name;
        o.namedSpriteBase=identity.spriteVariant;
        o.scienceClass=identity.scienceClass;
        o.identityStatus=identity.status;
      }
    }
    return o;
  }

  const priorPickOpponent = proto.pickOpponent;
  function p4Category(o) {
    if (!o) return 'galaxy';
    if (Number(o.tier) <= 16 || ['blackhole','pulsar','nebula','starcluster'].includes(o.kind)) return 'compact';
    if (o.kind === 'cluster' || (CLUSTER >= 0 && Number(o.tier) >= CLUSTER)) return 'cluster';
    if (o.kind === 'galaxy' && (o.galaxyProfile === 'dwarf' || /DWARF/i.test(`${o.name||''} ${o.realName||''}`))) return 'dwarf';
    return 'galaxy';
  }

  function choosePhase4Candidate(scene, region) {
    const candidates=[];
    // Sampling the mature Phase-4 generator preserves its exact members, named systems and transfer mechanics;
    // the region weights decide which of those scientifically valid candidates reaches the player.
    for (let i=0;i<14;i++) {
      const o=priorPickOpponent.call(scene);
      if (!o) continue;
      // Phase 1/2 objects are intentionally absent as standalone Phase-4 encounters.
      if (Number(o.tier) < 14) continue;
      candidates.push(o);
    }
    if (!candidates.length) return priorPickOpponent.call(scene);
    const weights=region.p4Weights || {compact:.05,dwarf:.15,galaxy:.50,cluster:.30};
    let total=0;
    const scored=candidates.map(o=>{
      const w=Math.max(.001,Number(weights[p4Category(o)])||.001);
      total+=w;return {o,w};
    });
    let roll=Math.random()*total;
    let chosen=scored[scored.length-1].o;
    for (const item of scored) { roll-=item.w; if (roll<=0) { chosen=item.o; break; } }
    chosen.originRegionId=region.id;
    return chosen;
  }

  proto.region = function() {
    return currentRegion(this);
  };

  proto.pickOpponent = function() {
    const phase=phaseForTier(this.tierIndex),region=currentRegion(this);
    if (phase === 4 && this.tierIndex < SUPERCLUSTER) return choosePhase4Candidate(this,region);
    if (phase <= 3) {
      const idx=Math.random()<region.chance ? weightedIndex(region.pool) : localTier(this,phase);
      return objectForTier(this,idx,region);
    }
    return priorPickOpponent.call(this);
  };

  const priorStartEncounter = proto.startEncounter;
  proto.startEncounter = function() {
    currentRegion(this);
    const selectable = !this._devModeActive && this.tierIndex < SUPERCLUSTER;
    if (selectable && this.encounters > 0 && this.encounters % 4 === 0 && this.lastRegionPromptEncounter !== this.encounters) {
      return this.showRegionSelect();
    }
    return priorStartEncounter.call(this);
  };

  proto.showRegionSelect = function() {
    this.clearUI();
    this.state='REGION';
    this.drawHud(false);
    const phase=phaseForTier(this.tierIndex);
    this.addText(W/2,this.Y(154),`PHASE ${phase} • CHOOSE YOUR REGION`,16,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(180),'SAFER REGIONS GROW SLOWER • RISKIER REGIONS OFFER BIGGER ENCOUNTERS',8.1,C.muted,{ox:.5,bold:true,width:390,align:'center'});
    regionsFor(this).forEach((r,i)=>this.regionButton(108+(i%2)*204,this.Y(247+Math.floor(i/2)*126),r));
  };

  proto.regionButton = function(x,y,r) {
    const sel=r.id===currentRegion(this).id,c=this.add.container(x,y),g=this.add.graphics(),color=sel?C.green:C.cyan;
    g.fillStyle(color,sel?.16:.08).fillRoundedRect(-94,-54,188,108,7);
    g.lineStyle(sel?2:1.5,color,.9).strokeRoundedRect(-94,-54,188,108,7);
    const a=this.add.text(0,-35,r.name,{fontFamily:FONT,fontSize:'9.6px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:174}}).setOrigin(.5);
    const b=this.add.text(0,-9,r.science,{fontFamily:FONT,fontSize:'7.5px',color:'#8db7ca',align:'center',wordWrap:{width:170}}).setOrigin(.5);
    const d=this.add.text(0,18,`COMMON: ${r.common}`,{fontFamily:FONT,fontSize:'6.8px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`,align:'center',wordWrap:{width:174}}).setOrigin(.5);
    const e=this.add.text(0,39,r.risk,{fontFamily:FONT,fontSize:'6.6px',fontStyle:'bold',color:`#${(r.risk.includes('RISK')?C.orange:C.muted).toString(16).padStart(6,'0')}`}).setOrigin(.5);
    const hit=this.add.rectangle(0,0,188,108,0xffffff,.001).setInteractive({useHandCursor:true});
    [a,b,d,e].forEach(t=>t.setResolution&&t.setResolution(Math.min(window.devicePixelRatio||1,3)));
    hit.on('pointerdown',()=>{
      this.regionId=r.id;
      this.lastRegionPromptEncounter=this.encounters;
      this.save(true);
      this.other=this.pickOpponent();
      this.drawEncounter();
    });
    c.add([g,a,b,d,e,hit]);this.ui.add(c);
  };

  // Phase 4's specialised HUD used to hard-code DEEP COSMOS. Replace that one label after it draws.
  const priorDrawHud = proto.drawHud;
  proto.drawHud = function(controls=false) {
    const result=priorDrawHud.call(this,controls);
    if (phaseForTier(this.tierIndex) !== 4 || !this.ui) return result;
    const label=currentRegion(this).short;
    const walk=node=>{
      if (!node) return;
      if (typeof node.text==='string' && typeof node.setText==='function' && node.text==='DEEP COSMOS') {
        node.setText(label); node.setFontSize?.(label.length>18?'7.5px':'9.2px');
      }
      if (Array.isArray(node.list)) node.list.forEach(walk);
    };
    walk(this.ui);
    return result;
  };

  // Reuse the established procedural background themes while the new region names carry the mechanics.
  if (typeof proto.drawRegionBackdropSide === 'function') {
    const priorBackdropSide=proto.drawRegionBackdropSide;
    const THEME_ALIAS={
      'zodiacal-cloud':'inner-solar','main-asteroid-belt':'asteroid-belt','kuiper-belt':'kuiper-belt','scattered-disc':'scattered-disk',
      'inner-solar-system':'inner-solar','outer-solar-system':'outer-solar','solar-neighbourhood':'outer-heliosphere','orion-molecular-cloud':'hyperspace',
      'supernova-remnant':'scattered-disk','globular-cluster':'outer-heliosphere','galactic-bulge':'inner-solar','galactic-centre':'hyperspace',
      'local-group':'outer-heliosphere','virgo-cluster':'outer-solar','laniakea-supercluster':'scattered-disk','cosmic-web':'hyperspace'
    };
    proto.drawRegionBackdropSide=function(regionId,side,seedValue){
      return priorBackdropSide.call(this,THEME_ALIAS[regionId]||regionId,side,seedValue);
    };
  }

  window.CometPhaseRegions = Object.freeze({
    version:1,
    phaseForTier,
    regionsForPhase:phase=>PHASE_REGIONS[phase]||[],
    allRegions:ALL_REGIONS.map(r=>r.id)
  });
})();
