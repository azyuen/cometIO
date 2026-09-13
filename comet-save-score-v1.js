// Save/load scoring v1.
// Manual checkpoint use remains fully allowed, but cleaner runs earn a slightly better score.
// Autosaves (save(true)) never count and never cost points.
(() => {
  const MANUAL_SAVE_PENALTY = 10;
  const SUCCESSFUL_LOAD_PENALTY = 25;

  const baseResetRun = GameScene.prototype.resetRun;
  const baseShowScores = GameScene.prototype.showScores;

  function numberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function integerOrZero(value) {
    return Math.max(0, Math.floor(numberOrZero(value)));
  }

  function savePayload(scene) {
    return {
      version: 4,
      tierIndex: scene.tierIndex,
      growth: scene.growth,
      craters: scene.craters,
      encounters: scene.encounters,
      absorbs: scene.absorbs,
      score: scene.score,
      regionId: scene.regionId,
      lastRegionPromptEncounter: scene.lastRegionPromptEncounter,
      player: scene.player,
      actionHistory: scene.actionHistory,
      elapsedMs: Date.now() - scene.runStarted,
      manualSaves: integerOrZero(scene.manualSaves),
      manualLoads: integerOrZero(scene.manualLoads),
      scorePenalty: integerOrZero(scene.scorePenalty)
    };
  }

  function writeSave(scene) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(savePayload(scene)));
  }

  GameScene.prototype.resetRun = function () {
    const result = baseResetRun.call(this);
    this.manualSaves = 0;
    this.manualLoads = 0;
    this.scorePenalty = 0;
    return result;
  };

  GameScene.prototype.save = function (silent = false) {
    const manual = !silent;
    const previous = manual ? {
      manualSaves: integerOrZero(this.manualSaves),
      scorePenalty: integerOrZero(this.scorePenalty),
      score: numberOrZero(this.score)
    } : null;

    if (manual) {
      this.manualSaves = previous.manualSaves + 1;
      this.scorePenalty = previous.scorePenalty + MANUAL_SAVE_PENALTY;
      // Deliberately allow a temporarily negative score. Otherwise an early save at score 0
      // would escape its penalty entirely once points are earned later.
      this.score = previous.score - MANUAL_SAVE_PENALTY;
    }

    try {
      writeSave(this);
      if (manual) this.toast(`RUN SAVED • SCORE -${MANUAL_SAVE_PENALTY}`, C.green);
      return true;
    } catch (e) {
      // A failed save should never cost the player score or increment the counter.
      if (manual) {
        this.manualSaves = previous.manualSaves;
        this.scorePenalty = previous.scorePenalty;
        this.score = previous.score;
        this.toast('SAVE FAILED', C.red);
      }
      return false;
    }
  };

  GameScene.prototype.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        this.toast('NO SAVED RUN', C.orange);
        return false;
      }

      const d = JSON.parse(raw);
      if (!Number.isInteger(d.tierIndex) || d.tierIndex < 0 || d.tierIndex >= TIERS.length) throw new Error('invalid tier');

      Object.assign(this, {
        tierIndex: d.tierIndex,
        growth: numberOrZero(d.growth),
        craters: numberOrZero(d.craters),
        encounters: numberOrZero(d.encounters),
        absorbs: numberOrZero(d.absorbs),
        score: numberOrZero(d.score),
        regionId: REGIONS.some(r => r.id === d.regionId) ? d.regionId : 'outer-heliosphere',
        lastRegionPromptEncounter: Number.isFinite(d.lastRegionPromptEncounter) ? d.lastRegionPromptEncounter : -1,
        actionHistory: Array.isArray(d.actionHistory) ? d.actionHistory : [],
        runStarted: Date.now() - numberOrZero(d.elapsedMs),
        player: d.player,
        manualSaves: integerOrZero(d.manualSaves),
        manualLoads: integerOrZero(d.manualLoads),
        scorePenalty: integerOrZero(d.scorePenalty)
      });

      if (!this.player) this.setPlayer(true);

      // A successful rollback costs a little more than making a checkpoint because the load is
      // the action that can actually undo risk. Immediately persist it so repeatedly reloading
      // the same checkpoint keeps accumulating the count and deduction.
      this.manualLoads += 1;
      this.scorePenalty += SUCCESSFUL_LOAD_PENALTY;
      this.score -= SUCCESSFUL_LOAD_PENALTY;
      this.runActive = true;
      writeSave(this);

      this.startEncounter();
      this.toast(`RUN LOADED • SCORE -${SUCCESSFUL_LOAD_PENALTY}`, C.blue);
      return true;
    } catch (e) {
      this.toast('SAVE CORRUPT', C.red);
      return false;
    }
  };

  // Home-v4 calls this for both entered names and QUICK RESTART's generic PLAYER score.
  GameScene.prototype.saveScoreAs = function (name) {
    if (!this.qualifies()) return;

    const scores = this.getScores();
    const history = Array.isArray(this.actionHistory) ? this.actionHistory : [];
    const absorbs = history.filter(x => x === 'ABSORB').length;
    const deflects = history.filter(x => x === 'DEFLECT').length;
    const avoids = history.filter(x => x === 'AVOID').length;

    scores.push({
      name: String(name || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER',
      score: numberOrZero(this.score),
      massKg: this.player.massKg,
      tierIndex: this.tierIndex,
      object: TIERS[this.tierIndex].name,
      actions: { total: absorbs + deflects + avoids, absorbs, deflects, avoids },
      streak: [...history],
      saves: integerOrZero(this.manualSaves),
      loads: integerOrZero(this.manualLoads),
      scorePenalty: integerOrZero(this.scorePenalty),
      date: Date.now()
    });

    scores.sort((a, b) => numberOrZero(b.score) - numberOrZero(a.score));
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  GameScene.prototype.showScores = function (returnTo = 'home') {
    baseShowScores.call(this, returnTo);

    // Add checkpoint usage to each existing high-score card without replacing the current
    // leaderboard layout. Older entries naturally display as zero-use runs.
    const scores = this.getScores();
    scores.forEach((v, i) => {
      const y = this.Y(132 + i * 123);
      const saves = integerOrZero(v.saves);
      const loads = integerOrZero(v.loads);
      const penalty = integerOrZero(v.scorePenalty);
      this.addText(
        77,
        y + 48,
        `SAVES ${saves} • LOADS ${loads} • PENALTY -${penalty}`,
        6.7,
        C.muted,
        { bold: true, width: 305 }
      );
    });
  };

  // Expose the values for future UI/help screens without scattering magic numbers elsewhere.
  GameScene.prototype.saveLoadScoreRules = function () {
    return { savePenalty: MANUAL_SAVE_PENALTY, loadPenalty: SUCCESSFUL_LOAD_PENALTY };
  };
})();
