const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const score = fs.readFileSync('comet-score-sprite-snapshot-v1.js', 'utf8');
const collection = fs.readFileSync('comet-collection-scroll-polish-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-score-sprite-snapshot-v1.js?v=1'), 'score sprite snapshot patch must load');
assert(index.includes('comet-collection-scroll-polish-v1.js?v=1'), 'collection scroll polish must load');
assert(index.indexOf('comet-score-sprite-snapshot-v1.js?v=1') > index.indexOf('comet-science-learning-v1.js?v=2'), 'score snapshot must load after older score writers');
assert(index.indexOf('comet-collection-scroll-polish-v1.js?v=1') > index.indexOf('comet-science-learning-v1.js?v=2'), 'collection polish must load after science collection wrapper');

assert(score.includes('playerSprite: finalPlayerSnapshot(this)'), 'new scores must save the exact player sprite snapshot');
assert(score.includes('...player,'), 'snapshot must preserve the player’s serialized visual appearance fields');
assert(score.includes('...score.playerSprite,'), 'leaderboard must render from the stored score sprite snapshot');
assert(score.includes('scoreSpriteObject(score)'), 'leaderboard must rebuild each card from its own score snapshot');
assert(score.includes("legacyFallback: 'tier-only'"), 'legacy scores must not borrow the current player sprite');
assert(!score.includes('...(this.player || {})'), 'score cards must not use the current player as their sprite source');

assert(collection.includes('borderInsetPx: 8'), 'collection scroll mask must have internal border padding');
assert(collection.includes('viewportTop + insetY'), 'collection mask must be inset from the top border');
assert(collection.includes('viewportBottom - viewportTop - insetY * 2'), 'collection mask must be inset from the bottom border');
assert(collection.includes('moved > 9'), 'collection must distinguish a drag from a tap');
assert(collection.includes('endY - Number(content.y || 0)'), 'tap routing must account for current scroll offset');
assert(collection.includes('scene.showScienceObject(identityId)'), 'tapping a scrolling collected object must open its fact');
assert(collection.includes("child.text === 'FACT ✓'"), 'obsolete fixed-position fact labels must be removed');

console.log('score sprite snapshot + collection scroll polish regression checks passed');
