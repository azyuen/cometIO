// Mechanics v3: intuitive absorb outcomes, action-count high scores and readable mass units.
(() => {
  const priorOutcome = GameScene.prototype.outcome;
  const priorResolve = GameScene.prototype.resolve;
  const priorDrawResult = GameScene.prototype.drawResult;

  const actionCounts = history => {
    const h = Array.isArray(history) ? history : [];
    const absorbs = h.filter(x => x === 'ABSORB').length;
    const deflects = h.filter(x => x === 'DEFLECT').length;
    const avoids = h.filter(x => x === 'AVOID').length;
    return { total: absorbs + deflects + avoids, absorbs, deflects, avoids };
  };

  GameScene.prototype.massText = function (kg) {
    const a = Math.abs(kg);
    if (!Number.isFinite(a)) return '∞';
    if (a === 0) return '0 kg';
    if (a < 1e-15) return `${kg.toExponential(1)} kg`;
    if (a < 1e-12) return `${(kg * 1e15).toPrecision(3)} pg`;
    if (a < 1e-9) return `${(kg * 1e12).toPrecision(3)} ng`;
    if (a < 1e-6) return `${(kg * 1e9).toPrecision(3)} µg`;
    if (a < 1e-3) return `${(kg * 1e6).toPrecision(3)} mg`;
    if (a < 1) return `${(kg * 1e3).toPrecision(3)} g`;
    if (a < 1e3) return `${kg.toPrecision(3)} kg`;
    if (a < 1e6) return `${(kg / 1e3).toPrecision(3)} t`;
    if (a < 1e9) return `${(kg / 1e6).toPrecision(3)} kt`;
    if (a < 1e12) return `${(kg / 1e9).toPrecision(3)} Mt`;
    if (a < 1e15) return `${(kg / 1e12).toPrecision(3)} Gt`;
    if (a < 1e18) return `${(kg / 1e15).toPrecision(3)} Tt`;
    if (a < 1e21) return `${(kg / 1e18).toPrecision(3)} Pt`;
    if (a < 2.986e23) return `${(kg / 1e21).toPrecision(3)} Et`;
    if (a < 9.945e28) return `${(kg / 5.972e24).toPrecision(3)} M⊕`;
    return `${(kg / 1.989e30).toPrecision(3)} M☉`;
  };

  GameScene.prototype.outcome = function (choice) {
    if (choice !== 'ABSORB') return priorOutcome.call(this, choice);

    const p = this.player, o = this.other;
    const gap = o.tier - p.tier;
    const relV = relativeSpeed(p, o);
    const targetEscape = escapeVelocity(o);
    const speedRatio = o.speedMS / Math.max(p.speedMS, 1);
    const sizeRatio = o.radiusM / Math.max(p.radiusM, 1e-300);
    const massRatio = o.massKg / Math.max(p.massKg, 1e-300);
    const pWithin = p.radiusM / Math.max(TIERS[p.tier].r, 1e-300);
    const oWithin = o.radiusM / Math.max(TIERS[o.tier].r, 1e-300);
    const gameRatio = Math.pow(2, gap) * (oWithin / Math.max(pWithin, 1e-9));

    let absorbChance = 0, mergeChance = 0, fragmentChance = 0, fatalChance = 0;

    // If you are plainly the larger/heavier body, Absorb should behave intuitively.
    const playerPhysicallyDominant = (sizeRatio <= 0.8 && massRatio <= 1) || (sizeRatio <= 1 && massRatio <= 0.5);
    const targetPhysicallyOverwhelming = sizeRatio >= 12 && massRatio >= 12;

    if (playerPhysicallyDominant || (gap <= -1 && sizeRatio < 1.5 && massRatio < 2)) {
      absorbChance = 1;
    } else if (targetPhysicallyOverwhelming && gap >= 1) {
      fatalChance = 1;
    } else if (gap <= 0 || gameRatio <= 1.25) {
      absorbChance = clamp(.94 - .04 * Math.max(0, speedRatio - 1.25), .86, .97);
      fragmentChance = 1 - absorbChance;
    } else if (gap === 1 || gameRatio <= 2.3) {
      mergeChance = clamp(.38 - .07 * Math.max(0, speedRatio - 1), .24, .42);
      fatalChance = clamp(.02 + .035 * Math.max(0, speedRatio - 1.6), .01, .07);
      fragmentChance = 1 - mergeChance - fatalChance;
    } else if (gap === 2 || gameRatio <= 4.8) {
      mergeChance = clamp(.18 - .04 * Math.max(0, speedRatio - 1), .10, .20);
      fatalChance = clamp(.36 + .08 * Math.max(0, speedRatio - 1.2), .34, .55);
      fragmentChance = 1 - mergeChance - fatalChance;
    } else {
      fatalChance = 1;
    }

    const roll = Math.random();
    let result;
    if (roll < fatalChance) result = 'catastrophic';
    else if (roll < fatalChance + absorbChance) result = 'absorb';
    else if (roll < fatalChance + absorbChance + mergeChance) result = 'merge';
    else result = 'fragment';

    return {
      choice, result, success: result !== 'catastrophic',
      chance: 1 - fatalChance,
      absorbChance, mergeChance, fragmentChance, fatalChance,
      relV, targetEscape, gap, speedRatio, sizeRatio, massRatio, gameRatio
    };
  };

  GameScene.prototype.resolve = function () {
    const r = this.pending;
    if (r.choice !== 'ABSORB') return priorResolve.call(this);

    let title = '', detail = '', reason = '', color = C.green;

    if (r.result === 'absorb') {
      const gp = this.growthPoints();
      this.growth += gp;
      this.absorbs++;
      const massGain = Math.min(this.other.massKg, Math.max(this.player.massKg * 2, TIERS[this.tierIndex].m * .75));
      this.player.massKg += massGain * .35;
      this.player.radiusM *= Math.cbrt(1 + (massGain * .35) / Math.max(this.player.massKg, 1e-300));
      this.player.speedMS = clamp(this.player.speedMS + clamp(this.other.speedMS * .06, 20, 18000), 120, 1.5e6);

      let evolved = false;
      while (this.tierIndex < TIERS.length - 1 && this.growth >= TIERS[this.tierIndex].need) {
        this.growth -= TIERS[this.tierIndex].need;
        this.tierIndex++;
        this.setPlayer(false);
        evolved = true;
      }
      title = evolved ? 'TIER UP' : 'ABSORBED';
      detail = evolved ? `NOW ${TIERS[this.tierIndex].name}` : `GROWTH +${gp.toFixed(1)}`;
      reason = 'You were the dominant body. The smaller target was absorbed.';
    }

    if (r.result === 'merge') {
      const gp = this.growthPoints() * 1.2;
      this.growth += gp;
      this.absorbs++;
      const speedLoss = clamp(.09 + .04 * Math.max(0, r.speedRatio - 1), .08, .20);
      const massGain = Math.min(this.other.massKg * .28, this.player.massKg * 1.4);
      this.player.massKg += massGain;
      this.player.radiusM *= Math.cbrt(1 + massGain / Math.max(this.player.massKg, 1e-300));
      this.player.speedMS = Math.max(120, this.player.speedMS * (1 - speedLoss));

      let evolved = false;
      while (this.tierIndex < TIERS.length - 1 && this.growth >= TIERS[this.tierIndex].need) {
        this.growth -= TIERS[this.tierIndex].need;
        this.tierIndex++;
        this.setPlayer(false);
        evolved = true;
      }
      title = evolved ? 'MERGED — TIER UP' : 'MERGED';
      detail = `GROWTH +${gp.toFixed(1)} • SPEED -${Math.round(speedLoss * 100)}%`;
      reason = 'The target was somewhat larger. You merged successfully, but the collision cost speed.';
      color = C.cyan;
    }

    if (r.result === 'fragment') {
      const massLoss = clamp(.10 + .035 * Math.max(0, r.gap) + .025 * Math.max(0, r.speedRatio - 1), .10, .28);
      this.player.massKg *= 1 - massLoss;
      this.player.radiusM *= Math.cbrt(1 - massLoss);
      title = 'FRAGMENTED';
      detail = `MASS -${Math.round(massLoss * 100)}% • TIER UNCHANGED`;
      reason = 'You could not absorb the target cleanly. You broke apart, but stayed in the same tier.';
      color = C.orange;
    }

    if (r.result === 'catastrophic') {
      title = 'OVERWHELMED';
      detail = `${this.other.realName} was too large to absorb.`;
      reason = 'The size and mass mismatch was too great for a head-on collision.';
      color = C.red;
    }

    const survived = r.result !== 'catastrophic';
    if (survived) {
      this.actionHistory.push('ABSORB');
      const base = r.result === 'absorb' ? 110 : r.result === 'merge' ? 145 : 12;
      this.score += Math.round(base + this.tierIndex * 12 + Math.max(0, r.gap) * (r.result === 'merge' ? 65 : 8));
      this.encounters++;
      this.save(true);
    } else this.clearSave();

    this.drawResult({ title, detail, reason, color, survived });
  };

  GameScene.prototype.shortOutcomeReason = function (r, res) {
    if (r.choice === 'ABSORB') {
      if (r.result === 'absorb') return 'You were larger. The target was absorbed.';
      if (r.result === 'merge') return 'Larger target: successful merge, but you lost speed.';
      if (r.result === 'fragment') return 'You survived, but lost mass. Tier unchanged.';
      return 'The target was far too large for a head-on collision.';
    }
    if (r.choice === 'DEFLECT') {
      if (r.result === 'clean') return 'Clean pass: you escaped and gained speed.';
      if (r.result === 'rough') return 'Rough pass: you escaped but lost material.';
      return 'Gravity pulled the deflection into a collision.';
    }
    return r.success ? 'You escaped, but changing course cost speed.' : 'Gravity captured you.';
  };

  GameScene.prototype.drawResult = function (res) {
    priorDrawResult.call(this, res);
    const r = this.pending;
    if (r.choice !== 'ABSORB') return;

    const base = this.Y(155), cover = this.add.graphics();
    cover.fillStyle(C.panel, 1).fillRect(26, base + 326, 368, 29); this.ui.add(cover);
    const parts = [];
    if (r.absorbChance > 0) parts.push(`ABSORB ${Math.round(r.absorbChance * 100)}%`);
    if (r.mergeChance > 0) parts.push(`MERGE ${Math.round(r.mergeChance * 100)}%`);
    if (r.fragmentChance > 0) parts.push(`FRAG ${Math.round(r.fragmentChance * 100)}%`);
    if (r.fatalChance > 0) parts.push(`OUT ${Math.round(r.fatalChance * 100)}%`);
    this.addText(W / 2, base + 341, parts.join(' • '), 7.7, C.muted, { ox: .5, bold: true });
  };

  GameScene.prototype.recordScore = function () {
    if (!this.qualifies()) return;
    const scores = this.getScores();
    const counts = actionCounts(this.actionHistory);
    let name = (window.prompt('Top five score! Enter your name:', 'PLAYER') || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER';
    scores.push({
      name, score: this.score, massKg: this.player.massKg, tierIndex: this.tierIndex,
      object: TIERS[this.tierIndex].name, actions: counts, streak: [...this.actionHistory], date: Date.now()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  GameScene.prototype.showScores = function (returnTo = 'encounter') {
    this.clearUI(); this.state = 'SCORES';
    this.addText(W / 2, this.Y(38), 'HIGH SCORES', 18, C.white, { ox: .5, bold: true });
    const scores = this.getScores();
    if (!scores.length) this.addText(W / 2, this.Y(330), 'NO SCORES YET', 13, C.muted, { ox: .5, bold: true });

    scores.forEach((v, i) => {
      const y = this.Y(132 + i * 123), g = this.add.graphics();
      const idx = clamp(+v.tierIndex || 0, 0, TIERS.length - 1), t = TIERS[idx];
      const o = { ...this.player, name:t.name, tier:idx, radiusM:t.r, massKg:t.m, speedMS:t.v, kind:t.kind, color:t.color, solid:t.solid };
      const counts = v.actions || actionCounts(v.streak);
      g.fillStyle(C.panel, .97).fillRoundedRect(16, y - 43, 388, 106, 8);
      g.lineStyle(1.5, i ? C.cyan : C.orange, .72).strokeRoundedRect(16, y - 43, 388, 106, 8); this.ui.add(g);
      this.drawObject(48, y, 18, o);
      this.addText(77, y - 33, `#${i+1}  ${String(v.name || 'PLAYER').slice(0,12)}`, 9.5, i ? C.white : C.orange, { bold:true });
      this.addText(390, y - 33, (+v.score || 0).toLocaleString('en-US'), 10, C.green, { ox:1, bold:true });
      this.addText(77, y - 11, String(v.object || t.name), 8.2, C.muted, { bold:true });
      this.addText(77, y + 8, `MASS ${this.massText(+v.massKg || t.m)}`, 8, C.white, { bold:true });
      this.addText(77, y + 29, `TOTAL ${counts.total}  •  ABSORB ${counts.absorbs}  •  DEFLECT ${counts.deflects}  •  AVOID ${counts.avoids}`, 7.4, C.muted, { bold:true, width:305 });
    });

    this.wideButton(W / 2, this.Y(793), 300, 46, returnTo === 'gameover' ? 'NEW RUN' : 'BACK', C.cyan, () => returnTo === 'gameover' ? this.resetRun() : this.drawEncounter());
  };
})();
