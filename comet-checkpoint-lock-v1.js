// Final manual-checkpoint authority.
// The checkpoint is intentionally stored under a private v2 key that no legacy autosave/game-over
// layer knows about. It survives death, restart, Home navigation and app relaunch until the player
// deliberately presses SAVE again.
(() => {
  const PROTECTED_CHECKPOINT_KEY = 'cometio-protected-checkpoint-v2';
  const LEGACY_MANUAL_KEY = 'cometio-manual-checkpoint-v1';
  const LEGACY_AUTO_KEY = `${SAVE_KEY}:autosave-v2`;
  const SAVE_COST = 500;
  const UNIQUE_COLLECTION_BONUS = 200;

  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const whole = value => Math.max(0, Math.floor(n(value)));

  function validCollection(ids) {
    const seen = new Set();
    const result = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (!COMET_COLLECTIBLE_BY_ID?.[id] || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;
    }
  }

  function protectedCheckpoint() {
    try {
      const protectedData = parse(localStorage.getItem(PROTECTED_CHECKPOINT_KEY));
      if (protectedData) return protectedData;

      // One-time migration from the previous explicit manual checkpoint. Never migrate autosaves.
      const oldManual = parse(localStorage.getItem(LEGACY_MANUAL_KEY)) || parse(localStorage.getItem(SAVE_KEY));
      if (!oldManual || oldManual.saveType === 'auto') return null;
      localStorage.setItem(PROTECTED_CHECKPOINT_KEY, JSON.stringify(oldManual));
      return oldManual;
    } catch (e) {
      return null;
    }
  }

  function payload(scene) {
    const collection = validCollection(scene.collectedIdentityIds);
    const exactEncounter = scene.state === 'APPROACH' && !!scene.other;
    return {
      version: 12,
      saveType: 'manual-protected',
      savedAt: Date.now(),

      tierIndex: whole(scene.tierIndex),
      growth: n(scene.growth),
      craters: whole(scene.craters),
      encounters: whole(scene.encounters),
      absorbs: whole(scene.absorbs),
      score: n(scene.score),
      regionId: scene.regionId,
      lastRegionPromptEncounter: Number.isFinite(scene.lastRegionPromptEncounter) ? scene.lastRegionPromptEncounter : -1,
      runStartedElapsedMs: Math.max(0, Date.now() - n(scene.runStarted)),

      player: scene.player ? { ...scene.player } : null,
      other: exactEncounter ? { ...scene.other } : null,
      resumeEncounter: exactEncounter,
      actionHistory: Array.isArray(scene.actionHistory) ? [...scene.actionHistory] : [],

      manualSaves: whole(scene.manualSaves),
      manualLoads: whole(scene.manualLoads), // compatibility only; LOAD itself is free/read-only
      scorePenalty: whole(scene.scorePenalty),

      collectedIdentityIds: collection,
      collectionBonusScore: collection.length * UNIQUE_COLLECTION_BONUS,

      orbitalCount: whole(scene.orbitalCount),
      orbitalProgress: whole(scene.orbitalProgress),
      orbitalsUnlocked: scene.orbitalsUnlocked === true,

      // Phase 4 state. Harmless zeros during earlier phases.
      universeCount: whole(scene.universeCount),
      systemCaptures: whole(scene.systemCaptures),
      finaleMergeCount: whole(scene.finaleMergeCount)
    };
  }

  function writeProtected(scene) {
    const data = payload(scene);
    const json = JSON.stringify(data);

    // This key is the authority. Mirrors exist only so older Collection/Phase 4 readers continue to
    // display compatible information. LOAD never depends on either mirror.
    localStorage.setItem(PROTECTED_CHECKPOINT_KEY, json);
    localStorage.setItem(LEGACY_MANUAL_KEY, json);
    localStorage.setItem(SAVE_KEY, json);
    try { localStorage.removeItem(LEGACY_AUTO_KEY); } catch (e) {}
    return data;
  }

  function restore(scene, data) {
    if (!Number.isInteger(data?.tierIndex) || data.tierIndex < 0 || data.tierIndex >= TIERS.length) {
      throw new Error('invalid checkpoint tier');
    }

    const collection = validCollection(data.collectedIdentityIds);
    Object.assign(scene, {
      tierIndex: data.tierIndex,
      growth: n(data.growth),
      craters: whole(data.craters),
      encounters: whole(data.encounters),
      absorbs: whole(data.absorbs),
      score: n(data.score),
      regionId: REGIONS.some(region => region.id === data.regionId) ? data.regionId : 'outer-heliosphere',
      lastRegionPromptEncounter: Number.isFinite(data.lastRegionPromptEncounter) ? data.lastRegionPromptEncounter : -1,
      runStarted: Date.now() - Math.max(0, n(data.runStartedElapsedMs ?? data.elapsedMs)),
      player: data.player ? { ...data.player } : null,
      actionHistory: Array.isArray(data.actionHistory) ? [...data.actionHistory] : [],
      manualSaves: whole(data.manualSaves),
      manualLoads: whole(data.manualLoads),
      scorePenalty: whole(data.scorePenalty),
      collectedIdentityIds: collection,
      collectionBonusScore: collection.length * UNIQUE_COLLECTION_BONUS,
      orbitalCount: whole(data.orbitalCount),
      orbitalProgress: whole(data.orbitalProgress) % 3,
      orbitalsUnlocked: data.orbitalsUnlocked === true || data.tierIndex >= 7,
      universeCount: whole(data.universeCount),
      systemCaptures: whole(data.systemCaptures),
      finaleMergeCount: whole(data.finaleMergeCount),
      pending: null
    });

    if (!scene.player) scene.setPlayer(true);
    scene.craters = scene.orbitalCount; // legacy HUD/save alias
    if (scene.player && scene.tierIndex >= (window.CometPhase4?.firstTier ?? Infinity)) {
      scene.player.phase4CaptureCount = whole(scene.systemCaptures);
    }
  }

  function checkpointToast(scene, text, color) {
    if (typeof scene.toast === 'function') scene.toast(text, color);
  }

  // Final SAVE authority. Sandbox/LAB phase runs remain isolated.
  GameScene.prototype.save = function (silent = false) {
    if (silent) return true; // absolutely no autosaves
    if (this._labSandboxRun || this._devModeActive) {
      checkpointToast(this, 'LAB • SAVE DISABLED', C.orange);
      return false;
    }

    const before = {
      manualSaves: whole(this.manualSaves),
      scorePenalty: whole(this.scorePenalty),
      score: n(this.score)
    };

    this.manualSaves = before.manualSaves + 1;
    this.scorePenalty = before.scorePenalty + SAVE_COST;
    this.score = before.score - SAVE_COST;

    try {
      writeProtected(this);
      checkpointToast(this, `CHECKPOINT SAVED • SAVE ${this.manualSaves} • -${SAVE_COST}`, C.green);
      return true;
    } catch (e) {
      this.manualSaves = before.manualSaves;
      this.scorePenalty = before.scorePenalty;
      this.score = before.score;
      checkpointToast(this, 'SAVE FAILED', C.red);
      return false;
    }
  };

  // Final LOAD authority. It is deliberately read-only: loading does not mutate/re-date/rewrite the
  // checkpoint, so the same pre-death checkpoint can be reused repeatedly until SAVE is pressed.
  GameScene.prototype.load = function () {
    if (this._labSandboxRun) {
      checkpointToast(this, 'LAB • LOAD DISABLED', C.orange);
      return false;
    }

    try {
      const data = protectedCheckpoint();
      if (!data) {
        checkpointToast(this, 'NO MANUAL CHECKPOINT', C.orange);
        return false;
      }

      this.tweens?.killAll?.();
      restore(this, data);
      this.runActive = true;

      if (data.resumeEncounter && data.other) {
        this.other = { ...data.other };
        this.drawEncounter();
      } else {
        this.other = null;
        this.startEncounter();
      }

      checkpointToast(this, `CHECKPOINT LOADED • SAVE ${whole(data.manualSaves)}`, C.blue);
      return true;
    } catch (e) {
      checkpointToast(this, 'CHECKPOINT CORRUPT', C.red);
      return false;
    }
  };

  // Losing, restarting, starting another run or navigating Home must NEVER touch the protected slot.
  // Legacy autosave debris may be removed safely.
  GameScene.prototype.clearSave = function () {
    try { localStorage.removeItem(LEGACY_AUTO_KEY); } catch (e) {}
    return true;
  };

  GameScene.prototype.hasManualCheckpoint = function () {
    return !!protectedCheckpoint();
  };

  window.CometCheckpoint = Object.freeze({
    key: PROTECTED_CHECKPOINT_KEY,
    saveCost: SAVE_COST,
    exists() { return !!protectedCheckpoint(); }
  });
})();
