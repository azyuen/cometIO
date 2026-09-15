// Encounter animation refinement v1.
// - Clean pre-pulsar ABSORB: collide -> burst -> resulting larger object -> pause -> result.
// - DEFLECT: visible contact debris/sparks.
// - AVOID: gravity-like curved trajectories instead of sharp angular turns.
(() => {
  const baseAnimate = GameScene.prototype.animate;
  const PULSAR_TIER = Math.max(0, TIERS.findIndex(t => t.name === 'PULSAR'));

  function trackFx(scene, object) {
    if (scene.ui && object) scene.ui.add(object);
    return object;
  }

  function impactBurst(scene, x, y, color = C.orange, count = 15, biasAngle = null) {
    const flash = trackFx(scene, scene.add.circle(x, y, 7, C.white, .92));
    const ring = trackFx(scene, scene.add.circle(x, y, 10, color, .10));
    ring.setStrokeStyle(2, color, .9);

    scene.tweens.add({
      targets: flash, scale: 2.5, alpha: 0, duration: 180, ease: 'Quad.out',
      onComplete: () => flash.destroy()
    });
    scene.tweens.add({
      targets: ring, scale: 4.5, alpha: 0, duration: 360, ease: 'Cubic.out',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < count; i++) {
      const base = biasAngle == null ? Phaser.Math.FloatBetween(0, Math.PI * 2) : biasAngle;
      const angle = biasAngle == null ? base : base + Phaser.Math.FloatBetween(-1.15, 1.15);
      const dist = Phaser.Math.Between(20, 62);
      const size = Phaser.Math.Between(2, 4);
      const particle = trackFx(scene, scene.add.rectangle(
        x + Phaser.Math.Between(-2, 2),
        y + Phaser.Math.Between(-2, 2),
        size,
        Phaser.Math.Between(2, 5),
        i % 4 === 0 ? C.white : color,
        Phaser.Math.FloatBetween(.72, 1)
      ));
      particle.rotation = angle;
      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: .25,
        duration: Phaser.Math.Between(260, 480),
        ease: 'Quad.out',
        onComplete: () => particle.destroy()
      });
    }
  }

  function explosionBurst(scene, x, y, objectColor) {
    const colors = [C.white, C.orange, objectColor || C.orange];
    [9, 16, 24].forEach((radius, index) => {
      const ring = trackFx(scene, scene.add.circle(x, y, radius, colors[index % colors.length], .08));
      ring.setStrokeStyle(index === 1 ? 3 : 2, colors[index % colors.length], .82 - index * .13);
      scene.tweens.add({
        targets: ring,
        scale: 2.4 + index * .35,
        alpha: 0,
        duration: 300 + index * 90,
        ease: 'Cubic.out',
        onComplete: () => ring.destroy()
      });
    });
    impactBurst(scene, x, y, objectColor || C.orange, 22);
  }

  function successfulCleanAbsorb(scene) {
    const r = scene.pending;
    if (!r || r.choice !== 'ABSORB' || r.success === false) return false;
    return r.result === 'clean' || r.result === 'absorb' || r.result === 'merge' || !r.result;
  }

  function belowPulsar(scene) {
    return scene.player?.tier < PULSAR_TIER && scene.other?.tier < PULSAR_TIER;
  }

  function tierShortName(name) {
    return String(name || '')
      .replace('YELLOW DWARF STAR', 'YELLOW DWARF')
      .replace('BLUE GIANT STAR', 'BLUE GIANT')
      .replace('RED HYPERGIANT STAR', 'RED HYPERGIANT');
  }

  function predictedAbsorbObject(scene) {
    const gp = scene.growthPoints();
    let tierIndex = scene.tierIndex;
    let growth = scene.growth + gp;

    while (tierIndex < TIERS.length - 1 && growth >= TIERS[tierIndex].need) {
      growth -= TIERS[tierIndex].need;
      tierIndex++;
    }

    const tier = TIERS[tierIndex];
    const evolved = tierIndex !== scene.tierIndex;
    const addedMass = Math.min(scene.other.massKg, scene.player.massKg * 4) * .35;
    const predictedMass = evolved ? tier.m : scene.player.massKg + addedMass;
    const predictedRadius = evolved
      ? tier.r
      : scene.player.radiusM * Math.cbrt(Math.max(1, predictedMass / Math.max(scene.player.massKg, 1e-300)));

    return {
      evolved,
      tierIndex,
      object: {
        name: tier.name,
        realName: tier.examples?.[0] || tier.name,
        tier: tierIndex,
        radiusM: predictedRadius,
        massKg: predictedMass,
        speedMS: evolved ? tier.v : scene.player.speedMS,
        kind: tier.kind,
        color: tier.color,
        solid: tier.solid,
        hint: tier.hint
      }
    };
  }

  function animateAbsorbMerge(scene, p, o, pr, or) {
    const x = W / 2;
    const y = scene.Y(375);
    const preview = predictedAbsorbObject(scene);
    const startRadius = Math.max(14, Math.min(48, Math.max(pr, 16)));
    const resultRadius = Math.min(64, startRadius * (preview.evolved ? 1.42 : 1.22));

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);
    scene.tweens.add({ targets: p, x, y, duration: 560, ease: 'Cubic.in' });
    scene.tweens.add({ targets: o, x, y, duration: 560, ease: 'Cubic.in' });

    scene.time.delayedCall(545, () => {
      p.setAlpha?.(0);
      o.setAlpha?.(0);
      explosionBurst(scene, x, y, scene.player?.color || C.orange);
    });

    scene.time.delayedCall(710, () => {
      const result = scene.drawObject(x, y, resultRadius, preview.object, false, true);
      result.setScale(.48);
      result.setAlpha(.08);
      scene.tweens.add({
        targets: result, scale: 1, alpha: 1, duration: 330, ease: 'Back.out'
      });

      if (preview.evolved) {
        const label = scene.addText(
          x,
          y + resultRadius + 26,
          `TIER UP • ${tierShortName(preview.object.name)}`,
          9,
          C.green,
          { ox: .5, bold: true }
        );
        label.setAlpha(0);
        scene.tweens.add({ targets: label, alpha: 1, duration: 210, delay: 90 });
      }
    });

    // Give the new merged/progression object a short beat before the result screen replaces it.
    scene.time.delayedCall(1360, () => scene.resolve());
  }

  function animateDeflect(scene, p, o) {
    const result = scene.pending?.result;
    const impactX = 218;
    const impactY = scene.Y(365);

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);
    scene.tweens.add({
      targets: p, x: 198, y: scene.Y(340), angle: -25, duration: 540, ease: 'Quad.in'
    });
    scene.tweens.add({
      targets: o, x: 245, y: scene.Y(400), duration: 540, ease: 'Quad.in'
    });

    scene.time.delayedCall(525, () => {
      impactBurst(scene, impactX, impactY, C.orange, result === 'rough' ? 18 : 13, -.65);

      if (result === 'clean') {
        scene.tweens.add({
          targets: p, x: 392, y: scene.Y(205), angle: -70, duration: 590, ease: 'Cubic.out'
        });
      } else if (result === 'rough') {
        scene.tweens.add({
          targets: p, x: 368, y: scene.Y(270), angle: -35, scale: .82, duration: 670, ease: 'Cubic.out'
        });
      }
    });

    scene.time.delayedCall(result === 'rough' ? 1210 : 1140, () => scene.resolve());
  }

  function cubicPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
    };
  }

  function cubicTangent(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return {
      x: 3*u*u*(p1.x-p0.x) + 6*u*t*(p2.x-p1.x) + 3*t*t*(p3.x-p2.x),
      y: 3*u*u*(p1.y-p0.y) + 6*u*t*(p2.y-p1.y) + 3*t*t*(p3.y-p2.y)
    };
  }

  function animateAvoidSuccess(scene, p, o) {
    scene.tweens.killTweensOf(p);
    const start = { x: p.x, y: p.y };
    const target = { x: o.x, y: o.y };
    const end = { x: W + 28, y: scene.Y(205) };
    const c1 = { x: start.x + 86, y: start.y + 18 };
    const c2 = { x: target.x - 34, y: target.y - 78 };

    scene.tweens.addCounter({
      from: 0, to: 1, duration: 1080, ease: 'Sine.inOut',
      onUpdate: tween => {
        const t = tween.getValue();
        const point = cubicPoint(t, start, c1, c2, end);
        const tangent = cubicTangent(t, start, c1, c2, end);
        p.x = point.x;
        p.y = point.y;
        p.angle = Phaser.Math.RadToDeg(Math.atan2(tangent.y, tangent.x));
      }
    });

    scene.time.delayedCall(1120, () => scene.resolve());
  }

  function animateAvoidFailure(scene, p, o) {
    scene.tweens.killTweensOf(p);
    const start = { x: p.x, y: p.y };
    const end = { x: o.x, y: o.y };
    const c1 = { x: start.x + 95, y: start.y - 12 };
    const c2 = { x: end.x - 92, y: end.y - 92 };
    const startingScaleX = p.scaleX || 1;
    const startingScaleY = p.scaleY || 1;

    scene.tweens.addCounter({
      from: 0, to: 1, duration: 1050, ease: 'Cubic.in',
      onUpdate: tween => {
        const t = tween.getValue();
        const point = cubicPoint(t, start, c1, c2, end);
        const tangent = cubicTangent(t, start, c1, c2, end);
        p.x = point.x;
        p.y = point.y;
        p.angle = Phaser.Math.RadToDeg(Math.atan2(tangent.y, tangent.x)) + 180 * t;
        p.setScale(startingScaleX * (1 - .68 * t), startingScaleY * (1 - .68 * t));
        p.setAlpha?.(1 - .42 * t);
      }
    });

    scene.time.delayedCall(1010, () => impactBurst(scene, o.x, o.y, C.red, 10));
    scene.time.delayedCall(1160, () => scene.resolve());
  }

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    // Preserve pulsar/black-hole custom gravity capture animations.
    if (choice === 'ABSORB' && successfulCleanAbsorb(this) && belowPulsar(this)) {
      return animateAbsorbMerge(this, p, o, pr, or);
    }

    // Preserve compact-target deflection physics, adding only a small visible contact burst.
    if (choice === 'DEFLECT' && this.pending?.compactGravityDeflect) {
      const result = baseAnimate.call(this, choice, p, o, pr, or);
      if (this.pending?.result !== 'catastrophic') {
        this.time.delayedCall(500, () => {
          impactBurst(
            this,
            (p.x + o.x) / 2,
            (p.y + o.y) / 2,
            C.orange,
            this.pending?.result === 'rough' ? 16 : 11,
            -.65
          );
        });
      }
      return result;
    }

    if (choice === 'DEFLECT') return animateDeflect(this, p, o);
    if (choice === 'AVOID') {
      return this.pending?.success ? animateAvoidSuccess(this, p, o) : animateAvoidFailure(this, p, o);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };
})();
