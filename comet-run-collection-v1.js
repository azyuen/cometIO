// Run-scoped unique collection authority.
// Collection belongs to the current run and the explicit manual checkpoint:
// - new run => fresh collection
// - successful ABSORB/MERGE => add immediately to the live run
// - SAVE => checkpoint captures the current collection
// - death without SAVE => protected checkpoint remains unchanged
// - LOAD => restores the collection exactly as it was at the last SAVE
(() => {
  const UNIQUE_BONUS = 200;
  const STALE_PERMANENT_LEDGER = 'cometio-permanent-collection-v1';

  const baseResetRun = GameScene.prototype.resetRun;
  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;

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

  function syncLiveCollection(scene) {
    const ids = validIds(scene.collectedIdentityIds);
    scene.collectedIdentityIds = ids;
    scene.collectionBonusScore = ids.length * UNIQUE_BONUS;
    return ids;
  }

  function collectibleTarget(scene) {
    const id = scene.other?.identityId;
    const identity = id ? COMET_COLLECTIBLE_BY_ID?.[id] : null;
    return identity ? { id, identity } : null;
  }

  function successfulAbsorbOrMerge(scene) {
    const pending = scene.pending;
    if (!pending || pending.choice !== 'ABSORB') return false;
    if (pending.compactGravityReverse) return false;
    const result = String(pending.result || '').toLowerCase();
    return result === 'absorb' || result === 'merge';
  }

  function registerLivePickup(scene) {
    if (scene._devModeActive || scene._labSandboxRun || !successfulAbsorbOrMerge(scene)) return null;

    const target = collectibleTarget(scene);
    if (!target) return null;

    const ids = syncLiveCollection(scene);
    if (ids.includes(target.id)) return null;

    // Register BEFORE the historical resolver runs. Older collection wrappers then see the ID as
    // already owned, preventing duplicate +200 awards while still allowing their existing UI/saves.
    ids.push(target.id);
    scene.collectedIdentityIds = validIds(ids);
    scene.collectionBonusScore = scene.collectedIdentityIds.length * UNIQUE_BONUS;
    scene.score = (Number(scene.score) || 0) + UNIQUE_BONUS;

    return {
      id: target.id,
      name: target.identity.name,
      bonus: UNIQUE_BONUS
    };
  }

  GameScene.prototype.resetRun = function () {
    // A NEW RUN is deliberately a new collection attempt. This does NOT touch the protected manual
    // checkpoint, so the previous saved run/collection can still be recovered with LOAD.
    this.collectedIdentityIds = [];
    this.collectionBonusScore = 0;
    this._lastCollectionPickup = null;
    this._runCollectionPickup = null;
    return baseResetRun.call(this);
  };

  GameScene.prototype.resolve = function () {
    // This is the final authoritative registration point while `other` and `pending.result` still
    // refer to the encounter that is about to be resolved.
    this._runCollectionPickup = registerLivePickup(this);
    return baseResolve.call(this);
  };

  GameScene.prototype.drawResult = function (result) {
    const pickup = this._runCollectionPickup;
    if (pickup && result?.survived !== false) {
      // Feed the existing polished collection result message.
      this._lastCollectionPickup = { ...pickup };
    }
    const value = baseDrawResult.call(this, result);
    this._runCollectionPickup = null;
    return value;
  };

  // The previous temporary implementation used a device-wide permanent ledger. Remove that stale
  // key so it can never leak discoveries from one run into another under the new checkpoint model.
  try { localStorage.removeItem(STALE_PERMANENT_LEDGER); } catch (e) {}

  window.CometRunCollection = Object.freeze({
    bonusPerUnique: UNIQUE_BONUS,
    currentIds(scene) { return [...validIds(scene?.collectedIdentityIds)]; },
    model: 'run-and-manual-checkpoint'
  });
})();
