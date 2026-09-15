// Gameplay sanity refinements.
// - SAVE toast explicitly shows its -500 point cost.
// - Two-tier-up failed ABSORB uses a grazing escape rather than a misleading fragmentation result.
// - Blue Giant orbital visuals use planets, not Yellow Dwarf companion stars.
// - Phase 2 begins when Dwarf Planet/orbitals unlock, rather than waiting for Rocky Planet.
(() => {
  const DWARF_PLANET = TIERS.findIndex(t => t.name === 'DWARF PLANET');
  const ROCKY_PLANET = TIERS.findIndex(t => t.name === 'ROCKY PLANET');
  const GAS_PLANET = TIERS.findIndex(t => t.name === 'GAS PLANET');
  const YELLOW_DWARF = TIERS.findIndex(t => t.name === 'YELLOW DWARF STAR');
  const BLUE_GIANT = TIERS.findIndex(t => t.name === 'BLUE GIANT STAR');
  const PHASE4_FIRST = Number(window.CometPhase4?.firstTier ?? Infinity);
  const SAVE_COST = Number(window.CometCheckpoint?.saveCost) || 500;

  const baseSave = GameScene.prototype.save;
  const baseOutcome = GameScene.prototype.outcome;
  const baseResolve = GameScene.prototype.resolve;
  const baseAnimate = GameScene.prototype.animate;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseDrawObject = GameScene.prototype.drawObject;
  const baseShowPhaseCompleteCard = GameScene.prototype.showPhaseCompleteCard;

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function findLatestSavedToast(scene) {
    let found = null;
    walk(scene.ui, child => {
      if (typeof child?.text === 'string' && child.text.startsWith('SAVED •')) found = child;
    });
    return found;
  }

  GameScene.prototype.save = function (silent = false) {
    const result = baseSave.call(this, silent);
    if (!silent && result !== false) {
      const toast = findLatestSavedToast(this);
      if (toast) {
        const original = String(toast.text || '').replace(/^SAVED\s*•\s*/i, '');
        toast.setText(`SAVED • -${SAVE_COST} POINTS • ${original}`);
      }
    }
    return result;
  };

  // Keep the underlying fragment probability field for compatibility with orbital intervention,
  // but reinterpret the two-tier-up survival branch as a grazing escape. The player did NOT break
  // material off the much larger target; they failed to make a central collision and escaped damaged.
  GameScene.prototype.outcome = function (choice) {
    const result = baseOutcome.call(this, choice);
    if (choice !== 'ABSORB' || !result) return result;
    if (result.compactGravityReverse) return result;
    if (this.tierIndex >= PHASE4_FIRST) return result;

    if (Number(result.gap) === 2 && result.result === 'fragment') {
      result.highTierGlance = true;
      result.glanceChance = Math.max(0, Number(result.fragmentChance) || 0);
    }
    return result;
  };

  function grazeParticles(scene, x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Phaser.Math.FloatBetween(-2.6, -.55);
      const chip = scene.add.rectangle(
        x, y,
        Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 5),
        i % 4 === 0 ? C.white : color,
        Phaser.Math.FloatBetween(.55, .95)
      );
      scene.ui.add(chip);
      scene.tweens.add({
        targets: chip,
        x: x + Math.cos(angle) * Phaser.Math.Between(28, 74),
        y: y + Math.sin(angle) * Phaser.Math.Between(20, 58),
        alpha: 0,
        scale: .3,
        duration: Phaser.Math.Between(320, 560),
        ease: 'Quad.out',
        onComplete: () => chip.destroy()
      });
    }
  }

  function animateHighTierGraze(scene, playerSprite, targetSprite) {
    scene.tweens.killTweensOf(playerSprite);
    scene.tweens.killTweensOf(targetSprite);

    const startX = playerSprite.x;
    const startY = playerSprite.y;
    const targetX = targetSprite.x;
    const targetY = targetSprite.y;
    const controlX = targetX - 48;
    const controlY = targetY - 60;
    const endX = W + 36;
    const endY = scene.Y(245);

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1050,
      ease: 'Sine.inOut',
      onUpdate: tween => {
        const t = tween.getValue();
        const u = 1 - t;
        playerSprite.x = u*u*startX + 2*u*t*controlX + t*t*endX;
        playerSprite.y = u*u*startY + 2*u*t*controlY + t*t*endY;
        playerSprite.angle = -58 * t;
        playerSprite.setScale(1 - .16 * t);
        playerSprite.setAlpha?.(1 - .10 * t);
      }
    });

    scene.time.delayedCall(500, () => {
      const x = Phaser.Math.Linear(startX, targetX, .72);
      const y = Phaser.Math.Linear(startY, targetY, .72) - 18;
      grazeParticles(scene, x, y, scene.player?.color || C.orange);
      const ring = scene.add.circle(x, y, 9, C.orange, .06);
      ring.setStrokeStyle(2, C.orange, .72);
      scene.ui.add(ring);
      scene.tweens.add({ targets: ring, scale: 2.8, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    });

    scene.time.delayedCall(1110, () => scene.resolve());
  }

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    if (choice === 'ABSORB' && this.pending?.highTierGlance && this.pending?.result === 'fragment' &&
        !this.pending?.compactGravityReverse && !this._devModeActive) {
      return animateHighTierGraze(this, p, o);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  function resolveHighTierGraze(scene) {
    const r = scene.pending;
    const speedLoss = clamp(.24 + .05 * Math.max(0, Number(r.speedRatio || 1) - 1), .22, .38);
    const massLoss = clamp(.10 + .03 * Math.max(0, Number(r.speedRatio || 1) - 1), .09, .18);
    const growthLoss = Math.min(scene.growth, .28);

    scene.player.speedMS = Math.max(120, scene.player.speedMS * (1 - speedLoss));
    scene.player.massKg *= 1 - massLoss;
    scene.player.radiusM *= Math.cbrt(1 - massLoss);
    scene.growth = Math.max(0, scene.growth - growthLoss);
    scene.actionHistory.push('ABSORB');
    scene.score += Math.round(8 + scene.tierIndex * 6);
    scene.encounters++;
    scene.save(true);

    scene.drawResult({
      title: 'GRAZING ESCAPE',
      detail: `FAILED ABSORB • SPEED -${Math.round(speedLoss * 100)}% • MASS -${Math.round(massLoss * 100)}%`,
      reason: 'The target was two tiers above you. Your approach only skimmed its outer edge/gravity well, so the larger body stayed intact while you escaped damaged.',
      color: C.orange,
      survived: true
    });
  }

  GameScene.prototype.resolve = function () {
    const beforeTier = Number(this.tierIndex) || 0;

    if (!this._devModeActive && this.pending?.highTierGlance && this.pending?.result === 'fragment' &&
        !this.pending?.compactGravityReverse && this.tierIndex < PHASE4_FIRST) {
      return resolveHighTierGraze(this);
    }

    const result = baseResolve.call(this);
    const afterTier = Number(this.tierIndex) || 0;

    // Phase 1 now completes exactly when Dwarf Planet is reached — the same instant orbitals unlock.
    if (!this._devModeActive && !this._devPhase4Test && DWARF_PLANET >= 0 &&
        beforeTier < DWARF_PLANET && afterTier >= DWARF_PLANET) {
      this.time.delayedCall(35, () => {
        if (!this._devModeActive && !this._devPhase4Test && this.tierIndex >= DWARF_PLANET) {
          // Call the pre-patch card renderer directly; our public wrapper below suppresses the old
          // Rocky-Planet Phase 1 trigger that remains inside the historical phase-card script.
          baseShowPhaseCompleteCard.call(this, 1);
        }
      });
    }
    return result;
  };

  GameScene.prototype.drawResult = function (result) {
    const rendered = baseDrawResult.call(this, result);
    const r = this.pending;
    if (!r?.highTierGlance || r.result !== 'fragment') return rendered;

    // Replace the old FRAG probability label with the scientifically clearer GLANCE label.
    const base = this.Y(155);
    const cover = this.add.graphics();
    cover.fillStyle(C.panel, 1).fillRect(28, base + 326, 364, 30);
    this.ui.add(cover);
    const parts = [];
    if (Number(r.mergeChance) > 0) parts.push(`MERGE ${Math.round(r.mergeChance * 100)}%`);
    parts.push(`GLANCE ${Math.round((Number(r.glanceChance) || Number(r.fragmentChance) || 0) * 100)}%`);
    if (Number(r.fatalChance) > 0) parts.push(`OUT ${Math.round(r.fatalChance * 100)}%`);
    this.addText(W / 2, base + 341, parts.join(' • '), 7.8, C.muted, { ox: .5, bold: true });
    return rendered;
  };

  // Orbitals are defensive visual resources, not binary stellar companions. A Blue Giant can of
  // course exist in a multiple-star system, but showing a Yellow Dwarf as one of these small
  // protective orbitals reads incorrectly. Substitute rocky/gas planets for that visual slot.
  function planetReplacementFor(object) {
    const seed = String(object?.realName || object?.name || 'planet')
      .split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const tierIndex = seed % 2 === 0 ? ROCKY_PLANET : GAS_PLANET;
    const tier = TIERS[tierIndex >= 0 ? tierIndex : ROCKY_PLANET];
    if (!tier) return object;
    const examples = Array.isArray(tier.examples) ? tier.examples : [];
    return {
      ...object,
      name: tier.name,
      realName: examples[seed % Math.max(1, examples.length)] || tier.name,
      tier: tierIndex,
      radiusM: tier.r,
      massKg: tier.m,
      speedMS: tier.v,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      hint: tier.hint,
      identityId: undefined,
      namedSpriteBase: undefined,
      orbitalVisual: true
    };
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    const blueGiantPlayer = Number(this.player?.tier) === BLUE_GIANT;
    const yellowDwarfOrbital = object?.orbitalVisual === true && Number(object?.tier) === YELLOW_DWARF;
    if (blueGiantPlayer && yellowDwarfOrbital) {
      return baseDrawObject.call(this, x, y, radius, planetReplacementFor(object), mystery, glow);
    }
    return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
  };

  GameScene.prototype.showPhaseCompleteCard = function (phase) {
    // Historical code triggers Phase 1 at Rocky Planet. It is now already completed at Dwarf Planet,
    // so silently discard that obsolete later trigger.
    if (phase === 1 && ROCKY_PLANET >= 0 && Number(this.tierIndex) >= ROCKY_PLANET) return;

    const result = baseShowPhaseCompleteCard.call(this, phase);
    if (phase === 2) {
      walk(this.ui, child => {
        if (typeof child?.text !== 'string') return;
        if (child.text === 'FROM ROCKY PLANET TO NEBULA.') child.setText('FROM DWARF PLANET TO NEBULA.');
      });
    }
    return result;
  };

  window.CometGameplaySanity = Object.freeze({
    phase2StartTier: DWARF_PLANET,
    blueGiantOrbitals: 'planets',
    twoTierAbsorbFallback: 'grazing-escape',
    saveCostShown: SAVE_COST
  });
})();
