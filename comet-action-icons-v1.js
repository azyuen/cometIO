// Action button sprite icons + Home Screen vertical alignment.
(() => {
  const priorPreload = GameScene.prototype.preload;
  GameScene.prototype.preload = function () {
    if (priorPreload) priorPreload.call(this);

    // Phase 1-3 action art.
    this.load.image('action-absorb', 'assets/ui/action_absorb_64.png?v=3');
    this.load.image('action-deflect', 'assets/ui/action_deflect_64.png?v=3');
    this.load.image('action-avoid', 'assets/ui/action_avoid_64.png?v=3');

    // Phase 4 action art: supplied galaxy-scale sprites.
    this.load.image('action-absorb-phase4', 'assets/ui/action_absorb_phase4_64.png?v=2');
    this.load.image('action-deflect-phase4', 'assets/ui/action_deflect_phase4_64.png?v=2');
    this.load.image('action-avoid-phase4', 'assets/ui/action_avoid_phase4_64.png?v=2');
  };

  const priorClearUI = GameScene.prototype.clearUI;
  GameScene.prototype.clearUI = function () {
    const result = priorClearUI.call(this);
    if (typeof window !== 'undefined' && window.COMET_STANDALONE === true && this.ui) {
      this.ui.y = -8;
    }
    return result;
  };

  function phase4Active(scene) {
    const phase4 = typeof window !== 'undefined' ? window.CometPhase4 : null;
    if (!phase4) return false;
    if (typeof phase4.isActive === 'function') return !!phase4.isActive(scene);
    return Number.isFinite(phase4.firstTier) && scene.tierIndex >= phase4.firstTier;
  }

  function actionIconKey(scene, label) {
    const suffix = phase4Active(scene) ? '-phase4' : '';
    if (label === 'ABSORB') return `action-absorb${suffix}`;
    if (label === 'DEFLECT') return `action-deflect${suffix}`;
    return `action-avoid${suffix}`;
  }

  GameScene.prototype.choice = function (x, y, label, color, risk) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-61, -48, 122, 96, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-61, -48, 122, 96, 7);

    const icon = this.add.image(0, -17, actionIconKey(this, label)).setDisplaySize(52, 52);
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