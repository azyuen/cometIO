// Action button sprite icons + Home Screen vertical alignment.
(() => {
  const priorPreload = GameScene.prototype.preload;
  GameScene.prototype.preload = function () {
    if (priorPreload) priorPreload.call(this);
    this.load.image('action-absorb', 'assets/ui/action_absorb_64.png');
    this.load.image('action-deflect', 'assets/ui/action_deflect_64.png');
    this.load.image('action-avoid', 'assets/ui/action_avoid_64.png');
  };

  const priorClearUI = GameScene.prototype.clearUI;
  GameScene.prototype.clearUI = function () {
    const result = priorClearUI.call(this);
    if (typeof window !== 'undefined' && window.COMET_STANDALONE === true && this.ui) {
      this.ui.y = -30;
    }
    return result;
  };

  GameScene.prototype.choice = function (x, y, label, color, risk) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-61, -48, 122, 96, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-61, -48, 122, 96, 7);

    const key = label === 'ABSORB' ? 'action-absorb' : label === 'DEFLECT' ? 'action-deflect' : 'action-avoid';
    const icon = this.add.image(0, -17, key).setDisplaySize(52, 52);

    const a = this.add.text(0, 24, label, {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff'
    }).setOrigin(.5);
    const b = this.add.text(0, 42, risk, {
      fontFamily: FONT, fontSize: '8px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(.5);
    const hit = this.add.rectangle(0, 0, 122, 96, 0xffffff, .001).setInteractive({ useHandCursor: true });
    if (a.setResolution) {
      a.setResolution(Math.min(window.devicePixelRatio || 1, 3));
      b.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    }
    hit.on('pointerdown', () => this.choose(label));
    c.add([g, icon, a, b, hit]);
    this.ui.add(c);
  };
})();
