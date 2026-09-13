// iOS Home Screen stability: use Phaser's Canvas renderer instead of WebGL in standalone mode.
// Safari standalone has intermittently corrupted small transparent PNG textures into black/RGB quads.
(() => {
  if (!window.COMET_STANDALONE || window.__COMET_STANDALONE_CANVAS_PATCH) return;
  window.__COMET_STANDALONE_CANVAS_PATCH = true;

  // Disable runtime sprite tinting only in standalone mode. Browser/WebGL keeps the normal palettes.
  // Variant/rotation/flip still provide visual variation, and source PNG colours are unchanged.
  if (typeof COMET_VISUAL_FAMILIES !== 'undefined') {
    for (const familyName of ['atomic', 'comet']) {
      const family = COMET_VISUAL_FAMILIES[familyName];
      if (family) family.tintEnabled = false;
    }
  }

  const BaseGame = Phaser.Game;
  Phaser.Game = class CometStandaloneCanvasGame extends BaseGame {
    constructor(config = {}) {
      super({
        ...config,
        type: Phaser.CANVAS
      });
    }
  };
})();
