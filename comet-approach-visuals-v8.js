// Decision-stage visual polish only. Gameplay/reveal scale logic is untouched.
(() => {
  const APPROACH_RADIUS = 16; // 32px displayed diameter in game coordinates.

  GameScene.prototype.drawArena = function () {
    const d = this.add.graphics();
    d.lineStyle(8, C.cyan, .07).lineBetween(0, this.Y(610), W, this.Y(226));
    d.lineStyle(3, C.cyan, .9).lineBetween(0, this.Y(610), W, this.Y(226));
    this.ui.add(d);

    // During the choice phase both bodies still occupy the same apparent size, so physical scale is
    // not leaked early. But named collectible identities now use their REAL art immediately. Hiding
    // Earth, Saturn, Eris, etc. behind a generic brown/grey mystery sprite was visually redundant and
    // made the named sprite system look broken. Anonymous/non-collectible encounters remain UNKNOWN.
    const namedCollectible = !!COMET_COLLECTIBLE_BY_ID?.[this.other?.identityId];
    this.youSprite = this.drawObject(128, this.Y(330), APPROACH_RADIUS, this.player, false, false);
    this.otherSprite = this.drawObject(303, this.Y(480), APPROACH_RADIUS, this.other, !namedCollectible, false);

    // Legacy trail/debris decorations were designed for placeholder circles and can interfere with
    // finished PNG sprites. Keep them only while an object is still using the procedural fallback.
    const playerUsesSprite = !!this.youSprite?.cometVisual && !this.youSprite.cometVisual.fallback;
    const targetUsesSprite = !!this.otherSprite?.cometVisual && !this.otherSprite.cometVisual.fallback;
    if (!playerUsesSprite) this.trail(128, this.Y(330));
    if (!targetUsesSprite) this.specks(303, this.Y(480));

    this.addText(14, this.Y(170), 'YOU', 10, C.green, { bold: true });
    this.addText(
      W - 14,
      this.Y(603),
      namedCollectible ? this.other.realName : 'UNKNOWN',
      10,
      C.orange,
      { bold: true, ox: 1, width: 210, align: 'right' }
    );

    this.tweens.add({
      targets: this.youSprite,
      x: '+=4', y: '-=2', duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
    this.tweens.add({
      targets: this.otherSprite,
      x: '-=3', y: '+=2', duration: 760, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });
  };
})();
