const fs = require('fs');

const hud = fs.readFileSync('comet-safearea-v5.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// HUD stat cards must reserve enough vertical space for wrapped tier text.
assert(hud.includes('const gap = 5, x0 = 10, cw = 96.25, ch = 84'), 'HUD card height should remain 84px');
assert(hud.includes('const barY = y + 73'), 'tier progress bar should remain near the card bottom');
assert(hud.includes('const infoY = y + 101'), 'region/round line should clear the taller cards');
assert(hud.includes('lineSpacing: i === 3 ? 1 : 0'), 'tier value should retain wrapped-line spacing');

// Region explanation must remain readable and the grid must start lower than before.
assert(hud.includes("this.Y(184), 'REGION CHANGES WHAT YOU ARE LIKELY TO MEET'"), 'region preamble position changed unexpectedly');
assert(hud.includes('this.Y(274 + Math.floor(i / 2) * 116)'), 'region grid should start lower with safe row spacing');
assert(hud.includes('const w = 188, h = 94'), 'region card size changed unexpectedly');

// Do not leak the former COMMON encounter hint in the region UI.
assert(!hud.includes('COMMON:'), 'region cards must not display COMMON hints');
assert(!hud.includes('r.common'), 'region cards must not render region.common');

// PWA must fetch the updated layout file rather than an older cached copy.
assert(index.includes('comet-safearea-v5.js?v=6'), 'updated HUD/region layout cache bust missing');

console.log('HUD and region layout regression checks passed');
