// Universe Atlas v3
// High-score atlas: map switching is separate from local pinch/pan exploration.
// Adds five Phase-4 galaxy discoveries without changing gameplay score/balance.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseShowScores = proto.showScores;
  const baseResetRun = proto.resetRun;
  const baseResolve = proto.resolve;
  const baseDrawResult = proto.drawResult;
  const baseSave = proto.save;
  const baseLoad = proto.load;

  const DAY_MS = 86400000;
  const J2000_MS = Date.UTC(2000,0,1,12,0,0);
  const SPEEDS = [12, 60, 240]; // simulated days per real second
  const MAPS = [
    { name:'SOLAR SYSTEM', subtitle:'PLANETS • DWARF PLANETS • COMPRESSED ORBITS' },
    { name:'STELLAR MAP', subtitle:'STARS • STYLISED RELATIVE SIZE' },
    { name:'GALAXY', subtitle:'NEBULAE • PULSARS • STELLAR BLACK HOLES' },
    { name:'DEEP UNIVERSE', subtitle:'GALAXIES • SUPERMASSIVE BLACK HOLES' }
  ];
  const MAX_MAP = MAPS.length - 1;

  const GALAXY_COLLECTIBLES = Object.freeze([
    { id:'andromeda', name:'ANDROMEDA GALAXY', profile:'andromeda', color:0xb8d7ff },
    { id:'whirlpool', name:'WHIRLPOOL GALAXY', profile:'whirlpool', color:0x9be7ff },
    { id:'sombrero', name:'SOMBRERO GALAXY', profile:'sombrero', color:0xffd49a },
    { id:'cartwheel', name:'CARTWHEEL GALAXY', profile:'cartwheel', color:0x9edfff },
    { id:'antennae', name:'ANTENNAE GALAXIES', profile:'antennae', color:0xc4b4ff }
  ]);
  const GALAXY_BY_ID = Object.fromEntries(GALAXY_COLLECTIBLES.map(x => [x.id, x]));
  const GALAXY_IDS = new Set(GALAXY_COLLECTIBLES.map(x => x.id));

  const GALAXY_VIEWS = Object.freeze({
    'milky-way': { key:'milky-way', name:'MILKY WAY', profile:'milkyway', color:0xa8d8ff },
    'lmc': { key:'lmc', name:'LARGE MAGELLANIC CLOUD', profile:'irregular', color:0x9edfff },
    andromeda: GALAXY_BY_ID.andromeda,
    whirlpool: GALAXY_BY_ID.whirlpool,
    sombrero: GALAXY_BY_ID.sombrero,
    cartwheel: GALAXY_BY_ID.cartwheel,
    antennae: GALAXY_BY_ID.antennae
  });

  const PLANETS = [
    { id:'planet_mercury', r:24,  e:.206, period:88.0,   phase:174.8, rot:10, d:9 },
    { id:'planet_venus',   r:37,  e:.007, period:224.7,  phase:50.1,  rot:-5, d:13 },
    { id:'planet_earth',   r:51,  e:.017, period:365.2,  phase:357.5, rot:0, d:14 },
    { id:'planet_mars',    r:66,  e:.093, period:687.0,  phase:19.4,  rot:7, d:11 },
    { id:'planet_jupiter', r:91,  e:.049, period:4331,   phase:20.0,  rot:3, d:32 },
    { id:'planet_saturn',  r:112, e:.056, period:10747,  phase:317.0, rot:-4, d:29 },
    { id:'planet_uranus',  r:132, e:.047, period:30589,  phase:142.2, rot:5, d:20 },
    { id:'planet_neptune', r:149, e:.010, period:59800,  phase:256.2, rot:-3, d:20 }
  ];
  const DWARFS = [
    { id:'dwarf_ceres',    r:78,  e:.079, period:1680,    phase:95,   rot:18,  d:6.0 },
    { id:'dwarf_pluto',    r:159, e:.249, period:90560,   phase:14.5, rot:14,  d:8.0 },
    { id:'dwarf_haumea',   r:164, e:.189, period:103500,  phase:205,  rot:-18, d:7.0 },
    { id:'dwarf_makemake', r:168, e:.159, period:113200,  phase:160,  rot:22,  d:6.8 },
    { id:'dwarf_quaoar',   r:171, e:.040, period:104900,  phase:285,  rot:-8,  d:6.3 },
    { id:'dwarf_gonggong', r:175, e:.502, period:200100,  phase:111,  rot:28,  d:6.8 },
    { id:'dwarf_eris',     r:179, e:.442, period:203900,  phase:205,  rot:-26, d:8.0 },
    { id:'dwarf_sedna',    r:184, e:.850, period:4164000, phase:358,  rot:11,  d:6.1 }
  ];

  const STAR_POS = {
    yellowDwarf_sun:[0,22], yellowDwarf_alphaCentauriA:[-85,72], yellowDwarf_tauCeti:[105,112], yellowDwarf_18Scorpii:[42,-92],
    blueGiant_rigel:[135,-168], blueGiant_spica:[-145,142], blueGiant_alnitak:[108,-34], blueGiant_bellatrix:[-116,-92],
    redHypergiant_betelgeuse:[-45,-176], redHypergiant_vyCanisMajoris:[148,63], redHypergiant_uyScuti:[-148,4], redHypergiant_nmlCygni:[72,178]
  };
  const STAR_SIZE = {
    yellowDwarf_sun:14, yellowDwarf_alphaCentauriA:16, yellowDwarf_tauCeti:13, yellowDwarf_18Scorpii:14,
    blueGiant_rigel:29, blueGiant_spica:24, blueGiant_alnitak:27, blueGiant_bellatrix:22,
    redHypergiant_betelgeuse:39, redHypergiant_vyCanisMajoris:49, redHypergiant_uyScuti:52, redHypergiant_nmlCygni:46
  };

  const SAVE_KEYS = [
    'cometio-protected-checkpoint-v2',
    'cometio-protected-checkpoint-v2-backup',
    'cometio-manual-checkpoint-v1',
    typeof SAVE_KEY !== 'undefined' ? SAVE_KEY : 'cometio-save-v2'
  ];

  function hex(n){ return '#' + Number(n||0).toString(16).padStart(6,'0'); }
  function rad(d){ return Number(d||0)*Math.PI/180; }
  function clampMap(v){ return Math.max(0,Math.min(MAX_MAP,Math.round(Number(v)||0))); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function text(scene,parent,x,y,value,size,color=C.white,opt={}){
    const t=scene.add.text(x,y,value,{
      fontFamily:FONT,fontSize:String(size)+'px',fontStyle:opt.bold?'bold':'normal',
      color:hex(color),align:opt.align||'left',
      wordWrap:opt.width?{width:opt.width,useAdvancedWrap:true}:undefined
    }).setOrigin(opt.ox==null?0:opt.ox,opt.oy==null?0:opt.oy);
    if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));
    parent.add(t); return t;
  }

  function button(scene,parent,x,y,w,h,label,color,cb,fontSize=9.2){
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(color,.13).fillRoundedRect(-w/2,-h/2,w,h,7);
    g.lineStyle(1.5,color,.9).strokeRoundedRect(-w/2,-h/2,w,h,7);
    const t=scene.add.text(0,0,label,{fontFamily:FONT,fontSize:String(fontSize)+'px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));
    const hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});
    hit.on('pointerdown',cb); c.add([g,t,hit]); c._atlasLabel=t; parent.add(c); return c;
  }

  function walk(node,fn){
    if(!node)return; fn(node);
    if(Array.isArray(node.list))node.list.forEach(child=>walk(child,fn));
  }

  function scores(scene){
    try{return Array.isArray(scene.getScores?.())?scene.getScores():[];}catch(_){return [];}
  }
  function scoreObjectIds(score){
    const raw=Array.isArray(score?.collection)?score.collection:(Array.isArray(score?.collectedIdentityIds)?score.collectedIdentityIds:[]);
    return raw.filter(id=>!!COMET_COLLECTIBLE_BY_ID?.[id]);
  }
  function scoreGalaxyIds(score){
    const raw=Array.isArray(score?.galaxyCollection)?score.galaxyCollection:(Array.isArray(score?.phase4GalaxyCollection)?score.phase4GalaxyCollection:[]);
    const seen=new Set(); return raw.filter(id=>GALAXY_IDS.has(id)&&!seen.has(id)&&seen.add(id));
  }
  function objectDiscoverySet(scene){
    const out=new Set(); scores(scene).forEach(s=>scoreObjectIds(s).forEach(id=>out.add(id))); return out;
  }
  function galaxyDiscoverySet(scene){
    const out=new Set(); scores(scene).forEach(s=>scoreGalaxyIds(s).forEach(id=>out.add(id))); return out;
  }
  function totalDiscoverables(){ return (Array.isArray(COMET_COLLECTIBLE_IDENTITIES)?COMET_COLLECTIBLE_IDENTITIES.length:60)+GALAXY_COLLECTIBLES.length; }
  function totalDiscovered(scene){ return objectDiscoverySet(scene).size+galaxyDiscoverySet(scene).size; }
  function identity(id){ return COMET_COLLECTIBLE_BY_ID?.[id]||COMET_IDENTITY_BY_ID?.[id]||null; }
  function hostGalaxyFor(item){
    if(!item)return null;
    if(item.hostGalaxy && GALAXY_VIEWS[item.hostGalaxy])return item.hostGalaxy;
    if(item.id==='nebula_tarantula')return 'lmc';
    if(item.id==='smbh_sagittariusA')return 'milky-way';
    if(item.gameplayTiers?.[0]==='SUPER MASSIVE BLACK HOLE')return null;
    return 'milky-way';
  }

  const GALAXY_OBJECT_POS = Object.freeze({
    nebula_tarantula:[20,-18,52],
    nebula_n157b:[62,12,29],
    pulsar_j0537_6910:[69,18,11],
    nebula_sn1987a:[-72,-104,33],
    blackHole_lmcX1:[-105,78,20],
    blackHole_m31_2014_ds1:[96,42,20],
    smbh_m31:[0,0,28],
    pulsar_m51_ulx7:[98,-42,12],
    smbh_m51:[0,0,28],
    smbh_m104:[0,0,30],
    blackHole_cartwheelN10:[104,2,21]
  });

  function cleanRunGalaxies(ids){
    const seen=new Set(),out=[];
    for(const id of Array.isArray(ids)?ids:[]){if(!GALAXY_IDS.has(id)||seen.has(id))continue;seen.add(id);out.push(id);}
    return out;
  }

  function readSavedGalaxyCollection(){
    for(const key of SAVE_KEYS){
      try{
        const raw=localStorage.getItem(key); if(!raw)continue;
        const d=JSON.parse(raw);
        const ids=cleanRunGalaxies(d?.phase4GalaxyCollection||d?.galaxyCollection);
        if(ids.length||Array.isArray(d?.phase4GalaxyCollection)||Array.isArray(d?.galaxyCollection))return ids;
      }catch(_){}
    }
    return [];
  }

  function patchManualCheckpoint(scene){
    const ids=cleanRunGalaxies(scene.phase4GalaxyCollection);
    for(const key of SAVE_KEYS){
      try{
        const raw=localStorage.getItem(key); if(!raw)continue;
        const d=JSON.parse(raw); if(!d||typeof d!=='object')continue;
        d.phase4GalaxyCollection=[...ids]; d.galaxyCollection=[...ids];
        localStorage.setItem(key,JSON.stringify(d));
      }catch(_){}
    }
  }

  function phase4GalaxyPickup(scene){
    const p=scene.pending, other=scene.other;
    if(!p?.success || other?.phase4NamedType!=='galaxy' || !GALAXY_IDS.has(other.phase4NamedId))return null;
    const incoming=Array.isArray(p.transferInMembers)?p.transferInMembers:[];
    if(!incoming.length)return null;
    const current=cleanRunGalaxies(scene.phase4GalaxyCollection);
    if(current.includes(other.phase4NamedId))return null;
    current.push(other.phase4NamedId); scene.phase4GalaxyCollection=current;
    return GALAXY_BY_ID[other.phase4NamedId]||null;
  }

  proto.resetRun=function(...args){
    this.phase4GalaxyCollection=[];
    this._atlasGalaxyPickup=null;
    return baseResetRun.apply(this,args);
  };

  proto.resolve=function(...args){
    this._atlasGalaxyPickup=phase4GalaxyPickup(this);
    return baseResolve.apply(this,args);
  };

  proto.drawResult=function(result){
    const pickup=this._atlasGalaxyPickup;
    const out=baseDrawResult.call(this,result);
    if(pickup){
      this.time.delayedCall(120,()=>{try{this.toast('GALAXY MAPPED • '+pickup.name,C.purple);}catch(_){}});
      this._atlasGalaxyPickup=null;
    }
    return out;
  };

  proto.save=function(silent=false){
    const out=baseSave.call(this,silent);
    if(!silent && out!==false)patchManualCheckpoint(this);
    return out;
  };

  proto.load=function(...args){
    const saved=readSavedGalaxyCollection();
    this.phase4GalaxyCollection=[...saved];
    const out=baseLoad.apply(this,args);
    if(out!==false)this.phase4GalaxyCollection=[...saved];
    return out;
  };

  function seeded(id){
    let h=2166136261,s=String(id);
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
  }

  // Atlas intentionally caps at 64px assets for now. Higher-detail LODs can be added later.
  function textureFor(scene,item,diameter){
    if(!item?.spriteVariant||typeof cometSpriteTextureKey!=='function')return null;
    for(const lod of (diameter>26?[64,32]:[32,64])){
      const key=cometSpriteTextureKey(item.spriteVariant,lod);
      if(scene.textures.exists(key))return key;
    }
    return null;
  }

  function tierColor(item){
    const tier=item?.gameplayTiers?.[0]||'';
    if(tier.includes('DWARF'))return C.blue;
    if(tier.includes('PLANET'))return C.green;
    if(tier.includes('YELLOW'))return 0xffd966;
    if(tier.includes('BLUE GIANT'))return 0x86c9ff;
    if(tier.includes('RED HYPER'))return 0xff7a63;
    if(tier==='NEBULA')return C.purple;
    if(tier==='PULSAR')return C.cyan;
    if(tier.includes('BLACK HOLE'))return C.orange;
    return C.cyan;
  }

  function addMotion(scene,config){
    const t=scene.tweens.add(config); scene._atlasMotionTweens??=[]; scene._atlasMotionTweens.push(t); return t;
  }
  function stopMotion(scene){
    (scene._atlasMotionTweens||[]).forEach(t=>{try{t.stop();}catch(_){}}); scene._atlasMotionTweens=[];
  }
  function stopTransitions(scene){
    (scene._atlasTransitionTweens||[]).forEach(t=>{try{t.stop();}catch(_){}}); scene._atlasTransitionTweens=[]; scene._atlasTransitioning=false;
  }
  function stopAtlas(scene){
    const h=scene._atlasInputHandlers;
    if(h){
      try{scene.input.off('pointerdown',h.down);}catch(_){}
      try{scene.input.off('pointermove',h.move);}catch(_){}
      try{scene.input.off('pointerup',h.up);}catch(_){}
      try{scene.input.off('pointerupoutside',h.up);}catch(_){}
      try{scene.input.off('wheel',h.wheel);}catch(_){}
    }
    scene._atlasInputHandlers=null; scene._atlasPinch=null; scene._atlasDrag=null;
    stopMotion(scene); stopTransitions(scene);
    try{scene._atlasTickEvent?.remove(false);}catch(_){}
    scene._atlasTickEvent=null; scene._atlasOrbitNodes=[];
  }

  function addUnknown(scene,world,x,y,r){
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.lineStyle(1.25,C.muted,.40).strokeCircle(0,0,r);g.fillStyle(C.muted,.16).fillCircle(0,0,Math.max(1.2,r*.2));
    c.add(g);world.add(c);return c;
  }

  function addIdentity(scene,world,item,x,y,diameter,discovered,opt={}){
    const anchor=opt.anchor===true;
    if(!item)return null;
    if(!discovered&&!anchor)return addUnknown(scene,world,x,y,Math.max(3.5,diameter*.32));
    const group=scene.add.container(x,y);world.add(group);
    const key=textureFor(scene,item,diameter);
    if(key){
      const image=scene.add.image(0,0,key),tex=scene.textures.get?.(key);
      if(tex?.setFilter&&Phaser?.Textures?.FilterMode)tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const w=Math.max(image.width||1,1),h=Math.max(image.height||w,1);
      image.setDisplaySize(diameter,diameter*h/w);group.add(image);group._atlasImage=image;
    }else{
      const g=scene.add.graphics();g.fillStyle(tierColor(item),.82).fillCircle(0,0,diameter/2);g.lineStyle(1,C.white,.25).strokeCircle(0,0,diameter/2);group.add(g);
    }
    const hit=scene.add.circle(0,0,Math.max(12,diameter*.62),0xffffff,.001).setInteractive({useHandCursor:true});
    hit.on('pointerdown',p=>{scene._atlasTapStart={x:p.x,y:p.y,id:item.id};});
    hit.on('pointerup',p=>{
      const s=scene._atlasTapStart;
      if(!s||s.id!==item.id||Math.hypot(p.x-s.x,p.y-s.y)>12||scene._atlasGestureMoved||scene._atlasTransitioning)return;
      scene.showUniverseAtlasInfo?.(item,anchor&&!discovered);
    });
    group.add(hit);
    if(opt.label)text(scene,group,0,diameter*.58+5,item.name,opt.labelSize||5.8,discovered?C.white:C.cyan,{ox:.5,bold:true,align:'center',width:opt.labelWidth||88});
    return group;
  }

  function formatUTC(ms){
    const d=new Date(ms),m=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return String(d.getUTCDate()).padStart(2,'0')+' '+m[d.getUTCMonth()]+' '+d.getUTCFullYear();
  }
  function simDays(scene){ return (Number(scene._atlasSimMs||Date.now())-J2000_MS)/DAY_MS; }
  function solveE(mean,e){
    const tau=Math.PI*2,m=((mean%tau)+tau)%tau;let E=e<.8?m:Math.PI;
    for(let i=0;i<6;i++)E-=(E-e*Math.sin(E)-m)/Math.max(.0001,1-e*Math.cos(E));
    return E;
  }
  function orbitalPoint(cfg,E){
    const e=clamp(Number(cfg.e)||0,0,.92),a=Number(cfg.r)||1,flat=cfg.flat==null?.62:Number(cfg.flat);
    let x=a*(Math.cos(E)-e),y=a*Math.sqrt(Math.max(.05,1-e*e))*Math.sin(E)*flat,q=rad(cfg.rot||0);
    return{x:x*Math.cos(q)-y*Math.sin(q),y:x*Math.sin(q)+y*Math.cos(q)};
  }
  function drawOrbitPath(scene,world,cfg,color,alpha,width){
    const g=scene.add.graphics(),n=96;g.lineStyle(width||1,color,alpha).beginPath();
    for(let i=0;i<=n;i++){const p=orbitalPoint(cfg,Math.PI*2*i/n);if(!i)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);}
    g.strokePath();world.add(g);return g;
  }
  function registerOrbit(scene,node,cfg){
    if(!node)return;scene._atlasOrbitNodes??=[];scene._atlasOrbitNodes.push({node,cfg});
  }
  function updateOrbits(scene){
    const days=simDays(scene);
    for(const entry of scene._atlasOrbitNodes||[]){
      const {node,cfg}=entry;if(!node||node.active===false)continue;
      const mean=rad(cfg.phase||0)+Math.PI*2*days/Math.max(1,Number(cfg.period)||365.2);
      const p=orbitalPoint(cfg,solveE(mean,cfg.e||0));node.x=p.x;node.y=p.y;
    }
  }
  function updateSimLabels(scene){
    if(scene._atlasClockText){
      scene._atlasClockText.setVisible(scene._atlasMap===0);
      if(scene._atlasMap===0){
        const speed=SPEEDS[scene._atlasSpeedIndex||0];
        scene._atlasClockText.setText((scene._atlasPaused?'PAUSED • ':'SIM ')+formatUTC(scene._atlasSimMs)+(scene._atlasPaused?'':' • '+speed+' DAYS/SEC'));
      }
    }
    if(scene._atlasPauseButton?._atlasLabel)scene._atlasPauseButton._atlasLabel.setText(scene._atlasPaused?'▶ RESUME':'Ⅱ PAUSE');
    if(scene._atlasFastButton?._atlasLabel)scene._atlasFastButton._atlasLabel.setText('≫ '+SPEEDS[scene._atlasSpeedIndex||0]+' D/S');
  }
  function tickSimulation(scene){
    const now=performance.now(),last=Number(scene._atlasLastTick||now),dt=Math.min(.25,Math.max(0,(now-last)/1000));
    scene._atlasLastTick=now;
    if(!scene._atlasPaused)scene._atlasSimMs+=dt*SPEEDS[scene._atlasSpeedIndex||0]*DAY_MS;
    updateOrbits(scene);
    if(!scene._atlasLastClockUpdate||now-scene._atlasLastClockUpdate>350){scene._atlasLastClockUpdate=now;updateSimLabels(scene);}
  }

  function drawStarfield(scene,world,level){
    const rng=seeded('atlas-stars-'+level),g=scene.add.graphics();
    for(let i=0;i<96;i++){const x=-190+rng()*380,y=-245+rng()*490,r=.45+rng()*1.2,a=.11+rng()*.42;g.fillStyle(i%10===0?C.cyan:C.white,a).fillCircle(x,y,r);}
    world.add(g);
  }

  function renderSolar(scene,world,found){
    const paths=scene.add.container(0,0);world.add(paths);
    PLANETS.forEach((cfg,i)=>drawOrbitPath(scene,paths,cfg,C.white,i<4?.24:.18,i===2?1.45:1.15));
    DWARFS.forEach(cfg=>drawOrbitPath(scene,paths,cfg,cfg.id==='dwarf_ceres'?C.blue:C.purple,cfg.id==='dwarf_ceres'?.28:.22,1.05));

    addIdentity(scene,world,identity('yellowDwarf_sun'),0,0,58,found.has('yellowDwarf_sun'),{anchor:true,label:true,labelSize:6.2});
    PLANETS.forEach(cfg=>{
      const node=addIdentity(scene,world,identity(cfg.id),0,0,cfg.d,found.has(cfg.id),{});
      registerOrbit(scene,node,cfg);
    });
    DWARFS.forEach(cfg=>{
      const node=addIdentity(scene,world,identity(cfg.id),0,0,cfg.d,found.has(cfg.id),{});
      registerOrbit(scene,node,cfg);
    });
    updateOrbits(scene);
    text(scene,world,-178,-222,'MAJOR PLANET ORBITS',5.8,C.muted,{bold:true});
    text(scene,world,-178,-203,'DWARF-PLANET ORBITS',5.8,C.purple,{bold:true});
    text(scene,world,0,216,'PINCH TO INSPECT • DRAG WHILE ZOOMED • DISTANCE IS COMPRESSED',5.5,C.muted,{ox:.5,bold:true});
  }

  function renderStars(scene,world,found){
    const grid=scene.add.graphics();grid.lineStyle(1,C.cyan,.07);
    [-120,-60,0,60,120].forEach(x=>grid.lineBetween(x,-220,x,220));
    [-160,-80,0,80,160].forEach(y=>grid.lineBetween(-180,y,180,y));
    grid.lineStyle(1.1,C.cyan,.12);
    grid.lineBetween(-85,72,0,22);grid.lineBetween(0,22,42,-92);grid.lineBetween(42,-92,108,-34);grid.lineBetween(-45,-176,-116,-92);world.add(grid);

    const tiers=['YELLOW DWARF STAR','BLUE GIANT STAR','RED HYPERGIANT STAR'];
    COMET_COLLECTIBLE_IDENTITIES.filter(x=>tiers.includes(x.gameplayTiers?.[0])).forEach(item=>{
      const p=STAR_POS[item.id]||[0,0],anchor=item.id==='yellowDwarf_sun',d=STAR_SIZE[item.id]||18;
      const node=addIdentity(scene,world,item,p[0],p[1],d,found.has(item.id),{anchor,label:found.has(item.id)||anchor,labelSize:5.2,labelWidth:94});
      if(node&&item.gameplayTiers[0]==='RED HYPERGIANT STAR'){
        const rng=seeded(item.id+'-var');
        addMotion(scene,{targets:node,scaleX:{from:.985,to:1.025},scaleY:{from:.985,to:1.025},duration:4300+rng()*3500,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      }
    });
    text(scene,world,0,216,'STAR DIAMETERS USE A LOG-COMPRESSED VISUAL SCALE',5.6,C.muted,{ox:.5,bold:true});
  }

  function galaxyShape(scene,world,profile,color,scale=1){
    const c=scene.add.container(0,0),g=scene.add.graphics(),r=142*scale;
    if(profile==='sombrero'){
      g.fillStyle(color,.08).fillEllipse(0,0,r*2.0,r*.55);
      g.lineStyle(5,color,.25).strokeEllipse(0,0,r*1.9,r*.34);
      g.fillStyle(C.white,.12).fillEllipse(0,0,r*.42,r*.34);
    }else if(profile==='cartwheel'){
      g.lineStyle(8,color,.16).strokeEllipse(0,0,r*1.85,r*1.05);
      g.lineStyle(2,C.white,.12).strokeEllipse(0,0,r*.80,r*.48);
      for(let i=0;i<16;i++){const a=i*Math.PI/8;g.lineStyle(1,color,.08).lineBetween(Math.cos(a)*r*.42,Math.sin(a)*r*.25,Math.cos(a)*r*.90,Math.sin(a)*r*.51);}
    }else if(profile==='antennae'){
      g.lineStyle(10,color,.10).strokeEllipse(-36,8,r*.95,r*.58);
      g.lineStyle(10,C.cyan,.08).strokeEllipse(38,-5,r*.95,r*.58);
      g.lineStyle(2,color,.16).lineBetween(-65,20,-150,95);g.lineStyle(2,C.cyan,.14).lineBetween(68,-15,158,-84);
    }else if(profile==='irregular'){
      g.fillStyle(color,.08).fillEllipse(-25,-8,r*1.45,r*.72).fillEllipse(39,20,r*.88,r*.58).fillCircle(-62,33,r*.22);
      g.lineStyle(2,color,.18).strokeEllipse(-5,4,r*1.8,r*.88);
    }else{
      const arms=profile==='andromeda'?2:(profile==='whirlpool'?2:4),flat=profile==='andromeda'?.43:.70;
      for(let arm=0;arm<arms;arm++){
        const start=arm*Math.PI*2/arms;g.lineStyle(8,arm%2?C.purple:color,.075).beginPath();
        for(let i=0;i<=56;i++){const t=i/56,a=start+t*Math.PI*2.0,d=r*(.10+.90*t),x=Math.cos(a)*d,y=Math.sin(a)*d*flat;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
        g.lineStyle(1.25,C.white,.09).beginPath();
        for(let i=0;i<=56;i++){const t=i/56,a=start+t*Math.PI*2.0,d=r*(.10+.90*t),x=Math.cos(a)*d,y=Math.sin(a)*d*flat;if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      }
      g.fillStyle(C.white,.065).fillEllipse(0,0,r*.58,r*.36);
    }
    c.add(g);world.add(c);addMotion(scene,{targets:c,angle:360,duration:120000,repeat:-1,ease:'Linear'});return c;
  }

  function galaxyAvailable(scene){
    const objects=objectDiscoverySet(scene),galaxies=galaxyDiscoverySet(scene),out=new Set(['milky-way']);
    for(const id of objects){
      const host=hostGalaxyFor(identity(id));
      if(host && GALAXY_VIEWS[host])out.add(host);
    }
    GALAXY_COLLECTIBLES.forEach(g=>{if(galaxies.has(g.id))out.add(g.id);});
    return [...out];
  }

  function selectedGalaxy(scene){
    const available=galaxyAvailable(scene);
    if(!available.includes(scene._atlasGalaxyKey))scene._atlasGalaxyKey=available[0]||'milky-way';
    return GALAXY_VIEWS[scene._atlasGalaxyKey]||GALAXY_VIEWS['milky-way'];
  }

  function renderGalaxy(scene,world,found){
    const view=selectedGalaxy(scene);
    galaxyShape(scene,world,view.profile,view.color||C.cyan,1);

    const eligible=COMET_COLLECTIBLE_IDENTITIES.filter(item=>{
      const tier=item.gameplayTiers?.[0];
      return hostGalaxyFor(item)===view.key && ['NEBULA','PULSAR','BLACK HOLE','SUPER MASSIVE BLACK HOLE'].includes(tier);
    });

    const positionFor=item=>{
      const fixed=GALAXY_OBJECT_POS[item.id];
      if(fixed)return fixed;
      const rng=seeded(view.key+'-'+item.id),a=rng()*Math.PI*2,r=62+rng()*102;
      const tier=item.gameplayTiers?.[0],d=tier==='NEBULA'?32:(tier==='PULSAR'?11:(tier==='BLACK HOLE'?18:27));
      return [Math.cos(a)*r,Math.sin(a)*r*.72,d];
    };

    for(const item of eligible){
      const tier=item.gameplayTiers?.[0],p=positionFor(item),isCentral=tier==='SUPER MASSIVE BLACK HOLE';
      const discovered=found.has(item.id);
      const node=addIdentity(scene,world,item,p[0],p[1],p[2],discovered,{
        label:discovered && (view.key!=='milky-way'||isCentral),
        labelSize:isCentral?5.4:5.0,
        labelWidth:isCentral?100:94
      });
      if(!node||!discovered)continue;
      const target=node._atlasImage||node;
      const rng=seeded(item.id+'-motion');
      if(tier==='PULSAR')addMotion(scene,{targets:target,alpha:{from:.55,to:1},duration:360+rng()*520,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      else if(tier==='BLACK HOLE')addMotion(scene,{targets:target,angle:360,duration:18000+rng()*9000,repeat:-1,ease:'Linear'});
      else if(tier==='NEBULA')addMotion(scene,{targets:target,scaleX:{from:.99,to:1.018},scaleY:{from:.99,to:1.018},duration:9000+rng()*6000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
    }

    if(!eligible.length){
      text(scene,world,0,160,'NO CURRENT NAMED SUB-OBJECTS ARE ASSIGNED TO THIS GALAXY YET',5.8,C.muted,{ox:.5,bold:true,width:300,align:'center'});
    }
    text(scene,world,0,216,'GALAXY VIEW • PINCH AND PAN WITHOUT LEAVING THIS MAP',5.5,C.muted,{ox:.5,bold:true});
  }

  function addDeepGalaxy(scene,world,spec,x,y,w,h,discovered,clickable){
    const c=scene.add.container(x,y),g=scene.add.graphics(),color=spec.color||C.cyan;
    if(discovered){
      g.lineStyle(7,color,.12).strokeEllipse(0,0,w,h);
      g.lineStyle(1.6,color,.55).strokeEllipse(0,0,w,h);g.fillStyle(C.white,.25).fillCircle(0,0,2.2);
    }else{
      g.lineStyle(1.2,C.muted,.22).strokeEllipse(0,0,w,h);g.fillStyle(C.muted,.12).fillCircle(0,0,1.5);
    }
    c.add(g);world.add(c);
    if(discovered){
      text(scene,c,0,h*.58+4,spec.name,5.3,C.white,{ox:.5,bold:true,width:90,align:'center'});
      addMotion(scene,{targets:c,angle:360,duration:85000+seeded(spec.id||spec.key)()*45000,repeat:-1,ease:'Linear'});
    }
    if(discovered&&clickable){
      const hit=scene.add.ellipse(0,0,Math.max(46,w),Math.max(30,h),0xffffff,.001).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{if(scene._atlasTransitioning)return;scene._atlasGalaxyKey=spec.id||spec.key;transitionMap(scene,-1);});
      c.add(hit);
    }
    return c;
  }

  function addDeepCore(scene,world,id,name,x,y,w,h,found){
    const host=scene.add.graphics();host.lineStyle(2,C.cyan,.16).strokeEllipse(x,y,w,h);host.fillStyle(C.white,.05).fillCircle(x,y,2);world.add(host);
    const item=identity(id);
    if(found){
      const halo=scene.add.graphics();halo.fillStyle(C.orange,.055).fillCircle(x,y,21);halo.lineStyle(1,C.orange,.24).strokeCircle(x,y,18);world.add(halo);
      const node=addIdentity(scene,world,item,x,y,22,true,{label:true,labelSize:5.2,labelWidth:84});
      if(node)addMotion(scene,{targets:node,angle:360,duration:22000+seeded(id)()*9000,repeat:-1,ease:'Linear'});
    }else text(scene,world,x,y+h*.68,name,4.9,C.muted,{ox:.5,bold:true});
  }

  function renderDeep(scene,world,found,galaxies){
    const net=scene.add.graphics(),nodes=[[-142,-150],[92,-166],[-96,-28],[128,8],[-142,156],[92,168],[0,38]];
    net.lineStyle(1,C.cyan,.07);[[0,2],[2,4],[2,6],[6,1],[6,3],[3,5],[1,3]].forEach(p=>net.lineBetween(nodes[p[0]][0],nodes[p[0]][1],nodes[p[1]][0],nodes[p[1]][1]));world.add(net);

    addDeepGalaxy(scene,world,{key:'milky-way',name:'MILKY WAY',color:0xa8d8ff},-70,18,88,32,true,true);
    const available=new Set(galaxyAvailable(scene));
    const lmcVisible=available.has('lmc');
    addDeepGalaxy(scene,world,{key:'lmc',name:'LARGE MAGELLANIC CLOUD',color:0x9edfff},-126,57,44,24,lmcVisible,true);

    const positions={
      andromeda:[92,-166,70,28],whirlpool:[-142,-150,56,26],sombrero:[128,8,68,22],cartwheel:[-142,156,64,34],antennae:[92,168,72,30]
    };
    GALAXY_COLLECTIBLES.forEach(spec=>{
      const p=positions[spec.id];
      const visible=galaxies.has(spec.id)||available.has(spec.id);
      addDeepGalaxy(scene,world,spec,p[0],p[1],p[2],p[3],visible,true);
    });

    // These host galaxies are context nodes for the already-collectible supermassive black holes.
    addDeepCore(scene,world,'smbh_m87','M87',18,-91,72,34,found.has('smbh_m87'));
    addDeepCore(scene,world,'smbh_ngc4889','NGC 4889',126,103,66,30,found.has('smbh_ngc4889'));
    addDeepCore(scene,world,'smbh_ton618','TON 618 HOST',-25,142,60,28,found.has('smbh_ton618'));

    text(scene,world,0,216,'TAP A REVEALED GALAXY TO ENTER IT • SUPERMASSIVE BLACK HOLES ARE SHOWN AT THEIR HOSTS',5.2,C.muted,{ox:.5,bold:true,width:360,align:'center'});
  }

  function makeWorld(scene,mapIndex){
    scene._atlasOrbitNodes=[];
    const found=objectDiscoverySet(scene),galaxies=galaxyDiscoverySet(scene);
    const world=scene.add.container(W/2,scene.Y(410));world.setDepth(2);scene.ui.add(world);
    if(scene._atlasMapMask)world.setMask(scene._atlasMapMask);
    drawStarfield(scene,world,mapIndex);
    if(mapIndex===0)renderSolar(scene,world,found);
    else if(mapIndex===1)renderStars(scene,world,found);
    else if(mapIndex===2)renderGalaxy(scene,world,found);
    else renderDeep(scene,world,found,galaxies);
    return world;
  }

  function applyView(scene,world,view){
    if(!world)return;const v=view||{scale:1,x:W/2,y:scene.Y(410)};
    world.setScale(v.scale||1);world.x=Number(v.x)||W/2;world.y=Number(v.y)||scene.Y(410);
  }
  function defaultView(scene){return{scale:1,x:W/2,y:scene.Y(410)};}
  function currentView(scene){const w=scene._atlasMapRoot;return w?{scale:w.scaleX||1,x:w.x,y:w.y}:defaultView(scene);}
  function clampPan(scene){
    const w=scene._atlasMapRoot;if(!w)return;
    const scale=clamp(w.scaleX||1,1,5.5);w.setScale(scale);
    const bx=W/2,by=scene.Y(410),mx=(scale-1)*185,my=(scale-1)*238;
    w.x=clamp(w.x,bx-mx,bx+mx);w.y=clamp(w.y,by-my,by+my);
  }

  function updateHeader(scene){
    const map=clampMap(scene._atlasMap),found=totalDiscovered(scene);
    scene._atlasTitle?.setText(MAPS[map].name);
    scene._atlasSubtitle?.setText(MAPS[map].subtitle);
    scene._atlasScale?.setText(String(map+1)+' / '+MAPS.length);
    scene._atlasProgress?.setText(String(found)+' / '+String(totalDiscoverables())+' REVEALED FROM TOP 5');
    scene._atlasInButton?.setAlpha(map===0?.30:1);
    scene._atlasOutButton?.setAlpha(map===MAX_MAP?.30:1);
    updateMapControls(scene);updateSimLabels(scene);
  }

  function updateMapControls(scene){
    const solar=scene._atlasMap===0,galaxy=scene._atlasMap===2;
    scene._atlasPauseButton?.setVisible(solar);
    scene._atlasFastButton?.setVisible(solar);
    scene._atlasGalaxyPrev?.setVisible(galaxy);
    scene._atlasGalaxyNext?.setVisible(galaxy);
    scene._atlasGalaxyName?.setVisible(galaxy);
    if(galaxy){
      const v=selectedGalaxy(scene);
      scene._atlasGalaxyName?.setText(v.name);
    }
  }

  function renderImmediate(scene){
    stopMotion(scene);
    try{scene._atlasMapRoot?.destroy(true);}catch(_){}
    try{scene._atlasInfoRoot?.destroy(true);}catch(_){}
    scene._atlasInfoRoot=null;
    scene._atlasMapRoot=makeWorld(scene,clampMap(scene._atlasMap));
    applyView(scene,scene._atlasMapRoot,defaultView(scene));
    updateHeader(scene);
  }

  function transitionMap(scene,delta){
    if(scene._atlasTransitioning)return;
    const from=clampMap(scene._atlasMap),to=clampMap(from+delta);
    if(to===from)return;
    scene._atlasTransitioning=true;scene._atlasGestureMoved=true;
    stopMotion(scene);try{scene._atlasInfoRoot?.destroy(true);}catch(_){}

    const old=scene._atlasMapRoot,zoomOut=delta>0;
    scene._atlasMap=to;
    const nw=makeWorld(scene,to);scene._atlasMapRoot=nw;
    applyView(scene,nw,defaultView(scene));
    nw.setScale(zoomOut?3.0:.22).setAlpha(0);
    updateHeader(scene);

    const list=[];
    if(old)list.push(scene.tweens.add({targets:old,scaleX:zoomOut?.15:3.3,scaleY:zoomOut?.15:3.3,alpha:0,duration:620,ease:'Cubic.InOut'}));
    list.push(scene.tweens.add({targets:nw,scaleX:1,scaleY:1,alpha:1,duration:650,ease:'Cubic.InOut',onComplete:()=>{
      try{old?.destroy(true);}catch(_){}
      scene._atlasTransitioning=false;scene._atlasGestureMoved=false;updateOrbits(scene);
    }}));
    scene._atlasTransitionTweens=list;
  }

  function swapGalaxy(scene,delta){
    if(scene._atlasMap!==2||scene._atlasTransitioning)return;
    const av=galaxyAvailable(scene);if(av.length<2)return;
    let i=Math.max(0,av.indexOf(scene._atlasGalaxyKey));i=(i+delta+av.length)%av.length;scene._atlasGalaxyKey=av[i];
    stopMotion(scene);const old=scene._atlasMapRoot,nw=makeWorld(scene,2);scene._atlasMapRoot=nw;
    applyView(scene,nw,defaultView(scene));nw.setAlpha(0).setScale(.92);updateHeader(scene);
    scene._atlasTransitioning=true;
    scene._atlasTransitionTweens=[
      scene.tweens.add({targets:old,alpha:0,scaleX:1.08,scaleY:1.08,duration:330,ease:'Sine.InOut'}),
      scene.tweens.add({targets:nw,alpha:1,scaleX:1,scaleY:1,duration:360,ease:'Sine.InOut',onComplete:()=>{try{old?.destroy(true);}catch(_){}scene._atlasTransitioning=false;}})
    ];
  }

  function installInput(scene){
    const old=scene._atlasInputHandlers;
    if(old){
      try{scene.input.off('pointerdown',old.down);}catch(_){}
      try{scene.input.off('pointermove',old.move);}catch(_){}
      try{scene.input.off('pointerup',old.up);}catch(_){}
      try{scene.input.off('pointerupoutside',old.up);}catch(_){}
      try{scene.input.off('wheel',old.wheel);}catch(_){}
    }
    try{if(!scene._atlasExtraPointerAdded){scene.input.addPointer(1);scene._atlasExtraPointerAdded=true;}}catch(_){}
    const top=scene.Y(145),bottom=scene.Y(672);
    const inMap=p=>p&&p.y>=top&&p.y<=bottom;
    const active=()=>[scene.input.pointer1,scene.input.pointer2,scene.input.activePointer].filter((p,i,a)=>p&&p.isDown&&inMap(p)&&a.indexOf(p)===i);

    const down=p=>{
      if(!inMap(p)||scene._atlasTransitioning)return;
      scene._atlasGestureMoved=false;
      const ps=active();
      if(ps.length>=2){
        scene._atlasPinch={dist:Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y),scale:scene._atlasMapRoot?.scaleX||1};
        scene._atlasDrag=null;
      }else{
        scene._atlasDrag={x:p.x,y:p.y,wx:scene._atlasMapRoot?.x||W/2,wy:scene._atlasMapRoot?.y||scene.Y(410)};
      }
    };
    const move=p=>{
      if(scene._atlasTransitioning)return;
      const ps=active();
      if(ps.length>=2){
        const dist=Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y);
        if(!scene._atlasPinch)scene._atlasPinch={dist,scale:scene._atlasMapRoot?.scaleX||1};
        const scale=clamp(scene._atlasPinch.scale*dist/Math.max(1,scene._atlasPinch.dist),1,5.5);
        scene._atlasMapRoot?.setScale(scale);clampPan(scene);
        if(Math.abs(dist-scene._atlasPinch.dist)>8)scene._atlasGestureMoved=true;
        return;
      }
      if(scene._atlasDrag&&p.isDown&&(scene._atlasMapRoot?.scaleX||1)>1.001){
        const dx=p.x-scene._atlasDrag.x,dy=p.y-scene._atlasDrag.y;
        scene._atlasMapRoot.x=scene._atlasDrag.wx+dx;scene._atlasMapRoot.y=scene._atlasDrag.wy+dy;clampPan(scene);
        if(Math.hypot(dx,dy)>7)scene._atlasGestureMoved=true;
      }
    };
    const up=()=>{scene._atlasPinch=null;scene._atlasDrag=null;setTimeout(()=>{scene._atlasGestureMoved=false;},0);};
    const wheel=(p,objects,dx,dy)=>{
      if(!inMap(p)||scene._atlasTransitioning||Math.abs(dy)<2)return;
      const w=scene._atlasMapRoot;if(!w)return;
      w.setScale(clamp((w.scaleX||1)*Math.exp(-dy*.0018),1,5.5));clampPan(scene);scene._atlasGestureMoved=true;
    };
    scene.input.on('pointerdown',down);scene.input.on('pointermove',move);scene.input.on('pointerup',up);scene.input.on('pointerupoutside',up);scene.input.on('wheel',wheel);
    scene._atlasInputHandlers={down,move,up,wheel};
  }

  proto.showUniverseAtlasInfo=function(item,anchorOnly){
    try{this._atlasInfoRoot?.destroy(true);}catch(_){}
    const root=this.add.container(0,0).setDepth(20);this.ui.add(root);this._atlasInfoRoot=root;
    const top=this.Y(606),panel=this.add.graphics();panel.fillStyle(C.panel,.985).fillRoundedRect(18,top,384,128,10);panel.lineStyle(1.5,C.cyan,.72).strokeRoundedRect(18,top,384,128,10);root.add(panel);
    const found=objectDiscoverySet(this).has(item.id),key=textureFor(this,item,58);
    if(key){const im=this.add.image(62,top+62,key),w=Math.max(1,im.width),h=Math.max(1,im.height);im.setDisplaySize(58,58*h/w);root.add(im);}
    text(this,root,103,top+20,item.name,10.5,C.white,{bold:true,width:220});
    text(this,root,103,top+46,item.designation||item.scienceClass,7.1,C.cyan,{bold:true,width:230});
    text(this,root,103,top+70,item.designation?item.scienceClass:(anchorOnly?'ORIENTATION ANCHOR':'DISCOVERED'),6.8,C.muted,{bold:true,width:230});
    text(this,root,103,top+95,found?'REVEALED BY YOUR HIGH-SCORE COLLECTION':'VISIBLE AS A MAP ANCHOR',6.3,found?C.green:C.muted,{bold:true,width:245});
    button(this,root,367,top+25,42,28,'×',C.orange,()=>{try{root.destroy(true);}catch(_){}this._atlasInfoRoot=null;},13);
  };

  proto.showUniverseAtlas=function(mapIndex=0,returnTo='home'){
    stopAtlas(this);this.clearUI();this.state='UNIVERSE_ATLAS';
    this._atlasReturnTo=returnTo;this._atlasMap=clampMap(mapIndex);this._atlasGalaxyKey=this._atlasGalaxyKey||'milky-way';
    this._atlasMotionTweens=[];this._atlasTransitionTweens=[];this._atlasTransitioning=false;this._atlasOrbitNodes=[];
    this._atlasSimMs=Date.now();this._atlasLastTick=performance.now();this._atlasSpeedIndex=0;this._atlasPaused=false;

    const bg=this.add.graphics();bg.fillStyle(0x01040a,1).fillRect(0,0,W,H);this.ui.add(bg);
    const chrome=this.add.container(0,0).setDepth(10);this.ui.add(chrome);

    button(this,chrome,58,this.Y(32),82,30,'BACK',C.orange,()=>{const target=this._atlasReturnTo||'home';stopAtlas(this);this.showScores(target);},8.4);
    this._atlasScale=text(this,chrome,W-24,this.Y(25),'',7.1,C.muted,{ox:1,bold:true});
    this._atlasTitle=text(this,chrome,W/2,this.Y(58),'',17,C.white,{ox:.5,bold:true});
    this._atlasSubtitle=text(this,chrome,W/2,this.Y(84),'',6.7,C.cyan,{ox:.5,bold:true,width:350,align:'center'});
    this._atlasProgress=text(this,chrome,W/2,this.Y(106),'',6.7,C.green,{ox:.5,bold:true});
    this._atlasClockText=text(this,chrome,W/2,this.Y(128),'',6.3,C.orange,{ox:.5,bold:true});

    const frameTop=this.Y(145),frameBottom=this.Y(672),frame=this.add.graphics();
    frame.fillStyle(C.panel,.20).fillRoundedRect(10,frameTop,400,frameBottom-frameTop,12);frame.lineStyle(1.4,C.cyan,.26).strokeRoundedRect(10,frameTop,400,frameBottom-frameTop,12);chrome.add(frame);

    const maskGraphics=this.add.graphics();maskGraphics.fillStyle(0xffffff,1).fillRect(11,frameTop+1,398,Math.max(1,frameBottom-frameTop-2));maskGraphics.setVisible(false);this.ui.add(maskGraphics);
    this._atlasMapMask=maskGraphics.createGeometryMask();

    this._atlasPauseButton=button(this,chrome,112,this.Y(163),116,26,'Ⅱ PAUSE',C.orange,()=>{this._atlasPaused=!this._atlasPaused;updateSimLabels(this);},7.5);
    this._atlasFastButton=button(this,chrome,308,this.Y(163),116,26,'≫ 12 D/S',C.cyan,()=>{this._atlasSpeedIndex=(this._atlasSpeedIndex+1)%SPEEDS.length;this._atlasPaused=false;updateSimLabels(this);},7.5);

    this._atlasGalaxyPrev=button(this,chrome,58,this.Y(163),54,26,'◀',C.cyan,()=>swapGalaxy(this,-1),8);
    this._atlasGalaxyNext=button(this,chrome,362,this.Y(163),54,26,'▶',C.cyan,()=>swapGalaxy(this,1),8);
    this._atlasGalaxyName=text(this,chrome,W/2,this.Y(156),'',7.4,C.white,{ox:.5,bold:true,width:220,align:'center'});

    text(this,chrome,24,this.Y(650),'◆ REVEALED',6.3,C.green,{bold:true});text(this,chrome,119,this.Y(650),'◇ UNREVEALED',6.3,C.muted,{bold:true});
    text(this,chrome,W/2,this.Y(742),'PINCH = LOCAL ZOOM • DRAG = PAN • + / − = CHANGE MAP',6.3,C.muted,{ox:.5,bold:true});
    this._atlasInButton=button(this,chrome,95,this.Y(785),142,44,'+  IN',C.cyan,()=>transitionMap(this,-1),10.2);
    this._atlasOutButton=button(this,chrome,325,this.Y(785),142,44,'−  OUT',C.purple,()=>transitionMap(this,1),10.2);

    renderImmediate(this);installInput(this);
    this._atlasTickEvent=this.time.addEvent({delay:50,loop:true,callback:()=>tickSimulation(this)});
    updateSimLabels(this);
  };

  function patchScoreCounts(scene,scoreList){
    const labels=[];walk(scene.ui,node=>{if(typeof node?.text==='string'&&/^UNIQUE \d+$/.test(node.text.trim()))labels.push(node);});
    labels.sort((a,b)=>(a.y||0)-(b.y||0));
    labels.forEach((node,i)=>{
      const score=scoreList[i];if(!score)return;
      node.setText('UNIQUE '+String(scoreObjectIds(score).length+scoreGalaxyIds(score).length));
    });
  }

  proto.showScores=function(returnTo='home'){
    stopAtlas(this);
    const out=baseShowScores.call(this,returnTo),ss=scores(this);
    patchScoreCounts(this,ss);
    this.wideButton(W/2,this.Y(724),388,44,'UNIVERSE MAP '+String(totalDiscovered(this))+'/'+String(totalDiscoverables()),C.purple,()=>this.showUniverseAtlas(0,returnTo));
    return out;
  };

  window.CometUniverseAtlasV3=Object.freeze({
    version:3,
    maps:MAPS.map(x=>x.name),
    galaxyCollectibles:GALAXY_COLLECTIBLES.map(x=>x.id),
    total:totalDiscoverables(),
    localPinchZoom:true,
    localPan:true,
    mapChangeButtons:true,
    simSpeeds:[...SPEEDS],
    atlasSpriteLODMax:64,
    getDiscoveredObjects:scene=>[...objectDiscoverySet(scene)],
    getDiscoveredGalaxies:scene=>[...galaxyDiscoverySet(scene)]
  });
})();