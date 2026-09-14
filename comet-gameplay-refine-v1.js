// Gameplay refinement pass:
// - Manual save is the only persistent checkpoint; silent/autosave calls are deliberate no-ops.
// - Starting/restarting/dying never deletes the manual checkpoint.
// - Loading is free; the score cost is attached to each manual SAVE and the save count persists.
// - Save confirmation is wider and stays visible longer.
// - High scores show SAVES inline with TOTAL/A/D/V instead of a separate saves/loads/penalty row.
// - Result comparison sprites are a little larger.
(() => {
  const MANUAL_SAVE_PENALTY = 10;
  const LEGACY_AUTO_SAVE_KEY = `${SAVE_KEY}:autosave-v2`;
  const UNIQUE_COLLECTION_BONUS = 200;

  const baseShowScores = GameScene.prototype.showScores;
  const baseDrawResult = GameScene.prototype.drawResult;

  function numberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function integerOrZero(value) {
    return Math.max(0, Math.floor(numberOrZero(value)));
  }

  function validCollectionIds(ids) {
    const seen = new Set();
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (!COMET_COLLECTIBLE_BY_ID?.[id] || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function readManualSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;
    }
  }

  function writeManualSave(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  function checkpointPayload(scene) {
    const ids = validCollectionIds(scene.collectedIdentityIds);
    const canResumeEncounter = scene.state === 'APPROACH' && !!scene.other;
    return {
      version: 8,
      savedAt: Date.now(),
      saveType: 'manual',
      tierIndex: scene.tierIndex,
      growth: scene.growth,
      craters: scene.craters,
      encounters: scene.encounters,
      absorbs: scene.absorbs,
      score: scene.score,
      regionId: scene.regionId,
      lastRegionPromptEncounter: scene.lastRegionPromptEncounter,
      player: scene.player,
      other: canResumeEncounter ? scene.other : null,
      resumeEncounter: canResumeEncounter,
      actionHistory: Array.isArray(scene.actionHistory) ? [...scene.actionHistory] : [],
      elapsedMs: Math.max(0, Date.now() - numberOrZero(scene.runStarted)),
      manualSaves: integerOrZero(scene.manualSaves),
      // Legacy fields stay readable for old leaderboard/save code, but LOAD no longer increments them.
      manualLoads: integerOrZero(scene.manualLoads),
      scorePenalty: integerOrZero(scene.scorePenalty),
      collectedIdentityIds: ids,
      collectionBonusScore: ids.length * UNIQUE_COLLECTION_BONUS
    };
  }

  function restoreCheckpoint(scene, data) {
    if (!Number.isInteger(data?.tierIndex) || data.tierIndex < 0 || data.tierIndex >= TIERS.length) {
      throw new Error('invalid tier');
    }

    const ids = validCollectionIds(data.collectedIdentityIds);
    Object.assign(scene, {
      tierIndex: data.tierIndex,
      growth: numberOrZero(data.growth),
      craters: numberOrZero(data.craters),
      encounters: numberOrZero(data.encounters),
      absorbs: numberOrZero(data.absorbs),
      score: numberOrZero(data.score),
      regionId: REGIONS.some(r => r.id === data.regionId) ? data.regionId : 'outer-heliosphere',
      lastRegionPromptEncounter: Number.isFinite(data.lastRegionPromptEncounter) ? data.lastRegionPromptEncounter : -1,
      actionHistory: Array.isArray(data.actionHistory) ? [...data.actionHistory] : [],
      runStarted: Date.now() - Math.max(0, numberOrZero(data.elapsedMs)),
      player: data.player || null,
      collectedIdentityIds: ids,
      collectionBonusScore: ids.length * UNIQUE_COLLECTION_BONUS,
      manualSaves: integerOrZero(data.manualSaves),
      manualLoads: integerOrZero(data.manualLoads),
      scorePenalty: integerOrZero(data.scorePenalty)
    });

    if (!scene.player) scene.setPlayer(true);
  }

  function saveToast(scene, text, color) {
    const c = scene.add.container(W / 2, scene.Y(174));
    const g = scene.add.graphics();
    const width = 334;
    const height = 36;
    g.fillStyle(C.panel, .99).fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    g.lineStyle(1.5, color, .95).strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    const t = scene.add.text(0, 0, text, {
      fontFamily: FONT,
      fontSize: '9px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    c.add([g, t]);
    scene.ui.add(c);
    scene.tweens.add({
      targets: c,
      alpha: 0,
      delay: 1750,
      duration: 500,
      onComplete: () => c.destroy()
    });
  }

  // Remove any stale autosave left by the previous implementation. From this point onward there is
  // exactly one persistent slot and it changes only when the player explicitly presses SAVE.
  try { localStorage.removeItem(LEGACY_AUTO_SAVE_KEY); } catch (e) {}

  GameScene.prototype.save = function (silent = false) {
    // Existing gameplay code still calls save(true) in a few places. Keeping this as a no-op means
    // those calls cannot overwrite, mutate, or create a checkpoint.
    if (silent) return true;

    const previous = {
      manualSaves: integerOrZero(this.manualSaves),
      scorePenalty: integerOrZero(this.scorePenalty),
      score: numberOrZero(this.score)
    };

    this.manualSaves = previous.manualSaves + 1;
    this.scorePenalty = previous.scorePenalty + MANUAL_SAVE_PENALTY;
    this.score = previous.score - MANUAL_SAVE_PENALTY;

    try {
      writeManualSave(checkpointPayload(this));
      saveToast(
        this,
        `CHECKPOINT SAVED • SAVE ${this.manualSaves} • SCORE -${MANUAL_SAVE_PENALTY}`,
        C.green
      );
      return true;
    } catch (e) {
      this.manualSaves = previous.manualSaves;
      this.scorePenalty = previous.scorePenalty;
      this.score = previous.score;
      saveToast(this, 'SAVE FAILED', C.red);
      return false;
    }
  };

  GameScene.prototype.load = function () {
    try {
      const data = readManualSave();
      if (!data) {
        this.toast('NO SAVED RUN', C.orange);
        return false;
      }

      restoreCheckpoint(this, data);
      this.runActive = true;

      if (data.resumeEncounter && data.other) {
        this.other = data.other;
        this.drawEncounter();
      } else {
        this.startEncounter();
      }

      // Deliberately do NOT rewrite SAVE_KEY here. Loading is a read-only rollback to the manual
      // checkpoint, so it remains identical and reusable until the player explicitly saves again.
      this.toast('CHECKPOINT LOADED', C.blue);
      return true;
    } catch (e) {
      this.toast('SAVE CORRUPT', C.red);
      return false;
    }
  };

  // Home's START NEW RUN and game-over code both call clearSave(). They should clear only the
  // obsolete autosave slot; the player's explicit checkpoint survives until the next manual SAVE.
  GameScene.prototype.clearSave = function () {
    try { localStorage.removeItem(LEGACY_AUTO_SAVE_KEY); } catch (e) {}
  };

  GameScene.prototype.saveLoadScoreRules = function () {
    return { savePenalty: MANUAL_SAVE_PENALTY, loadPenalty: 0 };
  };

  GameScene.prototype.showScores = function (returnTo = 'home') {
    const result = baseShowScores.call(this, returnTo);
    const scores = this.getScores();

    // Cover the old TOTAL line plus the obsolete SAVES/LOADS/PENALTY line, then replace both with
    // one concise line: TOTAL / A / D / V / SAVES.
    scores.forEach((v, i) => {
      const y = this.Y(132 + i * 123);
      const history = Array.isArray(v.streak) ? v.streak : [];
      const counts = v.actions || {
        total: history.length,
        absorbs: history.filter(x => x === 'ABSORB').length,
        deflects: history.filter(x => x === 'DEFLECT').length,
        avoids: history.filter(x => x === 'AVOID').length
      };
      const saves = integerOrZero(v.saves);

      const cover = this.add.graphics();
      cover.fillStyle(C.panel, 1).fillRect(72, y + 23, 320, 38);
      this.ui.add(cover);
      this.addText(
        77,
        y + 34,
        `TOTAL ${integerOrZero(counts.total)} • A ${integerOrZero(counts.absorbs)} • D ${integerOrZero(counts.deflects)} • V ${integerOrZero(counts.avoids)} • SAVES ${saves}`,
        6.9,
        C.muted,
        { bold: true, width: 310 }
      );
    });

    return result;
  };

  GameScene.prototype.drawResult = function (res) {
    const result = baseDrawResult.call(this, res);

    // Home-v4 creates the comparison bodies at x=95 and x=325 with a 54px diameter. Increase them
    // to 72px while preserving the sprite renderer's own LOD/display-size rules.
    const resultBodies = (this.ui?.list || []).filter(child =>
      child?.cometVisual && (Math.abs((child.x || 0) - 95) < 2 || Math.abs((child.x || 0) - 325) < 2)
    );

    resultBodies.forEach(body => {
      if (!body.cometVisual?.fallback && typeof body.setVisualDisplayDiameter === 'function') {
        body.setVisualDisplayDiameter(72);
      } else {
        body.setScale(72 / 54);
      }
    });

    return result;
  };
})();
