// Legacy compatibility shim.
// Do NOT override Phaser's renderer here: browser and Home Screen mode must share Phaser.AUTO + Scale.FIT.
// This file intentionally remains a no-op so an older cached index.html cannot request a missing file.
window.__COMET_RENDER_MODE_LEGACY_NOOP = true;
