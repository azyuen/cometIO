const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const tierNames = [
  'ATOM', 'DUST PARTICLE', 'TINY METEORITE', 'LARGE METEORITE',
  'SMALL COMET', 'LARGER COMET', 'ASTEROID', 'DWARF PLANET',
  'ROCKY PLANET', 'GAS PLANET', 'YELLOW DWARF STAR', 'BLUE GIANT STAR',
  'RED HYPERGIANT STAR', 'NEBULA', 'PULSAR', 'BLACK HOLE',
  'SUPER MASSIVE BLACK HOLE'
];

global.TIERS = tierNames.map(name => ({ name }));
global.C = { orange: 0xff9d3d };
global.window = {};

class MockContainer {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.scaleX = 1;
    this.scaleY = 1;
    this.active = true;
    this.children = [];
  }
  add(items) {
    this.children.push(...(Array.isArray(items) ? items : [items]));
    return this;
  }
}

class MockImage {
  constructor(key) {
    this.key = key;
    this.width = 64;
    this.height = 64;
    this.displayWidth = 64;
    this.displayHeight = 64;
  }
  setAngle(v) { this.angle = v; return this; }
  setFlipX(v) { this.flipX = v; return this; }
  setAlpha(v) { this.alpha = v; return this; }
  setTint(v) { this.tint = v; return this; }
  setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; return this; }
  setTexture(key) {
    this.key = key;
    const lod = Number(key.split(':').pop());
    this.width = lod;
    this.height = lod;
    return this;
  }
}

class MockGraphics {
  fillStyle() { return this; }
  fillCircle() { return this; }
}

class MockText {
  setOrigin() { return this; }
  setResolution() { return this; }
  setText(text) { this.text = text; return this; }
}

class GameScene {}
GameScene.prototype.drawObject = function (x, y, radius, object, mystery) {
  const container = new MockContainer(x, y);
  container.fallbackProcedural = true;
  container.radius = radius;
  container.object = object;
  container.mystery = mystery;
  this.ui.add(container);
  return container;
};
global.GameScene = GameScene;

function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file });
}

load('comet-visual-config.js');
load('assets/sprites/sprite-manifest.js');
load('comet-visual-renderer.js');

function makeScene(textureKeys = []) {
  const scene = new GameScene();
  scene.textures = { exists: key => textureKeys.includes(key) };
  scene.ui = {
    items: [],
    add(object) { this.items.push(object); },
    addAt(object) { this.items.push(object); }
  };
  scene.add = {
    container: (x, y) => new MockContainer(x, y),
    image: (x, y, key) => new MockImage(key),
    graphics: () => new MockGraphics(),
    text: () => new MockText()
  };
  scene.load = {
    calls: [],
    image(key, assetPath) { this.calls.push([key, assetPath]); }
  };
  return scene;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expectedFamilies = [
  'atomic', 'dust', 'rock', 'rock', 'comet', 'comet', 'rock',
  'rockyPlanet', 'rockyPlanet', 'gasPlanet', 'star', 'star', 'star',
  'nebula', 'pulsar', 'blackHole', 'blackHole'
];

tierNames.forEach((name, index) => {
  const definition = window.CometVisuals.getDefinition({ name, tier: index });
  assert(definition.visualFamily === expectedFamilies[index], `visual family mismatch: ${name}`);
  assert(definition.collisionFamily, `missing collision family: ${name}`);
});

// With no PNGs registered, there must be zero preload requests and procedural fallback must work.
let scene = makeScene([]);
scene.preload();
assert(scene.load.calls.length === 0, 'empty asset manifest should preload zero PNGs');
let asteroid = { name: 'ASTEROID', tier: 6 };
let rendered = scene.drawObject(10, 20, 42, asteroid, true, false);
assert(rendered.fallbackProcedural === true, 'missing mystery sprite should use procedural fallback');
assert(rendered.cometCollisionFamily === 'rocky', 'fallback should expose collision family metadata');

// Register only normal rock art. It must NOT leak into mystery mode.
COMET_SPRITE_ASSETS.rock_01.lods = [32, 64, 128];
const rockTextures = [
  'comet-sprite:rock_01:32',
  'comet-sprite:rock_01:64',
  'comet-sprite:rock_01:128'
];
scene = makeScene(rockTextures);
rendered = scene.drawObject(10, 20, 42, { name: 'ASTEROID', tier: 6 }, true, false);
assert(rendered.fallbackProcedural === true, 'normal sprite must never substitute for missing mystery art');

// Normal render: 110px display should choose 128 LOD without changing its 110px displayed width.
const object = { name: 'ASTEROID', tier: 6 };
rendered = scene.drawObject(10, 20, 55, object, false, false);
assert(!rendered.fallbackProcedural, 'available normal sprite should render');
assert(rendered.cometVisual.lod === 128, '110px display should prefer 128 LOD');
assert(Math.round(rendered.cometVisual.image.displayWidth) === 110, 'LOD selection changed display width');

// Simulate Phaser scaling tween: effective 44px display should select 32 LOD, still without a base-size jump.
rendered.scaleX = rendered.scaleY = 0.4;
scene.update(0, 16);
assert(rendered.cometVisual.lod === 32, '44px effective display should switch to 32 LOD');
assert(Math.round(rendered.cometVisual.image.displayWidth) === 110, 'LOD texture swap changed base display width');

// Growth helper: explicit 70px display should choose 64 LOD and remain exactly 70px wide.
rendered.scaleX = rendered.scaleY = 1;
rendered.setVisualDisplayDiameter(70);
assert(rendered.cometVisual.lod === 64, '70px display should choose 64 LOD');
assert(Math.round(rendered.cometVisual.image.displayWidth) === 70, 'growth helper changed requested display width');

assert(window.CometVisuals.desiredLod(40) === 32, 'small LOD threshold failed');
assert(window.CometVisuals.desiredLod(70) === 64, 'normal LOD threshold failed');
assert(window.CometVisuals.desiredLod(110) === 128, 'detail LOD threshold failed');

console.log('visual architecture smoke tests passed');
