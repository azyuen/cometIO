// Mobile readability pass: UI text is modern, large and high-resolution.
(() => {
  const originalText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  const SCALE = 1.28;
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
    if (obj.setResolution) obj.setResolution(6);
    if (obj.setPadding) obj.setPadding(2, 2, 2, 2);
    return obj;
  };
})();
