// DEV scale fidelity patch.
// The collision lab must show the same display radii as the live SCALE REVEAL, not a normalized
// side-by-side comparison. That makes it useful for judging whether sprites are distinguishable in play.
(() => {
  const baseShowDevLab = GameScene.prototype.showDevLab;
  const baseShowDevResult = GameScene.prototype.showDevResult;

  function destroyTrackedPreview(scene) {
    (scene._devPreviewObjects || []).forEach(object => {
      try { object?.destroy?.(true); } catch (e) {}
    });
    scene._devPreviewObjects = [];
  }

  function track(scene, object) {
    if (!scene._devPreviewObjects) scene._devPreviewObjects = [];
    scene._devPreviewObjects.push(object);
    return object;
  }

  function setExactDiameter(displayObject, diameter) {
    if (!displayObject) return;
    if (!displayObject.cometVisual?.fallback && typeof displayObject.setVisualDisplayDiameter === 'function') {
      displayObject.setVisualDisplayDiameter(diameter);
      return;
    }
    const visualDiameter = Math.max(1, Number(displayObject.cometVisual?.baseDisplayDiameterPx) || diameter);
    displayObject.setScale(diameter / visualDiameter);
  }

  // Override the normalized DEV preview with the canonical production reveal sizing function.
  GameScene.prototype.refreshDevPreview = function () {
    if (!this._devModeActive || this.state !== 'DEV_LAB' || !this._devObjectA || !this._devObjectB) return;
    destroyTrackedPreview(this);

    const a = this._devObjectA;
    const b = this._devObjectB;
    const sizing = this.getRevealDisplayRadii(a, b);

    // Keep the selector screen side-by-side for usability, but use the EXACT radii the live game
    // will use after SCALE REVEAL. No extra fit-to-preview or normalization is applied here.
    track(this, this.drawObject(105, this.Y(323), sizing.playerRadius, a, false, false));
    track(this, this.drawObject(315, this.Y(323), sizing.otherRadius, b, false, false));

    track(this, this.addText(105, this.Y(454), a.realName, 8.2, C.green, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    track(this, this.addText(315, this.Y(454), b.realName, 8.2, C.orange, {
      ox: .5, bold: true, align: 'center', width: 180
    }));

    track(this, this.addText(105, this.Y(476), `GAME Ø ${Math.round(sizing.playerRadius * 2)} px`, 7.1, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    track(this, this.addText(315, this.Y(476), `GAME Ø ${Math.round(sizing.otherRadius * 2)} px`, 7.1, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
  };

  GameScene.prototype.showDevLab = function () {
    const result = baseShowDevLab.call(this);

    // Make the screen explicit about what is being tested.
    (this.ui?.list || []).forEach(child => {
      if (!child || typeof child.text !== 'string') return;
      if (child.text === 'RELATIVE SCALE PREVIEW') child.setText('EXACT IN-GAME REVEAL SIZE');
      if (child.text === 'SELECT TWO OBJECTS • SIZES ARE AUTO-GENERATED') {
        child.setText('SELECT TWO OBJECTS • LIVE GAME SCALE');
      }
    });
    return result;
  };

  GameScene.prototype.showDevResult = function () {
    const result = baseShowDevResult.call(this);
    if (!this.player || !this.other) return result;

    const sizing = this.getRevealDisplayRadii(this.player, this.other);
    const objects = (this.ui?.list || []).filter(child => child?.cometVisual);
    const left = objects.find(child => Math.abs((child.x || 0) - 105) < 2);
    const right = objects.find(child => Math.abs((child.x || 0) - 315) < 2);

    setExactDiameter(left, sizing.playerRadius * 2);
    setExactDiameter(right, sizing.otherRadius * 2);
    return result;
  };
})();
