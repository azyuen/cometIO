// Orbitals v1
// Replaces the old crater reward with a visible, tier-aware defensive resource.
(() => {
  const UNLOCK_TIER = 7; // DWARF PLANET
  const DEFLECTS_PER_ORBITAL = 3;
  const MAX_VISIBLE_ORBITALS = 6;
  const MAX_SACRIFICE = 3;
  const HIGH_RISK_THRESHOLD = .15;
  const RISK_MULTIPLIER_PER_ORBITAL = .63;
  const MANUAL_SLOT_KEY = 'cometio-manual-checkpoint-v1';

  // These are deliberately authored as astronomical relationships, rather than simply
  // "player tier minus one". That keeps, for example, planets around stars and stars around
  // nebulae/black holes. Existing orbitals are visualised from this table every time an arena
  // is drawn, so the whole system upgrades as soon as the player changes tier.
  const ORBITAL_TIER_POOLS = Object.freeze({
    7:  [4, 5, 6],       // Dwarf planet: comets and asteroids
    8:  [6, 7],          // Rocky planet: asteroids and dwarf planets
    9:  [7, 8],          // Gas planet: dwarf and rocky planets
    10: [8, 9],          // Yellow dwarf: rocky and gas planets
    11: [8, 9, 10],      // Blue giant: planets and smaller stars
    12: [9, 10, 11],     // Red hypergiant: giant planets and companion stars
    13: [10, 11, 12],    // Nebula: stars
    14: [7, 8, 9],       // Pulsar: remnant planetary systems
    15: [9, 10, 11, 12], // Stellar black hole: planets and companion stars
    16: [10, 11, 12, 15] // SMBH: stars and stellar black holes
  });

  const baseResetRun = GameScene.prototype.resetRun;
  const baseDrawArena = GameScene.prototype.drawArena;
  const baseChoose = GameScene.prototype.choose;
  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseSave = GameScene.prototype.save;
  const baseLoad = GameScene.prototype.load;
  const baseUpdate = GameScene.prototype.update;

  const whole = value => Math.max(0, Math.floor(Number(value) || 0));

  function tierPool(playerTier) {
    return ORBITAL_TIER_POOLS[playerTier] || [];
  }

  function ensureOrbitalState(scene) {
    scene.orbitalCount = whole(scene.orbitalCount);
    scene.orbitalProgress = whole(scene.orbitalProgress) % DEFLECTS_PER_ORBITAL;
    if (scene.tierIndex >= UNLOCK_TIER) scene.orbitalsUnlocked = true;
    scene.orbitalsUnlocked = scene.orbitalsUnlocked === true;
    // A compatibility alias for older save layers. Nothing user-facing calls this craters.
    scene.craters = scene.orbitalCount;
  }

  function migratedOrbitalState(data) {
    if (Number.isFinite(Number(data?.orbitalCount))) {
      return {
        count: whole(data.orbitalCount),
        progress: whole(data.orbitalProgress) % DEFLECTS_PER_ORBITAL,
        unlocked: data.orbitalsUnlocked === true || whole(data.tierIndex) >= UNLOCK_TIER
      };
    }

    // Old saves did not record deflect progress, but actionHistory contains successful actions.
    // Deriving from it gives a fair, exact migration without treating variable crater awards as
    // orbitals.
    const successfulDeflects = (Array.isArray(data?.actionHistory) ? data.actionHistory : [])
      .filter(action => action === 'DEFLECT').length;
    return {
      count: Math.floor(successfulDeflects / DEFLECTS_PER_ORBITAL),
      progress: successfulDeflects % DEFLECTS_PER_ORBITAL,
      unlocked: whole(data?.tierIndex) >= UNLOCK_TIER
    };
  }

  function selectedSaveData() {
    try {
      const raw = localStorage.getItem(MANUAL_SLOT_KEY) || localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function patchSavePayload(key, scene) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      data.version = Math.max(10, whole(data.version));
      data.orbitalCount = scene.orbitalCount;
      data.orbitalProgress = scene.orbitalProgress;
      data.orbitalsUnlocked = scene.orbitalsUnlocked;
      // Retained only because legacy loaders require the field.
      data.craters = scene.orbitalCount;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function orbitalObject(slot, playerTier) {
    const pool = tierPool(playerTier);
    if (!pool.length) return null;
    const tierIndex = pool[(slot + playerTier) % pool.length];
    const tier = TIERS[tierIndex];
    const examples = Array.isArray(tier.examples) ? tier.examples : [];
    return {
      name: tier.name,
      realName: examples[(slot * 2 + playerTier) % Math.max(1, examples.length)] || tier.name,
      tier: tierIndex,
      radiusM: tier.r,
      massKg: tier.m,
      speedMS: tier.v,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      orbitalVisual: true
    };
  }

  function drawOrbitalHudIcon(scene, x, y) {
    const g = scene.add.graphics();
    g.lineStyle(1.2, C.cyan, .65).strokeEllipse(x, y, 25, 11);
    g.fillStyle(C.orange, 1).fillCircle(x + 10, y - 3, 3.2);
    g.fillStyle(C.white, .9).fillCircle(x, y, 3.8);
    scene.ui.add(g);
  }

  GameScene.prototype.resetRun = function () {
    this.orbitalCount = 0;
    this.orbitalProgress = 0;
    this.orbitalsUnlocked = false;
    this.craters = 0;
    return baseResetRun.call(this);
  };

  GameScene.prototype.drawHud = function (controls = false) {
    ensureOrbitalState(this);
    const tier = TIERS[this.tierIndex];
    const utilityY = SAFE_TOP + 15;
    const y = controls ? SAFE_TOP + 42 : SAFE_TOP + 18;

    if (controls) {
      this.miniButton(48, utilityY, 72, 24, 'SAVE', C.green, () => this.save(false));
      this.miniButton(140, utilityY, 104, 24, 'LOAD', C.blue, () => this.load());
      this.miniButton(232, utilityY, 72, 24, 'HOME', C.orange, () => {
        this.save(true);
        this.runActive = true;
        this.showHome();
      });
    }

    const gap = 5, x0 = 10, cardWidth = 96.25, cardHeight = 84;
    const orbitalValue = this.orbitalsUnlocked
      ? `${this.orbitalCount}  •  ${this.orbitalProgress}/${DEFLECTS_PER_ORBITAL}`
      : 'LOCKED';
    const rows = [
      ['MASS', this.massText(this.player.massKg)],
      ['SPEED', this.speedText(this.player.speedMS)],
      ['ORBITALS', orbitalValue],
      [`TIER ${this.tierIndex + 1}`, this.shortTier(tier.name)]
    ];

    rows.forEach((row, index) => {
      const x = x0 + index * (cardWidth + gap), g = this.add.graphics();
      g.fillStyle(C.panel, .985).fillRoundedRect(x, y, cardWidth, cardHeight, 7);
      g.lineStyle(2, C.cyan, .68).strokeRoundedRect(x, y, cardWidth, cardHeight, 7);
      this.ui.add(g);

      if (index === 0) this.miniRock(x + 17, y + 39, 10, C.rock);
      if (index === 1) this.speedGauge(x + 17, y + 39);
      if (index === 2) drawOrbitalHudIcon(this, x + 17, y + 39);
      if (index === 3) {
        const bar = this.add.graphics();
        const percent = this.tierIndex === TIERS.length - 1 ? 1 : clamp(this.growth / tier.need, 0, 1);
        const barY = y + 73;
        bar.fillStyle(0x20364a).fillRoundedRect(x + 8, barY, cardWidth - 16, 5, 2);
        bar.fillStyle(C.cyan).fillRoundedRect(x + 8, barY, (cardWidth - 16) * percent, 5, 2);
        this.ui.add(bar);
      }

      const textX = index < 3 ? x + 34 : x + 7;
      this.addText(textX, y + 9, row[0], index === 2 ? 7.8 : 8.4, C.muted, { bold: true });
      this.addText(textX, y + 30, row[1], index === 3 ? 7.4 : index === 2 ? 8.1 : 9.2, C.white, {
        bold: true,
        width: index === 3 ? 82 : 61,
        lineSpacing: index === 3 ? 1 : 0
      });
    });

    const infoY = y + 101;
    this.addText(13, infoY, this.region().short, 9.6, C.white, { bold: true, width: 245 });
    this.addText(W - 13, infoY, `R${this.encounters + 1} • ${this.score.toLocaleString('en-US')}`, 9.2, C.muted, { ox: 1, bold: true });
  };

  function renderOrbitals(scene) {
    ensureOrbitalState(scene);
    const count = Math.min(scene.orbitalCount, MAX_VISIBLE_ORBITALS);
    const pool = tierPool(scene.tierIndex);
    if (!scene.youSprite || !count || !pool.length) return;

    const system = scene.add.container(scene.youSprite.x, scene.youSprite.y);
    const rings = scene.add.graphics();
    for (let slot = 0; slot < count; slot++) {
      const radiusX = 52 + slot * 9;
      const radiusY = 19 + slot * 3.2;
      rings.lineStyle(1, C.cyan, .10).strokeEllipse(0, 0, radiusX * 2, radiusY * 2);
    }
    system.add(rings);

    const playerIndex = scene.ui.getIndex(scene.youSprite);
    scene.ui.addAt(system, Math.max(0, playerIndex));
    scene._orbitalSystem = system;
    scene._orbitalBodies = [];

    for (let slot = 0; slot < count; slot++) {
      const object = orbitalObject(slot, scene.tierIndex);
      const radiusX = 52 + slot * 9;
      const radiusY = 19 + slot * 3.2;
      const phase = (Math.PI * 2 * slot / count) + ((scene.tierIndex % 4) * .17);
      const periodMs = 9000 + slot * 1250 + (slot % 2) * 900;
      const spriteRadius = clamp(7.5 + object.tier * .18, 8, 11);
      const body = scene.drawObject(0, 0, spriteRadius, object, false, false);
      scene.ui.remove(body, false);
      system.add(body);
      scene._orbitalBodies.push({ body, radiusX, radiusY, phase, periodMs, direction: slot % 3 === 2 ? -1 : 1 });
    }
  }

  GameScene.prototype.drawArena = function () {
    const result = baseDrawArena.call(this);
    renderOrbitals(this);
    return result;
  };

  GameScene.prototype.update = function (time, delta) {
    if (typeof baseUpdate === 'function') baseUpdate.call(this, time, delta);
    const system = this._orbitalSystem;
    if (!system?.active || !this.youSprite?.active || !Array.isArray(this._orbitalBodies)) return;
    system.setPosition(this.youSprite.x, this.youSprite.y);
    for (const orbital of this._orbitalBodies) {
      if (!orbital.body?.active) continue;
      const angle = orbital.phase + orbital.direction * (time / orbital.periodMs) * Math.PI * 2;
      orbital.body.setPosition(Math.cos(angle) * orbital.radiusX, Math.sin(angle) * orbital.radiusY);
      orbital.body.setScale(.82 + .18 * ((Math.sin(angle) + 1) / 2));
      orbital.body.setAlpha(.78 + .22 * ((Math.sin(angle) + 1) / 2));
    }
  };

  function fatalChanceOf(pending) {
    if (!pending) return 0;
    if (Number.isFinite(Number(pending.fatalChance))) return clamp(Number(pending.fatalChance), 0, 1);
    if (Number.isFinite(Number(pending.chance))) return clamp(1 - Number(pending.chance), 0, 1);
    return pending.success === false ? 1 : 0;
  }

  function applyOrbitalProtection(pending, sacrificed) {
    const used = whole(sacrificed);
    const baseFatal = fatalChanceOf(pending);
    if (!used || baseFatal <= 0) {
      pending.orbitalsSacrificed = 0;
      pending.baseFatalChance = baseFatal;
      return pending;
    }

    const fatalChance = clamp(baseFatal * Math.pow(RISK_MULTIPLIER_PER_ORBITAL, used), 0, 1);
    const oldSafe = Math.max(0, 1 - baseFatal);
    const newSafe = 1 - fatalChance;
    const scaleSafe = oldSafe > 0 ? newSafe / oldSafe : 0;
    const roll = Math.random();

    pending.baseFatalChance = baseFatal;
    pending.fatalChance = fatalChance;
    pending.chance = newSafe;
    pending.orbitalsSacrificed = used;

    if (pending.choice === 'ABSORB') {
      const keys = ['absorbChance', 'mergeChance', 'fragmentChance', 'cleanChance', 'setbackChance']
        .filter(key => Number.isFinite(Number(pending[key])) && Number(pending[key]) > 0);
      if (oldSafe <= 0 || !keys.length) {
        pending.fragmentChance = newSafe;
      } else {
        keys.forEach(key => { pending[key] = Number(pending[key]) * scaleSafe; });
      }

      if (roll < fatalChance) pending.result = 'catastrophic';
      else {
        let cursor = fatalChance;
        const ordered = [
          ['absorbChance', 'absorb'], ['cleanChance', 'clean'], ['mergeChance', 'merge'],
          ['fragmentChance', 'fragment'], ['setbackChance', 'setback']
        ].filter(([key]) => Number(pending[key]) > 0);
        pending.result = ordered.length ? ordered[ordered.length - 1][1] : 'fragment';
        for (const [key, result] of ordered) {
          cursor += Number(pending[key]);
          if (roll < cursor) { pending.result = result; break; }
        }
      }
      pending.success = pending.result !== 'catastrophic';
      return pending;
    }

    if (pending.choice === 'DEFLECT') {
      const clean = Math.max(0, Number(pending.cleanChance) || 0);
      const rough = Math.max(0, oldSafe - clean);
      pending.cleanChance = oldSafe > 0 ? clean * scaleSafe : newSafe * .45;
      const roughChance = oldSafe > 0 ? rough * scaleSafe : newSafe * .55;
      pending.result = roll < fatalChance ? 'catastrophic' : roll < fatalChance + pending.cleanChance ? 'clean' : 'rough';
      pending.success = pending.result !== 'catastrophic';
      pending.roughChance = roughChance;
      return pending;
    }

    pending.success = roll >= fatalChance;
    return pending;
  }

  function commitChoice(scene, choice, pending, sacrificed) {
    const used = clamp(whole(sacrificed), 0, Math.min(MAX_SACRIFICE, scene.orbitalCount));
    if (used > 0) {
      scene.orbitalCount -= used;
      scene.craters = scene.orbitalCount;
    }
    scene.pending = applyOrbitalProtection(pending, used);
    scene.state = 'REVEAL';
    scene.tweens.killAll();
    scene.reveal(choice);
  }

  GameScene.prototype.showOrbitalIntervention = function (choice, pending, selected = 0) {
    ensureOrbitalState(this);
    const max = Math.min(MAX_SACRIFICE, this.orbitalCount);
    selected = clamp(whole(selected), 0, max);
    const before = fatalChanceOf(pending);
    const after = before * Math.pow(RISK_MULTIPLIER_PER_ORBITAL, selected);

    this.clearUI();
    this.state = 'ORBITAL_INTERVENTION';
    this.drawHud(false);

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .99).fillRoundedRect(18, this.Y(170), 384, 476, 12);
    panel.lineStyle(2.5, C.orange, .95).strokeRoundedRect(18, this.Y(170), 384, 476, 12);
    this.ui.add(panel);

    this.addText(W / 2, this.Y(198), 'HIGH-RISK ENCOUNTER', 17, C.orange, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(230), `${choice} IS LOCKED IN`, 10, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(260), this.other.realName || this.other.name, 11, C.cyan, { ox: .5, bold: true, width: 340, align: 'center' });

    const player = this.drawObject(112, this.Y(337), 27, this.player, false, true);
    const target = this.drawObject(308, this.Y(337), 27, this.other, false, false);
    this.addText(112, this.Y(377), 'YOU', 8.5, C.green, { ox: .5, bold: true });
    this.addText(308, this.Y(377), 'TARGET', 8.5, C.orange, { ox: .5, bold: true });
    player.setScale(1); target.setScale(1);

    this.addText(W / 2, this.Y(412), 'SACRIFICE ORBITALS', 10, C.muted, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(440), 'Each orbital intercepts part of the danger.', 8.8, C.white, { ox: .5, bold: true });
    this.miniButton(142, this.Y(490), 52, 42, '−', C.cyan, () => this.showOrbitalIntervention(choice, pending, selected - 1));
    this.addText(W / 2, this.Y(472), String(selected), 28, selected ? C.orange : C.white, { ox: .5, bold: true });
    this.miniButton(278, this.Y(490), 52, 42, '+', C.cyan, () => this.showOrbitalIntervention(choice, pending, selected + 1));
    this.addText(W / 2, this.Y(522), `${this.orbitalCount} AVAILABLE • MAX ${MAX_SACRIFICE}`, 8.4, C.muted, { ox: .5, bold: true });

    const riskColor = after < .15 ? C.green : after < .35 ? C.orange : C.red;
    this.addText(W / 2, this.Y(556), `CATASTROPHIC RISK  ${Math.round(before * 100)}%  →  ${Math.round(after * 100)}%`, 10.5, riskColor, { ox: .5, bold: true });
    this.wideButton(W / 2, this.Y(606), 326, 48, selected ? `SACRIFICE ${selected} & CONTINUE` : 'KEEP ORBITALS & CONTINUE', selected ? C.orange : C.cyan, () => commitChoice(this, choice, pending, selected));
  };

  GameScene.prototype.choose = function (choice) {
    // Preserve DEV Lab's isolated setup and resolver exactly.
    if (this._devModeActive || this.state === 'DEV_LAB') return baseChoose.call(this, choice);
    if (this.state !== 'APPROACH') return;

    ensureOrbitalState(this);
    const pending = this.outcome(choice);
    const fatalChance = fatalChanceOf(pending);
    if (this.orbitalsUnlocked && this.orbitalCount > 0 && fatalChance >= HIGH_RISK_THRESHOLD) {
      this.showOrbitalIntervention(choice, pending, 0);
      return;
    }
    commitChoice(this, choice, pending, 0);
  };

  GameScene.prototype.resolve = function () {
    ensureOrbitalState(this);
    const pending = this.pending;
    const earnsCharge = !this._devModeActive && this.orbitalsUnlocked &&
      pending?.choice === 'DEFLECT' && pending.success !== false && pending.result !== 'catastrophic';

    if (earnsCharge) {
      this.orbitalProgress++;
      pending.orbitalChargeEarned = true;
      if (this.orbitalProgress >= DEFLECTS_PER_ORBITAL) {
        this.orbitalProgress = 0;
        this.orbitalCount++;
        pending.orbitalFormed = true;
      }
      this.craters = this.orbitalCount;
    }

    const result = baseResolve.call(this);
    if (this.tierIndex >= UNLOCK_TIER) this.orbitalsUnlocked = true;
    this.craters = this.orbitalCount;
    return result;
  };

  GameScene.prototype.drawResult = function (result) {
    if (this.pending?.choice === 'DEFLECT' && this.pending.orbitalChargeEarned) {
      result = { ...result };
      if (this.pending.orbitalFormed) {
        result.detail = `ORBITAL FORMED • ${this.orbitalCount} AVAILABLE`;
      } else if (this.pending.result === 'clean') {
        result.detail = String(result.detail || '').replace(/\s*•\s*CRATERS\s*\+\d+/i, '');
        result.detail += ` • ORBITAL CHARGE ${this.orbitalProgress}/${DEFLECTS_PER_ORBITAL}`;
      } else {
        result.detail = `${result.detail || 'SURVIVED'} • ORBITAL CHARGE ${this.orbitalProgress}/${DEFLECTS_PER_ORBITAL}`;
      }
    }

    if (this.pending?.orbitalsSacrificed > 0) {
      result = { ...result };
      const saved = this.pending.success !== false && this.pending.result !== 'catastrophic';
      result.detail = `${result.detail || ''} • ${this.pending.orbitalsSacrificed} ORBITAL${this.pending.orbitalsSacrificed === 1 ? '' : 'S'} SACRIFICED`;
      if (saved) result.reason = `Orbital intervention reduced the catastrophic risk. ${result.reason || ''}`;
    }
    return baseDrawResult.call(this, result);
  };

  GameScene.prototype.save = function (silent = false) {
    ensureOrbitalState(this);
    const result = baseSave.call(this, silent);
    if (!silent && result !== false) {
      patchSavePayload(MANUAL_SLOT_KEY, this);
      patchSavePayload(SAVE_KEY, this);
    }
    return result;
  };

  GameScene.prototype.load = function () {
    const data = selectedSaveData();
    if (data) {
      const migrated = migratedOrbitalState(data);
      this.orbitalCount = migrated.count;
      this.orbitalProgress = migrated.progress;
      this.orbitalsUnlocked = migrated.unlocked;
    }
    const result = baseLoad.call(this);
    ensureOrbitalState(this);
    return result;
  };

  window.CometOrbitals = Object.freeze({
    unlockTier: UNLOCK_TIER,
    deflectsPerOrbital: DEFLECTS_PER_ORBITAL,
    maxVisible: MAX_VISIBLE_ORBITALS,
    maxSacrifice: MAX_SACRIFICE,
    highRiskThreshold: HIGH_RISK_THRESHOLD,
    riskMultiplierPerOrbital: RISK_MULTIPLIER_PER_ORBITAL,
    tierPool: tier => [...tierPool(tier)]
  });
})();
