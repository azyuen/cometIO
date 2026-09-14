// Sprite-safe reveal animation.
// Procedural objects may use container scaling; PNG-backed objects animate their display diameter instead.
(() => {
  function revealSizeTween(scene, objectContainer, finalDiameter, duration = 900) {
    const startDiameter = 38;
    const hasSpriteSizing = !!objectContainer?.cometVisual?.image &&
      typeof objectContainer.setVisualDisplayDiameter === 'function';

    objectContainer.setAlpha(.9);

    if (!hasSpriteSizing) {
      const startScale = startDiameter / Math.max(finalDiameter, 1);
      objectContainer.setScale(startScale);
      scene.tweens.add({
        targets: objectContainer,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration,
        ease: 'Cubic.out'
      });
      return;
    }

    // Keep the sprite container at 1:1. This avoids Safari repeatedly scaling a transparent texture quad.
    objectContainer.setScale(1);
    objectContainer.setVisualDisplayDiameter(startDiameter);

    scene.tweens.addCounter({
      from: startDiameter,
      to: finalDiameter,
      duration,
      ease: 'Cubic.out',
      onUpdate: tween => {
        if (objectContainer.active && typeof objectContainer.setVisualDisplayDiameter === 'function') {
          objectContainer.setVisualDisplayDiameter(tween.getValue());
        }
      }
    });
    scene.tweens.add({ targets: objectContainer, alpha: 1, duration, ease: 'Cubic.out' });
  }

  // Display scale follows GAME progression, not literal astronomical diameter.
  // This is important for compact remnants: a nebula is physically much wider than a pulsar or
  // stellar black hole, but PULSAR and BLACK HOLE are later/larger gameplay tiers. The collision
  // mechanics already use the same 2^tier-gap relationship (`gameRatio`) with a small within-tier
  // radius variation. Keeping reveal sizing on that same scale means:
  // NEBULA < PULSAR < BLACK HOLE < SUPER MASSIVE BLACK HOLE.
  GameScene.prototype.getGameDisplayScaleRatio = function (player = this.player, other = this.other) {
    const pTier = clamp(Number.isFinite(player?.tier) ? player.tier : 0, 0, TIERS.length - 1);
    const oTier = clamp(Number.isFinite(other?.tier) ? other.tier : 0, 0, TIERS.length - 1);
    const pReference = Math.max(TIERS[pTier]?.r || 1, 1e-300);
    const oReference = Math.max(TIERS[oTier]?.r || 1, 1e-300);
    const pWithin = Math.max((player?.radiusM || pReference) / pReference, 1e-9);
    const oWithin = Math.max((other?.radiusM || oReference) / oReference, 1e-9);
    const tierGap = oTier - pTier;
    return Math.pow(2, tierGap) * (oWithin / pWithin);
  };

  // Canonical display-size calculation used by the real SCALE REVEAL and by DEV testing.
  // DEV calls this exact function so its preview matches what players actually see.
  GameScene.prototype.getRevealDisplayRadii = function (player = this.player, other = this.other) {
    const ratio = this.getGameDisplayScaleRatio(player, other);
    let pr = 38, or = pr * ratio;

    // Preserve the gameplay-relative scale for close encounters. Only extreme differences are
    // compressed to keep both objects visible on a phone screen.
    if (ratio >= .2 && ratio <= 5) {
      pr = 38; or = 38 * ratio;
      if (or > 145) { const s = 145 / or; or *= s; pr *= s; }
      if (pr > 145) { const s = 145 / pr; pr *= s; or *= s; }
    } else {
      if (or > 145) { const s = 145 / or; or = 145; pr = Math.max(1.5, pr * s); }
      if (or < 5) { const s = 5 / Math.max(or, .00001); or = 5; pr = Math.min(145, pr * s); }
    }

    return { playerRadius: Math.max(1.5, pr), otherRadius: Math.max(1.5, or), ratio };
  };

  GameScene.prototype.reveal = function (choice) {
    this.clearUI(); this.drawHud(false);
    this.addText(W / 2, this.Y(157), 'SCALE REVEAL', 13, C.white, { ox: .5, bold: true });

    const sizing = this.getRevealDisplayRadii(this.player, this.other);
    const ratio = sizing.ratio;
    const pr = sizing.playerRadius;
    const or = sizing.otherRadius;

    const p = this.drawObject(102, this.Y(345), pr, this.player);
    const o = this.drawObject(318, this.Y(410), or, this.other);

    const a = this.addText(18, this.Y(542), `YOU\n${this.player.name}`, 10, C.green, { bold: true, lineSpacing: 4, width: 165 });
    const b = this.addText(W - 18, this.Y(542), `${this.other.realName}\n${this.other.name}`, 10, C.orange, { ox: 1, align: 'right', bold: true, lineSpacing: 4, width: 195 });
    a.setAlpha(0); b.setAlpha(0);
    this.addText(W / 2, this.Y(607), this.scaleRelation(ratio), 9.5, C.muted, { ox: .5, bold: true });

    revealSizeTween(this, p, Math.max(3, pr * 2));
    revealSizeTween(this, o, Math.max(3, or * 2));
    this.tweens.add({ targets: [a, b], alpha: 1, delay: 430, duration: 300 });

    const g = this.add.graphics();
    g.fillStyle(C.panel, .99).fillRoundedRect(10, this.Y(653), 400, 54, 8);
    g.lineStyle(2, C.cyan, .82).strokeRoundedRect(10, this.Y(653), 400, 54, 8);
    this.ui.add(g);
    this.addText(W / 2, this.Y(680), choice, 13, C.white, { ox: .5, oy: .5, bold: true });
    this.time.delayedCall(1500, () => this.animate(choice, p, o, pr, or));
  };
})();
