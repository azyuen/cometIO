// Cross-phase visual polish v2.
// - Phase 3: tighter trajectory layout with left-aligned title/end labels and orbital controls aligned above it.
// - Planets: remove legacy Phaser glow discs behind sprite-backed planets and promote clean assets to 64px.
// - Superclusters: render as irregular circular clouds of animated galaxy clusters, not radial SMBH systems.
// - Finale: superclusters vary visually, redundant MERGE LOCKED text is removed, and the new Atom pauses
//   on a final question before the player chooses NEXT?.
// - Collision LAB: +/- orbital controls appear dynamically only from Dwarf Planet upward.
(() => {
  if (typeof GameScene === 'undefined') return;
  const proto = GameScene.prototype;
  const P4 = window.CometPhase4 || {};
  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const SMBH = TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE');
  const DWARF = TIERS.findIndex(t => t.name === 'DWARF PLANET');
  const SUPERCLUSTER = Number(P4.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));

  const baseDrawPrompt = proto.drawPrompt;
  const baseDrawObject = proto.drawObject;
  const baseUpdate = proto.update;
  const baseShowDevLab = proto.showDevLab;
  const baseChooseFinalSuperclusterV3 = proto.chooseFinalSuperclusterV3;
  const baseAbsorbFinalAtom = proto.absorbFinalAtom;
  const baseFinishUniverse = proto.finishUniverse;

  function phase3Active(scene) {
    const tier = Number(scene?.tierIndex);
    const lab = scene?._labSandboxRun === true;
    return PULSAR >= 0 && SMBH >= 0 && tier >= PULSAR && tier <= SMBH && (!scene._devModeActive || lab);
  }

  // ---------- Phase 3 control layout ----------
  function p3AvailableOrbitals(scene) { return Math.max(0, Math.floor(Number(scene?.orbitalCount) || 0)); }
  function p3AssistCount(scene) {
    const available = p3AvailableOrbitals(scene);
    const selected = Math.max(0, Math.floor(Number(scene?._p3OrbitalAssistCount) || 0));
    scene._p3OrbitalAssistCount = Math.min(selected, available);
    return scene._p3OrbitalAssistCount;
  }
  function p3Trajectory(scene) {
    const MAX_T=.92;
    if(!Number.isFinite(Number(scene._p3Trajectory)))scene._p3Trajectory=0;
    return clamp(Number(scene._p3Trajectory),-MAX_T,MAX_T);
  }
  function p3Angular(t){return clamp((t+.92)/1.84,0,1);}

  function addP3OrbitalAssist(scene) {
    const available=p3AvailableOrbitals(scene),selected=p3AssistCount(scene);
    // Left edge = 15, exactly aligned with trajectory panel below.
    const cx=106,cy=scene.Y(617),w=182,h=32;
    const c=scene.add.container(cx,cy),g=scene.add.graphics();
    g.fillStyle(C.panel,.97).fillRoundedRect(-w/2,-h/2,w,h,5);
    g.lineStyle(1.15,selected?C.orange:C.cyan,.78).strokeRoundedRect(-w/2,-h/2,w,h,5);
    const label=scene.add.text(-78,-7,'ORBITAL ASSIST',{fontFamily:FONT,fontSize:'6.2px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(0,.5);
    const count=scene.add.text(0,7,`${selected} / ${available}`,{fontFamily:FONT,fontSize:'8.8px',fontStyle:'bold',color:selected?'#ff9d3d':'#f7fbff'}).setOrigin(.5);
    const minusHit=scene.add.rectangle(-70,7,27,23,0xffffff,.001).setInteractive({useHandCursor:true});
    const plusHit=scene.add.rectangle(70,7,27,23,0xffffff,.001).setInteractive({useHandCursor:true});
    const minus=scene.add.text(-70,7,'−',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected?'#20d9ff':'#526f7b'}).setOrigin(.5);
    const plus=scene.add.text(70,7,'+',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:selected<available?'#20d9ff':'#526f7b'}).setOrigin(.5);
    minusHit.on('pointerdown',()=>{if(p3AssistCount(scene)<=0)return;scene._p3OrbitalAssistCount=p3AssistCount(scene)-1;scene.drawEncounter();});
    plusHit.on('pointerdown',()=>{if(p3AssistCount(scene)>=p3AvailableOrbitals(scene))return;scene._p3OrbitalAssistCount=p3AssistCount(scene)+1;scene.drawEncounter();});
    c.add([g,label,count,minusHit,plusHit,minus,plus]);scene.ui.add(c);
  }

  function addP3Trajectory(scene) {
    const top=scene.Y(644),height=64,left=15,right=405;
    const pg=scene.add.graphics();
    pg.fillStyle(C.panel,.97).fillRoundedRect(left,top,right-left,height,7);
    pg.lineStyle(1.5,C.cyan,.82).strokeRoundedRect(left,top,right-left,height,7);scene.ui.add(pg);

    let t=p3Trajectory(scene),a=p3Angular(t);
    scene.addText(28,scene.Y(650),'TRAJECTORY',7.6,C.cyan,{bold:true});
    scene.addText(28,scene.Y(666),'RADIAL',7.1,C.orange,{bold:true});
    scene.addText(392,scene.Y(666),'TANGENTIAL',7.1,C.green,{ox:1,bold:true});

    // Track begins after RADIAL and ends before TANGENTIAL, rather than running under the words.
    const x0=103,x1=303,width=x1-x0,y=scene.Y(678);
    const track=scene.add.graphics();track.lineStyle(6,0x183248,1).lineBetween(x0,y,x1,y);track.lineStyle(2.5,C.cyan,.72).lineBetween(x0,y,x1,y);scene.ui.add(track);
    const thumb=scene.add.circle(x0+a*width,y,8,C.white,1).setStrokeStyle(2,C.cyan,1);scene.ui.add(thumb);
    const momentum=scene.addText(W/2,scene.Y(688),'',6.55,C.white,{ox:.5,bold:true});

    function paint(value){
      scene._p3Trajectory=clamp(value,-.92,.92);t=p3Trajectory(scene);a=p3Angular(t);thumb.x=x0+a*width;
      const word=a<.34?'LOW':a<.67?'MEDIUM':'HIGH';momentum.setText(`ANGULAR MOMENTUM: ${word}`);
      momentum.setColor?.(a>.66?'#25f29a':a<.34?'#ff9d3d':'#f7fbff');
    }
    paint(t);
    const hit=scene.add.rectangle((x0+x1)/2,y,width+26,32,0xffffff,.001).setInteractive({useHandCursor:true});scene.ui.add(hit);
    let dragging=false;const fromPointer=p=>((clamp(p.x,x0,x1)-x0)/width*2-1)*.92;
    hit.on('pointerdown',p=>{dragging=true;paint(fromPointer(p));});
    hit.on('pointermove',p=>{if(dragging&&p.isDown)paint(fromPointer(p));});
    const finish=p=>{if(!dragging)return;dragging=false;if(p)paint(fromPointer(p));scene.drawEncounter();};
    hit.on('pointerup',finish);hit.on('pointerout',p=>{if(dragging&&!p.isDown)finish(p);});
  }

  proto.drawPrompt=function(...args){
    if(!phase3Active(this))return baseDrawPrompt.apply(this,args);
    addP3OrbitalAssist(this);
    addP3Trajectory(this);
    this.choice(73,this.Y(786),'ABSORB',C.green,'');
    this.choice(210,this.Y(786),'DEFLECT',C.orange,'');
    this.choice(347,this.Y(786),'AVOID',C.blue,'');
  };

  // ---------- Planet sprite cleanup / clean 64px promotion ----------
  const QUARANTINED_64=new Set([
    'rockyPlanet_01','rockyPlanet_02','rockyPlanet_mystery_01',
    'dwarf_ceres','dwarf_eris','planet_saturn','planet_neptune'
  ]);
  function applyImageDiameter(image,diameter){
    if(!image)return;const w=Math.max(1,image.width||image.frame?.realWidth||1),h=Math.max(1,image.height||image.frame?.realHeight||w);
    image.setDisplaySize(diameter,diameter*(h/w));
  }
  function polishPlanetVisual(scene,container,object){
    const def=typeof getCometVisualDefinition==='function'?getCometVisualDefinition(object):null;
    if(!def||!['rockyPlanet','gasPlanet'].includes(def.visualFamily))return container;
    const h=container?.cometVisual;
    // Sprite-backed planets do not need the old procedural orange disc behind their transparent PNG.
    if(h?.effectsBack?.list?.length){
      for(const child of [...h.effectsBack.list]){try{child.destroy();}catch(e){}}
    }
    if(!h?.image||!h.variant)return container;
    const diameter=Number(h.baseDisplayDiameterPx)||Math.max(h.image.displayWidth||1,1);
    if(diameter<=48||QUARANTINED_64.has(h.variant))return container;
    const entry=COMET_SPRITE_ASSETS?.[h.variant];
    if(!entry?.lods?.includes(64))return container;
    const key=cometSpriteTextureKey(h.variant,64);
    if(!scene.textures?.exists?.(key))return container;
    if(h.image.texture?.key!==key){
      h.image.setTexture(key);
      const tex=scene.textures.get?.(key);if(tex?.setFilter&&Phaser.Textures?.FilterMode)tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    h.lod=64;applyImageDiameter(h.image,diameter);return container;
  }

  // ---------- Supercluster renderer ----------
  function hash(s=''){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function rnd(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x);}
  const SC_COLORS=[C.cyan,C.purple,C.orange,C.blue,C.green];

  function galaxyGlyph(g,x,y,r,color,variant,alpha=.75){
    const arms=2+(variant%3),flat=[.46,.62,.80][variant%3],turns=1.20+(variant%4)*.12;
    g.fillStyle(color,.035*alpha).fillEllipse(x,y,r*2.2,r*(.9+flat));
    for(let arm=0;arm<arms;arm++){
      const start=arm*Math.PI*2/arms;g.lineStyle(Math.max(1,r*.10),color,.48*alpha).beginPath();
      for(let j=0;j<=9;j++){const t=j/9,a=start+t*Math.PI*turns,d=r*(.14+.84*t),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*flat;if(!j)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();
    }
    g.fillStyle(0xfff0c4,.72*alpha).fillCircle(x,y,Math.max(1,r*.13));
  }

  function clusterNode(scene,parent,x,y,r,seed,color,index){
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(color,.018).fillCircle(0,0,r*1.08);
    const n=5+(seed%3);
    for(let i=0;i<n;i++){
      const a=rnd(seed+i*31)*Math.PI*2,rad=(.12+Math.sqrt(rnd(seed+i*47+7))*.66)*r;
      const gx=Math.cos(a)*rad,gy=Math.sin(a)*rad;
      galaxyGlyph(g,gx,gy,r*(i===0?.18:.13),i%3?color:SC_COLORS[(index+i+1)%SC_COLORS.length],(seed+i)%5,.86);
    }
    c.add(g);parent.add(c);
    const dx=(rnd(seed+101)-.5)*5,dy=(rnd(seed+117)-.5)*4;
    const tw=scene.tweens.add({targets:c,x:x+dx,y:y+dy,angle:(rnd(seed+151)-.5)*5,duration:5200+(seed%7)*410,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    c.once('destroy',()=>{try{tw.stop();}catch(e){}});return c;
  }

  function superclusterVisual(scene,x,y,radius,object,glow=false){
    const name=String(object?.realName||object?.name||'SUPERCLUSTER');
    const seed=hash(`${name}|${Math.round(Number(object?.massKg)||0)}|${scene.phase4Members?.length||0}`);
    const root=scene.add.container(x,y),field=scene.add.container(0,0),bg=scene.add.graphics(),links=scene.add.graphics();
    const baseColor=object?.color||SC_COLORS[seed%SC_COLORS.length];
    if(glow)bg.fillStyle(baseColor,.018).fillCircle(0,0,radius*1.16);
    // Circular envelope hints at the later Universe/Atom echo, but the contents remain an irregular cosmic web.
    bg.fillStyle(baseColor,.012).fillCircle(0,0,radius*.96);
    bg.lineStyle(Math.max(1,radius*.012),baseColor,.20).strokeCircle(0,0,radius*.91);
    bg.lineStyle(1,SC_COLORS[(seed+1)%SC_COLORS.length],.09).strokeCircle(0,0,radius*.72);
    root.add([bg,links,field]);

    const count=7+(seed%4),pts=[];
    for(let i=0;i<count;i++){
      const a=rnd(seed+i*83+5)*Math.PI*2;
      const radial=(i===0?.10:.18+Math.sqrt(rnd(seed+i*97+11))*.58)*radius;
      pts.push({x:Math.cos(a)*radial,y:Math.sin(a)*radial,r:radius*(.145+rnd(seed+i*109+17)*.035)});
    }
    // Sparse nearest-neighbour filaments: cluster-like, not radial spokes from a central SMBH.
    const used=new Set();
    pts.forEach((p,i)=>{
      let best=-1,bd=Infinity;pts.forEach((q,j)=>{if(i===j)return;const d=(p.x-q.x)**2+(p.y-q.y)**2;if(d<bd){bd=d;best=j;}});
      if(best<0)return;const key=i<best?`${i}:${best}`:`${best}:${i}`;if(used.has(key))return;used.add(key);
      const q=pts[best];links.lineStyle(Math.max(1,radius*.011),SC_COLORS[(seed+i)%SC_COLORS.length],.13).lineBetween(p.x,p.y,q.x,q.y);
    });
    pts.forEach((p,i)=>clusterNode(scene,field,p.x,p.y,p.r,seed+i*173,SC_COLORS[(seed+i)%SC_COLORS.length],i));
    scene.ui.add(root);
    const drift=scene.tweens.add({targets:field,angle:(seed%2?3.5:-3.5),duration:10500+(seed%5)*900,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    root.once('destroy',()=>{try{drift.stop();}catch(e){}});
    root.cometVisual={scene,container:root,object,mystery:false,variant:`procedural-supercluster-${seed%997}`,lod:null,image:null,baseDisplayDiameterPx:radius*2,fallback:false};
    root.cometCollisionFamily='supercluster';
    return root;
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    if(!mystery&&SUPERCLUSTER>=0&&(object?.kind==='supercluster'||(Number(object?.tier)===SUPERCLUSTER&&String(object?.name||'').includes('SUPERCLUSTER')))){
      return superclusterVisual(this,x,y,radius,object,glow);
    }
    const v=baseDrawObject.call(this,x,y,radius,object,mystery,glow);
    return polishPlanetVisual(this,v,object);
  };

  proto.update=function(...args){
    const result=typeof baseUpdate==='function'?baseUpdate.apply(this,args):undefined;
    // The older renderer deliberately forces all generic gas planets to 32px. Re-promote only clean
    // 64px variants after its LOD pass; quarantined corrupt exports remain safely on 32px.
    if(this._cometVisualHandles){
      for(const h of this._cometVisualHandles){if(h?.container?.active)polishPlanetVisual(this,h.container,h.object);}
    }
    return result;
  };

  // ---------- Finale cleanup ----------
  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  if(typeof baseChooseFinalSuperclusterV3==='function'){
    proto.chooseFinalSuperclusterV3=function(...args){
      const result=baseChooseFinalSuperclusterV3.apply(this,args);
      walk(this.ui,node=>{if(typeof node?.text==='string'&&/MERGE LOCKED/i.test(node.text))node.setText?.('');});
      return result;
    };
    proto.chooseFinalSupercluster=function(){return this.chooseFinalSuperclusterV3();};
    proto.mergeUniversePiece=function(){return this.chooseFinalSuperclusterV3();};
  }

  function atomObject(){
    const t=TIERS[0];return {name:t.name,realName:t.examples?.[0]||t.name,tier:0,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,hint:t.hint};
  }
  function questionBackdrop(scene){
    const bg=scene.add.graphics();bg.fillStyle(C.bg,1).fillRect(-20,-20,W+40,H+40);
    for(let i=0;i<86;i++){const x=Phaser.Math.Between(7,W-7),y=Phaser.Math.Between(scene.Y(6),H-10),s=Phaser.Math.RND.pick([1,1,1,2]);bg.fillStyle(i%19===0?C.purple:i%13===0?C.cyan:C.star,Phaser.Math.RND.pick([.16,.24,.34,.50])).fillRect(x,y,s,s);}scene.ui.add(bg);
  }
  function showBeyondQuestion(scene){
    if(scene._beyondQuestionShown)return;
    scene._beyondQuestionShown=true;scene.tweens.killAll();scene.clearUI();scene.state='BEYOND_OBSERVABLE_QUESTION';questionBackdrop(scene);
    scene.addText(W/2,scene.Y(92),'ONE NEW ATOM',14,C.green,{ox:.5,bold:true});
    const atom=scene.drawObject(W/2,scene.Y(385),48,atomObject(),false,true);atom.setScale(.72).setAlpha(.18);
    scene.tweens.add({targets:atom,scale:1,alpha:1,duration:620,ease:'Back.out'});
    scene.addText(W/2,scene.Y(530),"WHAT'S BEYOND THE OBSERVABLE UNIVERSE?",15,C.white,{ox:.5,bold:true,width:380,align:'center'});
    scene.addText(W/2,scene.Y(577),'THE SMALLEST SCALE LOOKS FAMILIAR AGAIN.',8,C.muted,{ox:.5,bold:true});
    scene.wideButton(W/2,scene.Y(700),270,58,'NEXT?',C.cyan,()=>{
      if(scene.state!=='BEYOND_OBSERVABLE_QUESTION')return;
      scene._awaitBeyondQuestion=false;scene._beyondQuestionShown=false;
      return baseFinishUniverse.call(scene);
    });
    if(scene._labSandboxRun&&typeof scene.returnFromLabPhase==='function')scene.miniButton(49,scene.Y(18),76,24,'LAB',C.purple,()=>scene.returnFromLabPhase());
  }
  if(typeof baseAbsorbFinalAtom==='function'){
    proto.absorbFinalAtom=function(...args){
      this._awaitBeyondQuestion=true;this._beyondQuestionShown=false;
      return baseAbsorbFinalAtom.apply(this,args);
    };
  }
  if(typeof baseFinishUniverse==='function'){
    proto.finishUniverse=function(...args){
      if(this._awaitBeyondQuestion)return showBeyondQuestion(this);
      return baseFinishUniverse.apply(this,args);
    };
  }

  // ---------- Collision LAB orbital-control visibility ----------
  function labOrbitalAllowed(object){return Number(object?.tier)>=DWARF;}
  function removeLabOrbitalButtons(scene){
    for(const child of [...(scene.ui?.list||[])]){
      if(!Array.isArray(child?.list))continue;
      const label=child.list.find(item=>typeof item?.text==='string'&&(item.text==='+'||item.text==='−'));
      if(!label)continue;
      const nearX=[70,140,280,350].some(x=>Math.abs(Number(child.x)-x)<10);
      const nearY=Math.abs(Number(child.y)-scene.Y(494))<35||Math.abs(Number(child.y)-scene.Y(484))<35;
      if(nearX&&nearY){try{scene.ui.remove(child,false);}catch(e){}try{child.destroy(true);}catch(e){}}
    }
  }
  function installLabOrbitalButtons(scene){
    if(scene.state!=='DEV_LAB')return;removeLabOrbitalButtons(scene);
    const y=scene.Y(494),max=6,refresh=()=>scene._labRefreshPreview?.();
    if(labOrbitalAllowed(scene._devObjectA)){
      scene.miniButton(70,y,38,28,'−',C.cyan,()=>{scene._labOrbitalsA=Math.max(0,(Number(scene._labOrbitalsA)||0)-1);refresh();});
      scene.miniButton(140,y,38,28,'+',C.cyan,()=>{scene._labOrbitalsA=Math.min(max,(Number(scene._labOrbitalsA)||0)+1);refresh();});
    }
    if(labOrbitalAllowed(scene._devObjectB)){
      scene.miniButton(280,y,38,28,'−',C.cyan,()=>{scene._labOrbitalsB=Math.max(0,(Number(scene._labOrbitalsB)||0)-1);refresh();});
      scene.miniButton(350,y,38,28,'+',C.cyan,()=>{scene._labOrbitalsB=Math.min(max,(Number(scene._labOrbitalsB)||0)+1);refresh();});
    }
  }
  if(typeof baseShowDevLab==='function'){
    proto.showDevLab=function(...args){
      const result=baseShowDevLab.apply(this,args);installLabOrbitalButtons(this);
      const refresh=()=>setTimeout(()=>installLabOrbitalButtons(this),0);
      this._devSelectA?.addEventListener?.('change',refresh);this._devSelectB?.addEventListener?.('change',refresh);
      return result;
    };
  }

  window.CometCosmicVisualPolishV2=Object.freeze({
    enabled:true,phase3Padding:true,phase3TrackBetweenLabels:true,
    planetaryLegacyGlowRemoved:true,clean64Promotion:true,quarantined64:[...QUARANTINED_64],
    superclusterModel:'IRREGULAR CLUSTERS INSIDE CIRCULAR COSMIC WEB',finaleSuperclustersVary:true,
    mergeLockedTextRemoved:true,beyondObservableQuestion:true,labOrbitalControlsDynamic:true
  });
})();
