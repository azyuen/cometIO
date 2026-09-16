// Result-card visual fidelity + physically directional fragmentation animation.
// 1) Freeze the exact rendered SCALE REVEAL sprites before animation so the result comparison card
//    shows the same player/opponent variants, rotations, flips and tints the player just saw.
// 2) A survivable normal FRAGMENT outcome is a glancing impact. The SMALLER body is the one that
//    visibly deflects away from the larger body. The outgoing path is about 160 degrees measured
//    from the incoming direction: only ~20 degrees off a straight-back continuation, not a sharp
//    pinball-style <30 degree bounce.
(() => {
  const baseAnimate = GameScene.prototype.animate;
  const baseDrawResult = GameScene.prototype.drawResult;
  const baseShortOutcomeReason = GameScene.prototype.shortOutcomeReason;

  function renderedSnapshot(object, container) {
    if (!object) return null;
    const snapshot = { ...object };
    const handle = container?.cometVisual;
    const image = handle?.image;
    if (handle?.variant) snapshot.cometVisualVariant = handle.variant;
    if (image) {
      const angle = Number(image.angle);
      if (Number.isFinite(angle)) snapshot.cometVisualRotation = angle;
      snapshot.cometVisualFlipX = !!image.flipX;
      snapshot.cometVisualAlpha = Number.isFinite(Number(image.alpha)) ? Number(image.alpha) : 1;
      if (Object.prototype.hasOwnProperty.call(handle, 'tint')) snapshot.cometVisualTint = handle.tint ?? null;
    }
    return snapshot;
  }

  function freezeComparison(scene, playerContainer, otherContainer) {
    scene._resultComparisonPlayer = renderedSnapshot(scene.player, playerContainer);
    scene._resultComparisonOther = renderedSnapshot(scene.other, otherContainer);
  }

  function addFragmentDebris(scene, x, y, color, direction = 1, verticalSign = 1) {
    const flash = scene.add.circle(x, y, 7, C.white, .9);
    const ring = scene.add.circle(x, y, 11, C.orange, .06);
    ring.setStrokeStyle(2, C.orange, .9);
    scene.ui.add([flash, ring]);
    scene.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 170, ease: 'Quad.out', onComplete: () => flash.destroy() });
    scene.tweens.add({ targets: ring, scale: 3.0, alpha: 0, duration: 360, ease: 'Cubic.out', onComplete: () => ring.destroy() });

    for (let i = 0; i < 15; i++) {
      // Debris follows the shallow grazing direction rather than exploding perpendicular to travel.
      const base = direction > 0 ? 0 : Math.PI;
      const angle = base + verticalSign * Phaser.Math.FloatBetween(.10, .42) + Phaser.Math.FloatBetween(-.16, .16);
      const distance = Phaser.Math.Between(24, 68);
      const chip = scene.add.rectangle(x + Phaser.Math.Between(-3, 3), y + Phaser.Math.Between(-3, 3), Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 5), i % 5 === 0 ? C.white : (color || C.orange), Phaser.Math.FloatBetween(.6, .95));
      chip.rotation = angle;
      scene.ui.add(chip);
      scene.tweens.add({ targets: chip, x: chip.x + Math.cos(angle) * distance, y: chip.y + Math.sin(angle) * distance, alpha: 0, scale: .25, duration: Phaser.Math.Between(330, 620), ease: 'Quad.out', onComplete: () => chip.destroy() });
    }
  }

  function shallowExit(startX, startY, contactX, contactY, distance, verticalSign) {
    // Incoming vector points from start -> contact. A 160-degree scattering angle is equivalent to
    // reversing that vector and deviating only 20 degrees. This gives a visibly glancing deflection.
    const incoming = Math.atan2(contactY - startY, contactX - startX);
    const outgoing = incoming + Math.PI + verticalSign * Phaser.Math.DegToRad(20);
    return {
      x: contactX + Math.cos(outgoing) * distance,
      y: contactY + Math.sin(outgoing) * distance,
      angle: Phaser.Math.RadToDeg(outgoing)
    };
  }

  function animateFragmentRicochet(scene, playerSprite, otherSprite, pr, or) {
    scene.tweens.killTweensOf(playerSprite);
    scene.tweens.killTweensOf(otherSprite);
    const px = playerSprite.x, py = playerSprite.y;
    const ox = otherSprite.x, oy = otherSprite.y;
    const playerRadius = Math.max(1, Number(scene.player?.radiusM) || 1);
    const targetRadius = Math.max(1, Number(scene.other?.radiusM) || 1);
    const playerIsSmaller = playerRadius < targetRadius;
    const verticalSign = Math.random() < .5 ? -1 : 1;

    if (playerIsSmaller) {
      const contactX = ox - Math.max(12, Math.min(36, Number(or || 28) * .68));
      const contactY = oy + verticalSign * Math.max(5, Math.min(15, Number(or || 28) * .16));
      const exit = shallowExit(px, py, contactX, contactY, Math.max(250, W * .70), verticalSign);

      scene.tweens.add({ targets: playerSprite, x: contactX, y: contactY, angle: `+=${verticalSign * 8}`, duration: 525, ease: 'Quad.in' });
      scene.tweens.add({ targets: otherSprite, x: ox + 3, y: oy - verticalSign * 2, duration: 560, ease: 'Sine.inOut', yoyo: true });
      scene.time.delayedCall(510, () => {
        addFragmentDebris(scene, contactX - 5, contactY, scene.player?.color || C.orange, -1, verticalSign);
        scene.tweens.add({ targets: playerSprite, x: exit.x, y: exit.y, angle: exit.angle, alpha: .94, duration: 760, ease: 'Cubic.out' });
      });
    } else {
      const contactX = px + Math.max(12, Math.min(36, Number(pr || 28) * .68));
      const contactY = py + verticalSign * Math.max(5, Math.min(15, Number(pr || 28) * .16));
      const exit = shallowExit(ox, oy, contactX, contactY, Math.max(250, W * .70), verticalSign);

      scene.tweens.add({ targets: otherSprite, x: contactX, y: contactY, angle: `+=${verticalSign * 8}`, duration: 525, ease: 'Quad.in' });
      scene.tweens.add({ targets: playerSprite, x: px - 3, y: py - verticalSign * 2, duration: 560, ease: 'Sine.inOut', yoyo: true });
      scene.time.delayedCall(510, () => {
        addFragmentDebris(scene, contactX - 5, contactY, scene.player?.color || C.orange, -1, verticalSign);
        scene.tweens.add({ targets: otherSprite, x: exit.x, y: exit.y, angle: exit.angle, alpha: .94, duration: 760, ease: 'Cubic.out' });
      });
    }
    scene.time.delayedCall(1320, () => scene.resolve());
  }

  function normalFragment(scene, choice) {
    return choice === 'ABSORB' && scene.pending?.result === 'fragment' && !scene.pending?.highTierGlance && !scene.pending?.compactGravityReverse && !scene.pending?.compactGravityDeflect;
  }

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    freezeComparison(this, p, o);
    if (normalFragment(this, choice)) return animateFragmentRicochet(this, p, o, pr, or);
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  GameScene.prototype.drawResult = function (result) {
    const savedPlayer = this.preEncounterPlayer;
    const savedOther = this.preEncounterOther;
    if (this._resultComparisonPlayer) this.preEncounterPlayer = { ...this._resultComparisonPlayer };
    if (this._resultComparisonOther) this.preEncounterOther = { ...this._resultComparisonOther };
    try { return baseDrawResult.call(this, result); }
    finally {
      this.preEncounterPlayer = savedPlayer;
      this.preEncounterOther = savedOther;
      this._resultComparisonPlayer = null;
      this._resultComparisonOther = null;
    }
  };

  GameScene.prototype.shortOutcomeReason = function (pending, result) {
    if (pending?.choice === 'ABSORB' && pending?.result === 'fragment' && !pending?.highTierGlance && !pending?.compactGravityReverse) {
      const targetLarger = Number(this.other?.radiusM) > Number(this.player?.radiusM);
      return targetLarger ? 'Glancing impact: you fragmented and deflected away from the larger target.' : 'Glancing impact: the smaller target deflected away while you lost some material.';
    }
    return baseShortOutcomeReason.call(this, pending, result);
  };

  window.CometResultFidelity = Object.freeze({ frozenComparisonSprites: true, normalFragmentAnimation: 'smaller-body-160-degree-deflection', fragmentDeflectionDegrees: 160 });
})();
