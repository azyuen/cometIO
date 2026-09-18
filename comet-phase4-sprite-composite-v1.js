// Phase 4 sprite-composite enhancement.
// Keeps the existing named procedural galaxy/cluster animations, then injects real preloaded sprites
// (SMBHs, black holes, stars, pulsars and nebulae) as physical-looking cores and embedded members.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4NamedStructuresV1) return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;

  const ORBITAL_VARIANTS = Object.freeze([
    'yellowDwarf_01',
    'yellowDwarf_02',
    'pulsar_01',
    'pulsar_02',
    'nebula_01',
    'nebula_02',
    'blackHole_01',
    'blackHole_02'
  ]);

  const CORE_BY_PROFILE = Object.freeze({
    milkyway: 'smbh_sagittariusA',
    andromeda: 'smbh_01',
    whirlpool: 'smbh_02',
    sombrero: 'smbh_01',
    cartwheel: 'smbh_02',
    antennae: 'smbh_01',
    virgo: 'smbh_m87',
    coma: 'smbh_02',
    bullet: 'smbh_01',
    pandora: 'smbh_02'
  });

  function textureFor(scene, variant, preferredLod = 32) {
    if (typeof COMET_SPRITE_ASSETS === 'undefined' || typeof cometSpriteTextureKey !== 'function') return null;
    const entry = COMET_SPRITE_ASSETS[variant];
    if (!entry || !Array.isArray(entry.lods) || !entry.lods.length) return null;
    const order = preferredLod === 64 ? [64,32] : [32,64];
    for (const lod of order) {
      if (!entry.lods.includes(lod)) continue;
      const key = cometSpriteTextureKey(variant,lod);
      if (!scene.textures?.exists?.(key)) continue;
      const texture = scene.textures.get?.(key);
      if (texture?.setFilter && Phaser.Textures?.FilterMode) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      return { key, lod };
    }
    return null;
  }

  function sprite(scene,parent,variant,x,y,size,alpha=.96,angle=0) {
    const resolved = textureFor(scene,variant,size >= 18 ? 64 : 32);
    if (!resolved) return null;
    const image = scene.add.image(x,y,resolved.key).setAlpha(alpha).setAngle(angle);
    const iw=Math.max(1,image.width||1), ih=Math.max(1,image.height||iw);
    image.setDisplaySize(size,size*(ih/iw));
    parent.add(image);
    return image;
  }

  function pulse(scene,parent,target,scale=.10,duration=2500,alphaLow=.72) {
    if (!target) return;
    const tw=scene.tweens.add({
      targets:target,
      scaleX:{from:1-scale/2,to:1+scale/2},
      scaleY:{from:1-scale/2,to:1+scale/2},
      alpha:{from:alphaLow,to:1},
      duration,
      yoyo:true,
      repeat:-1,
      ease:'Sine.inOut'
    });
    parent.once('destroy',()=>{try{tw.stop();}catch(_){}});
  }

  function spin(scene,parent,target,degrees=360,duration=30000) {
    if (!target) return;
    const tw=scene.tweens.add({targets:target,angle:degrees,duration,repeat:-1,ease:'Linear'});
    parent.once('destroy',()=>{try{tw.stop();}catch(_){}});
  }

  function orbitalVariant(index, offset=0) {
    return ORBITAL_VARIANTS[(index+offset)%ORBITAL_VARIANTS.length];
  }

  function addCore(scene,visual,profile,radius,opts={}) {
    const variant=opts.variant || CORE_BY_PROFILE[profile] || 'smbh_01';
    const size=Math.max(opts.min||10,Math.min(opts.max||24,radius*(opts.scale||.22)));
    const image=sprite(scene,visual,variant,opts.x||0,opts.y||0,size,opts.alpha??.96,opts.angle||0);
    if (image) pulse(scene,visual,image,opts.pulseScale??.08,opts.duration||2800,opts.alphaLow??.82);
    return image;
  }

  function orbitField(scene,visual,radius,points,offset=0,duration=36000) {
    const field=scene.add.container(0,0);
    visual.add(field);
    points.forEach((p,i)=>{
      const variant=p.variant||orbitalVariant(i,offset);
      const size=Math.max(3.5,Math.min(8.5,radius*(p.size||.07)));
      const image=sprite(scene,field,variant,p.x*radius,p.y*radius,size,p.alpha??.88,p.angle||0);
      if (image && p.pulse!==false) pulse(scene,visual,image,.10,2100+i*210,.70);
    });
    spin(scene,visual,field,points.some(p=>p.reverse)?-360:360,duration);
    return field;
  }

  function galaxySprites(scene,visual,object,radius) {
    const profile=object.phase4NamedProfile;
    if (!profile) return;

    if (profile==='milkyway') {
      addCore(scene,visual,profile,radius,{scale:.20,max:19});
      orbitField(scene,visual,radius,[
        {x:-.52,y:-.12,size:.055},{x:.42,y:.21,size:.060},{x:.17,y:-.43,size:.050},{x:-.18,y:.39,size:.050}
      ],0,41000);
      return;
    }

    if (profile==='andromeda') {
      addCore(scene,visual,profile,radius,{scale:.18,max:18});
      orbitField(scene,visual,radius,[
        {x:-.60,y:.10,size:.050},{x:.52,y:-.08,size:.055},{x:.28,y:.24,size:.045}
      ],2,52000);
      // A small companion core sits where the procedural companion light already is.
      const companion=sprite(scene,visual,'blackHole_01',radius*.86,-radius*.34,Math.max(4,radius*.065),.80);
      pulse(scene,visual,companion,.08,3300,.62);
      return;
    }

    if (profile==='whirlpool') {
      addCore(scene,visual,profile,radius,{scale:.20,max:19});
      const companion=addCore(scene,visual,profile,radius,{variant:'smbh_01',x:radius*.88,y:-radius*.25,scale:.11,min:6,max:11,pulseScale:.07,duration:3600});
      if(companion){
        const tw=scene.tweens.add({targets:companion,x:radius*.82,y:-radius*.31,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        visual.once('destroy',()=>{try{tw.stop();}catch(_){}});
      }
      orbitField(scene,visual,radius,[
        {x:-.38,y:-.18,size:.050},{x:.22,y:.44,size:.050},{x:-.15,y:.50,size:.045}
      ],4,30000);
      return;
    }

    if (profile==='sombrero') {
      addCore(scene,visual,profile,radius,{scale:.19,max:18,alpha:.92});
      orbitField(scene,visual,radius,[
        {x:-.55,y:-.015,size:.045,pulse:false},{x:.49,y:.018,size:.045,pulse:false}
      ],1,62000);
      return;
    }

    if (profile==='cartwheel') {
      addCore(scene,visual,profile,radius,{scale:.17,max:17});
      const pts=[];
      for(let i=0;i<8;i++){
        const a=i*Math.PI*2/8;
        pts.push({x:Math.cos(a)*.79,y:Math.sin(a)*.79,size:i%3===0?.052:.042,variant:i%3===0?'pulsar_01':'yellowDwarf_01'});
      }
      orbitField(scene,visual,radius,pts,0,34000);
      return;
    }

    if (profile==='antennae') {
      const left=addCore(scene,visual,profile,radius,{variant:'smbh_01',x:-radius*.22,y:-radius*.05,scale:.15,min:7,max:14,duration:3000});
      const right=addCore(scene,visual,profile,radius,{variant:'smbh_02',x:radius*.22,y:radius*.06,scale:.15,min:7,max:14,duration:3300});
      orbitField(scene,visual,radius,[
        {x:-.08,y:.02,size:.060,variant:'nebula_01'},
        {x:.08,y:-.02,size:.055,variant:'pulsar_02'},
        {x:-.52,y:-.22,size:.040,variant:'yellowDwarf_01'},
        {x:.50,y:.24,size:.040,variant:'yellowDwarf_02'}
      ],3,46000);
      if(left&&right){
        const tl=scene.tweens.add({targets:left,x:-radius*.17,y:-radius*.09,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        const tr=scene.tweens.add({targets:right,x:radius*.17,y:radius*.10,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        visual.once('destroy',()=>{try{tl.stop();tr.stop();}catch(_){}});
      }
    }
  }

  function miniGalaxyCore(scene,parent,x,y,radius,index,variant=null) {
    const c=scene.add.container(x,y);
    const g=scene.add.graphics();
    const color=index%3===0?C.purple:C.cyan;
    g.fillStyle(color,.055).fillEllipse(0,0,radius*2.0,radius*1.25);
    const arms=2+(index%2),flat=.52+(index%3)*.10;
    for(let arm=0;arm<arms;arm++){
      const start=arm*Math.PI*2/arms;
      g.lineStyle(Math.max(1,radius*.12),color,.45).beginPath();
      for(let j=0;j<=10;j++){
        const t=j/10,a=start+t*Math.PI*(1.12+(index%3)*.12),d=radius*(.14+.82*t);
        const px=Math.cos(a)*d,py=Math.sin(a)*d*flat;
        if(!j)g.moveTo(px,py);else g.lineTo(px,py);
      }
      g.strokePath();
    }
    c.add(g);
    const bh=sprite(scene,c,variant||((index%2)?'smbh_01':'smbh_02'),0,0,Math.max(3.8,radius*.30),.92);
    if(index%3===0){
      sprite(scene,c,orbitalVariant(index,2),radius*.42,-radius*.12,Math.max(2.8,radius*.18),.76);
    }
    parent.add(c);
    return c;
  }

  function clusterSprites(scene,visual,object,radius) {
    const profile=object.phase4NamedProfile;
    if (!profile) return;

    if(profile==='virgo'){
      // M87 is a major Virgo member, so use its actual named SMBH sprite as the dominant core.
      addCore(scene,visual,profile,radius,{variant:'smbh_m87',scale:.18,min:9,max:19,duration:3200});
      const pts=[[-.44,-.18],[.34,-.30],[.47,.20],[-.26,.40],[.07,.48],[-.10,-.52]];
      pts.forEach((p,i)=>miniGalaxyCore(scene,visual,p[0]*radius,p[1]*radius,Math.max(7,radius*.105),i));
      return;
    }

    if(profile==='coma'){
      addCore(scene,visual,profile,radius,{variant:'smbh_01',x:-radius*.08,y:radius*.02,scale:.14,min:8,max:16,duration:2800});
      addCore(scene,visual,profile,radius,{variant:'smbh_02',x:radius*.10,y:-radius*.04,scale:.13,min:8,max:15,duration:3100});
      const pts=[[-.46,-.24],[.34,-.36],[.50,.16],[-.32,.37],[.20,.44],[-.08,-.55],[.56,-.08],[-.52,.12]];
      pts.forEach((p,i)=>miniGalaxyCore(scene,visual,p[0]*radius,p[1]*radius,Math.max(6.5,radius*.09),i));
      return;
    }

    if(profile==='bullet'){
      const left=scene.add.container(-radius*.34,radius*.04),right=scene.add.container(radius*.34,-radius*.04);
      visual.add([left,right]);
      addCore(scene,left,'bullet',radius*.55,{variant:'smbh_01',scale:.22,min:7,max:14,duration:2600});
      addCore(scene,right,'bullet',radius*.55,{variant:'smbh_02',scale:.22,min:7,max:14,duration:2900});
      [[-.16,-.17],[.12,.18],[-.20,.19]].forEach((p,i)=>miniGalaxyCore(scene,left,p[0]*radius,p[1]*radius,Math.max(5,radius*.07),i));
      [[.16,-.16],[-.12,.18],[.20,.17]].forEach((p,i)=>miniGalaxyCore(scene,right,p[0]*radius,p[1]*radius,Math.max(5,radius*.07),i+3));
      const tl=scene.tweens.add({targets:left,x:-radius*.29,duration:3600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      const tr=scene.tweens.add({targets:right,x:radius*.29,duration:3600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      visual.once('destroy',()=>{try{tl.stop();tr.stop();}catch(_){}});
      return;
    }

    if(profile==='pandora'){
      const clumps=[[-.34,-.18], [.30,-.28], [.28,.28], [-.25,.30]];
      clumps.forEach((p,i)=>{
        const node=scene.add.container(p[0]*radius,p[1]*radius);
        visual.add(node);
        addCore(scene,node,'pandora',radius*.38,{variant:i%2?'smbh_01':'smbh_02',scale:.22,min:6,max:12,duration:2600+i*250});
        miniGalaxyCore(scene,node,-radius*.08,radius*.04,Math.max(4.5,radius*.06),i*2);
        miniGalaxyCore(scene,node,radius*.07,-radius*.05,Math.max(4.2,radius*.055),i*2+1);
        const tw=scene.tweens.add({targets:node,x:node.x+(i%2?3:-3),y:node.y+(i<2?-2:2),duration:4200+i*430,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        visual.once('destroy',()=>{try{tw.stop();}catch(_){}});
      });
    }
  }

  proto.drawObject = function(x,y,radius,object,mystery=false,glow=false) {
    const visual=baseDrawObject.call(this,x,y,radius,object,mystery,glow);
    if (!visual || mystery || !object?.phase4NamedId || visual._phase4SpriteCompositeV1) return visual;

    visual._phase4SpriteCompositeV1=true;
    if (object.phase4NamedType==='cluster') clusterSprites(this,visual,object,radius);
    else galaxySprites(this,visual,object,radius);
    return visual;
  };

  window.CometPhase4SpriteCompositeV1=Object.freeze({
    enabled:true,
    version:1,
    preservesProceduralNamedAnimations:true,
    realSpriteCores:true,
    realEmbeddedOrbitals:true,
    coreAssets:['smbh_sagittariusA','smbh_m87','smbh_01','smbh_02'],
    orbitalAssets:[...ORBITAL_VARIANTS]
  });
})();