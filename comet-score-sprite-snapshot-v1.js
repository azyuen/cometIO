// High-score sprite snapshots.
// Every NEW score stores the exact final player object/appearance so the leaderboard can render the
// sprite that actually belonged to that run instead of borrowing the current scene player's skin.
(() => {
  const proto = GameScene.prototype;
  const baseShowScores = proto.showScores;

  function n(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function i(value) {
    return Math.max(0, Math.floor(n(value)));
  }

  function cleanCollection(scene) {
    const out = [];
    const seen = new Set();
    const fromState = scene.uniqueCollectionState && typeof scene.uniqueCollectionState === 'object'
      ? COMET_COLLECTIBLE_IDENTITIES.filter(identity => scene.uniqueCollectionState[identity.id] === true).map(identity => identity.id)
      : scene.collectedIdentityIds;
    for (const id of Array.isArray(fromState) ? fromState : []) {
      if (!COMET_COLLECTIBLE_BY_ID?.[id] || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function finalPlayerSnapshot(scene) {
    const idx = Math.max(0, Math.min(TIERS.length - 1, Number(scene.tierIndex) || 0));
    const tier = TIERS[idx];
    const player = scene.player || {};
    return {
      ...player,
      name: player.name || tier.name,
      realName: player.realName || player.name || tier.name,
      tier: idx,
      radiusM: Number.isFinite(Number(player.radiusM)) ? Number(player.radiusM) : tier.r,
      massKg: Number.isFinite(Number(player.massKg)) ? Number(player.massKg) : tier.m,
      speedMS: Number.isFinite(Number(player.speedMS)) ? Number(player.speedMS) : tier.v,
      kind: player.kind || tier.kind,
      color: player.color ?? tier.color,
      solid: player.solid ?? tier.solid
    };
  }

  // Replace the layered legacy writers with one final writer that preserves all current metadata
  // plus the exact final player sprite snapshot.
  proto.saveScoreAs = function (name) {
    if (!this.qualifies()) return;

    const scores = this.getScores();
    const history = Array.isArray(this.actionHistory) ? [...this.actionHistory] : [];
    const absorbs = history.filter(x => x === 'ABSORB').length;
    const deflects = history.filter(x => x === 'DEFLECT').length;
    const avoids = history.filter(x => x === 'AVOID').length;
    const collection = cleanCollection(this);

    scores.push({
      name: String(name || 'PLAYER').trim().slice(0, 12).toUpperCase() || 'PLAYER',
      score: n(this.score),
      massKg: Number(this.player?.massKg) || TIERS[this.tierIndex]?.m || 0,
      tierIndex: Math.max(0, Math.min(TIERS.length - 1, Number(this.tierIndex) || 0)),
      object: TIERS[this.tierIndex]?.name || this.player?.name || 'OBJECT',
      actions: { total: absorbs + deflects + avoids, absorbs, deflects, avoids },
      streak: history,
      saves: i(this.manualSaves),
      loads: i(this.manualLoads),
      scorePenalty: i(this.scorePenalty),
      collection,
      collectedIdentityIds: [...collection],
      collectionBonusScore: collection.length * 200,
      playerSprite: finalPlayerSnapshot(this),
      playerSpriteVersion: 1,
      date: Date.now()
    });

    scores.sort((a, b) => n(b.score) - n(a.score));
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 5)));
  };

  function legacyTierObject(score) {
    const idx = Math.max(0, Math.min(TIERS.length - 1, Number(score?.tierIndex) || 0));
    const tier = TIERS[idx];
    return {
      name: tier.name,
      realName: tier.name,
      tier: idx,
      radiusM: tier.r,
      massKg: Number(score?.massKg) || tier.m,
      speedMS: tier.v,
      kind: tier.kind,
      color: tier.color,
      solid: tier.solid
    };
  }

  function scoreSpriteObject(score) {
    if (!score?.playerSprite || typeof score.playerSprite !== 'object') return legacyTierObject(score);
    const idx = Math.max(0, Math.min(TIERS.length - 1, Number(score.tierIndex) || Number(score.playerSprite.tier) || 0));
    const tier = TIERS[idx];
    return {
      ...score.playerSprite,
      name: score.playerSprite.name || tier.name,
      realName: score.playerSprite.realName || score.playerSprite.name || tier.name,
      tier: idx,
      radiusM: Number.isFinite(Number(score.playerSprite.radiusM)) ? Number(score.playerSprite.radiusM) : tier.r,
      massKg: Number.isFinite(Number(score.playerSprite.massKg)) ? Number(score.playerSprite.massKg) : (Number(score.massKg) || tier.m),
      speedMS: Number.isFinite(Number(score.playerSprite.speedMS)) ? Number(score.playerSprite.speedMS) : tier.v,
      kind: score.playerSprite.kind || tier.kind,
      color: score.playerSprite.color ?? tier.color,
      solid: score.playerSprite.solid ?? tier.solid
    };
  }

  function findRenderedCardSprite(scene, x, y) {
    return (scene.ui?.list || []).find(child =>
      child?.cometVisual && Math.abs(Number(child.x) - x) < 3 && Math.abs(Number(child.y) - y) < 4
    ) || null;
  }

  proto.showScores = function (returnTo = 'home') {
    const result = baseShowScores.call(this, returnTo);
    const scores = this.getScores();

    scores.forEach((score, index) => {
      // gameplay-refine-v1 is the final score-card layout: sprite centre x=48, y=164+i*116 + 1.
      const y = this.Y(164 + index * 116) + 1;
      const old = findRenderedCardSprite(this, 48, y);
      if (old) {
        try { this.ui.remove(old, false); } catch (e) {}
        try { old.destroy(true); } catch (e) {}
      }
      this.drawObject(48, y, 18, scoreSpriteObject(score), false, false);
    });

    return result;
  };

  window.CometScoreSpriteSnapshot = Object.freeze({
    version: 1,
    exactForNewScores: true,
    legacyFallback: 'tier-only'
  });
})();
