// Home title art: use the game's real sprite language instead of the old procedural comet drawing.
// Purely decorative — no gameplay, encounter or progression behaviour is changed.
(() => {
  function addHomeSprite(scene, parent, variant, lod, x, y, displayPx, angle = 0, alpha = 1) {
    const key = cometSpriteTextureKey(variant, lod);
    if (!scene.textures.exists(key)) return null;

    const image = scene.add.image(x, y, key);
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Keep standalone mode conservative: the art still floats as a group, but individual PNGs
    // are not rotated. This avoids reintroducing the iOS transparent-texture artefact path.
    image.setAngle(window.COMET_STANDALONE ? 0 : angle);
    image.setAlpha(alpha);
    const sourceW = Math.max(image.width || 1, 1);
    const sourceH = Math.max(image.height || sourceW, 1);
    image.setDisplaySize(displayPx, displayPx * (sourceH / sourceW));
    parent.add(image);
    return image;
  }

  GameScene.prototype.drawHomeSpriteArt = function () {
    const art = this.add.container(W / 2, 177);

    // Quiet framing elements: a faint trajectory, stars and a soft halo. The actual objects are
    // the same sprite assets used in gameplay, making the menu visually belong to the game.
    const deco = this.add.graphics();
    deco.lineStyle(2, C.cyan, .14);
    deco.lineBetween(-142, 67, 145, -63);
    deco.lineStyle(1, C.cyan, .08);
    deco.lineBetween(-126, 72, 152, -48);
    deco.fillStyle(C.cyan, .18);
    [
      [-145, -46, 1.3], [-119, 24, 1], [-77, -66, 1.4],
      [8, -64, 1], [121, -60, 1.5], [148, 37, 1.1]
    ].forEach(([x, y, r]) => deco.fillCircle(x, y, r));
    deco.fillStyle(C.orange, .055).fillCircle(76, -1, 56);
    art.add(deco);

    // A small-to-large visual rhythm without implying exact gameplay scale.
    addHomeSprite(this, art, 'dust_02', 64, -98, -18, 44, -9, .9);
    addHomeSprite(this, art, 'rock_03', 64, -24, 17, 70, 12, 1);
    addHomeSprite(this, art, 'comet_02', 64, 83, -5, 92, -12, 1);

    this.ui.add(art);

    // Gentle group drift only — no scale tweening or per-texture animation.
    this.tweens.add({
      targets: art,
      y: art.y + 4,
      duration: 2200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    return art;
  };

  GameScene.prototype.showHome = function () {
    this.clearUI();
    this.state = 'HOME';

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .82).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    this.drawHomeSpriteArt();

    this.addText(W / 2, 255, 'COMET.IO', 29, C.white, { ox: .5, bold: true });
    this.addText(W / 2, 300, 'GROW • CHOOSE • SURVIVE', 10.5, C.cyan, { ox: .5, bold: true });

    const card = this.add.graphics();
    card.fillStyle(C.panel, .96).fillRoundedRect(32, 340, 356, 168, 12);
    card.lineStyle(1.5, C.cyan, .48).strokeRoundedRect(32, 340, 356, 168, 12);
    this.ui.add(card);

    this.addText(54, 362, 'ABSORB', 11, C.green, { bold: true });
    this.addText(145, 362, 'Grow when you are bigger.', 9.5, C.white, { bold: true });
    this.addText(54, 405, 'DEFLECT', 11, C.orange, { bold: true });
    this.addText(145, 405, 'Trade risk for speed + craters.', 9.5, C.white, { bold: true });
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
})();
