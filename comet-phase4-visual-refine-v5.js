// Phase 4 visual refinement v5.
// Cosmetic-only overlay:
// - broad, fuzzy, cloud-like galaxy arms inspired by real spiral-galaxy structure
// - varied black-hole / SMBH core sprite styles with coloured accretion glow
// - clearer two-layer filaments for galaxy clusters and superclusters
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4SpriteCompositeV1) return;

  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const P4 = window.CometPhase4 || {};
  const SUPERCLUSTER = Number(P4.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));

  const CORE_VARIANTS = Object.freeze({
    milkyway: ['smbh_sagittariusA'],
    andromeda: ['smbh_01','blackHole_gaiaBH1','smbh_ngc4889'],
    whirlpool: ['smbh_02','blackHole_cygnusX1','smbh_m87'],
    sombrero: ['smbh_ton618','blackHole_v404Cygni','smbh_01'],
    cartwheel: ['blackHole_cygnusX1','blackHole_maxiJ1820_070','smbh_02'],
    antennae: ['smbh_02','blackHole_v404Cygni','blackHole_gaiaBH1'],
    virgo: ['smbh_m87','smbh_01'],
    coma: ['smbh_ngc4889','smbh_02'],
    bullet: ['blackHole_maxiJ1820_070','smbh_01'],
    pandora: ['smbh_ton618','smbh_02']
  });

  const PALETTES = Object.freeze({
    milkyway: [0x71cfff,0x9e9cff,0xffd28c],
    andromeda: [0x8cc9ff,0xd3adff,0xffddb0],
    whirlpool: [0x58dfff,0x987fff,0xff9ed3],
    sombrero: [0xffc77a,0xff8e6b,0xc9a6ff],
    cartwheel: [0x69e4ff,0xff9edc,0xffda78],
    antennae: [0x70d8ff,0xb97cff,0xff9b6b],
    virgo: [0x69d5ff,0xae98ff,0xffd18b],
    coma: [0x82c4ff,0xb87bff,0xffb27e],
    bullet: [0x4bd5ff,0x957aff,0xff8e82],
    pandora: [0x72e2ff,0xc47cff,0xffafd9]
  });

  const GAS_CONFIG = Object.freeze({
    milkyway: {mode:'spiral',arms:4,turns:1.30,flat:.60,phase:.18},
    andromeda: {mode:'spiral',arms:2,turns:1.36,flat:.40,phase:.12},
    whirlpool: {mode:'spiral',arms:2,turns:1.64,flat:.82,phase:.15},
    sombrero: {mode:'disk',arms:2,turns:1.0,flat:.20,phase:0},
    cartwheel: {mode:'ring',arms:1,turns:1.0,flat:1.0,phase:0},
    antennae: {mode:'spiral',arms:2,turns:1.22,flat:.72,phase:.35}
  });

  function stopOnDestroy(parent,tween){
    if(!parent||!tween)return;
    parent.once('destroy',()=>{try{tween.stop();}catch(_){}});
  }

  function hash(text=''){
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function rand(seed){
    const x=Math.sin(seed*12.9898+78.233)*43758.5453;
    return x-Math.floor(x);
  }

  function textureFor(scene,variant,preferredLod=32){
    if(typeof COMET_SPRITE_ASSETS==='undefined'||typeof cometSpriteTextureKey!=='function')return null;
    const entry=COMET_SPRITE_ASSETS[variant];
    if(!entry||!Array.isArray(entry.lods)||!entry.lods.length)return null;
    const order=preferredLod===64?[64,32]:[32,64];
    for(const lod of order){
      if(!entry.lods.includes(lod))continue;
      const key=cometSpriteTextureKey(variant,lod);
      if(!scene.textures?.exists?.(key))continue;
      return {key,lod};
    }
    return null;
  }

  function addSprite(scene,parent,variant,x,y,size,alpha=.95,angle=0){
    const resolved=textureFor(scene,variant,size>=14?64:32);
    if(!resolved)return null;
    const image=scene.add.image(x,y,resolved.key).setAlpha(alpha).setAngle(angle);
    const iw=Math.max(1,image.width||1),ih=Math.max(1,image.height||iw);
    image.setDisplaySize(size,size*(ih/iw));
    parent.add(image);
    return image;
  }

  function pulse(scene,parent,target,duration=3000,amount=.06){
    if(!target)return;
    const tw=scene.tweens.add({
      targets:target,
      scaleX:{from:1-amount/2,to:1+amount/2},
      scaleY:{from:1-amount/2,to:1+amount/2},
      alpha:{from:Math.max(.60,(target.alpha||.9)-.12),to:Math.min(1,(target.alpha||.9)+.05)},
      duration,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(parent,tw);
  }

  function walk(node,fn){
    if(!node)return;
    fn(node);
    if(Array.isArray(node.list))node.list.forEach(child=>walk(child,fn));
  }

  function hideExistingBlackHoleSprites(visual){
    walk(visual,node=>{
      if(node?.type!=='Image')return;
      const key=String(node.texture?.key||'');
      if(/comet-sprite:(?:smbh|blackHole)_/i.test(key))node.setAlpha?.(.025);
    });
  }

  function coreSelection(object){
    const profile=object?.phase4NamedProfile;
    const pool=CORE_VARIANTS[profile]||['smbh_01','blackHole_01'];
    if(pool.length===1)return {variant:pool[0],index:0};
    const seed=hash(String(profile)+'|'+String(object?.realName||object?.name||'')+'|'+String(Math.round(Number(object?.massKg)||0)));
    const index=seed%pool.length;
    return {variant:pool[index],index};
  }

  function addAccretionGlow(scene,visual,r,profile,index,isCluster=false){
    const palette=PALETTES[profile]||[C.cyan,C.purple,0xffd39a];
    const color=palette[index%palette.length];
    const halo=scene.add.graphics();
    const rr=isCluster?clamp(r*.085,5,10):clamp(r*.22,11,27);

    halo.fillStyle(color,isCluster?.045:.055).fillCircle(0,0,rr*1.32);
    halo.lineStyle(Math.max(1,isCluster?r*.008:r*.014),color,isCluster?.18:.30)
      .strokeEllipse(0,0,rr*2.00,rr*(isCluster?.72:.56));
    halo.lineStyle(Math.max(.8,isCluster?r*.005:r*.008),0xffdfaa,isCluster?.10:.18)
      .strokeEllipse(0,0,rr*1.54,rr*(isCluster?.42:.31));

    if(typeof halo.setBlendMode==='function'&&Phaser.BlendModes)halo.setBlendMode(Phaser.BlendModes.ADD);
    visual.addAt(halo,Math.min(1,visual.list?.length||0));
    const tw=scene.tweens.add({
      targets:halo,alpha:{from:.62,to:1},angle:{from:-3,to:3},
      duration:3600+index*430,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(visual,tw);
  }

  function addProfileCore(scene,visual,object,r){
    const profile=object?.phase4NamedProfile;
    if(!profile)return;
    const selected=coreSelection(object);
    hideExistingBlackHoleSprites(visual);

    if(object.phase4NamedType==='cluster'){
      addAccretionGlow(scene,visual,r,profile,selected.index,true);
      const image=addSprite(scene,visual,selected.variant,0,0,clamp(r*.045,3.2,6.0),.82);
      pulse(scene,visual,image,3500,.04);
      return;
    }

    addAccretionGlow(scene,visual,r,profile,selected.index,false);

    if(profile==='antennae'){
      const pool=CORE_VARIANTS.antennae;
      const leftVariant=pool[selected.index%pool.length];
      const rightVariant=pool[(selected.index+1)%pool.length];
      const left=addSprite(scene,visual,leftVariant,-r*.19,-r*.05,clamp(r*.17,8,19),.96,-8);
      const right=addSprite(scene,visual,rightVariant,r*.19,r*.06,clamp(r*.15,7,17),.93,10);
      pulse(scene,visual,left,3100,.05);
      pulse(scene,visual,right,3550,.05);
      return;
    }

    const image=addSprite(scene,visual,selected.variant,0,0,clamp(r*.27,12,29),.98);
    pulse(scene,visual,image,2900+(profile.length||0)*70,.055);
  }

  function spiralPoint(r,cfg,arm,t,pass,layer){
    const start=cfg.phase+arm*Math.PI*2/cfg.arms;
    const angleWave=
      Math.sin(t*Math.PI*4.3+arm*.77+pass*1.29+layer*.71)*(.040+pass*.010)+
      Math.sin(t*Math.PI*9.1+arm*1.31+pass*.63)*.012;
    const angle=start+t*Math.PI*cfg.turns+angleWave;
    const radialWave=
      1+Math.sin(t*Math.PI*3.2+pass*1.17)*.032+
      Math.sin(t*Math.PI*8.0+arm*.9)*.012;
    const lateral=(pass-1.5)*r*.018;
    const d=r*(.15+.80*t)*radialWave+lateral;
    return {x:Math.cos(angle)*d,y:Math.sin(angle)*d*cfg.flat,angle,d};
  }

  function cloudDot(graphics,x,y,radius,color,alpha){
    graphics.fillStyle(color,alpha).fillCircle(x,y,radius);
  }

  function drawFuzzySpiral(graphics,r,cfg,palette,layer){
    const color=palette[layer%palette.length];
    for(let arm=0;arm<cfg.arms;arm++){
      for(let pass=0;pass<4;pass++){
        const width=Math.max(1.5,r*(.105-pass*.017+layer*.004));
        const alpha=.030+pass*.018+layer*.010;
        graphics.lineStyle(width,color,alpha).beginPath();
        for(let j=0;j<=34;j++){
          const p=spiralPoint(r,cfg,arm,j/34,pass,layer);
          if(!j)graphics.moveTo(p.x,p.y);else graphics.lineTo(p.x,p.y);
        }
        graphics.strokePath();
      }

      for(let j=1;j<28;j++){
        const t=j/28;
        const p=spiralPoint(r,cfg,arm,t,(j+arm)%4,layer+.4);
        const s=hash(String(arm)+':'+String(j)+':'+String(layer)+':'+String(cfg.phase));
        const jitterA=(rand(s)-.5)*r*.050;
        const jitterB=(rand(s+7)-.5)*r*.036;
        const x=p.x+Math.cos(p.angle+Math.PI/2)*jitterA;
        const y=p.y+Math.sin(p.angle+Math.PI/2)*jitterB*cfg.flat;
        const rr=r*(.018+rand(s+13)*.028)*(1-.20*t);
        const c=palette[(layer+j+arm)%palette.length];
        cloudDot(graphics,x,y,Math.max(1,rr),c,.015+rand(s+19)*.028);
      }
    }
  }

  function drawFuzzyDisk(graphics,r,palette,layer){
    const color=palette[layer%palette.length];
    for(let pass=0;pass<4;pass++){
      const w=Math.max(1.2,r*(.060-pass*.010));
      graphics.lineStyle(w,color,.035+pass*.020+layer*.008)
        .strokeEllipse(0,(pass-1.5)*r*.010,r*(1.66+pass*.035),r*(.17+pass*.018));
    }
    for(let i=0;i<28;i++){
      const t=(i+.5)/28;
      const x=r*(-.80+1.60*t);
      const y=(rand(i*19+layer*31)-.5)*r*.12;
      cloudDot(graphics,x,y,Math.max(1,r*(.015+rand(i*23+layer)*.020)),palette[(i+layer)%palette.length],.018+.020*rand(i*17+9));
    }
  }

  function drawFuzzyRing(graphics,r,palette,layer){
    const color=palette[layer%palette.length];
    for(let pass=0;pass<5;pass++){
      const rr=r*(.75+(pass-2)*.014);
      graphics.lineStyle(Math.max(1.2,r*(.055-pass*.006)),color,.030+pass*.015+layer*.008).strokeCircle(0,0,rr);
    }
    for(let i=0;i<34;i++){
      const a=i*Math.PI*2/34+layer*.09;
      const d=r*(.75+(rand(i*41+layer*13)-.5)*.055);
      cloudDot(graphics,Math.cos(a)*d,Math.sin(a)*d,Math.max(1,r*(.014+rand(i*29+3)*.020)),palette[(i+layer)%palette.length],.018+.025*rand(i*11+layer));
    }
  }

  function addFuzzyGas(scene,visual,object,r){
    const profile=object?.phase4NamedProfile;
    const cfg=GAS_CONFIG[profile];
    if(!cfg)return;
    const palette=PALETTES[profile]||[C.cyan,C.purple,0xffd6a0];

    for(let layer=0;layer<3;layer++){
      const g=scene.add.graphics();
      if(cfg.mode==='disk')drawFuzzyDisk(g,r,palette,layer);
      else if(cfg.mode==='ring')drawFuzzyRing(g,r,palette,layer);
      else drawFuzzySpiral(g,r,cfg,palette,layer);

      if(typeof g.setBlendMode==='function'&&Phaser.BlendModes)g.setBlendMode(Phaser.BlendModes.ADD);
      visual.addAt(g,Math.min(1+layer,visual.list?.length||0));

      const tw=scene.tweens.add({
        targets:g,
        angle:{from:-2.4+layer*.7,to:2.8-layer*.5},
        scaleX:{from:.982+layer*.004,to:1.020+layer*.004},
        scaleY:{from:1.018-layer*.004,to:.984+layer*.004},
        alpha:{from:.64+layer*.05,to:.94-layer*.04},
        duration:5600+layer*1800+(profile?.length||0)*90,
        yoyo:true,repeat:-1,ease:'Sine.inOut'
      });
      stopOnDestroy(visual,tw);
    }
  }

  function findMemberField(node){
    if(!node||!Array.isArray(node.list))return null;
    const direct=node.list.filter(child=>child?.type==='Container');
    if(direct.length>=6)return node;
    for(const child of direct){
      const found=findMemberField(child);
      if(found)return found;
    }
    return null;
  }

  function drawDoubleLine(glow,core,a,b,color,r,alpha=.24){
    glow.lineStyle(Math.max(3.1,r*.031),color,alpha*.40).lineBetween(a.x,a.y,b.x,b.y);
    core.lineStyle(Math.max(1.15,r*.010),color,Math.min(.42,alpha*1.08)).lineBetween(a.x,a.y,b.x,b.y);
  }

  function addSuperclusterOrbitals(scene,visual,r){
    const orbitLayer=scene.add.container(0,0);
    const specs=[
      {w:1.96,h:.74,angle:-12,color:0x35dfff,duration:11800,dir:1},
      {w:1.66,h:1.05,angle:43,color:0x2f8cff,duration:14600,dir:-1},
      {w:1.10,h:1.88,angle:7,color:0x79f6ff,duration:17200,dir:1}
    ];

    specs.forEach((spec,i)=>{
      const g=scene.add.graphics();
      const glowW=Math.max(4.0,r*.038),coreW=Math.max(1.8,r*.016);
      g.lineStyle(glowW,spec.color,.075).strokeEllipse(0,0,r*spec.w,r*spec.h);
      g.lineStyle(coreW,spec.color,.34-i*.035).strokeEllipse(0,0,r*spec.w,r*spec.h);
      g.setAngle(spec.angle);
      if(typeof g.setBlendMode==='function'&&Phaser.BlendModes)g.setBlendMode(Phaser.BlendModes.ADD);
      orbitLayer.add(g);
      const tw=scene.tweens.add({
        targets:g,
        angle:spec.angle+(360*spec.dir),
        duration:spec.duration,
        repeat:-1,
        ease:'Linear'
      });
      stopOnDestroy(visual,tw);
    });

    orbitLayer.setAlpha(.90);
    visual.addAt(orbitLayer,0);
    const pulseTw=scene.tweens.add({
      targets:orbitLayer,
      scaleX:{from:.985,to:1.025},
      scaleY:{from:1.018,to:.988},
      alpha:{from:.78,to:1},
      duration:3100,
      yoyo:true,
      repeat:-1,
      ease:'Sine.inOut'
    });
    stopOnDestroy(visual,pulseTw);
  }

  function addClusterFilaments(scene,visual,object,r){
    const field=findMemberField(visual);
    if(!field)return;
    const members=(field.list||[]).filter(child=>child?.type==='Container');
    if(members.length<4)return;

    const palette=PALETTES[object.phase4NamedProfile]||[C.cyan,C.purple,0xffd6a0];
    const glow=scene.add.graphics(),core=scene.add.graphics();
    const used=new Set();
    let drawn=0;
    const maxLinks=Math.min(18,Math.max(8,Math.floor(members.length*1.25)));

    for(let i=0;i<members.length&&drawn<maxLinks;i++){
      const nearest=[];
      for(let j=0;j<members.length;j++){
        if(i===j)continue;
        const dx=members[i].x-members[j].x,dy=members[i].y-members[j].y;
        nearest.push({j,d:dx*dx+dy*dy});
      }
      nearest.sort((a,b)=>a.d-b.d);
      for(const pick of nearest.slice(0,2)){
        if(drawn>=maxLinks)break;
        const j=pick.j,key=i<j?String(i)+':'+String(j):String(j)+':'+String(i);
        if(used.has(key)||Math.sqrt(pick.d)>r*.72)continue;
        used.add(key);
        const color=palette[drawn%palette.length];
        drawDoubleLine(glow,core,members[i],members[j],color,r,.18+(drawn%3)*.025);
        drawn++;
      }
    }

    for(let i=0;i<Math.min(4,Math.floor(members.length/3));i++){
      const a=members[(i*3)%members.length];
      const b=members[(i*3+Math.floor(members.length/2)+1)%members.length];
      drawDoubleLine(glow,core,a,b,palette[(i+1)%palette.length],r,.13);
    }

    field.addAt(glow,0);field.addAt(core,1);
    [glow,core].forEach((g,i)=>{
      const tw=scene.tweens.add({
        targets:g,alpha:{from:i?.76:.62,to:1},
        duration:3400+i*700,yoyo:true,repeat:-1,ease:'Sine.inOut'
      });
      stopOnDestroy(visual,tw);
    });

    members.forEach((member,i)=>{
      const halo=scene.add.graphics(),color=palette[(i*2+1)%palette.length];
      const rr=Math.max(2.5,r*(.019+(i%4)*.003));
      halo.fillStyle(color,.050+(i%3)*.012).fillEllipse(0,0,rr*2.9,rr*1.8);
      member.addAt(halo,0);
    });
  }

  function collectTopLevelPoints(visual,r){
    const pts=[];
    for(const child of visual.list||[]){
      if(!child||typeof child.x!=='number'||typeof child.y!=='number')continue;
      const d=Math.hypot(child.x,child.y);
      if(d<r*.08||d>r*1.25)continue;
      if(child.type==='Graphics'||child.type==='Container'||child.type==='Image')pts.push({x:child.x,y:child.y,node:child});
    }
    return pts;
  }

  function fallbackSuperclusterPoints(r,seed=1){
    const pts=[];
    for(let i=0;i<9;i++){
      const a=i*2.399963+seed*.43;
      const radial=r*(.23+rand(seed*101+i*29)*.58);
      pts.push({x:Math.cos(a)*radial,y:Math.sin(a)*radial*.72});
    }
    return pts;
  }

  function addSuperclusterWeb(scene,visual,object,r){
    let points=collectTopLevelPoints(visual,r);
    const seed=hash(String(object?.realName||object?.name||'SUPERCLUSTER'));
    if(points.length<5)points=fallbackSuperclusterPoints(r,seed%17+1);

    points=points.slice(0,12);
    const palette=[C.cyan,C.purple,0xffd08c];
    const glow=scene.add.graphics(),core=scene.add.graphics();
    const used=new Set();
    let edge=0;

    for(let i=0;i<points.length;i++){
      const nearest=[];
      for(let j=0;j<points.length;j++){
        if(i===j)continue;
        const dx=points[i].x-points[j].x,dy=points[i].y-points[j].y;
        nearest.push({j,d:dx*dx+dy*dy});
      }
      nearest.sort((a,b)=>a.d-b.d);
      for(const pick of nearest.slice(0,2)){
        const j=pick.j,key=i<j?String(i)+':'+String(j):String(j)+':'+String(i);
        if(used.has(key))continue;
        used.add(key);
        drawDoubleLine(glow,core,points[i],points[j],palette[edge%palette.length],r,.24+(edge%3)*.025);
        edge++;
      }
    }

    for(let i=0;i<Math.min(3,Math.floor(points.length/3));i++){
      const a=points[i],b=points[(i+Math.floor(points.length/2))%points.length];
      glow.lineStyle(Math.max(3,r*.030),palette[(i+1)%palette.length],.075).lineBetween(a.x,a.y,b.x,b.y);
      core.lineStyle(Math.max(1,r*.009),palette[(i+1)%palette.length],.20).lineBetween(a.x,a.y,b.x,b.y);
    }

    points.forEach((p,i)=>{
      const color=palette[i%palette.length];
      glow.fillStyle(color,.075).fillCircle(p.x,p.y,Math.max(2.5,r*.035));
      core.fillStyle(color,.40).fillCircle(p.x,p.y,Math.max(1,r*.010));
    });

    if(typeof glow.setBlendMode==='function'&&Phaser.BlendModes)glow.setBlendMode(Phaser.BlendModes.ADD);
    visual.addAt(glow,0);visual.addAt(core,Math.min(1,visual.list?.length||0));
    addSuperclusterOrbitals(scene,visual,r);

    const tw1=scene.tweens.add({targets:glow,alpha:{from:.62,to:1},duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    const tw2=scene.tweens.add({targets:core,alpha:{from:.82,to:1},duration:5200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    stopOnDestroy(visual,tw1);stopOnDestroy(visual,tw2);
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    const visual=baseDrawObject.call(this,x,y,radius,object,mystery,glow);
    if(!visual||mystery||visual._phase4VisualRefineV5)return visual;

    const named=!!object?.phase4NamedId;
    const isSupercluster=Number(object?.tier)===SUPERCLUSTER;
    if(!named&&!isSupercluster)return visual;

    visual._phase4VisualRefineV5=true;
    const r=radius*(Number(visual.phase4CompressedScale)||1);

    if(named){
      addProfileCore(this,visual,object,r);
      if(object.phase4NamedType==='cluster')addClusterFilaments(this,visual,object,r);
      else addFuzzyGas(this,visual,object,r);
    }

    if(isSupercluster)addSuperclusterWeb(this,visual,object,r);

    visual.phase4VisualV5={
      fuzzyCloudArms:named&&object.phase4NamedType!=='cluster',
      variedBlackHoleCore:named,
      clusterFilaments:named&&object.phase4NamedType==='cluster',
      superclusterWeb:isSupercluster
    };
    return visual;
  };

  window.CometPhase4VisualRefineV5=Object.freeze({
    enabled:true,
    version:5,
    cosmeticOnly:true,
    fuzzyCloudArms:true,
    irregularArmBands:true,
    variedBlackHoleCoreSprites:true,
    colouredAccretionGlow:true,
    clearerClusterFilaments:true,
    clearerSuperclusterWeb:true,
    thickerSuperclusterLines:true,
    animatedSuperclusterOrbitals:true,
    preservesCompressedPhysicalScale:true
  });
})();