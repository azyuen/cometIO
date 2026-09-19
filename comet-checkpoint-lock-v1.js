// Final manual-checkpoint authority.
// Manual SAVE behaves like a reusable checkpoint/life insurance:
// - SAVE writes a protected primary + backup and verifies the write.
// - death/restart/Home/app relaunch never delete it.
// - LOAD is read-only and can be used repeatedly until SAVE deliberately replaces it.
(() => {
  const PROTECTED_CHECKPOINT_KEY = 'cometio-protected-checkpoint-v2';
  const PROTECTED_BACKUP_KEY = 'cometio-protected-checkpoint-v2-backup';
  const LEGACY_MANUAL_KEY = 'cometio-manual-checkpoint-v1';
  const LEGACY_AUTO_KEY = `${SAVE_KEY}:autosave-v2`;
  const SAVE_COST = 500;
  const UNIQUE_COLLECTION_BONUS = 200;
  const baseShowHome = GameScene.prototype.showHome;

  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const whole = value => Math.max(0, Math.floor(n(value)));

  function validCollection(ids) {
    const seen = new Set(), result = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (!COMET_COLLECTIBLE_BY_ID?.[id] || seen.has(id)) continue;
      seen.add(id); result.push(id);
    }
    return result;
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) { return null; }
  }

  function usable(data) {
    return !!data && Number.isInteger(data.tierIndex) && data.tierIndex >= 0 && data.tierIndex < TIERS.length;
  }

  function readProtected() {
    try {
      const primary = parse(localStorage.getItem(PROTECTED_CHECKPOINT_KEY));
      if (usable(primary)) return primary;

      const backup = parse(localStorage.getItem(PROTECTED_BACKUP_KEY));
      if (usable(backup)) {
        try { localStorage.setItem(PROTECTED_CHECKPOINT_KEY, JSON.stringify(backup)); } catch (e) {}
        return backup;
      }

      // One-time migration from older explicit manual saves. Never migrate an autosave.
      const oldManual = parse(localStorage.getItem(LEGACY_MANUAL_KEY)) || parse(localStorage.getItem(SAVE_KEY));
      if (!usable(oldManual) || oldManual.saveType === 'auto') return null;
      const json = JSON.stringify(oldManual);
      localStorage.setItem(PROTECTED_CHECKPOINT_KEY, json);
      localStorage.setItem(PROTECTED_BACKUP_KEY, json);
      return oldManual;
    } catch (e) { return null; }
  }

  function payload(scene) {
    const collection = validCollection(scene.collectedIdentityIds);
    const exactEncounter = scene.state === 'APPROACH' && !!scene.other;
    return {
      version: 13,
      saveType: 'manual-protected',
      checkpointId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      manualLoads: whole(scene.manualLoads),
      scorePenalty: whole(scene.scorePenalty),
      collectedIdentityIds: collection,
      collectionBonusScore: collection.length * UNIQUE_COLLECTION_BONUS,
      orbitalCount: whole(scene.orbitalCount),
      orbitalProgress: whole(scene.orbitalProgress),
      orbitalsUnlocked: scene.orbitalsUnlocked === true,
      universeCount: whole(scene.universeCount),
      systemCaptures: whole(scene.systemCaptures),
      finaleMergeCount: whole(scene.finaleMergeCount)
    };
  }

  function writeProtected(scene) {
    const data = payload(scene), json = JSON.stringify(data);
    localStorage.setItem(PROTECTED_CHECKPOINT_KEY, json);
    localStorage.setItem(PROTECTED_BACKUP_KEY, json);

    // Compatibility mirrors only. LOAD never depends on them.
    localStorage.setItem(LEGACY_MANUAL_KEY, json);
    localStorage.setItem(SAVE_KEY, json);
    try { localStorage.removeItem(LEGACY_AUTO_KEY); } catch (e) {}

    // Immediate read-back verification catches private-browsing/storage failures instead of showing
    // a false "saved" message.
    const verify = parse(localStorage.getItem(PROTECTED_CHECKPOINT_KEY));
    if (!verify || verify.checkpointId !== data.checkpointId || verify.tierIndex !== data.tierIndex || verify.encounters !== data.encounters) {
      throw new Error('checkpoint verification failed');
    }
    return data;
  }

  function clearTemporaryModes(scene) {
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
  }

  function restore(scene, data) {
    if (!usable(data)) throw new Error('invalid checkpoint tier');
    clearTemporaryModes(scene);

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
      pending: null,
      runActive: true
    });

    if (!scene.player) scene.setPlayer(true);
    scene.craters = scene.orbitalCount;

    // A checkpoint is only written during APPROACH. If it is already at Galaxy scale, the Phase 4
    // intro necessarily happened before the save; earlier tiers must not inherit a later run's flag.
    const galaxyTier = Number(window.CometPhase4?.galaxyTier ?? Infinity);
    scene.phase4BirthShown = Number.isFinite(galaxyTier) && scene.tierIndex >= galaxyTier;

    if (scene.player && scene.tierIndex >= galaxyTier) {
      scene.player.phase4CaptureCount = whole(scene.systemCaptures);
    }
  }

  function checkpointToast(scene, text, color) {
    if (!scene?.add || !scene?.ui) return;
    const c = scene.add.container(W / 2, scene.Y(174));
    const g = scene.add.graphics(), width = 356, height = 38;
    g.fillStyle(C.panel, .99).fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    g.lineStyle(1.5, color, .95).strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    const t = scene.add.text(0, 0, text, {
      fontFamily: FONT, fontSize: '8.8px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    c.add([g, t]); scene.ui.add(c);
    scene.tweens.add({ targets: c, alpha: 0, delay: 1900, duration: 500, onComplete: () => c.destroy() });
  }

  function loadProtected(scene) {
    try {
      const data = readProtected();
      if (!data) {
        checkpointToast(scene, 'NO MANUAL CHECKPOINT', C.orange);
        return false;
      }

      scene.tweens?.killAll?.();
      restore(scene, data);

      if (data.resumeEncounter && data.other) {
        scene.other = { ...data.other };
        scene.state = 'APPROACH';
        scene.drawEncounter();
      } else {
        scene.other = null;
        scene.state = 'APPROACH';
        scene.startEncounter();
      }

      checkpointToast(scene, `LOADED SAVE ${whole(data.manualSaves)} • ROUND ${whole(data.encounters) + 1}`, C.blue);
      return true;
    } catch (e) {
      checkpointToast(scene, 'CHECKPOINT LOAD FAILED', C.red);
      return false;
    }
  }

  GameScene.prototype.save = function (silent = false) {
    if (silent) return true; // no autosaves can replace the player's checkpoint
    if (this._labSandboxRun) {
      checkpointToast(this, 'LAB • SAVE DISABLED', C.orange);
      return false;
    }

    const before = { manualSaves: whole(this.manualSaves), scorePenalty: whole(this.scorePenalty), score: n(this.score) };
    this.manualSaves = before.manualSaves + 1;
    this.scorePenalty = before.scorePenalty + SAVE_COST;
    this.score = before.score - SAVE_COST;

    try {
      const saved = writeProtected(this);
      checkpointToast(this, `SAVED • ${TIERS[saved.tierIndex]?.name || 'TIER'} • ROUND ${saved.encounters + 1}`, C.green);
      return true;
    } catch (e) {
      this.manualSaves = before.manualSaves;
      this.scorePenalty = before.scorePenalty;
      this.score = before.score;
      checkpointToast(this, 'SAVE FAILED • STORAGE ERROR', C.red);
      return false;
    }
  };

  GameScene.prototype.load = function () {
    if (this._labSandboxRun) {
      checkpointToast(this, 'LAB • LOAD DISABLED', C.orange);
      return false;
    }
    return loadProtected(this);
  };

  // Losing/restarting/starting a new run can only remove obsolete autosave debris.
  GameScene.prototype.clearSave = function () {
    try { localStorage.removeItem(LEGACY_AUTO_KEY); } catch (e) {}
    return true;
  };

  // Add visible proof of the checkpoint to Home. This is intentionally information only; the
  // existing LOAD SAVE button still calls this final load() dynamically.
  GameScene.prototype.showHome = function () {
    const result = baseShowHome.call(this);
    const data = readProtected();
    if (data && this.state === 'HOME') {
      const tier = TIERS[data.tierIndex]?.name || `TIER ${data.tierIndex + 1}`;
      const target = data.other?.realName || data.other?.name || null;
      const text = target
        ? `CHECKPOINT • ${tier} • R${whole(data.encounters) + 1} • vs ${target}`
        : `CHECKPOINT • ${tier} • R${whole(data.encounters) + 1}`;
      this.addText(W / 2, 530, text, 7.3, C.green, { ox: .5, bold: true, width: 390, align: 'center' });
    } else if (this.state === 'HOME') {
      this.addText(W / 2, 530, 'NO MANUAL CHECKPOINT', 7.3, C.muted, { ox: .5, bold: true });
    }
    return result;
  };

  GameScene.prototype.hasManualCheckpoint = function () { return !!readProtected(); };

  window.CometCheckpoint = Object.freeze({
    key: PROTECTED_CHECKPOINT_KEY,
    backupKey: PROTECTED_BACKUP_KEY,
    saveCost: SAVE_COST,
    exists() { return !!readProtected(); },
    describe() {
      const d = readProtected();
      return d ? { tierIndex: d.tierIndex, encounters: d.encounters, savedAt: d.savedAt, target: d.other?.realName || d.other?.name || null } : null;
    }
  });
})();
