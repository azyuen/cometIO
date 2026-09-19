// Universe Atlas v2
// High-score collection atlas with animated logarithmic zoom, stylised relative scale,
// and accelerated orbital motion anchored to the current date.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const baseShowScores = proto.showScores;

  const LEVELS = [
    { name:'EARTH', subtitle:'HOME ORBIT • EARTH–MOON SYSTEM' },
    { name:'SOLAR SYSTEM', subtitle:'PLANETS • DWARF PLANETS • COMPRESSED ORBITS' },
    { name:'STELLAR MAP', subtitle:'STARS • STYLISED RELATIVE SIZE' },
    { name:'MILKY WAY', subtitle:'NEBULAE • PULSARS • STELLAR BLACK HOLES' },
    { name:'DEEP UNIVERSE', subtitle:'GALAXIES • SUPERMASSIVE BLACK HOLES' }
  ];
  const MAX_LEVEL = LEVELS.length - 1;
  const DAY_MS = 86400000;
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  const SIM_DAYS_PER_REAL_SECOND = 12;

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
    { id:'dwarf_ceres',    r:78,  e:.079, period:1680,       phase:95,  rot:18, d:6.0 },
    { id:'dwarf_pluto',    r:159, e:.249, period:90560,      phase:14.5,rot:14, d:8.0 },
    { id:'dwarf_haumea',   r:164, e:.189, period:103500,     phase:205, rot:-18,d:7.0 },
    { id:'dwarf_makemake', r:168, e:.159, period:113200,     phase:160, rot:22, d:6.8 },
    { id:'dwarf_quaoar',   r:171, e:.040, period:104900,     phase:285, rot:-8, d:6.3 },
    { id:'dwarf_gonggong', r:175, e:.502, period:200100,     phase:111, rot:28, d:6.8 },
    { id:'dwarf_eris',     r:179, e:.442, period:203900,     phase:205, rot:-26,d:8.0 },
    { id:'dwarf_sedna',    r:184, e:.850, period:4164000,    phase:358, rot:11, d:6.1 }
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

  function hex(n) { return '#' + Number(n || 0).toString(16).padStart(6, '0'); }
  function rad(deg) { return Number(deg || 0) * Math.PI / 180; }
  function clampLevel(v) { return Math.max(0, Math.min(MAX_LEVEL, Math.round(Number(v) || 0))); }

  function text(scene, parent, x, y, value, size, color = C.white, options = {}) {
    const t = scene.add.text(x, y, value, {
      fontFamily: FONT,
      fontSize: String(size) + 'px',
      fontStyle: options.bold ? 'bold' : 'normal',
      color: hex(color),
      align: options.align || 'left',
      wordWrap: options.width ? { width: options.width, useAdvancedWrap: true } : undefined
    }).setOrigin(options.ox == null ? 0 : options.ox, options.oy == null ? 0 : options.oy);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    parent.add(t);
    return t;
  }

  function button(scene, parent, x, y, w, h, label, color, cb, fontSize = 9.2) {
    const c = scene.add.container(x, y), g = scene.add.graphics();
    g.fillStyle(color, .13).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(1.5, color, .9).strokeRoundedRect(-w/2, -h/2, w, h, 7);
    const t = scene.add.text(0, 0, label, {
      fontFamily:FONT, fontSize:String(fontSize) + 'px', fontStyle:'bold', color:'#fff'
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', cb);
    c.add([g, t, hit]);
    parent.add(c);
    return c;
  }

  function scores(scene) {
    try { return Array.isArray(scene.getScores && scene.getScores()) ? scene.getScores() : []; }
    catch (_) { return []; }
  }

  function scoreIds(score) {
    const raw = Array.isArray(score && score.collection)
      ? score.collection
      : (Array.isArray(score && score.collectedIdentityIds) ? score.collectedIdentityIds : []);
    return raw.filter(id => !!(COMET_COLLECTIBLE_BY_ID && COMET_COLLECTIBLE_BY_ID[id]));
  }

  function discoverySet(scene) {
    const out = new Set();
    scores(scene).forEach(score => scoreIds(score).forEach(id => out.add(id)));
    return out;
  }

  function totalCollectibles() {
    return Array.isArray(COMET_COLLECTIBLE_IDENTITIES) ? COMET_COLLECTIBLE_IDENTITIES.length : 0;
  }

  function identity(id) {
    return (COMET_COLLECTIBLE_BY_ID && COMET_COLLECTIBLE_BY_ID[id]) ||
      (COMET_IDENTITY_BY_ID && COMET_IDENTITY_BY_ID[id]) || null;
  }

  function seeded(id) {
    let h = 2166136261;
    const s = String(id);
    for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function() {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function textureFor(scene, item, diameter) {
    if (!item || !item.spriteVariant || typeof cometSpriteTextureKey !== 'function') return null;
    const order = diameter >= 80 ? [128,64,32] : (diameter >= 36 ? [64,128,32] : [32,64,128]);
    for (const lod of order) {
      const key = cometSpriteTextureKey(item.spriteVariant, lod);
      if (scene.textures.exists(key)) return key;
    }
    return null;
  }

  function tierColor(item) {
    const tier = item && item.gameplayTiers ? item.gameplayTiers[0] : '';
    if (tier.indexOf('DWARF') >= 0) return C.blue;
    if (tier.indexOf('PLANET') >= 0) return C.green;
    if (tier.indexOf('YELLOW') >= 0) return 0xffd966;
    if (tier.indexOf('BLUE GIANT') >= 0) return 0x86c9ff;
    if (tier.indexOf('RED HYPER') >= 0) return 0xff7a63;
    if (tier === 'NEBULA') return C.purple;
    if (tier === 'PULSAR') return C.cyan;
    if (tier.indexOf('BLACK HOLE') >= 0) return C.orange;
    return C.cyan;
  }

  function addMotionTween(scene, config) {
    const tween = scene.tweens.add(config);
    if (!scene._atlasMotionTweens) scene._atlasMotionTweens = [];
    scene._atlasMotionTweens.push(tween);
    return tween;
  }

  function stopMotion(scene) {
    (scene._atlasMotionTweens || []).forEach(t => { try { t.stop(); } catch (_) {} });
    scene._atlasMotionTweens = [];
  }

  function stopTransitions(scene) {
    (scene._atlasTransitionTweens || []).forEach(t => { try { t.stop(); } catch (_) {} });
    scene._atlasTransitionTweens = [];
    scene._atlasTransitioning = false;
  }

  function stopAtlas(scene) {
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
    stopMotion(scene);
    stopTransitions(scene);
    try { if (scene._atlasClockEvent) scene._atlasClockEvent.remove(false); } catch (_) {}
    scene._atlasClockEvent = null;
  }

  function addUnknown(scene, world, x, y, radius) {
    const c = scene.add.container(x, y), g = scene.add.graphics();
    g.lineStyle(1.25, C.muted, .36).strokeCircle(0, 0, radius);
    g.fillStyle(C.muted, .14).fillCircle(0, 0, Math.max(1.3, radius*.18));
    c.add(g);
    world.add(c);
    return c;
  }

  function addIdentity(scene, world, item, x, y, diameter, discovered, options) {
    options = options || {};
    const anchor = options.anchor === true;
    if (!item) return null;
    if (!discovered && !anchor) return addUnknown(scene, world, x, y, Math.max(3.5, diameter*.32));

    const group = scene.add.container(x, y);
    world.add(group);
    const key = textureFor(scene, item, diameter);
    if (key) {
      const image = scene.add.image(0, 0, key);
      const tex = scene.textures.get && scene.textures.get(key);
      if (tex && tex.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      const w = Math.max(image.width || 1, 1), h = Math.max(image.height || w, 1);
      image.setDisplaySize(diameter, diameter * h / w);
      group.add(image);
      group._atlasImage = image;
    } else {
      const g = scene.add.graphics();
      g.fillStyle(tierColor(item), .82).fillCircle(0, 0, diameter/2);
      g.lineStyle(1, C.white, .24).strokeCircle(0, 0, diameter/2);
      group.add(g);
    }

    const hit = scene.add.circle(0, 0, Math.max(12, diameter*.58), 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', pointer => { scene._atlasTapStart = { x:pointer.x, y:pointer.y, id:item.id }; });
    hit.on('pointerup', pointer => {
      const s = scene._atlasTapStart;
      if (!s || s.id !== item.id || Math.hypot(pointer.x-s.x, pointer.y-s.y) > 12 || scene._atlasTransitioning) return;
      if (scene.showUniverseAtlasInfo) scene.showUniverseAtlasInfo(item, anchor && !discovered);
    });
    group.add(hit);

    if (options.label) {
      text(scene, group, 0, diameter*.58 + 5, item.name, options.labelSize || 5.8, discovered ? C.white : C.cyan, {
        ox:.5, bold:true, align:'center', width:options.labelWidth || 88
      });
    }
    return group;
  }

  function simulationMs(scene) {
    const elapsed = Math.max(0, performance.now() - Number(scene._atlasRealStart || performance.now()));
    return Number(scene._atlasSimAnchorMs || Date.now()) + elapsed * SIM_DAYS_PER_REAL_SECOND * DAY_MS / 1000;
  }

  function simulationDaysFromJ2000(scene) {
    return (simulationMs(scene) - J2000_MS) / DAY_MS;
  }

  function formatUTC(ms) {
    const d = new Date(ms);
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return String(d.getUTCDate()).padStart(2,'0') + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  function updateClock(scene) {
    if (scene._atlasClockText) {
      scene._atlasClockText.setText('SIM ' + formatUTC(simulationMs(scene)) + '  •  ' + SIM_DAYS_PER_REAL_SECOND + ' DAYS / SEC');
    }
  }

  function solveEccentricAnomaly(mean, e) {
    const tau = Math.PI * 2;
    let m = ((mean % tau) + tau) % tau;
    let E = e < .8 ? m : Math.PI;
    for (let i=0;i<6;i++) E -= (E - e*Math.sin(E) - m) / Math.max(.0001, 1 - e*Math.cos(E));
    return E;
  }

  function orbitalPoint(cfg, eccentricAnomaly) {
    const e = Math.max(0, Math.min(.92, Number(cfg.e) || 0));
    const a = Number(cfg.r) || 1;
    const flat = cfg.flat == null ? .62 : Number(cfg.flat);
    let x = a * (Math.cos(eccentricAnomaly) - e);
    let y = a * Math.sqrt(Math.max(.05, 1 - e*e)) * Math.sin(eccentricAnomaly) * flat;
    const q = rad(cfg.rot || 0);
    const rx = x*Math.cos(q) - y*Math.sin(q);
    const ry = x*Math.sin(q) + y*Math.cos(q);
    return { x:rx, y:ry };
  }

  function drawOrbitPath(scene, world, cfg, color, alpha, width) {
    const g = scene.add.graphics(), samples = 84;
    g.lineStyle(width || 1, color, alpha);
    g.beginPath();
    for (let i=0;i<=samples;i++) {
      const E = Math.PI*2*i/samples, p = orbitalPoint(cfg, E);
      if (i === 0) g.moveTo(p.x,p.y); else g.lineTo(p.x,p.y);
    }
    g.strokePath();
    world.add(g);
    return g;
  }

  function orbitScientific(scene, node, cfg) {
    if (!node) return;
    const period = Math.max(1, Number(cfg.period) || 365.2);
    const startMean = rad(cfg.phase || 0) + Math.PI*2*simulationDaysFromJ2000(scene)/period;
    const state = { m:startMean };
    const place = () => {
      const E = solveEccentricAnomaly(state.m, cfg.e || 0), p = orbitalPoint(cfg, E);
      if (node.active !== false) { node.x=p.x; node.y=p.y; }
    };
    place();
    addMotionTween(scene, {
      targets:state,
      m:startMean + Math.PI*2,
      duration:Math.max(2200, period / SIM_DAYS_PER_REAL_SECOND * 1000),
      repeat:-1,
      ease:'Linear',
      onUpdate:place
    });
  }

  function drawStarfield(scene, world, level) {
    const rng = seeded('atlas-stars-' + level), g = scene.add.graphics();
    for (let i=0;i<92;i++) {
      const x=-190+rng()*380, y=-245+rng()*490, rr=.45+rng()*1.25, a=.10+rng()*.40;
      g.fillStyle(i%10===0 ? C.cyan : C.white, a).fillCircle(x,y,rr);
    }
    world.add(g);
  }

  function renderEarth(scene, world, found) {
    const g = scene.add.graphics();
    g.lineStyle(1.4,C.cyan,.18).strokeEllipse(0,0,252,118);
    g.lineStyle(1,C.cyan,.07).strokeEllipse(0,0,326,170);
    world.add(g);

    addIdentity(scene, world, identity('planet_earth'), 0, 0, 116, found.has('planet_earth'), {
      anchor:true,label:true,labelSize:8
    });

    const moon = scene.add.container(126,0), mg=scene.add.graphics();
    mg.fillStyle(0xc8d0da,.94).fillCircle(0,0,16);
    mg.fillStyle(0x8d98a6,.42).fillCircle(-5,-2,4).fillCircle(5,5,3).fillCircle(4,-7,2);
    moon.add(mg); world.add(moon);
    text(scene,moon,0,24,'MOON',6.2,C.muted,{ox:.5,bold:true});
    orbitScientific(scene,moon,{r:126,e:.055,period:27.32,phase:125,rot:0,flat:.47});

    text(scene,world,0,-178,'START HERE',8.2,C.cyan,{ox:.5,bold:true});
    text(scene,world,0,174,'EARTH : MOON DIAMETER ≈ 3.7 : 1',6.1,C.muted,{ox:.5,bold:true});
  }

  function renderSolar(scene, world, found) {
    const pathLayer = scene.add.container(0,0); world.add(pathLayer);
    PLANETS.forEach((cfg,i) => drawOrbitPath(scene,pathLayer,cfg,C.white,i<4?.095:.07,i===2?1.2:1));
    DWARFS.forEach(cfg => drawOrbitPath(scene,pathLayer,cfg,cfg.id==='dwarf_ceres'?C.blue:C.purple,cfg.id==='dwarf_ceres'?.18:.105,.85));

    addIdentity(scene,world,identity('yellowDwarf_sun'),0,0,58,found.has('yellowDwarf_sun'),{
      anchor:true,label:true,labelSize:6.2
    });

    PLANETS.forEach(cfg => {
      const item=identity(cfg.id);
      const node=addIdentity(scene,world,item,0,0,cfg.d,found.has(cfg.id),{label:false});
      orbitScientific(scene,node,cfg);
    });

    DWARFS.forEach(cfg => {
      const item=identity(cfg.id);
      const node=addIdentity(scene,world,item,0,0,cfg.d,found.has(cfg.id),{label:false});
      orbitScientific(scene,node,cfg);
    });

    text(scene,world,-177,-222,'INNER + MAJOR PLANET ORBITS',5.6,C.muted,{bold:true});
    text(scene,world,-177,-204,'DWARF ORBITS',5.6,C.purple,{bold:true});
    text(scene,world,0,216,'DISTANCE COMPRESSED • DIAMETERS STYLISED RELATIVE TO ONE ANOTHER',5.5,C.muted,{ox:.5,bold:true});
  }

  function renderStars(scene, world, found) {
    const grid=scene.add.graphics();
    grid.lineStyle(1,C.cyan,.055);
    [-120,-60,0,60,120].forEach(x=>grid.lineBetween(x,-220,x,220));
    [-160,-80,0,80,160].forEach(y=>grid.lineBetween(-180,y,180,y));
    grid.lineStyle(1.1,C.cyan,.10);
    grid.lineBetween(-85,72,0,22); grid.lineBetween(0,22,42,-92); grid.lineBetween(42,-92,108,-34); grid.lineBetween(-45,-176,-116,-92);
    world.add(grid);

    const starTiers=['YELLOW DWARF STAR','BLUE GIANT STAR','RED HYPERGIANT STAR'];
    COMET_COLLECTIBLE_IDENTITIES.filter(x=>starTiers.indexOf(x.gameplayTiers && x.gameplayTiers[0])>=0).forEach(item=>{
      const p=STAR_POS[item.id]||[0,0], anchor=item.id==='yellowDwarf_sun', d=STAR_SIZE[item.id]||18;
      const node=addIdentity(scene,world,item,p[0],p[1],d,found.has(item.id),{
        anchor:anchor,label:found.has(item.id)||anchor,labelSize:5.2,labelWidth:92
      });
      if (node && item.gameplayTiers[0]==='RED HYPERGIANT STAR') {
        const rng=seeded(item.id+'-variable');
        addMotionTween(scene,{
          targets:node,
          scaleX:{from:.985,to:1.025},
          scaleY:{from:.985,to:1.025},
          duration:4200+rng()*3600,
          yoyo:true,repeat:-1,ease:'Sine.InOut'
        });
      }
    });
    text(scene,world,0,216,'STAR DIAMETERS USE A LOG-COMPRESSED VISUAL SCALE',5.6,C.muted,{ox:.5,bold:true});
  }

  function renderMilkyWay(scene, world, found) {
    const spiral=scene.add.container(0,0), g=scene.add.graphics(); spiral.add(g); world.add(spiral);
    for(let arm=0;arm<4;arm++){
      const pts=[];
      for(let i=0;i<=64;i++){
        const t=i/64,a=arm*Math.PI/2+t*Math.PI*2.15,r=20+t*154;
        pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.72});
      }
      g.lineStyle(9,arm%2?C.purple:C.cyan,.034);
      g.beginPath();g.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();
      g.lineStyle(1.1,C.white,.065);
      g.beginPath();g.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();
    }
    g.fillStyle(C.white,.05).fillEllipse(0,0,90,54);
    addMotionTween(scene,{targets:spiral,angle:360,duration:110000,repeat:-1,ease:'Linear'});

    const wanted=['NEBULA','PULSAR','BLACK HOLE'];
    COMET_COLLECTIBLE_IDENTITIES.filter(x=>wanted.indexOf(x.gameplayTiers && x.gameplayTiers[0])>=0).forEach(item=>{
      const rng=seeded(item.id),a=rng()*Math.PI*2,r=38+rng()*132,x=Math.cos(a)*r,y=Math.sin(a)*r*.76;
      const tier=item.gameplayTiers[0],d=tier==='NEBULA'?36:(tier==='PULSAR'?11:18);
      const node=addIdentity(scene,world,item,x,y,d,found.has(item.id),{label:false});
      if (!node || !found.has(item.id)) return;
      if (tier==='PULSAR') {
        addMotionTween(scene,{targets:node,alpha:{from:.48,to:1},duration:360+rng()*520,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      } else if (tier==='BLACK HOLE') {
        addMotionTween(scene,{targets:node,angle:360,duration:17000+rng()*9000,repeat:-1,ease:'Linear'});
      } else if (tier==='NEBULA') {
        addMotionTween(scene,{targets:node,scaleX:{from:.99,to:1.018},scaleY:{from:.99,to:1.018},duration:9000+rng()*6000,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      }
    });

    const sag=identity('smbh_sagittariusA');
    const sagNode=addIdentity(scene,world,sag,0,0,25,found.has('smbh_sagittariusA'),{
      label:found.has('smbh_sagittariusA'),labelSize:5.4,labelWidth:90
    });
    if (sagNode && found.has('smbh_sagittariusA')) {
      addMotionTween(scene,{targets:sagNode,angle:360,duration:24000,repeat:-1,ease:'Linear'});
    }
    text(scene,world,0,216,'MOTION IS AN ACCELERATED VISUALISATION OF ROTATION / PULSATION / EXPANSION',5.3,C.muted,{ox:.5,bold:true});
  }

  function makeGalaxy(scene, world, x, y, w, h, angle, alpha, speed) {
    const c=scene.add.container(x,y), g=scene.add.graphics();
    g.lineStyle(8,C.purple,alpha*.17).strokeEllipse(0,0,w,h);
    g.lineStyle(2,C.cyan,alpha).strokeEllipse(0,0,w,h);
    g.fillStyle(C.white,alpha*.7).fillCircle(0,0,2.4);
    c.add(g); c.setAngle(angle||0); world.add(c);
    addMotionTween(scene,{targets:c,angle:(angle||0)+360,duration:speed||90000,repeat:-1,ease:'Linear'});
    return c;
  }

  function renderDeep(scene, world, found) {
    const net=scene.add.graphics();
    net.lineStyle(1,C.cyan,.055);
    const nodes=[[-145,-142],[108,-165],[-86,22],[126,35],[-138,162],[88,175],[0,-40]];
    [[0,2],[2,4],[2,6],[6,1],[6,3],[3,5],[1,3]].forEach(pair=>net.lineBetween(nodes[pair[0]][0],nodes[pair[0]][1],nodes[pair[1]][0],nodes[pair[1]][1]));
    world.add(net);
    makeGalaxy(scene,world,-145,-142,56,24,-18,.32,70000);
    makeGalaxy(scene,world,108,-165,72,30,12,.32,82000);
    makeGalaxy(scene,world,-86,22,90,34,-8,.34,96000);
    makeGalaxy(scene,world,126,35,64,26,24,.34,78000);
    makeGalaxy(scene,world,-138,162,76,31,8,.34,88000);
    makeGalaxy(scene,world,88,175,88,34,-14,.34,103000);
    makeGalaxy(scene,world,0,-40,116,43,5,.42,120000);
    text(scene,world,0,-12,'MILKY WAY',5.6,C.muted,{ox:.5,bold:true});

    const slots={smbh_m87:[-145,-142,22],smbh_ton618:[108,-165,31],smbh_ngc4889:[126,35,27]};
    Object.keys(slots).forEach(id=>{
      const p=slots[id], item=identity(id);
      const node=addIdentity(scene,world,item,p[0],p[1],p[2],found.has(id),{
        label:found.has(id),labelSize:5.4,labelWidth:82
      });
      if (node && found.has(id)) addMotionTween(scene,{targets:node,angle:360,duration:22000+seeded(id)()*10000,repeat:-1,ease:'Linear'});
    });
    text(scene,world,0,216,'GALACTIC ROTATION IS GREATLY ACCELERATED • COSMIC WEB IS REPRESENTATIVE',5.3,C.muted,{ox:.5,bold:true});
  }

  function makeWorld(scene, level, found) {
    const world=scene.add.container(W/2,scene.Y(405));
    world.setDepth(2);
    scene.ui.add(world);
    drawStarfield(scene,world,level);
    if(level===0)renderEarth(scene,world,found);
    else if(level===1)renderSolar(scene,world,found);
    else if(level===2)renderStars(scene,world,found);
    else if(level===3)renderMilkyWay(scene,world,found);
    else renderDeep(scene,world,found);
    return world;
  }

  function updateHeader(scene, found) {
    const level=clampLevel(scene._atlasLevel);
    if(scene._atlasTitle)scene._atlasTitle.setText(LEVELS[level].name);
    if(scene._atlasSubtitle)scene._atlasSubtitle.setText(LEVELS[level].subtitle);
    if(scene._atlasScale)scene._atlasScale.setText(String(level+1)+' / '+String(LEVELS.length));
    if(scene._atlasProgress)scene._atlasProgress.setText(String(found.size)+' / '+String(totalCollectibles())+' REVEALED FROM TOP 5');
    if(scene._atlasInButton)scene._atlasInButton.setAlpha(level===0?.30:1);
    if(scene._atlasOutButton)scene._atlasOutButton.setAlpha(level===MAX_LEVEL?.30:1);
  }

  function renderImmediate(scene) {
    stopMotion(scene);
    try { if(scene._atlasMapRoot)scene._atlasMapRoot.destroy(true); } catch (_) {}
    try { if(scene._atlasInfoRoot)scene._atlasInfoRoot.destroy(true); } catch (_) {}
    scene._atlasInfoRoot=null;
    const found=discoverySet(scene);
    updateHeader(scene,found);
    scene._atlasMapRoot=makeWorld(scene,clampLevel(scene._atlasLevel),found);
  }

  function transitionLevel(scene, delta) {
    if(scene._atlasTransitioning)return;
    const from=clampLevel(scene._atlasLevel),to=clampLevel(from+delta);
    if(to===from){
      if(scene._atlasMapRoot)scene.tweens.add({targets:scene._atlasMapRoot,scaleX:1,scaleY:1,duration:180,ease:'Sine.Out'});
      return;
    }

    scene._atlasTransitioning=true;
    try { if(scene._atlasInfoRoot)scene._atlasInfoRoot.destroy(true); } catch (_) {}
    scene._atlasInfoRoot=null;
    stopMotion(scene);

    const oldWorld=scene._atlasMapRoot;
    scene._atlasLevel=to;
    const found=discoverySet(scene);
    updateHeader(scene,found);
    const newWorld=makeWorld(scene,to,found);
    scene._atlasMapRoot=newWorld;

    const zoomOut=delta>0;
    if(zoomOut){
      newWorld.setScale(3.0).setAlpha(0);
    }else{
      newWorld.setScale(.20).setAlpha(0);
    }

    const list=[];
    if(oldWorld){
      list.push(scene.tweens.add({
        targets:oldWorld,
        scaleX:zoomOut?.16:3.4,
        scaleY:zoomOut?.16:3.4,
        alpha:0,
        duration:620,
        ease:'Cubic.InOut'
      }));
    }
    list.push(scene.tweens.add({
      targets:newWorld,
      scaleX:1,scaleY:1,alpha:1,
      duration:650,
      ease:'Cubic.InOut',
      onComplete:()=>{
        try{if(oldWorld)oldWorld.destroy(true);}catch(_){}
        scene._atlasTransitioning=false;
      }
    }));
    scene._atlasTransitionTweens=list;
  }

  function installInput(scene) {
    const h=scene._atlasInputHandlers;
    if(h){
      try{scene.input.off('pointerdown',h.down);}catch(_){}
      try{scene.input.off('pointermove',h.move);}catch(_){}
      try{scene.input.off('pointerup',h.up);}catch(_){}
      try{scene.input.off('pointerupoutside',h.up);}catch(_){}
      try{scene.input.off('wheel',h.wheel);}catch(_){}
    }
    try{if(!scene._atlasExtraPointerAdded){scene.input.addPointer(1);scene._atlasExtraPointerAdded=true;}}catch(_){}

    const activePointers=()=>[scene.input.pointer1,scene.input.pointer2,scene.input.activePointer].filter((p,i,a)=>p&&p.isDown&&a.indexOf(p)===i);
    const down=()=>{
      const ps=activePointers();
      if(ps.length>=2)scene._atlasPinch={dist:Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y),latched:false};
    };
    const move=()=>{
      if(scene._atlasTransitioning)return;
      const ps=activePointers();
      if(ps.length<2)return;
      const dist=Phaser.Math.Distance.Between(ps[0].x,ps[0].y,ps[1].x,ps[1].y);
      if(!scene._atlasPinch){scene._atlasPinch={dist:dist,latched:false};return;}
      const ratio=dist/Math.max(1,scene._atlasPinch.dist);
      if(scene._atlasMapRoot)scene._atlasMapRoot.setScale(Math.max(.72,Math.min(1.35,ratio)));
      if(!scene._atlasPinch.latched&&ratio>1.28){
        scene._atlasPinch.latched=true;
        if(scene._atlasMapRoot)scene._atlasMapRoot.setScale(1);
        transitionLevel(scene,-1);
      }else if(!scene._atlasPinch.latched&&ratio<.78){
        scene._atlasPinch.latched=true;
        if(scene._atlasMapRoot)scene._atlasMapRoot.setScale(1);
        transitionLevel(scene,1);
      }
    };
    const up=()=>{
      if(scene._atlasMapRoot&&!scene._atlasTransitioning){
        scene.tweens.add({targets:scene._atlasMapRoot,scaleX:1,scaleY:1,duration:180,ease:'Sine.Out'});
      }
      scene._atlasPinch=null;
    };
    const wheel=(pointer,over,dx,dy)=>{
      if(Math.abs(dy)<8)return;
      transitionLevel(scene,dy>0?1:-1);
    };
    scene.input.on('pointerdown',down);
    scene.input.on('pointermove',move);
    scene.input.on('pointerup',up);
    scene.input.on('pointerupoutside',up);
    scene.input.on('wheel',wheel);
    scene._atlasInputHandlers={down:down,move:move,up:up,wheel:wheel};
  }

  proto.showUniverseAtlasInfo = function(item, anchorOnly) {
    try{if(this._atlasInfoRoot)this._atlasInfoRoot.destroy(true);}catch(_){}
    const root=this.add.container(0,0);root.setDepth(20);this.ui.add(root);this._atlasInfoRoot=root;
    const top=this.Y(606),panel=this.add.graphics();
    panel.fillStyle(C.panel,.985).fillRoundedRect(18,top,384,128,10);
    panel.lineStyle(1.5,C.cyan,.72).strokeRoundedRect(18,top,384,128,10);
    root.add(panel);
    const found=discoverySet(this).has(item.id),key=textureFor(this,item,58);
    if(key){
      const im=this.add.image(62,top+62,key),w=Math.max(1,im.width),h=Math.max(1,im.height);
      im.setDisplaySize(58,58*h/w);root.add(im);
    }
    text(this,root,103,top+20,item.name,10.5,C.white,{bold:true,width:220});
    text(this,root,103,top+46,item.designation||item.scienceClass,7.1,C.cyan,{bold:true,width:230});
    text(this,root,103,top+70,item.designation?item.scienceClass:(anchorOnly?'ORIENTATION ANCHOR':'DISCOVERED'),6.8,C.muted,{bold:true,width:230});
    text(this,root,103,top+95,found?'REVEALED BY YOUR HIGH-SCORE COLLECTION':'VISIBLE AS A MAP ANCHOR',6.3,found?C.green:C.muted,{bold:true,width:245});
    button(this,root,367,top+25,42,28,'×',C.orange,()=>{try{root.destroy(true);}catch(_){}this._atlasInfoRoot=null;},13);
  };

  proto.showUniverseAtlas = function(level, returnTo) {
    stopAtlas(this);
    this.clearUI();
    this.state='UNIVERSE_ATLAS';
    this._atlasReturnTo=returnTo||'home';
    this._atlasLevel=clampLevel(level==null?0:level);
    this._atlasMotionTweens=[];
    this._atlasTransitionTweens=[];
    this._atlasTransitioning=false;
    this._atlasSimAnchorMs=Date.now();
    this._atlasRealStart=performance.now();

    const bg=this.add.graphics();bg.fillStyle(0x01040a,1).fillRect(0,0,W,H);this.ui.add(bg);
    const chrome=this.add.container(0,0);chrome.setDepth(10);this.ui.add(chrome);

    button(this,chrome,58,this.Y(32),82,30,'BACK',C.orange,()=>{
      const target=this._atlasReturnTo||'home';
      stopAtlas(this);
      this.showScores(target);
    },8.4);

    this._atlasScale=text(this,chrome,W-24,this.Y(25),'',7.1,C.muted,{ox:1,bold:true});
    this._atlasTitle=text(this,chrome,W/2,this.Y(58),'',17,C.white,{ox:.5,bold:true});
    this._atlasSubtitle=text(this,chrome,W/2,this.Y(84),'',6.7,C.cyan,{ox:.5,bold:true,width:350,align:'center'});
    this._atlasProgress=text(this,chrome,W/2,this.Y(106),'',6.7,C.green,{ox:.5,bold:true});
    this._atlasClockText=text(this,chrome,W/2,this.Y(128),'',6.3,C.orange,{ox:.5,bold:true});

    const frame=this.add.graphics();
    frame.fillStyle(C.panel,.20).fillRoundedRect(10,this.Y(145),400,527,12);
    frame.lineStyle(1.4,C.cyan,.22).strokeRoundedRect(10,this.Y(145),400,527,12);
    chrome.add(frame);

    text(this,chrome,24,this.Y(650),'◆ REVEALED',6.3,C.green,{bold:true});
    text(this,chrome,119,this.Y(650),'◇ UNREVEALED',6.3,C.muted,{bold:true});
    text(this,chrome,W/2,this.Y(742),'PINCH TO ZOOM • BUTTONS USE THE SAME CAMERA TRANSITION',6.3,C.muted,{ox:.5,bold:true});

    this._atlasInButton=button(this,chrome,95,this.Y(785),142,44,'+  IN',C.cyan,()=>transitionLevel(this,-1),10.2);
    this._atlasOutButton=button(this,chrome,325,this.Y(785),142,44,'−  OUT',C.purple,()=>transitionLevel(this,1),10.2);

    updateClock(this);
    this._atlasClockEvent=this.time.addEvent({delay:500,loop:true,callback:()=>updateClock(this)});
    renderImmediate(this);
    installInput(this);
  };

  proto.showScores = function(returnTo) {
    stopAtlas(this);
    const result=baseShowScores.call(this,returnTo);
    const found=discoverySet(this);
    this.miniButton(
      W/2,
      this.Y(102),
      174,
      24,
      'UNIVERSE  '+String(found.size)+'/'+String(totalCollectibles()),
      C.purple,
      ()=>this.showUniverseAtlas(0,returnTo||'home')
    );
    return result;
  };

  window.CometUniverseAtlasV2=Object.freeze({
    version:2,
    levels:LEVELS.map(x=>x.name),
    discoverySource:'union-of-top-five-high-score-collection-snapshots',
    total:totalCollectibles(),
    simDaysPerRealSecond:SIM_DAYS_PER_REAL_SECOND,
    relativeSizing:'stylised-log-compressed',
    dwarfOrbits:true,
    animatedZoom:true,
    getDiscovered:scene=>Array.from(discoverySet(scene))
  });
})();