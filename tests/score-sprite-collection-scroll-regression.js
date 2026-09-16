const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const score = fs.readFileSync('comet-score-sprite-snapshot-v1.js', 'utf8');
const collection = fs.readFileSync('comet-collection-scroll-polish-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-score-sprite-snapshot-v1.js?v=1'), 'score sprite snapshot patch must load');
assert(index.includes('comet-collection-scroll-polish-v1.js?v=3'), 'collection scroll polish must be cache-busted');
assert(index.indexOf('comet-score-sprite-snapshot-v1.js?v=1') > index.indexOf('comet-science-learning-v1.js?v=2'), 'score snapshot must load after older score writers');
assert(index.indexOf('comet-collection-scroll-polish-v1.js?v=3') > index.indexOf('comet-science-learning-v1.js?v=2'), 'collection polish must load after science collection wrapper');

assert(score.includes('playerSprite: finalPlayerSnapshot(this)'), 'new scores must save the exact player sprite snapshot');
assert(score.includes('...player,'), 'snapshot must preserve the player’s serialized visual appearance fields');
assert(score.includes('...score.playerSprite,'), 'leaderboard must render from the stored score sprite snapshot');
assert(score.includes('scoreSpriteObject(score)'), 'leaderboard must rebuild each card from its own score snapshot');
assert(score.includes("legacyFallback: 'tier-only'"), 'legacy scores must not borrow the current player sprite');
assert(!score.includes('...(this.player || {})'), 'score cards must not use the current player as their sprite source');

assert(collection.includes('const CARD_TOP_PADDING = 14'), 'collection should use 14px top card padding');
assert(collection.includes('const CARD_BOTTOM_PADDING = 14'), 'collection should use matching 14px bottom card padding');
assert(collection.includes('maskInsetPx: 12'), 'collection mask should sit farther inside the panel border');
assert(collection.includes('scienceHintY: 729'), 'science hint should sit higher above the Back button');
assert(collection.includes('contentHeight = CARD_TOP_PADDING'), 'scroll range must include explicit symmetric padding');
assert(collection.includes('moved > 9'), 'collection must distinguish a drag from a tap');
assert(collection.includes('endY - Number(content.y || 0)'), 'tap routing must account for current scroll offset');
assert(collection.includes('scene.showScienceObject(identityId)'), 'tapping a scrolling collected object must open its fact');
assert(collection.includes("child.text === 'FACT ✓'"), 'obsolete fixed-position fact labels must be removed');

console.log('score sprite snapshot + symmetric Collection spacing regression checks passed');
