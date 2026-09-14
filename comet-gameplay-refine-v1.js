// Gameplay refinement pass:
// - One explicit manual checkpoint only. No autosave writes.
// - Manual checkpoint lives in its own canonical storage key so legacy save layers cannot overwrite it.
// - Starting/restarting/dying never deletes the manual checkpoint.
// - Loading is free/read-only; each SAVE costs points and increments the persistent save counter.
// - Unique collection pickup is shown inside the result information box, not beside NEXT.
// - High-score cards sit below their instructional subtitle with SAVES inline in the action row.
// - Result comparison sprites are slightly larger.
(() => {
  const MANUAL_SAVE_PENALTY = 500;
  const MANUAL_SLOT_KEY = 'cometio-manual-checkpoint-v1';
  const LEGACY_AUTO_SAVE_KEY = `${SAVE_KEY}:autosave-v2`;
  const UNIQUE_COLLECTION_BONUS = 200;

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

  function parseStored(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;
    }
  }

  function readManualSave() {
    try {
      const canonical = parseStored(localStorage.getItem(MANUAL_SLOT_KEY));
      if (canonical) return canonical;

      // Backward-compatible migration: accept an older explicit/legacy SAVE_KEY checkpoint, but
      // never promote the old v2 autosave payload into the new canonical manual slot.
      const legacy = parseStored(localStorage.getItem(SAVE_KEY));
      if (!legacy || legacy.saveType === 'auto') return null;
      localStorage.setItem(MANUAL_SLOT_KEY, JSON.stringify(legacy));
      return legacy;
    } catch (e) {
      return null;
    }
  }

  function writeManualSave(data) {
    const json = JSON.stringify(data);
    // MANUAL_SLOT_KEY is authoritative. SAVE_KEY is only a compatibility mirror for the existing
    // Home/Collection code that reads collection data from the historical save key.
    localStorage.setItem(MANUAL_SLOT_KEY, json);
    localStorage.setItem(SAVE_KEY, json);
  }

  function checkpointPayload(scene) {
    const ids = validCollectionIds(scene.collectedIdentityIds);
    const canResumeEncounter = scene.state === 'APPROACH' && !!scene.other;
    return {
      version: 9,
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
      // Kept only so legacy high-score/save readers remain backward compatible.
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
    const width = 350;
    const height = 38;
    g.fillStyle(C.panel, .99).fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    g.lineStyle(1.5, color, .95).strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    const t = scene.add.text(0, 0, text, {
      fontFamily: FONT,
      fontSize: '8.8px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    c.add([g, t]);
    scene.ui.add(c);
    scene.tweens.add({
      targets: c,
      alpha: 0,
      delay: 1900,
      duration: 500,
      onComplete: () => c.destroy()
    });
  }

  function migrateAndCleanLegacySlots() {
    try {
      localStorage.removeItem(LEGACY_AUTO_SAVE_KEY);
      if (!localStorage.getItem(MANUAL_SLOT_KEY)) {
        const legacy = parseStored(localStorage.getItem(SAVE_KEY));
        if (legacy && legacy.saveType !== 'auto') {
          localStorage.setItem(MANUAL_SLOT_KEY, JSON.stringify(legacy));
        }
      }
    } catch (e) {}
  }

  migrateAndCleanLegacySlots();

  GameScene.prototype.save = function (silent = false) {
    // Existing gameplay code still invokes save(true) after encounters/region changes/Home. Those
    // calls are intentionally ignored: only a deliberate press of SAVE can replace the checkpoint.
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
        `CHECKPOINT SAVED • SAVE ${this.manualSaves} • COST -${MANUAL_SAVE_PENALTY}`,
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
        this.toast('NO MANUAL SAVE', C.orange);
        return false;
      }

      restoreCheckpoint(this, data);
      this.runActive = true;

      // Save is available only during APPROACH, so current-format checkpoints normally resume the
      // exact saved encounter. Legacy saves without an opponent fall back to progression-safe start.
      if (data.resumeEncounter && data.other) {
        this.other = data.other;
        this.drawEncounter();
      } else {
        this.startEncounter();
      }

      // LOAD never writes either storage slot. The same checkpoint remains reusable until SAVE is
      // explicitly pressed again.
      this.toast(`CHECKPOINT LOADED • SAVE ${integerOrZero(data.manualSaves)}`, C.blue);
      return true;
    } catch (e) {
      this.toast('SAVE CORRUPT', C.red);
      return false;
    }
  };

  // Home's START NEW RUN and game-over paths call clearSave(). Preserve both manual-save keys.
  GameScene.prototype.clearSave = function () {
    try { localStorage.removeItem(LEGACY_AUTO_SAVE_KEY); } catch (e) {}
  };

  GameScene.prototype.saveLoadScoreRules = function () {
    return { savePenalty: MANUAL_SAVE_PENALTY, loadPenalty: 0 };
  };

  function scoreCollection(score) {
    return validCollectionIds(score?.collection || score?.collectedIdentityIds || []);
  }

  function hasRecordedCollection(score) {
    return Array.isArray(score?.collection) || Array.isArray(score?.collectedIdentityIds);
  }

  // Rebuild the leaderboard once, instead of layering text over older score cards. This fixes the
  // subtitle overlap and keeps the tappable collection behaviour from collection-v1.
  GameScene.prototype.showScores = function (returnTo = 'home') {
    this.clearUI();
    this.state = 'SCORES';
    this.addText(W / 2, this.Y(38), 'HIGH SCORES', 17, C.white, { ox: .5, bold: true });

    const scores = this.getScores();
    if (!scores.length) {
      this.addText(W / 2, this.Y(330), 'NO SCORES YET', 12, C.muted, { ox: .5, bold: true });
    } else {
      this.addText(W / 2, this.Y(76), 'TAP A SCORE TO VIEW ITS COLLECTION', 7.4, C.muted, { ox: .5, bold: true });
    }

    scores.forEach((v, i) => {
      const y = this.Y(164 + i * 116);
      const g = this.add.graphics();
      const idx = clamp(+v.tierIndex || 0, 0, TIERS.length - 1);
      const tier = TIERS[idx];
      const object = {
        ...(this.player || {}),
        name: tier.name,
        tier: idx,
        radiusM: tier.r,
        massKg: tier.m,
        speedMS: tier.v,
        kind: tier.kind,
        color: tier.color,
        solid: tier.solid
      };
      const history = Array.isArray(v.streak) ? v.streak : [];
      const counts = v.actions || {
        total: history.length,
        absorbs: history.filter(x => x === 'ABSORB').length,
        deflects: history.filter(x => x === 'DEFLECT').length,
        avoids: history.filter(x => x === 'AVOID').length
      };
      const saves = integerOrZero(v.saves);
      const collectionCount = scoreCollection(v).length;
      const recorded = hasRecordedCollection(v);

      g.fillStyle(C.panel, .98).fillRoundedRect(16, y - 43, 388, 102, 8);
      g.lineStyle(1.5, i ? C.cyan : C.orange, .7).strokeRoundedRect(16, y - 43, 388, 102, 8);
      this.ui.add(g);

      this.drawObject(48, y + 1, 18, object);
      this.addText(77, y - 33, `#${i + 1}  ${String(v.name || 'PLAYER').slice(0, 12)}`, 9.2, i ? C.white : C.orange, { bold: true });
      this.addText(390, y - 33, (+v.score || 0).toLocaleString('en-US'), 9.6, C.green, { ox: 1, bold: true });
      this.addText(77, y - 11, String(v.object || tier.name), 7.8, C.muted, { bold: true, width: 220 });
      this.addText(390, y - 11, recorded ? `UNIQUE ${collectionCount}` : 'LEGACY', 6.6, recorded ? C.cyan : C.muted, { ox: 1, bold: true });
      this.addText(77, y + 9, `MASS ${this.massText(+v.massKg || tier.m)}`, 7.5, C.white, { bold: true });
      this.addText(
        77,
        y + 31,
        `TOTAL ${integerOrZero(counts.total)} • A ${integerOrZero(counts.absorbs)} • D ${integerOrZero(counts.deflects)} • V ${integerOrZero(counts.avoids)} • SAVES ${saves}`,
        6.8,
        C.muted,
        { bold: true, width: 310 }
      );

      const hit = this.add.rectangle(210, y + 8, 388, 100, 0xffffff, .001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showCollection({ score: v, returnTo }));
      this.ui.add(hit);
    });

    const label = returnTo === 'gameover' ? 'NEW RUN' : 'BACK HOME';
    this.wideButton(W / 2, this.Y(793), 300, 46, label, C.cyan, () => {
      if (returnTo === 'gameover') this.resetRun();
      else this.showHome();
    });
  };

  GameScene.prototype.drawResult = function (res) {
    // collection-v1 normally adds COLLECTED ... near the NEXT button. Suppress that legacy placement
    // while the wrapped result UI is built, then redraw it inside the result information box.
    const pickup = this._lastCollectionPickup || null;
    if (pickup) this._lastCollectionPickup = null;
    const result = baseDrawResult.call(this, res);
    if (pickup) this._lastCollectionPickup = pickup;

    // Home-v4 creates the comparison bodies at x=95 and x=325 with a 54px diameter. Increase them
    // to 72px while preserving each sprite renderer's own sizing rules.
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

    if (pickup && res?.survived) {
      const base = this.Y(160);

      // Cover the original reason/detail area and rebuild it with extra vertical padding for the
      // collection pickup. Everything remains inside the main result card and clear of NEXT.
      const cover = this.add.graphics();
      cover.fillStyle(C.panel, 1).fillRect(25, base + 368, 370, 132);
      this.ui.add(cover);

      const info = this.add.graphics();
      info.fillStyle(C.panel2, .98).fillRoundedRect(32, base + 374, 356, 90, 7);
      info.lineStyle(1, C.green, .28).strokeRoundedRect(32, base + 374, 356, 90, 7);
      this.ui.add(info);

      this.addText(45, base + 388, this.shortOutcomeReason(this.pending, res), 8.4, C.white, {
        width: 330,
        bold: true,
        lineSpacing: 3
      });
      this.addText(W / 2, base + 443, `COLLECTED ${pickup.name} • UNIQUE BONUS +${pickup.bonus}`, 7.7, C.green, {
        ox: .5,
        bold: true,
        align: 'center',
        width: 330
      });
      this.addText(W / 2, base + 482, res.detail, 8.6, C.white, {
        ox: .5,
        align: 'center',
        width: 350,
        bold: true
      });
    }

    return result;
  };
})();
