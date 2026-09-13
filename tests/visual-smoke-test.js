const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const tierNames = [
  'ATOM','DUST PARTICLE','TINY METEORITE','LARGE METEORITE','SMALL COMET','LARGER COMET',
  'ASTEROID','DWARF PLANET','ROCKY PLANET','GAS PLANET','YELLOW DWARF STAR','BLUE GIANT STAR',
  'RED HYPERGIANT STAR','NEBULA','PULSAR','BLACK HOLE','SUPER MASSIVE BLACK HOLE'
];

global.TIERS = tierNames.map(name => ({ name }));
global.C = { orange: 0xff9d3d };
global.window = {};
global.Phaser = { Textures: { FilterMode: { NEAREST: 0 } } };

class MockContainer {
  constructor(x=0,y=0){this.x=x;this.y=y;this.scaleX=1;this.scaleY=1;this.active=true;this.children=[];}
  add(items){this.children.push(...(Array.isArray(items)?items:[items]));return this;}
}
class MockImage {
  constructor(key){this.key=key;this.width=Number(key.split(':').pop())||64;this.height=this.width;this.displayWidth=this.width;this.displayHeight=this.height;}
  setAngle(v){this.angle=v;return this;} setFlipX(v){this.flipX=v;return this;} setAlpha(v){this.alpha=v;return this;}
  setTint(v){this.tint=v;return this;} setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;}
  setTexture(key){this.key=key;this.width=Number(key.split(':').pop())||64;this.height=this.width;return this;}
}
class MockGraphics { fillStyle(){return this;} fillCircle(){return this;} }
class MockText { setOrigin(){return this;} setResolution(){return this;} setText(t){this.text=t;return this;} }

class GameScene {}
GameScene.prototype.drawObject = function(x,y,radius,object,mystery){
  const c=new MockContainer(x,y);c.fallbackProcedural=true;c.radius=radius;c.object=object;c.mystery=mystery;this.ui.add(c);return c;
};
global.GameScene = GameScene;

function load(file){vm.runInThisContext(fs.readFileSync(path.join(ROOT,file),'utf8'),{filename:file});}
load('comet-visual-config.js');
load('assets/sprites/sprite-manifest.js');
load('comet-visual-renderer.js');
load('comet-family-lod-policy.js');

function makeScene(textureKeys=[]){
  const scene=new GameScene();
  scene.textures={exists:key=>textureKeys.includes(key),get:()=>({setFilter(){}})};
  scene.ui={items:[],add(o){this.items.push(o);},addAt(o){this.items.push(o);}};
  scene.add={container:(x,y)=>new MockContainer(x,y),image:(x,y,key)=>new MockImage(key),graphics:()=>new MockGraphics(),text:()=>new MockText()};
  scene.load={calls:[],image(key,assetPath){this.calls.push([key,assetPath]);}};
  return scene;
}
function assert(condition,message){if(!condition)throw new Error(message);}

const expectedFamilies=['atomic','dust','rock','rock','comet','comet','rock','rockyPlanet','rockyPlanet','gasPlanet','star','star','star','nebula','pulsar','blackHole','blackHole'];
tierNames.forEach((name,index)=>{
  const def=window.CometVisuals.getDefinition({name,tier:index});
  assert(def.visualFamily===expectedFamilies[index],`visual family mismatch: ${name}`);
  assert(def.collisionFamily,`missing collision family: ${name}`);
});

// Registered files should preload through the normal manifest-driven loader.
let scene=makeScene([]);scene.preload();
const rockLoads=scene.load.calls.filter(([key])=>key.includes('rock_0'));
assert(rockLoads.length===6,'expected six rock PNG preload requests');

// If textures fail to load, the established procedural graphic remains the fallback.
let rock={name:'ASTEROID',tier:6};
let rendered=scene.drawObject(10,20,55,rock,true,false);
assert(rendered.fallbackProcedural===true,'missing rock sprite should fall back procedurally');

const rockTextures=[];
for(const variant of ['rock_01','rock_02','rock_03'])for(const lod of [32,64])rockTextures.push(`comet-sprite:${variant}:${lod}`);
scene=makeScene(rockTextures);
rock={name:'ASTEROID',tier:6};

// Same displayed size: mystery 32px -> revealed 64px must not change on-screen dimensions.
const mystery=scene.drawObject(10,20,55,rock,true,false);
assert(mystery.cometVisual.lod===32,'rock mystery should use 32px texture');
assert(mystery.cometVisual.image.displayWidth===110,'mystery display size changed');
const revealed=scene.drawObject(10,20,55,rock,false,false);
assert(revealed.cometVisual.lod===64,'revealed rock should use 64px texture');
assert(revealed.cometVisual.variant===mystery.cometVisual.variant,'rock variant changed during encounter');
assert(revealed.cometVisual.tint===mystery.cometVisual.tint,'rock tint changed during encounter');
assert(revealed.cometVisual.image.displayWidth===110,'32->64 switch caused a visible size jump');

// Existing {...object} snapshots must retain the same visual state on result screens.
const snapshot={...rock};
const result=scene.drawObject(10,20,55,snapshot,false,false);
assert(result.cometVisual.variant===revealed.cometVisual.variant,'result snapshot changed rock variant');

// Very small/large display sizes and relative zoom scaling remain authoritative.
const tiny=scene.drawObject(10,20,5,{name:'TINY METEORITE',tier:2},false,false);
assert(tiny.cometVisual.lod===64 && tiny.cometVisual.image.displayWidth===10,'tiny displayed rock size incorrect');
const huge=scene.drawObject(10,20,150,{name:'LARGE METEORITE',tier:3},false,false);
assert(huge.cometVisual.lod===64 && huge.cometVisual.image.displayWidth===300,'large displayed rock size incorrect');
huge.scaleX=huge.scaleY=0.2;
assert(huge.cometVisual.image.displayWidth===300,'container zoom mutated sprite base display size');
huge.setVisualDisplayDiameter(92);
assert(huge.cometVisual.image.displayWidth===92,'growth/display-size helper failed');

// Missing detail texture for the selected stable variant must use the procedural fallback.
const brokenKeys=rockTextures.filter(key=>!key.endsWith(':64'));
const brokenScene=makeScene(brokenKeys);const brokenRock={name:'ASTEROID',tier:6};
brokenScene.drawObject(0,0,55,brokenRock,true,false);
const brokenReveal=brokenScene.drawObject(0,0,55,brokenRock,false,false);
assert(brokenReveal.fallbackProcedural===true,'missing 64px detail should fall back procedurally');

console.log('visual architecture smoke tests passed');
