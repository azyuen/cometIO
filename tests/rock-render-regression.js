// Lightweight source-level regression guards for the first pixel-art sprite family.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const policy = fs.readFileSync(path.join(root, 'comet-family-lod-policy.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'comet-visual-config.js'), 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(!policy.includes('legacyGlow.fillStyle'), 'sprite-backed rock renderer still draws legacy circular glow');
assert(policy.includes('rotationStep'), 'renderer is not using quantized pixel-art rotation');
assert(config.includes('rotationStep: 90'), 'rock family should rotate only in 90-degree increments');
assert(config.includes('alphaRange: [1, 1]'), 'rock sprites should render fully opaque at family level');

console.log('rock render regression checks passed');
