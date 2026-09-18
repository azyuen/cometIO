// Explicit high-score consent v1.
// No leaderboard entry is written unless the player explicitly confirms it.
// This blocks legacy QUICK RESTART / other automatic saveScoreAs() paths from silently changing top 5.
(() => {
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseSaveScoreAs = proto.saveScoreAs;
  const baseDrawResult = proto.drawResult;

  if (typeof baseSaveScoreAs !== 'function' || typeof baseDrawResult !== 'function') return;

  function qualifies(scene) {
    try { return typeof scene.qualifies === 'function' && scene.qualifies(); }
    catch (_) { return false; }
  }

  function askToRecord(scene) {
    if (!qualifies(scene)) return false;
    if (scene._highScoreRecordedThisRun) return true;

    const yes = window.confirm('New high score. Record it?');
    if (!yes) {
      scene._highScoreDeclinedThisRun = true;
      return false;
    }

    const entered = window.prompt('Enter your name:', 'PLAYER');
    if (entered === null) {
      scene._highScoreDeclinedThisRun = true;
      return false;
    }

    const name = String(entered || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER';
    scene._highScoreWriteApproved = true;
    const saved = baseSaveScoreAs.call(scene, name);
    scene._highScoreWriteApproved = false;
    scene._highScoreRecordedThisRun = true;
    scene._highScoreDeclinedThisRun = false;
    return saved !== false;
  }

  // Gate the actual writer. Legacy code can call saveScoreAs(), but it cannot write unless
  // askToRecord() has granted one-use approval.
  proto.saveScoreAs = function(name) {
    if (this._highScoreWriteApproved !== true) return false;
    this._highScoreWriteApproved = false;
    return baseSaveScoreAs.call(this, name);
  };

  proto.recordScore = function() {
    return askToRecord(this);
  };

  // Reset consent state for a genuinely new run.
  const baseResetRun = proto.resetRun;
  if (typeof baseResetRun === 'function') {
    proto.resetRun = function(...args) {
      this._highScoreWriteApproved = false;
      this._highScoreRecordedThisRun = false;
      this._highScoreDeclinedThisRun = false;
      return baseResetRun.apply(this, args);
    };
  }

  // Home-v4 renders legacy high-score game-over buttons. Replace only those buttons after the
  // normal result UI has been built, so the rest of the screen stays unchanged.
  proto.drawResult = function(res) {
    const result = baseDrawResult.call(this, res);

    if (!res?.survived && qualifies(this)) {
      // Remove only the legacy interactive/text elements sitting in the bottom game-over button area.
      const bottom = this.Y ? this.Y(680) : 680;
      const remove = (this.ui?.list || []).filter(node => {
        const y = Number(node?.y);
        if (!Number.isFinite(y) || y < bottom) return false;
        if (node?.type === 'Container') return true;
        return false;
      });
      remove.forEach(node => {
        try { this.ui.remove(node, false); } catch (_) {}
        try { node.destroy(true); } catch (_) {}
      });

      this.wideButton(W / 2, this.Y(705), 330, 48, 'RECORD HIGH SCORE', C.orange, () => {
        if (askToRecord(this)) this.showScores('gameover');
      });
      this.wideButton(W / 2, this.Y(767), 330, 48, 'RESTART WITHOUT RECORDING', C.cyan, () => {
        this._highScoreDeclinedThisRun = true;
        this.resetRun();
      });
    }

    return result;
  };

  window.CometHighScoreConfirmV1 = Object.freeze({
    enabled: true,
    version: 1,
    explicitConsentRequired: true,
    automaticWritesBlocked: true,
    prompt: 'New high score. Record it?'
  });
})();