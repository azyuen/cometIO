// Phase 4 v4: dominant-system flybys, cluster passes, galaxy jackpots and faster system progression.
// Loaded after v3. Nebula/lower-object capture deliberately keeps v3's smooth capture choreography.
(() => {
  if (!window.CometPhase4SystemV3 || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const SMBH = P4.firstTier;
  const GALAXY = P4.galaxyTier;
  const CLUSTER = P4.clusterTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const V4 = 4;

  // The v3 transfer model is fun, but the original Galaxy requirement made ordinary good play
  // feel grindy. A few meaningful galaxy interactions should now be enough to reach Cluster.
  TIERS[GALAXY].need = Math.min(Number(TIERS[GALAXY].need) || 5.2, 4.35);
  TIERS[CLUSTER].need = Math.min(Number(TIERS[CLUSTER].need) || 5.8, 5.20);

  const baseOutcome = proto.outcome;
  const baseAnimate = proto.animate;
  const baseDrawObject = proto.drawObject;
  const baseDrawResult = proto.drawResult;

  let localSeq = 0;
  const whole = n => Math.max(0, Math.floor(Number(n) || 0));

  function playable(scene) {
    return !scene._devModeActive && scene.tierIndex >= SMBH && scene.tierIndex < SUPERCLUSTER;
  }

  function isSystem(object) {
    return !!object && (object.kind === 'galaxy' || object.kind === 'cluster' || Number(object.tier) >= GALAXY);
  }

  function cloneMember(member, source = 'v4-transfer') {
    localSeq += 1;
    return {
      ...member,
      memberId: `${source}-${Date.now().toString(36)}-${localSeq.toString(36)}`,
      sourceMemberId: member?.memberId || member?.sourceMemberId || null,
      source
    };
  }

  function smbhCoreFromGalaxy(other) {
    const t = TIERS[SMBH];
    return {
      memberId: `captured-core-${Date.now().toString(36)}-${(++localSeq).toString(36)}`,
      sourceMemberId: null,
      name: `${other.realName || other.name || 'GALAXY'} CORE BLACK HOLE`,
      realName: `${other.realName || other.name || 'GALAXY'} CORE BLACK HOLE`,
      tier: SMBH,
      radiusM: t.r,
      massKg: t.m * .65,
      speedMS: t.v,
      kind: 'blackhole',
      color: t.color,
      identityId: null,
      namedSpriteBase: null,
      scienceClass: 'SUPERMASSIVE BLACK HOLE',
      identityStatus: 'captured-galactic-core',
      galaxyProfile: null,
      clusterProfile: null,
      source: 'galaxy-jackpot-core'
    };
  }

  function selectedOutsideExisting(source, existing, count) {
    const used = new Set((existing || []).map(m => m.sourceMemberId || m.memberId));
    const pool = (source || []).filter(m => !used.has(m.memberId));
    const picked = [];
    while (pool.length && picked.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(cloneMember(pool.splice(index, 1)[0]));
    }
    return picked;
  }

  function ensureTransferCount(scene, pending, desired) {
    const source = Array.isArray(scene.other?.phase4Members) ? scene.other.phase4Members : [];
    pending.transferInMembers ||= [];
    if (pending.transferInMembers.length >= desired || !source.length) return;
    pending.transferInMembers.push(...selectedOutsideExisting(source, pending.transferInMembers, desired - pending.transferInMembers.length));
  }

  function relativeRatio(scene) {
    return Math.max(1e-8, Number(scene.other?.massKg || 1) / Math.max(1, Number(scene.player?.massKg || 1)));
  }

  function configureSystemInteraction(scene, pending) {
    if (!isSystem(scene.other)) return pending;

    const ratio = relativeRatio(scene);
    pending.v4SystemInteraction = true;
    pending.v4ClusterInteraction = scene.other.kind === 'cluster' || scene.other.tier >= CLUSTER || scene.tierIndex >= CLUSTER;
    pending.v4OpponentDominant = ratio > 1.04;
    pending.v4PlayerDominant = ratio < .96;
    pending.v4MassRatio = ratio;

    // A successful capture of another system means tidal member capture, never swallowing the
    // intact galaxy. Against a smaller galaxy there is a rare jackpot: the galaxy is completely
    // disrupted and its core + all modelled members remain with the player.
    if (
      pending.choice === 'ABSORB' && pending.success &&
      scene.tierIndex === GALAXY && scene.other.kind === 'galaxy' && scene.other.tier === GALAXY && ratio < .86
    ) {
      const jackpotChance = ratio < .48 ? .12 : ratio < .68 ? .075 : .045;
      if (Math.random() < jackpotChance) {
        const members = Array.isArray(scene.other.phase4Members) ? scene.other.phase4Members : [];
        pending.v4GalaxyJackpot = true;
        pending.transferInMembers = [smbhCoreFromGalaxy(scene.other), ...members.map(m => cloneMember(m, 'galaxy-jackpot'))];
        pending.transferOutMembers = [];
      }
    }

    if (!pending.v4GalaxyJackpot && pending.choice === 'ABSORB' && pending.success) {
      if (scene.other.kind === 'cluster' || scene.other.tier >= CLUSTER) ensureTransferCount(scene, pending, ratio > 3.5 ? 1 : 2);
      else if (scene.other.kind === 'galaxy') ensureTransferCount(scene, pending, ratio < .72 ? 3 : 2);
    }

    if (pending.choice === 'DEFLECT' && pending.result === 'steal') {
      const desired = scene.other.kind === 'cluster' ? 1 : ratio < .72 ? 2 : 1;
      ensureTransferCount(scene, pending, desired);
    }

    // Large clusters should be more capable of stripping than ordinary peer galaxies.
    if (pending.v4ClusterInteraction && pending.result === 'stripped' && Array.isArray(scene.phase4Members)) {
      const targetLoss = scene.other.kind === 'cluster' && ratio > 2.5 ? 2 : 1;
      pending.transferOutMembers ||= [];
      const used = new Set(pending.transferOutMembers.map(m => m.memberId));
      const choices = scene.phase4Members.filter(m => !used.has(m.memberId));
      while (pending.transferOutMembers.length < targetLoss && choices.length) {
        pending.transferOutMembers.push({ ...choices.splice(Math.floor(Math.random() * choices.length), 1)[0] });
      }
    }

    return pending;
  }

  function miniGalaxy(scene, member, x, y, radius) {
    const c = scene.add.container(x, y), g = scene.add.graphics();
    const color = member.color || C.cyan;
    const profile = member.galaxyProfile || 'generic';
    const arms = profile === 'milkyway' || profile === 'pinwheel' ? 4 : profile === 'triangulum' ? 3 : 2;
    const flat = profile === 'andromeda' ? .40 : profile === 'sombrero' ? .26 : .70;
    for (let arm = 0; arm < arms; arm++) {
      const start = arm * Math.PI * 2 / arms;
      g.lineStyle(Math.max(1.1, radius * .10), color, .62).beginPath();
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, a = start + t * Math.PI * 1.42, d = radius * (.14 + .84 * t);
        const px = Math.cos(a) * d, py = Math.sin(a) * d * flat;
        if (!i) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    g.fillStyle(0xffefc1, .92).fillCircle(0, 0, Math.max(1.4, radius * .14));
    c.add(g); scene.ui.add(c); return c;
  }

  function transferVisual(scene, member, x, y, radius = 8) {
    if (member.kind === 'galaxy' || member.tier === GALAXY) return miniGalaxy(scene, member, x, y, radius);
    const object = {
      name: member.name, realName: member.realName || member.name, tier: member.tier,
      radiusM: member.radiusM, massKg: member.massKg, speedMS: member.speedMS,
      kind: member.kind, color: member.color, solid: false,
      identityId: member.identityId, namedSpriteBase: member.namedSpriteBase,
      scienceClass: member.scienceClass, identityStatus: member.identityStatus
    };
    return baseDrawObject.call(scene, x, y, radius, object, false, false);
  }

  function transferRadius(member) {
    if (member.tier >= GALAXY || member.kind === 'galaxy') return 9.5;
    if (member.kind === 'blackhole') return 7.5;
    if (member.kind === 'nebula') return 8.5;
    return 6.5;
  }

  function curvedTransfer(scene, member, from, to, delay = 0) {
    const v = transferVisual(scene, member, from.x, from.y, transferRadius(member));
    const control = {
      x: (from.x + to.x) / 2 + (to.y - from.y) * .22,
      y: (from.y + to.y) / 2 - (to.x - from.x) * .18
    };
    scene.tweens.addCounter({
      from: 0, to: 1, delay, duration: 620, ease: 'Sine.inOut',
      onUpdate: tw => {
        const t = tw.getValue(), u = 1 - t;
        v.x = u*u*from.x + 2*u*t*control.x + t*t*to.x;
        v.y = u*u*from.y + 2*u*t*control.y + t*t*to.y;
        v.setScale(Phaser.Math.Linear(1, .46, t));
      },
      onComplete: () => v.destroy(true)
    });
  }

  function animateMemberExchange(scene, p, o, pending, delay = 0) {
    const incoming = pending.transferInMembers || [], outgoing = pending.transferOutMembers || [];
    incoming.forEach((m, i) => curvedTransfer(scene, m,
      { x:o.x + Phaser.Math.Between(-18,18), y:o.y + Phaser.Math.Between(-15,15) },
      { x:p.x + Phaser.Math.Between(-38,38), y:p.y + Phaser.Math.Between(-28,28) },
      delay + i * 105));
    outgoing.forEach((m, i) => curvedTransfer(scene, m,
      { x:p.x + Phaser.Math.Between(-18,18), y:p.y + Phaser.Math.Between(-15,15) },
      { x:o.x + Phaser.Math.Between(-38,38), y:o.y + Phaser.Math.Between(-28,28) },
      delay + i * 95));
  }

  function parkDominant(scene, dominant, centreX, centreY, scale = 1.08, duration = 480) {
    return scene.tweens.add({ targets:dominant, x:centreX, y:centreY, scale, duration, ease:'Sine.inOut' });
  }

  function orbitFlyby(scene, mover, anchor, options = {}) {
    const cx = options.cx ?? W/2, cy = options.cy ?? scene.Y(405);
    const rx = options.rx ?? 118, ry = options.ry ?? 54;
    const turns = options.turns ?? 1.08;
    const startAngle = options.startAngle ?? Math.atan2(mover.y - cy, mover.x - cx);
    const exitRight = options.exitRight ?? mover.x < cx;
    const startScale = Number(mover.scaleX) || 1;

    scene.tweens.addCounter({
      from:0, to:1, duration:options.duration ?? 1500, ease:'Sine.inOut',
      onUpdate:tw=>{
        const t=tw.getValue(), a=startAngle + t*Math.PI*2*turns;
        const tighten=1-.16*Math.sin(Math.PI*t);
        mover.x=cx+Math.cos(a)*rx*tighten;
        mover.y=cy+Math.sin(a)*ry*tighten;
        mover.setScale(startScale*(.94+.06*Math.abs(Math.cos(a))));
      }
    });

    scene.time.delayedCall(options.exchangeAt ?? 610, () => animateMemberExchange(scene, options.player, options.opponent, options.pending, 0));
    scene.time.delayedCall(options.exitAt ?? 1260, () => {
      if (options.dissolve) {
        scene.tweens.add({targets:mover,scale:.25,alpha:0,duration:360,ease:'Cubic.in'});
      } else {
        scene.tweens.add({targets:mover,x:exitRight?W+55:-55,y:scene.Y(250),duration:430,ease:'Cubic.out'});
      }
    });
  }

  function animateGalaxyEncounter(scene, p, o, pending) {
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    const ratio = pending.v4MassRatio || relativeRatio(scene);
    const opponentDominant = ratio > 1;
    const dominant = opponentDominant ? o : p;
    const mover = opponentDominant ? p : o;
    const cx=W/2, cy=scene.Y(405);

    parkDominant(scene, dominant, cx, cy, opponentDominant ? 1.10 : 1.06, 520);
    scene.tweens.add({targets:mover,scale:opponentDominant?.78:.82,duration:500,ease:'Sine.inOut'});

    scene.time.delayedCall(470, () => orbitFlyby(scene, mover, dominant, {
      cx, cy, rx:opponentDominant?122:108, ry:opponentDominant?52:48,
      turns:1.03, duration:1450, exchangeAt:520, exitAt:1210,
      player:p, opponent:o, pending,
      dissolve:!!pending.v4GalaxyJackpot && mover===o,
      exitRight:mover===o
    }));
    scene.time.delayedCall(2100, () => scene.resolve());
  }

  function animateClusterEncounter(scene, p, o, pending) {
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    const opponentIsCluster = scene.other.kind === 'cluster' || scene.other.tier >= CLUSTER;
    const playerIsCluster = scene.tierIndex >= CLUSTER;
    const ratio = pending.v4MassRatio || relativeRatio(scene);
    let cluster, traveller;

    if (opponentIsCluster && !playerIsCluster) { cluster=o; traveller=p; }
    else if (playerIsCluster && !opponentIsCluster) { cluster=p; traveller=o; }
    else if (ratio >= 1) { cluster=o; traveller=p; }
    else { cluster=p; traveller=o; }

    const cx=W/2, cy=scene.Y(405);
    // The cluster becomes the scene: zoom its animated galaxies up and let the smaller system skim
    // through the outer edge rather than making two giant structures spin around each other.
    parkDominant(scene, cluster, cx, cy, 1.42, 650);
    scene.tweens.add({targets:traveller,scale:.66,duration:600,ease:'Sine.inOut'});

    scene.time.delayedCall(560, () => orbitFlyby(scene, traveller, cluster, {
      cx, cy, rx:145, ry:69, turns:.88, duration:1580,
      exchangeAt:650, exitAt:1330,
      player:p, opponent:o, pending,
      exitRight:traveller===o
    }));

    scene.time.delayedCall(690, () => {
      const haze=scene.add.graphics();
      haze.fillStyle(C.cyan,.025).fillCircle(cx,cy,115);
      haze.lineStyle(2,C.purple,.10).strokeCircle(cx,cy,102);
      scene.ui.addAt(haze,Math.max(0,scene.ui.length-3));
      scene.tweens.add({targets:haze,alpha:0,duration:1200,onComplete:()=>haze.destroy()});
    });
    scene.time.delayedCall(2300, () => scene.resolve());
  }

  proto.outcome = function(choice) {
    const pending = baseOutcome.call(this, choice);
    if (!playable(this) || !isSystem(this.other)) return pending;
    return configureSystemInteraction(this, pending);
  };

  proto.animate = function(choice, p, o, pr, or) {
    if (!playable(this) || !isSystem(this.other) || choice === 'AVOID') return baseAnimate.call(this, choice, p, o, pr, or);

    // Keep the existing v3 smooth lower-tier capture untouched. This branch is only for galaxy /
    // cluster system interactions where an anchored flyby is more readable and more physical.
    if (this.pending?.v4ClusterInteraction) return animateClusterEncounter(this, p, o, this.pending);
    return animateGalaxyEncounter(this, p, o, this.pending);
  };

  proto.drawResult = function(result) {
    if (playable(this) && this.pending?.v4GalaxyJackpot) {
      const n = (this.pending.transferInMembers || []).length;
      result = {
        ...result,
        title:'GALAXY JACKPOT!',
        detail:`GALACTIC CORE + ${Math.max(0,n-1)} MEMBERS CAPTURED`,
        reason:'The smaller galaxy was tidally dismantled during the flyby. Its central black hole and the members you saw cross over are now separate, persistent orbitals in your system.',
        color:C.green
      };
    } else if (playable(this) && this.pending?.v4ClusterInteraction) {
      const gained=(this.pending.transferInMembers||[]).length,lost=(this.pending.transferOutMembers||[]).length;
      if (gained) result={...result,title:this.pending.choice==='ABSORB'?'CLUSTER-EDGE CAPTURE':'CLUSTER TIDAL GAIN',detail:`ORBITALS +${gained}`,reason:'You skimmed the outer cluster while its animated galaxies stayed as the dominant structure. The members that visibly peeled away are now part of your system.'};
      else if (lost) result={...result,title:'CLUSTER STRIPPING',detail:`ORBITALS -${lost}`,reason:'The cluster remained the dominant gravitational structure during the pass. The exact members you saw pulled away have been removed from your system.',color:C.orange};
      else result={...result,title:'CLUSTER FLYBY',detail:'NO MEMBERS EXCHANGED',reason:'You crossed the outer gravitational field of the cluster and escaped without retaining or losing a member.'};
    }
    return baseDrawResult.call(this, result);
  };

  window.CometPhase4SystemV4 = Object.freeze({
    enabled:true, version:V4,
    galaxyNeed:TIERS[GALAXY].need, clusterNeed:TIERS[CLUSTER].need,
    anchoredDominantFlybys:true, clusterZoomPass:true, galaxyJackpot:true,
    preservesLowerTierCapture:true
  });
})();
