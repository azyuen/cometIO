// Phase 4 v2: dynamic gravitational systems.
// Player identity changes from a single object to a living system: central SMBH + captured members.
// Existing sprites render Nebula/Pulsar/Black Hole members; galaxies/clusters are procedurally animated.
(() => {
  if (!window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const SMBH = P4.firstTier;
  const GALAXY = P4.galaxyTier;
  const CLUSTER = P4.clusterTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const NEBULA = TIERS.findIndex(t => t.name === 'NEBULA');
  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const BLACK_HOLE = TIERS.findIndex(t => t.name === 'BLACK HOLE');
  const SAVE_KEYS = [typeof SAVE_KEY !== 'undefined' ? SAVE_KEY : null, 'cometio-manual-checkpoint-v1'].filter(Boolean);
  const MAX_VISIBLE_MEMBERS = 9;
  const SYSTEM_VERSION = 2;

  const previousResetRun = proto.resetRun;
  const previousSetPlayer = proto.setPlayer;
  const previousStartEncounter = proto.startEncounter;
  const previousPickOpponent = proto.pickOpponent;
  const previousDrawHud = proto.drawHud;
  const previousDrawArena = proto.drawArena;
  const previousDrawPrompt = proto.drawPrompt;
  const previousDrawObject = proto.drawObject;
  const previousChoose = proto.choose;
  const previousOutcome = proto.outcome;
  const previousReveal = proto.reveal;
  const previousAnimate = proto.animate;
  const previousResolve = proto.resolve;
  const previousDrawResult = proto.drawResult;
  const previousSave = proto.save;
  const previousLoad = proto.load;
  const previousContinueNextUniverse = proto.continueNextUniverse;

  const whole = n => Math.max(0, Math.floor(Number(n) || 0));
  const clamp01 = n => clamp(Number(n) || 0, 0, 1);

  function active(scene) {
    return !scene._devModeActive && scene.tierIndex >= SMBH && scene.tierIndex <= SUPERCLUSTER;
  }

  function playable(scene) {
    return active(scene) && scene.tierIndex < SUPERCLUSTER;
  }

  function progress(scene) {
    const t = TIERS[scene.tierIndex];
    if (!t || scene.tierIndex >= SUPERCLUSTER) return 1;
    return clamp01(scene.growth / Math.max(.001, Number(t.need) || 1));
  }

  function tierObject(index, overrides = {}) {
    const t = TIERS[index] || TIERS[0];
    return {
      name: overrides.name || t.name,
      realName: overrides.realName || overrides.name || t.name,
      tier: index,
      radiusM: Number(overrides.radiusM) || t.r,
      massKg: Number(overrides.massKg) || t.m,
      speedMS: Number(overrides.speedMS) || t.v,
      kind: overrides.kind || t.kind,
      color: overrides.color || t.color,
      solid: false,
      hint: overrides.hint || t.hint,
      galaxyProfile: overrides.galaxyProfile,
      clusterProfile: overrides.clusterProfile,
      phase4Structure: overrides.phase4Structure !== false
    };
  }

  function memberFromObject(object, source = 'capture') {
    return {
      name: object.realName || object.name,
      tier: Number(object.tier) || 0,
      radiusM: Number(object.radiusM) || TIERS[object.tier]?.r || 1,
      massKg: Number(object.massKg) || TIERS[object.tier]?.m || 1,
      speedMS: Number(object.speedMS) || TIERS[object.tier]?.v || 0,
      kind: object.kind || TIERS[object.tier]?.kind || 'matter',
      color: object.color || TIERS[object.tier]?.color || C.cyan,
      galaxyProfile: object.galaxyProfile || null,
      clusterProfile: object.clusterProfile || null,
      source
    };
  }

  function seedTemplates() {
    return [
      tierObject(NEBULA, { name:'ORION-LIKE NEBULA', realName:'ORION-LIKE NEBULA' }),
      tierObject(PULSAR, { name:'PULSAR', realName:'PULSAR' }),
      tierObject(BLACK_HOLE, { name:'STELLAR BLACK HOLE', realName:'STELLAR BLACK HOLE' }),
      tierObject(NEBULA, { name:'STAR-FORMING NEBULA', realName:'STAR-FORMING NEBULA' }),
      tierObject(PULSAR, { name:'NEUTRON-STAR BEACON', realName:'NEUTRON-STAR BEACON' })
    ];
  }

  function seedMembers(scene) {
    const inheritedOrbitals = Math.min(3, Math.max(whole(scene.orbitalCount), whole(scene.craters)));
    const scoreBonus = Math.min(5, Math.floor(Math.sqrt(Math.max(0, Number(scene.score) || 0) / 500)));
    const count = clamp(3 + scoreBonus + inheritedOrbitals, 3, 11);
    const templates = seedTemplates();
    scene.phase4Members = [];
    for (let i = 0; i < count; i++) {
      const base = templates[i % templates.length];
      scene.phase4Members.push(memberFromObject({ ...base, realName: base.realName }, i < 3 ? 'phase3-score' : (i < 3 + scoreBonus ? 'phase3-score' : 'inherited-orbital')));
    }
    scene.phase4MembersInitialized = true;
    scene.phase4SeedScore = Number(scene.score) || 0;
    scene.phase4SeedInheritedOrbitals = inheritedOrbitals;
    scene.systemCaptures = scene.phase4Members.length;
    const initialPct = clamp(.24 + count * .055, .32, .78);
    scene.growth = Math.max(Number(scene.growth) || 0, TIERS[SMBH].need * initialPct);
    scene.phase4BirthShown = false;
  }

  function ensureMembers(scene) {
    if (!Array.isArray(scene.phase4Members)) scene.phase4Members = [];
    if (!scene.phase4MembersInitialized && scene.tierIndex >= SMBH && scene.tierIndex < SUPERCLUSTER) seedMembers(scene);
    scene.systemCaptures = scene.phase4Members.length;
    return scene.phase4Members;
  }

  function syncPlayer(scene) {
    if (!scene.player || !active(scene)) return;
    ensureMembers(scene);
    const t = TIERS[scene.tierIndex];
    const pct = progress(scene);
    const memberBoost = 1 + Math.min(.22, scene.phase4Members.length * .012);
    scene.player.massKg = t.m * (.72 + .58 * pct) * memberBoost;
    scene.player.phase4System = true;
    scene.player.phase4CaptureCount = scene.phase4Members.length;
    scene.systemCaptures = scene.phase4Members.length;
  }

  const GALAXY_SPECS = [
    { name:'ANDROMEDA GALAXY', profile:'andromeda', massKg:1.45e42, radiusM:5.8e20, color:0xaed2ff },
    { name:'MILKY WAY', profile:'milkyway', massKg:1.05e42, radiusM:5.1e20, color:0x9ecfff },
    { name:'WHIRLPOOL GALAXY', profile:'whirlpool', massKg:4.2e41, radiusM:3.6e20, color:0x93d8ff },
    { name:'SOMBRERO GALAXY', profile:'sombrero', massKg:8.2e41, radiusM:3.9e20, color:0xffd6a0 },
    { name:'PINWHEEL GALAXY', profile:'pinwheel', massKg:5.8e41, radiusM:4.3e20, color:0xaad8ff },
    { name:'TRIANGULUM GALAXY', profile:'triangulum', massKg:8.5e40, radiusM:2.8e20, color:0x8fc9ff }
  ];

  const CLUSTER_SPECS = [
    { name:'GALAXY GROUP', profile:'group', massKg:1.8e44, radiusM:1.6e22, color:0x90dcff },
    { name:'VIRGO CLUSTER', profile:'virgo', massKg:6.0e44, radiusM:3.6e22, color:0x80d7ff },
    { name:'PERSEUS CLUSTER', profile:'perseus', massKg:9.0e44, radiusM:4.4e22, color:0x9acfff },
    { name:'COMA CLUSTER', profile:'coma', massKg:1.35e45, radiusM:5.2e22, color:0xc2a4ff }
  ];

  function galaxyObject(spec) {
    return tierObject(GALAXY, {
      name: spec.name,
      realName: spec.name,
      massKg: spec.massKg,
      radiusM: spec.radiusM,
      speedMS: TIERS[GALAXY].v * Phaser.Math.FloatBetween(.82, 1.18),
      kind: 'galaxy',
      color: spec.color,
      galaxyProfile: spec.profile,
      hint: 'A distinct galaxy whose whole system can interact with yours.'
    });
  }

  function clusterObject(spec) {
    return tierObject(CLUSTER, {
      name: spec.name,
      realName: spec.name,
      massKg: spec.massKg,
      radiusM: spec.radiusM,
      speedMS: TIERS[CLUSTER].v * Phaser.Math.FloatBetween(.82, 1.18),
      kind: 'cluster',
      color: spec.color,
      clusterProfile: spec.profile,
      hint: 'A gravitationally bound collection of galaxies.'
    });
  }

  function weightedPick(items) {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = Math.random() * total;
    for (const i of items) { r -= i.w; if (r <= 0) return i.value(); }
    return items[items.length - 1].value();
  }

  function systemOpponent(scene) {
    if (scene.tierIndex === SMBH) {
      return weightedPick([
        { w:.23, value:() => tierObject(NEBULA, { realName:Phaser.Math.RND.pick(TIERS[NEBULA].examples), name:'NEBULA' }) },
        { w:.18, value:() => tierObject(PULSAR, { realName:Phaser.Math.RND.pick(TIERS[PULSAR].examples), name:'PULSAR' }) },
        { w:.18, value:() => tierObject(BLACK_HOLE, { realName:Phaser.Math.RND.pick(TIERS[BLACK_HOLE].examples), name:'BLACK HOLE' }) },
        { w:.19, value:() => tierObject(SMBH, { name:'GLOBULAR CLUSTER', realName:'GLOBULAR CLUSTER', massKg:3e36, radiusM:5e18, speedMS:90000, kind:'starcluster', color:0xffe9a8 }) },
        { w:.14, value:() => galaxyObject({ name:'DWARF SATELLITE GALAXY', profile:'dwarf', massKg:7e39, radiusM:1.2e20, color:0xa6c9ff }) },
        { w:.08, value:() => galaxyObject(GALAXY_SPECS[5]) }
      ]);
    }

    if (scene.tierIndex === GALAXY) {
      return weightedPick([
        { w:.13, value:() => tierObject(BLACK_HOLE, { realName:Phaser.Math.RND.pick(TIERS[BLACK_HOLE].examples), name:'BLACK HOLE' }) },
        { w:.15, value:() => galaxyObject({ name:'DWARF GALAXY', profile:'dwarf', massKg:4e40, radiusM:1.5e20, color:0xa6c9ff }) },
        { w:.56, value:() => galaxyObject(Phaser.Math.RND.pick(GALAXY_SPECS)) },
        { w:.16, value:() => clusterObject(CLUSTER_SPECS[0]) }
      ]);
    }

    return weightedPick([
      { w:.34, value:() => galaxyObject(Phaser.Math.RND.pick(GALAXY_SPECS)) },
      { w:.20, value:() => galaxyObject({ name:'DWARF GALAXY', profile:'dwarf', massKg:5e40, radiusM:1.5e20, color:0xa6c9ff }) },
      { w:.46, value:() => clusterObject(Phaser.Math.RND.pick(CLUSTER_SPECS)) }
    ]);
  }

  function addEmbedded(scene, parent, object, x, y, radius) {
    const visual = previousDrawObject.call(scene, 0, 0, radius, object, false, false);
    if (!visual) return null;
    if (visual.parentContainer === scene.ui) scene.ui.remove(visual);
    visual.setPosition(x, y);
    parent.add(visual);
    return visual;
  }

  function galaxyArms(g, radius, color, profile = 'generic', mystery = false) {
    const alpha = mystery ? .17 : .30;
    const strong = mystery ? .20 : .42;
    const cfg = {
      andromeda:{arms:2, turns:1.35, flat:.36, bar:0, companion:false},
      milkyway:{arms:4, turns:1.30, flat:.56, bar:.34, companion:false},
      whirlpool:{arms:2, turns:1.62, flat:.74, bar:0, companion:true},
      sombrero:{arms:1, turns:.45, flat:.22, bar:0, companion:false},
      pinwheel:{arms:4, turns:1.68, flat:.92, bar:0, companion:false},
      triangulum:{arms:3, turns:1.40, flat:.84, bar:0, companion:false},
      dwarf:{arms:2, turns:.86, flat:.78, bar:0, companion:false},
      generic:{arms:3, turns:1.45, flat:.68, bar:0, companion:false}
    }[profile] || null;
    const c = cfg || {arms:3, turns:1.45, flat:.68, bar:0, companion:false};

    g.fillStyle(color, mystery ? .035 : .065).fillEllipse(0, 0, radius * 2.15, radius * (1.15 * c.flat + .32));
    for (let arm = 0; arm < c.arms; arm++) {
      const start = arm * Math.PI * 2 / c.arms;
      g.lineStyle(Math.max(3, radius * .13), color, alpha * .36);
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, a = start + t * Math.PI * c.turns;
        const d = radius * (.10 + .92 * t);
        const x = Math.cos(a) * d, y = Math.sin(a) * d * c.flat;
        if (!i) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.strokePath();
      g.lineStyle(Math.max(1.1, radius * .038), mystery ? 0x778391 : 0xffffff, strong * .42);
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, a = start + t * Math.PI * c.turns;
        const d = radius * (.10 + .92 * t);
        const x = Math.cos(a) * d, y = Math.sin(a) * d * c.flat;
        if (!i) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.strokePath();
    }
    if (c.bar) g.lineStyle(Math.max(3, radius * .13), color, mystery ? .14 : .48).lineBetween(-radius*c.bar, 0, radius*c.bar, 0);
    g.fillStyle(mystery ? 0x66717d : 0xfff0c2, mystery ? .36 : .90).fillEllipse(0,0,radius*.34,radius*.22);
    if (profile === 'sombrero') g.lineStyle(Math.max(2, radius*.075), 0x151823, mystery ? .30 : .75).lineBetween(-radius*.86,0,radius*.86,0);
    if (c.companion) g.fillStyle(mystery ? 0x64707c : 0xffd7a0, mystery ? .30 : .8).fillCircle(radius*.83, -radius*.26, Math.max(2.5, radius*.12));
  }

  function drawGalaxy(scene, x, y, radius, object, mystery = false, glow = false) {
    const c = scene.add.container(x,y);
    const g = scene.add.graphics();
    if (glow) g.fillStyle(object.color || C.cyan, .055).fillCircle(0,0,radius*1.22);
    galaxyArms(g, radius, object.color || C.cyan, object.galaxyProfile || 'generic', mystery);
    c.add(g); scene.ui.add(c);
    if (!mystery) {
      const tw = scene.tweens.add({targets:g, angle:360, duration:30000, repeat:-1, ease:'Linear'});
      c.once('destroy', () => tw.stop());
    }
    return c;
  }

  function drawCluster(scene, x, y, radius, object, mystery = false, glow = false) {
    const c = scene.add.container(x,y), g = scene.add.graphics();
    const color = object.color || C.cyan;
    if (glow) g.fillStyle(color,.045).fillCircle(0,0,radius*1.18);
    const profile = object.clusterProfile || 'cluster';
    const count = profile === 'group' ? 5 : profile === 'coma' ? 11 : profile === 'perseus' ? 9 : 8;
    const nodes = [];
    for (let i=0;i<count;i++) {
      const a = i*2.399 + (profile.length*.17), d = radius*(.18 + .70*((i*37)%count)/Math.max(1,count-1));
      nodes.push([Math.cos(a)*d, Math.sin(a)*d*.78]);
    }
    for (let i=1;i<nodes.length;i++) {
      const a=nodes[i-1], b=nodes[i];
      g.lineStyle(Math.max(1,radius*.018), mystery?0x697582:color, mystery?.10:.12).lineBetween(a[0],a[1],b[0],b[1]);
    }
    nodes.forEach((p,i)=> {
      const rr = radius*(i===0?.13:.085);
      const fake={color:i%3?color:C.purple,galaxyProfile:i%2?'generic':'dwarf'};
      const gg=scene.add.graphics(); galaxyArms(gg,rr,fake.color,fake.galaxyProfile,mystery); gg.setPosition(p[0],p[1]); c.add(gg);
    });
    c.addAt(g,0); scene.ui.add(c); return c;
  }

  function armCountFor(scene) {
    if (scene.tierIndex === SMBH) return 2;
    if (scene.tierIndex === GALAXY) return 3 + (scene.phase4Members.length >= 7 ? 1 : 0);
    return 0;
  }

  function drawSystemArms(scene, parent, radius) {
    const g = scene.add.graphics();
    const arms = armCountFor(scene);
    if (scene.tierIndex >= CLUSTER) {
      const n = Math.min(7, Math.max(4, Math.ceil(scene.phase4Members.length / 2)));
      const pts=[];
      for(let i=0;i<n;i++){const a=i*2.399,d=radius*(.32+.55*((i*23)%n)/Math.max(1,n-1));pts.push([Math.cos(a)*d,Math.sin(a)*d*.78]);}
      for(let i=1;i<pts.length;i++) g.lineStyle(Math.max(2,radius*.045),i%2?C.cyan:C.purple,.13).lineBetween(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
      g.fillStyle(C.cyan,.028).fillCircle(0,0,radius*1.03);
    } else {
      for(let arm=0;arm<arms;arm++){
        const start=arm*Math.PI*2/arms;
        g.lineStyle(Math.max(7,radius*.16),arm%2?C.cyan:C.purple,.065);
        g.beginPath();
        for(let i=0;i<=30;i++){const t=i/30,a=start+t*Math.PI*1.62,d=radius*(.14+.90*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*.52;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
        g.lineStyle(Math.max(2.4,radius*.055),arm%2?0xb9efff:0xd9c4ff,.16);
        g.beginPath();
        for(let i=0;i<=30;i++){const t=i/30,a=start+t*Math.PI*1.62,d=radius*(.14+.90*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*.52;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      }
    }
    parent.add(g);
    const tw = scene.tweens.add({targets:g, angle:360, duration:scene.tierIndex>=CLUSTER?52000:36000, repeat:-1, ease:'Linear'});
    return {g,tw};
  }

  function memberRadius(member, systemRadius) {
    const tier = Number(member.tier) || 0;
    if (tier >= CLUSTER) return Math.max(5, systemRadius*.16);
    if (tier >= GALAXY) return Math.max(4.5, systemRadius*.14);
    if (tier === NEBULA) return Math.max(4.5, systemRadius*.13);
    if (tier === PULSAR) return Math.max(3.4, systemRadius*.09);
    if (tier === BLACK_HOLE) return Math.max(3.8, systemRadius*.10);
    return Math.max(3, systemRadius*.075);
  }

  function addSystemMemberVisual(scene, parent, member, x, y, radius) {
    const obj = { name:member.name, realName:member.name, tier:member.tier, radiusM:member.radiusM, massKg:member.massKg, speedMS:member.speedMS, kind:member.kind, color:member.color, solid:false, galaxyProfile:member.galaxyProfile, clusterProfile:member.clusterProfile };
    if (member.kind === 'galaxy' || member.tier === GALAXY) {
      const g = scene.add.graphics(); galaxyArms(g,radius,obj.color,obj.galaxyProfile||'generic',false); g.setPosition(x,y); parent.add(g); return g;
    }
    if (member.kind === 'cluster' || member.tier === CLUSTER) {
      const g = scene.add.graphics();
      for(let i=0;i<5;i++){const a=i*1.8,d=radius*(.25+.45*(i%3)/2);g.fillStyle(i%2?C.cyan:C.purple,.72).fillCircle(x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(1.5,radius*.16));}
      parent.add(g); return g;
    }
    return addEmbedded(scene,parent,obj,x,y,radius);
  }

  function drawSystem(scene, x, y, radius, object, mystery = false, glow = false) {
    ensureMembers(scene);
    const c = scene.add.container(x,y);
    const orbitTweens=[];
    if (glow) { const aura=scene.add.graphics(); aura.fillStyle(C.cyan,.035).fillCircle(0,0,radius*1.16); c.add(aura); }
    const arms = drawSystemArms(scene,c,radius*.92); orbitTweens.push(arms.tw);
    const center = tierObject(SMBH, { name:'SUPER MASSIVE BLACK HOLE', realName:'SUPER MASSIVE BLACK HOLE' });
    const centerVisual = addEmbedded(scene,c,center,0,0,Math.max(11,radius*(scene.tierIndex===SMBH?.31:.23)));
    if (centerVisual && scene.tierIndex >= GALAXY) centerVisual.setScale(.90);

    const members = scene.phase4Members.slice(-MAX_VISIBLE_MEMBERS);
    members.forEach((member,i)=>{
      const ring = Math.floor(i/3), pos=i%3;
      const rx = radius*(.48 + ring*.20), ry = rx*(scene.tierIndex>=CLUSTER?.72:.50);
      const a0 = (pos/3)*Math.PI*2 + ring*.72 + i*.14;
      const rr = memberRadius(member,radius);
      const visual = addSystemMemberVisual(scene,c,member,Math.cos(a0)*rx,Math.sin(a0)*ry,rr);
      if (!visual) return;
      const speed = 11500 + ring*3200 + (i%2)*1700;
      const tw=scene.tweens.addCounter({from:0,to:Math.PI*2,duration:speed,repeat:-1,ease:'Linear',onUpdate:t=>{if(!visual.active)return;const a=a0+t.getValue();visual.x=Math.cos(a)*rx;visual.y=Math.sin(a)*ry;}});
      orbitTweens.push(tw);
    });

    if (!mystery && scene.phase4Members.length > MAX_VISIBLE_MEMBERS) {
      const badge=scene.add.text(0,radius*.92,`+${scene.phase4Members.length-MAX_VISIBLE_MEMBERS}`,{fontFamily:FONT,fontSize:'7px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5); c.add(badge);
    }
    scene.ui.add(c);
    c.once('destroy',()=>orbitTweens.forEach(t=>{try{t.stop();}catch(e){}}));
    return c;
  }

  function actionButton(scene,x,y,label,color,sub,canonical) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(color,.17).fillRoundedRect(-61,-48,122,96,7);g.lineStyle(3,color,.95).strokeRoundedRect(-61,-48,122,96,7);
    const icon=scene.add.graphics();
    if(label==='CAPTURE'){ icon.fillStyle(color,1).fillCircle(0,-15,5);icon.lineStyle(3,color,.95).arc(0,-15,19,.18,Math.PI*1.65,false).strokePath();icon.fillTriangle(18,-23,9,-24,15,-15); }
    else if(label==='GRAZE'){ icon.lineStyle(3,color,.9).arc(-7,-17,13,-1.0,1.05,false).strokePath();icon.lineStyle(3,C.white,.55).arc(8,-11,13,2.15,4.2,false).strokePath();icon.fillStyle(color,.95).fillCircle(0,-14,2.7); }
    else { icon.lineStyle(5,color,.95).arc(0,-13,19,.3,2,false).strokePath();icon.fillStyle(color).fillTriangle(18,-25,7,-26,14,-16); }
    const a=scene.add.text(0,24,label,{fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    const b=scene.add.text(0,42,sub,{fontFamily:FONT,fontSize:'7.4px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`}).setOrigin(.5);
    const hit=scene.add.rectangle(0,0,122,96,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',()=>scene.choose(canonical));
    if(a.setResolution){a.setResolution(Math.min(window.devicePixelRatio||1,3));b.setResolution(Math.min(window.devicePixelRatio||1,3));}
    c.add([g,icon,a,b,hit]);scene.ui.add(c);return c;
  }

  function drawSystemHud(scene, controls) {
    syncPlayer(scene);
    const tier=TIERS[scene.tierIndex],utilityY=SAFE_TOP+15,y=controls?SAFE_TOP+42:SAFE_TOP+18;
    if(controls){ scene.miniButton(48,utilityY,72,24,'SAVE',C.green,()=>scene.save(false));scene.miniButton(140,utilityY,104,24,'LOAD',C.blue,()=>scene.load());scene.miniButton(232,utilityY,72,24,'HOME',C.orange,()=>{scene.save(true);scene.runActive=true;scene.showHome();}); }
    const gap=5,x0=10,cw=96.25,ch=84,pct=Math.round(progress(scene)*100);
    const rows=[['SYSTEM MASS',`${pct}%`],['SPEED',scene.speedText(scene.player.speedMS)],['ORBITALS',String(scene.phase4Members.length)],[`TIER ${scene.tierIndex+1}`,scene.shortTier(tier.name)]];
    rows.forEach((row,i)=>{
      const x=x0+i*(cw+gap),g=scene.add.graphics();g.fillStyle(C.panel,.985).fillRoundedRect(x,y,cw,ch,7);g.lineStyle(2,C.cyan,.68).strokeRoundedRect(x,y,cw,ch,7);scene.ui.add(g);
      if(i===0){const q=scene.add.graphics();q.lineStyle(2,C.cyan,.75).strokeCircle(x+18,y+39,10);q.fillStyle(C.purple,.75).fillCircle(x+18,y+39,4);scene.ui.add(q);}
      if(i===1)scene.speedGauge(x+17,y+39);
      if(i===2){const q=scene.add.graphics();q.lineStyle(1.2,C.cyan,.40).strokeEllipse(x+18,y+39,28,12);q.fillStyle(C.white,.9).fillCircle(x+18,y+39,3);q.fillStyle(C.orange,.9).fillCircle(x+29,y+36,2.6);q.fillStyle(C.cyan,.85).fillCircle(x+8,y+42,2.2);scene.ui.add(q);}
      if(i===3){const bar=scene.add.graphics(),by=y+73;bar.fillStyle(0x20364a).fillRoundedRect(x+8,by,cw-16,5,2);bar.fillStyle(C.cyan).fillRoundedRect(x+8,by,(cw-16)*progress(scene),5,2);scene.ui.add(bar);}
      scene.addText(x+7,y+9,row[0],i===0?7.2:8.2,C.muted,{bold:true});scene.addText(i<3?x+34:x+7,y+30,row[1],i===3?7.4:9.1,C.white,{bold:true,width:i===3?82:61,lineSpacing:1});
    });
    const infoY=y+101;scene.addText(13,infoY,'DEEP COSMOS',9.6,C.white,{bold:true,width:245});scene.addText(W-13,infoY,`R${scene.encounters+1} • ${scene.score.toLocaleString('en-US')}`,9.2,C.muted,{ox:1,bold:true});
  }

  function drawSystemArena(scene) {
    const divider=scene.add.graphics();divider.lineStyle(8,C.cyan,.055).lineBetween(0,scene.Y(610),W,scene.Y(226));divider.lineStyle(2.5,C.cyan,.72).lineBetween(0,scene.Y(610),W,scene.Y(226));scene.ui.add(divider);
    scene.youSprite=scene.drawObject(126,scene.Y(345),55,scene.player,false,true);scene.otherSprite=scene.drawObject(304,scene.Y(477),45,scene.other,true,false);
    scene.addText(14,scene.Y(184),'YOU • YOUR SYSTEM',9.2,C.green,{bold:true});scene.addText(W-14,scene.Y(604),'UNKNOWN STRUCTURE',9.2,C.orange,{bold:true,ox:1});
    scene.tweens.add({targets:scene.youSprite,x:'+=3',y:'-=2',duration:880,yoyo:true,repeat:-1,ease:'Sine.inOut'});scene.tweens.add({targets:scene.otherSprite,x:'-=3',y:'+=2',duration:950,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }

  function revealScreen(scene, choice) {
    scene.clearUI();scene.state='P4_SYSTEM_REVEAL';drawSystemHud(scene,false);
    const label=choice==='ABSORB'?'CAPTURE':choice==='DEFLECT'?'GRAZE':'AVOID';
    scene.addText(W/2,scene.Y(163),'SYSTEM ENCOUNTER REVEAL',14,C.white,{ox:.5,bold:true});
    const ratio=clamp(Math.sqrt(Math.max(scene.other.massKg,1)/Math.max(scene.player.massKg,1)),.68,1.45),pr=44,or=44*ratio;
    const p=scene.drawObject(105,scene.Y(370),pr,scene.player,false,true),o=scene.drawObject(315,scene.Y(412),or,scene.other,false,false);
    p.setScale(.62).setAlpha(.25);o.setScale(.62).setAlpha(.25);scene.tweens.add({targets:[p,o],scale:1,alpha:1,duration:600,ease:'Back.out'});
    scene.addText(18,scene.Y(520),`YOU\n${TIERS[scene.tierIndex].name}`,10.2,C.green,{bold:true,lineSpacing:4,width:175});scene.addText(W-18,scene.Y(520),`IDENTIFIED\n${scene.other.realName}`,10.2,C.orange,{ox:1,align:'right',bold:true,lineSpacing:4,width:195});
    const panel=scene.add.graphics();panel.fillStyle(C.panel,.98).fillRoundedRect(10,scene.Y(646),400,68,8);panel.lineStyle(2,C.cyan,.86).strokeRoundedRect(10,scene.Y(646),400,68,8);scene.ui.add(panel);
    scene.addText(W/2,scene.Y(666),`${label} LOCKED IN`,13,C.white,{ox:.5,bold:true});scene.addText(W/2,scene.Y(691),'WATCH THE GRAVITATIONAL ENCOUNTER…',9,C.muted,{ox:.5,bold:true});scene.time.delayedCall(980,()=>scene.animate(choice,p,o,pr,or));
  }

  function systemMass(scene) { syncPlayer(scene); return Math.max(1, Number(scene.player?.massKg) || 1); }

  function captureOutcome(scene, choice) {
    const pMass=systemMass(scene),o=scene.other,ratio=Math.max(1e-8,o.massKg/pMass),gap=o.tier-scene.tierIndex,roll=Math.random();
    if(choice==='ABSORB'){
      let chance;
      if(gap<=-2)chance=.97;else if(gap===-1)chance=.92;else if(gap===0)chance=clamp(.70-.23*Math.max(0,Math.log10(ratio)),.38,.78);else chance=clamp(.24-.08*Math.max(0,gap-1)-.10*Math.max(0,Math.log10(ratio)),.06,.28);
      const success=roll<chance;let result=success?'capture':'stripped';
      if(!success && (gap>=1 || ratio>=3.2) && Math.random()<clamp(.42+.12*Math.max(0,gap)+.08*Math.log10(Math.max(1,ratio)),.42,.82)) result='captured';
      return {choice,chance,success,result,gap,massRatio:ratio,sizeRatio:o.radiusM/Math.max(scene.player.radiusM,1e-300),fatalChance:0};
    }
    if(choice==='DEFLECT'){
      const advantage=Math.log10(Math.max(1e-8,pMass/o.massKg));
      const steal=clamp(.27+advantage*.17-gap*.03,.07,.58),lose=clamp(.25-advantage*.19+Math.max(0,gap)*.08,.07,.68),r=Math.random();
      const result=r<steal?'steal':r<steal+lose?'stripped':'clean';
      const amount=result==='steal'?(advantage>.65?2:1):result==='stripped'?(ratio>4?3:ratio>1.7?2:1):0;
      return {choice,chance:1-lose,success:result!=='stripped',result,amount,gap,massRatio:ratio,fatalChance:0};
    }
    const chance=clamp(.97-Math.max(0,gap)*.055-Math.max(0,Math.log10(ratio))*.045,.70,.995),success=Math.random()<chance;
    return {choice,chance,success,result:success?'clean':'stripped',amount:success?0:1,gap,massRatio:ratio,fatalChance:0};
  }

  function memberGrowth(scene, object) {
    const gap=object.tier-scene.tierIndex,ratio=object.massKg/Math.max(systemMass(scene),1);
    let pts=gap<=-2?.42:gap===-1?.65:gap===0?1.02:gap===1?1.48:1.70;
    pts*=clamp(.92+.11*Math.log10(Math.max(.03,ratio)+1),.78,1.22);return clamp(pts,.32,1.80);
  }

  function stolenMember(scene,target,index=0) {
    if(target.tier>=CLUSTER){const spec=GALAXY_SPECS[(whole(scene.encounters)+index)%GALAXY_SPECS.length];return memberFromObject(galaxyObject({...spec,name:index?`STRIPPED SATELLITE ${index+1}`:'STRIPPED SATELLITE GALAXY'}),'graze');}
    if(target.tier>=GALAXY){
      if(index===0&&Math.random()<.35)return memberFromObject(galaxyObject({name:'STRIPPED DWARF GALAXY',profile:'dwarf',massKg:4e40,radiusM:1.4e20,color:0xa6c9ff}),'graze');
      const idx=Math.random()<.5?BLACK_HOLE:NEBULA;return memberFromObject(tierObject(idx,{name:idx===BLACK_HOLE?'STRIPPED BLACK HOLE':'STRIPPED NEBULA',realName:idx===BLACK_HOLE?'STRIPPED BLACK HOLE':'STRIPPED NEBULA'}),'graze');
    }
    return memberFromObject(target,'graze');
  }

  function addMember(scene,member,growthPoints) { ensureMembers(scene);scene.phase4Members.push(member);scene.systemCaptures=scene.phase4Members.length;scene.growth+=Number(growthPoints)||0;syncPlayer(scene); }

  function removeMembers(scene,count) {
    ensureMembers(scene);count=Math.min(scene.phase4Members.length,Math.max(0,whole(count)));if(!count)return 0;
    for(let i=0;i<count;i++){const idx=Math.max(0,Math.floor(Math.random()*scene.phase4Members.length));scene.phase4Members.splice(idx,1);}
    scene.systemCaptures=scene.phase4Members.length;scene.growth=Math.max(0,scene.growth-count*.48);syncPlayer(scene);return count;
  }

  function maybeEvolve(scene) {
    let evolved=false;
    while(scene.tierIndex<SUPERCLUSTER && scene.growth>=TIERS[scene.tierIndex].need){scene.growth-=TIERS[scene.tierIndex].need;scene.tierIndex++;previousSetPlayer.call(scene,false);syncPlayer(scene);evolved=true;}
    return evolved;
  }

  function captureAnimation(scene,p,o) {
    scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);const sx=o.x,sy=o.y,px=p.x,py=p.y,cx=(sx+px)/2+18,cy=(sy+py)/2-96;
    scene.tweens.addCounter({from:0,to:1,duration:1050,ease:'Sine.inOut',onUpdate:tw=>{const t=tw.getValue(),u=1-t;o.x=u*u*sx+2*u*t*cx+t*t*(px+56);o.y=u*u*sy+2*u*t*cy+t*t*(py+5);o.setScale(Math.max(.20,1-.72*t));}});
    scene.time.delayedCall(900,()=>{scene.flash(px+45,py+8,C.cyan);scene.tweens.add({targets:p,scale:1.08,duration:160,yoyo:true});});scene.time.delayedCall(1320,()=>scene.resolve());
  }

  function grazeAnimation(scene,p,o) {
    scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);const px=p.x,py=p.y,ox=o.x,oy=o.y;
    const tidal=scene.add.graphics();tidal.lineStyle(7,C.cyan,.08).lineBetween(px+22,py+8,ox-22,oy-8);tidal.lineStyle(2,C.white,.17).lineBetween(px+30,py+5,ox-30,oy-5);scene.ui.add(tidal);
    scene.tweens.add({targets:p,x:px+46,y:py+20,duration:560,ease:'Sine.inOut',yoyo:true});scene.tweens.add({targets:o,x:ox-50,y:oy-24,duration:560,ease:'Sine.inOut',yoyo:true});
    scene.time.delayedCall(430,()=>{const transfer=scene.add.circle((px+ox)/2,(py+oy)/2,4,scene.pending?.result==='steal'?C.green:scene.pending?.result==='stripped'?C.orange:C.cyan,.92);scene.ui.add(transfer);if(scene.pending?.result==='steal')scene.tweens.add({targets:transfer,x:px+38,y:py+8,duration:430,ease:'Cubic.in',onComplete:()=>transfer.destroy()});else if(scene.pending?.result==='stripped')scene.tweens.add({targets:transfer,x:ox-38,y:oy-8,duration:430,ease:'Cubic.in',onComplete:()=>transfer.destroy()});else scene.tweens.add({targets:transfer,alpha:0,duration:300,onComplete:()=>transfer.destroy()});});
    scene.time.delayedCall(1050,()=>{tidal.destroy();scene.resolve();});
  }

  function strippedAnimation(scene,p,o,severe=false) {
    const px=p.x,py=p.y,ox=o.x,oy=o.y;scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);scene.tweens.add({targets:o,x:px+78,y:py+28,duration:540,ease:'Quad.inOut'});
    scene.time.delayedCall(420,()=>{scene.flash(px+42,py+12,severe?C.red:C.orange);for(let i=0;i<(severe?4:2);i++){const lost=scene.add.circle(px+Phaser.Math.Between(-20,28),py+Phaser.Math.Between(-16,20),3.5,i%2?C.cyan:C.purple,.9);scene.ui.add(lost);scene.tweens.add({targets:lost,x:ox+Phaser.Math.Between(-15,30),y:oy+Phaser.Math.Between(-20,20),alpha:0,duration:620+i*80,ease:'Cubic.in',onComplete:()=>lost.destroy()});}scene.tweens.add({targets:p,x:px-10,duration:90,yoyo:true,repeat:3});});
    scene.time.delayedCall(1180,()=>scene.resolve());
  }

  function avoidAnimation(scene,p,o) { scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);scene.tweens.add({targets:p,x:p.x-55,y:p.y-42,duration:720,ease:'Cubic.out'});scene.tweens.add({targets:o,x:o.x+62,y:o.y+45,duration:720,ease:'Cubic.out'});scene.time.delayedCall(920,()=>scene.resolve()); }

  function resultScreen(scene,res) {
    scene.clearUI();scene.state='P4_SYSTEM_RESULT';drawSystemHud(scene,false);
    const baseY=scene.Y(172),g=scene.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(14,baseY,392,500,10);g.lineStyle(2,res.color,.9).strokeRoundedRect(14,baseY,392,500,10);scene.ui.add(g);
    scene.addText(W/2,baseY+24,res.title,18,res.color,{ox:.5,bold:true,align:'center',width:360});scene.addText(W/2,baseY+55,scene.other.realName||scene.other.name,10.5,C.orange,{ox:.5,bold:true,width:350,align:'center'});
    scene.drawObject(110,baseY+158,43,scene.player,false,true);scene.drawObject(310,baseY+158,37,scene.other,false,false);scene.addText(110,baseY+215,'YOUR SYSTEM',8.2,C.green,{ox:.5,bold:true});scene.addText(310,baseY+215,'ENCOUNTER',8.2,C.orange,{ox:.5,bold:true});
    const rb=scene.add.graphics();rb.fillStyle(C.panel2,.9).fillRoundedRect(34,baseY+248,352,112,7);scene.ui.add(rb);scene.addText(48,baseY+261,'WHAT HAPPENED?',9,C.cyan,{bold:true});scene.addText(48,baseY+284,res.reason,9.5,C.white,{width:324,lineSpacing:4});scene.addText(W/2,baseY+398,res.detail,10.2,C.white,{ox:.5,align:'center',width:350,bold:true});
    const label=scene.tierIndex>=SUPERCLUSTER?'BEGIN FINAL ASSEMBLY':'NEXT ENCOUNTER';scene.wideButton(W/2,scene.Y(724),330,58,label,C.cyan,()=>scene.startEncounter());
  }

  function patchSave(scene) {
    if (scene._labSandboxRun || scene._devModeActive || scene._devPhase4Test) return;
    const fields={phase4SystemVersion:SYSTEM_VERSION,phase4Members:Array.isArray(scene.phase4Members)?scene.phase4Members:[],phase4MembersInitialized:!!scene.phase4MembersInitialized,phase4BirthShown:!!scene.phase4BirthShown,phase4SeedScore:Number(scene.phase4SeedScore)||0,phase4SeedInheritedOrbitals:whole(scene.phase4SeedInheritedOrbitals)};
    SAVE_KEYS.forEach(key=>{try{const raw=localStorage.getItem(key);if(!raw)return;const data=JSON.parse(raw);Object.assign(data,fields);localStorage.setItem(key,JSON.stringify(data));}catch(e){}});
  }

  function readSystemSave() {
    for (const key of SAVE_KEYS) { try { const raw=localStorage.getItem(key); if(!raw) continue; const d=JSON.parse(raw); if(Array.isArray(d.phase4Members)) return d; } catch(e) {} }
    return null;
  }

  proto.resetRun=function(){this.phase4Members=[];this.phase4MembersInitialized=false;this.phase4BirthShown=false;this.phase4SeedScore=0;this.phase4SeedInheritedOrbitals=0;return previousResetRun.call(this);};
  proto.setPlayer=function(resetSpeed=false){const result=previousSetPlayer.call(this,resetSpeed);if(this.tierIndex>=SMBH&&this.tierIndex<SUPERCLUSTER){ensureMembers(this);syncPlayer(this);}return result;};
  proto.pickOpponent=function(){if(playable(this))return systemOpponent(this);return previousPickOpponent.call(this);};

  proto.startEncounter=function(){
    if(playable(this)){ensureMembers(this);syncPlayer(this);if(this.tierIndex===SMBH&&!this.phase4BirthShown&&this.state!=='PHASE_COMPLETE_CARD'&&this.state!=='P4_SYSTEM_BIRTH')return this.showPhase4SystemBirth();}
    return previousStartEncounter.call(this);
  };

  proto.drawHud=function(controls=false){if(playable(this))return drawSystemHud(this,controls);return previousDrawHud.call(this,controls);};
  proto.drawArena=function(){if(playable(this))return drawSystemArena(this);return previousDrawArena.call(this);};

  proto.drawPrompt=function(){
    if(!playable(this))return previousDrawPrompt.call(this);
    const y=this.Y(636),g=this.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(10,y,400,78,8);g.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,y,400,78,8);this.ui.add(g);
    this.addText(W/2,y+17,'A COSMIC SYSTEM IS AHEAD.',14.5,C.white,{ox:.5,bold:true});this.addText(W/2,y+44,'HOW WILL YOUR SYSTEM INTERACT?',10.5,C.muted,{ox:.5,bold:true});
    actionButton(this,73,this.Y(771),'CAPTURE',C.green,'BUILD SYSTEM','ABSORB');actionButton(this,210,this.Y(771),'GRAZE',C.orange,'STRIP / STEAL','DEFLECT');actionButton(this,347,this.Y(771),'AVOID',C.blue,'KEEP DISTANCE','AVOID');
  };

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    const isPlayer=object===this.player&&active(this);
    if(isPlayer)return drawSystem(this,x,y,radius,object,mystery,glow);
    if(object?.kind==='galaxy')return drawGalaxy(this,x,y,radius,object,mystery,glow);
    if(object?.kind==='cluster')return drawCluster(this,x,y,radius,object,mystery,glow);
    return previousDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  proto.choose=function(choice){if(!playable(this))return previousChoose.call(this,choice);if(this.state!=='APPROACH')return;this.pending=this.outcome(choice);this.state='P4_SYSTEM_REVEAL';this.tweens.killAll();return this.reveal(choice);};
  proto.outcome=function(choice){if(!playable(this))return previousOutcome.call(this,choice);return captureOutcome(this,choice);};
  proto.reveal=function(choice){if(!playable(this))return previousReveal.call(this,choice);return revealScreen(this,choice);};

  proto.animate=function(choice,p,o,pr,or){
    if(!playable(this))return previousAnimate.call(this,choice,p,o,pr,or);
    if(choice==='ABSORB'){if(this.pending?.success)return captureAnimation(this,p,o);return strippedAnimation(this,p,o,this.pending?.result==='captured');}
    if(choice==='DEFLECT')return grazeAnimation(this,p,o);
    return avoidAnimation(this,p,o);
  };

  proto.resolve=function(){
    if(!playable(this))return previousResolve.call(this);
    const r=this.pending;let title='',detail='',reason='',color=C.green,evolved=false;
    if(r.choice==='ABSORB'&&r.success){const gp=memberGrowth(this,this.other);addMember(this,memberFromObject(this.other,'capture'),gp);this.absorbs++;evolved=maybeEvolve(this);title=evolved?'SYSTEM EXPANDED!':'CAPTURE SUCCESS';detail=evolved?`YOU ARE NOW A ${TIERS[this.tierIndex].name}`:`ORBITALS ${this.phase4Members.length} • SYSTEM MASS +${Math.max(1,Math.round(gp/Math.max(.001,TIERS[this.tierIndex].need)*100))}%`;reason='The incoming object curved into a bound orbit and became a visible member of your growing system.';}
    else if(r.choice==='ABSORB'){
      if(r.result==='captured'){const survivors=Math.min(2,this.phase4Members.length),kept=this.phase4Members.slice(-survivors);this.phase4Members=kept;this.tierIndex=SMBH;this.growth=TIERS[SMBH].need*.18;previousSetPlayer.call(this,false);syncPlayer(this);title='SYSTEM CAPTURED';detail=`CORE ESCAPED • ORBITALS ${this.phase4Members.length}`;color=C.red;reason='The larger system dominated the encounter and captured almost everything. Your central core escaped with only a few bound survivors.';}
      else {const lost=removeMembers(this,r.massRatio>1.8?2:1);title='CAPTURE FAILED';detail=`ORBITALS -${lost} • SYSTEM MASS LOST`;color=C.orange;reason='The attempted capture became a tidal struggle. The target escaped and stripped members from your outer system.';}
    }
    if(r.choice==='DEFLECT'){
      if(r.result==='steal'){const amount=Math.max(1,whole(r.amount));for(let i=0;i<amount;i++){const m=stolenMember(this,this.other,i),gp=.46+(m.tier>=GALAXY?.22:0);addMember(this,m,gp);}evolved=maybeEvolve(this);title=evolved?'SYSTEM EXPANDED!':'SUCCESSFUL GRAZE';detail=`ORBITALS +${amount} • MATERIAL STRIPPED FROM TARGET`;reason='The close pass produced tidal stripping. Part of the other system became bound to yours without capturing the whole object.';}
      else if(r.result==='stripped'){const lost=removeMembers(this,Math.max(1,whole(r.amount)));title='ROUGH GRAZE';detail=`ORBITALS -${lost}`;color=C.orange;reason='The close pass favoured the other system. Tidal forces stripped members from your outer structure.';}
      else {title='CLEAN GRAZE';detail='NO ORBITALS EXCHANGED';reason='The systems passed close enough to distort each other, but neither retained material from the encounter.';}
    }
    if(r.choice==='AVOID'){
      if(r.success){title='SAFE PASS';detail='SYSTEM UNCHANGED';reason='You kept enough distance to avoid a strong gravitational interaction.';}
      else {const lost=removeMembers(this,1);title='DISTANT TIDAL PULL';detail=lost?`ORBITALS -${lost}`:'SYSTEM MASS SLIGHTLY REDUCED';color=C.orange;reason='You tried to avoid the encounter, but the larger system still pulled at the edge of yours before you escaped.';}
    }
    syncPlayer(this);this.actionHistory.push(r.choice);const base=r.choice==='ABSORB'?(r.success?185:50):r.choice==='DEFLECT'?(r.result==='steal'?120:r.result==='clean'?70:35):40;this.score+=Math.round(base+this.tierIndex*14+Math.max(0,r.gap)*42);this.encounters++;
    return this.drawResult({title,detail,reason,color,survived:true,evolved});
  };

  proto.drawResult=function(result){if(playable(this))return resultScreen(this,result);return previousDrawResult.call(this,result);};

  proto.save=function(silent=false){const result=previousSave.call(this,silent);if(result!==false)patchSave(this);return result;};
  proto.load=function(){const d=readSystemSave();if(d&&Array.isArray(d.phase4Members)){this.phase4Members=d.phase4Members;this.phase4MembersInitialized=!!d.phase4MembersInitialized;this.phase4BirthShown=!!d.phase4BirthShown;this.phase4SeedScore=Number(d.phase4SeedScore)||0;this.phase4SeedInheritedOrbitals=whole(d.phase4SeedInheritedOrbitals);}else{this.phase4Members=[];this.phase4MembersInitialized=false;this.phase4BirthShown=false;}const result=previousLoad.call(this);if(active(this)){ensureMembers(this);syncPlayer(this);}return result;};
  proto.continueNextUniverse=function(){this.phase4Members=[];this.phase4MembersInitialized=false;this.phase4BirthShown=false;return previousContinueNextUniverse.call(this);};

  proto.showPhase4SystemBirth=function(){
    ensureMembers(this);syncPlayer(this);this.clearUI();this.state='P4_SYSTEM_BIRTH';
    this.addText(W/2,this.Y(68),'A GALAXY BEGINS',22,C.white,{ox:.5,bold:true});this.addText(W/2,this.Y(103),'YOUR BLACK HOLE IS NOW THE CORE OF A GROWING SYSTEM',8.7,C.muted,{ox:.5,bold:true,width:360,align:'center'});
    this.addText(W/2,this.Y(137),`PHASE 3 SCORE ${Math.round(this.phase4SeedScore).toLocaleString('en-US')} • STARTING ORBITALS ${this.phase4Members.length}`,8.5,C.cyan,{ox:.5,bold:true});
    const cx=W/2,cy=this.Y(395),baseContainer=this.add.container(cx,cy);this.ui.add(baseContainer);const armInfo=drawSystemArms(this,baseContainer,105);const center=tierObject(SMBH,{name:'SUPER MASSIVE BLACK HOLE'});addEmbedded(this,baseContainer,center,0,0,31);
    const members=this.phase4Members.slice(0,Math.min(8,this.phase4Members.length));
    members.forEach((m,i)=>{
      const a=i/members.length*Math.PI*2,tx=Math.cos(a)*Phaser.Math.Between(52,95),ty=Math.sin(a)*Phaser.Math.Between(30,52),startX=i%2?W+35:-35,startY=this.Y(240+i*44%330),r=memberRadius(m,66);
      let v;if(m.kind==='galaxy'||m.tier===GALAXY){v=drawGalaxy(this,startX,startY,r,{...m,galaxyProfile:m.galaxyProfile||'dwarf'},false,false);}else{const obj={...m,realName:m.name};v=previousDrawObject.call(this,startX,startY,r,obj,false,false);}
      this.tweens.add({targets:v,x:cx+tx,y:cy+ty,scale:.72,duration:650+i*90,delay:i*90,ease:'Cubic.inOut'});
    });
    this.time.delayedCall(650+members.length*150,()=>{this.addText(W/2,this.Y(600),'THESE MEMBERS FORM YOUR EARLY GALACTIC SYSTEM.',9.2,C.white,{ox:.5,bold:true,width:350,align:'center'});this.addText(W/2,this.Y(632),'CAPTURE ADDS MEMBERS • GRAZE CAN STEAL OR LOSE THEM',8.1,C.muted,{ox:.5,bold:true,width:360,align:'center'});this.wideButton(W/2,this.Y(725),320,56,'BEGIN PHASE 4',C.cyan,()=>{this.phase4BirthShown=true;patchSave(this);previousStartEncounter.call(this);});});
    if(baseContainer?.once)baseContainer.once('destroy',()=>{try{armInfo.tw.stop();}catch(e){}});
  };

  window.CometPhase4SystemV2=Object.freeze({ enabled:true, systemVersion:SYSTEM_VERSION, actions:{ABSORB:'CAPTURE',DEFLECT:'GRAZE',AVOID:'AVOID'}, maxVisibleMembers:MAX_VISIBLE_MEMBERS, namedGalaxies:GALAXY_SPECS.map(g=>g.name), namedClusters:CLUSTER_SPECS.map(g=>g.name), noSuperclusterEncounters:true });
})();
