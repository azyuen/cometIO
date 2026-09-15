// Final collection authority: explicit boolean state for every collectible identity.
(() => {
  const BONUS = 200;
  const PRIMARY = 'cometio-protected-checkpoint-v2';
  const BACKUP = 'cometio-protected-checkpoint-v2-backup';
  const LEGACY = 'cometio-manual-checkpoint-v1';

  const baseResetRun = GameScene.prototype.resetRun;
  const basePickOpponent = GameScene.prototype.pickOpponent;
  const baseResolve = GameScene.prototype.resolve;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseSave = GameScene.prototype.save;
  const baseLoad = GameScene.prototype.load;
  const baseShowCollection = GameScene.prototype.showCollection;
  const baseShowHome = GameScene.prototype.showHome;

  function blank() {
    const state = {};
    for (const identity of COMET_COLLECTIBLE_IDENTITIES) state[identity.id] = false;
    return state;
  }

  function normalize(value, legacyIds = []) {
    const state = blank();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const id of Object.keys(state)) state[id] = value[id] === true;
    } else {
      for (const id of Array.isArray(legacyIds) ? legacyIds : []) {
        if (Object.prototype.hasOwnProperty.call(state, id)) state[id] = true;
      }
    }
    return state;
  }

  function ids(state) {
    return COMET_COLLECTIBLE_IDENTITIES.filter(x => state?.[x.id] === true).map(x => x.id);
  }

  function sync(scene) {
    scene.uniqueCollectionState = normalize(scene.uniqueCollectionState, scene.collectedIdentityIds);
    scene.collectedIdentityIds = ids(scene.uniqueCollectionState);
    scene.collectionBonusScore = scene.collectedIdentityIds.length * BONUS;
    return scene.uniqueCollectionState;
  }

  function assign(object, identity) {
    object.identityId = identity.id;
    object.realName = identity.name;
    object.namedSpriteBase = identity.spriteVariant;
    object.scienceClass = identity.scienceClass;
    object.identityStatus = identity.status;
    return object;
  }

  function makeGeneric(object) {
    delete object.identityId;
    delete object.namedSpriteBase;
    delete object.scienceClass;
    delete object.identityStatus;
    object.realName = object.name;
    return object;
  }

  function enforceAvailableIdentity(scene, object) {
    const pool = cometCollectiblePoolForTier(object?.name);
    if (!pool.length) return object;
    const state = sync(scene);
    const current = object.identityId ? COMET_COLLECTIBLE_BY_ID?.[object.identityId] : null;
    if (current && state[current.id] !== true) return object;
    const available = pool.filter(identity => state[identity.id] !== true);
    if (!available.length) return makeGeneric(object);
    return assign(object, available[Math.floor(Math.random() * available.length)]);
  }

  function shouldCollect(scene) {
    const p = scene.pending;
    if (!p || p.choice !== 'ABSORB' || p.compactGravityReverse) return false;
    const result = String(p.result || '').toLowerCase();
    return result === 'absorb' || result === 'merge';
  }

  function register(scene) {
    if (scene._devModeActive || scene._labSandboxRun || !shouldCollect(scene)) return null;
    const id = scene.other?.identityId;
    const identity = id ? COMET_COLLECTIBLE_BY_ID?.[id] : null;
    if (!identity) return null;
    const state = sync(scene);
    if (state[id] === true) return null;
    state[id] = true;
    scene.uniqueCollectionState = normalize(state);
    sync(scene);
    scene.score = (Number(scene.score) || 0) + BONUS;
    return { id, name: identity.name, bonus: BONUS };
  }

  function parse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function savedData() {
    for (const key of [PRIMARY, BACKUP, LEGACY, SAVE_KEY]) {
      const data = parse(localStorage.getItem(key));
      if (data) return data;
    }
    return null;
  }

  function savedState() {
    const data = savedData();
    return normalize(data?.collectionState || data?.uniqueCollectionState, data?.collectedIdentityIds);
  }

  function patchKey(key, state) {
    const data = parse(localStorage.getItem(key));
    if (!data) return;
    const clean = normalize(state);
    const collected = ids(clean);
    data.version = Math.max(14, Number(data.version) || 0);
    data.collectionState = clean;
    data.uniqueCollectionState = clean;
    data.collectedIdentityIds = collected;
    data.collectionBonusScore = collected.length * BONUS;
    localStorage.setItem(key, JSON.stringify(data));
  }

  function patchCheckpoint(scene) {
    const state = sync(scene);
    for (const key of [PRIMARY, BACKUP, LEGACY, SAVE_KEY]) {
      try { patchKey(key, state); } catch (e) {}
    }
  }

  GameScene.prototype.resetRun = function () {
    this.uniqueCollectionState = blank();
    this.collectedIdentityIds = [];
    this.collectionBonusScore = 0;
    this._explicitCollectionPickup = null;
    const result = baseResetRun.call(this);
    sync(this);
    return result;
  };

  GameScene.prototype.pickOpponent = function () {
    sync(this);
    return enforceAvailableIdentity(this, basePickOpponent.call(this));
  };

  GameScene.prototype.resolve = function () {
    this._explicitCollectionPickup = register(this);
    return baseResolve.call(this);
  };

  GameScene.prototype.drawResult = function (result) {
    const pickup = this._explicitCollectionPickup;
    if (pickup && result?.survived !== false) this._lastCollectionPickup = { ...pickup };
    const value = baseDrawResult.call(this, result);
    this._explicitCollectionPickup = null;
    return value;
  };

  GameScene.prototype.save = function (silent = false) {
    sync(this);
    const result = baseSave.call(this, silent);
    if (!silent && result !== false) patchCheckpoint(this);
    return result;
  };

  GameScene.prototype.load = function () {
    const previous = normalize(this.uniqueCollectionState, this.collectedIdentityIds);
    this.uniqueCollectionState = savedState();
    sync(this);
    const result = baseLoad.call(this);
    if (result === false) {
      this.uniqueCollectionState = previous;
      sync(this);
      return false;
    }
    this.uniqueCollectionState = savedState();
    sync(this);
    return result;
  };

  GameScene.prototype.showCollection = function (options = {}) {
    if (!options.score && !options.saved) sync(this);
    return baseShowCollection.call(this, options);
  };

  GameScene.prototype.showHome = function () {
    if (this.runActive) sync(this);
    return baseShowHome.call(this);
  };

  window.CometCollectionState = Object.freeze({
    model: 'explicit-toggle-map',
    blank,
    current(scene) { return { ...sync(scene) }; },
    collected(scene, id) { return sync(scene)[id] === true; }
  });
})();
