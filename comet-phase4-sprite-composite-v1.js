// Phase 4 sprite-composite enhancement v2.
// Named galaxies keep their procedural identity but use a dominant real SMBH core and only tiny
// pulsar/nebula sprites in their arms. Named clusters use a dominant animated central galaxy with
// an SMBH core plus animated member galaxies. Apparent size follows compressed representative
// physical extent: ordering is meaningful, but the scale is deliberately compressed for playability.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4NamedStructuresV1) return;

  const proto=GameScene.prototype;
  const baseDrawObject=proto.drawObject;

  const ARM_VARIANTS=Object.freeze([
    'pulsar_01','nebula_01','pulsar_02','nebula_02'
  ]);

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

  // Representative visible/structural diameters, in thousands of light years (kly).
  // Cluster extents are millions of light-years, hence the much larger numbers.
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
    const profile=object?.phase4NamedProfile;
    const d=PHYSICAL_DIAMETER_KLY[profile];
    if(!d)return 1;
    if(object?.phase4NamedType==='cluster'){
      // Preserve real ordering but compress ~100–200x physical galaxy/cluster differences into
      // a playable ~1.3–1.6x visual tier difference.
      return clamp(1.45*Math.pow(d/15000,.22),1.28,1.62);
    }
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

  function pulse(scene,parent,target,scale=.08,duration=2700,alphaLow=.82){
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

  function addDominantCore(scene,parent,profile,radius,opts={}){
    const variant=opts.variant||CORE_BY_PROFILE[profile]||'smbh_01';
    const size=clamp(radius*(opts.scale||.30),opts.min||14,opts.max||32);
    const image=sprite(scene,parent,variant,opts.x||0,opts.y||0,size,opts.alpha??.98,opts.angle||0);
    if(image)pulse(scene,parent,image,opts.pulseScale??.07,opts.duration||3000,opts.alphaLow??.84);
    return image;
  }

  function addTinyArmField(scene,parent,radius,points,offset=0,duration=39000){
    const field=scene.add.container(0,0);parent.add(field);
    points.forEach((p,i)=>{
      const variant=p.variant||ARM_VARIANTS[(i+offset)%ARM_VARIANTS.length];
      // Always much smaller than the SMBH core.
      const size=clamp(radius*(p.size||.042),3,6.5);
      const img=sprite(scene,field,variant,p.x*radius,p.y*radius,size,p.alpha??.80,p.angle||0);
      if(img&&p.pulse!==false)pulse(scene,parent,img,.08,2100+i*190,.62);
    });
    const tw=scene.tweens.add({targets:field,angle:points.some(p=>p.reverse)?-360:360,duration,repeat:-1,ease:'Linear'});
    stopOnDestroy(parent,tw);return field;
  }

  function galaxySprites(scene,visual,object,r){
    const p=object.phase4NamedProfile;
    if(!p)return;

    if(p==='milkyway'){
      addDominantCore(scene,visual,p,r,{scale:.31,max:29});
      addTinyArmField(scene,visual,r,[
        {x:-.52,y:-.12,size:.042},{x:.42,y:.21,size:.045},{x:.17,y:-.43,size:.038},{x:-.18,y:.39,size:.040}
      ],0,41000);return;
    }

    if(p==='andromeda'){
      addDominantCore(scene,visual,p,r,{scale:.29,max:28});
      addTinyArmField(scene,visual,r,[
        {x:-.60,y:.10,size:.038},{x:.52,y:-.08,size:.042},{x:.28,y:.24,size:.035}
      ],1,52000);return;
    }

    if(p==='whirlpool'){
      addDominantCore(scene,visual,p,r,{scale:.31,max:29});
      // The companion is another galaxy, so its own SMBH is appropriate; the spiral arms themselves
      // still contain only tiny pulsar/nebula sprites.
      const companion=addDominantCore(scene,visual,p,r,{
        variant:'smbh_01',x:r*.88,y:-r*.25,scale:.105,min:6,max:11,pulseScale:.06,duration:3600
      });
      if(companion){
        const tw=scene.tweens.add({targets:companion,x:r*.82,y:-r*.31,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
        stopOnDestroy(visual,tw);
      }
      addTinyArmField(scene,visual,r,[
        {x:-.38,y:-.18,size:.038},{x:.22,y:.44,size:.040},{x:-.15,y:.50,size:.035}
      ],2,30000);return;
    }

    if(p==='sombrero'){
      addDominantCore(scene,visual,p,r,{scale:.30,max:28,alpha:.96});
      addTinyArmField(scene,visual,r,[
        {x:-.55,y:-.015,size:.033,pulse:false,variant:'pulsar_01'},
        {x:.49,y:.018,size:.033,pulse:false,variant:'nebula_01'}
      ],0,62000);return;
    }

    if(p==='cartwheel'){
      addDominantCore(scene,visual,p,r,{scale:.29,max:28});
      const pts=[];
      for(let i=0;i<8;i++){
        const a=i*Math.PI*2/8;
        pts.push({
          x:Math.cos(a)*.79,y:Math.sin(a)*.79,
          size:i%3===0?.040:.032,
          variant:i%2===0?'pulsar_01':'nebula_02'
        });
      }
      addTinyArmField(scene,visual,r,pts,0,34000);return;
    }

    if(p==='antennae'){
      // Antennae is an interacting pair, so each merging galaxy gets a dominant SMBH core.
      const left=addDominantCore(scene,visual,p,r,{variant:'smbh_01',x:-r*.22,y:-r*.05,scale:.22,min:10,max:21,duration:3000});
      const right=addDominantCore(scene,visual,p,r,{variant:'smbh_02',x:r*.22,y:r*.06,scale:.22,min:10,max:21,duration:3300});
      addTinyArmField(scene,visual,r,[
        {x:-.08,y:.02,size:.040,variant:'nebula_01'},
        {x:.08,y:-.02,size:.036,variant:'pulsar_02'},
        {x:-.52,y:-.22,size:.030,variant:'pulsar_01'},
        {x:.50,y:.24,size:.030,variant:'nebula_02'}
      ],1,46000);
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

  function animatedGalaxy(scene,parent,x,y,r,index,opts={}){
    const c=scene.add.container(x,y),body=scene.add.container(0,0),g=scene.add.graphics();
    const color=opts.color||((index%3===0)?C.purple:C.cyan);
    const dominant=!!opts.dominant;
    const flat=opts.flat??(.52+(index%3)*.09);
    const arms=opts.elliptical?0:(opts.arms||2+(index%2));

    g.fillStyle(color,dominant?.085:.055).fillEllipse(0,0,r*2.05,r*(.92+flat));
    if(opts.elliptical){
      g.fillStyle(0xffe8c7,.10).fillEllipse(0,0,r*1.55,r*1.15);
      g.lineStyle(Math.max(1,r*.06),color,.24).strokeEllipse(0,0,r*1.72,r*.98);
    }else{
      spiralPath(g,r*.86,color,arms,opts.turns||1.28,flat,dominant?.63:.48,dominant?.10:.085);
    }
    body.add(g);c.add(body);

    const coreVariant=opts.coreVariant||((index%2)?'smbh_01':'smbh_02');
    const bhSize=clamp(r*(dominant?.36:.27),dominant?7:4,dominant?18:9);
    const bh=sprite(scene,c,coreVariant,0,0,bhSize,dominant?.98:.90);
    if(bh)pulse(scene,c,bh,.06,2600+index*130,.78);

    // A member galaxy may contain one tiny bright star-forming accent, never another arm black hole.
    if(!dominant&&index%3===0){
      sprite(scene,c,index%2?'pulsar_01':'nebula_01',r*.40,-r*.10,clamp(r*.15,2.5,4.2),.68);
    }

    parent.add(c);
    const spin=scene.tweens.add({
      targets:body,angle:index%2?360:-360,
      duration:(dominant?43000:29000)+index*1600,repeat:-1,ease:'Linear'
    });
    const drift=scene.tweens.add({
      targets:c,x:x+(index%2?2.8:-2.8),y:y+((index%3)-1)*2.0,
      duration:4300+(index%5)*470,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });
    stopOnDestroy(parent,spin);stopOnDestroy(parent,drift);
    return c;
  }

  function dimOriginalClusterGlyphs(visual){
    // Keep the original named cluster haze/filaments as atmospheric structure, but push its old
    // procedural mini-galaxy cloud into the background so the new animated galaxies read clearly.
    for(const child of visual.list||[]){
      if(child?.type==='Container'&&typeof child.setAlpha==='function')child.setAlpha(.20);
    }
  }

  function addClusterGalaxySystem(scene,visual,profile,r,config){
    dimOriginalClusterGlyphs(visual);

    const centralR=r*(config.centralScale||.26);
    animatedGalaxy(scene,visual,0,0,centralR,99,{
      dominant:true,
      elliptical:config.elliptical!==false,
      coreVariant:config.centralCore||CORE_BY_PROFILE[profile]||'smbh_01',
      color:config.centralColor||0xffd9aa,
      flat:config.centralFlat??.72
    });

    const field=scene.add.container(0,0);visual.add(field);
    const points=config.points||[];
    points.forEach((p,i)=>{
      animatedGalaxy(scene,field,p[0]*r,p[1]*r,r*(p[2]||.095),i,{
        arms:2+(i%2),
        turns:1.18+(i%3)*.12,
        flat:.50+(i%3)*.11,
        coreVariant:i%2?'smbh_01':'smbh_02',
        color:i%3===0?C.purple:C.cyan
      });
    });
    const sway=scene.tweens.add({
      targets:field,angle:{from:-4,to:4},duration:7000+(config.seed||0)*450,
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
        centralScale:.29,centralCore:'smbh_m87',elliptical:true,seed:1,
        points:[
          [-.45,-.19,.105],[.35,-.31,.098],[.49,.18,.090],[-.28,.41,.096],
          [.08,.50,.082],[-.12,-.53,.088],[.55,-.08,.075]
        ]
      });return;
    }

    if(p==='coma'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.31,centralCore:'smbh_02',elliptical:true,seed:2,
        points:[
          [-.48,-.24,.105],[.36,-.37,.102],[.51,.16,.096],[-.33,.38,.100],
          [.20,.45,.090],[-.08,-.56,.088],[.57,-.08,.082],[-.53,.12,.086],
          [.42,.36,.075]
        ]
      });return;
    }

    if(p==='bullet'){
      // Preserve the two-lobed collision signature, but still give the overall cluster a dominant
      // central galaxy plus animated galaxies in both lobes.
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.24,centralCore:'smbh_01',elliptical:false,centralFlat:.58,seed:3,
        points:[
          [-.52,-.13,.100],[-.39,.18,.086],[-.25,-.28,.080],
          [.51,.12,.098],[.38,-.18,.087],[.25,.29,.078]
        ]
      });return;
    }

    if(p==='pandora'){
      addClusterGalaxySystem(scene,visual,p,r,{
        centralScale:.27,centralCore:'smbh_02',elliptical:true,seed:4,
        points:[
          [-.47,-.28,.092],[.35,-.36,.087],[.48,.22,.094],[-.35,.39,.089],
          [.16,.49,.078],[-.08,-.55,.081],[.55,-.04,.073],[-.52,.11,.077]
        ]
      });
    }
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    const named=!mystery&&object?.phase4NamedId;
    const scale=named?visualScale(object):1;
    const renderRadius=radius*scale;
    const visual=baseDrawObject.call(this,x,y,renderRadius,object,mystery,glow);
    if(!visual||!named||visual._phase4SpriteCompositeV2)return visual;

    visual._phase4SpriteCompositeV2=true;
    visual.phase4PhysicalDiameterKly=PHYSICAL_DIAMETER_KLY[object.phase4NamedProfile]||null;
    visual.phase4CompressedScale=scale;

    if(object.phase4NamedType==='cluster')clusterSprites(this,visual,object,renderRadius);
    else galaxySprites(this,visual,object,renderRadius);
    return visual;
  };

  window.CometPhase4SpriteCompositeV1=Object.freeze({
    enabled:true,
    version:2,
    galaxyCoreHierarchy:'DOMINANT_SMBH',
    galaxyArmSprites:['pulsar_01','pulsar_02','nebula_01','nebula_02'],
    blackHolesInGalaxyArms:false,
    clusters:'DOMINANT_CENTRAL_GALAXY_PLUS_ANIMATED_MEMBER_GALAXIES',
    compressedPhysicalScale:true,
    physicalDiameterKly:{...PHYSICAL_DIAMETER_KLY}
  });
})();