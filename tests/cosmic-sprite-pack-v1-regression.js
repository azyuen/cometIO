const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const assets=fs.readFileSync(path.join(root,'comet-cosmic-sprite-assets-v1.js'),'utf8');
const universe=fs.readFileSync(path.join(root,'comet-universe-sprite-v1.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'comet-visual-renderer.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert(index.includes('comet-cosmic-sprite-assets-v1.js?v=2'),'cosmic asset config must be cache-busted');
assert(index.indexOf('comet-cosmic-sprite-assets-v1.js?v=2')>index.indexOf('sprite-manifest.js?v=8'),'asset config must load after base manifest');
assert(index.indexOf('comet-cosmic-sprite-assets-v1.js?v=2')<index.indexOf('comet-game.js'),'asset config must exist before scene preload');
assert(index.includes('comet-universe-sprite-v1.js?v=1'),'universe renderer must load');

for(let i=1;i<=7;i++){
  const id=`atom_${String(i).padStart(2,'0')}`;
  assert(assets.includes(`'${id}'`),`${id} must be in the Atom variant pool`);
}
assert(assets.includes("family: 'atomic'"),'Atom assets must use the atomic family so the stable-32 safeguard applies');
assert(assets.includes('atom_01')&&assets.includes('atom_07'),'all seven Atom variants must remain available');
assert(assets.includes('assets/sprites/atomic/${variant}_32.png?v=6'),'Atom 32px path must be refreshed');
assert(assets.includes('assets/sprites/atomic/${variant}_64.png?v=6'),'64px files remain packaged for later clean re-export');
assert(assets.includes('fixedLods: { mystery: 32, normal: 32 }'),'live Atom rendering must prefer the stable 32px source');
assert(assets.includes('stable32Workaround: true'),'Atom corruption workaround must be documented in runtime config');
assert(assets.includes('tintEnabled: false'),'baked earthy Atom colours must not be randomly tinted');
assert(renderer.includes("entry.family === 'atomic'"),'renderer must force clean 32px for the atomic family');

assert(assets.includes("universeVariant: 'universe_final'"),'final universe asset must be declared');
assert(assets.includes('universe_final_32.png?v=1'),'32px universe asset must be configured');
assert(assets.includes('universe_final_64.png?v=1'),'64px universe asset must be configured');
assert(universe.includes("object?.kind !== 'universe'"),'universe renderer must target only universe objects');
assert(universe.includes("const VARIANT = 'universe_final'"),'universe renderer must use dedicated sprite');
assert(universe.includes('setVisualDisplayDiameter'),'universe sprite must support finale zoom resizing');

console.log('Cosmic Atom/Universe sprite regression checks passed.');