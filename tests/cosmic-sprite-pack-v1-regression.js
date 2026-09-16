const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const assets=fs.readFileSync(path.join(root,'comet-cosmic-sprite-assets-v1.js'),'utf8');
const universe=fs.readFileSync(path.join(root,'comet-universe-sprite-v1.js'),'utf8');
const lod=fs.readFileSync(path.join(root,'comet-family-lod-policy.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert(index.includes('comet-cosmic-sprite-assets-v1.js?v=1'),'cosmic asset config must load');
assert(index.indexOf('comet-cosmic-sprite-assets-v1.js?v=1')>index.indexOf('sprite-manifest.js?v=8'),'asset config must load after base manifest');
assert(index.indexOf('comet-cosmic-sprite-assets-v1.js?v=1')<index.indexOf('comet-game.js'),'asset config must exist before scene preload');
assert(index.includes('comet-family-lod-policy.js?v=7'),'clean atom LOD policy must be cache-busted');
assert(index.includes('comet-universe-sprite-v1.js?v=1'),'universe renderer must load');
assert(index.indexOf('comet-universe-sprite-v1.js?v=1')>index.indexOf('comet-phase4-finale-v3.js?v=1'),'universe renderer must be the late drawObject override');

for(let i=1;i<=7;i++){
  const id=`atom_${String(i).padStart(2,'0')}`;
  assert(assets.includes(`'${id}'`),`${id} must be in the Atom variant pool`);
  assert(assets.includes(`assets/sprites/atomic/${'${variant}'}_32.png?v=5`),'Atom 32px source path must be configured');
  assert(assets.includes(`assets/sprites/atomic/${'${variant}'}_64.png?v=5`),'Atom 64px source path must be configured');
}
assert(assets.includes("atomPalette: 'EARTHY_MIXED'"),'Atom pack must declare earthy mixed palette');
assert(assets.includes('tintEnabled: false'),'baked Atom colours must not be randomly tinted');
assert(assets.includes("universeVariant: 'universe_final'"),'final universe asset must be declared');
assert(assets.includes('universe_final_32.png?v=1'),'32px universe asset must be configured');
assert(assets.includes('universe_final_64.png?v=1'),'64px universe asset must be configured');

assert(!lod.includes("if (def.visualFamily === 'atomic') return 32"),'old corrupt-pack force-32 Atom rule must be removed');
assert(lod.includes('diameter <= COMET_VISUAL_SETTINGS.lodThresholds.smallMaxPx'),'Atom must now follow displayed-size LOD selection');

assert(universe.includes("object?.kind !== 'universe'"),'universe renderer must target only universe objects');
assert(universe.includes("const VARIANT = 'universe_final'"),'universe renderer must use dedicated sprite');
assert(universe.includes('setVisualDisplayDiameter'),'universe sprite must support finale zoom resizing');
assert(universe.includes('replacesProceduralUniverse: true'),'dedicated sprite must replace procedural universe drawing');
assert(universe.includes('preservesFinaleFlow: true'),'finale mechanics/timing must remain unchanged');

console.log('Cosmic Atom/Universe sprite regression checks passed.');
