// Safe-area refinement for iPhone/Home Screen mode.
(() => {
  const baseClearUI = GameScene.prototype.clearUI;
  const STANDALONE_UI_SHIFT_Y = -10;

  // The installed iPhone webapp sits slightly lower than the browser version because the
  // standalone viewport includes its own status-bar handling. Shift the full UI container up
  // together rather than changing individual screens. The black status area/background remains
  // in place because it is drawn outside this UI container. Browser mode is unchanged.
  GameScene.prototype.clearUI = function () {
    const result = baseClearUI.call(this);
    if (typeof window !== 'undefined' && window.COMET_STANDALONE === true && this.ui) {
      this.ui.y = STANDALONE_UI_SHIFT_Y;
    }
    return result;
  };

  GameScene.prototype.drawHud = function (controls = false) {
    const t = TIERS[this.tierIndex];

    const utilityY = SAFE_TOP + 15;
    const y = controls ? SAFE_TOP + 42 : SAFE_TOP + 18;

    if (controls) {
      // Leave enough horizontal room for the v2 COLLECTION replacement so the label is not cramped.
      this.miniButton(48, utilityY, 72, 24, 'SAVE', C.green, () => this.save(false));
      this.miniButton(140, utilityY, 104, 24, 'LOAD', C.blue, () => this.load());
      this.miniButton(232, utilityY, 72, 24, 'HOME', C.orange, () => {
        this.save(true);
        this.runActive = true;
        this.showHome();
      });
    }

    // Taller cards leave room for wrapped values (especially long tier names) without
    // colliding with the tier progress bar. Layout reserves roughly three value lines.
    const gap = 5, x0 = 10, cw = 96.25, ch = 84;
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

      if (i === 0) this.miniRock(x + 17, y + 39, 10, C.rock);
      if (i === 1) this.speedGauge(x + 17, y + 39);
      if (i === 2) this.miniRock(x + 17, y + 39, 10, 0x9da4b6, true);

      if (i === 3) {
        const b = this.add.graphics(), pct = this.tierIndex === TIERS.length - 1 ? 1 : clamp(this.growth / t.need, 0, 1);
        const barY = y + 73;
        b.fillStyle(0x20364a).fillRoundedRect(x + 8, barY, cw - 16, 5, 2);
        b.fillStyle(C.cyan).fillRoundedRect(x + 8, barY, (cw - 16) * pct, 5, 2);
        this.ui.add(b);
      }

      const tx = i < 3 ? x + 34 : x + 7;
      this.addText(tx, y + 9, row[0], 8.4, C.muted, { bold: true });
      this.addText(tx, y + 30, row[1], i === 3 ? 7.4 : 9.2, C.white, {
        bold: true,
        width: i === 3 ? 82 : 61,
        lineSpacing: i === 3 ? 1 : 0
      });
    });

    const infoY = y + 101;
    this.addText(13, infoY, this.region().short, 9.6, C.white, { bold: true, width: 245 });
    this.addText(W - 13, infoY, `R${this.encounters + 1} • ${this.score.toLocaleString('en-US')}`, 9.2, C.muted, { ox: 1, bold: true });
  };

  GameScene.prototype.showRegionSelect = function () {
    this.clearUI();
    this.state = 'REGION';
    this.drawHud(false);

    this.addText(W / 2, this.Y(154), 'CHOOSE YOUR NEXT REGION', 16, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(184), 'REGION CHANGES WHAT YOU ARE LIKELY TO MEET', 8.8, C.muted, {
      ox: .5,
      bold: true,
      width: 370,
      align: 'center'
    });

    // Move the selection grid down and simplify the cards. The former COMMON line was
    // deliberately removed because it gave away too much encounter information.
    REGIONS.forEach((r, i) => {
      this.regionButton(108 + (i % 2) * 204, this.Y(274 + Math.floor(i / 2) * 116), r);
    });
  };

  GameScene.prototype.regionButton = function (x, y, r) {
    const sel = r.id === this.regionId;
    const c = this.add.container(x, y), g = this.add.graphics(), color = sel ? C.green : C.cyan;
    const w = 188, h = 94;

    g.fillStyle(color, sel ? .16 : .08).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
    g.lineStyle(sel ? 2 : 1.5, color, .9).strokeRoundedRect(-w / 2, -h / 2, w, h, 7);

    const a = this.add.text(0, -20, r.name, {
      fontFamily: FONT,
      fontSize: '9.2px',
      fontStyle: 'bold',
      color: '#fff',
      align: 'center',
      wordWrap: { width: 172 }
    }).setOrigin(.5);

    const b = this.add.text(0, 14, r.science, {
      fontFamily: FONT,
      fontSize: '7.7px',
      color: '#8db7ca',
      align: 'center',
      wordWrap: { width: 170 }
    }).setOrigin(.5);

    [a, b].forEach(text => text.setResolution && text.setResolution(Math.min(window.devicePixelRatio || 1, 3)));

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.regionId = r.id;
      this.lastRegionPromptEncounter = this.encounters;
      this.save(true);
      this.other = this.pickOpponent();
      this.drawEncounter();
    });

    c.add([g, a, b, hit]);
    this.ui.add(c);
  };
})();
