// Final LAB suite integration fixes.
// Keeps Phase 4's completion reward out of sandbox phase runs and renames visible DEV wording to LAB.
(() => {
  if (!window.CometLabSuite) return;
  const proto = GameScene.prototype;
  const baseShowDevLab = proto.showDevLab;
  const baseShowPhaseCompleteCard = proto.showPhaseCompleteCard;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;
  const baseShowPhase4DevReward = proto.showPhase4DevReward;

  function walk(node, visitor) {
    if (!node) return;
    visitor(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, visitor));
  }

  function replaceText(scene, from, to) {
    walk(scene.ui, child => {
      if (typeof child?.text === 'string' && child.text === from && typeof child.setText === 'function') child.setText(to);
    });
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

  // Rebuild the collision LAB when a selector crosses an orbital-eligible tier so the +/- controls
  // appear/disappear immediately rather than requiring the user to leave and re-enter the tab.
  proto.showDevLab = function () {
    const result = baseShowDevLab.call(this);
    if (this.state === 'DEV_LAB') {
      [this._devSelectA, this._devSelectB].forEach(select => {
        if (!select || select._labEligibilityRefreshAttached) return;
        select._labEligibilityRefreshAttached = true;
        select.addEventListener('change', () => {
          this.time.delayedCall(0, () => {
            if (this.state === 'DEV_LAB') this.showDevLab();
          });
        });
      });
    }
    return result;
  };

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

  if (typeof baseShowPhaseCompleteCard === 'function') {
    proto.showPhaseCompleteCard = function (phase) {
      const result = baseShowPhaseCompleteCard.call(this, phase);
      renameDevToLab(this);
      if (this._labSandboxRun && phase === 4) {
        replaceText(this, 'UNLOCK LAB MODE', 'FINISH PHS4 TEST');
        replaceText(this, 'UNLOCK DEV MODE', 'FINISH PHS4 TEST');
      }
      return result;
    };
  }

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
    refreshesOrbitalControlsOnTierChange: true,
    visibleName: 'LAB MODE'
  });
})();
