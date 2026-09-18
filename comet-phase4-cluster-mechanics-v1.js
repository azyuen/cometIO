// Phase 4 cluster-scale mechanics v1.
// At galaxy-cluster scale, the persistent exchange unit is a whole galaxy.
// A captured standalone galaxy enters intact as +1 galaxy; cluster-cluster encounters can
// transfer multiple galaxies. Cosmetic wide external Phase-4 orbitals are handled separately.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4 || !window.CometPhase4GravityV1) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = Number(P4.galaxyTier);
  const CLUSTER = Number(P4.clusterTier);
  const SUPERCLUSTER = Number(P4.superclusterTier);

  const baseOutcome = proto.outcome;
  const baseAnimate = proto.animate;
  const baseDrawHud = proto.drawHud;
  const baseDrawPrompt = proto.drawPrompt;
  const baseDrawResult = proto.drawResult;

  let seq = 0;

  function clusterScale(scene) {
    const t = Number(scene?.tierIndex);
    return t >= CLUSTER && t < SUPERCLUSTER;
  }

  function isGalaxy(object) {
    return !!object && (Number(object.tier) === GALAXY || object.kind === 'galaxy');
  }

  function isCluster(object) {
    return !!object && (Number(object.tier) >= CLUSTER || object.kind === 'cluster');
  }

  function galaxyMember(object, source = 'cluster-galaxy-transfer', preserveId = false) {
    const t = TIERS[GALAXY] || {};
    const name = object?.realName || object?.name || 'MEMBER GALAXY';
    const id = preserveId && object?.memberId
      ? object.memberId
      : 'cluster-galaxy-v1-' + Date.now().toString(36) + '-' + (++seq).toString(36);

    return {
      ...object,
      memberId: id,
      sourceMemberId: object?.memberId || object?.sourceMemberId || null,
      name,
      realName: name,
      tier: GALAXY,
      radiusM: Number(object?.radiusM) || Number(t.r) || 1,
      massKg: Number(object?.massKg) || Number(t.m) || 1,
      speedMS: Number(object?.speedMS) || Number(t.v) || 0,
      kind: 'galaxy',
      color: object?.color || t.color || C.cyan,
      galaxyProfile: object?.galaxyProfile || object?.phase4NamedProfile || 'generic',
      clusterProfile: null,
      blackHoleCore: false,
      coreIdentityId: null,
      coreNamedSpriteBase: null,
      coreName: null,
      source
    };
  }

  function shuffled(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function opponentGalaxies(scene, count) {
    const other = scene.other || {};
    if (isGalaxy(other)) return [galaxyMember(other, 'whole-galaxy-capture')].slice(0, count);

    let source = Array.isArray(other.phase4Members) ? other.phase4Members : [];
    if (!source.length) {
      source = Array.from({length: Math.max(3, count)}, (_, i) => ({
        name: 'MEMBER GALAXY ' + (i + 1),
        realName: 'MEMBER GALAXY ' + (i + 1),
        tier: GALAXY,
        kind: 'galaxy',
        radiusM: TIERS[GALAXY]?.r,
        massKg: TIERS[GALAXY]?.m,
        speedMS: TIERS[GALAXY]?.v,
        color: i % 2 ? C.cyan : C.purple,
        galaxyProfile: ['andromeda','milkyway','whirlpool','generic'][i % 4]
      }));
    }
    return shuffled(source).slice(0, Math.max(0, count)).map(m => galaxyMember(m, 'cluster-galaxy-transfer'));
  }

  function normalizeOutgoing(list) {
    return (Array.isArray(list) ? list : []).map(m => galaxyMember(m, m.source || 'cluster-galaxy-loss', true));
  }

  function ensureLossCount(scene, pending, target) {
    pending.transferOutMembers = normalizeOutgoing(pending.transferOutMembers);
    const used = new Set(pending.transferOutMembers.map(m => m.memberId));
    const choices = shuffled((scene.phase4Members || []).filter(m => m?.memberId && !used.has(m.memberId)));
    while (pending.transferOutMembers.length < target && choices.length) {
      const m = choices.shift();
      pending.transferOutMembers.push(galaxyMember(m, 'cluster-galaxy-loss', true));
      used.add(m.memberId);
    }
  }

  function transferCountForClusterCapture(ratio) {
    if (ratio < .58) return 3;
    if (ratio < 1.45) return 2;
    return 1;
  }

  function transferCountForClusterGraze(pending, ratio) {
    if (Number(pending.amount) >= 2 || ratio < .72) return ratio < .42 ? 3 : 2;
    return 1;
  }

  proto.outcome = function(choice) {
    const pending = baseOutcome.call(this, choice);
    if (!pending || !clusterScale(this) || !pending.p4GravityV1) return pending;

    const other = this.other || {};
    const ratio = Math.max(1e-8, Number(other.massKg || 1) / Math.max(1, Number(this.player?.massKg || 1)));
    const otherGalaxy = isGalaxy(other);
    const otherCluster = isCluster(other);

    pending.p4ClusterGalaxyUnitV1 = true;
    pending.p4ClusterExchangeUnit = 'GALAXY';

    // At cluster scale a standalone galaxy is one indivisible gameplay member.
    if (choice === 'ABSORB' && pending.success && otherGalaxy) {
      pending.transferInMembers = [galaxyMember(other, 'whole-galaxy-capture')];
      pending.amount = 1;
      pending.p4ClusterWholeGalaxyCapture = true;
      pending.p4MajorMerger = false;
    }

    // Cluster-cluster capture can bring across several whole member galaxies.
    if (choice === 'ABSORB' && pending.success && otherCluster && !otherGalaxy) {
      const count = transferCountForClusterCapture(ratio);
      pending.transferInMembers = opponentGalaxies(this, count);
      pending.amount = pending.transferInMembers.length;
      pending.p4ClusterMultiGalaxyGain = pending.amount > 1;
    }

    // A successful tidal graze exchanges galaxies, never sub-galactic objects.
    if (choice === 'DEFLECT' && pending.result === 'steal') {
      const count = otherGalaxy ? 1 : transferCountForClusterGraze(pending, ratio);
      pending.transferInMembers = opponentGalaxies(this, count);
      pending.amount = pending.transferInMembers.length;
      pending.p4ClusterMultiGalaxyGain = pending.amount > 1;
    }

    // Sacrifices and losses at cluster scale are member galaxies. Cluster-cluster encounters
    // can strip several depending on severity / mass disadvantage.
    pending.transferOutMembers = normalizeOutgoing(pending.transferOutMembers);

    if (pending.result === 'stripped' || pending.result === 'captured' || (choice === 'AVOID' && !pending.success)) {
      let target = pending.transferOutMembers.length;

      if (otherCluster && !otherGalaxy) {
        if (pending.result === 'captured') {
          target = Math.max(target, Math.min(Math.max(1, (this.phase4Members || []).length - 1), ratio > 2.2 ? 4 : 3));
        } else if (choice === 'DEFLECT') {
          const sev = Number(pending.v7GrazeSeverity) || 0;
          target = Math.max(target, sev > .72 ? 3 : sev > .48 ? 2 : 1);
        } else if (choice === 'ABSORB') {
          target = Math.max(target, ratio > 2.0 ? 3 : 2);
        } else if (choice === 'AVOID') {
          target = Math.max(target, ratio > 2.5 ? 2 : 1);
        }
      } else if (otherGalaxy) {
        // A single galaxy can perturb/strip the cluster, but it cannot steal several cluster
        // galaxies in one ordinary encounter.
        target = Math.max(target, pending.result === 'captured' ? 2 : 1);
      }

      ensureLossCount(this, pending, target);
      pending.p4ClusterMultiGalaxyLoss = pending.transferOutMembers.length > 1;
    }

    return pending;
  };

  function animateWholeGalaxyCapture(scene, playerVisual, galaxyVisual) {
    scene.tweens.killTweensOf(playerVisual);
    scene.tweens.killTweensOf(galaxyVisual);

    const sx = galaxyVisual.x, sy = galaxyVisual.y;
    const tx = playerVisual.x, ty = playerVisual.y;
    const cx = (sx + tx) / 2 + (ty - sy) * .20;
    const cy = (sy + ty) / 2 - (tx - sx) * .16;
    const startScale = Number(galaxyVisual.scaleX) || 1;

    scene.tweens.add({
      targets: playerVisual,
      scaleX: 1.05, scaleY: 1.05,
      duration: 520, yoyo: true, ease: 'Sine.inOut'
    });

    scene.tweens.addCounter({
      from: 0, to: 1, duration: 1080, ease: 'Cubic.inOut',
      onUpdate: tw => {
        const t = tw.getValue(), u = 1 - t;
        galaxyVisual.x = u*u*sx + 2*u*t*cx + t*t*tx;
        galaxyVisual.y = u*u*sy + 2*u*t*cy + t*t*ty;
        const scale = Phaser.Math.Linear(startScale, .14, t);
        galaxyVisual.setScale(scale);
        galaxyVisual.setAlpha(1 - .22 * t);
      },
      onComplete: () => {
        scene.flash(tx, ty, C.cyan);
        galaxyVisual.setAlpha(0);
      }
    });

    scene.time.delayedCall(1240, () => scene.resolve());
  }

  proto.animate = function(choice, p, o, pr, or) {
    if (
      clusterScale(this) &&
      choice === 'ABSORB' &&
      this.pending?.success &&
      this.pending?.p4ClusterWholeGalaxyCapture &&
      isGalaxy(this.other)
    ) {
      return animateWholeGalaxyCapture(this, p, o);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function relabelClusterUI(scene) {
    if (!clusterScale(scene)) return;
    walk(scene.ui, node => {
      if (typeof node?.text !== 'string' || typeof node.setText !== 'function') return;
      let text = node.text;
      if (text === 'ORBITALS') text = 'GALAXIES';
      if (text === 'ORBITAL SACRIFICE') text = 'GALAXY SACRIFICE';
      text = text.replace(/\bORBITALS\b/g, 'GALAXIES');
      text = text.replace(/\bORBITAL SACRIFICE\b/g, 'GALAXY SACRIFICE');
      if (text !== node.text) node.setText(text);
    });
  }

  proto.drawHud = function(...args) {
    const out = baseDrawHud.apply(this, args);
    relabelClusterUI(this);
    return out;
  };

  proto.drawPrompt = function(...args) {
    const out = baseDrawPrompt.apply(this, args);
    relabelClusterUI(this);
    return out;
  };

  proto.drawResult = function(result) {
    let patched = result;
    if (this.pending?.p4ClusterGalaxyUnitV1 && result) {
      patched = {...result};
      if (typeof patched.detail === 'string') patched.detail = patched.detail.replace(/\bORBITALS\b/g, 'GALAXIES');
    }

    const out = baseDrawResult.call(this, patched);

    if (this.pending?.p4ClusterGalaxyUnitV1) {
      walk(this.ui, node => {
        if (typeof node?.text !== 'string' || typeof node.setText !== 'function') return;
        let text = node.text.replace(/\bORBITALS\b/g, 'GALAXIES').replace(/\bORBITAL SACRIFICE\b/g, 'GALAXY SACRIFICE');

        if (this.pending.p4ClusterWholeGalaxyCapture && text === 'BOUND CAPTURE') text = 'GALAXY CAPTURED';
        if (this.pending.p4ClusterWholeGalaxyCapture && /Low enough angular momentum and relative velocity let gravity bind material/.test(text)) {
          text = 'The entire galaxy became gravitationally bound and joined your cluster as one intact member galaxy.';
        }

        if (this.pending.p4ClusterMultiGalaxyGain && text === 'BOUND CAPTURE') text = 'GALAXIES CAPTURED';
        if (this.pending.p4ClusterMultiGalaxyGain && text === 'TIDAL GAIN') text = 'GALAXIES GAINED';

        if (text !== node.text) node.setText(text);
      });
    }
    return out;
  };

  window.CometPhase4ClusterMechanicsV1 = Object.freeze({
    enabled: true,
    version: 1,
    clusterExchangeUnit: 'GALAXY',
    standaloneGalaxyCaptureAddsExactlyOne: true,
    clusterClusterCanGainMultiple: true,
    clusterClusterCanLoseMultiple: true,
    wholeGalaxyCaptureAnimation: true
  });
})();