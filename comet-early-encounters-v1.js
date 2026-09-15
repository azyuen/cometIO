// Early-game encounter smoothing.
// The base generator mixes local tier weights with region pools; some region pools can otherwise
// jump several tiers ahead while the player is still an Atom/Dust/Tiny Meteorite. This wrapper keeps
// the opening focused on same-tier and +/-1 encounters, with only rare +2 surprises until the run
// reaches Large Meteorite. From Small Comet onward the original encounter generator is untouched.
(() => {
  const basePickOpponent = GameScene.prototype.pickOpponent;
  const LARGE_METEORITE = TIERS.findIndex(t => t.name === 'LARGE METEORITE');
  const SMALL_COMET = TIERS.findIndex(t => t.name === 'SMALL COMET');

  // Acceptance chance when the underlying generator offers exactly +2 tiers.
  // Because +2 still has to be rolled by the normal generator first, the final real-world chance is
  // lower again than these numbers. The intent is "possible, but genuinely unusual" in the opening.
  const PLUS_TWO_ACCEPTANCE = Object.freeze({
    0: 0.08, // ATOM: underlying +2 rolls become extremely rare after filtering
    1: 0.12, // DUST PARTICLE
    2: 0.20, // TINY METEORITE
    3: 0.38  // LARGE METEORITE: start easing back toward normal difficulty
  });

  function gapFrom(playerTier, object) {
    return Number(object?.tier) - playerTier;
  }

  function acceptableEarlyOpponent(playerTier, object) {
    const gap = gapFrom(playerTier, object);
    if (gap <= 1) return true;
    if (gap > 2) return false;
    return Math.random() < (PLUS_TWO_ACCEPTANCE[playerTier] ?? 0);
  }

  function fallbackObject(scene, playerTier) {
    // This is only a last-resort guard if many consecutive region rolls are out of range.
    // Prefer same-tier, with a smaller chance of +1, and preserve the normal random physics jitter
    // plus named-identity reveal behaviour.
    const tierIndex = Math.min(TIERS.length - 1, playerTier + (Math.random() < .28 ? 1 : 0));
    const tier = TIERS[tierIndex];
    const object = {
      name: tier.name,
      realName: scene.exampleName(tier),
      tier: tierIndex,
      radiusM: tier.r * Math.pow(10, Phaser.Math.FloatBetween(-.08, .08)),
      massKg: tier.m * Math.pow(10, Phaser.Math.FloatBetween(-.14, .14)),
      speedMS: tier.v * Phaser.Math.FloatBetween(.78, 1.28),
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      hint: tier.hint,
      gap: tierIndex - playerTier
    };

    if (typeof pickCometNamedIdentity === 'function') {
      const identity = pickCometNamedIdentity(object.name);
      if (identity) {
        object.identityId = identity.id;
        object.realName = identity.name;
        object.namedSpriteBase = identity.spriteVariant;
        object.scienceClass = identity.scienceClass;
        object.identityStatus = identity.status;
      }
    }
    return object;
  }

  GameScene.prototype.pickOpponent = function () {
    const playerTier = Number(this.tierIndex) || 0;

    // Normal balance resumes once the player has grown beyond Large Meteorite.
    if (SMALL_COMET >= 0 && playerTier >= SMALL_COMET) return basePickOpponent.call(this);
    if (LARGE_METEORITE < 0 || playerTier > LARGE_METEORITE) return basePickOpponent.call(this);

    // Keep region flavour and all existing identity/physics generation by rerolling the existing
    // generator rather than replacing it. The early ceiling is applied to the final generated tier.
    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = basePickOpponent.call(this);
      if (acceptableEarlyOpponent(playerTier, candidate)) {
        candidate.gap = gapFrom(playerTier, candidate);
        return candidate;
      }
    }

    return fallbackObject(this, playerTier);
  };

  window.CometEarlyEncounters = Object.freeze({
    throughTier: LARGE_METEORITE,
    normalFromTier: SMALL_COMET,
    maxEarlyGap: 2,
    plusTwoAcceptance: PLUS_TWO_ACCEPTANCE
  });
})();
