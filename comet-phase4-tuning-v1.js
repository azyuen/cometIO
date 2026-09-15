// Phase 4 compatibility/tuning layer.
// 1) Preserve the original Atom -> Black Hole encounter curve after TIERS was extended.
// 2) Keep the existing SMBH sprite as the Phase 4 nucleus while adding simple Phaser orbitals.
(() => {
  if (!window.CometPhase4) return;

  const SMBH_INDEX = window.CometPhase4.firstTier;
  const SUPERCLUSTER_INDEX = window.CometPhase4.superclusterTier;
  const phase4PickOpponent = GameScene.prototype.pickOpponent;
  const phase4DrawObject = GameScene.prototype.drawObject;

  function legacyOpponent(scene) {
    const p = scene.tierIndex;
    const f = p / Math.max(1, SMBH_INDEX);
    const rg = REGIONS.find(r => r.id === scene.regionId) || REGIONS[0];
    let idx;

    if (Math.random() < rg.chance) {
      const pool = (rg.pool || []).filter(i => i >= 0 && i <= SMBH_INDEX);
      idx = pool.length ? pool[Phaser.Math.Between(0, pool.length - 1)] : p;
    } else {
      const weights = [
        { g: 0,  w: .72 - .30 * f },
        { g: -1, w: .14 - .03 * f },
        { g: 1,  w: .10 + .13 * f },
        { g: 2,  w: .025 + .10 * f },
        { g: -2, w: .015 + .01 * f },
        { g: 3,  w: .005 + .055 * f }
      ];
      const valid = weights.filter(x => p + x.g >= 0 && p + x.g <= SMBH_INDEX);
      let total = valid.reduce((sum, x) => sum + x.w, 0);
      let roll = Math.random() * total;
      let gap = 0;
      for (const x of valid) {
        roll -= x.w;
        if (roll <= 0) { gap = x.g; break; }
      }
      const max = Math.min(5, SMBH_INDEX - p);
      if (max >= 2 && Math.random() < .018 + .035 * f) gap = Phaser.Math.Between(2, max);
      idx = clamp(p + gap, 0, SMBH_INDEX);
    }

    const t = TIERS[idx];
    return {
      name: t.name,
      realName: scene.exampleName(t),
      tier: idx,
      radiusM: t.r * Math.pow(10, Phaser.Math.FloatBetween(-.08, .08)),
      massKg: t.m * Math.pow(10, Phaser.Math.FloatBetween(-.14, .14)),
      speedMS: t.v * Phaser.Math.FloatBetween(.78, 1.28),
      kind: t.kind,
      color: t.color,
      solid: t.solid,
      hint: t.hint,
      gap: idx - p
    };
  }

  GameScene.prototype.pickOpponent = function () {
    if (!this._devModeActive && this.tierIndex < SMBH_INDEX) return legacyOpponent(this);
    return phase4PickOpponent.call(this);
  };

  function addNucleusOrbitals(scene, container, radius) {
    const count = Math.min(6, Math.max(0, Math.floor(Number(scene.systemCaptures) || 0)));
    if (!count || !container?.addAt) return;

    const g = scene.add.graphics();
    for (let i = 0; i < count; i++) {
      const rx = radius * (1.12 + i * .15);
      const ry = radius * (.42 + i * .055);
      g.lineStyle(1, C.cyan, .075).strokeEllipse(0, 0, rx * 2, ry * 2);
      const a = (Math.PI * 2 * i / count) + .37;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      g.fillStyle(i % 2 ? C.cyan : 0xffe8ac, .9).fillCircle(x, y, Math.max(2.2, radius * .058));
      if (i % 3 === 0) g.fillStyle(C.white, .7).fillCircle(x, y, Math.max(1, radius * .018));
    }
    container.addAt(g, 0);
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    const phase4SmbhPlayer = !this._devModeActive && object === this.player &&
      this.tierIndex === SMBH_INDEX && this.tierIndex < SUPERCLUSTER_INDEX;

    if (!phase4SmbhPlayer) return phase4DrawObject.call(this, x, y, radius, object, mystery, glow);

    // Phase4's renderer normally treats the player as a procedural system. Temporarily presenting
    // the scene as the preceding tier lets the wrapped sprite renderer select the real SMBH art.
    const savedTier = this.tierIndex;
    let container;
    try {
      this.tierIndex = SMBH_INDEX - 1;
      container = phase4DrawObject.call(this, x, y, radius, object, mystery, glow);
    } finally {
      this.tierIndex = savedTier;
    }

    if (!mystery) addNucleusOrbitals(this, container, radius);
    return container;
  };

  window.CometPhase4Tuning = Object.freeze({
    legacyMaxTier: SMBH_INDEX,
    preservesLegacyEncounterCurve: true,
    preservesSmbhSprite: true
  });
})();
