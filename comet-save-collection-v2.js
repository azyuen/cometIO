// Save/load + collection UX v2.
// - Manual checkpoints are no longer overwritten by silent autosaves.
// - LOAD stays on the Home Screen; gameplay uses COLLECTION instead.
// - Collection shows only acquired objects, in acquisition order, as one vertically scrollable list.
// - Collected named sprites are rendered large enough to recognise.
(() => {
  const AUTO_SAVE_KEY = `${SAVE_KEY}:autosave-v2`;
  const MANUAL_SAVE_PENALTY = 10;
  const SUCCESSFUL_LOAD_PENALTY = 25;
  const UNIQUE_COLLECTION_BONUS = 200;

  const baseMiniButton = GameScene.prototype.miniButton;
  const baseClearUI = GameScene.prototype.clearUI;

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

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch (e) {
      return null;
    }
  }

  function writeStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function savePayload(scene, manual) {
    const ids = validCollectionIds(scene.collectedIdentityIds);
    const canResumeEncounter = manual && scene.state === 'APPROACH' && scene.other;
    return {
      version: 7,
      savedAt: Date.now(),
      saveType: manual ? 'manual' : 'auto',
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
      resumeEncounter: !!canResumeEncounter,
      actionHistory: Array.isArray(scene.actionHistory) ? [...scene.actionHistory] : [],
      elapsedMs: Date.now() - scene.runStarted,
      manualSaves: integerOrZero(scene.manualSaves),
      manualLoads: integerOrZero(scene.manualLoads),
      scorePenalty: integerOrZero(scene.scorePenalty),
      collectedIdentityIds: ids,
      collectionBonusScore: ids.length * UNIQUE_COLLECTION_BONUS
    };
  }

  function restorePayload(scene, data) {
    if (!Number.isInteger(data?.tierIndex) || data.tierIndex < 0 || data.tierIndex >= TIERS.length) {
      throw new Error('invalid tier');
    }

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
      runStarted: Date.now() - numberOrZero(data.elapsedMs),
      player: data.player || null,
      collectedIdentityIds: validCollectionIds(data.collectedIdentityIds),
      collectionBonusScore: validCollectionIds(data.collectedIdentityIds).length * UNIQUE_COLLECTION_BONUS,
      manualSaves: integerOrZero(data.manualSaves),
      manualLoads: integerOrZero(data.manualLoads),
      scorePenalty: integerOrZero(data.scorePenalty)
    });

    if (!scene.player) scene.setPlayer(true);
  }

  function newestCollectionFromStorage() {
    const manual = readStorage(SAVE_KEY);
    const auto = readStorage(AUTO_SAVE_KEY);
    const options = [manual, auto].filter(Boolean).sort((a, b) => numberOrZero(b.savedAt) - numberOrZero(a.savedAt));
    const selected = options[0] || null;
    return selected ? validCollectionIds(selected.collectedIdentityIds) : [];
  }

  function currentCollectionCount(scene) {
    if (scene.runActive) return validCollectionIds(scene.collectedIdentityIds).length;
    return newestCollectionFromStorage().length;
  }

  function cleanupCollectionScroll(scene) {
    if (scene._collectionWheelHandler && scene.input) {
      scene.input.off('wheel', scene._collectionWheelHandler);
      scene._collectionWheelHandler = null;
    }
    if (scene._collectionMaskGraphics) {
      try { scene._collectionMaskGraphics.destroy(); } catch (e) {}
      scene._collectionMaskGraphics = null;
    }
  }

  GameScene.prototype.clearUI = function () {
    cleanupCollectionScroll(this);
    return baseClearUI.call(this);
  };

  // Manual SAVE is a true checkpoint. Silent autosaves use a separate slot and cannot overwrite it.
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
      this.score = previous.score - MANUAL_SAVE_PENALTY;
    }

    try {
      const key = manual ? SAVE_KEY : AUTO_SAVE_KEY;
      writeStorage(key, savePayload(this, manual));
      if (manual) this.toast(`CHECKPOINT SAVED • SCORE -${MANUAL_SAVE_PENALTY}`, C.green);
      return true;
    } catch (e) {
      if (manual) {
        this.manualSaves = previous.manualSaves;
        this.scorePenalty = previous.scorePenalty;
        this.score = previous.score;
        this.toast('SAVE FAILED', C.red);
      }
      return false;
    }
  };

  // LOAD is intended as a Home Screen action. Prefer the explicit manual checkpoint; if the player
  // never made one, gracefully resume the latest autosave instead.
  GameScene.prototype.load = function () {
    try {
      const manual = readStorage(SAVE_KEY);
      const auto = readStorage(AUTO_SAVE_KEY);
      const data = manual || auto;
      const loadingCheckpoint = !!manual;

      if (!data) {
        this.toast('NO SAVED RUN', C.orange);
        return false;
      }

      restorePayload(this, data);
      this.runActive = true;

      if (loadingCheckpoint) {
        this.manualLoads += 1;
        this.scorePenalty += SUCCESSFUL_LOAD_PENALTY;
        this.score -= SUCCESSFUL_LOAD_PENALTY;
      }

      // A manual checkpoint made during an encounter restores that exact opponent. Legacy saves and
      // autosaves resume safely by generating the next encounter from the restored progression state.
      if (loadingCheckpoint && data.resumeEncounter && data.other) {
        this.other = data.other;
        this.drawEncounter();
      } else {
        this.startEncounter();
      }

      if (loadingCheckpoint) {
        // Persist the load penalty/counter without changing the checkpoint's saved opponent.
        const updated = savePayload(this, true);
        updated.other = data.other || null;
        updated.resumeEncounter = !!(data.resumeEncounter && data.other);
        writeStorage(SAVE_KEY, updated);
        this.toast(`CHECKPOINT LOADED • SCORE -${SUCCESSFUL_LOAD_PENALTY}`, C.blue);
      } else {
        this.toast('RUN RESUMED', C.blue);
      }
      return true;
    } catch (e) {
      this.toast('SAVE CORRUPT', C.red);
      return false;
    }
  };

  GameScene.prototype.clearSave = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    try { localStorage.removeItem(AUTO_SAVE_KEY); } catch (e) {}
  };

  // Keep LOAD on Home only. The gameplay utility slot becomes COLLECTION.
  // Also remove the total catalogue count from the Home collection button so undiscovered content
  // is not advertised before the player finds it.
  GameScene.prototype.miniButton = function (x, y, w, h, label, color, cb) {
    if (label === 'LOAD' && this.state === 'APPROACH') {
      return baseMiniButton.call(this, x, y, Math.max(w, 76), h, 'COLLECTION', C.blue, () => {
        this.showCollection({ returnTo: 'game' });
      });
    }

    if (this.state === 'HOME' && typeof label === 'string' && label.startsWith('COLLECTION ')) {
      return baseMiniButton.call(this, x, y, w, h, `COLLECTION ${currentCollectionCount(this)}`, color, () => {
        this.showCollection({ returnTo: 'home' });
      });
    }

    return baseMiniButton.call(this, x, y, w, h, label, color, cb);
  };

  function collectionIdsForView(scene, options) {
    if (options.score) {
      return validCollectionIds(options.score.collection || options.score.collectedIdentityIds);
    }
    if (options.saved?.ids) return validCollectionIds(options.saved.ids);
    if (scene.runActive) return validCollectionIds(scene.collectedIdentityIds);
    return newestCollectionFromStorage();
  }

  function collectionRecorded(options) {
    if (!options.score) return true;
    return Array.isArray(options.score.collection) || Array.isArray(options.score.collectedIdentityIds);
  }

  function objectForIdentity(identity) {
    const tierName = identity?.gameplayTiers?.[0] || 'DWARF PLANET';
    let tierIndex = TIERS.findIndex(t => t.name === tierName);
    if (tierIndex < 0) tierIndex = 0;
    const tier = TIERS[tierIndex];
    return {
      name: tier.name,
      realName: identity.name,
      tier: tierIndex,
      radiusM: tier.r,
      massKg: tier.m,
      speedMS: tier.v,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid,
      identityId: identity.id,
      namedSpriteBase: identity.spriteVariant,
      scienceClass: identity.scienceClass,
      identityStatus: identity.status
    };
  }

  function reparentTo(content, ui, child) {
    if (!child) return child;
    try { ui.remove(child, false); } catch (e) {}
    content.add(child);
    return child;
  }

  // Collection v2: acquired objects only, in acquisition order, one continuous vertical scroll.
  GameScene.prototype.showCollection = function (options = {}) {
    this.clearUI();
    this.state = 'COLLECTION';

    const returnTo = options.returnTo || 'home';
    const score = options.score || null;
    const recorded = collectionRecorded(options);
    const ids = recorded ? collectionIdsForView(this, options) : [];
    const identities = ids.map(id => COMET_COLLECTIBLE_BY_ID?.[id]).filter(Boolean);

    const title = score ? `${String(score.name || 'PLAYER').slice(0, 12)} COLLECTION` : 'COLLECTION';
    this.addText(W / 2, this.Y(34), title, 17, C.white, { ox: .5, bold: true });

    if (!recorded) {
      this.addText(W / 2, this.Y(72), 'COLLECTION DATA WAS NOT RECORDED FOR THIS LEGACY SCORE', 7.8, C.muted, {
        ox: .5, bold: true, align: 'center', width: 360
      });
    } else {
      const countText = identities.length === 1 ? '1 OBJECT COLLECTED' : `${identities.length} OBJECTS COLLECTED`;
      this.addText(W / 2, this.Y(70), countText, 9.5, C.cyan, { ox: .5, bold: true });
      if (identities.length) {
        this.addText(W / 2, this.Y(94), `UNIQUE BONUS +${(identities.length * UNIQUE_COLLECTION_BONUS).toLocaleString('en-US')}`, 8.2, C.green, { ox: .5, bold: true });
      }
    }

    const viewportTop = this.Y(122);
    const viewportBottom = this.Y(716);
    const viewportHeight = viewportBottom - viewportTop;

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .97).fillRoundedRect(16, viewportTop, 388, viewportHeight, 10);
    panel.lineStyle(1.5, C.cyan, .5).strokeRoundedRect(16, viewportTop, 388, viewportHeight, 10);
    this.ui.add(panel);

    if (!identities.length) {
      const emptyText = recorded ? 'NO OBJECTS COLLECTED YET' : 'NO COLLECTION DATA';
      this.addText(W / 2, viewportTop + 245, emptyText, 10, C.muted, { ox: .5, bold: true });
      if (recorded) {
        this.addText(W / 2, viewportTop + 276, 'ABSORB UNIQUE OBJECTS TO ADD THEM HERE.', 7.6, C.muted, { ox: .5, bold: true });
      }
    } else {
      const rowHeight = 104;
      const contentHeight = identities.length * rowHeight + 14;
      const maxScroll = Math.max(0, contentHeight - viewportHeight);
      const content = this.add.container(0, viewportTop);
      this.ui.add(content);

      identities.forEach((identity, index) => {
        const y = 8 + index * rowHeight;
        const card = this.add.graphics();
        card.fillStyle(C.panel2, .82).fillRoundedRect(26, y, 366, 94, 8);
        card.lineStyle(1, C.cyan, .2).strokeRoundedRect(26, y, 366, 94, 8);
        content.add(card);

        const sprite = this.drawObject(72, y + 47, 31, objectForIdentity(identity), false, false);
        reparentTo(content, this.ui, sprite);

        const order = reparentTo(content, this.ui, this.addText(112, y + 14, `#${String(index + 1).padStart(2, '0')}  ${identity.name}`, 10, C.white, {
          bold: true, width: 258
        }));
        const tierName = identity.gameplayTiers?.[0] || '';
        reparentTo(content, this.ui, this.addText(112, y + 42, identity.scienceClass || tierName, 7.5, C.cyan, {
          bold: true, width: 258
        }));
        if (tierName && tierName !== identity.scienceClass) {
          reparentTo(content, this.ui, this.addText(112, y + 66, tierName, 7, C.muted, {
            bold: true, width: 258
          }));
        }
      });

      const maskGraphics = this.make.graphics({ add: false });
      maskGraphics.fillStyle(0xffffff, 1).fillRect(16, viewportTop, 388, viewportHeight);
      content.setMask(maskGraphics.createGeometryMask());
      this._collectionMaskGraphics = maskGraphics;

      let scrollOffset = 0;
      let dragStartY = 0;
      let dragStartOffset = 0;
      let dragging = false;

      const scrollBar = this.add.graphics();
      this.ui.add(scrollBar);

      const setScroll = (next) => {
        scrollOffset = Math.max(0, Math.min(maxScroll, next));
        content.y = viewportTop - scrollOffset;

        scrollBar.clear();
        if (maxScroll > 0) {
          const trackX = 397;
          const trackY = viewportTop + 8;
          const trackH = viewportHeight - 16;
          const thumbH = Math.max(44, trackH * (viewportHeight / contentHeight));
          const thumbY = trackY + (trackH - thumbH) * (scrollOffset / maxScroll);
          scrollBar.fillStyle(C.cyan, .16).fillRoundedRect(trackX, trackY, 3, trackH, 2);
          scrollBar.fillStyle(C.cyan, .7).fillRoundedRect(trackX, thumbY, 3, thumbH, 2);
        }
      };

      const hit = this.add.rectangle(W / 2, viewportTop + viewportHeight / 2, 388, viewportHeight, 0xffffff, .001)
        .setInteractive({ useHandCursor: true });
      this.ui.add(hit);

      hit.on('pointerdown', pointer => {
        dragging = true;
        dragStartY = pointer.y;
        dragStartOffset = scrollOffset;
      });
      hit.on('pointermove', pointer => {
        if (!dragging || !pointer.isDown) return;
        setScroll(dragStartOffset - (pointer.y - dragStartY));
      });
      hit.on('pointerup', () => { dragging = false; });
      hit.on('pointerout', pointer => { if (!pointer.isDown) dragging = false; });

      const onWheel = (pointer, gameObjects, deltaX, deltaY) => {
        if (pointer.y < viewportTop || pointer.y > viewportBottom) return;
        setScroll(scrollOffset + deltaY * .7);
      };
      this.input.on('wheel', onWheel);
      this._collectionWheelHandler = onWheel;
      setScroll(0);
    }

    const backLabel = score ? 'BACK TO HIGH SCORES' : (returnTo === 'game' ? 'BACK TO GAME' : 'BACK HOME');
    this.wideButton(W / 2, this.Y(785), 300, 46, backLabel, C.cyan, () => {
      if (score) this.showScores(returnTo);
      else if (returnTo === 'game' && this.runActive && this.player && this.other) this.drawEncounter();
      else this.showHome();
    });
  };

  GameScene.prototype.saveCollectionV2Rules = function () {
    return {
      autoSaveKey: AUTO_SAVE_KEY,
      manualSavePenalty: MANUAL_SAVE_PENALTY,
      loadPenalty: SUCCESSFUL_LOAD_PENALTY,
      uniqueBonus: UNIQUE_COLLECTION_BONUS
    };
  };
})();
