const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const mode = fs.readFileSync('comet-render-mode.js', 'utf8');
const stability = fs.readFileSync('comet-sprite-stability.js', 'utf8');
const manifest = fs.readFileSync('assets/sprites/sprite-manifest.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// Standalone/PWA uses Canvas, normal browser mode remains untouched.
assert(mode.includes('if (!window.COMET_STANDALONE'), 'render-mode patch must be standalone-only');
assert(mode.includes('type: Phaser.CANVAS'), 'standalone mode must force Phaser Canvas renderer');
assert(mode.includes("['atomic', 'comet']"), 'unstable runtime tints should be disabled only for current tinted sprite families');

// The patch has to run before comet-game creates the Phaser.Game instance.
assert(index.indexOf('comet-render-mode.js') < index.indexOf('comet-game.js'), 'render-mode patch must load before comet-game.js');

// Sprite reveal animation must animate display size, not transparent texture container scale.
assert(stability.includes('setVisualDisplayDiameter(startDiameter)'), 'sprite reveal must initialize via display diameter');
assert(stability.includes('setVisualDisplayDiameter(tween.getValue())'), 'sprite reveal must tween display diameter');
assert(stability.includes('const hasSpriteSizing'), 'procedural fallback detection missing');
assert(index.indexOf('comet-sprite-stability.js') > index.indexOf('comet-approach-visuals-v8.js'), 'stability reveal patch must load last');

// Cleaned comet art must be cache-busted so iOS Home Screen does not keep stale PNG bytes.
for (const variant of ['comet_01', 'comet_02', 'comet_03']) {
  const re = new RegExp(`${variant}:\\s+\\{ family: 'comet',\\s+lods: \\[32, 64\\], version: 2 \\}`);
  assert(re.test(manifest), `${variant} must be cache-busted to version 2`);
}

console.log('iOS sprite rendering regression checks passed');
