// Collection integrity guard.
// Runs at result-render time, after all current mechanics wrappers have resolved the encounter.
// This makes collection registration independent of which ABSORB resolver produced the successful
// result, while remaining idempotent with comet-collection-v1's original registration path.
(() => {
  const UNIQUE_COLLECTION_BONUS = 200;
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

  function isTrueAbsorb(pending, result) {
    if (!pending || pending.choice !== 'ABSORB' || result?.survived === false) return false;
    if (pending.compactGravityReverse) return false; // the compact TARGET captured/fragmented you
    if (pending.success === false) return false;

    // Only outcomes where the target actually becomes part of the player count as collected.
    // Fragment/setback survival is not an absorption.
    const type = String(pending.result || '').toLowerCase();
    if (!type) return true;
    return type === 'absorb' || type === 'merge' || type === 'clean';
  }

  function registerPickup(scene, result) {
    if (scene._devModeActive || !isTrueAbsorb(scene.pending, result)) return;

    const identityId = scene.other?.identityId;
    const identity = identityId ? COMET_COLLECTIBLE_BY_ID?.[identityId] : null;
    if (!identity) return;

    const ids = validIds(scene.collectedIdentityIds);
    if (ids.includes(identityId)) {
      scene.collectedIdentityIds = ids;
      scene.collectionBonusScore = ids.length * UNIQUE_COLLECTION_BONUS;
      return;
    }

    ids.push(identityId);
    scene.collectedIdentityIds = ids;
    scene.collectionBonusScore = ids.length * UNIQUE_COLLECTION_BONUS;
    scene.score = (Number(scene.score) || 0) + UNIQUE_COLLECTION_BONUS;
    scene._lastCollectionPickup = {
      id: identityId,
      name: identity.name,
      bonus: UNIQUE_COLLECTION_BONUS
    };
  }

  GameScene.prototype.drawResult = function (result) {
    registerPickup(this, result);
    return baseDrawResult.call(this, result);
  };

  window.CometCollectionIntegrity = Object.freeze({
    isCollected(scene, id) {
      return validIds(scene?.collectedIdentityIds).includes(id);
    }
  });
})();
