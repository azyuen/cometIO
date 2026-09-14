// Compact-object gravity animation.
// Pulsars and black holes can be physically tiny while gravitationally dominating much larger,
// diffuse targets. Successful ABSORB encounters therefore use capture/compression instead of the
// normal impact-radius collision animation.
(() => {
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

  function isPulsar(object) {
    return object?.kind === 'pulsar' || tierName(object) === 'PULSAR';
  }

  function isSuccessfulCapture(pending) {
    if (!pending || pending.choice !== 'ABSORB' || pending.success === false) return false;
    return !pending.result || pending.result === 'absorb' || pending.result === 'merge';
  }

  function shouldUseCompactCapture(scene, choice) {
    if (choice !== 'ABSORB' || !isSuccessfulCapture(scene.pending)) return false;
    if (!isCompact(scene.player)) return false;
    // Use the special treatment only when the captured object is physically larger. Same-size or
    // smaller compact encounters still read naturally with the standard collision animation.
    return (scene.other?.radiusM || 0) > Math.max(scene.player?.radiusM || 0, 1e-300) * 1.15;
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

  function resetCamera(scene) {
    const camera = scene.cameras?.main;
    if (!camera) return;
    camera.stopFollow?.();
    camera.setZoom(1);
    camera.setScroll(0, 0);
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
    // A bright compact puff rather than a large impact shockwave.
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

  function blackHoleLensing(scene, x, y) {
    // Subtle accretion/lensing rings; deliberately not a collision flash.
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

  function zoomIntoCompactObject(scene, object, blackHole) {
    const camera = scene.cameras?.main;
    if (!camera) return;
    camera.pan(object.x, object.y, 430, 'Sine.easeInOut', true);
    camera.zoomTo(blackHole ? 1.62 : 1.48, 430, 'Sine.easeInOut', true);
  }

  function animatePulsarCapture(scene, p, o, pr, or) {
    const captureX = 202;
    const captureY = scene.Y(372);
    const startDiameter = Math.max(3, or * 2);

    scene.tweens.add({ targets: p, x: captureX, y: captureY, duration: 300, ease: 'Sine.inOut' });
    gravityStream(scene, o.x, o.y, captureX, captureY, C.cyan, 12);

    scene.tweens.add({
      targets: o,
      x: captureX + 7,
      y: captureY - 3,
      alpha: .32,
      duration: 860,
      ease: 'Cubic.in'
    });

    scene.tweens.addCounter({
      from: startDiameter,
      to: 2.4,
      duration: 860,
      ease: 'Cubic.in',
      onUpdate: tween => {
        if (o?.active !== false) setDisplayDiameter(o, tween.getValue(), startDiameter);
      }
    });

    scene.time.delayedCall(845, () => {
      pulsarCaptureBurst(scene, captureX, captureY);
      o.setAlpha?.(0);
    });
    scene.time.delayedCall(960, () => zoomIntoCompactObject(scene, p, false));
    scene.time.delayedCall(1430, () => {
      resetCamera(scene);
      scene.resolve();
    });
  }

  function animateBlackHoleCapture(scene, p, o, pr, or) {
    const captureX = 210;
    const captureY = scene.Y(370);
    const startX = o.x;
    const startY = o.y;
    const startDiameter = Math.max(3, or * 2);
    const dx = startX - captureX;
    const dy = startY - captureY;
    const startDistance = Math.max(1, Math.hypot(dx, dy));
    const startAngle = Math.atan2(dy, dx);

    scene.tweens.add({ targets: p, x: captureX, y: captureY, duration: 280, ease: 'Sine.inOut' });
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
        o.x = captureX + Math.cos(angle) * radius;
        o.y = captureY + Math.sin(angle) * radius * .62;
        setDisplayDiameter(o, Math.max(1.8, startDiameter * Math.pow(1 - t, 2.05)), startDiameter);
        o.setAlpha?.(t < .72 ? 1 : Math.max(0, 1 - (t - .72) / .28));
      }
    });

    scene.time.delayedCall(1010, () => {
      blackHoleLensing(scene, captureX, captureY);
      o.setAlpha?.(0);
    });
    scene.time.delayedCall(1110, () => zoomIntoCompactObject(scene, p, true));
    scene.time.delayedCall(1600, () => {
      resetCamera(scene);
      scene.resolve();
    });
  }

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    if (!shouldUseCompactCapture(this, choice)) {
      return baseAnimate.call(this, choice, p, o, pr, or);
    }

    // Stop any reveal leftovers before starting the bespoke gravitational capture sequence.
    this.tweens.killTweensOf(p);
    this.tweens.killTweensOf(o);

    if (isBlackHole(this.player)) return animateBlackHoleCapture(this, p, o, pr, or);
    if (isPulsar(this.player)) return animatePulsarCapture(this, p, o, pr, or);

    // Future compact tiers inherit pulsar-style capture unless explicitly specialized.
    return animatePulsarCapture(this, p, o, pr, or);
  };

  GameScene.prototype.shortOutcomeReason = function (pending, result) {
    if (pending?.choice === 'ABSORB' && isSuccessfulCapture(pending) && isCompact(this.player) &&
        (this.other?.radiusM || 0) > Math.max(this.player?.radiusM || 0, 1e-300) * 1.15) {
      if (isBlackHole(this.player)) return 'Gravity captured the larger target and compressed it into the black hole.';
      return 'The larger diffuse target was pulled inward and compressed by the compact object’s gravity.';
    }
    return typeof baseShortOutcomeReason === 'function'
      ? baseShortOutcomeReason.call(this, pending, result)
      : '';
  };
})();
