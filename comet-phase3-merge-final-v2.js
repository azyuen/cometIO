// Final Phase 3 merge authority v3.
// Every successful Phase 3 ABSORB/MERGE from Pulsar through SMBH uses one visual language:
// converge -> expanding light ring -> both originals disappear -> one new resulting sprite.
// Loaded last so older Pulsar-only / compact-gravity animation branches cannot leak through.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseAnimate = proto.animate;
  const PULSAR = Math.max(0, TIERS.findIndex(t => t.name === 'PULSAR'));
  const GALAXY = Number(window.CometPhase4?.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));

  function phase3(scene) {
    const tier = Number(scene?.tierIndex);
    return Number.isFinite(tier) && tier >= PULSAR && (GALAXY < 0 || tier < GALAXY);
  }

  function successfulMerge(scene, choice) {
    const p = scene?.pending;
    if (choice !== 'ABSORB' || !phase3(scene) || !p) return false;
    if (p.success === false || p.compactGravityReverse) return false;
    const result = String(p.result || '').toLowerCase();
    return !['fragment','catastrophic','setback','stripped','captured'].includes(result);
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

  function freezeComparison(scene, p, o) {
    scene._resultComparisonPlayer = renderedSnapshot(scene.player, p);
    scene._resultComparisonOther = renderedSnapshot(scene.other, o);
  }

  function predictedResult(scene) {
    const currentTier = Math.max(0, Math.min(TIERS.length - 1, Number(scene.tierIndex) || Number(scene.player?.tier) || 0));
    const gp = (typeof scene.growthPoints === 'function' ? Number(scene.growthPoints()) || 0 : 0) * 1.2;
    let tierIndex = currentTier;
    let growth = Math.max(0, Number(scene.growth) || 0) + gp;

    while (tierIndex < TIERS.length - 1 && growth >= Math.max(.001, Number(TIERS[tierIndex]?.need) || 1)) {
      growth -= Math.max(.001, Number(TIERS[tierIndex]?.need) || 1);
      tierIndex++;
    }

    const tier = TIERS[tierIndex] || TIERS[currentTier];
    const player = scene.player || {};
    const other = scene.other || {};

    if (tierIndex !== currentTier) {
      return {
        name:tier.name, realName:tier.name, tier:tierIndex,
        radiusM:tier.r, massKg:tier.m, speedMS:tier.v,
        kind:tier.kind, color:tier.color, solid:tier.solid, hint:tier.hint,
        source:'phase3-final-merge-preview'
      };
    }

    let mass = Math.max(Number(player.massKg) || Number(tier.m) || 1, 1e-300);
    let radius = Math.max(Number(player.radiusM) || Number(tier.r) || 1, 1e-300);
    let speed = Math.max(120, Number(player.speedMS) || Number(tier.v) || 120);
    const gain = Math.min(Math.max(0, Number(other.massKg) || 0) * .28, mass * 1.4);
    const before = mass;
    mass += gain;
    radius *= Math.cbrt(1 + gain / Math.max(before, 1e-300));
    const speedRatio = Math.max(0, Number(scene.pending?.speedRatio) || 1);
    const loss = clamp(.09 + .04 * Math.max(0, speedRatio - 1), .08, .20);
    speed = Math.max(120, speed * (1 - loss));

    // Deliberately do not copy the old visual identity: the resulting merged body should resolve
    // through the current tier sprite pool and become one clean new sprite.
    return {
      name:tier.name, realName:`MERGED ${tier.name}`, tier:tierIndex,
      radiusM:radius, massKg:mass, speedMS:speed,
      kind:tier.kind, color:tier.color, solid:tier.solid, hint:tier.hint,
      source:'phase3-final-merge-preview'
    };
  }

  function lightRing(scene, x, y, color) {
    const outer = scene.add.graphics();
    outer.lineStyle(3.2, C.white, .98).strokeCircle(0, 0, 14);
    outer.lineStyle(2.0, C.cyan, .78).strokeCircle(0, 0, 19);
    outer.setPosition(x, y);
    scene.ui.add(outer);

    const inner = scene.add.circle(x, y, 7, C.white, .95);
    scene.ui.add(inner);

    scene.tweens.add({
      targets:outer, scaleX:4.6, scaleY:4.6, alpha:0,
      duration:520, ease:'Cubic.out', onComplete:()=>outer.destroy()
    });
    scene.tweens.add({
      targets:inner, scale:4.0, alpha:0,
      duration:260, ease:'Quad.out', onComplete:()=>inner.destroy()
    });

    for (let i=0;i<20;i++) {
      const a = Math.PI * 2 * i / 20 + Phaser.Math.FloatBetween(-.10,.10);
      const d = Phaser.Math.Between(28,72);
      const dot = scene.add.circle(
        x, y, Phaser.Math.FloatBetween(1.0,2.4),
        i % 4 === 0 ? C.white : (i % 2 ? C.cyan : (color || C.purple)),
        .95
      );
      scene.ui.add(dot);
      scene.tweens.add({
        targets:dot,
        x:x + Math.cos(a)*d,
        y:y + Math.sin(a)*d,
        alpha:0, scale:.20,
        duration:Phaser.Math.Between(320,560),
        ease:'Cubic.out',
        onComplete:()=>dot.destroy()
      });
    }
  }

  function showResultSprite(scene, object, x, y, radius) {
    const visual = scene.drawObject(x, y, radius, object, false, false);
    if (!visual) return null;

    visual.setAlpha?.(.06);

    if (!visual.cometVisual?.fallback && typeof visual.setVisualDisplayDiameter === 'function') {
      const finalDiameter = Math.max(2, radius * 2);
      const startDiameter = Math.max(2, finalDiameter * .34);
      visual.setScale?.(1);
      visual.setVisualDisplayDiameter(startDiameter);
      scene.tweens.addCounter({
        from:startDiameter, to:finalDiameter, duration:420, ease:'Back.out',
        onUpdate:tw=>{
          if (visual.active) visual.setVisualDisplayDiameter(tw.getValue());
        }
      });
      scene.tweens.add({targets:visual,alpha:1,duration:300,ease:'Cubic.out'});
    } else {
      visual.setScale?.(.34);
      scene.tweens.add({targets:visual,scale:1,alpha:1,duration:420,ease:'Back.out'});
    }
    return visual;
  }

  function animateMerge(scene, p, o, pr, or) {
    freezeComparison(scene, p, o);
    scene.pending.result = 'merge';

    const x = W / 2;
    const y = scene.Y(375);
    const preview = predictedResult(scene);
    const resultRadius = clamp(Math.max(Number(pr)||24, Number(or)||24) * 1.14, 23, 64);

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);

    // No container scaling here: direct PNG-container scaling has caused Safari/WebGL corruption.
    scene.tweens.add({
      targets:p, x, y, angle:'+=38', alpha:.88,
      duration:560, ease:'Cubic.in'
    });
    scene.tweens.add({
      targets:o, x, y, angle:'-=38', alpha:.88,
      duration:560, ease:'Cubic.in'
    });

    scene.time.delayedCall(535, () => {
      p.setVisible?.(false);
      o.setVisible?.(false);
      lightRing(scene, x, y, scene.player?.color || C.cyan);
    });

    scene.time.delayedCall(690, () => {
      showResultSprite(scene, preview, x, y, resultRadius);
    });

    // Keep the new single body visible long enough for the merge to read clearly.
    scene.time.delayedCall(1280, () => scene.resolve());
  }

  function impactBurst(scene, x, y, color = C.orange) {
    const flash = scene.add.circle(x, y, 8, C.white, .98);
    const ring = scene.add.circle(x, y, 13, color, .08);
    ring.setStrokeStyle(2.5, color, .92);
    scene.ui.add([ring, flash]);
    scene.tweens.add({targets:flash,scale:3.0,alpha:0,duration:220,ease:'Quad.out',onComplete:()=>flash.destroy()});
    scene.tweens.add({targets:ring,scale:4.2,alpha:0,duration:430,ease:'Cubic.out',onComplete:()=>ring.destroy()});

    for (let i=0;i<14;i++) {
      const a=Math.PI*2*i/14+Phaser.Math.FloatBetween(-.14,.14);
      const d=Phaser.Math.Between(24,58);
      const dot=scene.add.circle(x,y,Phaser.Math.FloatBetween(1,2.2),i%3?color:C.white,.9);
      scene.ui.add(dot);
      scene.tweens.add({
        targets:dot,
        x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,
        alpha:0,scale:.2,duration:Phaser.Math.Between(260,460),
        ease:'Quad.out',onComplete:()=>dot.destroy()
      });
    }
  }

  function animateFailedMerge(scene, p, o) {
    freezeComparison(scene, p, o);
    const pending=scene.pending||{};
    const x=W/2,y=scene.Y(375);
    const survived=pending.success !== false && String(pending.result||'').toLowerCase() !== 'catastrophic';

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);

    // They may collide, but they are never left parked together. This explicitly replaces the
    // original Phase-3/base ABSORB animation that stopped two sprites side-by-side before resolve.
    scene.tweens.add({targets:p,x:x-7,y:y-2,angle:'+=24',duration:440,ease:'Cubic.in'});
    scene.tweens.add({targets:o,x:x+7,y:y+2,angle:'-=18',duration:440,ease:'Cubic.in'});

    scene.time.delayedCall(420,()=>impactBurst(scene,x,y,survived?C.orange:C.red));

    if (survived) {
      scene.time.delayedCall(455,()=>{
        scene.tweens.add({
          targets:p,x:x-118,y:y-66,angle:'-=70',alpha:.78,
          duration:500,ease:'Cubic.out'
        });
        scene.tweens.add({
          targets:o,x:x+105,y:y+54,angle:'+=42',
          duration:500,ease:'Cubic.out'
        });
      });
      scene.time.delayedCall(1050,()=>scene.resolve());
    } else {
      scene.time.delayedCall(455,()=>{
        scene.tweens.add({
          targets:p,x:x-18,y:y+118,angle:'+=210',alpha:0,
          duration:520,ease:'Cubic.in'
        });
        scene.tweens.add({
          targets:o,x:x+88,y:y-26,angle:'-=24',
          duration:430,ease:'Cubic.out'
        });
      });
      scene.time.delayedCall(1040,()=>scene.resolve());
    }
  }

  proto.animate = function(choice, p, o, pr, or) {
    if (choice === 'ABSORB' && phase3(this)) {
      if (successfulMerge(this, choice)) {
        return animateMerge(this, p, o, pr, or);
      }

      // Preserve the bespoke gravity-reversal and high-tier-graze animations, which do not use the
      // legacy sticking collision. Every other Phase-3 ABSORB is handled here and never delegates
      // to the original side-by-side collision branch.
      if (this.pending?.compactGravityReverse || this.pending?.highTierGlance) {
        return baseAnimate.call(this, choice, p, o, pr, or);
      }
      return animateFailedMerge(this, p, o, pr, or);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  window.CometPhase3MergeFinalV2 = Object.freeze({
    enabled:true,
    range:'PULSAR_THROUGH_SMBH',
    catchesAllSuccessfulMergeFamilyOutcomes:true,
    excludesFragmentAndCatastrophic:true,
    sequence:'CONVERGE_LIGHT_RING_SINGLE_NEW_SPRITE',
    spriteSafe:true,
    loadedAsFinalAnimationAuthority:true,
    legacyPhase3AbsorbCollisionBlocked:true,
    failedMergeAnimation:'IMPACT_RECOIL_OR_DESTRUCTION'
  });
})();