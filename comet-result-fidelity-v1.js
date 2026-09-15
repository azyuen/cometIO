// Result-card visual fidelity + normal fragmentation animation.
// 1) Freeze the exact rendered SCALE REVEAL sprites before animation so the result comparison card
//    shows the same player/opponent variants, rotations, flips and tints the player just saw.
// 2) A survivable normal FRAGMENT outcome is a glancing impact: the player remains, sheds material,
//    and the other body visibly ricochets away instead of the two sprites stopping on top of each other.
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
    // This runs after SCALE REVEAL has drawn both normal sprites and immediately before any action
    // animation mutates their positions/scales. It is therefore the authoritative "BEFORE" image.
    scene._resultComparisonPlayer = renderedSnapshot(scene.player, playerContainer);
    scene._resultComparisonOther = renderedSnapshot(scene.other, otherContainer);
  }

  function addFragmentDebris(scene, x, y, playerColor) {
    const flash = scene.add.circle(x, y, 7, C.white, .9);
    const ring = scene.add.circle(x, y, 11, C.orange, .06);
    ring.setStrokeStyle(2, C.orange, .9);
    scene.ui.add([flash, ring]);

    scene.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 170, ease: 'Quad.out', onComplete: () => flash.destroy() });
    scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 360, ease: 'Cubic.out', onComplete: () => ring.destroy() });

    // These chips come from the PLAYER side of the contact, matching the actual mass-loss mechanic.
    for (let i = 0; i < 16; i++) {
      const angle = Phaser.Math.FloatBetween(2.15, 4.15);
      const distance = Phaser.Math.Between(24, 70);
      const chip = scene.add.rectangle(
        x - Phaser.Math.Between(0, 5),
        y + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(2, 5),
        i % 5 === 0 ? C.white : (playerColor || C.orange),
        Phaser.Math.FloatBetween(.6, .95)
      );
      chip.rotation = angle;
      scene.ui.add(chip);
      scene.tweens.add({
        targets: chip,
        x: chip.x + Math.cos(angle) * distance,
        y: chip.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: .25,
        duration: Phaser.Math.Between(330, 620),
        ease: 'Quad.out',
        onComplete: () => chip.destroy()
      });
    }
  }

  function animateFragmentRicochet(scene, playerSprite, otherSprite, pr, or) {
    scene.tweens.killTweensOf(playerSprite);
    scene.tweens.killTweensOf(otherSprite);

    const px = playerSprite.x;
    const py = playerSprite.y;
    const ox = otherSprite.x;
    const oy = otherSprite.y;
    const contactX = px + Math.max(14, Math.min(38, Number(pr || 22) * .58));
    const contactY = py + 8;

    // Player is the body that loses material. It recoils slightly but stays on screen/dominant.
    scene.tweens.add({
      targets: playerSprite,
      x: px - 9,
      y: py + 4,
      duration: 535,
      ease: 'Quad.in',
      onComplete: () => {
        scene.tweens.add({
          targets: playerSprite,
          x: px - 3,
          y: py + 1,
          duration: 310,
          ease: 'Back.out'
        });
      }
    });

    // The target clips the player rather than meeting centre-to-centre.
    scene.tweens.add({
      targets: otherSprite,
      x: contactX,
      y: contactY,
      angle: '+=24',
      duration: 540,
      ease: 'Quad.in'
    });

    scene.time.delayedCall(525, () => {
      addFragmentDebris(scene, contactX - 4, contactY + 2, scene.player?.color || C.orange);

      // The other body visibly ricochets away after stripping material from the player.
      scene.tweens.add({
        targets: otherSprite,
        x: W + Math.max(38, Number(or || 24)),
        y: scene.Y(215),
        angle: '+=112',
        alpha: .92,
        duration: 650,
        ease: 'Cubic.out'
      });

      // Brief recoil pulse only; this is visual and the actual mass/radius loss happens in resolve().
      scene.tweens.add({
        targets: playerSprite,
        scaleX: .94,
        scaleY: .94,
        duration: 135,
        yoyo: true,
        ease: 'Sine.out'
      });
    });

    scene.time.delayedCall(1210, () => scene.resolve());
  }

  function normalFragment(scene, choice) {
    return choice === 'ABSORB' &&
      scene.pending?.result === 'fragment' &&
      !scene.pending?.highTierGlance &&
      !scene.pending?.compactGravityReverse &&
      !scene.pending?.compactGravityDeflect;
  }

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    freezeComparison(this, p, o);

    if (normalFragment(this, choice) && !this._devModeActive) {
      return animateFragmentRicochet(this, p, o, pr, or);
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  GameScene.prototype.drawResult = function (result) {
    const savedPlayer = this.preEncounterPlayer;
    const savedOther = this.preEncounterOther;

    // home-v4's result renderer already reads preEncounterPlayer/preEncounterOther. Feed it the
    // frozen rendered snapshots so it cannot regenerate a different random variant/orientation.
    if (this._resultComparisonPlayer) this.preEncounterPlayer = { ...this._resultComparisonPlayer };
    if (this._resultComparisonOther) this.preEncounterOther = { ...this._resultComparisonOther };

    try {
      return baseDrawResult.call(this, result);
    } finally {
      this.preEncounterPlayer = savedPlayer;
      this.preEncounterOther = savedOther;
      this._resultComparisonPlayer = null;
      this._resultComparisonOther = null;
    }
  };

  GameScene.prototype.shortOutcomeReason = function (pending, result) {
    if (pending?.choice === 'ABSORB' && pending?.result === 'fragment' && !pending?.highTierGlance && !pending?.compactGravityReverse) {
      return 'Glancing impact: material was stripped from you, but the other body ricocheted away.';
    }
    return baseShortOutcomeReason.call(this, pending, result);
  };

  window.CometResultFidelity = Object.freeze({
    frozenComparisonSprites: true,
    normalFragmentAnimation: 'player-sheds-material-target-ricochets'
  });
})();
