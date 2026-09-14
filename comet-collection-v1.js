// Unique named-object collection system.
// - A named identity can reappear after DEFLECT/AVOID, but never after it has been successfully ABSORBED in this run.
// - Collection state follows manual/autosaves and rolls back with a loaded checkpoint.
// - High-score entries keep an immutable collection snapshot.
// - First-time named absorbs award a modest score bonus.
(() => {
  const UNIQUE_COLLECTION_BONUS = 200;
  const TOTAL_UNIQUE_OBJECTS = Array.isArray(COMET_NAMED_IDENTITIES) ? COMET_NAMED_IDENTITIES.length : 0;

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
      if (!COMET_IDENTITY_BY_ID[id] || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
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
        bonus: integerOrZero(data.collectionBonusScore) || ids.length * UNIQUE_COLLECTION_BONUS,
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
    // Do not fall back to tier examples here: those examples can themselves be real named objects.
    // Once the named pool is exhausted this is deliberately an anonymous/generic encounter.
    object.realName = object.name;
    return object;
  }

  function persistCollectionIntoSave(scene) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return true;
      const data = JSON.parse(raw);
      data.version = Math.max(5, integerOrZero(data.version));
      data.collectedIdentityIds = [...sceneCollection(scene)];
      data.collectionBonusScore = integerOrZero(scene.collectionBonusScore);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function collectionDisplayName(identity) {
    if (!identity) return 'UNKNOWN';
    if (identity.id === 'comet_67p') return '67P / CHURYUMOV';
    return identity.name;
  }

  function collectionBonusFor(scene, ids) {
    const stored = integerOrZero(scene?.collectionBonusScore);
    return stored || ids.length * UNIQUE_COLLECTION_BONUS;
  }

  // Clear collection BEFORE the underlying reset starts its first encounter, otherwise the first
  // opponent of a new run could incorrectly inherit exclusions from the previous run.
  GameScene.prototype.resetRun = function () {
    this.collectedIdentityIds = [];
    this.collectionBonusScore = 0;
    this._lastCollectionPickup = null;
    return baseResetRun.call(this);
  };

  // The existing save module remains authoritative for normal run/checkpoint data. We add the
  // collection fields immediately afterwards so old saves remain backward compatible.
  GameScene.prototype.save = function (silent = false) {
    const result = baseSave.call(this, silent);
    if (result === false) return false;
    return persistCollectionIntoSave(this) ? result : false;
  };

  GameScene.prototype.load = function () {
    const previousIds = [...sceneCollection(this)];
    const previousBonus = integerOrZero(this.collectionBonusScore);
    let savedIds = [];
    let savedBonus = 0;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        savedIds = validIdentityIds(data.collectedIdentityIds);
        savedBonus = integerOrZero(data.collectionBonusScore) || savedIds.length * UNIQUE_COLLECTION_BONUS;
      }
    } catch (e) {
      // Let the existing load path report corruption.
    }

    // Set this before baseLoad(), because baseLoad immediately starts a new encounter.
    this.collectedIdentityIds = savedIds;
    this.collectionBonusScore = savedBonus;
    const result = baseLoad.call(this);

    if (result === false) {
      this.collectedIdentityIds = previousIds;
      this.collectionBonusScore = previousBonus;
      return false;
    }

    this.collectedIdentityIds = savedIds;
    this.collectionBonusScore = savedBonus;
    persistCollectionIntoSave(this);
    return result;
  };

  // Identity-runtime currently assigns a named identity whenever an eligible tier is rolled.
  // Keep that behaviour, but replace an already-collected identity with an uncollected one from
  // the same tier. If the entire named pool has been collected, the encounter becomes generic.
  GameScene.prototype.pickOpponent = function () {
    const object = basePickOpponent.call(this);
    if (!object?.identityId) return object;

    const collected = new Set(sceneCollection(this));
    if (!collected.has(object.identityId)) return object;

    const available = cometIdentityPoolForTier(object.name).filter(identity => !collected.has(identity.id));
    if (!available.length) return stripNamedIdentity(object);

    return assignIdentity(object, available[Math.floor(Math.random() * available.length)]);
  };

  // Register the collectible and its bonus before the normal resolver runs. The normal resolver
  // then includes the bonus in the HUD/result score and its autosave captures the new collection.
  GameScene.prototype.resolve = function () {
    this._lastCollectionPickup = null;
    const pending = this.pending;
    const identityId = this.other?.identityId;
    const collected = sceneCollection(this);

    if (pending?.success && pending.choice === 'ABSORB' && identityId && !collected.includes(identityId)) {
      const identity = getCometNamedIdentity(identityId);
      if (identity) {
        collected.push(identityId);
        this.collectedIdentityIds = validIdentityIds(collected);
        this.collectionBonusScore = integerOrZero(this.collectionBonusScore) + UNIQUE_COLLECTION_BONUS;
        this.score = numberOrZero(this.score) + UNIQUE_COLLECTION_BONUS;
        this._lastCollectionPickup = {
          id: identityId,
          name: identity.name,
          bonus: UNIQUE_COLLECTION_BONUS
        };
      }
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

  // Replace the score writer so every new leaderboard entry freezes the collection that belonged
  // to that exact run. This survives the live save being overwritten/deleted later.
  GameScene.prototype.saveScoreAs = function (name) {
    if (!this.qualifies()) return;

    const scores = this.getScores();
    const history = Array.isArray(this.actionHistory) ? this.actionHistory : [];
    const absorbs = history.filter(x => x === 'ABSORB').length;
    const deflects = history.filter(x => x === 'DEFLECT').length;
    const avoids = history.filter(x => x === 'AVOID').length;
    const collection = [...sceneCollection(this)];

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
      collectionBonusScore: integerOrZero(this.collectionBonusScore),
      date: Date.now()
    });

    scores.sort((a, b) => numberOrZero(b.score) - numberOrZero(a.score));
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  GameScene.prototype.showCollection = function (options = {}) {
    const score = options.score || null;
    const saved = options.saved || null;
    const returnTo = options.returnTo || 'home';
    const recorded = score ? hasRecordedCollection(score) : (saved ? saved.recorded : true);
    const ids = score ? scoreCollection(score) : (saved ? saved.ids : [...sceneCollection(this)]);
    const collected = new Set(ids);
    const bonus = score
      ? (integerOrZero(score.collectionBonusScore) || ids.length * UNIQUE_COLLECTION_BONUS)
      : (saved ? saved.bonus : collectionBonusFor(this, ids));

    this.clearUI();
    this.state = 'COLLECTION';

    const title = score ? `${String(score.name || 'PLAYER').slice(0, 12)} COLLECTION` : 'COLLECTION';
    this.addText(W / 2, this.Y(40), title, 16, C.white, { ox: .5, bold: true });

    if (recorded) {
      this.addText(W / 2, this.Y(72), `${ids.length} / ${TOTAL_UNIQUE_OBJECTS} UNIQUE OBJECTS`, 9.5, C.cyan, { ox: .5, bold: true });
      this.addText(W / 2, this.Y(95), `COLLECTION SCORE BONUS +${bonus.toLocaleString('en-US')}`, 8.4, C.green, { ox: .5, bold: true });
    } else {
      this.addText(W / 2, this.Y(78), 'COLLECTION WAS NOT RECORDED FOR THIS LEGACY SAVE', 7.8, C.muted, { ox: .5, bold: true, width: 360, align: 'center' });
    }

    const panel = this.add.graphics();
    panel.fillStyle(C.panel, .97).fillRoundedRect(16, this.Y(122), 388, 568, 10);
    panel.lineStyle(1.5, C.cyan, .5).strokeRoundedRect(16, this.Y(122), 388, 568, 10);
    this.ui.add(panel);

    const rowsPerColumn = Math.ceil(TOTAL_UNIQUE_OBJECTS / 2);
    COMET_NAMED_IDENTITIES.forEach((identity, index) => {
      const col = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const x = col === 0 ? 31 : 222;
      const y = this.Y(148 + row * 45);
      const owned = recorded && collected.has(identity.id);
      const slot = String(index + 1).padStart(2, '0');
      const label = owned ? collectionDisplayName(identity) : 'UNKNOWN';
      this.addText(
        x,
        y,
        `${slot}  ${owned ? '◆' : '◇'}  ${label}`,
        owned ? 7.4 : 7.1,
        owned ? C.green : C.muted,
        { bold: owned, width: 171 }
      );
    });

    if (!score && recorded) {
      this.addText(W / 2, this.Y(714), 'SUCCESSFULLY ABSORB A NAMED OBJECT TO ADD IT', 7.5, C.muted, { ox: .5, bold: true });
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
      () => this.showCollection({ returnTo: 'home', saved })
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
      hit.on('pointerdown', () => this.showCollection({ score, returnTo }));
      this.ui.add(hit);
    });

    return result;
  };

  GameScene.prototype.collectionRules = function () {
    return {
      uniqueBonus: UNIQUE_COLLECTION_BONUS,
      totalUniqueObjects: TOTAL_UNIQUE_OBJECTS
    };
  };
})();
