// Large-object appearance stability.
// From NEBULA onward, absorbing a physically negligible target should add mass/progress without
// randomly changing the player's morphology. Example: a Pulsar absorbing an atom remains the same
// Pulsar sprite. A genuine tier-up or a substantial same-tier/near-peer merger may still change art.
(() => {
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const baseResolve = proto.resolve;
  const NEBULA = TIERS.findIndex(t => t.name === 'NEBULA');
  const MAX_NEGLIGIBLE_MASS_RATIO = 0.10; // target <= 10% of player mass; only 35% is normally accreted.

  const APPEARANCE_KEYS = Object.freeze([
    'cometVisualVariant',
    'cometVisualRotation',
    'cometVisualFlipX',
    'cometVisualTint',
    'cometVisualAlpha'
  ]);

  function successfulAbsorb(scene) {
    const p = scene?.pending;
    if (!p || p.choice !== 'ABSORB' || p.success === false || p.compactGravityReverse) return false;
    return p.result === 'absorb' || p.result === 'merge' || p.result === 'clean' || !p.result;
  }

  function massRatio(scene) {
    const playerMass = Math.max(Number(scene?.player?.massKg) || 0, 1e-300);
    const targetMass = Math.max(Number(scene?.other?.massKg) || 0, 0);
    return targetMass / playerMass;
  }

  function negligibleAbsorb(scene) {
    if (NEBULA < 0 || Number(scene?.player?.tier) < NEBULA) return false;
    if (!successfulAbsorb(scene)) return false;
    return massRatio(scene) <= MAX_NEGLIGIBLE_MASS_RATIO;
  }

  function snapshotAppearance(object) {
    if (!object) return null;
    const out = {};
    let found = false;
    for (const key of APPEARANCE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) continue;
      out[key] = object[key];
      found = true;
    }
    return found ? out : null;
  }

  function applyAppearance(object, appearance) {
    if (!object || !appearance) return;
    for (const key of APPEARANCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(appearance, key)) object[key] = appearance[key];
    }
  }

  function isSyntheticSameTierAbsorbResult(scene, object, mystery) {
    if (mystery || !object || object === scene.player || object === scene.other || object.orbitalVisual) return false;
    if (scene.state !== 'REVEAL' || !negligibleAbsorb(scene)) return false;
    return Number(object.tier) === Number(scene.player?.tier);
  }

  proto.drawObject = function(x, y, radius, object, mystery = false, glow = false) {
    // Result-animation scripts create a synthetic object after the flash. Give that synthetic object
    // the exact current player appearance before the continuity renderer sees it, so the post-flash
    // sprite is visibly the SAME Nebula/Pulsar/BH when the swallowed target was negligible.
    if (isSyntheticSameTierAbsorbResult(this, object, mystery)) {
      applyAppearance(object, snapshotAppearance(this.player));
      object.cometPreserveLargeBodyAppearance = true;
    }
    return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
  };

  proto.resolve = function(...args) {
    const preserve = negligibleAbsorb(this);
    const beforeTier = Number(this.player?.tier ?? this.tierIndex);
    const beforeAppearance = preserve ? snapshotAppearance(this.player) : null;

    const value = baseResolve.apply(this, args);

    // Sprite-continuity may have staged/adopted the synthetic result art. Restore the original exact
    // appearance only when the absorb did NOT cause a tier-up. Tier changes legitimately get new art.
    const afterTier = Number(this.player?.tier ?? this.tierIndex);
    if (preserve && beforeAppearance && afterTier === beforeTier) {
      applyAppearance(this.player, beforeAppearance);
    }
    return value;
  };

  window.CometLargeObjectAppearanceStability = Object.freeze({
    enabled: true,
    startsAt: 'NEBULA',
    maxNegligibleTargetMassRatio: MAX_NEGLIGIBLE_MASS_RATIO,
    preservesExactVariant: true,
    preservesColourShapeRotation: true,
    tierUpStillChangesAppearance: true,
    labCompatible: true
  });
})();
