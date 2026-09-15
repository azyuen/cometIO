// Permanent unique-object collection authority.
// Collection is discovery/meta progression, not checkpoint state. A named collectible is permanently
// recorded when an ABSORB or MERGE actually resolves successfully. SAVE/LOAD/death/new runs cannot
// remove discoveries; checkpoints still restore gameplay state independently.
(() => {
  const LEDGER_KEY = 'cometio-permanent-collection-v1';
  const UNIQUE_BONUS = 200;

  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;
  const basePickOpponent = GameScene.prototype.pickOpponent;
  const baseLoad = GameScene.prototype.load;
  const baseShowHome = GameScene.prototype.showHome;
  const baseShowCollection = GameScene.prototype.showCollection;

  function validIds(ids) {
    const seen = new Set();
    const out = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      if (!COMET_COLLECTIBLE_BY_ID?.[id] || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function parseIds(raw) {
    if (!raw) return [];
    try {
      const value = JSON.parse(raw);
      return validIds(Array.isArray(value) ? value : value?.ids);
    } catch (e) {
      return [];
    }
  }

  function migrateLegacyIds() {
    const ids = [];
    const add = values => ids.push(...validIds(values));

    try {
      add(parseIds(localStorage.getItem(LEDGER_KEY)));

      for (const key of [
        'cometio-protected-checkpoint-v2',
        'cometio-protected-checkpoint-v2-backup',
        'cometio-manual-checkpoint-v1',
        SAVE_KEY
      ]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try { add(JSON.parse(raw)?.collectedIdentityIds); } catch (e) {}
      }

      // Older high-score snapshots may contain discoveries no longer present in the current save.
      try {
        const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
        for (const score of Array.isArray(scores) ? scores : []) {
          add(score?.collection || score?.collectedIdentityIds);
        }
      } catch (e) {}
    } catch (e) {}

    return validIds(ids);
  }

  function readLedger() {
    let ids = [];
    try { ids = parseIds(localStorage.getItem(LEDGER_KEY)); } catch (e) {}
    const migrated = validIds([...ids, ...migrateLegacyIds()]);
    if (migrated.length !== ids.length || migrated.some((id, i) => id !== ids[i])) writeLedger(migrated);
    return migrated;
  }

  function writeLedger(ids) {
    const clean = validIds(ids);
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify({ version: 1, ids: clean, updatedAt: Date.now() }));
    } catch (e) {}
    return clean;
  }

  function syncScene(scene) {
    const ledger = readLedger();
    scene.collectedIdentityIds = [...ledger];
    scene.collectionBonusScore = ledger.length * UNIQUE_BONUS;
    return ledger;
  }

  function collectibleTarget(scene) {
    const id = scene.other?.identityId;
    const identity = id ? COMET_COLLECTIBLE_BY_ID?.[id] : null;
    return identity ? { id, identity } : null;
  }

  function isSuccessfulCollectionOutcome(scene) {
    const pending = scene.pending;
    if (!pending || pending.choice !== 'ABSORB') return false;
    if (pending.compactGravityReverse) return false;
    const result = String(pending.result || '').toLowerCase();
    return result === 'absorb' || result === 'merge';
  }

  function registerResolvedDiscovery(scene) {
    if (scene._devModeActive || scene._labSandboxRun || !isSuccessfulCollectionOutcome(scene)) return null;
    const target = collectibleTarget(scene);
    if (!target) return null;

    const ledger = readLedger();
    const firstDiscovery = !ledger.includes(target.id);
    if (firstDiscovery) writeLedger([...ledger, target.id]);

    // Always synchronize live state from the permanent ledger. This also repairs old runs whose
    // checkpoint collection array was stale or empty.
    const synced = firstDiscovery ? validIds([...ledger, target.id]) : ledger;
    scene.collectedIdentityIds = [...synced];
    scene.collectionBonusScore = synced.length * UNIQUE_BONUS;

    if (!firstDiscovery) return null;

    // Award the first-discovery bonus here, before older collection wrappers execute. Because the ID
    // is already in scene.collectedIdentityIds, those wrappers see it as owned and cannot double-award.
    scene.score = (Number(scene.score) || 0) + UNIQUE_BONUS;
    return {
      id: target.id,
      name: target.identity.name,
      bonus: UNIQUE_BONUS
    };
  }

  GameScene.prototype.resolve = function () {
    // This wrapper is loaded last, so this is the authoritative moment immediately before the full
    // gameplay resolver mutates the encounter into result state.
    this._permanentCollectionPickup = registerResolvedDiscovery(this);
    return baseResolve.call(this);
  };

  GameScene.prototype.drawResult = function (result) {
    const pickup = this._permanentCollectionPickup;
    if (pickup && result?.survived !== false) {
      // Feed the existing polished result UI rather than drawing a second competing message.
      this._lastCollectionPickup = { ...pickup };
    }
    const value = baseDrawResult.call(this, result);
    this._permanentCollectionPickup = null;
    return value;
  };

  GameScene.prototype.pickOpponent = function () {
    // collection-v1's exclusion logic reads scene.collectedIdentityIds. Refresh it from the permanent
    // ledger before every roll so absorbed unique objects do not reappear after death/load/new run.
    syncScene(this);
    return basePickOpponent.call(this);
  };

  GameScene.prototype.load = function () {
    const result = baseLoad.call(this);
    if (result !== false) syncScene(this);
    return result;
  };

  function updateHomeCount(scene) {
    const count = readLedger().length;
    for (const child of scene.ui?.list || []) {
      if (!Array.isArray(child?.list)) continue;
      for (const item of child.list) {
        if (typeof item?.text !== 'string' || !item.text.startsWith('COLLECTION ')) continue;
        item.setText(`COLLECTION ${count}/${COMET_COLLECTIBLE_IDENTITIES.length}`);
      }
    }
  }

  GameScene.prototype.showHome = function () {
    syncScene(this);
    const result = baseShowHome.call(this);
    updateHomeCount(this);
    return result;
  };

  GameScene.prototype.showCollection = function (options = {}) {
    if (options?.score) return baseShowCollection.call(this, options);

    const ids = syncScene(this);
    // Force the existing collection catalogue to display the permanent ledger even when Home was
    // reached after game over and older code tries to pass a checkpoint snapshot via `saved`.
    return baseShowCollection.call(this, {
      ...options,
      saved: {
        ids: [...ids],
        bonus: ids.length * UNIQUE_BONUS,
        recorded: true
      }
    });
  };

  // Seed/migrate immediately so discoveries from existing saves/high scores are not lost by upgrade.
  writeLedger(migrateLegacyIds());

  window.CometPermanentCollection = Object.freeze({
    key: LEDGER_KEY,
    count() { return readLedger().length; },
    ids() { return [...readLedger()]; },
    has(id) { return readLedger().includes(id); },
    bonusPerFirstDiscovery: UNIQUE_BONUS
  });
})();
