// Phase 4 sprite-composite enhancement v3.
// Galaxy scale: one dominant readable SMBH core, with many very small pulsar/nebula knots following
// the arms. Cluster scale: the cluster is a field of animated galaxy swirls; member SMBHs are no
// longer individually visible, while the dominant central galaxy retains only a subtle core.
(() => {
  if(typeof GameScene==='undefined'||!window.CometPhase4NamedStructuresV1)return;

  const proto=GameScene.prototype;
  const baseDrawObject=proto.drawObject;

  const ARM_VARIANTS=Object.freeze(['pulsar_01','nebula_01','pulsar_02','nebula_02']);

  const CORE_BY_PROFILE=Object.freeze({
    milkyway:'smbh_sagittariusA',
    andromeda:'smbh_01',
    whirlpool:'smbh_02',
    sombrero:'smbh_01',
    cartwheel:'smbh_02',
    antennae:'smbh_01',
    virgo:'smbh_m87',
    coma:'smbh_02',
    bullet:'smbh_01',
    pandora:'smbh_02'
  });

  // Representative structural diameters (thousands of light-years). These drive only compressed
  // apparent-size differences; encounter physics and progression remain unchanged.
  const PHYSICAL_DIAMETER_KLY=Object.freeze({
    milkyway:100,
    andromeda:152,
    whirlpool:76,
    sombrero:50,
    cartwheel:150,
    antennae:150,
    virgo:15000,
    coma:20000,
    bullet:10000,
    pandora:13000
  });

  function visualScale(object){
    const d=PHYSICAL_DIAMETER_KLY[object?.phase4NamedProfile];
    if(!d)return 1;
    if(object?.phase4NamedType==='cluster')return clamp(1.45*Math.pow(d/15000,.22),1.28,1.62);
    return clamp(Math.pow(d/100,.30),.80,1.18);
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
      const texture=scene.textures.get?.(key);
      if(texture?.setFilter&&Phaser.Textures?.FilterMode)texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      return {key,lod};
    }
    return null;
  }

  function sprite(scene,parent,variant,x,y,size,alpha=.96,angle=0){
    const resolved=textureFor(scene,variant,size>=18?64:32);
    if(!resolved)return null;
    const image=scene.add.image(x,y,resolved.key).setAlpha(alpha).setAngle(angle);
    const iw=Math.max(1,image.width||1),ih=Math.max(1,image.height||iw);
    image.setDisplaySize(size,size*(ih/iw));
    parent.add(image);
    return image;
  }

  function stopOnDestroy(parent,tween){
    if(!parent||!tween)return;
    parent.once('destroy',()=>{try{tween.stop();}catch(_){}});
  }

  function pulse(scene,parent,target,scale=.07,duration=2800,alphaLow=.84){
    if(!target)return;
    const tw=scene.tweens.add({
      targets:target,
      scaleX:{from:1-scale/2,to:1+scale/2},
      scaleY:{from:1-scale/2,to:1+scale/2},
      alpha:{from:alphaLow,to:1},
      duration,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(parent,tw);
  }

  function twinkle(scene,parent,target,index=0){
    if(!target)return;
    const base=target.alpha||.7;
    const tw=scene.tweens.add({
      targets:target,alpha:{from:Math.max(.38,base-.20),to:Math.min(.90,base+.08)},
      duration:1700+(index%5)*260,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(parent,tw);
  }

  function addDominantCore(scene,parent,profile,radius,opts={}){
    const variant=opts.variant||CORE_BY_PROFILE[profile]||'smbh_01';
    const size=clamp(radius*(opts.scale||.30),opts.min||14,opts.max||32);
    const image=sprite(scene,parent,variant,opts.x||0,opts.y||0,size,opts.alpha??.98,opts.angle||0);
    if(image)pulse(scene,parent,image,opts.pulseScale??.07,opts.duration||3000,opts.alphaLow??.84);
    return image;
  }

  function addSpiralKnots(scene,parent,radius,opts={}){
    const field=scene.add.container(0,0);parent.add(field);
    const arms=Math.max(1,opts.arms||2);
    const perArm=Math.max(2,opts.perArm||6);
    const turns=opts.turns||1.30;
    const flat=opts.flat??.66;
    const startRadius=opts.startRadius??.28;
    const endRadius=opts.endRadius??.84;
    const phase=opts.phase||0;
    let idx=0;

    for(let arm=0;arm<arms;arm++){
      const armStart=phase+arm*Math.PI*2/arms;
      for(let j=0;j<perArm;j++){
        const t=perArm===1?0:j/(perArm-1);
        const a=armStart+t*Math.PI*turns;
        const d=radius*(startRadius+(endRadius-startRadius)*t);
        const jitter=((j+arm*3)%3-1)*radius*.012;
        const x=Math.cos(a)*(d+jitter);
        const y=Math.sin(a)*(d+jitter)*flat;
        const variant=ARM_VARIANTS[(idx+(opts.offset||0))%ARM_VARIANTS.length];
        // Intentionally tiny: these are star-forming/compact-object accents, not mini-icons.
        const size=clamp(radius*(opts.spriteScale||.018)*(idx%5===0?1.12:.90),1.5,3.2);
        const image=sprite(scene,field,variant,x,y,size,.68+(idx%3)*.045,(idx%4)*22);
        if(image)twinkle(scene,parent,image,idx);
        idx++;
      }
    }

    const spin=scene.tweens.add({
      targets:field,angle:opts.reverse?-360:360,
      duration:opts.duration||42000,repeat:-1,ease:'Linear'
    });
    stopOnDestroy(parent,spin);
    return field;
  }

  function addDiskKnots(scene,parent,radius,count=10,duration=60000){
    const field=scene.add.container(0,0);parent.add(field);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      const x=radius*(-.72+1.44*t);
      const y=radius*((i%2?1:-1)*.018);
      const size=clamp(radius*.016*(i%4===0?1.12:.88),1.5,2.8);
      const image=sprite(scene,field,ARM_VARIANTS[i%ARM_VARIANTS.length],x,y,size,.64+(i%3)*.05);
      if(image)twinkle(scene,parent,image,i);
    }
    const sway=scene.tweens.add({targets:field,angle:{from:-1.5,to:1.5},duration,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    stopOnDestroy(parent,sway);return field;
  }

  function addRingKnots(scene,parent,radius,count=16,duration=34000){
    const field=scene.add.container(0,0);parent.add(field);
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count+(i%2)*.025;
      const d=radius*.79;
      const size=clamp(radius*.016*(i%4===0?1.12:.88),1.5,3.0);
      const image=sprite(
        scene,field,ARM_VARIANTS[i%ARM_VARIANTS.length],
        Math.cos(a)*d,Math.sin(a)*d,size,.66+(i%3)*.045
      );
      if(image)twinkle(scene,parent,image,i);
    }
    const spin=scene.tweens.add({targets:field,angle:360,duration,repeat:-1,ease:'Linear'});
    stopOnDestroy(parent,spin);return field;
  }

  function galaxySprites(scene,visual,object,r){
    const p=object.phase4NamedProfile;
    if(!p)return;

    if(p==='milkyway'){
      addDominantCore(scene,visual,p,r,{scale:.31,max:29});
      addSpiralKnots(scene,visual,r,{arms:4,perArm:5,turns:1.28,flat:.58,phase:.18,duration:41000});
      return;
    }

    if(p==='andromeda'){
      addDominantCore(scene,visual,p,r,{scale:.29,max:28});
      addSpiralKnots(scene,visual,r,{arms:2,perArm:8,turns:1.32,flat:.38,phase:.15,offset:1,duration:52000});
      return;
    }

    if(p==='whirlpool'){
      addDominantCore(scene,visual,p,r,{scale:.31,max:29});
      const companion=addDominantCore(scene,visual,p,r,{
        variant:'smbh_01',x:r*.88,y:-r*.25,scale:.10,min:5.5,max:9.5,pulseScale:.05,duration:3600
      });
      if(companion){
        const tw=scene.tweens.add({targets:companion,x:r*.82,y:-r*.31,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        stopOnDestroy(visual,tw);
      }
      addSpiralKnots(scene,visual,r,{arms:2,perArm:7,turns:1.62,flat:.82,phase:.15,offset:2,duration:30000});
      return;
    }

    if(p==='sombrero'){
      addDominantCore(scene,visual,p,r,{scale:.30,max:28,alpha:.96});
      addDiskKnots(scene,visual,r,12,62000);
      return;
    }

    if(p==='cartwheel'){
      addDominantCore(scene,visual,p,r,{scale:.29,max:28});
      addRingKnots(scene,visual,r,18,34000);
      return;
    }

    if(p==='antennae'){
      const left=addDominantCore(scene,visual,p,r,{variant:'smbh_01',x:-r*.22,y:-r*.05,scale:.21,min:9,max:19,duration:3000});
      const right=addDominantCore(scene,visual,p,r,{variant:'smbh_02',x:r*.22,y:r*.06,scale:.21,min:9,max:19,duration:3300});
      addSpiralKnots(scene,visual,r*.58,{arms:2,perArm:5,turns:1.15,flat:.72,phase:.10,offset:1,duration:44000});
      const knots2=addSpiralKnots(scene,visual,r*.58,{arms:2,perArm:5,turns:1.10,flat:.70,phase:.90,offset:3,duration:47000,reverse:true});
      knots2.x=r*.05;knots2.y=r*.04;
      if(left&&right){
        const tl=scene.tweens.add({targets:left,x:-r*.17,y:-r*.09,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        const tr=scene.tweens.add({targets:right,x:r*.17,y:r*.10,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        stopOnDestroy(visual,tl);stopOnDestroy(visual,tr);
      }
    }
  }

  function spiralPath(g,r,color,arms=2,turns=1.30,flat=.66,alpha=.54,width=.10){
    for(let arm=0;arm<arms;arm++){
      const start=arm*Math.PI*2/arms;
      g.lineStyle(Math.max(1,r*width),color,alpha).beginPath();
      for(let j=0;j<=14;j++){
        const t=j/14,a=start+t*Math.PI*turns,d=r*(.13+.84*t);
        const x=Math.cos(a)*d,y=Math.sin(a)*d*flat;
        if(!j)g.moveTo(x,y);else g.lineTo(x,y);
      }
      g.strokePath();
    }
  }

  function animatedClusterGalaxy(scene,parent,x,y,r,index,opts={}){
    const c=scene.add.container(x,y),body=scene.add.container(0,0),g=scene.add.graphics();
    const dominant=!!opts.dominant;
    const color=opts.color||((index%4===0)?0xffd9aa:(index%3===0?C.purple:C.cyan));
    const flat=opts.flat??(.48+(index%4)*.09);
    const elliptical=!!opts.elliptical;

    g.fillStyle(color,dominant?.075:.045).fillEllipse(0,0,r*2.05,r*(.90+flat));
    if(elliptical){
      g.fillStyle(0xffe8c7,dominant?.10:.055).fillEllipse(0,0,r*1.62,r*1.10);
      g.lineStyle(Math.max(1,r*.055),color,dominant?.25:.17).strokeEllipse(0,0,r*1.76,r*.98);
    }else{
      spiralPath(g,r*.88,color,2+(index%2),1.18+(index%3)*.13,flat,dominant?.59:.43,dominant?.085:.072);
    }

    // A luminous stellar bulge gives each tiny cluster member a centre without exposing its SMBH.
    g.fillStyle(0xfff0d0,dominant?.78:.62).fillCircle(0,0,Math.max(.7,r*(dominant?.11:.09)));
    body.add(g);c.add(body);

    // Only the dominant cluster galaxy shows a subtle SMBH sprite. At this zoom level even that
    // should be small relative to its host, not the giant icon used at standalone galaxy scale.
    if(dominant){
      const core=sprite(scene,c,opts.coreVariant||'smbh_01',0,0,clamp(r*.17,3.0,6.5),.86);
      if(core)pulse(scene,c,core,.045,3200,.74);
    }

    parent.add(c);
    const spin=scene.tweens.add({
      targets:body,angle:index%2?360:-360,
      duration:(dominant?50000:30000)+(index%7)*1500,repeat:-1,ease:'Linear'
    });
    const drift=scene.tweens.add({
      targets:c,x:x+(index%2?2.0:-2.0),y:y+((index%3)-1)*1.5,
      duration:4600+(index%6)*430,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(parent,spin);stopOnDestroy(parent,drift);
    return c;
  }

  function dimOriginalClusterGlyphs(visual){
    const list=visual.list||[];
    list.forEach((child,i)=>{
      if(child?.type==='Container'&&typeof child.setAlpha==='function')child.setAlpha(.06);
      else if(i>0&&child?.type==='Graphics'&&typeof child.setAlpha==='function')child.setAlpha(.16);
    });
  }

  function hashSeed(seed,i){
    const x=Math.sin((seed*97+i*31.7)*12.9898+78.233)*43758.5453;
    return x-Math.floor(x);
  }

  function clusterPoints(profile,count,seed){
    const pts=[];
    for(let i=0;i<count;i++){
      let x,y;
      const a=i*2.399963+seed*.39;
      const radial=.20+Math.pow(hashSeed(seed,i),.72)*.42;

      if(profile==='bullet'){
        const side=i%2?-1:1;
        const local=.08+hashSeed(seed+5,i)*.24;
        x=side*(.28+local)+Math.cos(a)*.09;
        y=Math.sin(a)*(.15+hashSeed(seed+9,i)*.12);
      }else{
        x=Math.cos(a)*radial;
        y=Math.sin(a)*radial*.72;
        if(profile==='pandora'){
          x+=((i%4)-1.5)*.035;
          y+=(((i*3)%5)-2)*.022;
        }
      }

      const size=.043+hashSeed(seed+13,i)*.028;
      pts.push([x,y,size]);
    }
    return pts;
  }

  function addClusterGalaxySystem(scene,visual,profile,r,config){
    dimOriginalClusterGlyphs(visual);

    const centralR=r*(config.centralScale||.20);
    animatedClusterGalaxy(scene,visual,0,0,centralR,99,{
      dominant:true,
      elliptical:config.elliptical!==false,
      coreVariant:config.centralCore||CORE_BY_PROFILE[profile]||'smbh_01',
      color:config.centralColor||0xffd9aa,
      flat:config.centralFlat??.70
    });

    const field=scene.add.container(0,0);visual.add(field);
    const points=clusterPoints(profile,config.count||12,config.seed||1);
    points.forEach((p,i)=>{
      const depth=.78+hashSeed((config.seed||1)+31,i)*.42;
      const member=animatedClusterGalaxy(scene,field,p[0]*r,p[1]*r,r*p[2]*depth,i,{
        arms:2+(i%2),
        flat:.47+(i%4)*.08,
        elliptical:i%7===0,
        color:i%5===0?0xffd5a0:(i%3===0?C.purple:C.cyan)
      });
      member.setAlpha(.68+depth*.20);
    });

    const sway=scene.tweens.add({
      targets:field,angle:{from:-3.2,to:3.2},duration:7600+(config.seed||0)*410,
      yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(visual,sway);
    return field;
  }

  function clusterSprites(scene,visual,object,r){
    const p=object.phase4NamedProfile;
    if(!p)return;

    if(p==='virgo'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.22,centralCore:'smbh_m87',elliptical:true,count:13,seed:1
      });return;
    }

    if(p==='coma'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.23,centralCore:'smbh_02',elliptical:true,count:16,seed:2
      });return;
    }

    if(p==='bullet'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.18,centralCore:'smbh_01',elliptical:false,centralFlat:.58,count:12,seed:3
      });return;
    }

    if(p==='pandora'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.20,centralCore:'smbh_02',elliptical:true,count:15,seed:4
      });
    }
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    const named=!mystery&&object?.phase4NamedId;
    const scale=named?visualScale(object):1;
    const renderRadius=radius*scale;
    const visual=baseDrawObject.call(this,x,y,renderRadius,object,mystery,glow);
    if(!visual||!named||visual._phase4SpriteCompositeV3)return visual;

    visual._phase4SpriteCompositeV3=true;
    visual.phase4PhysicalDiameterKly=PHYSICAL_DIAMETER_KLY[object.phase4NamedProfile]||null;
    visual.phase4CompressedScale=scale;

    if(object.phase4NamedType==='cluster')clusterSprites(this,visual,object,renderRadius);
    else galaxySprites(this,visual,object,renderRadius);
    return visual;
  };

  window.CometPhase4SpriteCompositeV1=Object.freeze({
    enabled:true,
    version:3,
    galaxyCoreHierarchy:'DOMINANT_SMBH',
    galaxyArmSprites:['pulsar_01','pulsar_02','nebula_01','nebula_02'],
    galaxyArmSpriteScale:'TINY_DENSE_KNOTS',
    blackHolesInGalaxyArms:false,
    clusterMemberStyle:'SMALL_ANIMATED_GALAXY_SWIRLS',
    clusterMemberVisibleSMBH:false,
    clusterCentralGalaxyVisibleSMBH:'SUBTLE_ONLY',
    compressedPhysicalScale:true,
    physicalDiameterKly:{...PHYSICAL_DIAMETER_KLY}
  });
})();