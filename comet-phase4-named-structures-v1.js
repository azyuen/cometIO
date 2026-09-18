// Named Phase 4 galaxies and galaxy clusters.
// Cosmetic identity/animation only: does not alter encounter mass, radius, speed, tier odds, or physics.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = Number(P4.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
  const CLUSTER = Number(P4.clusterTier ?? TIERS.findIndex(t => t.name === 'GALAXY CLUSTER'));
  const SUPERCLUSTER = Number(P4.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));
  const basePickOpponent = proto.pickOpponent;
  const baseDrawObject = proto.drawObject;

  const GALAXIES = Object.freeze([
    { id:'milky-way', name:'MILKY WAY', profile:'milkyway', weight:10, color:0xa8d8ff },
    { id:'andromeda', name:'ANDROMEDA GALAXY', profile:'andromeda', weight:10, color:0xb8d7ff },
    { id:'whirlpool', name:'WHIRLPOOL GALAXY', profile:'whirlpool', weight:9, color:0x9be7ff },
    { id:'sombrero', name:'SOMBRERO GALAXY', profile:'sombrero', weight:5, color:0xffd49a },
    { id:'cartwheel', name:'CARTWHEEL GALAXY', profile:'cartwheel', weight:4, color:0x9edfff },
    { id:'antennae', name:'ANTENNAE GALAXIES', profile:'antennae', weight:4, color:0xc4b4ff }
  ]);

  const CLUSTERS = Object.freeze([
    { id:'virgo', name:'VIRGO CLUSTER', profile:'virgo', weight:10, color:0x90ddff },
    { id:'coma', name:'COMA CLUSTER', profile:'coma', weight:9, color:0xbba7ff },
    { id:'bullet', name:'BULLET CLUSTER', profile:'bullet', weight:5, color:0x8fd9ff },
    { id:'pandora', name:"PANDORA'S CLUSTER", profile:'pandora', weight:3, color:0xc49fff }
  ]);

  function weightedPick(list) {
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of list) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return list[list.length - 1];
  }

  function isGalaxyObject(object) {
    return Number(object?.tier) === GALAXY || object?.kind === 'galaxy';
  }
  function isClusterObject(object) {
    return Number(object?.tier) === CLUSTER || object?.kind === 'cluster';
  }
  function isMinorGalaxy(object) {
    return /DWARF|SATELLITE/i.test(String(object?.realName || object?.name || ''));
  }

  function decorate(object, spec, type) {
    if (!object || !spec) return object;
    return {
      ...object,
      name: spec.name,
      realName: spec.name,
      color: spec.color,
      galaxyProfile: type === 'galaxy' ? spec.profile : object.galaxyProfile,
      clusterProfile: type === 'cluster' ? spec.profile : object.clusterProfile,
      phase4NamedId: spec.id,
      phase4NamedType: type,
      phase4NamedProfile: spec.profile,
      phase4NamedCosmetic: true
    };
  }

  proto.pickOpponent = function(...args) {
    const object = basePickOpponent.apply(this, args);
    if (!object || Number(this?.tierIndex) < GALAXY || Number(this?.tierIndex) >= SUPERCLUSTER) return object;
    if (object.phase4NamedId) return object;
    if (isGalaxyObject(object) && !isMinorGalaxy(object)) return decorate(object, weightedPick(GALAXIES), 'galaxy');
    if (isClusterObject(object)) return decorate(object, weightedPick(CLUSTERS), 'cluster');
    return object;
  };

  function addTo(scene, container) {
    scene.ui.add(container);
    return container;
  }
  function stopOnDestroy(container, tween) {
    if (!container || !tween) return;
    container.once('destroy', () => { try { tween.stop(); } catch (_) {} });
  }
  function pathSpiral(g, radius, color, arms, turns, flat, alpha=.68, width=.08, phase=0) {
    for (let arm=0; arm<arms; arm++) {
      const start = phase + arm*Math.PI*2/arms;
      g.lineStyle(Math.max(1, radius*width), color, alpha).beginPath();
      for (let i=0; i<=22; i++) {
        const t=i/22, a=start+t*Math.PI*turns, d=radius*(.12+.88*t);
        const x=Math.cos(a)*d, y=Math.sin(a)*d*flat;
        if (!i) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.strokePath();
    }
  }
  function starKnots(g, radius, color, count, flat=.72, phase=.2) {
    for (let i=0;i<count;i++) {
      const a=phase+i*2.399963, d=radius*(.30+.62*((i*37)%17)/16);
      const x=Math.cos(a)*d, y=Math.sin(a)*d*flat;
      g.fillStyle(i%4===0?0xfff0c8:color, .45+(i%3)*.12).fillCircle(x,y,Math.max(.7,radius*(i%5===0?.025:.015)));
    }
  }
  function core(g, radius, color=0xfff0c8, scale=.15) {
    g.fillStyle(color,.28).fillCircle(0,0,Math.max(2,radius*scale*1.75));
    g.fillStyle(color,.90).fillCircle(0,0,Math.max(1.5,radius*scale));
  }

  function milkyWay(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    if(glow) g.fillStyle(color,.035).fillCircle(0,0,r*1.14);
    g.fillStyle(color,.055).fillEllipse(0,0,r*2.1,r*1.18);
    pathSpiral(g,r*.94,color,4,1.28,.58,.66,.075,.18);
    g.fillStyle(0xffefc0,.75).fillRoundedRect(-r*.34,-r*.055,r*.68,r*.11,r*.04);
    starKnots(g,r*.90,color,17,.58,.1); core(g,r,0xfff0c8,.12);
    c.add(g); addTo(scene,c);
    const tw=scene.tweens.add({targets:g,angle:360,duration:40000,repeat:-1,ease:'Linear'}); stopOnDestroy(c,tw);
    return c;
  }

  function andromeda(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    if(glow) g.fillStyle(color,.035).fillEllipse(0,0,r*2.35,r*.95);
    g.fillStyle(color,.06).fillEllipse(0,0,r*2.20,r*.82);
    pathSpiral(g,r*.96,color,2,1.32,.38,.64,.07,.15);
    g.fillStyle(0xffedc6,.23).fillEllipse(0,0,r*.62,r*.20);
    g.fillStyle(0xfff3d4,.90).fillEllipse(0,0,r*.25,r*.10);
    starKnots(g,r*.93,color,13,.38,.4);
    g.fillStyle(0xd8eaff,.76).fillCircle(r*.86,-r*.34,Math.max(1.5,r*.055));
    g.fillStyle(0xc6dcff,.62).fillCircle(-r*.96,r*.27,Math.max(1.2,r*.040));
    c.add(g); addTo(scene,c);
    const tw=scene.tweens.add({targets:g,angle:{from:-2,to:2},duration:5200,yoyo:true,repeat:-1,ease:'Sine.inOut'}); stopOnDestroy(c,tw);
    return c;
  }

  function whirlpool(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),field=scene.add.container(0,0),g=scene.add.graphics();
    if(glow) g.fillStyle(color,.035).fillCircle(0,0,r*1.17);
    g.fillStyle(color,.055).fillEllipse(0,0,r*1.85,r*1.58);
    pathSpiral(g,r*.78,color,2,1.62,.82,.78,.085,.15);
    starKnots(g,r*.77,color,14,.82,.5); core(g,r,0xfff1ca,.11);
    field.add(g);
    const companion=scene.add.container(r*.88,-r*.25),cg=scene.add.graphics();
    cg.fillStyle(0xb7dfff,.12).fillCircle(0,0,r*.19);cg.fillStyle(0xe7f4ff,.88).fillCircle(0,0,Math.max(2,r*.07));
    cg.lineStyle(Math.max(1,r*.025),color,.45).arc(0,0,r*.13,.2,5.5,false).strokePath(); companion.add(cg);field.add(companion);
    const bridge=scene.add.graphics();bridge.lineStyle(Math.max(1,r*.025),color,.32).lineBetween(r*.52,-r*.07,r*.80,-r*.21);field.addAt(bridge,0);
    c.add(field); addTo(scene,c);
    const spin=scene.tweens.add({targets:g,angle:360,duration:30000,repeat:-1,ease:'Linear'});
    const drift=scene.tweens.add({targets:companion,x:r*.82,y:-r*.31,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    stopOnDestroy(c,spin);stopOnDestroy(c,drift);return c;
  }

  function sombrero(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),halo=scene.add.graphics(),disk=scene.add.graphics();
    if(glow) halo.fillStyle(color,.035).fillEllipse(0,0,r*2.15,r*1.35);
    halo.fillStyle(0xffe2ac,.055).fillEllipse(0,0,r*1.50,r*1.16);
    halo.fillStyle(0xffecc8,.13).fillEllipse(0,0,r*.72,r*.84);
    disk.fillStyle(color,.50).fillEllipse(0,0,r*2.12,r*.29);
    disk.fillStyle(0x030713,.96).fillEllipse(0,r*.015,r*1.94,r*.105);
    disk.fillStyle(0xfff3d0,.88).fillEllipse(0,-r*.018,r*.44,r*.24);
    for(let i=0;i<11;i++){const xx=(-.82+i*.164)*r;disk.fillStyle(i%3?color:0xfff1c8,.45).fillCircle(xx,(i%2?-.04:.04)*r,Math.max(.7,r*.018));}
    c.add([halo,disk]);addTo(scene,c);
    const pulse=scene.tweens.add({targets:halo,alpha:{from:.72,to:1},scaleX:{from:.98,to:1.03},scaleY:{from:.98,to:1.03},duration:3100,yoyo:true,repeat:-1,ease:'Sine.inOut'});stopOnDestroy(c,pulse);
    return c;
  }

  function cartwheel(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),rings=scene.add.graphics(),knots=scene.add.container(0,0);
    if(glow) rings.fillStyle(color,.03).fillCircle(0,0,r*1.16);
    rings.lineStyle(Math.max(2,r*.075),color,.70).strokeCircle(0,0,r*.82);
    rings.lineStyle(Math.max(1,r*.028),0xb9e9ff,.30).strokeCircle(0,0,r*.43);
    rings.lineStyle(Math.max(1,r*.018),color,.21);
    for(let i=0;i<10;i++){const a=i*Math.PI*2/10;rings.lineBetween(Math.cos(a)*r*.20,Math.sin(a)*r*.20,Math.cos(a)*r*.78,Math.sin(a)*r*.78);}
    rings.fillStyle(0xfff1c6,.90).fillCircle(0,0,Math.max(2,r*.10));
    for(let i=0;i<14;i++){const a=i*Math.PI*2/14+(i%2)*.06,d=r*.82,kg=scene.add.graphics();kg.fillStyle(i%3===0?0xffe6a8:color,.75).fillCircle(0,0,Math.max(1,r*(i%4===0?.035:.023)));kg.setPosition(Math.cos(a)*d,Math.sin(a)*d);knots.add(kg);}
    c.add([rings,knots]);addTo(scene,c);
    const spin=scene.tweens.add({targets:knots,angle:360,duration:34000,repeat:-1,ease:'Linear'});
    const pulse=scene.tweens.add({targets:rings,scale:{from:.98,to:1.025},alpha:{from:.82,to:1},duration:2500,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    stopOnDestroy(c,spin);stopOnDestroy(c,pulse);return c;
  }

  function antennae(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),tails=scene.add.graphics(),a=scene.add.container(-r*.22,-r*.05),b=scene.add.container(r*.22,r*.06);
    if(glow) tails.fillStyle(color,.025).fillCircle(0,0,r*1.18);
    tails.lineStyle(Math.max(1.5,r*.045),color,.40).beginPath();tails.moveTo(-r*.28,-r*.06);tails.lineTo(-r*.62,-r*.25);tails.lineTo(-r*.94,-r*.72);tails.strokePath();
    tails.lineStyle(Math.max(1.5,r*.045),0xa9ddff,.35).beginPath();tails.moveTo(r*.27,r*.07);tails.lineTo(r*.62,r*.28);tails.lineTo(r*.93,r*.70);tails.strokePath();
    const ag=scene.add.graphics(),bg=scene.add.graphics();
    ag.fillStyle(0xb4dfff,.07).fillEllipse(0,0,r*.82,r*.55);pathSpiral(ag,r*.34,0xb9e5ff,2,1.12,.72,.65,.09,.1);core(ag,r*.42,0xffedc2,.16);
    bg.fillStyle(0xc7aaff,.07).fillEllipse(0,0,r*.82,r*.55);pathSpiral(bg,r*.34,color,2,1.05,.70,.64,.09,.9);core(bg,r*.42,0xffe9bd,.16);
    a.add(ag);b.add(bg);c.add([tails,a,b]);addTo(scene,c);
    const ta=scene.tweens.add({targets:a,x:-r*.17,y:-r*.09,angle:-8,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    const tb=scene.tweens.add({targets:b,x:r*.17,y:r*.10,angle:8,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    stopOnDestroy(c,ta);stopOnDestroy(c,tb);return c;
  }

  function miniGalaxyGlyph(scene,parent,x,y,r,color,variant=0) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    const flat=[.48,.65,.80][variant%3];
    g.fillStyle(color,.055).fillEllipse(0,0,r*2.0,r*(.8+flat));
    pathSpiral(g,r*.82,color,2+(variant%2),1.18+(variant%3)*.15,flat,.52,.10,variant*.45);
    g.fillStyle(0xfff0c8,.88).fillCircle(0,0,Math.max(1,r*.13));
    c.add(g);parent.add(c);return c;
  }

  function clusterHalo(scene,parent,x,y,r,color,count,seed=0,dense=false) {
    const cloud=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(color,dense?.032:.022).fillEllipse(0,0,r*2.0,r*1.55);cloud.add(g);
    for(let i=0;i<count;i++){
      const a=(i*2.399963+seed*.73),frac=((i*37+seed*11)%101)/100,d=r*(.13+Math.pow(frac,.72)*.76);
      const gx=Math.cos(a)*d,gy=Math.sin(a)*d*.72,rr=r*(dense?.055:.06)*(i%7===0?1.45:.8+((i*13)%7)/12);
      miniGalaxyGlyph(scene,cloud,gx,gy,Math.max(2.2,rr),i%4===0?0xffdca8:(i%3===0?C.purple:color),i+seed);
    }
    parent.add(cloud);return cloud;
  }

  function virgo(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),back=scene.add.graphics();
    if(glow) back.fillStyle(color,.03).fillCircle(0,0,r*1.16);
    back.fillStyle(color,.018).fillEllipse(0,0,r*2.0,r*1.55);c.add(back);
    clusterHalo(scene,c,0,0,r*.94,color,13,1,false);
    const giant=scene.add.graphics();giant.fillStyle(0xffe6bd,.10).fillEllipse(0,0,r*.42,r*.34);giant.fillStyle(0xfff0d4,.90).fillCircle(0,0,Math.max(2,r*.07));c.add(giant);
    addTo(scene,c);const drift=scene.tweens.add({targets:c.list[1],angle:{from:-3,to:3},duration:6500,yoyo:true,repeat:-1,ease:'Sine.inOut'});stopOnDestroy(c,drift);return c;
  }

  function coma(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),bg=scene.add.graphics();
    if(glow) bg.fillStyle(color,.032).fillCircle(0,0,r*1.18);
    bg.fillStyle(color,.025).fillCircle(0,0,r*.96);c.add(bg);
    const cloud=clusterHalo(scene,c,0,0,r*.96,color,20,3,true);
    const cores=scene.add.graphics();cores.fillStyle(0xffedd0,.88).fillCircle(-r*.09,r*.02,Math.max(2,r*.065));cores.fillStyle(0xffe1b0,.82).fillCircle(r*.10,-r*.035,Math.max(2,r*.060));c.add(cores);
    addTo(scene,c);const tw=scene.tweens.add({targets:cloud,angle:{from:-2,to:2},duration:5400,yoyo:true,repeat:-1,ease:'Sine.inOut'});stopOnDestroy(c,tw);return c;
  }

  function bullet(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),bridge=scene.add.graphics(),left=scene.add.container(-r*.34,r*.04),right=scene.add.container(r*.34,-r*.04);
    if(glow) bridge.fillStyle(color,.028).fillCircle(0,0,r*1.16);
    bridge.lineStyle(Math.max(1,r*.024),0x9fe4ff,.25).lineBetween(-r*.20,0,r*.20,0);
    bridge.fillStyle(0x6bbcff,.035).fillEllipse(0,0,r*.92,r*.30);c.add(bridge);
    clusterHalo(scene,left,0,0,r*.44,0x83d7ff,8,4,true);clusterHalo(scene,right,0,0,r*.42,0xc0a6ff,7,7,true);
    c.add([left,right]);addTo(scene,c);
    const tl=scene.tweens.add({targets:left,x:-r*.29,duration:3600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    const tr=scene.tweens.add({targets:right,x:r*.29,duration:3600,yoyo:true,repeat:-1,ease:'Sine.inOut'});stopOnDestroy(c,tl);stopOnDestroy(c,tr);return c;
  }

  function pandora(scene,x,y,r,color,glow) {
    const c=scene.add.container(x,y),bg=scene.add.graphics();
    if(glow) bg.fillStyle(color,.028).fillCircle(0,0,r*1.18);
    bg.fillStyle(color,.016).fillEllipse(0,0,r*2.05,r*1.60);
    bg.lineStyle(Math.max(1,r*.018),0xcaa8ff,.19).arc(-r*.05,0,r*.78,-1.0,.25,false).strokePath();
    bg.lineStyle(Math.max(1,r*.014),0x8ee6ff,.15).arc(r*.08,r*.05,r*.62,2.1,3.7,false).strokePath();c.add(bg);
    const pts=[[-.34,-.18,.40,2],[.30,-.28,.34,5],[.28,.28,.38,8],[-.25,.30,.31,11]];
    const clumps=[];
    for(const p of pts){const node=scene.add.container(p[0]*r,p[1]*r);clusterHalo(scene,node,0,0,r*p[2],p[3]%2?0xb9a2ff:0x8adfff,5+(p[3]%3),p[3],true);c.add(node);clumps.push(node);}
    addTo(scene,c);
    clumps.forEach((node,i)=>{const tw=scene.tweens.add({targets:node,x:node.x+(i%2?3:-3),y:node.y+(i<2?-2:2),duration:4200+i*430,yoyo:true,repeat:-1,ease:'Sine.inOut'});stopOnDestroy(c,tw);});
    return c;
  }

  function renderGalaxy(scene,x,y,r,object,glow) {
    const color=Number(object?.color)||C.cyan;
    switch(object.phase4NamedProfile) {
      case 'milkyway': return milkyWay(scene,x,y,r,color,glow);
      case 'andromeda': return andromeda(scene,x,y,r,color,glow);
      case 'whirlpool': return whirlpool(scene,x,y,r,color,glow);
      case 'sombrero': return sombrero(scene,x,y,r,color,glow);
      case 'cartwheel': return cartwheel(scene,x,y,r,color,glow);
      case 'antennae': return antennae(scene,x,y,r,color,glow);
      default: return null;
    }
  }
  function renderCluster(scene,x,y,r,object,glow) {
    const color=Number(object?.color)||C.cyan;
    switch(object.phase4NamedProfile) {
      case 'virgo': return virgo(scene,x,y,r,color,glow);
      case 'coma': return coma(scene,x,y,r,color,glow);
      case 'bullet': return bullet(scene,x,y,r,color,glow);
      case 'pandora': return pandora(scene,x,y,r,color,glow);
      default: return null;
    }
  }

  proto.drawObject = function(x,y,radius,object,mystery=false,glow=false) {
    if (!mystery && object?.phase4NamedId) {
      const visual = object.phase4NamedType === 'cluster'
        ? renderCluster(this,x,y,radius,object,glow)
        : renderGalaxy(this,x,y,radius,object,glow);
      if (visual) return visual;
    }
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  window.CometPhase4NamedStructuresV1 = Object.freeze({
    enabled:true,
    version:1,
    cosmeticOnly:true,
    galaxyPool:GALAXIES.map(x=>({id:x.id,name:x.name,weight:x.weight,profile:x.profile})),
    clusterPool:CLUSTERS.map(x=>({id:x.id,name:x.name,weight:x.weight,profile:x.profile}))
  });
})();