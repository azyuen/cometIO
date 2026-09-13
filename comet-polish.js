// Final mobile polish: consistent scale reveal, save migration and simpler readable UI.
(() => {
  const originalChoose = GameScene.prototype.choose;

  GameScene.prototype.choose = function (choice) {
    if (this.state === 'APPROACH') {
      this.preEncounterPlayer = { ...this.player };
      this.preEncounterOther = { ...this.other };
    }
    return originalChoose.call(this, choice);
  };

  GameScene.prototype.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.toast('NO SAVED RUN', C.orange); return; }
      const d = JSON.parse(raw);
      if (!Number.isInteger(d.tierIndex) || d.tierIndex < 0 || d.tierIndex >= TIERS.length) throw 0;

      this.tierIndex = d.tierIndex;
      this.growth = +d.growth || 0;
      this.craters = +d.craters || 0;
      this.encounters = +d.encounters || 0;
      this.absorbs = +d.absorbs || 0;
      this.score = +d.score || 0;
      this.regionId = REGIONS.some(r => r.id === d.regionId) ? d.regionId : 'outer-heliosphere';
      this.lastRegionPromptEncounter = Number.isFinite(d.lastRegionPromptEncounter) ? d.lastRegionPromptEncounter : -1;
      this.actionHistory = Array.isArray(d.actionHistory) ? d.actionHistory : [];
      this.runStarted = Date.now() - (+d.elapsedMs || 0);

      const base = TIERS[this.tierIndex];
      const saved = d.player || {};
      const validIdentity = saved.tier === this.tierIndex && saved.name === base.name;
      const radiusRatio = (+saved.radiusM || base.r) / base.r;
      const plausibleRadius = radiusRatio > 0.55 && radiusRatio < 1.6;

      if (!validIdentity || !plausibleRadius) {
        // Old saves could say ATOM while still carrying the former 10 µm dust radius.
        this.player = {
          name: base.name,
          tier: this.tierIndex,
          radiusM: base.r,
          massKg: base.m,
          speedMS: clamp(+saved.speedMS || base.v, base.v * 0.45, base.v * 2.5),
          kind: base.kind,
          color: base.color,
          solid: base.solid
        };
      } else {
        this.player = {
          ...saved,
          name: base.name,
          tier: this.tierIndex,
          kind: base.kind,
          color: base.color,
          solid: base.solid
        };
      }
      this.startEncounter();
    } catch (e) {
      this.toast('SAVE RESET', C.red);
      this.resetRun();
    }
  };

  GameScene.prototype.drawHud = function (controls = false) {
    const t = TIERS[this.tierIndex], y = this.Y(18), gap = 5, x0 = 10, cw = 96.25, ch = 64;
    const rows = [
      ['MASS', this.massText(this.player.massKg)],
      ['SPEED', this.speedText(this.player.speedMS)],
      ['CRATERS', String(this.craters)],
      [`TIER ${this.tierIndex + 1}`, this.shortTier(t.name)]
    ];

    rows.forEach((row, i) => {
      const x = x0 + i * (cw + gap), g = this.add.graphics();
      g.fillStyle(C.panel, .98).fillRoundedRect(x, y, cw, ch, 7);
      g.lineStyle(2, C.cyan, .72).strokeRoundedRect(x, y, cw, ch, 7);
      this.ui.add(g);
      if (i === 0) this.miniRock(x + 17, y + 31, 10, C.rock);
      if (i === 1) this.speedGauge(x + 17, y + 31);
      if (i === 2) this.miniRock(x + 17, y + 31, 10, 0x9da4b6, true);
      if (i === 3) {
        const b = this.add.graphics(), pct = this.tierIndex === TIERS.length - 1 ? 1 : clamp(this.growth / t.need, 0, 1);
        b.fillStyle(0x20364a).fillRoundedRect(x + 8, y + 51, cw - 16, 5, 2);
        b.fillStyle(C.cyan).fillRoundedRect(x + 8, y + 51, (cw - 16) * pct, 5, 2);
        this.ui.add(b);
      }
      const tx = i < 3 ? x + 34 : x + 7;
      this.addText(tx, y + 8, row[0], 8.5, C.muted, { bold: true });
      this.addText(tx, y + 28, row[1], i === 3 ? 8 : 9.5, C.white, { bold: true, width: i === 3 ? 84 : 61 });
    });

    this.addText(13, this.Y(101), this.region().short, 10, C.white, { bold: true, width: 245 });
    this.addText(W - 13, this.Y(101), `R${this.encounters + 1}  •  ${this.score.toLocaleString('en-US')}`, 9.5, C.muted, { ox: 1, bold: true });
    const line = this.add.graphics(); line.lineStyle(2, C.cyan, .62).lineBetween(13, this.Y(128), 74, this.Y(128)).lineBetween(W - 74, this.Y(128), W - 13, this.Y(128)); this.ui.add(line);

    if (controls) {
      this.miniButton(31, this.Y(145), 56, 23, 'SAVE', C.green, () => this.save(false));
      this.miniButton(94, this.Y(145), 56, 23, 'LOAD', C.blue, () => this.load());
      this.miniButton(178, this.Y(145), 102, 23, 'SCORES', C.orange, () => this.showScores());
    }
  };

  GameScene.prototype.drawPrompt = function () {
    const y = this.Y(636), g = this.add.graphics();
    g.fillStyle(C.panel, .99).fillRoundedRect(10, y, 400, 78, 8);
    g.lineStyle(2, C.cyan, .84).strokeRoundedRect(10, y, 400, 78, 8);
    this.ui.add(g);
    this.addText(W / 2, y + 17, 'OBJECT AHEAD', 14, C.white, { ox: .5, bold: true });
    this.addText(W / 2, y + 45, 'WHAT DO YOU DO?', 10.5, C.muted, { ox: .5, bold: true });
    this.choice(73, this.Y(771), 'ABSORB', C.green, 'RISKY');
    this.choice(210, this.Y(771), 'DEFLECT', C.orange, 'MEDIUM');
    this.choice(347, this.Y(771), 'AVOID', C.blue, 'SAFE');
  };

  GameScene.prototype.scaleRelation = function (ratio) {
    if (ratio >= .82 && ratio <= 1.22) return 'NEARLY SAME SIZE';
    if (ratio > 1) return `TARGET ${this.compact(ratio)}× LARGER`;
    return `YOU ${this.compact(1 / ratio)}× LARGER`;
  };

  GameScene.prototype.reveal = function (choice) {
    this.clearUI(); this.drawHud(false);
    this.addText(W / 2, this.Y(157), 'SCALE REVEAL', 13, C.white, { ox: .5, bold: true });

    const ratio = this.other.radiusM / this.player.radiusM;
    let pr = 38, or = pr * ratio;

    // Exact relative size is preserved for close encounters. Only extreme ratios are compressed to fit the phone.
    if (ratio >= .2 && ratio <= 5) {
      pr = 38; or = 38 * ratio;
      if (or > 145) { const s = 145 / or; or *= s; pr *= s; }
      if (pr > 145) { const s = 145 / pr; pr *= s; or *= s; }
    } else {
      if (or > 145) { const s = 145 / or; or = 145; pr = Math.max(1.5, pr * s); }
      if (or < 5) { const s = 5 / Math.max(or, .00001); or = 5; pr = Math.min(145, pr * s); }
    }

    const p = this.drawObject(102, this.Y(345), Math.max(1.5, pr), this.player);
    const o = this.drawObject(318, this.Y(410), Math.max(1.5, or), this.other);

    // Start both at the same apparent size, exactly like the approach screen, then reveal the real ratio.
    p.setScale(38 / Math.max(pr, 1.5));
    o.setScale(38 / Math.max(or, 1.5));
    p.setAlpha(.9); o.setAlpha(.9);

    const a = this.addText(18, this.Y(542), `YOU\n${this.player.name}`, 10, C.green, { bold: true, lineSpacing: 4, width: 165 });
    const b = this.addText(W - 18, this.Y(542), `${this.other.realName}\n${this.other.name}`, 10, C.orange, { ox: 1, align: 'right', bold: true, lineSpacing: 4, width: 195 });
    a.setAlpha(0); b.setAlpha(0);
    this.addText(W / 2, this.Y(607), this.scaleRelation(ratio), 9.5, C.muted, { ox: .5, bold: true });

    this.tweens.add({ targets: p, scaleX: 1, scaleY: 1, alpha: 1, duration: 900, ease: 'Cubic.out' });
    this.tweens.add({ targets: o, scaleX: 1, scaleY: 1, alpha: 1, duration: 900, ease: 'Cubic.out' });
    this.tweens.add({ targets: [a, b], alpha: 1, delay: 430, duration: 300 });

    const g = this.add.graphics(); g.fillStyle(C.panel, .99).fillRoundedRect(10, this.Y(646), 400, 68, 8); g.lineStyle(2, C.cyan, .82).strokeRoundedRect(10, this.Y(646), 400, 68, 8); this.ui.add(g);
    this.addText(W / 2, this.Y(666), choice, 13, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(691), 'LOCKED IN', 9, C.muted, { ox: .5, bold: true });
    this.time.delayedCall(1500, () => this.animate(choice, p, o, pr, or));
  };

  GameScene.prototype.shortOutcomeReason = function (r, res) {
    if (r.choice === 'ABSORB') {
      if (r.result === 'clean') return 'Similar scale. You had enough momentum to merge.';
      if (r.result === 'setback') return 'Too close to dominate. You survived, but fragmented.';
      return 'The target was far larger. Head-on impact was unsurvivable.';
    }
    if (r.choice === 'DEFLECT') {
      if (r.result === 'clean') return 'You escaped its gravity and gained speed.';
      if (r.result === 'rough') return 'You escaped, but lost speed and material.';
      return 'Gravity turned the glancing pass into a collision.';
    }
    return r.success ? 'You escaped, but the course change cost speed.' : 'Gravity captured your path.';
  };

  GameScene.prototype.drawResult = function (res) {
    const r = this.pending, top = !res.survived && this.qualifies();
    const preP = this.preEncounterPlayer || this.player;
    const preO = this.preEncounterOther || this.other;
    this.clearUI(); this.drawHud(false);

    const base = this.Y(155), g = this.add.graphics();
    g.fillStyle(C.panel, .985).fillRoundedRect(14, base, 392, 510, 10);
    g.lineStyle(2, res.color, .88).strokeRoundedRect(14, base, 392, 510, 10);
    this.ui.add(g);

    this.addText(W / 2, base + 24, res.title, 15.5, res.color, { ox: .5, bold: true, align: 'center', width: 365 });
    this.addText(W / 2, base + 57, this.other.realName, 11, C.orange, { ox: .5, bold: true });
    this.addText(W / 2, base + 78, this.other.name, 8.5, C.muted, { ox: .5, bold: true });

    this.drawObject(95, base + 132, 27, preP);
    this.drawObject(325, base + 132, 27, preO);
    this.addText(95, base + 167, 'YOU', 8, C.green, { ox: .5, bold: true });
    this.addText(325, base + 167, 'TARGET', 8, C.orange, { ox: .5, bold: true });

    const rows = [
      ['SIZE', this.sizeText(preP.radiusM), this.sizeText(preO.radiusM)],
      ['MASS', this.massText(preP.massKg), this.massText(preO.massKg)],
      ['SPEED', this.speedText(preP.speedMS), this.speedText(preO.speedMS)]
    ];
    rows.forEach((row, i) => {
      const yy = base + 201 + i * 37;
      this.addText(41, yy, row[0], 8, C.muted, { bold: true });
      this.addText(196, yy, row[1], 9, C.white, { ox: 1, bold: true });
      this.addText(224, yy, row[2], 9, C.white, { bold: true });
    });

    const rawRatio = preO.radiusM / Math.max(preP.radiusM, 1e-300);
    this.addText(W / 2, base + 315, this.scaleRelation(rawRatio), 9, C.cyan, { ox: .5, bold: true });

    let odds = '';
    if (r.choice === 'ABSORB') odds = `WIN ${Math.round(r.cleanChance * 100)}%  •  SETBACK ${Math.round(r.setbackChance * 100)}%  •  OUT ${Math.round(r.fatalChance * 100)}%`;
    else if (r.choice === 'DEFLECT') odds = `CLEAN ${Math.round((r.cleanChance || 0) * 100)}%  •  ROUGH ${Math.round(Math.max(0, 1 - (r.cleanChance || 0) - (r.fatalChance || 0)) * 100)}%  •  OUT ${Math.round((r.fatalChance || 0) * 100)}%`;
    else odds = `ESCAPE ${Math.round(r.chance * 100)}%`;
    this.addText(W / 2, base + 341, odds, 8.2, C.muted, { ox: .5, bold: true });

    const box = this.add.graphics(); box.fillStyle(C.panel2, .95).fillRoundedRect(32, base + 365, 356, 70, 7); this.ui.add(box);
    this.addText(45, base + 377, this.shortOutcomeReason(r, res), 9, C.white, { width: 330, bold: true, lineSpacing: 3 });
    this.addText(W / 2, base + 459, res.detail, 9.2, C.white, { ox: .5, align: 'center', width: 350, bold: true });
    if (top) this.addText(W / 2, base + 488, 'TOP 5 SCORE', 9, C.orange, { ox: .5, bold: true });

    if (res.survived) this.wideButton(W / 2, this.Y(711), 330, 58, 'NEXT', C.cyan, () => this.startEncounter());
    else if (top) this.wideButton(W / 2, this.Y(711), 330, 58, 'ENTER SCORE', C.orange, () => { this.recordScore(); this.showScores('gameover'); });
    else this.wideButton(W / 2, this.Y(711), 330, 58, 'RESTART', C.red, () => this.resetRun());
  };
})();
