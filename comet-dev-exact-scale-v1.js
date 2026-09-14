// DEV scale behaviour patch.
// Selection screen mirrors the real APPROACH phase: both objects have the same apparent size.
// After an action is chosen, the DEV result can still show the true reveal scale for testing.
(() => {
  const baseShowDevLab = GameScene.prototype.showDevLab;
  const baseShowDevResult = GameScene.prototype.showDevResult;
  const DEV_APPROACH_RADIUS = 16; // Matches live approach: 32px displayed diameter.

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

  // Selector preview uses identical apparent size for every tier/object, just like gameplay APPROACH.
  GameScene.prototype.refreshDevPreview = function () {
    if (!this._devModeActive || this.state !== 'DEV_LAB' || !this._devObjectA || !this._devObjectB) return;
    destroyTrackedPreview(this);

    const a = this._devObjectA;
    const b = this._devObjectB;

    track(this, this.drawObject(105, this.Y(323), DEV_APPROACH_RADIUS, a, false, false));
    track(this, this.drawObject(315, this.Y(323), DEV_APPROACH_RADIUS, b, false, false));

    track(this, this.addText(105, this.Y(454), a.realName, 8.2, C.green, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    track(this, this.addText(315, this.Y(454), b.realName, 8.2, C.orange, {
      ox: .5, bold: true, align: 'center', width: 180
    }));

    track(this, this.addText(105, this.Y(476), 'APPROACH Ø 32 px', 7.1, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
    track(this, this.addText(315, this.Y(476), 'APPROACH Ø 32 px', 7.1, C.muted, {
      ox: .5, bold: true, align: 'center', width: 180
    }));
  };

  GameScene.prototype.showDevLab = function () {
    const result = baseShowDevLab.call(this);
    (this.ui?.list || []).forEach(child => {
      if (!child || typeof child.text !== 'string') return;
      if (child.text === 'RELATIVE SCALE PREVIEW' || child.text === 'EXACT IN-GAME REVEAL SIZE') {
        child.setText('IN-GAME APPROACH SIZE');
      }
      if (child.text === 'SELECT TWO OBJECTS • SIZES ARE AUTO-GENERATED' || child.text === 'SELECT TWO OBJECTS • LIVE GAME SCALE') {
        child.setText('SELECT TWO OBJECTS • SAME APPARENT SIZE');
      }
    });
    return result;
  };

  // Keep the DEV post-choice result faithful to the real SCALE REVEAL.
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
