// Mobile readability pass: keep sprites stylised, but render all UI text as crisp modern type.
(() => {
  const originalText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  const SCALE = 1.14;
  const UI_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

  Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
    const next = { ...(style || {}) };
    const raw = next.fontSize;
    if (raw !== undefined && raw !== null) {
      const n = parseFloat(raw);
      if (Number.isFinite(n)) next.fontSize = `${Math.round(n * SCALE * 10) / 10}px`;
    }
    next.fontFamily = UI_FONT;
    const obj = originalText.call(this, x, y, text, next);
    if (obj.setResolution) obj.setResolution(4);
    return obj;
  };
})();
