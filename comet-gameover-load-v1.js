// Game-over checkpoint recovery v1.
// Final loss-screen authority: a protected manual checkpoint can always be reloaded directly after
// death, including on Top-5 result screens rebuilt by later high-score wrappers.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseDrawResult = proto.drawResult;

  const ACTION_LABELS = new Set([
    'ENTER NAME','QUICK RESTART','RESTART','RECORD HIGH SCORE','RESTART WITHOUT RECORDING',
    'LOAD LAST SAVE','LOAD SAVE','NEW RUN'
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

  function rebuildActions(scene) {
    removeGameOverButtons(scene);

    const hasCheckpoint = !!window.CometCheckpoint?.exists?.();
    const topFive = typeof scene.qualifies === 'function' && scene.qualifies();

    if (topFive) {
      scene.wideButton(W / 2, scene.Y(705), 330, 48, 'RECORD HIGH SCORE', C.orange, () => {
        const recorded = scene.recordScore?.();
        if (recorded !== false) scene.showScores?.('gameover');
      });

      if (hasCheckpoint) {
        scene.wideButton(105, scene.Y(767), 180, 48, 'LOAD LAST SAVE', C.blue, () => loadLastSave(scene));
        scene.wideButton(315, scene.Y(767), 180, 48, 'RESTART', C.cyan, () => {
          scene._highScoreDeclinedThisRun = true;
          scene.resetRun();
        });
      } else {
        scene.wideButton(W / 2, scene.Y(767), 330, 48, 'RESTART WITHOUT RECORDING', C.cyan, () => {
          scene._highScoreDeclinedThisRun = true;
          scene.resetRun();
        });
      }
      return;
    }

    if (hasCheckpoint) {
      scene.wideButton(105, scene.Y(735), 180, 52, 'LOAD LAST SAVE', C.blue, () => loadLastSave(scene));
      scene.wideButton(315, scene.Y(735), 180, 52, 'RESTART', C.red, () => scene.resetRun());
    } else {
      scene.wideButton(W / 2, scene.Y(735), 330, 52, 'RESTART', C.red, () => scene.resetRun());
    }
  }

  proto.drawResult = function(res) {
    const out = baseDrawResult.call(this, res);
    if (res?.survived === false) rebuildActions(this);
    return out;
  };

  window.CometGameOverLoadV1 = Object.freeze({
    enabled:true,
    protectedCheckpointOnly:true,
    directProtectedRestore:true,
    topFiveCompatible:true,
    restoresCollectionState:true,
    clearsTransientDeathState:true
  });
})();