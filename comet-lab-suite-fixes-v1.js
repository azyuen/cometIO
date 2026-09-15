// Final LAB suite integration fixes.
// Keeps Phase 4's completion reward out of sandbox phase runs and renames visible DEV wording to LAB.
(() => {
  if (!window.CometLabSuite) return;
  const proto = GameScene.prototype;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;
  const baseShowPhase4DevReward = proto.showPhase4DevReward;

  function walk(node, visitor) {
    if (!node) return;
    visitor(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, visitor));
  }

  function renameDevToLab(scene) {
    const replacements = new Map([
      ['DEV MODE UNLOCKED', 'LAB MODE UNLOCKED'],
      ['DEV PASSCODE', 'LAB PASSCODE'],
      ['KEEP THIS CODE FOR THE DEV BUTTON ON HOME', 'KEEP THIS CODE FOR THE LAB BUTTON ON HOME'],
      ['ENTER DEV MODE', 'ENTER LAB MODE'],
      ['DEV MODE IS A COMPLETION REWARD.', 'LAB MODE IS A COMPLETION REWARD.'],
      ['UNLOCK DEV MODE', 'UNLOCK LAB MODE']
    ]);
    walk(scene.ui, child => {
      if (typeof child?.text !== 'string' || typeof child.setText !== 'function') return;
      const next = replacements.get(child.text);
      if (next) child.setText(next);
    });
  }

  proto.showLabPhaseComplete = function () {
    this.tweens.killAll();
    this.clearUI();
    this.state = 'LAB_PHASE_COMPLETE';
    const phase = this._labSandboxPhase || 'PHASE';
    const bg = this.add.graphics();
    bg.fillStyle(C.bg, 1).fillRect(-10, -10, W + 20, H + 20);
    this.ui.add(bg);
    this.addText(W / 2, this.Y(180), `${phase} TEST COMPLETE`, 22, C.green, { ox:.5, bold:true });
    this.addText(W / 2, this.Y(225), 'SANDBOX RUN • NOTHING WAS SAVED', 9, C.purple, { ox:.5, bold:true });
    this.addText(W / 2, this.Y(295), 'The real game state, leaderboard and LAB unlock data were not changed.', 9, C.muted, { ox:.5, bold:true, width:340, align:'center' });
    this.wideButton(W / 2, this.Y(430), 300, 52, `RESTART ${phase}`, C.cyan, () => this.startLabPhaseRun(phase));
    this.wideButton(W / 2, this.Y(500), 300, 52, 'RETURN TO LAB', C.purple, () => this.returnFromLabPhase());
    this.wideButton(W / 2, this.Y(570), 250, 44, 'BACK HOME', C.muted, () => {
      this._labSandboxRun = false;
      this._labSandboxPhase = null;
      this._devModeActive = true;
      if (typeof this.exitDevLab === 'function') this.exitDevLab();
      else this.showHome();
    });
  };

  proto.continueFromPhaseCard = function (config) {
    if (this._labSandboxRun && config?.final) return this.showLabPhaseComplete();
    return baseContinueFromPhaseCard.call(this, config);
  };

  if (typeof baseShowPhase4DevReward === 'function') {
    proto.showPhase4DevReward = function () {
      if (this._labSandboxRun) return this.showLabPhaseComplete();
      const result = baseShowPhase4DevReward.call(this);
      renameDevToLab(this);
      return result;
    };
  }

  window.CometLabSuiteFixes = Object.freeze({
    blocksPhase4RewardInSandbox: true,
    visibleName: 'LAB MODE'
  });
})();
