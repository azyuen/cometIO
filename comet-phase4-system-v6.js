// Phase 4 v6: cosmetic polish + five-supercluster animated finale.
// - AVOID is a near-miss flyby: the player's system passes the encountered object/system.
// - LAB tab labels use PHASE 2/3/4 instead of PHS2/3/4.
// - SYSTEM MASS is displayed as a physical solar-mass measurement, while tier progress remains the bar.
// - Phase 4 completion art uses composed Phaser galaxy/cluster/supercluster visuals.
// - The player's own animated supercluster is finale piece #1, then merges with FOUR others (5 total).
(() => {
  if (!window.CometPhase4SystemV5 || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = P4.galaxyTier;
  const CLUSTER = P4.clusterTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const SOLAR_MASS_KG = 1.98847e30;
  const V6 = 6;

  const baseAnimate = proto.animate;
  const baseDrawHud = proto.drawHud;
  const baseDrawObject = proto.drawObject;
  const baseShowDevLab = proto.showDevLab;
  const baseShowLabExperiment = proto.showLabExperiment;
  const baseShowLabPhaseComplete = proto.showLabPhaseComplete;
  const baseShowPhaseCompleteCard = proto.showPhaseCompleteCard;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;

  function activePhase4(scene) {
    return !scene._devModeActive && scene.tierIndex >= GALAXY && scene.tierIndex < SUPERCLUSTER;
  }

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function systemMassKg(scene) {
    const playerMass = Number(scene.player?.massKg) || Number(TIERS[scene.tierIndex]?.m) || 0;
    return Math.max(playerMass, 1);
  }

  function compactSolarMass(kg) {
    const m = Math.max(0, Number(kg) || 0) / SOLAR_MASS_KG;
    if (m >= 1e15) return `${(m / 1e15).toFixed(m >= 1e16 ? 0 : 1)}Q M☉`;
    if (m >= 1e12) return `${(m / 1e12).toFixed(m >= 1e13 ? 0 : 1)}T M☉`;
    if (m >= 1e9) return `${(m / 1e9).toFixed(m >= 1e10 ? 0 : 1)}B M☉`;
    if (m >= 1e6) return `${(m / 1e6).toFixed(m >= 1e7 ? 0 : 1)}M M☉`;
    if (m >= 1e3) return `${(m / 1e3).toFixed(1)}K M☉`;
    return `${m.toFixed(m >= 10 ? 0 : 1)} M☉`;
  }

  proto.drawHud = function(controls = false) {
    const result = baseDrawHud.call(this, controls);
    if (!activePhase4(this)) return result;

    let replaced = false;
    walk(this.ui, child => {
      if (replaced || typeof child?.text !== 'string' || typeof child.setText !== 'function') return;
      if (/^\d+%$/.test(child.text.trim())) {
        child.setText(compactSolarMass(systemMassKg(this)));
        child.setFontSize?.('7.3px');
        replaced = true;
      }
    });
    return result;
  };

  function memberObject(member) {
    return {
      name:member.name, realName:member.realName || member.name, tier:member.tier,
      radiusM:member.radiusM, massKg:member.massKg, speedMS:member.speedMS,
      kind:member.kind, color:member.color, solid:false,
      identityId:member.identityId, namedSpriteBase:member.namedSpriteBase,
      scienceClass:member.scienceClass, identityStatus:member.identityStatus,
      galaxyProfile:member.galaxyProfile, clusterProfile:member.clusterProfile
    };
  }

  function visualForMember(scene, member, x, y, radius = 7) {
    if (!member) return null;
    return baseDrawObject.call(scene, x, y, radius, memberObject(member), false, false);
  }

  function strippedOnAvoid(scene, p, o) {
    const outgoing = Array.isArray(scene.pending?.transferOutMembers) ? scene.pending.transferOutMembers : [];
    if (!outgoing.length) return;
    const member = outgoing[0];
    const v = visualForMember(scene, member, p.x + 16, p.y + 4, member.tier >= GALAXY ? 9 : 6.5);
    if (!v) return;
    const sx=v.x, sy=v.y, tx=o.x, ty=o.y, cx=(sx+tx)/2+24, cy=(sy+ty)/2-34;
    scene.tweens.addCounter({from:0,to:1,duration:530,ease:'Sine.inOut',onUpdate:tw=>{
      const t=tw.getValue(),u=1-t;
      v.x=u*u*sx+2*u*t*cx+t*t*tx;
      v.y=u*u*sy+2*u*t*cy+t*t*ty;
      v.setScale(1-.58*t);
    },onComplete:()=>v.destroy(true)});
  }

  function animateAvoidFlyby(scene, p, o) {
    scene.tweens.killTweensOf(p); scene.tweens.killTweensOf(o);
    const sx=p.x, sy=p.y, ox=o.x, oy=o.y;
    // The encountered body/system remains the anchor. The player was already on an intercept course,
    // so AVOID bends that trajectory into a close pass rather than making both objects recoil apart.
    scene.tweens.add({targets:o,scale:1.035,duration:330,yoyo:true,ease:'Sine.inOut'});
    scene.tweens.addCounter({from:0,to:1,duration:1250,ease:'Sine.inOut',onUpdate:tw=>{
      const t=tw.getValue(),u=1-t;
      const c1x=ox-96,c1y=oy-92,c2x=ox+48,c2y=oy-104,ex=W+52,ey=oy-74;
      p.x=u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex;
      p.y=u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey;
      const near=Math.sin(Math.PI*t);
      p.setScale(1-.08*near);
    }});
    if (scene.pending?.success === false) scene.time.delayedCall(620,()=>strippedOnAvoid(scene,p,o));
    scene.time.delayedCall(1420,()=>scene.resolve());
  }

  proto.animate = function(choice,p,o,pr,or) {
    if (activePhase4(this) && choice === 'AVOID') return animateAvoidFlyby(this,p,o);
    return baseAnimate.call(this,choice,p,o,pr,or);
  };

  function renamePhaseLabels(scene) {
    const map = new Map([['PHS2','PHASE 2'],['PHS3','PHASE 3'],['PHS4','PHASE 4']]);
    walk(scene.ui, child => {
      if (typeof child?.text !== 'string' || typeof child.setText !== 'function') return;
      if (map.has(child.text)) {
        child.setText(map.get(child.text));
        child.setFontSize?.('6.8px');
        return;
      }
      const next=child.text.replace(/\bPHS([234])\b/g,'PHASE $1');
      if(next!==child.text) child.setText(next);
    });
  }

  proto.showDevLab = function() {
    const result=baseShowDevLab.call(this);renamePhaseLabels(this);return result;
  };
  if (typeof baseShowLabExperiment === 'function') {
    proto.showLabExperiment = function() { const result=baseShowLabExperiment.call(this);renamePhaseLabels(this);return result; };
  }
  if (typeof baseShowLabPhaseComplete === 'function') {
    proto.showLabPhaseComplete = function() { const result=baseShowLabPhaseComplete.call(this);renamePhaseLabels(this);return result; };
  }

  function addStars(scene) {
    const g=scene.add.graphics();g.fillStyle(C.bg,1).fillRect(-20,-20,W+40,H+40);
    for(let i=0;i<92;i++){
      const x=Phaser.Math.Between(8,W-8),y=Phaser.Math.Between(scene.Y(6),H-10),size=Phaser.Math.RND.pick([1,1,1,2]);
      g.fillStyle(i%19===0?C.purple:i%13===0?C.cyan:C.star,Phaser.Math.RND.pick([.18,.28,.40,.58])).fillRect(x,y,size,size);
    }
    scene.ui.addAt(g,0);return g;
  }

  function spiralGalaxy(scene,x,y,radius,color=C.cyan,parent=null,profile=0) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    const arms=2+(profile%3),flat=[.46,.62,.78][profile%3],turns=1.30+(profile%2)*.24;
    g.fillStyle(color,.06).fillEllipse(0,0,radius*2.2,radius*(.95+flat));
    for(let arm=0;arm<arms;arm++){
      const start=arm*Math.PI*2/arms;
      g.lineStyle(Math.max(1,radius*.09),color,.64).beginPath();
      for(let i=0;i<=18;i++){const t=i/18,a=start+t*Math.PI*turns,d=radius*(.12+.87*t),px=Math.cos(a)*d,py=Math.sin(a)*d*flat;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();
    }
    g.fillStyle(0xfff0c4,.92).fillCircle(0,0,Math.max(1.5,radius*.13));c.add(g);
    if(parent)parent.add(c);else scene.ui.add(c);
    const tw=scene.tweens.add({targets:c,angle:profile%2?360:-360,duration:26000+profile*2400,repeat:-1,ease:'Linear'});
    c.once('destroy',()=>{try{tw.stop();}catch(e){}});return c;
  }

  function galaxyCluster(scene,x,y,radius,color=C.cyan,parent=null,variant=0) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(color,.025).fillCircle(0,0,radius*1.05);c.add(g);
    const pts=[[-.44,-.22],[.32,-.38],[.48,.20],[-.24,.44],[.03,.02],[-.06,-.56],[.10,.58]];
    pts.forEach((p,i)=>spiralGalaxy(scene,p[0]*radius,p[1]*radius,radius*(i===4?.16:.115),i%3?color:C.purple,c,(variant+i)%4));
    if(parent)parent.add(c);else scene.ui.add(c);
    const tw=scene.tweens.add({targets:c,angle:variant%2?8:-8,duration:6200,yoyo:true,repeat:-1,ease:'Sine.inOut'});c.once('destroy',()=>{try{tw.stop();}catch(e){}});return c;
  }

  function superclusterPiece(scene,x,y,index,parent=null,scale=1,isPlayer=false) {
    const c=scene.add.container(x,y).setScale(scale),field=scene.add.container(0,0),links=scene.add.graphics();c.add([links,field]);
    const color=isPlayer?C.green:(index%2?C.cyan:C.purple);
    const pts=[[-.58,-.30],[-.20,-.54],[.30,-.36],[.56,.08],[.23,.49],[-.32,.43],[0,.02]];
    const edges=[[0,1],[1,2],[2,3],[3,4],[4,6],[6,5],[5,0],[1,6],[2,6]];
    edges.forEach(([a,b],i)=>links.lineStyle(1.5,i%2?C.cyan:C.purple,isPlayer?.42:.30).lineBetween(pts[a][0]*42,pts[a][1]*42,pts[b][0]*42,pts[b][1]*42));
    const richness=isPlayer?Math.min(7,Math.max(5,Math.ceil((scene.phase4Members?.length||8)/2))):5;
    pts.slice(0,richness).forEach((p,i)=>galaxyCluster(scene,p[0]*42,p[1]*42,i===6?13:10,color,field,(index+i)%4));
    if(isPlayer){const halo=scene.add.graphics();halo.lineStyle(1.5,C.green,.48).strokeCircle(0,0,35);c.add(halo);}
    if(parent)parent.add(c);else scene.ui.add(c);
    const drift=scene.tweens.add({targets:field,angle:index%2?6:-6,duration:7200+index*700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    c.once('destroy',()=>{try{drift.stop();}catch(e){}});return c;
  }

  function universeGlyph(scene,x,y,radius,parent=null) {
    const c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(0x071225,.92).fillCircle(0,0,radius);g.lineStyle(2,C.cyan,.52).strokeCircle(0,0,radius);g.lineStyle(1,C.purple,.42).strokeCircle(0,0,radius*.84);c.add(g);
    const pts=[[-.32,-.22],[.30,-.30],[.33,.25],[-.27,.29],[0,.02]];
    pts.forEach((p,i)=>{const sg=superclusterPiece(scene,p[0]*radius,p[1]*radius,i,c,.20+(i===4?.04:0),i===4);sg.setAlpha(.78);});
    if(parent)parent.add(c);else scene.ui.add(c);return c;
  }

  function cardButton(scene,label,config) {
    const c=scene.add.container(W/2,scene.Y(754)),g=scene.add.graphics(),w=344,h=58;
    g.fillStyle(C.panel,.96).fillRoundedRect(-w/2,-h/2,w,h,7);g.lineStyle(2,C.cyan,.95).strokeRoundedRect(-w/2,-h/2,w,h,7);
    const t=scene.add.text(0,0,label,{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);
    const hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',()=>scene.continueFromPhaseCard(config));c.add([g,t,hit]);scene.ui.add(c);
  }

  function drawPhase4CompletionCard(scene,config) {
    scene.tweens.killAll();scene.clearUI();scene.state='PHASE_COMPLETE_CARD';scene._activePhaseCard=config;addStars(scene);
    scene.addText(18,scene.Y(16),'COMET IO',15,C.white,{bold:true});scene.addText(18,scene.Y(38),'SMALL THINGS GO FAR',6.5,C.cyan,{bold:true});
    const line=scene.add.graphics();line.lineStyle(1.5,C.cyan,.88).lineBetween(0,scene.Y(59),W,scene.Y(59));scene.ui.add(line);
    scene.addText(W/2,scene.Y(92),'PHASE 4 COMPLETE',19,C.green,{ox:.5,bold:true});
    const frame=scene.add.graphics();frame.fillStyle(C.panel,.50).fillRoundedRect(29,scene.Y(126),362,112,9);frame.lineStyle(1.8,C.cyan,.92).strokeRoundedRect(29,scene.Y(126),362,112,9);scene.ui.add(frame);
    scene.addText(W/2,scene.Y(149),'THE COSMIC AGE',26,C.white,{ox:.5,bold:true});scene.addText(W/2,scene.Y(253),'Systems become the visible cosmos.',10.5,C.muted,{ox:.5,bold:true});

    const xs=[55,155,260,365],ys=[380,407,434,461];
    spiralGalaxy(scene,xs[0],ys[0],18,C.cyan,null,1);
    galaxyCluster(scene,xs[1],ys[1],29,C.cyan,null,2);
    superclusterPiece(scene,xs[2],ys[2],2,null,.66,false);
    universeGlyph(scene,xs[3],ys[3],36);
    const path=scene.add.graphics();path.lineStyle(2,C.cyan,.18);for(let i=0;i<3;i++)path.lineBetween(xs[i]+28,ys[i],xs[i+1]-32,ys[i+1]);scene.ui.addAt(path,Math.max(1,scene.ui.length-8));
    scene.addText(xs[0],scene.Y(491),'GALAXY',6.6,C.white,{ox:.5,bold:true});
    scene.addText(xs[1],scene.Y(518),'GALAXY\nCLUSTER',6.3,C.white,{ox:.5,bold:true,align:'center'});
    scene.addText(xs[2],scene.Y(545),'SUPERCLUSTER',6.1,C.white,{ox:.5,bold:true});
    scene.addText(xs[3],scene.Y(572),'OBSERVABLE\nUNIVERSE',6.0,C.white,{ox:.5,bold:true,align:'center'});
    scene.addText(W/2,scene.Y(646),'FROM GALAXY TO OBSERVABLE UNIVERSE.',7.8,C.muted,{ox:.5,bold:true});
    const label=scene._labSandboxRun?'FINISH PHASE 4 TEST':'UNLOCK LAB MODE';config.button=label;cardButton(scene,label,config);scene.cameras.main.fadeIn(260,0,0,0);
  }

  proto.showPhaseCompleteCard = function(phase) {
    if (phase !== 4) return baseShowPhaseCompleteCard.call(this,phase);
    // Let the existing reward/LAB wrappers establish the correct final-card config, then replace only
    // the visual card with composed galaxy/cluster/supercluster creations.
    baseShowPhaseCompleteCard.call(this,phase);
    const config=this._activePhaseCard || {phase:4,final:true,next:null,button:'UNLOCK LAB MODE'};
    drawPhase4CompletionCard(this,config);return config;
  };

  const FINALE_SLOTS=[[0,0],[0,-92],[92,0],[0,92],[-92,0]];

  function labReturn(scene) {
    if(scene._labSandboxRun)scene.miniButton(48,scene.Y(18),72,24,'LAB',C.purple,()=>scene.returnFromLabPhase());
  }

  function finaleAssembly(scene,mergeCount,incoming=true,parent=null,scale=1) {
    const root=parent||scene.ui,cx=parent?0:W/2,cy=parent?0:scene.Y(395);
    for(let i=0;i<=mergeCount;i++){
      const s=FINALE_SLOTS[i];superclusterPiece(scene,cx+s[0]*scale,cy+s[1]*scale,i,root,scale,i===0);
    }
    if(!incoming||mergeCount>=4)return null;
    const index=mergeCount+1,piece=superclusterPiece(scene,parent?150:W-56,parent?120:scene.Y(590),index,root,.82*scale,false),slot=FINALE_SLOTS[index];
    piece._finalX=cx+slot[0]*scale;piece._finalY=cy+slot[1]*scale;piece._finalScale=scale;return piece;
  }

  proto.startUniverseFinale = function() {
    this.tweens.killAll();this.clearUI();this.state='UNIVERSE_MERGE';this.finaleMergeCount=clamp(Math.max(0,Math.floor(Number(this.finaleMergeCount)||0)),0,4);
    addStars(this);labReturn(this);
    this.addText(W/2,this.Y(58),'FINAL ASSEMBLY',21,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(91),'YOUR SUPERCLUSTER JOINS FOUR OTHERS ACROSS THE COSMIC WEB',8.6,C.muted,{ox:.5,bold:true,width:380,align:'center'});
    this.addText(W/2,this.Y(126),`${this.finaleMergeCount+1} OF 5 SUPERCLUSTERS`,10.5,C.cyan,{ox:.5,bold:true});
    const incoming=finaleAssembly(this,this.finaleMergeCount,true);this._finaleIncomingPiece=incoming;
    this.addText(W/2,this.Y(602),this.finaleMergeCount===0?'THE CENTRE PIECE IS YOUR SUPERCLUSTER.':'ANOTHER SUPERCLUSTER IS WITHIN REACH.',8.7,C.white,{ox:.5,bold:true,width:360,align:'center'});
    this.addText(W/2,this.Y(632),'EACH PIECE CONTAINS ANIMATED GALAXY CLUSTERS.',7.5,C.muted,{ox:.5,bold:true});
    this.wideButton(W/2,this.Y(725),320,58,'MERGE',C.green,()=>this.mergeUniversePiece());
  };

  proto.mergeUniversePiece = function() {
    if(this.state!=='UNIVERSE_MERGE'||!this._finaleIncomingPiece)return;
    this.state='UNIVERSE_MERGING';const piece=this._finaleIncomingPiece;
    this.tweens.add({targets:piece,x:piece._finalX,y:piece._finalY,scale:piece._finalScale||1,duration:820,ease:'Cubic.inOut',onComplete:()=>{
      this.flash(piece.x,piece.y,C.cyan);this.finaleMergeCount++;this.encounters++;this.score+=350;
      if(this.finaleMergeCount>=4)this.time.delayedCall(550,()=>this.completeUniverseAssembly());else this.time.delayedCall(480,()=>this.startUniverseFinale());
    }});
  };

  proto.completeUniverseAssembly = function() {
    this.tweens.killAll();this.clearUI();this.state='UNIVERSE_FORMING';addStars(this);labReturn(this);
    this.addText(W/2,this.Y(72),'OBSERVABLE UNIVERSE FORMED',20,C.green,{ox:.5,bold:true});
    this.addText(W/2,this.Y(105),'FIVE SUPERCLUSTERS • ONE VISIBLE COSMOS',9,C.muted,{ox:.5,bold:true});
    const assembly=this.add.container(W/2,this.Y(405));this.ui.add(assembly);
    const web=this.add.graphics();for(let i=1;i<5;i++){web.lineStyle(2,i%2?C.cyan:C.purple,.28).lineBetween(0,0,FINALE_SLOTS[i][0]*.58,FINALE_SLOTS[i][1]*.58);}assembly.add(web);
    for(let i=0;i<5;i++){const s=FINALE_SLOTS[i];superclusterPiece(this,s[0]*.58,s[1]*.58,i,assembly,.58,i===0);}
    const rim=this.add.graphics();rim.lineStyle(2,C.cyan,.30).strokeCircle(0,0,84);rim.lineStyle(1,C.purple,.28).strokeCircle(0,0,96);assembly.add(rim);
    const universeObject={name:'OBSERVABLE UNIVERSE',realName:'OBSERVABLE UNIVERSE',tier:SUPERCLUSTER,radiusM:4.4e26,massKg:1e53,speedMS:0,kind:'universe',color:C.cyan,solid:false};
    const simple=this.drawObject(W/2,this.Y(405),30,universeObject,false,true);simple.setAlpha(0).setScale(.42);
    this.tweens.add({targets:assembly,scale:.15,angle:12,alpha:0,duration:1400,ease:'Cubic.inOut'});
    this.tweens.add({targets:simple,scale:1,alpha:1,delay:900,duration:620,ease:'Back.out'});
    this.addText(W/2,this.Y(543),'ZOOMING OUT…',9,C.muted,{ox:.5,bold:true}).setAlpha(.75);
    this.time.delayedCall(2050,()=>this.showUniverseAtomEncounter());
  };

  window.CometPhase4SystemV6=Object.freeze({
    enabled:true,version:V6,avoidFlyby:true,labPhaseLabels:true,systemMassUnit:'SOLAR_MASS',
    composedPhase4CompletionArt:true,finaleSuperclusters:5,playerSuperclusterIsFirst:true
  });
})();
