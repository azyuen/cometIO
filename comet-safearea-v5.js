// Safe-area refinement for iPhone/Home Screen mode.
(() => {
  GameScene.prototype.drawHud = function (controls = false) {
    const t = TIERS[this.tierIndex];

    const utilityY = SAFE_TOP + 15;
    const y = controls ? SAFE_TOP + 42 : SAFE_TOP + 18;

    if (controls) {
      this.miniButton(44, utilityY, 68, 24, 'SAVE', C.green, () => this.save(false));
      this.miniButton(119, utilityY, 68, 24, 'LOAD', C.blue, () => this.load());
      this.miniButton(198, utilityY, 76, 24, 'HOME', C.orange, () => {
        this.save(true);
        this.runActive = true;
        this.showHome();
      });
    }

    const gap = 5, x0 = 10, cw = 96.25, ch = 64;
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
})();
