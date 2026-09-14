// Compact-object gravity mechanics + animation.
// Visible physical size and gravitational dominance are deliberately separate. Pulsars and black
// holes can look tiny beside stars/nebulae while still controlling the encounter through their
// much deeper gravity wells. This patch handles that dominance in either direction for ABSORB and
// DEFLECT, and keeps the frame fixed while visually enlarging the compact object at capture end.
(() => {
  const baseOutcome = GameScene.prototype.outcome;
  const baseResolve = GameScene.prototype.resolve;
  const baseAnimate = GameScene.prototype.animate;
  const baseShortOutcomeReason = GameScene.prototype.shortOutcomeReason;

  function compactTierIndex() {
    const index = TIERS.findIndex(t => t.name === 'PULSAR');
    return index >= 0 ? index : 14;
  }

  function tierName(object) {
    return TIERS[clamp(Number(object?.tier) || 0, 0, TIERS.length - 1)]?.name || object?.name || '';
  }

  function isCompact(object) {
    return Number.isFinite(object?.tier) && object.tier >= compactTierIndex();
  }

  function isBlackHole(object) {
    return object?.kind === 'blackhole' || tierName(object).includes('BLACK HOLE');
  }

  function isSupermassiveBlackHole(object) {
    return tierName(object) === 'SUPER MASSIVE BLACK HOLE';
  }

  function isPulsar(object) {
    return object?.kind === 'pulsar' || tierName(object) === 'PULSAR';
  }

  function gravityStrength(object) {
    if (!object) return 0;
    return escapeVelocity(object);
  }

  function gravityRatio(dominant, weaker) {
    return gravityStrength(dominant) / Math.max(gravityStrength(weaker), 1);
  }

  function compactDominates(compact, other) {
    return isCompact(compact) && gravityStrength(compact) > gravityStrength(other) * 1.15;
  }

  function targetCompactDominates(scene) {
    return compactDominates(scene.other, scene.player);
  }

  function playerCompactDominates(scene) {
    return compactDominates(scene.player, scene.other);
  }

  function isSuccessfulCapture(pending) {
    if (!pending || pending.choice !== 'ABSORB' || pending.success === false) return false;
    return !pending.result || pending.result === 'absorb' || pending.result === 'merge';
  }

  function shouldUseForwardCompactCapture(scene, choice) {
    if (choice !== 'ABSORB' || !isSuccessfulCapture(scene.pending)) return false;
    if (!playerCompactDominates(scene)) return false;
    return (scene.other?.radiusM || 0) > Math.max(scene.player?.radiusM || 0, 1e-300) * 1.15;
  }

  function shouldUseReverseCompactCapture(scene, choice) {
    return choice === 'ABSORB' && !!scene.pending?.compactGravityReverse && targetCompactDominates(scene);
  }

  function setDisplayDiameter(object, diameter, fallbackBaseDiameter) {
    if (!object) return;
    if (!object.cometVisual?.fallback && typeof object.setVisualDisplayDiameter === 'function') {
      object.setVisualDisplayDiameter(Math.max(1, diameter));
      return;
    }
    const base = Math.max(1, fallbackBaseDiameter || diameter);
    object.setScale(Math.max(.015, diameter / base));
  }

  function currentDisplayDiameter(object, fallback) {
    const spriteDiameter = Number(object?.cometVisual?.baseDisplayDiameterPx);
    if (Number.isFinite(spriteDiameter) && spriteDiameter > 0) return spriteDiameter;
    return Math.max(1, fallback || 1);
  }

  function gravityStream(scene, fromX, fromY, toX, toY, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = Phaser.Math.Between(15, 72);
      const dot = scene.add.circle(
        fromX + Math.cos(angle) * radius,
        fromY + Math.sin(angle) * radius,
        Phaser.Math.FloatBetween(1.2, 2.8),
        color,
        Phaser.Math.FloatBetween(.35, .85)
      );
      scene.ui.add(dot);
      scene.tweens.add({
        targets: dot,
        x: toX + Phaser.Math.Between(-4, 4),
        y: toY + Phaser.Math.Between(-4, 4),
        alpha: 0,
        scale: .15,
        delay: i * 34,
        duration: Phaser.Math.Between(360, 620),
        ease: 'Cubic.in',
        onComplete: () => dot.destroy()
      });
    }
  }

  function pulsarCaptureBurst(scene, x, y) {
    // Bright compact puff instead of a large impact-radius shockwave.
    const core = scene.add.circle(x, y, 5, C.white, .95);
    const halo = scene.add.circle(x, y, 9, C.cyan, .35);
    halo.setStrokeStyle(2, C.cyan, .9);
    scene.ui.add([halo, core]);

    scene.tweens.add({ targets: core, scale: 2.2, alpha: 0, duration: 260, ease: 'Quad.out', onComplete: () => core.destroy() });
    scene.tweens.add({ targets: halo, scale: 3.6, alpha: 0, duration: 430, ease: 'Cubic.out', onComplete: () => halo.destroy() });

    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + Phaser.Math.FloatBetween(-.15, .15);
      const spark = scene.add.rectangle(x, y, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 5), i % 3 ? C.cyan : C.white, .95);
      scene.ui.add(spark);
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * Phaser.Math.Between(18, 42),
        y: y + Math.sin(a) * Phaser.Math.Between(18, 42),
        alpha: 0,
        scale: .2,
        duration: Phaser.Math.Between(260, 430),
        ease: 'Quad.out',
        onComplete: () => spark.destroy()
      });
    }
  }

  function fragmentSpray(scene, x, y, color) {
    for (let i = 0; i < 9; i++) {
      const a = Phaser.Math.FloatBetween(-2.65, -.45);
      const chip = scene.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.7), color || C.orange, .9);
      scene.ui.add(chip);
      scene.tweens.add({
        targets: chip,
        x: x + Math.cos(a) * Phaser.Math.Between(32, 78),
        y: y + Math.sin(a) * Phaser.Math.Between(24, 64),
        alpha: 0,
        scale: .4,
        duration: Phaser.Math.Between(380, 620),
        ease: 'Quad.out',
        onComplete: () => chip.destroy()
      });
    }
  }

  function blackHoleLensing(scene, x, y) {
    [18, 27, 38].forEach((radius, i) => {
      const ring = scene.add.circle(x, y, radius, 0x000000, 0);
      ring.setStrokeStyle(i === 1 ? 3 : 2, i === 1 ? C.orange : C.purple, .65 - i * .12);
      scene.ui.add(ring);
      scene.tweens.add({
        targets: ring,
        scaleX: .28,
        scaleY: .55,
        alpha: 0,
        duration: 620 + i * 90,
        ease: 'Cubic.in',
        onComplete: () => ring.destroy()
      });
    });
  }

  function emphasizeCompactObject(scene, object, blackHole, startingDiameter) {
    // Keep the entire scene/frame fixed. Only the compact object grows visually so the player can
    // inspect what captured them; this is deliberately NOT a camera zoom.
    const start = currentDisplayDiameter(object, startingDiameter);
    const finish = Math.max(start, blackHole ? 92 : 78);

    if (blackHole) blackHoleLensing(scene, object.x, object.y);
    else {
      const halo = scene.add.circle(object.x, object.y, 12, C.cyan, .08);
      halo.setStrokeStyle(1.5, C.cyan, .55);
      scene.ui.add(halo);
      scene.tweens.add({ targets: halo, scale: 3.1, alpha: 0, duration: 520, ease: 'Sine.out', onComplete: () => halo.destroy() });
    }

    scene.tweens.addCounter({
      from: start,
      to: finish,
      duration: 430,
      ease: 'Cubic.out',
      onUpdate: tween => setDisplayDiameter(object, tween.getValue(), start)
    });
  }

  function animatePulsarCapture(scene, compact, captured, compactRadius, capturedRadius, options = {}) {
    const captureX = 210;
    const captureY = scene.Y(370);
    const compactDiameter = Math.max(3, compactRadius * 2);
    const capturedDiameter = Math.max(3, capturedRadius * 2);

    scene.tweens.add({ targets: compact, x: captureX, y: captureY, duration: 300, ease: 'Sine.inOut' });
    gravityStream(scene, captured.x, captured.y, captureX, captureY, C.cyan, 12);

    scene.tweens.add({
      targets: captured,
      x: captureX + 7,
      y: captureY - 3,
      alpha: .32,
      duration: 860,
      ease: 'Cubic.in'
    });

    scene.tweens.addCounter({
      from: capturedDiameter,
      to: 2.4,
      duration: 860,
      ease: 'Cubic.in',
      onUpdate: tween => {
        if (captured?.active !== false) setDisplayDiameter(captured, tween.getValue(), capturedDiameter);
      }
    });

    scene.time.delayedCall(845, () => {
      pulsarCaptureBurst(scene, captureX, captureY);
      captured.setAlpha?.(0);
      if (options.fragmented) fragmentSpray(scene, captureX, captureY, captured?.cometVisual?.object?.color || C.orange);
    });
    scene.time.delayedCall(950, () => emphasizeCompactObject(scene, compact, false, compactDiameter));
    scene.time.delayedCall(1430, () => scene.resolve());
  }

  function animateBlackHoleCapture(scene, compact, captured, compactRadius, capturedRadius, options = {}) {
    const captureX = 210;
    const captureY = scene.Y(370);
    const startX = captured.x;
    const startY = captured.y;
    const compactDiameter = Math.max(3, compactRadius * 2);
    const capturedDiameter = Math.max(3, capturedRadius * 2);
    const dx = startX - captureX;
    const dy = startY - captureY;
    const startDistance = Math.max(1, Math.hypot(dx, dy));
    const startAngle = Math.atan2(dy, dx);

    scene.tweens.add({ targets: compact, x: captureX, y: captureY, duration: 280, ease: 'Sine.inOut' });
    blackHoleLensing(scene, captureX, captureY);
    gravityStream(scene, startX, startY, captureX, captureY, C.purple, 9);

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1050,
      ease: 'Cubic.in',
      onUpdate: tween => {
        const t = tween.getValue();
        const radius = startDistance * Math.pow(1 - t, 1.15);
        const angle = startAngle + t * Math.PI * 3.2;
        captured.x = captureX + Math.cos(angle) * radius;
        captured.y = captureY + Math.sin(angle) * radius * .62;
        setDisplayDiameter(captured, Math.max(1.8, capturedDiameter * Math.pow(1 - t, 2.05)), capturedDiameter);
        captured.setAlpha?.(t < .72 ? 1 : Math.max(0, 1 - (t - .72) / .28));
      }
    });

    scene.time.delayedCall(1010, () => {
      blackHoleLensing(scene, captureX, captureY);
      captured.setAlpha?.(0);
      if (options.fragmented) fragmentSpray(scene, captureX, captureY, captured?.cometVisual?.object?.color || C.orange);
    });
    scene.time.delayedCall(1090, () => emphasizeCompactObject(scene, compact, true, compactDiameter));
    scene.time.delayedCall(1590, () => scene.resolve());
  }

  function animateCompactDeflect(scene, p, o, pr, or) {
    const result = scene.pending?.result;

    // If gravity wins completely, DEFLECT collapses into the same capture sequence as ABSORB.
    if (result === 'catastrophic') {
      if (isBlackHole(scene.other)) {
        return animateBlackHoleCapture(scene, o, p, or, pr, { fragmented: false });
      }
      return animatePulsarCapture(scene, o, p, or, pr, { fragmented: false });
    }

    const centerX = 220;
    const centerY = scene.Y(372);
    const startX = p.x;
    const startY = p.y;
    const endX = result === 'clean' ? 392 : 370;
    const endY = result === 'clean' ? scene.Y(218) : scene.Y(278);
    const controlX = centerX - 42;
    const controlY = centerY + (result === 'clean' ? 8 : 20);
    const startDiameter = Math.max(3, pr * 2);

    scene.tweens.add({ targets: o, x: centerX, y: centerY, duration: 240, ease: 'Sine.inOut' });
    if (isBlackHole(scene.other)) blackHoleLensing(scene, centerX, centerY);
    else gravityStream(scene, startX, startY, centerX, centerY, C.cyan, 7);

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: result === 'clean' ? 850 : 980,
      ease: 'Sine.inOut',
      onUpdate: tween => {
        const t = tween.getValue();
        const u = 1 - t;
        p.x = u * u * startX + 2 * u * t * controlX + t * t * endX;
        p.y = u * u * startY + 2 * u * t * controlY + t * t * endY;
        p.angle = -55 * t;
        if (result === 'rough') {
          setDisplayDiameter(p, startDiameter * (1 - .22 * t), startDiameter);
          p.setAlpha?.(1 - .18 * t);
        }
      }
    });

    if (result === 'rough') {
      scene.time.delayedCall(520, () => fragmentSpray(scene, p.x, p.y, scene.player?.color || C.orange));
    }
    scene.time.delayedCall(result === 'clean' ? 930 : 1060, () => scene.resolve());
  }

  // Gravity-dominant compact targets reverse the naive radius-based ABSORB result. A nebula/star
  // cannot simply swallow a tiny pulsar/black hole if the compact target's escape velocity is far
  // greater. Pulsars can tidally fragment the player; black holes are progressively more lethal.
  GameScene.prototype.outcome = function (choice) {
    const base = baseOutcome.call(this, choice);

    if (choice === 'ABSORB' && targetCompactDominates(this)) {
      const ratio = gravityRatio(this.other, this.player);
      let fatalChance;
      if (isSupermassiveBlackHole(this.other)) fatalChance = .97;
      else if (isBlackHole(this.other)) fatalChance = .88;
      else fatalChance = .58;

      // A very extreme gravity mismatch pushes the result further toward capture without ever
      // eliminating the small fragmentation-survival possibility for ordinary pulsars/black holes.
      fatalChance = clamp(fatalChance + Math.max(0, Math.log10(Math.max(1, ratio)) - 1) * .035,
        isPulsar(this.other) ? .58 : .82,
        isSupermassiveBlackHole(this.other) ? .995 : isBlackHole(this.other) ? .95 : .78);

      const fragmentChance = 1 - fatalChance;
      const result = Math.random() < fatalChance ? 'catastrophic' : 'fragment';
      return {
        ...base,
        result,
        success: result === 'fragment',
        chance: fragmentChance,
        absorbChance: 0,
        mergeChance: 0,
        fragmentChance,
        fatalChance,
        compactGravityReverse: true,
        compactGravityRatio: ratio
      };
    }

    if (choice === 'DEFLECT' && targetCompactDominates(this)) {
      const ratio = gravityRatio(this.other, this.player);
      let cleanChance, fatalChance;
      if (isSupermassiveBlackHole(this.other)) {
        cleanChance = .02;
        fatalChance = .94;
      } else if (isBlackHole(this.other)) {
        cleanChance = .06;
        fatalChance = .82;
      } else {
        cleanChance = .18;
        fatalChance = .55;
      }

      // A little extra relative speed helps a glancing escape, but compact targets remain dangerous.
      const speedHelp = clamp(this.player.speedMS / Math.max(gravityStrength(this.other), 1) * 2.5, 0, .08);
      cleanChance = clamp(cleanChance + speedHelp, .01, .30);
      fatalChance = clamp(fatalChance - speedHelp * .6, .35, .98);
      if (cleanChance + fatalChance > .98) fatalChance = .98 - cleanChance;
      const roughChance = Math.max(0, 1 - cleanChance - fatalChance);

      const roll = Math.random();
      const result = roll < fatalChance ? 'catastrophic' : roll < fatalChance + cleanChance ? 'clean' : 'rough';
      return {
        ...base,
        result,
        success: result !== 'catastrophic',
        chance: 1 - fatalChance,
        cleanChance,
        fatalChance,
        compactGravityDeflect: true,
        compactGravityRatio: ratio,
        compactGravityRoughChance: roughChance
      };
    }

    return base;
  };

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    if (shouldUseReverseCompactCapture(this, choice)) {
      this.tweens.killTweensOf(p);
      this.tweens.killTweensOf(o);
      const fragmented = this.pending?.result === 'fragment';
      if (isBlackHole(this.other)) return animateBlackHoleCapture(this, o, p, or, pr, { fragmented });
      return animatePulsarCapture(this, o, p, or, pr, { fragmented });
    }

    if (shouldUseForwardCompactCapture(this, choice)) {
      this.tweens.killTweensOf(p);
      this.tweens.killTweensOf(o);
      if (isBlackHole(this.player)) return animateBlackHoleCapture(this, p, o, pr, or);
      return animatePulsarCapture(this, p, o, pr, or);
    }

    if (choice === 'DEFLECT' && this.pending?.compactGravityDeflect && targetCompactDominates(this)) {
      this.tweens.killTweensOf(p);
      this.tweens.killTweensOf(o);
      return animateCompactDeflect(this, p, o, pr, or);
    }

    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  GameScene.prototype.resolve = function () {
    const r = this.pending;

    // DEV's resolver is deliberately preserved so the lab never mutates the live run.
    if (this._devModeActive) return baseResolve.call(this);

    if (r?.choice === 'ABSORB' && r.compactGravityReverse) {
      if (r.result === 'fragment') {
        const blackHole = isBlackHole(this.other);
        const massLoss = blackHole ? .32 : .22;
        this.player.massKg *= 1 - massLoss;
        this.player.radiusM *= Math.cbrt(1 - massLoss);
        this.player.speedMS = Math.max(120, this.player.speedMS * (blackHole ? .68 : .78));
        this.growth = Math.max(0, this.growth - Math.min(this.growth, blackHole ? .28 : .18));
        this.actionHistory.push('ABSORB');
        this.score += Math.round(12 + this.tierIndex * 8);
        this.encounters++;
        this.save(true);

        this.drawResult({
          title: blackHole ? 'TIDALLY FRAGMENTED' : 'GRAVITY FRAGMENTED YOU',
          detail: `ESCAPED • MASS -${Math.round(massLoss * 100)}%`,
          reason: blackHole
            ? `${this.other.realName} disrupted you tidally and accreted part of your material.`
            : `${this.other.realName} pulled material away before the remaining fragment escaped.`,
          color: C.orange,
          survived: true
        });
        return;
      }

      this.clearSave();
      this.drawResult({
        title: 'GRAVITY CAPTURED YOU',
        detail: `${this.other.realName} pulled you into its gravity well.`,
        reason: isBlackHole(this.other)
          ? 'The black hole was physically small but its gravity dominated the encounter and accreted you.'
          : 'The pulsar was physically small but its extreme compactness dominated the encounter.',
        color: C.red,
        survived: false
      });
      return;
    }

    return baseResolve.call(this);
  };

  GameScene.prototype.shortOutcomeReason = function (pending, result) {
    if (pending?.choice === 'ABSORB' && pending.compactGravityReverse) {
      if (pending.result === 'fragment') {
        return isBlackHole(this.other)
          ? 'The compact target tidally stripped you; a smaller remnant escaped.'
          : 'The pulsar stripped material away; a smaller remnant escaped.';
      }
      return 'The smaller-looking compact target had the deeper gravity well and captured you.';
    }

    if (pending?.choice === 'ABSORB' && isSuccessfulCapture(pending) && playerCompactDominates(this) &&
        (this.other?.radiusM || 0) > Math.max(this.player?.radiusM || 0, 1e-300) * 1.15) {
      if (isBlackHole(this.player)) return 'Gravity captured the larger target and compressed it into the black hole.';
      return 'The larger diffuse target was pulled inward and compressed by the compact object’s gravity.';
    }

    if (pending?.choice === 'DEFLECT' && pending.compactGravityDeflect) {
      if (pending.result === 'clean') return 'You curved around the compact gravity well and escaped cleanly.';
      if (pending.result === 'rough') return 'You escaped the gravity well, but tidal forces stripped material away.';
      return 'The attempted deflection passed too deep into the compact object’s gravity well and became capture.';
    }

    return typeof baseShortOutcomeReason === 'function'
      ? baseShortOutcomeReason.call(this, pending, result)
      : '';
  };
})();
