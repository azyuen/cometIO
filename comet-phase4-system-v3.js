// Phase 4 v3: aligned galactic systems + member-continuity encounter choreography.
// Loaded after v2. Arms, orbital lanes and member sprites share one rotating disc; transfers animate
// the exact member records that are subsequently added to / removed from the persistent system.
(() => {
  if (!window.CometPhase4 || !window.CometPhase4SystemV2) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const SMBH = P4.firstTier;
  const GALAXY = P4.galaxyTier;
  const CLUSTER = P4.clusterTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const NEBULA = TIERS.findIndex(t => t.name === 'NEBULA');
  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const BLACK_HOLE = TIERS.findIndex(t => t.name === 'BLACK HOLE');
  const MAX_VISIBLE = 12;
  const V3 = 3;

  const baseResetRun = proto.resetRun;
  const baseSetPlayer = proto.setPlayer;
  const baseStartEncounter = proto.startEncounter;
  const basePickOpponent = proto.pickOpponent;
  const baseDrawObject = proto.drawObject;
  const baseAnimate = proto.animate;
  const baseOutcome = proto.outcome;
  const baseResolve = proto.resolve;
  const baseSave = proto.save;
  const baseLoad = proto.load;

  let memberSeq = 0;
  const whole = n => Math.max(0, Math.floor(Number(n) || 0));
  const clamp01 = n => clamp(Number(n) || 0, 0, 1);

  function active(scene) {
    return !scene._devModeActive && scene.tierIndex >= GALAXY && scene.tierIndex <= SUPERCLUSTER;
  }
  function playable(scene) { return active(scene) && scene.tierIndex < SUPERCLUSTER; }

  function idForMember(prefix = 'member') {
    memberSeq += 1;
    return `${prefix}-${Date.now().toString(36)}-${memberSeq.toString(36)}`;
  }

  function identityPool(tierIndex) {
    const tierName = TIERS[tierIndex]?.name;
    if (!tierName || typeof COMET_NAMED_IDENTITIES === 'undefined') return [];
    return COMET_NAMED_IDENTITIES.filter(i => Array.isArray(i.gameplayTiers) && i.gameplayTiers.includes(tierName));
  }

  function identityForName(tierIndex, name) {
    const pool = identityPool(tierIndex);
    if (!pool.length) return null;
    return pool.find(i => i.name === name) || Phaser.Math.RND.pick(pool);
  }

  function exactTierObject(tierIndex, identity = null, overrides = {}) {
    const t = TIERS[tierIndex] || TIERS[0];
    const o = {
      name: overrides.name || t.name,
      realName: overrides.realName || identity?.name || overrides.name || t.name,
      tier: tierIndex,
      radiusM: Number(overrides.radiusM) || t.r,
      massKg: Number(overrides.massKg) || t.m,
      speedMS: Number(overrides.speedMS) || t.v,
      kind: overrides.kind || t.kind,
      color: overrides.color || t.color,
      solid: false,
      hint: overrides.hint || t.hint,
      galaxyProfile: overrides.galaxyProfile || null,
      clusterProfile: overrides.clusterProfile || null
    };
    if (identity) {
      o.identityId = identity.id;
      o.namedSpriteBase = identity.spriteVariant;
      o.scienceClass = identity.scienceClass;
      o.identityStatus = identity.status;
    }
    return o;
  }

  function exactNamedTierObject(tierIndex, overrides = {}) {
    const identity = identityForName(tierIndex, overrides.realName || overrides.name);
    return exactTierObject(tierIndex, identity, overrides);
  }

  function copyMember(object, source = 'capture', preserveId = false) {
    const tier = Number(object?.tier) || 0;
    const m = {
      memberId: preserveId && object.memberId ? object.memberId : idForMember(source),
      sourceMemberId: object.memberId || object.sourceMemberId || null,
      name: object.realName || object.name || TIERS[tier]?.name || 'MEMBER',
      realName: object.realName || object.name || TIERS[tier]?.name || 'MEMBER',
      tier,
      radiusM: Number(object.radiusM) || TIERS[tier]?.r || 1,
      massKg: Number(object.massKg) || TIERS[tier]?.m || 1,
      speedMS: Number(object.speedMS) || TIERS[tier]?.v || 0,
      kind: object.kind || TIERS[tier]?.kind || 'matter',
      color: object.color || TIERS[tier]?.color || C.cyan,
      identityId: object.identityId || null,
      namedSpriteBase: object.namedSpriteBase || null,
      scienceClass: object.scienceClass || null,
      identityStatus: object.identityStatus || null,
      galaxyProfile: object.galaxyProfile || null,
      clusterProfile: object.clusterProfile || null,
      source
    };
    return m;
  }

  function enrichNamedObject(object) {
    if (!object || object.identityId || object.namedSpriteBase) return object;
    if (![NEBULA, PULSAR, BLACK_HOLE, SMBH].includes(Number(object.tier))) return object;
    const identity = identityForName(Number(object.tier), object.realName);
    if (!identity) return object;
    object.realName = identity.name;
    object.identityId = identity.id;
    object.namedSpriteBase = identity.spriteVariant;
    object.scienceClass = identity.scienceClass;
    object.identityStatus = identity.status;
    return object;
  }

  function upgradeMember(member) {
    if (!member) return null;
    let m = copyMember(member, member.source || 'legacy', true);
    if (!m.memberId) m.memberId = idForMember('legacy');

    // Phase 4's early system should never visually regress to rocks/meteorites. Legacy low-tier
    // records are promoted to a real named Nebula/Pulsar/stellar-BH member.
    if (m.tier < NEBULA && m.tier < GALAXY) {
      const choices = [NEBULA, PULSAR, BLACK_HOLE];
      const idx = choices[Math.abs((m.name || '').length + memberSeq) % choices.length];
      m = copyMember(exactNamedTierObject(idx), m.source || 'legacy-upgrade');
    } else if ([NEBULA, PULSAR, BLACK_HOLE, SMBH].includes(m.tier) && !m.namedSpriteBase) {
      const identity = identityForName(m.tier, m.realName || m.name);
      if (identity) {
        m.name = identity.name; m.realName = identity.name;
        m.identityId = identity.id; m.namedSpriteBase = identity.spriteVariant;
        m.scienceClass = identity.scienceClass; m.identityStatus = identity.status;
      }
    }
    return m;
  }

  function startingMemberCount(scene) {
    const inherited = Math.min(3, Math.max(whole(scene.orbitalCount), whole(scene.craters)));
    const scoreBonus = Math.min(6, Math.floor(Math.sqrt(Math.max(0, Number(scene.score) || 0) / 450)));
    return clamp(3 + inherited + scoreBonus, 3, 12);
  }

  function seedExactMembers(scene) {
    const count = startingMemberCount(scene);
    const tiers = [NEBULA, PULSAR, BLACK_HOLE];
    scene.phase4Members = [];
    for (let i = 0; i < count; i++) {
      const tier = tiers[i % tiers.length];
      scene.phase4Members.push(copyMember(exactNamedTierObject(tier), i < 3 ? 'phase3-core' : 'phase3-performance'));
    }
    scene.phase4MembersInitialized = true;
    scene.phase4V3Seeded = true;
    scene.phase4SeedScore = Number(scene.score) || 0;
    scene.phase4SeedInheritedOrbitals = Math.min(3, Math.max(whole(scene.orbitalCount), whole(scene.craters)));
    scene.systemCaptures = scene.phase4Members.length;
    const initialPct = clamp(.22 + count * .052, .34, .80);
    scene.growth = Math.max(Number(scene.growth) || 0, TIERS[SMBH].need * initialPct);
  }

  function ensureExactMembers(scene) {
    if (!Array.isArray(scene.phase4Members) || !scene.phase4Members.length) {
      seedExactMembers(scene);
      return scene.phase4Members;
    }
    scene.phase4Members = scene.phase4Members.map(upgradeMember).filter(Boolean);
    scene.phase4MembersInitialized = true;
    scene.phase4V3Seeded = true;
    scene.systemCaptures = scene.phase4Members.length;
    return scene.phase4Members;
  }

  const GALAXIES = [
    { name:'ANDROMEDA GALAXY', profile:'andromeda', color:0xaed2ff },
    { name:'MILKY WAY', profile:'milkyway', color:0x9ecfff },
    { name:'WHIRLPOOL GALAXY', profile:'whirlpool', color:0x93d8ff },
    { name:'SOMBRERO GALAXY', profile:'sombrero', color:0xffd6a0 },
    { name:'PINWHEEL GALAXY', profile:'pinwheel', color:0xaad8ff },
    { name:'TRIANGULUM GALAXY', profile:'triangulum', color:0x8fc9ff }
  ];

  function galaxyDescriptor(spec, scale = 1) {
    const t = TIERS[GALAXY];
    return {
      memberId: idForMember('galaxy'),
      name: spec.name,
      realName: spec.name,
      tier: GALAXY,
      radiusM: t.r * scale,
      massKg: t.m * scale,
      speedMS: t.v,
      kind: 'galaxy', color: spec.color || t.color,
      galaxyProfile: spec.profile || 'generic', source:'galaxy-system'
    };
  }

  function ensureOpponentMembers(object) {
    if (!object || !['galaxy','cluster'].includes(object.kind)) return [];
    if (Array.isArray(object.phase4Members) && object.phase4Members.length) {
      object.phase4Members = object.phase4Members.map(upgradeMember).filter(Boolean);
      return object.phase4Members;
    }
    const members = [];
    if (object.kind === 'galaxy') {
      const n = object.galaxyProfile === 'dwarf' ? 3 : 6;
      const tiers = [NEBULA, PULSAR, BLACK_HOLE, NEBULA, BLACK_HOLE, PULSAR];
      for (let i = 0; i < n; i++) members.push(copyMember(exactNamedTierObject(tiers[i % tiers.length]), 'opponent-galaxy'));
    } else {
      const n = object.clusterProfile === 'group' ? 5 : 8;
      for (let i = 0; i < n; i++) {
        const spec = GALAXIES[(i + (object.realName || object.name || '').length) % GALAXIES.length];
        members.push(galaxyDescriptor(spec, .58 + (i % 3) * .12));
      }
    }
    object.phase4Members = members;
    return members;
  }

  function memberObject(member) {
    return {
      name: member.name, realName: member.realName || member.name, tier: member.tier,
      radiusM: member.radiusM, massKg: member.massKg, speedMS: member.speedMS,
      kind: member.kind, color: member.color, solid:false,
      identityId: member.identityId, namedSpriteBase: member.namedSpriteBase,
      scienceClass: member.scienceClass, identityStatus: member.identityStatus,
      galaxyProfile: member.galaxyProfile, clusterProfile: member.clusterProfile
    };
  }

  function reparentFromUi(scene, visual, parent, x, y) {
    if (!visual) return null;
    if (visual.parentContainer === scene.ui) scene.ui.remove(visual);
    visual.setPosition(x, y);
    parent.add(visual);
    return visual;
  }

  function renderExactMember(scene, parent, member, x, y, radius) {
    if (member.kind === 'galaxy' || member.tier === GALAXY) {
      const g = scene.add.graphics();
      drawMiniGalaxy(g, x, y, radius, member.color || C.cyan, member.galaxyProfile || 'generic');
      parent.add(g);
      return g;
    }
    const visual = baseDrawObject.call(scene, 0, 0, radius, memberObject(member), false, false);
    return reparentFromUi(scene, visual, parent, x, y);
  }

  function drawMiniGalaxy(g, x, y, radius, color, profile = 'generic', alpha = 1) {
    const profiles = {
      andromeda:{arms:2,flat:.38,turns:1.35,bar:0}, milkyway:{arms:4,flat:.58,turns:1.30,bar:.35},
      whirlpool:{arms:2,flat:.78,turns:1.60,bar:0}, sombrero:{arms:1,flat:.25,turns:.48,bar:0},
      pinwheel:{arms:4,flat:.93,turns:1.68,bar:0}, triangulum:{arms:3,flat:.84,turns:1.40,bar:0},
      dwarf:{arms:2,flat:.78,turns:.90,bar:0}, generic:{arms:3,flat:.68,turns:1.45,bar:0}
    };
    const p = profiles[profile] || profiles.generic;
    g.fillStyle(color, .055 * alpha).fillEllipse(x, y, radius*2.25, radius*(.8+p.flat));
    for (let arm=0; arm<p.arms; arm++) {
      const start=arm*Math.PI*2/p.arms;
      g.lineStyle(Math.max(1,radius*.10), color, .50*alpha).beginPath();
      for(let i=0;i<=14;i++){const t=i/14,a=start+t*Math.PI*p.turns,d=radius*(.12+.88*t);const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*p.flat;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();
    }
    if (p.bar) g.lineStyle(Math.max(1,radius*.12), color, .58*alpha).lineBetween(x-radius*p.bar,y,x+radius*p.bar,y);
    g.fillStyle(0xfff1c6,.85*alpha).fillCircle(x,y,Math.max(1.4,radius*.13));
    if(profile==='sombrero') g.lineStyle(Math.max(1,radius*.07),0x11141d,.72*alpha).lineBetween(x-radius*.85,y,x+radius*.85,y);
  }

  function systemGeometry(tier, count, radius) {
    if (tier >= CLUSTER) {
      return { cluster:true, arms:0, outer:radius*(1+Math.min(.38,count*.025)), flat:.76, turns:0, duration:50000 };
    }
    const base = tier >= GALAXY ? 3 : 2;
    const arms = clamp(base + Math.floor(Math.max(0,count-3)/3), base, 6);
    return {
      cluster:false, arms,
      outer:radius*(1+Math.min(.42,Math.max(0,count-3)*.032)),
      flat:tier >= GALAXY ? .58 : .52,
      turns:1.55 + Math.min(.25,count*.012),
      duration:42000 + Math.min(18000,count*850)
    };
  }

  function slotFor(index, count, geometry) {
    if (geometry.cluster) {
      const a=index*2.399 + .25, band=Math.floor(index/5), d=geometry.outer*(.30+.18*(index%5)/4+.14*band);
      return { x:Math.cos(a)*d, y:Math.sin(a)*d*geometry.flat, t:.65, arm:index%5 };
    }
    const arm=index%geometry.arms, lane=Math.floor(index/geometry.arms);
    const t=clamp(.30+lane*.16+(index%2)*.035,.28,.94);
    const a=arm*Math.PI*2/geometry.arms+t*Math.PI*geometry.turns;
    const d=geometry.outer*(.12+.84*t);
    return { x:Math.cos(a)*d, y:Math.sin(a)*d*geometry.flat, t, arm };
  }

  function memberRadius(member, radius) {
    if (member.tier >= CLUSTER) return Math.max(5.5,radius*.15);
    if (member.tier >= GALAXY) return Math.max(5,radius*.135);
    if (member.tier === NEBULA) return Math.max(4.8,radius*.12);
    if (member.tier === BLACK_HOLE) return Math.max(4.1,radius*.10);
    if (member.tier === PULSAR) return Math.max(3.8,radius*.09);
    return Math.max(3.4,radius*.08);
  }

  function drawAlignedDisc(scene, parent, tier, members, radius, options = {}) {
    const geometry=systemGeometry(tier,members.length,radius),disc=scene.add.container(0,0),g=scene.add.graphics();
    parent.add(disc);disc.add(g);

    if (geometry.cluster) {
      const pts=members.slice(0,MAX_VISIBLE).map((_,i)=>slotFor(i,Math.min(members.length,MAX_VISIBLE),geometry));
      for(let i=1;i<pts.length;i++) g.lineStyle(Math.max(2,radius*.035),i%2?C.cyan:C.purple,.12).lineBetween(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
      g.fillStyle(C.cyan,.025).fillCircle(0,0,geometry.outer*1.02);
    } else {
      // Faint orbital lanes and luminous spiral arms share this exact rotating plane.
      const lanes=Math.max(2,Math.ceil(Math.min(members.length,MAX_VISIBLE)/geometry.arms));
      for(let lane=0;lane<lanes;lane++){
        const rr=geometry.outer*(.40+lane*.18);
        g.lineStyle(1,C.cyan,.075).strokeEllipse(0,0,rr*2,rr*2*geometry.flat);
      }
      for(let arm=0;arm<geometry.arms;arm++){
        const start=arm*Math.PI*2/geometry.arms;
        g.lineStyle(Math.max(8,radius*.15),arm%2?C.cyan:C.purple,.055).beginPath();
        for(let i=0;i<=34;i++){const t=i/34,a=start+t*Math.PI*geometry.turns,d=geometry.outer*(.11+.86*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*geometry.flat;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
        g.lineStyle(Math.max(2.2,radius*.045),arm%2?0xc4f1ff:0xd8c7ff,.16).beginPath();
        for(let i=0;i<=34;i++){const t=i/34,a=start+t*Math.PI*geometry.turns,d=geometry.outer*(.11+.86*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*geometry.flat;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      }
    }

    const visible=members.slice(-MAX_VISIBLE);
    visible.forEach((member,i)=>{
      const globalIndex=Math.max(0,members.length-visible.length+i),slot=slotFor(globalIndex,members.length,geometry),rr=memberRadius(member,radius);
      renderExactMember(scene,disc,member,slot.x,slot.y,rr);
    });

    if (!options.static) {
      const tw=scene.tweens.add({targets:disc,angle:360,duration:geometry.duration,repeat:-1,ease:'Linear'});
      parent.once('destroy',()=>{try{tw.stop();}catch(e){}});
    }
    return {disc,geometry};
  }

  function drawPlayerSystem(scene,x,y,radius,object,mystery=false,glow=false) {
    ensureExactMembers(scene);
    const c=scene.add.container(x,y);
    if(glow){const aura=scene.add.graphics();aura.fillStyle(C.cyan,.035).fillCircle(0,0,radius*(1.2+Math.min(.35,scene.phase4Members.length*.02)));c.add(aura);}
    drawAlignedDisc(scene,c,scene.tierIndex,scene.phase4Members,radius*.92);
    const core=exactNamedTierObject(SMBH,{name:'SUPER MASSIVE BLACK HOLE'}),coreVisual=baseDrawObject.call(scene,0,0,Math.max(12,radius*(scene.tierIndex===SMBH?.31:.23)),core,false,false);
    reparentFromUi(scene,coreVisual,c,0,0);
    if(!mystery&&scene.phase4Members.length>MAX_VISIBLE){const t=scene.add.text(0,radius*1.08,`+${scene.phase4Members.length-MAX_VISIBLE}`,{fontFamily:FONT,fontSize:'7px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5);c.add(t);}
    scene.ui.add(c);return c;
  }

  function drawExternalSystem(scene,x,y,radius,object,mystery=false,glow=false) {
    if(mystery) return baseDrawObject.call(scene,x,y,radius,object,true,glow);
    const members=ensureOpponentMembers(object),c=scene.add.container(x,y);
    if(glow){const aura=scene.add.graphics();aura.fillStyle(object.color||C.cyan,.035).fillCircle(0,0,radius*1.18);c.add(aura);}
    drawAlignedDisc(scene,c,object.tier,members,radius*.88);
    if(object.kind==='galaxy'){
      const nucleus=scene.add.graphics();drawMiniGalaxy(nucleus,0,0,radius*.28,object.color||C.cyan,object.galaxyProfile||'generic');c.add(nucleus);
    }else{
      const coreSpec=GALAXIES[Math.abs((object.realName||object.name||'').length)%GALAXIES.length],core=scene.add.graphics();drawMiniGalaxy(core,0,0,radius*.20,coreSpec.color,coreSpec.profile);c.add(core);
    }
    scene.ui.add(c);return c;
  }

  function isSystemObject(object) { return !!object && (object.kind==='galaxy'||object.kind==='cluster'||Number(object.tier)>=GALAXY); }

  function chooseExact(items,count) {
    if(!Array.isArray(items)||!items.length||count<=0)return [];
    const pool=[...items],chosen=[];
    while(pool.length&&chosen.length<count){const idx=Math.floor(Math.random()*pool.length);chosen.push(pool.splice(idx,1)[0]);}
    return chosen;
  }

  function transferInFor(scene, other, amount) {
    if(!isSystemObject(other)) return [copyMember(enrichNamedObject({...other}),'capture')];
    const source=ensureOpponentMembers(other);
    return chooseExact(source,Math.max(1,amount)).map(m=>copyMember(m,'transfer-in'));
  }

  function transferOutFor(scene, amount) {
    ensureExactMembers(scene);
    return chooseExact(scene.phase4Members,Math.max(0,amount)).map(m=>({...m}));
  }

  function prepareTransferPlan(scene,pending) {
    const other=scene.other,gap=other.tier-scene.tierIndex,ratio=Math.max(1e-8,other.massKg/Math.max(scene.player.massKg,1));
    pending.transferInMembers=[];pending.transferOutMembers=[];
    if(pending.choice==='ABSORB'&&pending.success){
      let amount=1;
      if(isSystemObject(other)&&gap===0) amount=clamp(2+Math.floor(Math.max(0,1-ratio)*2),2,4);
      else if(isSystemObject(other)&&gap>0) amount=ratio>4?1:2;
      pending.transferInMembers=transferInFor(scene,other,amount);
    }else if(pending.choice==='ABSORB'){
      const amount=pending.result==='captured'?Math.max(1,scene.phase4Members.length-Math.min(2,scene.phase4Members.length)):(ratio>2?2:1);
      pending.transferOutMembers=transferOutFor(scene,amount);
    }else if(pending.choice==='DEFLECT'){
      if(pending.result==='steal') pending.transferInMembers=transferInFor(scene,other,Math.max(1,whole(pending.amount)));
      if(pending.result==='stripped') pending.transferOutMembers=transferOutFor(scene,Math.max(1,whole(pending.amount)));
    }else if(pending.choice==='AVOID'&&!pending.success){
      pending.transferOutMembers=transferOutFor(scene,1);
    }
    return pending;
  }

  function renderWorldMember(scene,member,x,y,radius=8) {
    if(member.kind==='galaxy'||member.tier===GALAXY){const c=scene.add.container(x,y),g=scene.add.graphics();drawMiniGalaxy(g,0,0,radius,member.color||C.cyan,member.galaxyProfile||'generic');c.add(g);scene.ui.add(c);return c;}
    return baseDrawObject.call(scene,x,y,radius,memberObject(member),false,false);
  }

  function curveTween(scene,visual,from,to,duration=650,scaleTo=.45,delay=0) {
    const control={x:(from.x+to.x)/2+(to.y-from.y)*.28,y:(from.y+to.y)/2-(to.x-from.x)*.18};
    return scene.tweens.addCounter({from:0,to:1,delay,duration,ease:'Sine.inOut',onUpdate:tw=>{const t=tw.getValue(),u=1-t;visual.x=u*u*from.x+2*u*t*control.x+t*t*to.x;visual.y=u*u*from.y+2*u*t*control.y+t*t*to.y;visual.setScale(Phaser.Math.Linear(1,scaleTo,t));},onComplete:()=>visual.setAlpha(0)});
  }

  function animateTransfers(scene,p,o,pending,duration=1500) {
    const incoming=pending.transferInMembers||[],outgoing=pending.transferOutMembers||[];
    incoming.forEach((m,i)=>{const v=renderWorldMember(scene,m,o.x+Phaser.Math.Between(-14,14),o.y+Phaser.Math.Between(-12,12),memberRadius(m,55));curveTween(scene,v,{x:v.x,y:v.y},{x:p.x+Phaser.Math.Between(28,56),y:p.y+Phaser.Math.Between(-30,30)},520,.42,540+i*110);});
    outgoing.forEach((m,i)=>{const v=renderWorldMember(scene,m,p.x+Phaser.Math.Between(-22,22),p.y+Phaser.Math.Between(-18,18),memberRadius(m,55));curveTween(scene,v,{x:v.x,y:v.y},{x:o.x+Phaser.Math.Between(-30,30),y:o.y+Phaser.Math.Between(-24,24)},520,.42,540+i*100);});
    scene.time.delayedCall(duration,()=>scene.resolve());
  }

  function animateLowerCapture(scene,p,o,pending) {
    scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);
    const cx=W/2,cy=scene.Y(390),futureCount=scene.phase4Members.length+(pending.transferInMembers?.length||1),geo=systemGeometry(scene.tierIndex,futureCount,58),slot=slotFor(futureCount-1,futureCount,geo);
    scene.tweens.add({targets:p,x:cx,y:cy,duration:620,ease:'Sine.inOut'});
    const start={x:o.x,y:o.y},target={x:cx+slot.x,y:cy+slot.y};
    const trueScale=clamp(memberRadius(pending.transferInMembers?.[0]||copyMember(scene.other),58)/45,.14,.48);
    curveTween(scene,o,start,target,1050,trueScale,160);
    scene.time.delayedCall(820,()=>scene.flash(target.x,target.y,C.cyan));
    scene.time.delayedCall(1320,()=>scene.resolve());
  }

  function animatePeerDance(scene,p,o,pending,dominantOpponent=false) {
    scene.tweens.killTweensOf(p);scene.tweens.killTweensOf(o);
    const cx=W/2,cy=scene.Y(405),sep=dominantOpponent?118:102,start=-.35,turns=dominantOpponent?1.15:1.0;
    scene.tweens.addCounter({from:0,to:1,duration:1420,ease:'Sine.inOut',onUpdate:tw=>{const t=tw.getValue(),a=start+t*Math.PI*2*turns;if(dominantOpponent){o.x=Phaser.Math.Linear(o.x,cx,Math.min(1,t*1.8));o.y=Phaser.Math.Linear(o.y,cy,Math.min(1,t*1.8));const rr=sep*(1-.18*t);p.x=cx+Math.cos(a)*rr;p.y=cy+Math.sin(a)*rr*.42;}else{const rr=sep*(.60-.10*Math.sin(Math.PI*t));p.x=cx-Math.cos(a)*rr;p.y=cy-Math.sin(a)*rr*.42;o.x=cx+Math.cos(a)*rr;o.y=cy+Math.sin(a)*rr*.42;}p.rotation=t*.18;o.rotation=-t*.12;}});
    scene.time.delayedCall(470,()=>animateTransfers(scene,p,o,pending,1550));
    scene.time.delayedCall(1180,()=>{if(dominantOpponent)scene.tweens.add({targets:p,x:28,y:scene.Y(240),duration:330,ease:'Cubic.out'});else scene.tweens.add({targets:o,x:W+42,y:scene.Y(248),duration:360,ease:'Cubic.out'});});
  }

  function animateGraze(scene,p,o,pending) {
    const larger=scene.other.tier>scene.tierIndex||pending.massRatio>2.3;
    return animatePeerDance(scene,p,o,pending,larger);
  }

  function removeExactMembers(scene,members) {
    const ids=new Set((members||[]).map(m=>m.memberId));
    const before=scene.phase4Members.length;
    scene.phase4Members=scene.phase4Members.filter(m=>!ids.has(m.memberId));
    return before-scene.phase4Members.length;
  }

  function addExactMembers(scene,members) {
    (members||[]).forEach(m=>scene.phase4Members.push(copyMember(m,m.source||'transfer')));
    return (members||[]).length;
  }

  function growthForTransfers(scene,members,other) {
    if(!members?.length)return 0;
    let gp=0;
    members.forEach(m=>{const gap=m.tier-scene.tierIndex;gp+=gap>=0?.58:gap===-1?.46:.30;});
    if(other?.tier>scene.tierIndex)gp*=1.18;
    return clamp(gp,.25,2.1);
  }

  function maybeEvolve(scene) {
    let evolved=false;
    while(scene.tierIndex<SUPERCLUSTER&&scene.growth>=TIERS[scene.tierIndex].need){scene.growth-=TIERS[scene.tierIndex].need;scene.tierIndex++;baseSetPlayer.call(scene,false);evolved=true;}
    return evolved;
  }

  function sync(scene) {
    ensureExactMembers(scene);scene.systemCaptures=scene.phase4Members.length;
    if(scene.player){scene.player.phase4System=true;scene.player.phase4CaptureCount=scene.phase4Members.length;}
  }

  function patchV3Save(scene) {
    if(scene._labSandboxRun||scene._devModeActive||scene._devPhase4Test)return;
    for(const key of [typeof SAVE_KEY!=='undefined'?SAVE_KEY:null,'cometio-manual-checkpoint-v1'].filter(Boolean)){
      try{const raw=localStorage.getItem(key);if(!raw)continue;const d=JSON.parse(raw);d.phase4SystemV3=V3;d.phase4V3Seeded=!!scene.phase4V3Seeded;d.phase4Members=scene.phase4Members||[];localStorage.setItem(key,JSON.stringify(d));}catch(e){}
    }
  }

  proto.resetRun=function(){this.phase4V3Seeded=false;return baseResetRun.call(this);};

  proto.setPlayer=function(resetSpeed=false){const result=baseSetPlayer.call(this,resetSpeed);if(this.tierIndex>=GALAXY&&this.tierIndex<SUPERCLUSTER)sync(this);return result;};

  proto.pickOpponent=function(){
    const o=basePickOpponent.call(this);
    if(playable(this)){
      enrichNamedObject(o);
      if(isSystemObject(o))ensureOpponentMembers(o);
    }
    return o;
  };

  proto.startEncounter=function(){
    if(playable(this)){
      if(!this.phase4V3Seeded)ensureExactMembers(this);else sync(this);
    }
    return baseStartEncounter.call(this);
  };

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    if(object===this.player&&active(this))return drawPlayerSystem(this,x,y,radius,object,mystery,glow);
    if(playable(this)&&isSystemObject(object))return drawExternalSystem(this,x,y,radius,object,mystery,glow);
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  proto.outcome=function(choice){
    if(!playable(this))return baseOutcome.call(this,choice);
    const pending=baseOutcome.call(this,choice);
    return prepareTransferPlan(this,pending);
  };

  proto.animate=function(choice,p,o,pr,or){
    if(!playable(this))return baseAnimate.call(this,choice,p,o,pr,or);
    const pending=this.pending||{};
    if(choice==='AVOID')return baseAnimate.call(this,choice,p,o,pr,or);
    const gap=this.other.tier-this.tierIndex;
    if(choice==='ABSORB'&&pending.success&&gap<0&&!isSystemObject(this.other))return animateLowerCapture(this,p,o,pending);
    if(choice==='ABSORB'&&pending.success&&gap<0&&this.other.kind==='galaxy'&&this.tierIndex>=CLUSTER)return animateLowerCapture(this,p,o,pending);
    return choice==='DEFLECT'?animateGraze(this,p,o,pending):animatePeerDance(this,p,o,pending,gap>0||pending.massRatio>2.3);
  };

  proto.resolve=function(){
    if(!playable(this))return baseResolve.call(this);
    const r=this.pending||{};let title='',detail='',reason='',color=C.green,evolved=false;
    ensureExactMembers(this);
    const added=addExactMembers(this,r.transferInMembers||[]),lost=removeExactMembers(this,r.transferOutMembers||[]);

    if(r.choice==='ABSORB'&&r.success){
      const gp=growthForTransfers(this,r.transferInMembers,this.other);this.growth+=gp;this.absorbs++;evolved=maybeEvolve(this);
      title=evolved?'SYSTEM EXPANDED!':'CAPTURE SUCCESS';
      detail=evolved?`YOU ARE NOW A ${TIERS[this.tierIndex].name}`:`ORBITALS +${added} • SYSTEM MASS +${Math.max(1,Math.round(gp/Math.max(.001,TIERS[this.tierIndex].need)*100))}%`;
      reason=isSystemObject(this.other)?'The systems interacted without merging. Gravitational tides transferred real members from the other system into yours, then the other system moved away.':'The object lost its original trajectory, curved onto your system plane and settled as a persistent orbital member.';
    }else if(r.choice==='ABSORB'){
      if(r.result==='captured'){
        this.tierIndex=SMBH;this.growth=TIERS[SMBH].need*.16;baseSetPlayer.call(this,false);title='SYSTEM CAPTURED';detail=`ORBITALS -${lost} • CORE ESCAPED`;color=C.red;reason='The larger system became the gravitational centre. Most of your visible members were pulled away; your supermassive-black-hole core escaped with the survivors.';
      }else{this.growth=Math.max(0,this.growth-lost*.50);title='CAPTURE FAILED';detail=`ORBITALS -${lost}`;color=C.orange;reason='The attempted capture became a tidal encounter. The target escaped and the exact members you saw leave your system were stripped away.';}
    }

    if(r.choice==='DEFLECT'){
      if(r.result==='steal'){const gp=growthForTransfers(this,r.transferInMembers,this.other)*.82;this.growth+=gp;evolved=maybeEvolve(this);title=evolved?'SYSTEM EXPANDED!':'SUCCESSFUL GRAZE';detail=`ORBITALS +${added} • TIDAL TRANSFER`;reason='The two systems twirled through a close pass. The members you saw cross the gap are now permanently part of your system.';}
      else if(r.result==='stripped'){this.growth=Math.max(0,this.growth-lost*.42);title='ROUGH GRAZE';detail=`ORBITALS -${lost}`;color=C.orange;reason='The close pass favoured the other system. The same members that visibly crossed away have been removed from your persistent system.';}
      else{title='CLEAN GRAZE';detail='NO ORBITALS EXCHANGED';reason='The systems distorted each other and separated without either side retaining a member.';}
    }

    if(r.choice==='AVOID'){
      if(r.success){title='SAFE PASS';detail='SYSTEM UNCHANGED';reason='You kept enough distance that no member crossed between the systems.';}
      else{this.growth=Math.max(0,this.growth-lost*.28);title='DISTANT TIDAL PULL';detail=lost?`ORBITALS -${lost}`:'SYSTEM MASS SLIGHTLY REDUCED';color=C.orange;reason='Even at distance the larger structure tugged one visible member away before your system escaped.';}
    }

    sync(this);this.actionHistory.push(r.choice);const base=r.choice==='ABSORB'?(r.success?190:48):r.choice==='DEFLECT'?(r.result==='steal'?125:r.result==='clean'?72:36):40;this.score+=Math.round(base+this.tierIndex*14+Math.max(0,r.gap||0)*42);this.encounters++;
    return this.drawResult({title,detail,reason,color,survived:true,evolved});
  };

  proto.save=function(silent=false){const result=baseSave.call(this,silent);if(result!==false)patchV3Save(this);return result;};
  proto.load=function(){const result=baseLoad.call(this);if(active(this)){this.phase4V3Seeded=true;sync(this);}return result;};

  proto.showPhase4SystemBirth=function(){
    ensureExactMembers(this);sync(this);this.clearUI();this.state='P4_SYSTEM_BIRTH';
    this.addText(W/2,this.Y(62),'A GALAXY BEGINS',22,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(98),'YOUR SUPERMASSIVE BLACK HOLE BECOMES THE CORE OF A GROWING SYSTEM',8.2,C.muted,{ox:.5,bold:true,width:372,align:'center'});
    this.addText(W/2,this.Y(132),`PHASE 3 SCORE ${Math.round(Number(this.phase4SeedScore)||0).toLocaleString('en-US')} • STARTING ORBITALS ${this.phase4Members.length}`,8.5,C.cyan,{ox:.5,bold:true});

    const cx=W/2,cy=this.Y(395),c=this.add.container(cx,cy);this.ui.add(c);
    const members=this.phase4Members.slice(0,MAX_VISIBLE),geo=systemGeometry(SMBH,members.length,105),disc=this.add.container(0,0),arms=this.add.graphics();c.add(disc);disc.add(arms);
    const lanes=Math.max(2,Math.ceil(members.length/geo.arms));
    for(let lane=0;lane<lanes;lane++){const rr=geo.outer*(.40+lane*.18);arms.lineStyle(1,C.cyan,.07).strokeEllipse(0,0,rr*2,rr*2*geo.flat);}
    for(let arm=0;arm<geo.arms;arm++){const start=arm*Math.PI*2/geo.arms;arms.lineStyle(15,arm%2?C.cyan:C.purple,.055).beginPath();for(let i=0;i<=34;i++){const t=i/34,a=start+t*Math.PI*geo.turns,d=geo.outer*(.11+.86*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*geo.flat;if(!i)arms.moveTo(x,y);else arms.lineTo(x,y);}arms.strokePath();arms.lineStyle(4,arm%2?0xc4f1ff:0xd8c7ff,.16).beginPath();for(let i=0;i<=34;i++){const t=i/34,a=start+t*Math.PI*geo.turns,d=geo.outer*(.11+.86*t);const x=Math.cos(a)*d,y=Math.sin(a)*d*geo.flat;if(!i)arms.moveTo(x,y);else arms.lineTo(x,y);}arms.strokePath();}
    const core=exactNamedTierObject(SMBH,{name:'SUPER MASSIVE BLACK HOLE'}),coreVisual=baseDrawObject.call(this,0,0,31,core,false,false);reparentFromUi(this,coreVisual,c,0,0);

    const incoming=[];
    members.forEach((m,i)=>{const slot=slotFor(i,members.length,geo),r=memberRadius(m,70),startX=i%2?W+42:-42,startY=this.Y(220+(i*53)%360),v=renderWorldMember(this,m,startX,startY,r);incoming.push({v,slot});this.tweens.add({targets:v,x:cx+slot.x,y:cy+slot.y,scale:.72,duration:720+i*55,delay:i*90,ease:'Cubic.inOut'});});
    const settleAt=780+members.length*115;
    this.time.delayedCall(settleAt,()=>{
      incoming.forEach(({v,slot})=>{try{v.destroy(true);}catch(e){};renderExactMember(this,disc,members[incoming.indexOf(incoming.find(x=>x.v===v))]||members[0],slot.x,slot.y,memberRadius(members[incoming.indexOf(incoming.find(x=>x.v===v))]||members[0],70));});
      const rot=this.tweens.add({targets:disc,angle:360,duration:geo.duration,repeat:-1,ease:'Linear'});c.once('destroy',()=>{try{rot.stop();}catch(e){}});
      this.addText(W/2,this.Y(602),`${geo.arms} SPIRAL ARMS • ONE SHARED ROTATING SYSTEM PLANE`,8.8,C.white,{ox:.5,bold:true,width:360,align:'center'});
      this.addText(W/2,this.Y(632),'CAPTURE ADDS THE EXACT OBJECT YOU SEE • GRAZE TRANSFERS REAL MEMBERS',7.8,C.muted,{ox:.5,bold:true,width:370,align:'center'});
      this.wideButton(W/2,this.Y(725),320,56,'BEGIN PHASE 4',C.cyan,()=>{this.phase4BirthShown=true;this.phase4V3Seeded=true;patchV3Save(this);baseStartEncounter.call(this);});
    });
  };

  window.CometPhase4SystemV3=Object.freeze({
    enabled:true,version:V3,maxVisibleMembers:MAX_VISIBLE,
    alignedDisc:true,exactMemberContinuity:true,peerSystemDance:true,dominantSystemCapture:true,
    seedTiers:[TIERS[NEBULA]?.name,TIERS[PULSAR]?.name,TIERS[BLACK_HOLE]?.name]
  });
})();
