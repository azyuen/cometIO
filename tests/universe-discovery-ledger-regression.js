// Regression: the Universe Map is a permanent discovery ledger, not a top-five-score view.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-universe-atlas-v3.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('comet-universe-atlas-v3.js?v=5'), 'atlas fix needs a cache-busted script');

const objects = ['planet_mars', 'planet_venus', 'planet_earth', 'planet_jupiter'].map(id => ({
  id, name: id, gameplayTiers: ['PLANET']
}));
const byId = Object.fromEntries(objects.map(o => [o.id, o]));
const storageMap = new Map();
const storage = {
  getItem(k) { return storageMap.get(k) ?? null; },
  setItem(k, v) { storageMap.set(k, String(v)); },
  removeItem(k) { storageMap.delete(k); }
};
const boardKey = 'cometio-highscores-v1';
const saveKey = 'cometio-protected-checkpoint-v2';
storage.setItem(boardKey, JSON.stringify([
  { score: 100, collection: ['planet_mars'], galaxyCollection: ['andromeda'] },
  { score: 90, collectedIdentityIds: ['planet_earth'], collectionState: { planet_venus: true } }
]));
storage.setItem(saveKey, JSON.stringify({
  collectedIdentityIds: ['planet_earth'], phase4GalaxyCollection: ['whirlpool']
}));

class GameScene {
  getScores() { return JSON.parse(storage.getItem(boardKey) || '[]'); }
  resetRun() { this.collectedIdentityIds = []; this.phase4GalaxyCollection = []; return true; }
  resolve() { return 'resolved'; }
  drawResult() { return 'rendered'; }
  save() { return true; }
  load() { return true; }
  showScores() { return true; }
}
const browser = {};
vm.runInNewContext(source, {
  GameScene,
  COMET_COLLECTIBLE_IDENTITIES: objects,
  COMET_COLLECTIBLE_BY_ID: byId,
  COMET_IDENTITY_BY_ID: byId,
  window: browser,
  localStorage: storage,
  SAVE_KEY: 'cometio-save-v2',
  SCORES_KEY: boardKey,
  C: { white: 0xffffff, green: 0x00ff00 },
  FONT: 'monospace', W: 420, H: 840, Phaser: {}
});
const atlas = browser.CometUniverseAtlasV3;
const scene = new GameScene();
const ledgerKey = atlas.ledgerStorageKey;

// Historical discoveries from scores/checkpoints are migrated immediately on app load.
assert(ledgerKey && storage.getItem(ledgerKey), 'a separate permanent discovery key must be written');
for (const id of ['planet_mars', 'planet_earth', 'planet_venus'])
  assert(atlas.getDiscoveredObjects(scene).includes(id), 'old object missing: ' + id);
for (const id of ['andromeda', 'whirlpool'])
  assert(atlas.getDiscoveredGalaxies(scene).includes(id), 'old galaxy missing: ' + id);

// Simulate falling out of the top five, clearing a checkpoint, then acquiring something new.
storage.setItem(boardKey, '[]');
storage.removeItem(saveKey);
assert(atlas.getDiscoveredObjects(scene).includes('planet_mars'), 'pruning scores lost an object');
scene.collectedIdentityIds = ['planet_jupiter'];
scene.phase4GalaxyCollection = ['cartwheel'];
assert.strictEqual(scene.drawResult({ survived: true }), 'rendered');
assert(atlas.getDiscoveredObjects(scene).includes('planet_jupiter'), 'live pickup not recorded');
assert(atlas.getDiscoveredGalaxies(scene).includes('cartwheel'), 'live galaxy pickup not recorded');

// Per-run collection resets, but the separate atlas history must not.
scene.resetRun();
assert.deepStrictEqual(scene.collectedIdentityIds, [], 'new run should reset live collection');
assert.deepStrictEqual(scene.phase4GalaxyCollection, [], 'new run should reset live galaxies');
assert(atlas.getDiscoveredObjects(scene).includes('planet_jupiter'), 'restart erased atlas objects');
assert(atlas.getDiscoveredGalaxies(scene).includes('cartwheel'), 'restart erased atlas galaxies');

// Lab-sandbox discoveries may not affect the permanent atlas.
scene._labSandboxRun = true;
scene.collectedIdentityIds = ['not_real'];
scene.phase4GalaxyCollection = ['antennae'];
scene.drawResult({ survived: true });
assert(!atlas.getDiscoveredGalaxies(scene).includes('antennae'), 'lab galaxy leaked into atlas');
assert(!atlas.getDiscoveredObjects(scene).includes('not_real'), 'invalid object leaked into atlas');

// No synthetic leaderboard entries or altered rankings are allowed.
assert.deepStrictEqual(JSON.parse(storage.getItem(boardKey)), [], 'atlas changed the leaderboard');
const persisted = JSON.parse(storage.getItem(ledgerKey));
assert(persisted.objects.includes('planet_mars') && persisted.objects.includes('planet_jupiter'),
  'permanent object history was not persisted');
assert(persisted.galaxies.includes('andromeda') && persisted.galaxies.includes('cartwheel'),
  'permanent galaxy history was not persisted');
assert(!source.includes('REVEALED FROM TOP 5'), 'atlas UI should not imply top-five-only data');

console.log('Universe Atlas permanent discoveries regression checks passed.');
