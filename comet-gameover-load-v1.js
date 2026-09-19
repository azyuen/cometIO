// Game-over checkpoint recovery v1.
// Final loss-screen authority: a protected manual checkpoint can always be reloaded directly after
// death, including on Top-5 result screens rebuilt by later high-score wrappers.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawResult = proto.drawResult;
  const baseResolve = proto.resolve;

  const ACTION_LABELS = new Set([
    'ENTER NAME','ENTER TOP 5 SCORE','QUICK RESTART','RESTART','RESTART RUN',
    'RECORD HIGH SCORE','RESTART WITHOUT RECORDING','LOAD LAST SAVE','LOAD SAVE','NEW RUN'
  ]);

  function textOf(node) {
    return typeof node?.text === 'string' ? node.text.trim() : '';
  }

  function buttonLabel(container) {
    if (!Array.isArray(container?.list)) return null;
    for (const child of container.list) {
      const text = textOf(child);
      if (ACTION_LABELS.has(text)) return text;
    }
    return null;
  }

  function removeGameOverButtons(scene) {
    for (const node of [...(scene.ui?.list || [])]) {
      if (!buttonLabel(node)) continue;
      try { scene.ui.remove(node, false); } catch (_) {}
      try { node.destroy(true); } catch (_) {}
    }
  }

  function clearRecoveryTransientState(scene) {
    // Loading after death must not inherit presentation/sandbox state from the failed timeline.
    scene._labSandboxRun = false;
    scene._labSandboxPhase = null;
    scene._devModeActive = false;
    scene._devPhase4Test = false;
    scene._labExperimentRunning = false;
    scene._labExperimentResult = false;
    scene._activePhaseCard = null;
    scene._activePhaseStart = null;
    scene._pendingPhaseStartIntro = 0;
    scene._phaseCardQueue = [];
    scene._p3Trajectory = 0;
    scene._p3OrbitalAssistCount = 0;
    scene._p3OrbitalAssist = false;
    scene.pending = null;
  }

  function loadLastSave(scene) {
    if (!window.CometCheckpoint?.exists?.()) {
      scene.toast?.('NO MANUAL CHECKPOINT', C.orange);
      return false;
    }

    scene.tweens?.killAll?.();
    clearRecoveryTransientState(scene);

    // Game-over recovery deliberately bypasses the long generic load-wrapper chain. The protected
    // checkpoint owns the saved timeline and now restores collection / Phase-4 state directly.
    const info = window.CometCheckpoint?.describe?.();
    const ok = window.CometCheckpoint?.loadInto?.(scene);
    if (ok !== true) return false;

    scene.runActive = true;

    // Fail loudly rather than leaving the death screen looking inert if a future wrapper regresses
    // recovery. The direct loader should always land on the saved tier in a live encounter state.
    if (info && Number(scene.tierIndex) !== Number(info.tierIndex)) {
      scene.toast?.('LOAD VERIFY FAILED', C.red);
      return false;
    }
    return true;
  }

  function restartWithoutRecording(scene) {
    scene._highScoreDeclinedThisRun = true;
    scene._highScoreWriteApproved = false;
    scene.resetRun();
  }

  function recordHighScore(scene) {
    if (typeof scene.qualifies !== 'function' || !scene.qualifies()) return false;
    const recorded = scene.recordScore?.();
    if (recorded === false) return false;
    scene.showScores?.('gameover');
    return true;
  }

  function rebuildActions(scene) {
    removeGameOverButtons(scene);

    const topFive = typeof scene.qualifies === 'function' && scene.qualifies();
    const hasCheckpoint = !!window.CometCheckpoint?.exists?.();

    // One consistent loss menu in every phase. RECORD HIGH SCORE only exists when the run
    // currently qualifies; the other two choices are always visible.
    if (topFive) {
      scene.wideButton(W / 2, scene.Y(684), 330, 44, 'RECORD HIGH SCORE', C.orange, () => recordHighScore(scene));
      scene.wideButton(W / 2, scene.Y(738), 330, 44, 'RESTART WITHOUT RECORDING', C.red, () => restartWithoutRecording(scene));
      scene.wideButton(W / 2, scene.Y(792), 330, 44, 'LOAD LAST SAVE', hasCheckpoint ? C.blue : C.muted, () => loadLastSave(scene));
    } else {
      scene.wideButton(W / 2, scene.Y(716), 330, 48, 'RESTART WITHOUT RECORDING', C.red, () => restartWithoutRecording(scene));
      scene.wideButton(W / 2, scene.Y(776), 330, 48, 'LOAD LAST SAVE', hasCheckpoint ? C.blue : C.muted, () => loadLastSave(scene));
    }
  }

  proto.drawResult = function(res) {
    const out = baseDrawResult.call(this, res);
    if (res?.survived === false && !this._labSandboxRun) rebuildActions(this);
    return out;
  };

  // Phase 4 fatal CAPTURE has a bespoke screen and does not call drawResult(). Catch that route
  // after its resolver returns so it receives the exact same loss actions as Phases 1–3.
  proto.resolve = function(...args) {
    const out = baseResolve.apply(this, args);
    if (this.state === 'P4_GAME_OVER' && !this._labSandboxRun) rebuildActions(this);
    return out;
  };

  window.CometGameOverLoadV1 = Object.freeze({
    enabled:true,
    protectedCheckpointOnly:true,
    directProtectedRestore:true,
    topFiveCompatible:true,
    universalLossMenu:true,
    catchesPhase4CustomGameOver:true,
    actions:['RECORD HIGH SCORE','RESTART WITHOUT RECORDING','LOAD LAST SAVE'],
    restoresCollectionState:true,
    clearsTransientDeathState:true
  });
})();