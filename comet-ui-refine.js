// Crisp mobile UI typography. Sprites can stay pixel-like; interface text should not.
(() => {
  const originalText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  const SCALE = 1.28;
  const UI_FONT = "Avenir Next, Avenir, Helvetica Neue, Helvetica, Arial, sans-serif";

  Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
    const next = { ...(style || {}) };
    const raw = next.fontSize;
    if (raw !== undefined && raw !== null) {
      const n = parseFloat(raw);
      if (Number.isFinite(n)) next.fontSize = `${Math.round(n * SCALE * 10) / 10}px`;
    }
    next.fontFamily = UI_FONT;
    const obj = originalText.call(this, Math.round(x), Math.round(y), text, next);
    if (obj.setResolution) obj.setResolution(8);
    if (obj.setPadding) obj.setPadding(3, 4, 3, 4);
    return obj;
  };
})();
