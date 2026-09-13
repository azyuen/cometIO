// Regression guard for iOS/WebGL: low-resolution sprites must never be stretched to huge quads.
const fs = require('fs');
const policy = fs.readFileSync('comet-family-lod-policy.js', 'utf8');
if (!policy.includes('MAX_SAFE_SPRITE_SCALE')) throw new Error('missing sprite scale safety limit');
if (!policy.includes('diameter > lod * MAX_SAFE_SPRITE_SCALE')) throw new Error('large sprite fallback condition missing');
console.log('large sprite fallback regression guard passed');
