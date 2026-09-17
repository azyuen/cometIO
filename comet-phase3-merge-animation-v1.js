// Phase 3 Pulsar merge animation.
// Successful Pulsar ABSORB/MERGE against a smaller or roughly similar-sized revealed object should
// visually combine into ONE resulting object: converge -> compact flash -> new single sprite.
// This deliberately intercepts only the near/smaller-body case; gravity-capture animations remain
// authoritative when a Pulsar is swallowing a physically much larger object.
(() => {
  const proto = GameScene.prototype;
  const baseAnimate = proto.animate;

  function tierName(object) {
    const idx = Math.max(0, Math.min(TIERS.length - 1, Number(object?.tier) || 0));
    return TIERS[idx]?.name || object?.name || '';
  }

  function playerIsPulsar(scene) {
    return scene?.player?.kind === 'pulsar' || tierName(scene?.player) === 'PULSAR';
  }

  function successfulPulsarMerge(scene, choice, pr, or) {
    const pending = scene?.pending;
    if (choice !== 'ABSORB' || !playerIsPulsar(scene)) return false;
    if (!pending || pending.success === false || pending.compactGravityReverse) return false;
    if (pending.result !== 'absorb' && pending.result !== 'merge' && pending.result !== 'clean') return false;

    // Smaller target or a near peer. Larger diffuse bodies still use the established compact-gravity
    // capture animation, which is visually and scientifically more appropriate for those encounters.
    const playerDisplay = Math.max(1, Number(pr) || 1);
    const targetDisplay = Math.max(1, Number(or) || 1);
    return targetDisplay <= playerDisplay * 1.6;
  }

  function renderedSnapshot(object, container) {
    if (!object) return null;
    const snapshot = { ...object };
    const handle = container?.cometVisual;
    const image = handle?.image;
    if (handle?.variant) snapshot.cometVisualVariant = handle.variant;
    if (image) {
      const angle = Number(image.angle);
      if (Number.isFinite(angle)) snapshot.cometVisualRotation = angle;
      snapshot.cometVisualFlipX = !!image.flipX;
      snapshot.cometVisualAlpha = Number.isFinite(Number(image.alpha)) ? Number(image.alpha) : 1;
      if (Object.prototype.hasOwnProperty.call(handle, 'tint')) snapshot.cometVisualTint = handle.tint ?? null;
    }
    return snapshot;
  }

  function freezeResultComparison(scene, p, o) {
    // result-fidelity normally captures these inside its animate wrapper. Because this Phase 3 path
    // intentionally handles animation before delegating, preserve the exact revealed sprites here.
    scene._resultComparisonPlayer = renderedSnapshot(scene.player, p);
    scene._resultComparisonOther = renderedSnapshot(scene.other, o);
  }

  function predictedResultObject(scene) {
    const pending = scene.pending || {};
    const player = scene.player || {};
    const other = scene.other || {};
    const currentTier = Math.max(0, Math.min(TIERS.length - 1, Number(scene.tierIndex) || Number(player.tier) || 0));
    const multiplier = pending.result === 'merge' ? 1.2 : 1;
    const gp = typeof scene.growthPoints === 'function' ? scene.growthPoints() * multiplier : 0;

    let tierIndex = currentTier;
    let growth = (Number(scene.growth) || 0) + gp;
    while (tierIndex < TIERS.length - 1 && growth >= TIERS[tierIndex].need) {
      growth -= TIERS[tierIndex].need;
      tierIndex++;
    }

    const tier = TIERS[tierIndex];
    let mass = Number(player.massKg) || tier.m;
    let radius = Number(player.radiusM) || tier.r;
    let speed = Number(player.speedMS) || tier.v;

    if (tierIndex !== currentTier) {
      mass = tier.m;
      radius = tier.r;
      speed = tier.v;
    } else if (pending.result === 'merge') {
      const massGain = Math.min((Number(other.massKg) || 0) * .28, mass * 1.4);
      mass += massGain;
      radius *= Math.cbrt(1 + massGain / Math.max(mass, 1e-300));
      const speedRatio = Number(pending.speedRatio) || 1;
      const speedLoss = clamp(.09 + .04 * Math.max(0, speedRatio - 1), .08, .20);
      speed = Math.max(120, speed * (1 - speedLoss));
    } else {
      const tierMass = TIERS[currentTier]?.m || mass;
      const massGain = Math.min(Number(other.massKg) || 0, Math.max(mass * 2, tierMass * .75));
      const gained = massGain * .35;
      mass += gained;
      radius *= Math.cbrt(1 + gained / Math.max(mass, 1e-300));
      speed = clamp(speed + clamp((Number(other.speedMS) || 0) * .06, 20, 18000), 120, 1.5e6);
    }

    // Do NOT copy the old visual identity. drawObject() will select a legitimate new variant and the
    // existing sprite-continuity layer will stage/adopt that exact appearance for the next round.
    return {
      name: tier.name,
      realName: `MERGED ${tier.name}`,
      tier: tierIndex,
      radiusM: radius,
      massKg: mass,
      speedMS: speed,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      hint: tier.hint
    };
  }

  function addMergeFlash(scene, x, y, color) {
    const core = scene.add.circle(x, y, 8, C.white, 1);
    const haloA = scene.add.circle(x, y, 13, C.cyan, .10);
    const haloB = scene.add.circle(x, y, 19, color || C.cyan, .06);
    haloA.setStrokeStyle(3, C.white, .92);
    haloB.setStrokeStyle(2, C.cyan, .82);
    scene.ui.add([haloB, haloA, core]);

    scene.tweens.add({targets:core,scale:3.2,alpha:0,duration:230,ease:'Quad.out',onComplete:()=>core.destroy()});
    scene.tweens.add({targets:haloA,scale:4.2,alpha:0,duration:420,ease:'Cubic.out',onComplete:()=>haloA.destroy()});
    scene.tweens.add({targets:haloB,scale:3.4,alpha:0,duration:520,ease:'Cubic.out',onComplete:()=>haloB.destroy()});

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Phaser.Math.FloatBetween(-.12, .12);
      const distance = Phaser.Math.Between(24, 66);
      const particle = scene.add.rectangle(
        x, y,
        Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 5),
        i % 4 === 0 ? C.white : (i % 2 ? C.cyan : (color || C.purple)),
        .95
      );
      particle.rotation = angle;
      scene.ui.add(particle);
      scene.tweens.add({
        targets:particle,
        x:x + Math.cos(angle) * distance,
        y:y + Math.sin(angle) * distance,
        alpha:0,
        scale:.25,
        duration:Phaser.Math.Between(300,520),
        ease:'Quad.out',
        onComplete:()=>particle.destroy()
      });
    }
  }

  function animatePulsarMerge(scene, p, o, pr, or) {
    freezeResultComparison(scene, p, o);

    const x = W / 2;
    const y = scene.Y(375);
    const preview = predictedResultObject(scene);
    const resultRadius = Math.min(68, Math.max(24, Math.max(Number(pr) || 24, Number(or) || 24) * 1.18));

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);

    // Both bodies converge rather than remaining visibly superimposed.
    scene.tweens.add({
      targets:p,
      x,y,
      scaleX:(p.scaleX || 1) * .82,
      scaleY:(p.scaleY || 1) * .82,
      duration:610,
      ease:'Cubic.in'
    });
    scene.tweens.add({
      targets:o,
      x,y,
      scaleX:(o.scaleX || 1) * .72,
      scaleY:(o.scaleY || 1) * .72,
      angle:'+=28',
      duration:610,
      ease:'Cubic.in'
    });

    scene.time.delayedCall(590, () => {
      p.setAlpha?.(0);
      o.setAlpha?.(0);
      addMergeFlash(scene, x, y, scene.player?.color || C.cyan);
    });

    scene.time.delayedCall(760, () => {
      const result = scene.drawObject(x, y, resultRadius, preview, false, true);
      result.setScale?.(.38);
      result.setAlpha?.(.05);
      scene.tweens.add({
        targets:result,
        scaleX:1,
        scaleY:1,
        alpha:1,
        duration:390,
        ease:'Back.out'
      });
    });

    // Leave the single combined object visible for a beat before the result card appears.
    scene.time.delayedCall(1420, () => scene.resolve());
  }

  proto.animate = function (choice, p, o, pr, or) {
    if (successfulPulsarMerge(this, choice, pr, or)) {
      return animatePulsarMerge(this, p, o, pr, or);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  window.CometPhase3MergeAnimation = Object.freeze({
    enabled:true,
    player:'PULSAR',
    outcomes:['absorb','merge'],
    maxTargetDisplayRatio:1.6,
    sequence:'converge-flash-single-result-sprite',
    labCompatible:true,
    continuityCompatible:true
  });
})();
