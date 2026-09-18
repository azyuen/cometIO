// Universe Atlas v1
// Persistent reward map built from the UNION of collectible snapshots stored in the top-five high scores.
// The atlas is deliberately logarithmic/stylised rather than physically to scale.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseShowHome = proto.showHome;
  const LEVELS = [
    { name:'EARTH', subtitle:'HOME ORBIT • YOUR STARTING POINT' },
    { name:'SOLAR SYSTEM', subtitle:'PLANETS • DWARF PLANETS • STYLISED ORBITS' },
    { name:'STELLAR MAP', subtitle:'STARS • RELATIVE POSITIONS ARE STYLISED' },
    { name:'MILKY WAY', subtitle:'NEBULAE • PULSARS • STELLAR BLACK HOLES' },
    { name:'DEEP UNIVERSE', subtitle:'GALAXIES • SUPERMASSIVE BLACK HOLES' }
  ];
  const MAX_LEVEL = LEVELS.length - 1;

  function hex(n) { return `#${Number(n || 0).toString(16).padStart(6, '0')}`; }
  function clampLevel(v) { return Math.max(0, Math.min(MAX_LEVEL, Math.round(Number(v) || 0))); }
  function text(scene, parent, x, y, value, size, color = C.white, options = {}) {
    const t = scene.add.text(x, y, value, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: options.bold ? 'bold' : 'normal',
      color: hex(color),
      align: options.align || 'left',
      wordWrap: options.width ? { width: options.width, useAdvancedWrap: true } : undefined
    }).setOrigin(options.ox ?? 0, options.oy ?? 0);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    parent.add(t);
    return t;
  }
  function button(scene, parent, x, y, w, h, label, color, cb, fontSize = 9.2) {
    const c = scene.add.container(x, y), g = scene.add.graphics();
    g.fillStyle(color, .13).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(1.5, color, .9).strokeRoundedRect(-w/2, -h/2, w, h, 7);
    const t = scene.add.text(0, 0, label, { fontFamily:FONT, fontSize:`${fontSize}px`, fontStyle:'bold', color:'#fff' }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', cb);
    c.add([g, t, hit]); parent.add(c); return c;
  }

  function scores(scene) {
    try { return Array.isArray(scene.getScores?.()) ? scene.getScores() : []; }
    catch (_) { return []; }
  }
  function scoreIds(score) {
    const raw = Array.isArray(score?.collection) ? score.collection : (Array.isArray(score?.collectedIdentityIds) ? score.collectedIdentityIds : []);
    return raw.filter(id => !!COMET_COLLECTIBLE_BY_ID?.[id]);
  }
  function discoverySet(scene) {
    const out = new Set();
    for (const score of scores(scene)) for (const id of scoreIds(score)) out.add(id);
    return out;
  }
  function totalCollectibles() {
    return Array.isArray(COMET_COLLECTIBLE_IDENTITIES) ? COMET_COLLECTIBLE_IDENTITIES.length : 0;
  }
  function identitiesForTier(tier) {
    return COMET_COLLECTIBLE_IDENTITIES.filter(x => Array.isArray(x.gameplayTiers) && x.gameplayTiers.includes(tier));
  }
  function identity(id) { return COMET_COLLECTIBLE_BY_ID?.[id] || COMET_IDENTITY_BY_ID?.[id] || null; }

  function seeded(id) {
    let h = 2166136261;
    for (let i=0;i<String(id).length;i++) { h ^= String(id).charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function stopAtlasTweens(scene) {
    for (const tw of scene._atlasTweens || []) { try { tw.stop(); } catch (_) {} }
    scene._atlasTweens = [];
  }
  function stopAtlasInput(scene) {
    const h = scene._atlasInputHandlers;
    if (h) {
      try { scene.input.off('pointerdown', h.down); } catch (_) {}
      try { scene.input.off('pointermove', h.move); } catch (_) {}
      try { scene.input.off('pointerup', h.up); } catch (_) {}
      try { scene.input.off('pointerupoutside', h.up); } catch (_) {}
      try { scene.input.off('wheel', h.wheel); } catch (_) {}
    }
    scene._atlasInputHandlers = null;
    scene._atlasPinch = null;
    stopAtlasTweens(scene);
  }

  function textureFor(scene, item, diameter) {
    if (!item?.spriteVariant || typeof cometSpriteTextureKey !== 'function') return null;
    const preferred = diameter <= 34 ? [32,64] : [64,32];
    for (const lod of preferred) {
      const key = cometSpriteTextureKey(item.spriteVariant, lod);
      if (scene.textures.exists(key)) return key;
    }
    return null;
  }

  function tierColor(item) {
    const tier = item?.gameplayTiers?.[0] || '';
    if (tier.includes('DWARF')) return C.blue;
    if (tier.includes('PLANET')) return C.green;
    if (tier.includes('YELLOW')) return 0xffd966;
    if (tier.includes('BLUE GIANT')) return 0x86c9ff;
    if (tier.includes('RED HYPER')) return 0xff7a63;
    if (tier === 'NEBULA') return C.purple;
    if (tier === 'PULSAR') return C.cyan;
    if (tier.includes('BLACK HOLE')) return C.orange;
    return C.cyan;
  }

  function addUnknown(scene, world, x, y, radius = 8) {
    const g = scene.add.graphics();
    g.lineStyle(1.4, C.muted, .42).strokeCircle(x, y, radius);
    g.fillStyle(C.muted, .18).fillCircle(x, y, 2);
    world.add(g);
    return g;
  }

  function addIdentity(scene, world, item, x, y, diameter, discovered, options = {}) {
    const anchor = options.anchor === true;
    const visible = discovered || anchor;
    if (!visible) {
      addUnknown(scene, world, x, y, Math.max(5, diameter * .22));
      if (options.unknownLabel) text(scene, world, x, y + Math.max(12, diameter*.35), 'UNREVEALED', 5.5, C.muted, { ox:.5, bold:true });
      return null;
    }

    const group = scene.add.container(x, y);
    world.add(group);
    const key = textureFor(scene, item, diameter);
    if (key) {
      const image = scene.add.image(0, 0, key);
      const tex = scene.textures.get?.(key);
      if (tex?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const w = Math.max(image.width || 1, 1), h = Math.max(image.height || w, 1);
      image.setDisplaySize(diameter, diameter * (h / w));
      group.add(image);
    } else {
      const g = scene.add.graphics();
      g.fillStyle(tierColor(item), .82).fillCircle(0, 0, diameter/2);
      g.lineStyle(1, C.white, .24).strokeCircle(0, 0, diameter/2);
      group.add(g);
    }

    const hit = scene.add.circle(0, 0, Math.max(14, diameter*.58), 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', pointer => {
      scene._atlasTapStart = { x:pointer.x, y:pointer.y, id:item.id };
    });
    hit.on('pointerup', pointer => {
      const s = scene._atlasTapStart;
      if (!s || s.id !== item.id || Math.hypot(pointer.x-s.x, pointer.y-s.y) > 12) return;
      scene.showUniverseAtlasInfo?.(item, anchor && !discovered);
    });
    group.add(hit);

    if (options.label) {
      text(scene, group, 0, diameter*.58 + 5, item.name, options.labelSize || 5.9, discovered ? C.white : C.cyan, {
        ox:.5, bold:true, align:'center', width:options.labelWidth || 86
      });
    }
    return group;
  }

  function orbit(scene, node, cx, cy, rx, ry, startAngle, duration) {
    if (!node) return;
    const state = { a:startAngle };
    const tween = scene.tweens.add({
      targets:state, a:startAngle + Math.PI*2, duration, repeat:-1, ease:'Linear',
      onUpdate:() => { if (node.active !== false) { node.x = cx + Math.cos(state.a)*rx; node.y = cy + Math.sin(state.a)*ry; } }
    });
    scene._atlasTweens.push(tween);
  }

  function drawStarfield(scene, world, level) {
    const rng = seeded(`atlas-stars-${level}`), g = scene.add.graphics();
    for (let i=0;i<84;i++) {
      const x = -190 + rng()*380, y = -250 + rng()*500;
      const r = .5 + rng()*1.2, a = .11 + rng()*.42;
      g.fillStyle(i%9===0 ? C.cyan : C.white, a).fillCircle(x, y, r);
    }
    world.add(g);
  }

  function renderEarth(scene, world, found) {
    const deco = scene.add.graphics();
    deco.lineStyle(1.5, C.cyan, .18).strokeEllipse(0, 0, 250, 120);
    deco.lineStyle(1, C.cyan, .08).strokeEllipse(0, 0, 320, 170);
    world.add(deco);

    const earth = identity('planet_earth');
    addIdentity(scene, world, earth, 0, 0, 116, found.has('planet_earth'), { anchor:true, label:true, labelSize:8 });

    const moon = scene.add.container(112, 0), mg = scene.add.graphics();
    mg.fillStyle(0xc8d0da, .92).fillCircle(0, 0, 16);
    mg.fillStyle(0x8d98a6, .42).fillCircle(-5,-2,4).fillCircle(5,5,3).fillCircle(4,-7,2);
    moon.add(mg); world.add(moon);
    text(scene, moon, 0, 24, 'MOON', 6.3, C.muted, { ox:.5, bold:true });
    orbit(scene, moon, 0, 0, 112, 54, 0, 12000);

    text(scene, world, 0, -176, 'START HERE', 8.2, C.cyan, { ox:.5, bold:true });
    text(scene, world, 0, 172, 'PINCH IN / TAP − OUT TO EXPLORE', 6.6, C.muted, { ox:.5, bold:true });
  }

  function renderSolar(scene, world, found) {
    const g = scene.add.graphics();
    const rings = [29,45,61,79,103,126,148,169];
    rings.forEach((r,i) => { g.lineStyle(i===3?1.2:1, i===3?C.cyan:C.white, i===3?.18:.07).strokeEllipse(0, 0, r*2, r*1.36); });
    g.lineStyle(1, C.purple, .08).strokeEllipse(0, 0, 360, 260);
    world.add(g);

    const sun = identity('yellowDwarf_sun');
    addIdentity(scene, world, sun, 0, 0, 54, found.has('yellowDwarf_sun'), { anchor:true, label:true, labelSize:6.5 });

    const planets = [
      ['planet_mercury',29,.18,13,16000], ['planet_venus',45,1.2,16,19000], ['planet_earth',61,2.1,18,22000], ['planet_mars',79,2.85,15,25000],
      ['planet_jupiter',103,3.55,28,32000], ['planet_saturn',126,4.15,28,37000], ['planet_uranus',148,5.05,22,42000], ['planet_neptune',169,5.75,22,47000]
    ];
    planets.forEach(([id,r,a,d,dur]) => {
      const item = identity(id), node = addIdentity(scene, world, item, Math.cos(a)*r, Math.sin(a)*r*.68, d, found.has(id), { label:false });
      orbit(scene, node, 0, 0, r, r*.68, a, dur);
    });

    const dwarfs = identitiesForTier('DWARF PLANET');
    dwarfs.forEach((item, i) => {
      const a = .25 + i*(Math.PI*2/dwarfs.length), r = 180 + (i%2)*7;
      addIdentity(scene, world, item, Math.cos(a)*r, Math.sin(a)*r*.72, 12, found.has(item.id), { label:false });
    });

    text(scene, world, 0, 213, 'OBJECT SIZE IS SYMBOLIC • ORBIT ORDER IS PRESERVED', 5.8, C.muted, { ox:.5, bold:true });
  }

  const STAR_POS = {
    yellowDwarf_sun:[0,22], yellowDwarf_alphaCentauriA:[-85,72], yellowDwarf_tauCeti:[105,112], yellowDwarf_18Scorpii:[42,-92],
    blueGiant_rigel:[135,-168], blueGiant_spica:[-145,142], blueGiant_alnitak:[108,-34], blueGiant_bellatrix:[-116,-92],
    redHypergiant_betelgeuse:[-45,-176], redHypergiant_vyCanisMajoris:[148,63], redHypergiant_uyScuti:[-148,4], redHypergiant_nmlCygni:[72,178]
  };
  function renderStars(scene, world, found) {
    const grid = scene.add.graphics();
    grid.lineStyle(1, C.cyan, .06);
    [-120,-60,0,60,120].forEach(x => grid.lineBetween(x,-220,x,220));
    [-160,-80,0,80,160].forEach(y => grid.lineBetween(-180,y,180,y));
    grid.lineStyle(1.2, C.cyan, .12);
    grid.lineBetween(-85,72,0,22); grid.lineBetween(0,22,42,-92); grid.lineBetween(42,-92,108,-34); grid.lineBetween(-45,-176,-116,-92);
    world.add(grid);

    const stars = COMET_COLLECTIBLE_IDENTITIES.filter(x => ['YELLOW DWARF STAR','BLUE GIANT STAR','RED HYPERGIANT STAR'].includes(x.gameplayTiers?.[0]));
    stars.forEach(item => {
      const p = STAR_POS[item.id] || [0,0];
      const anchor = item.id === 'yellowDwarf_sun';
      const d = item.gameplayTiers[0] === 'RED HYPERGIANT STAR' ? 31 : (item.gameplayTiers[0] === 'BLUE GIANT STAR' ? 27 : 23);
      addIdentity(scene, world, item, p[0], p[1], d, found.has(item.id), { anchor, label:found.has(item.id) || anchor, labelSize:5.4, labelWidth:92 });
    });
  }

  function renderMilkyWay(scene, world, found) {
    const g = scene.add.graphics();
    for (let arm=0;arm<4;arm++) {
      const pts=[];
      for (let i=0;i<=62;i++) {
        const t=i/62, a=arm*Math.PI/2 + t*Math.PI*2.15, r=20+t*155;
        pts.push({x:Math.cos(a)*r, y:Math.sin(a)*r*.72});
      }
      g.lineStyle(8, arm%2?C.purple:C.cyan, .035);
      g.beginPath(); g.moveTo(pts[0].x,pts[0].y); pts.slice(1).forEach(p=>g.lineTo(p.x,p.y)); g.strokePath();
      g.lineStyle(1.2, C.white, .07);
      g.beginPath(); g.moveTo(pts[0].x,pts[0].y); pts.slice(1).forEach(p=>g.lineTo(p.x,p.y)); g.strokePath();
    }
    g.fillStyle(C.white,.05).fillEllipse(0,0,90,55);
    world.add(g);

    const groups = COMET_COLLECTIBLE_IDENTITIES.filter(x => ['NEBULA','PULSAR','BLACK HOLE'].includes(x.gameplayTiers?.[0]));
    groups.forEach(item => {
      const rng=seeded(item.id), a=rng()*Math.PI*2, r=38 + rng()*132;
      const x=Math.cos(a)*r, y=Math.sin(a)*r*.76;
      const tier=item.gameplayTiers[0];
      const d=tier==='NEBULA'?24:(tier==='PULSAR'?18:24);
      addIdentity(scene, world, item, x, y, d, found.has(item.id), { label:false });
    });

    const sag = identity('smbh_sagittariusA');
    addIdentity(scene, world, sag, 0, 0, 33, found.has('smbh_sagittariusA'), { label:found.has('smbh_sagittariusA'), labelSize:5.5, labelWidth:90 });
    text(scene, world, 0, 216, 'MILKY WAY VIEW • POSITIONS COMPRESSED FOR EXPLORATION', 5.6, C.muted, { ox:.5, bold:true });
  }

  function galaxy(scene, world, x, y, w, h, angle, alpha=.28) {
    const g = scene.add.graphics();
    g.lineStyle(8, C.purple, alpha*.18).strokeEllipse(x,y,w,h);
    g.lineStyle(2, C.cyan, alpha).strokeEllipse(x,y,w,h);
    g.fillStyle(C.white, alpha*.7).fillCircle(x,y,2.4);
    world.add(g);
    return g;
  }
  function renderDeep(scene, world, found) {
    const net = scene.add.graphics();
    net.lineStyle(1, C.cyan, .06);
    const nodes=[[-145,-142],[108,-165],[-86,22],[126,35],[-138,162],[88,175],[0,-40]];
    [[0,2],[2,4],[2,6],[6,1],[6,3],[3,5],[1,3]].forEach(([a,b])=>net.lineBetween(nodes[a][0],nodes[a][1],nodes[b][0],nodes[b][1]));
    world.add(net);
    galaxy(scene,world,-145,-142,56,24,-18,.32); galaxy(scene,world,108,-165,72,30,12,.32); galaxy(scene,world,-86,22,90,34,-8,.34);
    galaxy(scene,world,126,35,64,26,24,.34); galaxy(scene,world,-138,162,76,31,8,.34); galaxy(scene,world,88,175,88,34,-14,.34); galaxy(scene,world,0,-40,116,43,5,.42);
    text(scene,world,0,-12,'MILKY WAY',5.7,C.muted,{ox:.5,bold:true});

    const slots = {
      smbh_m87:[-145,-142], smbh_ton618:[108,-165], smbh_ngc4889:[126,35]
    };
    Object.entries(slots).forEach(([id,p]) => {
      const item=identity(id); addIdentity(scene,world,item,p[0],p[1],26,found.has(id),{label:found.has(id),labelSize:5.5,labelWidth:82});
    });
    text(scene, world, 0, 216, 'FINAL SCALE • THE COSMIC WEB IS REPRESENTATIVE, NOT TO SCALE', 5.6, C.muted, { ox:.5, bold:true });
  }

  function updateHeader(scene, found) {
    const level=clampLevel(scene._atlasLevel);
    scene._atlasTitle?.setText(LEVELS[level].name);
    scene._atlasSubtitle?.setText(LEVELS[level].subtitle);
    scene._atlasScale?.setText(`${level+1} / ${LEVELS.length}`);
    scene._atlasProgress?.setText(`${found.size} / ${totalCollectibles()} REVEALED FROM HIGH SCORES`);
    if (scene._atlasInButton) scene._atlasInButton.setAlpha(level===0?.32:1);
    if (scene._atlasOutButton) scene._atlasOutButton.setAlpha(level===MAX_LEVEL?.32:1);
  }

  function renderLevel(scene) {
    stopAtlasTweens(scene);
    try { scene._atlasMapRoot?.destroy(true); } catch (_) {}
    try { scene._atlasInfoRoot?.destroy(true); } catch (_) {}
    scene._atlasInfoRoot=null;

    const found=discoverySet(scene), level=clampLevel(scene._atlasLevel);
    updateHeader(scene,found);
    const world=scene.add.container(W/2, scene.Y(405));
    world.setDepth?.(2); scene.ui.add(world); scene._atlasMapRoot=world;
    drawStarfield(scene,world,level);

    if(level===0) renderEarth(scene,world,found);
    else if(level===1) renderSolar(scene,world,found);
    else if(level===2) renderStars(scene,world,found);
    else if(level===3) renderMilkyWay(scene,world,found);
    else renderDeep(scene,world,found);

    const pulse=scene.tweens.add({targets:world,alpha:{from:.86,to:1},duration:450,ease:'Sine.out'}); scene._atlasTweens.push(pulse);
  }

  function changeLevel(scene, delta) {
    const next=clampLevel(scene._atlasLevel + delta);
    if(next===scene._atlasLevel)return;
    scene._atlasLevel=next; renderLevel(scene);
  }

  function installInput(scene) {
    stopAtlasInput(scene);
    try { if(!scene._atlasExtraPointerAdded){scene.input.addPointer(1);scene._atlasExtraPointerAdded=true;} } catch (_) {}
    const activePointers=()=>[scene.input.pointer1,scene.input.pointer2,scene.input.activePointer].filter((p,i,a)=>p&&p.isDown&&a.indexOf(p)===i);
    const down=()=>{
      const ps=activePointers();
      if(ps.length>=2) scene._atlasPinch={dist:Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y),latched:false};
    };
    const move=()=>{
      const ps=activePointers(); if(ps.length<2)return;
      const dist=Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y);
      if(!scene._atlasPinch){scene._atlasPinch={dist,latched:false};return;}
      const ratio=dist/Math.max(1,scene._atlasPinch.dist);
      if(!scene._atlasPinch.latched&&ratio>1.22){scene._atlasPinch.latched=true;changeLevel(scene,-1);}
      else if(!scene._atlasPinch.latched&&ratio<.78){scene._atlasPinch.latched=true;changeLevel(scene,1);}
    };
    const up=()=>{scene._atlasPinch=null;};
    const wheel=(pointer,over,dx,dy)=>{ if(Math.abs(dy)<8)return; changeLevel(scene,dy>0?1:-1); };
    scene.input.on('pointerdown',down); scene.input.on('pointermove',move); scene.input.on('pointerup',up); scene.input.on('pointerupoutside',up); scene.input.on('wheel',wheel);
    scene._atlasInputHandlers={down,move,up,wheel};
  }

  proto.showUniverseAtlasInfo = function(item, anchorOnly=false) {
    try { this._atlasInfoRoot?.destroy(true); } catch (_) {}
    const root=this.add.container(0,0).setDepth?.(20) || this.add.container(0,0); this.ui.add(root); this._atlasInfoRoot=root;
    const top=this.Y(610), panel=this.add.graphics();
    panel.fillStyle(C.panel,.985).fillRoundedRect(18,top,384,128,10); panel.lineStyle(1.5,C.cyan,.72).strokeRoundedRect(18,top,384,128,10); root.add(panel);
    const found=discoverySet(this).has(item.id), key=textureFor(this,item,58);
    if(key){const im=this.add.image(62,top+62,key),w=Math.max(1,im.width),h=Math.max(1,im.height);im.setDisplaySize(58,58*h/w);root.add(im);}
    text(this,root,103,top+20,item.name,10.5,C.white,{bold:true,width:220});
    text(this,root,103,top+46,item.designation||item.scienceClass,7.1,C.cyan,{bold:true,width:230});
    text(this,root,103,top+70,item.designation?item.scienceClass:(anchorOnly?'ORIENTATION ANCHOR':'DISCOVERED'),6.8,C.muted,{bold:true,width:230});
    text(this,root,103,top+95,found?'REVEALED BY YOUR HIGH-SCORE COLLECTION':'VISIBLE AS A MAP ANCHOR',6.3,found?C.green:C.muted,{bold:true,width:245});
    button(this,root,367,top+25,42,28,'×',C.orange,()=>{try{root.destroy(true);}catch(_){}this._atlasInfoRoot=null;},13);
  };

  proto.showUniverseAtlas = function(level = null) {
    stopAtlasInput(this);
    this.clearUI(); this.state='UNIVERSE_ATLAS';
    this._atlasLevel=clampLevel(level===null?(this._atlasLevel ?? 0):level); this._atlasTweens=[];

    const bg=this.add.graphics(); bg.fillStyle(0x01040a,1).fillRect(0,0,W,H); this.ui.add(bg);
    const chrome=this.add.container(0,0); this.ui.add(chrome);
    button(this,chrome,58,this.Y(32),82,30,'BACK',C.orange,()=>{stopAtlasInput(this);this.showHome();},8.4);
    this._atlasScale=text(this,chrome,W-24,this.Y(25),'',7.1,C.muted,{ox:1,bold:true});
    this._atlasTitle=text(this,chrome,W/2,this.Y(58),'',17,C.white,{ox:.5,bold:true});
    this._atlasSubtitle=text(this,chrome,W/2,this.Y(84),'',6.7,C.cyan,{ox:.5,bold:true,width:350,align:'center'});
    this._atlasProgress=text(this,chrome,W/2,this.Y(106),'',6.7,C.green,{ox:.5,bold:true});

    const frame=this.add.graphics();
    frame.fillStyle(C.panel,.20).fillRoundedRect(10,this.Y(124),400,552,12); frame.lineStyle(1.4,C.cyan,.22).strokeRoundedRect(10,this.Y(124),400,552,12); chrome.add(frame);
    text(this,chrome,24,this.Y(650),'◆ REVEALED',6.3,C.green,{bold:true}); text(this,chrome,119,this.Y(650),'◇ UNREVEALED',6.3,C.muted,{bold:true});
    this._atlasInButton=button(this,chrome,95,this.Y(785),142,44,'+  IN',C.cyan,()=>changeLevel(this,-1),10.2);
    this._atlasOutButton=button(this,chrome,325,this.Y(785),142,44,'−  OUT',C.purple,()=>changeLevel(this,1),10.2);
    text(this,chrome,W/2,this.Y(744),'PINCH OR SCROLL TO MOVE BETWEEN COSMIC SCALES',6.4,C.muted,{ox:.5,bold:true});

    renderLevel(this); installInput(this);
  };

  // Add Atlas access to Home without disturbing the existing four-button vertical navigation.
  proto.showHome = function(...args) {
    stopAtlasInput(this);
    const result=baseShowHome.apply(this,args);
    const found=discoverySet(this);
    this.miniButton(74,this.Y(31),122,24,`UNIVERSE ${found.size}/${totalCollectibles()}`,C.purple,()=>this.showUniverseAtlas(0));
    return result;
  };

  window.CometUniverseAtlasV1=Object.freeze({
    version:1,
    levels:LEVELS.map(x=>x.name),
    discoverySource:'union-of-top-five-high-score-collection-snapshots',
    total:totalCollectibles(),
    getDiscovered(scene){return [...discoverySet(scene)];}
  });
})();