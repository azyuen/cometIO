// Navigation/UI v4: Home Screen, clean utility bar, simpler choices and score handling.
(() => {
  const baseCreate = GameScene.prototype.create;
  const baseResetRun = GameScene.prototype.resetRun;
  const baseLoad = GameScene.prototype.load;

  GameScene.prototype.create = function () {
    this.cameras.main.setBackgroundColor(C.bg);
    this.cameras.main.roundPixels = true;
    this.makeBackdrop();
    this.runActive = false;
    this.showHome();
  };

  GameScene.prototype.resetRun = function () {
    this.runActive = true;
    return baseResetRun.call(this);
  };

  GameScene.prototype.startNewRun = function () {
    this.clearSave();
    this.runActive = true;
    this.resetRun();
  };

  GameScene.prototype.load = function () {
    const hadSave = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
    const result = baseLoad.call(this);
    if (hadSave) this.runActive = true;
    return result;
  };

  GameScene.prototype.showHome = function () {
    this.clearUI();
    this.state = 'HOME';

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .82).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    const comet = this.add.graphics();
    comet.fillStyle(C.orange, .12).fillCircle(W / 2, 175, 58);
    comet.lineStyle(15, C.orange, .15).lineBetween(W / 2 - 100, 220, W / 2 - 25, 185);
    comet.lineStyle(8, 0xff6d3d, .42).lineBetween(W / 2 - 86, 211, W / 2 - 25, 183);
    comet.fillStyle(C.rock, 1).fillCircle(W / 2 + 9, 170, 38);
    comet.fillStyle(C.rockDark, .7).fillCircle(W / 2 - 2, 161, 8).fillCircle(W / 2 + 22, 181, 6).fillCircle(W / 2 + 20, 153, 4);
    this.ui.add(comet);

    this.addText(W / 2, 255, 'COMET.IO', 29, C.white, { ox: .5, bold: true });
    this.addText(W / 2, 300, 'GROW • CHOOSE • SURVIVE', 10.5, C.cyan, { ox: .5, bold: true });

    const card = this.add.graphics();
    card.fillStyle(C.panel, .96).fillRoundedRect(32, 340, 356, 168, 12);
    card.lineStyle(1.5, C.cyan, .48).strokeRoundedRect(32, 340, 356, 168, 12);
    this.ui.add(card);

    this.addText(54, 362, 'ABSORB', 11, C.green, { bold: true });
    this.addText(145, 362, 'Grow when you are bigger.', 9.5, C.white, { bold: true });
    this.addText(54, 405, 'DEFLECT', 11, C.orange, { bold: true });
    this.addText(145, 405, 'Build orbitals for dangerous encounters.', 8.6, C.white, { bold: true });
    this.addText(54, 448, 'AVOID', 11, C.blue, { bold: true });
    this.addText(145, 448, 'Safest. Usually costs speed.', 9.5, C.white, { bold: true });
    this.addText(W / 2, 485, 'Pick a region every few rounds.', 8.5, C.muted, { ox: .5, bold: true });

    let y = 565;
    if (this.runActive && this.player && this.other) {
      this.homeButton(W / 2, y, 326, 54, 'RETURN TO GAME', C.green, () => this.drawEncounter());
      y += 67;
    }
    this.homeButton(W / 2, y, 326, 54, 'START NEW RUN', C.cyan, () => this.startNewRun());
    y += 67;
    this.homeButton(W / 2, y, 326, 54, 'LOAD SAVE', C.blue, () => this.load());
    y += 67;
    this.homeButton(W / 2, y, 326, 54, 'HIGH SCORES', C.orange, () => this.showScores('home'));
  };

  GameScene.prototype.homeButton = function (x, y, w, h, label, color, cb) {
    const c = this.add.container(x, y), g = this.add.graphics();
    g.fillStyle(color, .13).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(2, color, .9).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    const t = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#fff' }).setOrigin(.5);
    if (t.setResolution) t.setResolution(8);
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', cb);
    c.add([g, t, hit]); this.ui.add(c);
  };

  GameScene.prototype.drawHud = function (controls = false) {
    const t = TIERS[this.tierIndex];

    if (controls) {
      this.miniButton(44, 50, 68, 24, 'SAVE', C.green, () => this.save(false));
      this.miniButton(119, 50, 68, 24, 'LOAD', C.blue, () => this.load());
      this.miniButton(198, 50, 76, 24, 'HOME', C.orange, () => {
        this.save(true);
        this.runActive = true;
        this.showHome();
      });
    }

    const y = controls ? 77 : 55, gap = 5, x0 = 10, cw = 96.25, ch = 64;
    const rows = [
      ['MASS', this.massText(this.player.massKg)],
      ['SPEED', this.speedText(this.player.speedMS)],
      ['CRATERS', String(this.craters)],
      [`TIER ${this.tierIndex + 1}`, this.shortTier(t.name)]
    ];

    rows.forEach((row, i) => {
      const x = x0 + i * (cw + gap), g = this.add.graphics();
      g.fillStyle(C.panel, .985).fillRoundedRect(x, y, cw, ch, 7);
      g.lineStyle(2, C.cyan, .68).strokeRoundedRect(x, y, cw, ch, 7);
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
      this.addText(tx, y + 8, row[0], 8.4, C.muted, { bold: true });
      this.addText(tx, y + 28, row[1], i === 3 ? 7.8 : 9.2, C.white, { bold: true, width: i === 3 ? 84 : 61 });
    });

    const infoY = y + 81;
    this.addText(13, infoY, this.region().short, 9.6, C.white, { bold: true, width: 245 });
    this.addText(W - 13, infoY, `R${this.encounters + 1} • ${this.score.toLocaleString('en-US')}`, 9.2, C.muted, { ox: 1, bold: true });
  };

  GameScene.prototype.choice = function (x, y, label, color) {
    const c = this.add.container(x, y), g = this.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-61, -48, 122, 96, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-61, -48, 122, 96, 7);
    const icon = this.add.graphics();
    if (label === 'ABSORB') {
      icon.lineStyle(4, color, 1).arc(0, -14, 17, .25, Math.PI * 1.78, false).strokePath();
      icon.fillStyle(color).fillCircle(0, -14, 3);
    } else if (label === 'DEFLECT') {
      icon.fillStyle(color).fillCircle(-7, -15, 10);
      icon.lineStyle(4, color, 1).lineBetween(7, -22, 23, -36);
      icon.fillTriangle(23, -36, 13, -33, 20, -25);
    } else {
      icon.lineStyle(6, color, 1).arc(0, -13, 19, .3, 2, false).strokePath();
      icon.fillStyle(color).fillTriangle(18, -25, 7, -26, 14, -16);
    }
    const a = this.add.text(0, 28, label, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff' }).setOrigin(.5);
    if (a.setResolution) a.setResolution(8);
    const hit = this.add.rectangle(0, 0, 122, 96, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.choose(label));
    c.add([g, icon, a, hit]); this.ui.add(c);
  };

  GameScene.prototype.drawPrompt = function () {
    const y = this.Y(636), g = this.add.graphics();
    g.fillStyle(C.panel, .99).fillRoundedRect(10, y, 400, 78, 8);
    g.lineStyle(2, C.cyan, .84).strokeRoundedRect(10, y, 400, 78, 8); this.ui.add(g);
    this.addText(W / 2, y + 17, 'OBJECT AHEAD', 13.5, C.white, { ox: .5, bold: true });
    this.addText(W / 2, y + 45, 'WHAT DO YOU DO?', 10, C.muted, { ox: .5, bold: true });
    this.choice(73, this.Y(771), 'ABSORB', C.green);
    this.choice(210, this.Y(771), 'DEFLECT', C.orange);
    this.choice(347, this.Y(771), 'AVOID', C.blue);
  };

  GameScene.prototype.reveal = function (choice) {
    this.clearUI(); this.drawHud(false);
    this.addText(W / 2, this.Y(164), 'SCALE REVEAL', 12.5, C.white, { ox: .5, bold: true });

    const ratio = this.other.radiusM / this.player.radiusM;
    let pr = 38, or = pr * ratio;
    if (ratio >= .2 && ratio <= 5) {
      if (or > 145) { const s = 145 / or; or *= s; pr *= s; }
      if (pr > 145) { const s = 145 / pr; pr *= s; or *= s; }
    } else {
      if (or > 145) { const s = 145 / or; or = 145; pr = Math.max(1.5, pr * s); }
      if (or < 5) { const s = 5 / Math.max(or, .00001); or = 5; pr = Math.min(145, pr * s); }
    }

    const p = this.drawObject(102, this.Y(345), Math.max(1.5, pr), this.player);
    const o = this.drawObject(318, this.Y(410), Math.max(1.5, or), this.other);
    p.setScale(38 / Math.max(pr, 1.5)); o.setScale(38 / Math.max(or, 1.5));
    p.setAlpha(.9); o.setAlpha(.9);

    const a = this.addText(18, this.Y(535), `YOU\n${this.player.name}`, 9.7, C.green, { bold: true, lineSpacing: 5, width: 165 });
    const b = this.addText(W - 18, this.Y(535), `${this.other.realName}\n${this.other.name}`, 9.7, C.orange, { ox: 1, align: 'right', bold: true, lineSpacing: 5, width: 195 });
    a.setAlpha(0); b.setAlpha(0);

    this.addText(W / 2, this.Y(594), this.scaleRelation(ratio), 9.2, C.muted, { ox: .5, bold: true });
    this.tweens.add({ targets: p, scaleX: 1, scaleY: 1, alpha: 1, duration: 900, ease: 'Cubic.out' });
    this.tweens.add({ targets: o, scaleX: 1, scaleY: 1, alpha: 1, duration: 900, ease: 'Cubic.out' });
    this.tweens.add({ targets: [a, b], alpha: 1, delay: 430, duration: 300 });

    const panelY = this.Y(655), g = this.add.graphics();
    g.fillStyle(C.panel, .99).fillRoundedRect(10, panelY, 400, 64, 8);
    g.lineStyle(2, C.cyan, .82).strokeRoundedRect(10, panelY, 400, 64, 8); this.ui.add(g);
    this.addText(W / 2, panelY + 18, choice, 12.5, C.white, { ox: .5, bold: true });
    this.addText(W / 2, panelY + 42, 'LOCKED IN', 8.7, C.muted, { ox: .5, bold: true });
    this.time.delayedCall(1500, () => this.animate(choice, p, o, pr, or));
  };

  GameScene.prototype.saveScoreAs = function (name) {
    if (!this.qualifies()) return;
    const scores = this.getScores();
    const history = Array.isArray(this.actionHistory) ? this.actionHistory : [];
    const absorbs = history.filter(x => x === 'ABSORB').length;
    const deflects = history.filter(x => x === 'DEFLECT').length;
    const avoids = history.filter(x => x === 'AVOID').length;
    scores.push({
      name: String(name || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER',
      score: this.score,
      massKg: this.player.massKg,
      tierIndex: this.tierIndex,
      object: TIERS[this.tierIndex].name,
      actions: { total: absorbs + deflects + avoids, absorbs, deflects, avoids },
      streak: [...history],
      date: Date.now()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  const priorRecordScore = GameScene.prototype.recordScore;
  GameScene.prototype.recordScore = function () {
    if (!this.qualifies()) return;
    const name = (window.prompt('Top five score! Enter your name:', 'PLAYER') || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER';
    this.saveScoreAs(name);
  };

  GameScene.prototype.drawResult = function (res) {
    const r = this.pending, top = !res.survived && this.qualifies();
    const preP = this.preEncounterPlayer || this.player, preO = this.preEncounterOther || this.other;
    this.clearUI(); this.drawHud(false);

    const base = this.Y(160), g = this.add.graphics();
    g.fillStyle(C.panel, .99).fillRoundedRect(14, base, 392, 505, 10);
    g.lineStyle(2, res.color, .88).strokeRoundedRect(14, base, 392, 505, 10); this.ui.add(g);

    this.addText(W / 2, base + 23, res.title, 14.8, res.color, { ox: .5, bold: true, align: 'center', width: 365 });
    this.addText(W / 2, base + 57, this.other.realName, 10.5, C.orange, { ox: .5, bold: true });
    this.addText(W / 2, base + 79, this.other.name, 8.2, C.muted, { ox: .5, bold: true });
    this.drawObject(95, base + 132, 27, preP); this.drawObject(325, base + 132, 27, preO);

    const rows = [
      ['SIZE', this.sizeText(preP.radiusM), this.sizeText(preO.radiusM)],
      ['MASS', this.massText(preP.massKg), this.massText(preO.massKg)],
      ['SPEED', this.speedText(preP.speedMS), this.speedText(preO.speedMS)]
    ];
    rows.forEach((row, i) => {
      const yy = base + 195 + i * 38;
      this.addText(38, yy, row[0], 7.8, C.muted, { bold: true });
      this.addText(195, yy, row[1], 8.7, C.white, { ox: 1, bold: true });
      this.addText(225, yy, row[2], 8.7, C.white, { bold: true });
    });

    const rawRatio = preO.radiusM / Math.max(preP.radiusM, 1e-300);
    this.addText(W / 2, base + 315, this.scaleRelation(rawRatio), 8.8, C.cyan, { ox: .5, bold: true });

    let odds = '';
    if (r.choice === 'ABSORB') {
      const parts = [];
      if (r.absorbChance > 0) parts.push(`ABSORB ${Math.round(r.absorbChance * 100)}%`);
      if (r.mergeChance > 0) parts.push(`MERGE ${Math.round(r.mergeChance * 100)}%`);
      if (r.fragmentChance > 0) parts.push(`FRAG ${Math.round(r.fragmentChance * 100)}%`);
      if (r.fatalChance > 0) parts.push(`OUT ${Math.round(r.fatalChance * 100)}%`);
      odds = parts.join(' • ');
    } else if (r.choice === 'DEFLECT') {
      odds = `CLEAN ${Math.round((r.cleanChance || 0) * 100)}% • ROUGH ${Math.round(Math.max(0, 1 - (r.cleanChance || 0) - (r.fatalChance || 0)) * 100)}% • OUT ${Math.round((r.fatalChance || 0) * 100)}%`;
    } else odds = `ESCAPE ${Math.round(r.chance * 100)}%`;
    this.addText(W / 2, base + 347, odds, 7.5, C.muted, { ox: .5, bold: true });

    const box = this.add.graphics(); box.fillStyle(C.panel2, .96).fillRoundedRect(32, base + 374, 356, 72, 7); this.ui.add(box);
    this.addText(45, base + 389, this.shortOutcomeReason(r, res), 8.6, C.white, { width: 330, bold: true, lineSpacing: 4 });
    this.addText(W / 2, base + 470, res.detail, 8.8, C.white, { ox: .5, align: 'center', width: 350, bold: true });

    if (res.survived) {
      this.wideButton(W / 2, this.Y(715), 330, 54, 'NEXT', C.cyan, () => this.startEncounter());
    } else if (top) {
      this.wideButton(W / 2, this.Y(705), 330, 48, 'ENTER NAME', C.orange, () => { this.recordScore(); this.showScores('gameover'); });
      this.wideButton(W / 2, this.Y(767), 330, 48, 'QUICK RESTART', C.cyan, () => { this.saveScoreAs('PLAYER'); this.resetRun(); });
    } else {
      this.wideButton(W / 2, this.Y(735), 330, 52, 'RESTART', C.red, () => this.resetRun());
    }
  };

  GameScene.prototype.showScores = function (returnTo = 'home') {
    this.clearUI(); this.state = 'SCORES';
    this.addText(W / 2, this.Y(42), 'HIGH SCORES', 17, C.white, { ox: .5, bold: true });
    const scores = this.getScores();
    if (!scores.length) this.addText(W / 2, this.Y(330), 'NO SCORES YET', 12, C.muted, { ox: .5, bold: true });

    scores.forEach((v, i) => {
      const y = this.Y(132 + i * 123), g = this.add.graphics();
      const idx = clamp(+v.tierIndex || 0, 0, TIERS.length - 1), t = TIERS[idx];
      const o = { ...this.player, name:t.name, tier:idx, radiusM:t.r, massKg:t.m, speedMS:t.v, kind:t.kind, color:t.color, solid:t.solid };
      const h = Array.isArray(v.streak) ? v.streak : [], counts = v.actions || {
        total:h.length,
        absorbs:h.filter(x=>x==='ABSORB').length,
        deflects:h.filter(x=>x==='DEFLECT').length,
        avoids:h.filter(x=>x==='AVOID').length
      };
      g.fillStyle(C.panel, .98).fillRoundedRect(16, y - 43, 388, 106, 8);
      g.lineStyle(1.5, i ? C.cyan : C.orange, .7).strokeRoundedRect(16, y - 43, 388, 106, 8); this.ui.add(g);
      this.drawObject(48, y, 18, o);
      this.addText(77, y - 33, `#${i + 1}  ${String(v.name || 'PLAYER').slice(0,12)}`, 9.2, i ? C.white : C.orange, { bold:true });
      this.addText(390, y - 33, (+v.score || 0).toLocaleString('en-US'), 9.6, C.green, { ox:1, bold:true });
      this.addText(77, y - 10, String(v.object || t.name), 7.8, C.muted, { bold:true });
      this.addText(77, y + 9, `MASS ${this.massText(+v.massKg || t.m)}`, 7.6, C.white, { bold:true });
      this.addText(77, y + 30, `TOTAL ${counts.total} • A ${counts.absorbs} • D ${counts.deflects} • V ${counts.avoids}`, 7.2, C.muted, { bold:true });
    });

    const label = returnTo === 'gameover' ? 'NEW RUN' : 'BACK HOME';
    this.wideButton(W / 2, this.Y(793), 300, 46, label, C.cyan, () => returnTo === 'gameover' ? this.resetRun() : this.showHome());
  };
})();
