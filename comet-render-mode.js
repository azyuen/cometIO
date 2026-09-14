// iOS Home Screen rendering safety.
// The rainbow/black rectangle corruption has now reproduced on multiple unrelated transparent PNG
// sprites (including Atom and Saturn), which points to the standalone WebGL texture path rather than
// one bad asset. Use Phaser Canvas only for iOS/iPadOS Home Screen mode; normal browser play and
// non-iOS installs keep Phaser.AUTO/WebGL. Scale.FIT and the rest of the game config are unchanged.
(() => {
  if (typeof window === 'undefined' || !window.COMET_STANDALONE || window.__COMET_IOS_CANVAS_PATCH) return;

  const nav = window.navigator || {};
  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && Number(nav.maxTouchPoints || 0) > 1);
  if (!isIOS || typeof Phaser === 'undefined' || !Phaser.Game) return;

  window.__COMET_IOS_CANVAS_PATCH = true;
  const BaseGame = Phaser.Game;

  Phaser.Game = class CometIOSCanvasGame extends BaseGame {
    constructor(config = {}) {
      super({
        ...config,
        type: Phaser.CANVAS
      });
    }
  };
})();
