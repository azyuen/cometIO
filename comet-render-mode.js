// Renderer compatibility shim.
// Earlier builds forced Phaser.CANVAS in iOS Home Screen mode while we were investigating the
// rainbow rectangle artefact. The source PNGs were later confirmed to contain those bad pixels,
// so the Canvas override is unnecessary and interferes with Phaser.Scale.FIT / high-DPI sizing in
// standalone mode. Keep this file as an explicit no-op so stale cached indexes can still load it.
(() => {
  window.__COMET_RENDER_MODE = 'AUTO';
  window.__COMET_RENDER_MODE_LEGACY_NOOP = true;
})();
