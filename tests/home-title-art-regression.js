const fs = require('fs');

const art = fs.readFileSync('comet-home-title-art.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

assert(art.includes("'dust_02', 64"), 'home title should use the Dust sprite family');
assert(art.includes("'rock_03', 64"), 'home title should use the Rock sprite family');
assert(art.includes("'comet_02', 64"), 'home title should use the Comet sprite family');
assert(!art.includes("'atom_"), 'Atom is intentionally omitted from title art while its rare PWA artefact is monitored');
assert(art.includes('texture.setFilter(Phaser.Textures.FilterMode.NEAREST)'), 'title sprites should use nearest filtering');
assert(art.includes('window.COMET_STANDALONE ? 0 : angle'), 'standalone title sprites should avoid individual rotation');
assert(art.includes("ease: 'Sine.easeInOut'"), 'title composition should retain gentle group drift');
assert(art.includes("GameScene.prototype.showHome = function"), 'home screen override missing');
assert(!art.includes('fillCircle(W / 2, 175, 58)'), 'old procedural comet artwork should not be present in the replacement');
assert(index.includes('comet-home-title-art.js?v=1'), 'home title art script should be loaded with a cache-busted URL');
assert(index.indexOf('comet-home-v4.js') < index.indexOf('comet-home-title-art.js?v=1'), 'home title override must load after the base home implementation');

console.log('home title sprite art regression checks passed');
