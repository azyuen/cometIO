const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'comet-orbitals-v1.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

assert(index.includes('comet-orbitals-v1.js?v=2'), 'orbital layer cache version must include the HUD alignment update');
assert(index.indexOf('comet-orbitals-v1.js?v=2') > index.indexOf('comet-compact-gravity-v1.js?v=2'), 'orbital layer must wrap final mechanics');
assert(source.includes('const UNLOCK_TIER = 7'), 'orbitals must unlock at Dwarf Planet');
assert(source.includes('const DEFLECTS_PER_ORBITAL = 3'), 'three successful deflects must form one orbital');
assert(source.includes('const MAX_SACRIFICE = 3'), 'intervention must cap sacrifice at three');
assert(source.includes("10: [8, 9]"), 'yellow dwarfs must render rocky/gas planet orbitals');
assert(source.includes("8:  [6, 7]"), 'rocky planets must render asteroid/dwarf planet orbitals');
assert(source.includes('renderOrbitals(this)'), 'arena must render visible orbitals');
assert(source.includes('const titleX = x + 7'), 'HUD titles must align to the left edge of every card');
assert(source.includes('const valueX = index < 3 ? x + 34 : x + 7'), 'HUD values must retain icon clearance');
assert(source.includes('Math.pow(RISK_MULTIPLIER_PER_ORBITAL, selected)'), 'selector must preview cumulative risk reduction');
assert(source.includes("pending?.choice === 'DEFLECT'"), 'successful deflects must award orbital charge');
assert(source.includes('data.orbitalProgress'), 'manual saves must preserve partial orbital progress');
assert(!readme.toLowerCase().includes('speed/craters'), 'current player documentation must not advertise craters');

// Execute the patch against a tiny scene stub so the state transitions are checked as behavior,
// not only as source strings. Rendering methods are deliberately not invoked here.
class StubScene {}
StubScene.prototype.resetRun = function () {};
StubScene.prototype.drawHud = function () {};
StubScene.prototype.drawArena = function () {};
StubScene.prototype.showHome = function () {};
StubScene.prototype.choose = function () { this.legacyChooseCalled = true; };
StubScene.prototype.resolve = function () { this.resolveSawProgress = this.orbitalProgress; };
StubScene.prototype.drawResult = function (result) { return result; };
StubScene.prototype.save = function () { return true; };
StubScene.prototype.load = function () { return true; };
StubScene.prototype.update = function () {};

const sandbox = {
  GameScene: StubScene,
  TIERS: Array.from({ length: 17 }, (_, tier) => ({ tier, name: `T${tier}`, examples: [], r: 1, m: 1, v: 1 })),
  C: { cyan: 1, orange: 2, white: 3, green: 4, red: 5, muted: 6, panel: 7, rock: 8 },
  SAFE_TOP: 0,
  W: 420,
  FONT: 'sans-serif',
  SAVE_KEY: 'save',
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {}
};
vm.runInNewContext(source, sandbox, { filename: 'comet-orbitals-v1.js' });

assert.deepStrictEqual([...sandbox.window.CometOrbitals.tierPool(8)], [6, 7], 'rocky planet pool must be asteroid/dwarf planet');
assert.deepStrictEqual([...sandbox.window.CometOrbitals.tierPool(10)], [8, 9], 'Sun pool must be rocky/gas planet');

const rewardScene = new StubScene();
Object.assign(rewardScene, {
  tierIndex: 8,
  orbitalsUnlocked: true,
  orbitalCount: 0,
  orbitalProgress: 2,
  pending: { choice: 'DEFLECT', result: 'clean', success: true },
  _devModeActive: false
});
rewardScene.resolve();
assert.strictEqual(rewardScene.orbitalCount, 1, 'third successful deflect must form an orbital');
assert.strictEqual(rewardScene.orbitalProgress, 0, 'progress must reset after forming an orbital');
assert.strictEqual(rewardScene.pending.orbitalFormed, true, 'result must be marked as a newly formed orbital');

const dangerScene = new StubScene();
Object.assign(dangerScene, {
  tierIndex: 10,
  orbitalsUnlocked: true,
  orbitalCount: 2,
  orbitalProgress: 0,
  state: 'APPROACH',
  outcome: () => ({ choice: 'ABSORB', fatalChance: .6, result: 'catastrophic', success: false }),
  showOrbitalIntervention(choice, pending) { this.intervention = { choice, pending }; }
});
dangerScene.choose('ABSORB');
assert.strictEqual(dangerScene.intervention.choice, 'ABSORB', 'high-risk choice must open orbital intervention');

const lowRiskScene = new StubScene();
Object.assign(lowRiskScene, {
  tierIndex: 10,
  orbitalsUnlocked: true,
  orbitalCount: 2,
  orbitalProgress: 0,
  state: 'APPROACH',
  outcome: () => ({ choice: 'AVOID', chance: .95, success: true }),
  tweens: { killAll() {} },
  reveal(choice) { this.revealedChoice = choice; }
});
lowRiskScene.choose('AVOID');
assert.strictEqual(lowRiskScene.revealedChoice, 'AVOID', 'low-risk choices must continue without an extra panel');

console.log('Orbital regression checks passed.');
