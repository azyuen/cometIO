// Unique named-object collection system.
// Collection phase begins at DWARF PLANET. Named comets remain flavour encounters and can repeat.
// - A collectible named identity can reappear after DEFLECT/AVOID, but never after successful ABSORB.
// - Collection state follows manual/autosaves and rolls back with a loaded checkpoint.
// - High-score entries keep an immutable collection snapshot.
// - First-time collectible absorbs award a modest score bonus.
(() => {
  const UNIQUE_COLLECTION_BONUS = 200;
  const COLLECTION_TIER_ORDER = Array.isArray(COMET_COLLECTIBLE_TIER_ORDER)
    ? [...COMET_COLLECTIBLE_TIER_ORDER]
    : [];
  const TOTAL_UNIQUE_OBJECTS = Array.isArray(COMET_COLLECTIBLE_IDENTITIES)
    ? COMET_COLLECTIBLE_IDENTITIES.length
    : 0;

  const baseResetRun = GameScene.prototype.resetRun;
  const baseSave = GameScene.prototype.save;
  const baseLoad = GameScene.prototype.load;
  const basePickOpponent = GameScene.prototype.pickOpponent;
  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseShowHome = GameScene.prototype.showHome;
  const baseShowScores = GameScene.prototype.showScores;

  function numberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function integerOrZero(value) {
    return Math.max(0, Math.floor(numberOrZero(value)));
  }

  function validIdentityIds(ids) {
    const seen = new Set();
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      // This intentionally removes legacy comet IDs from saves/high-score collection snapshots.
      if (!COMET_COLLECTIBLE_BY_ID[id] || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function collectionBonusForIds(ids) {
    return validIdentityIds(ids).length * UNIQUE_COLLECTION_BONUS;
  }

  function sceneCollection(scene) {
    scene.collectedIdentityIds = validIdentityIds(scene.collectedIdentityIds);
    return scene.collectedIdentityIds;
  }

  function scoreCollection(score) {
    return validIdentityIds(score?.collection || score?.collectedIdentityIds || []);
  }

  function hasRecordedCollection(score) {
    return Array.isArray(score?.collection) || Array.isArray(score?.collectedIdentityIds);
  }

  function savedCollectionSnapshot() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ids = validIdentityIds(data.collectedIdentityIds);
      return {
        ids,
        bonus: collectionBonusForIds(ids),
        recorded: Array.isArray(data.collectedIdentityIds)
      };
    } catch (e) {
      return null;
    }
  }

  function assignIdentity(object, identity) {
    if (!object || !identity) return object;
    object.identityId = identity.id;
    object.realName = identity.name;
    object.namedSpriteBase = identity.spriteVariant;
    object.scienceClass = identity.scienceClass;
    object.identityStatus = identity.status;
    return object;
  }

  function stripNamedIdentity(object) {
    if (!object) return object;
    delete object.identityId;
    delete object.namedSpriteBase;
    delete object.scienceClass;
    delete object.identityStatus;
    // Tier examples can themselves be named objects, so exhausted collectible pools deliberately
    // become anonymous/generic encounters rather than silently reusing a collected identity.
    object.realName = object.name;
    return object;
  }

  function persistCollectionIntoSave(scene) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return true;
      const data = JSON.parse(raw);
      const ids = [...sceneCollection(scene)];
      data.version = Math.max(6, integerOrZero(data.version));
      data.collectedIdentityIds = ids;
      data.collectionBonusScore = collectionBonusForIds(ids);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function tierCollection(tierName) {
    return COMET_COLLECTIBLE_IDENTITIES.filter(identity => identity.gameplayTiers.includes(tierName));
  }

  function clampCollectionPage(value) {
    const max = Math.max(0, COLLECTION_TIER_ORDER.length - 1);
    return Math.max(0, Math.min(max, integerOrZero(value)));
  }

  // Clear collection BEFORE the underlying reset starts its first encounter, otherwise the first
  // opponent of a new run could incorrectly inherit exclusions from the previous run.
  GameScene.prototype.resetRun = function () {
    this.collectedIdentityIds = [];
    this.collectionBonusScore = 0;
    this._lastCollectionPickup = null;
    return baseResetRun.call(this);
  };

  // Existing save logic remains authoritative for the normal checkpoint. We append collection data
  // afterwards so older save files remain compatible.
  GameScene.prototype.save = function (silent = false) {
    const result = baseSave.call(this, silent);
    if (result === false) return false;
    this.collectionBonusScore = collectionBonusForIds(sceneCollection(this));
    return persistCollectionIntoSave(this) ? result : false;
  };

  GameScene.prototype.load = function () {
    const previousIds = [...sceneCollection(this)];
    const previousBonus = integerOrZero(this.collectionBonusScore);
    let savedIds = [];

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        savedIds = validIdentityIds(data.collectedIdentityIds);
      }
    } catch (e) {
      // Let the existing load path report corruption.
    }

    // baseLoad() immediately starts a new encounter, so exclusions must exist before it runs.
    this.collectedIdentityIds = savedIds;
    this.collectionBonusScore = collectionBonusForIds(savedIds);
    const result = baseLoad.call(this);

    if (result === false) {
      this.collectedIdentityIds = previousIds;
      this.collectionBonusScore = previousBonus;
      return false;
    }

    this.collectedIdentityIds = savedIds;
    this.collectionBonusScore = collectionBonusForIds(savedIds);
    persistCollectionIntoSave(this);
    return result;
  };

  // Named comets and any other non-collectible flavour identities are intentionally untouched.
  // For collectible tiers, replace an already-absorbed identity with an uncollected one from the
  // same tier. When the named collectible pool is exhausted, the encounter becomes generic.
  GameScene.prototype.pickOpponent = function () {
    const object = basePickOpponent.call(this);
    if (!object?.identityId) return object;

    const identity = getCometNamedIdentity(object.identityId);
    if (!identity?.collectible) return object;

    const collected = new Set(sceneCollection(this));
    if (!collected.has(object.identityId)) return object;

    const available = cometCollectiblePoolForTier(object.name).filter(candidate => !collected.has(candidate.id));
    if (!available.length) return stripNamedIdentity(object);

    return assignIdentity(object, available[Math.floor(Math.random() * available.length)]);
  };

  // Register the collectible and bonus before the normal resolver. The resolver then includes the
  // bonus in the result/HUD and its autosave captures the newly collected identity.
  GameScene.prototype.resolve = function () {
    this._lastCollectionPickup = null;
    const pending = this.pending;
    const identityId = this.other?.identityId;
    const identity = getCometNamedIdentity(identityId);
    const collected = sceneCollection(this);

    if (
      pending?.success &&
      pending.choice === 'ABSORB' &&
      identity?.collectible &&
      !collected.includes(identityId)
    ) {
      collected.push(identityId);
      this.collectedIdentityIds = validIdentityIds(collected);
      this.collectionBonusScore = collectionBonusForIds(this.collectedIdentityIds);
      this.score = numberOrZero(this.score) + UNIQUE_COLLECTION_BONUS;
      this._lastCollectionPickup = {
        id: identityId,
        name: identity.name,
        bonus: UNIQUE_COLLECTION_BONUS
      };
    }

    return baseResolve.call(this);
  };

  GameScene.prototype.drawResult = function (result) {
    const value = baseDrawResult.call(this, result);
    const pickup = this._lastCollectionPickup;
    if (pickup && result?.survived) {
      this.addText(
        W / 2,
        this.Y(685),
        `COLLECTED ${pickup.name}  •  UNIQUE BONUS +${pickup.bonus}`,
        8.1,
        C.green,
        { ox: .5, bold: true, align: 'center', width: 390 }
      );
    }
    return value;
  };

  // Every new leaderboard entry freezes the collectible snapshot belonging to that exact run.
  GameScene.prototype.saveScoreAs = function (name) {
    if (!this.qualifies()) return;

    const scores = this.getScores();
    const history = Array.isArray(this.actionHistory) ? this.actionHistory : [];
    const absorbs = history.filter(x => x === 'ABSORB').length;
    const deflects = history.filter(x => x === 'DEFLECT').length;
    const avoids = history.filter(x => x === 'AVOID').length;
    const collection = [...sceneCollection(this)];
    const collectionBonusScore = collectionBonusForIds(collection);

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
      collection,
      collectionBonusScore,
      date: Date.now()
    });

    scores.sort((a, b) => numberOrZero(b.score) - numberOrZero(a.score));
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  // The catalogue is paged by gameplay tier. This keeps 44 collectibles readable on a 420px-wide
  // portrait screen and makes the Dwarf Planet tier feel like the start of a new game phase.
  GameScene.prototype.showCollection = function (options = {}) {
    const score = options.score || null;
    const saved = options.saved || null;
    const returnTo = options.returnTo || 'home';
    const page = clampCollectionPage(options.page);
    const tierName = COLLECTION_TIER_ORDER[page] || 'DWARF PLANET';
    const tierItems = tierCollection(tierName);

    const recorded = score ? hasRecordedCollection(score) : (saved ? saved.recorded : true);
    const ids = score ? scoreCollection(score) : (saved ? saved.ids : [...sceneCollection(this)]);
    const collected = new Set(ids);
    const bonus = collectionBonusForIds(ids);
    const tierOwned = tierItems.filter(identity => collected.has(identity.id)).length;

    this.clearUI();
    this.state = 'COLLECTION';

    const title = score ? `${String(score.name || 'PLAYER').slice(0, 12)} COLLECTION` : 'COLLECTION';
    this.addText(W / 2, this.Y(40), title, 16, C.white, { ox: .5, bold: true });

    if (recorded) {
      this.addText(W / 2, this.Y(72), `${ids.length} / ${TOTAL_UNIQUE_OBJECTS} UNIQUE OBJECTS`, 9.5, C.cyan, { ox: .5, bold: true });
      this.addText(W / 2, this.Y(95), `COLLECTION SCORE BONUS +${bonus.toLocaleString('en-US')}`, 8.4, C.green, { ox: .5, bold: true });
    } else {
      this.addText(W / 2, this.Y(82), 'COLLECTION WAS NOT RECORDED FOR THIS LEGACY SAVE', 7.8, C.muted, { ox: .5, bold: true, width: 360, align: 'center' });
    }

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .97).fillRoundedRect(16, this.Y(122), 388, 560, 10);
    panel.lineStyle(1.5, C.cyan, .5).strokeRoundedRect(16, this.Y(122), 388, 560, 10);
    this.ui.add(panel);

    this.addText(W / 2, this.Y(143), tierName, 11.5, C.white, { ox: .5, bold: true });
    this.addText(
      W / 2,
      this.Y(168),
      recorded ? `${tierOwned} / ${tierItems.length} FOUND  •  TIER ${page + 1}/${COLLECTION_TIER_ORDER.length}` : `TIER ${page + 1}/${COLLECTION_TIER_ORDER.length}`,
      7.7,
      C.muted,
      { ox: .5, bold: true }
    );

    tierItems.forEach((identity, index) => {
      const y = this.Y(205 + index * 51);
      const owned = recorded && collected.has(identity.id);
      const slot = String(index + 1).padStart(2, '0');
      const label = owned ? identity.name : 'UNKNOWN';
      this.addText(34, y, `${slot}  ${owned ? '◆' : '◇'}  ${label}`, owned ? 8.4 : 8, owned ? C.green : C.muted, {
        bold: owned,
        width: 350
      });
      if (owned) {
        this.addText(64, y + 20, identity.scienceClass, 6.6, C.muted, { width: 320 });
      }
    });

    if (page > 0) {
      this.miniButton(92, this.Y(655), 130, 30, '◀ PREVIOUS', C.cyan, () => {
        this.showCollection({ score, saved, returnTo, page: page - 1 });
      });
    }
    if (page < COLLECTION_TIER_ORDER.length - 1) {
      this.miniButton(328, this.Y(655), 130, 30, 'NEXT ▶', C.cyan, () => {
        this.showCollection({ score, saved, returnTo, page: page + 1 });
      });
    }

    if (!score && recorded) {
      this.addText(W / 2, this.Y(714), 'COLLECTIONS BEGIN AT DWARF PLANET', 7.5, C.muted, { ox: .5, bold: true });
    } else if (score && recorded) {
      this.addText(W / 2, this.Y(714), `FINAL SCORE ${numberOrZero(score.score).toLocaleString('en-US')}`, 7.8, C.muted, { ox: .5, bold: true });
    }

    const backLabel = score ? 'BACK TO HIGH SCORES' : 'BACK HOME';
    this.wideButton(W / 2, this.Y(785), 300, 46, backLabel, C.cyan, () => {
      if (score) this.showScores(returnTo);
      else this.showHome();
    });
  };

  GameScene.prototype.showHome = function () {
    const result = baseShowHome.call(this);
    const saved = !this.runActive ? savedCollectionSnapshot() : null;
    const ids = saved ? saved.ids : sceneCollection(this);
    this.miniButton(
      W - 72,
      this.Y(31),
      124,
      24,
      `COLLECTION ${ids.length}/${TOTAL_UNIQUE_OBJECTS}`,
      C.cyan,
      () => this.showCollection({ returnTo: 'home', saved, page: 0 })
    );
    return result;
  };

  GameScene.prototype.showScores = function (returnTo = 'home') {
    const result = baseShowScores.call(this, returnTo);
    const scores = this.getScores();

    if (scores.length) {
      this.addText(W / 2, this.Y(75), 'TAP A SCORE TO VIEW ITS COLLECTION', 7.4, C.muted, { ox: .5, bold: true });
    }

    scores.forEach((score, i) => {
      const y = this.Y(132 + i * 123);
      const count = scoreCollection(score).length;
      const recorded = hasRecordedCollection(score);

      this.addText(
        390,
        y + 9,
        recorded ? `UNIQUE ${count}` : 'LEGACY',
        6.7,
        recorded ? C.cyan : C.muted,
        { ox: 1, bold: true }
      );

      const hit = this.add.rectangle(210, y + 10, 388, 106, 0xffffff, .001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showCollection({ score, returnTo, page: 0 }));
      this.ui.add(hit);
    });

    return result;
  };

  GameScene.prototype.collectionRules = function () {
    return {
      uniqueBonus: UNIQUE_COLLECTION_BONUS,
      totalUniqueObjects: TOTAL_UNIQUE_OBJECTS,
      collectibleTiers: [...COLLECTION_TIER_ORDER]
    };
  };
})();
