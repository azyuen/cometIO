// Absorb v2: close-scale encounters can hurt, but should not instantly end the run.
(() => {
  const previousOutcome = GameScene.prototype.outcome;

  GameScene.prototype.outcome = function (choice) {
    if (choice !== 'ABSORB') return previousOutcome.call(this, choice);

    const p = this.player, o = this.other;
    const gap = o.tier - p.tier;
    const relV = relativeSpeed(p, o);
    const targetEscape = escapeVelocity(o);
    const speedRatio = o.speedMS / Math.max(p.speedMS, 1);
    const pWithin = p.radiusM / Math.max(TIERS[p.tier].r, 1e-300);
    const oWithin = o.radiusM / Math.max(TIERS[o.tier].r, 1e-300);
    const effectiveScaleRatio = Math.pow(2, gap) * (oWithin / Math.max(pWithin, 1e-9));

    let cleanChance, fatalChance;

    if (effectiveScaleRatio <= 1.25) {
      cleanChance = clamp(.95 - .035 * Math.max(0, speedRatio - 1.2), .88, .97);
      fatalChance = 0;
    } else if (effectiveScaleRatio <= 2.2) {
      cleanChance = clamp(.80 - .07 * Math.max(0, speedRatio - 1), .62, .86);
      fatalChance = speedRatio > 2 ? clamp(.025 * (speedRatio - 2), 0, .05) : 0;
    } else if (effectiveScaleRatio <= 4.5) {
      cleanChance = clamp(.38 - .06 * Math.max(0, speedRatio - 1), .22, .42);
      fatalChance = clamp(.12 + .07 * (effectiveScaleRatio - 2.2) + .08 * Math.max(0, speedRatio - 1.2), .12, .42);
    } else if (effectiveScaleRatio < 8 && gap < 3) {
      cleanChance = clamp(.12 - .03 * Math.max(0, speedRatio - 1), .05, .15);
      fatalChance = clamp(.52 + .07 * (effectiveScaleRatio - 4.5) + .08 * Math.max(0, speedRatio - 1), .5, .85);
    } else {
      cleanChance = 0;
      fatalChance = 1;
    }

    cleanChance = Math.min(cleanChance, 1 - fatalChance);
    const setbackChance = Math.max(0, 1 - cleanChance - fatalChance);
    const roll = Math.random();
    const result = roll < fatalChance ? 'catastrophic' : roll < fatalChance + cleanChance ? 'clean' : 'setback';

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
})();
