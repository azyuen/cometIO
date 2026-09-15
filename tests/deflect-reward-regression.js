const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const orbitals = fs.readFileSync('comet-orbitals-v1.js', 'utf8');
const rewards = fs.readFileSync('comet-deflect-rewards-v1.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(index.includes('comet-orbitals-v1.js?v=2'), 'orbital system must remain loaded');
assert(index.includes('comet-deflect-rewards-v1.js?v=1'), 'deflect reward refinement must be loaded');
assert(index.indexOf('comet-deflect-rewards-v1.js?v=1') > index.indexOf('comet-orbitals-v1.js?v=2'), 'scaled reward patch must load after orbitals');

assert(orbitals.includes("pending?.choice === 'DEFLECT'"), 'base orbital system should still detect successful deflects');
assert(rewards.includes('if (gap < 0) return 0'), 'smaller targets must award zero orbital charge');
assert(rewards.includes('if (gap === 0) return 1'), 'similar/same-tier targets should award reduced charge');
assert(rewards.includes('if (gap === 1) return 2'), 'one-tier-larger targets should award increased charge');
assert(rewards.includes('return 3;'), 'much larger targets should award maximum charge');
assert(rewards.includes('afterAutomaticTotal - 1'), 'patch must undo the old fixed +1 charge before applying scaled reward');
assert(rewards.includes('scene.orbitalCount = desiredCount'), 'scaled reward must update orbital count');
assert(rewards.includes('scene.orbitalProgress = desiredTotal % step'), 'scaled reward must preserve carry-over progress');
assert(rewards.includes("replace(/\\s*•\\s*CRATERS"), 'legacy crater reward text must be removed from deflect result');
assert(rewards.includes('reward === 0 deliberately adds nothing'), 'smaller-target result should add no orbital progression text');

console.log('size-scaled deflect orbital reward regression checks passed');
