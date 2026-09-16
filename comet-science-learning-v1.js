// Science learning layer: micro-learning that explains WHY encounters behave as they do.
// Facts are deliberately short during play; the Collection retains the deeper explanation.
(() => {
  const proto=GameScene.prototype;
  const baseResetRun=proto.resetRun, baseResolve=proto.resolve, baseDrawResult=proto.drawResult,
        baseShowCollection=proto.showCollection, baseSave=proto.save, baseLoad=proto.load;

  const FACTS={
    dwarf_ceres:['CERES','The largest object in the asteroid belt.','Its gravity made it round — one reason it is classed as a dwarf planet.'],
    dwarf_pluto:['PLUTO','A small icy world beyond Neptune.','Its orbit sits in the Kuiper Belt, a region rich in icy bodies.'],
    dwarf_eris:['ERIS','A distant dwarf planet similar in size to Pluto.','Its discovery helped trigger the modern definition of a planet.'],
    dwarf_haumea:['HAUMEA','A fast-spinning dwarf planet.','Its rapid rotation stretches it into an unusual elongated shape.'],
    dwarf_makemake:['MAKEMAKE','A bright icy dwarf planet in the Kuiper Belt.','Small worlds can still hold moons and complex surfaces.'],
    planet_mercury:['MERCURY','The smallest planet in our Solar System.','Small size does not mean slow: Mercury races around the Sun fastest.'],
    planet_venus:['VENUS','Similar in size to Earth, but extremely hot.','A thick carbon-dioxide atmosphere produces a powerful greenhouse effect.'],
    planet_earth:['EARTH','Our rocky planet and the only world known to support life.','A planet can be part of a larger gravitational system without being swallowed by its star.'],
    planet_mars:['MARS','A cold rocky planet with enormous volcanoes and canyons.','Its lower gravity helped it lose much of its early atmosphere.'],
    planet_jupiter:['JUPITER','The most massive planet in our Solar System.','Its strong gravity can dramatically alter the paths of smaller objects.'],
    planet_saturn:['SATURN','A gas giant surrounded by spectacular rings.','The rings are countless pieces of ice and rock orbiting Saturn.'],
    planet_uranus:['URANUS','An ice giant rotating almost on its side.','Not every giant planet is the same: ice giants differ from Jupiter and Saturn.'],
    planet_neptune:['NEPTUNE','The outermost major planet in our Solar System.','Despite its distance from the Sun, Neptune has extremely fast winds.'],
    yellowDwarf_sun:['THE SUN','A G-type main-sequence star.','Its gravity holds the Solar System together while fusion powers the star.'],
    yellowDwarf_alphaCentauriA:['ALPHA CENTAURI A','A Sun-like star in our nearest neighbouring star system.','Stars commonly exist in multiple-star systems rather than alone.'],
    yellowDwarf_tauCeti:['TAU CETI','A nearby Sun-like star.','Astronomers study nearby stars to compare other planetary systems with ours.'],
    blueGiant_rigel:['RIGEL','A luminous blue supergiant in Orion.','Massive stars burn fuel quickly, so being bigger does not mean living longer.'],
    blueGiant_spica:['SPICA','What looks like one bright star is actually a close stellar system.','Some points of light hide multiple objects bound together by gravity.'],
    redHypergiant_betelgeuse:['BETELGEUSE','A huge evolved red supergiant.','As massive stars age, their outer layers can expand enormously.'],
    redHypergiant_vyCanisMajoris:['VY CANIS MAJORIS','An enormous evolved red star.','A star can have a gigantic radius without being the densest object in the game.'],
    nebula_orion:['ORION NEBULA','A vast cloud where new stars are forming.','Nebulae can be enormous but very diffuse — size and density are different things.'],
    nebula_carina:['CARINA NEBULA','A giant star-forming region filled with gas, dust and massive stars.','Gravity gathers parts of gas clouds until new stars can form.'],
    nebula_eagle:['EAGLE NEBULA','Home to the famous Pillars of Creation.','Dense pockets inside huge gas clouds can collapse to form stars.'],
    nebula_helix:['HELIX NEBULA','A planetary nebula made by a dying Sun-like star.','Despite the name, a planetary nebula is not a planet.'],
    pulsar_crab:['CRAB PULSAR','A rapidly rotating neutron star left by a supernova.','It is tiny compared with a star, but packs enormous mass into a very small volume.'],
    pulsar_vela:['VELA PULSAR','A rapidly spinning neutron star.','Phase 3 changes the rule: compactness and gravity can matter more than visible size.'],
    pulsar_geminga:['GEMINGA','A nearby neutron star detected strongly in gamma rays.','Some extreme objects are easier to discover in invisible wavelengths than visible light.'],
    blackHole_cygnusX1:['CYGNUS X-1','One of the best-known stellar-mass black-hole systems.','A black hole can be physically small yet have gravity strong enough to dominate a close encounter.'],
    blackHole_v404Cygni:['V404 CYGNI','A stellar-mass black hole in a binary system.','Matter pulled from a companion can heat up brightly before crossing the event horizon.'],
    blackHole_gaiaBH1:['GAIA BH1','A relatively nearby dormant stellar-mass black hole.','Black holes do not need to glow; astronomers can infer them from the motion of companion stars.'],
    blackHole_maxiJ1820_070:['MAXI J1820+070','A black-hole binary observed in a bright outburst.','Accreting matter can produce energetic radiation and jets around a black hole.'],
    smbh_sagittariusA:['SAGITTARIUS A*','The supermassive black hole at the centre of the Milky Way.','In Phase 4, the central black hole becomes one component of a much larger galactic system.'],
    smbh_m87:['M87*','A supermassive black hole famous for the first Event Horizon Telescope black-hole image.','Its host galaxy is vastly larger than the black hole itself.'],
    smbh_ton618:['TON 618','An extremely luminous quasar powered by a very massive black hole.','Bright quasars reveal matter heating as it falls toward an active galactic nucleus.']
  };

  const TIER_FACTS={
    'DWARF PLANET':['DWARF PLANET','Gravity can make a small world round.','SIZE CLUE: compare its apparent size with yours.'],
    'ROCKY PLANET':['ROCKY PLANET','Rocky planets are dense solid worlds.','SIZE CLUE: Phase 1 still rewards careful size comparison.'],
    'GAS PLANET':['GAS PLANET','Giant planets hold huge envelopes of gas with gravity.','SYSTEM CLUE: orbitals can protect your progress.'],
    'YELLOW DWARF STAR':['MAIN-SEQUENCE STAR','Stars shine by nuclear fusion in their cores.','SYSTEM CLUE: stars can anchor large orbital systems.'],
    'BLUE GIANT STAR':['MASSIVE STAR','Massive blue stars are hot, bright and short-lived.','SYSTEM CLUE: large stellar encounters can strongly reshape your system.'],
    'RED HYPERGIANT STAR':['EVOLVED GIANT STAR','A huge radius does not automatically mean huge density.','THINK AHEAD: visible size will soon stop being enough.'],
    'NEBULA':['NEBULA','Nebulae can span light-years while remaining extremely diffuse.','DENSITY CLUE: enormous-looking objects can be surprisingly spread out.'],
    'PULSAR':['PULSAR','A neutron star packs roughly stellar-scale mass into a city-sized object.','GRAVITY CLUE: do not judge this encounter by visible size alone.'],
    'BLACK HOLE':['BLACK HOLE','Black holes concentrate mass so strongly that close gravity dominates.','GRAVITY CLUE: mass and compactness now matter more than apparent size.'],
    'SUPER MASSIVE BLACK HOLE':['SUPERMASSIVE BLACK HOLE','These objects sit at the centres of many large galaxies.','GALAXY CLUE: the black hole is a core — the galaxy is the whole system.']
  };

  function factFor(object){
    const named=object?.identityId&&FACTS[object.identityId];
    if(named)return {title:named[0],fact:named[1],why:named[2],named:true};
    const tier=TIER_FACTS[object?.name];
    return tier?{title:tier[0],fact:tier[1],why:tier[2],named:false}:null;
  }
  function seen(scene,id){return Array.isArray(scene.scienceSeenIds)&&scene.scienceSeenIds.includes(id);}
  function mark(scene,id){if(!id)return;scene.scienceSeenIds=Array.isArray(scene.scienceSeenIds)?scene.scienceSeenIds:[];if(!scene.scienceSeenIds.includes(id))scene.scienceSeenIds.push(id);}

  proto.resetRun=function(){this.scienceSeenIds=[];this._scienceDiscovery=null;return baseResetRun.call(this);};
  proto.resolve=function(){
    const obj=this.other, key=obj?.identityId||`tier:${obj?.name}`;
    this._scienceDiscovery=null;
    if(obj&&key&&!seen(this,key)){
      const fact=factFor(obj);if(fact){mark(this,key);this._scienceDiscovery={...fact,key,object:obj};}
    }
    return baseResolve.call(this);
  };

  proto.drawResult=function(result){
    const value=baseDrawResult.call(this,result),d=this._scienceDiscovery;
    if(!d)return value;
    const y=this.Y(700),g=this.add.graphics();
    g.fillStyle(C.panel,.98).fillRoundedRect(18,y-7,384,91,8);g.lineStyle(1.3,C.cyan,.62).strokeRoundedRect(18,y-7,384,91,8);this.ui.add(g);
    this.addText(31,y,d.named?'◆ DISCOVERED':'◆ SCIENCE NOTE',7.1,d.named?C.green:C.cyan,{bold:true});
    this.addText(31,y+18,d.title,8.7,C.white,{bold:true,width:350});
    this.addText(31,y+39,d.fact,7.2,C.muted,{bold:true,width:350});
    this.addText(31,y+61,d.why,6.8,C.cyan,{bold:true,width:350});
    return value;
  };

  proto.save=function(silent=false){
    const result=baseSave.call(this,silent);if(result===false)return false;
    try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const data=JSON.parse(raw);data.scienceSeenIds=[...(this.scienceSeenIds||[])];localStorage.setItem(SAVE_KEY,JSON.stringify(data));}}catch(e){}
    return result;
  };
  proto.load=function(){
    let ids=[];try{const raw=localStorage.getItem(SAVE_KEY);if(raw)ids=JSON.parse(raw).scienceSeenIds||[];}catch(e){}
    this.scienceSeenIds=[...ids];const result=baseLoad.call(this);if(result!==false)this.scienceSeenIds=[...ids];return result;
  };

  proto.showCollection=function(options={}){
    const result=baseShowCollection.call(this,options);
    const page=Math.max(0,Math.min((COMET_COLLECTIBLE_TIER_ORDER?.length||1)-1,Number(options.page)||0));
    const tierName=COMET_COLLECTIBLE_TIER_ORDER?.[page],items=COMET_COLLECTIBLE_IDENTITIES?.filter(x=>x.gameplayTiers.includes(tierName))||[];
    const ids=new Set(options.score?.collection||options.saved?.ids||this.collectedIdentityIds||[]);
    // Make collected rows tappable. The existing catalogue remains visually unchanged until tapped.
    items.forEach((identity,index)=>{
      if(!ids.has(identity.id))return;
      const y=this.Y(205+index*51);
      const hit=this.add.rectangle(W/2,y+10,360,43,0xffffff,.001).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>this.showScienceObject(identity.id,{...options,page}));this.ui.add(hit);
    });
    this.addText(W/2,this.Y(690),'TAP A DISCOVERED OBJECT FOR ITS SCIENCE CARD',6.4,C.cyan,{ox:.5,bold:true});
    return result;
  };

  proto.showScienceObject=function(identityId,returnOptions={}){
    const identity=getCometNamedIdentity(identityId),data=FACTS[identityId];if(!identity||!data)return this.showCollection(returnOptions);
    this.clearUI();this.state='SCIENCE_OBJECT';
    this.addText(W/2,this.Y(42),'COSMIC COLLECTION',14,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(79),identity.name,16,C.green,{ox:.5,bold:true,width:390,align:'center'});
    this.addText(W/2,this.Y(108),identity.scienceClass,7.5,C.cyan,{ox:.5,bold:true,width:380,align:'center'});
    const tierIndex=TIERS.findIndex(t=>identity.gameplayTiers.includes(t.name)),t=TIERS[Math.max(0,tierIndex)];
    const object={name:t.name,realName:identity.name,tier:tierIndex,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,identityId:identity.id,namedSpriteBase:identity.spriteVariant,scienceClass:identity.scienceClass,identityStatus:identity.status};
    this.drawObject(W/2,this.Y(275),74,object,false,true);
    const panel=this.add.graphics();panel.fillStyle(C.panel,.97).fillRoundedRect(22,this.Y(390),376,260,9);panel.lineStyle(1.5,C.cyan,.55).strokeRoundedRect(22,this.Y(390),376,260,9);this.ui.add(panel);
    this.addText(40,this.Y(414),'WHAT IS IT?',8,C.white,{bold:true});
    this.addText(40,this.Y(440),data[1],9,C.muted,{bold:true,width:340});
    this.addText(40,this.Y(497),'WHY IT MATTERS',8,C.white,{bold:true});
    this.addText(40,this.Y(523),data[2],8.6,C.cyan,{bold:true,width:340,lineSpacing:3});
    this.addText(40,this.Y(594),'GAME CONNECTION',8,C.white,{bold:true});
    const tierFact=TIER_FACTS[t.name];this.addText(40,this.Y(620),tierFact?tierFact[2]:'Understanding the object helps you judge the encounter.',7.4,C.muted,{bold:true,width:340});
    this.wideButton(W/2,this.Y(752),310,48,'BACK TO COLLECTION',C.cyan,()=>this.showCollection(returnOptions));
  };

  window.CometScienceLearning=Object.freeze({enabled:true,microLearning:true,collectionScienceCards:true,gameplayLinkedFacts:true});
})();
