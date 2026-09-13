// Absorb balancing pass: similar-sized encounters are usually survivable.
// Progression tiers are treated as gameplay scale classes; raw astronomical ratios remain visible as context.
(() => {
  const originalOutcome = GameScene.prototype.outcome;
  const originalResolve = GameScene.prototype.resolve;
  const originalDrawResult = GameScene.prototype.drawResult;

  GameScene.prototype.outcome = function (choice) {
    if (choice !== 'ABSORB') return originalOutcome.call(this, choice);

    const p = this.player;
    const o = this.other;
    const gap = o.tier - p.tier;
    const relV = relativeSpeed(p, o);
    const targetEscape = escapeVelocity(o);
    const speedRatio = o.speedMS / Math.max(p.speedMS, 1);

    // Each progression tier counts as roughly a doubling of game-scale size.
    // Within-tier physical jitter still matters, but astronomical jumps do not make
    // every adjacent tier automatically impossible.
    const pWithinTier = p.radiusM / Math.max(TIERS[p.tier].r, 1e-300);
    const oWithinTier = o.radiusM / Math.max(TIERS[o.tier].r, 1e-300);
    const effectiveScaleRatio = Math.pow(2, gap) * (oWithinTier / Math.max(pWithinTier, 1e-9));

    let cleanChance = 0;
    let fatalChance = 0;

    if (gap <= -1) {
      cleanChance = 0.985;
      fatalChance = 0;
    } else if (gap === 0) {
      cleanChance = clamp(
        0.94
          - 0.07 * Math.max(0, effectiveScaleRatio - 1)
          - 0.05 * Math.max(0, speedRatio - 1.15),
        0.84,
        0.97
      );
      fatalChance = 0;
    } else if (gap === 1) {
      cleanChance = clamp(
        0.72
          - 0.08 * Math.max(0, effectiveScaleRatio - 2)
          - 0.07 * Math.max(0, speedRatio - 1),
        0.54,
        0.78
      );
      fatalChance = clamp(
        0.02
          + 0.035 * Math.max(0, effectiveScaleRatio - 2)
          + 0.04 * Math.max(0, speedRatio - 1.5),
        0.015,
        0.10
      );
    } else if (gap === 2) {
      cleanChance = clamp(
        0.27 - 0.04 * Math.max(0, speedRatio - 1),
        0.16,
        0.30
      );
      fatalChance = clamp(
        0.30
          + 0.055 * Math.max(0, effectiveScaleRatio - 4)
          + 0.07 * Math.max(0, speedRatio - 1),
        0.28,
        0.55
      );
    } else {
      // Three or more tiers above you is intentionally the hard wall.
      cleanChance = 0;
      fatalChance = 1;
    }

    cleanChance = Math.min(cleanChance, 1 - fatalChance);
    const setbackChance = Math.max(0, 1 - cleanChance - fatalChance);
    const roll = Math.random();
    const result = roll < fatalChance
      ? 'catastrophic'
      : roll < fatalChance + cleanChance
        ? 'clean'
        : 'setback';

    return {
      choice,
      result,
      success: result !== 'catastrophic',
      chance: 1 - fatalChance,
      cleanChance,
      setbackChance,
      fatalChance,
      relV,
      targetEscape,
      gap,
      speedRatio,
      effectiveScaleRatio,
      massRatio: o.massKg / Math.max(p.massKg, 1e-300),
      sizeRatio: o.radiusM / Math.max(p.radiusM, 1e-300)
    };
  };

  GameScene.prototype.resolve = function () {
    const r = this.pending;
    if (r.choice !== 'ABSORB') return originalResolve.call(this);

    let title = '';
    let detail = '';
    let reason = '';
    let color = C.green;
    let evolved = false;

    if (r.result === 'clean') {
      const gp = this.growthPoints();
      this.growth += gp;
      this.absorbs++;
      this.player.speedMS = clamp(
        this.player.speedMS + clamp(this.other.speedMS * (r.gap <= 0 ? 0.08 : 0.13), 40, 50000),
        150,
        1.5e6
      );
      this.player.massKg += Math.min(this.other.massKg, this.player.massKg * 4) * 0.35;

      while (this.tierIndex < TIERS.length - 1 && this.growth >= TIERS[this.tierIndex].need) {
        this.growth -= TIERS[this.tierIndex].need;
        this.tierIndex++;
        this.setPlayer(false);
        evolved = true;
      }

      title = evolved ? 'TIER UP!' : 'ABSORPTION SUCCESS';
      detail = evolved
        ? `YOU ARE NOW A ${TIERS[this.tierIndex].name}`
        : `GROWTH +${gp.toFixed(1)} • ${this.growth.toFixed(1)} / ${TIERS[this.tierIndex].need.toFixed(1)} TO NEXT TIER`;
      reason = r.gap <= 0
        ? 'The target was in your scale class or smaller, so your head-on collision could merge rather than overwhelm you.'
        : `You took on an object about ${r.effectiveScaleRatio.toFixed(1)}× your game-scale size and won the collision.`;
    }

    if (r.result === 'setback') {
      const oldTier = this.tierIndex;
      let tiersLost = 0;

      if (r.gap === 1 && this.tierIndex > 0 && Math.random() < 0.55) tiersLost = 1;
      if (r.gap >= 2 && this.tierIndex > 0) {
        tiersLost = Math.min(this.tierIndex, 1 + (Math.random() < 0.42 ? 1 : 0));
      }

      const speedLoss = clamp(
        0.13 + 0.07 * Math.max(0, r.gap) + 0.06 * Math.max(0, r.speedRatio - 1),
        0.12,
        0.42
      );

      if (tiersLost > 0) {
        this.tierIndex -= tiersLost;
        this.growth = 0;
        this.setPlayer(false);
        this.player.speedMS = Math.max(120, this.player.speedMS * (1 - speedLoss));
        title = tiersLost === 1 ? 'FRAGMENTED — TIER LOST' : `FRAGMENTED — ${tiersLost} TIERS LOST`;
        detail = `SURVIVED • TIER ${oldTier + 1} → ${this.tierIndex + 1} • SPEED -${Math.round(speedLoss * 100)}%`;
      } else {
        const massLoss = clamp(0.08 + 0.045 * Math.max(0, r.gap), 0.07, 0.22);
        const growthLoss = Math.min(this.growth, 0.25 + 0.10 * Math.max(0, r.gap));
        this.player.speedMS = Math.max(120, this.player.speedMS * (1 - speedLoss));
        this.player.massKg *= 1 - massLoss;
        this.player.radiusM *= Math.cbrt(1 - massLoss);
        this.growth = Math.max(0, this.growth - growthLoss);
        title = 'DAMAGING COLLISION';
        detail = `SURVIVED • SPEED -${Math.round(speedLoss * 100)}% • MASS -${Math.round(massLoss * 100)}%`;
      }

      color = C.orange;
      reason = r.gap <= 0
        ? 'The objects were close in scale. Instead of instant death, the high-energy collision fragmented you and cost momentum/material.'
        : `The target was about ${r.effectiveScaleRatio.toFixed(1)}× your game-scale size. You were too small to absorb it cleanly, but not so outmatched that the run had to end.`;
    }

    if (r.result === 'catastrophic') {
      title = 'OVERWHELMED';
      detail = `${this.other.realName} was far beyond your absorption range.`;
      color = C.red;
      reason = r.gap >= 3
        ? `The target was ${r.gap} tiers above you — roughly ${r.effectiveScaleRatio.toFixed(1)}× your game-scale size. At that mismatch, a head-on absorb is guaranteed game over.`
        : 'The larger, faster target carried too much collision energy for you to survive the head-on attempt.';
    }

    const survived = r.result !== 'catastrophic';
    if (survived) {
      this.actionHistory.push('ABSORB');
      const base = r.result === 'clean' ? 110 : 12;
      this.score += Math.round(base + this.tierIndex * 12 + Math.max(0, r.gap) * (r.result === 'clean' ? 55 : 8));
      this.encounters++;
      this.save(true);
    } else {
      this.clearSave();
    }

    this.drawResult({ title, detail, reason, color, survived });
  };

  GameScene.prototype.drawResult = function (res) {
    originalDrawResult.call(this, res);

    const r = this.pending;
    if (r.choice !== 'ABSORB') return;

    // Replace the generic survival percentage with the three possible Absorb outcomes.
    const base = this.Y(155);
    const cover = this.add.graphics();
    cover.fillStyle(C.panel, 1).fillRect(35, base + 315, 350, 31);
    this.ui.add(cover);
    this.addText(
      W / 2,
      base + 330,
      `CLEAN ${Math.round(r.cleanChance * 100)}% • SETBACK ${Math.round(r.setbackChance * 100)}% • FATAL ${Math.round(r.fatalChance * 100)}%`,
      8.5,
      C.muted,
      { ox: 0.5, bold: true }
    );
  };
})();
