const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const continuity = fs.readFileSync('comet-sprite-continuity-v1.js', 'utf8');
const checkpoint = fs.readFileSync('comet-checkpoint-lock-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-sprite-continuity-v1.js?v=1'), 'sprite continuity patch must be loaded');
const pos = index.indexOf('comet-sprite-continuity-v1.js?v=1');
assert(pos > index.indexOf('comet-run-collection-v1.js?v=1'), 'sprite continuity patch must load last');
assert(index.slice(pos).indexOf('<script src=') === -1, 'no later script may override sprite continuity methods');

assert(continuity.includes("'cometVisualVariant'"), 'serializable sprite variant field missing');
assert(continuity.includes("'cometVisualRotation'"), 'serializable sprite rotation field missing');
assert(continuity.includes('Phaser.Math.RND.pick([0, 90, 180, 270])'), 'orientation should use crisp quarter-turn randomness');
assert(continuity.includes('handle.effectsBack?.setAngle?.(rotation)'), 'back effects should rotate with sprite');
assert(continuity.includes('handle.effectsFront?.setAngle?.(rotation)'), 'front effects should rotate with sprite');
assert(continuity.includes('if (mystery)'), 'mystery rendering must be handled separately');
assert(continuity.includes('Never persist/force the mystery variant'), 'mystery variant must not leak into reveal appearance');
assert(continuity.includes('this._stagedPlayerAppearance = appearanceSnapshot(object)'), 'absorb/merge result sprite must stage its appearance');
assert(continuity.includes("pending?.result === 'absorb' || pending?.result === 'merge'"), 'only successful absorb/merge should adopt result appearance');
assert(continuity.includes('adoptAppearance(this.player, staged)'), 'real player must adopt animation result appearance');
assert(continuity.includes("this.pending?.result === 'merge'"), 'merge prediction correction missing');
assert(continuity.includes('original.apply(this, args) * 1.2'), 'merge preview tier must use the real 1.2x growth multiplier');
assert(continuity.includes("preservesThroughSave: true"), 'continuity should document save persistence');

// Protected checkpoint copies enumerable player fields, including cometVisual* appearance values.
assert(checkpoint.includes('player: scene.player ? { ...scene.player } : null'), 'checkpoint must persist player appearance fields');
assert(checkpoint.includes('player: data.player ? { ...data.player } : null'), 'checkpoint load must restore player appearance fields');

console.log('sprite continuity + random orientation regression checks passed');
