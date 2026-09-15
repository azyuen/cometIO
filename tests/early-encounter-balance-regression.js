const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const early = fs.readFileSync('comet-early-encounters-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-early-encounters-v1.js?v=1'), 'early encounter smoothing must be loaded');
assert(index.indexOf('comet-early-encounters-v1.js?v=1') > index.indexOf('comet-gameplay-sanity-v1.js?v=1'), 'early encounter smoothing should load last');
assert(early.includes("TIERS.findIndex(t => t.name === 'LARGE METEORITE')"), 'Large Meteorite threshold missing');
assert(early.includes("TIERS.findIndex(t => t.name === 'SMALL COMET')"), 'normal-difficulty restore tier missing');
assert(early.includes('if (gap <= 1) return true'), 'same/+1 encounters must remain freely allowed');
assert(early.includes('if (gap > 2) return false'), 'opening must reject >+2 tier region jumps');
assert(early.includes('0: 0.08'), 'Atom +2 acceptance must be strongly suppressed');
assert(early.includes('1: 0.12'), 'Dust +2 acceptance must remain strongly suppressed');
assert(early.includes('2: 0.20'), 'Tiny Meteorite +2 acceptance must remain reduced');
assert(early.includes('3: 0.38'), 'Large Meteorite should ease toward normal difficulty');
assert(early.includes('for (let attempt = 0; attempt < 24; attempt++)'), 'wrapper must reroll out-of-range region candidates');
assert(early.includes('if (SMALL_COMET >= 0 && playerTier >= SMALL_COMET) return basePickOpponent.call(this)'), 'Small Comet onward must restore original generator');
assert(early.includes('pickCometNamedIdentity(object.name)'), 'fallback must preserve named identity behaviour');

console.log('early encounter smoothing regression checks passed');
