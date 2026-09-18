// Final Phase v3: post-Phase-4 cosmic epilogue.
// One MERGE action; each incoming supercluster visibly joins the persistent player structure until five are connected.
(() => {
  if(!window.CometPhase4FinaleV2||!window.CometPhase4)return;
  const proto=GameScene.prototype,P4=window.CometPhase4,SUPERCLUSTER=P4.superclusterTier;

  function shuffledMembers(scene,index){
    const src=(scene.phase4Members||[]).map(m=>({...m}));
    for(let i=src.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[src[i],src[j]]=[src[j],src[i]];}
    return src.map((m,i)=>({...m,memberId:`final3-${index}-${i}-${Date.now().toString(36)}`,sourceMemberId:m.memberId||m.sourceMemberId||null,color:(i+index)%3===0?C.purple:(i+index)%3===1?C.cyan:m.color}));
  }

  function descriptor(scene,index,isPlayer=false){
    const t=TIERS[SUPERCLUSTER];
    return {
      // Finale superclusters should use the same underlying geometry as the player's final
      // SUPERCLUSTER. Previously these were created as kind:'cluster', which left a galaxy-cluster
      // glyph underneath the later cosmic-web overlay and made them look subtly different.
      object:isPlayer?scene.player:{name:'SUPERCLUSTER',realName:`SUPERCLUSTER ${index+1}`,tier:SUPERCLUSTER,radiusM:t.r*(.90+Math.random()*.18),massKg:t.m*(.88+Math.random()*.24),speedMS:t.v*(.88+Math.random()*.20),kind:'supercluster',color:index%2?C.purple:C.cyan,solid:false},
      members:isPlayer?(scene.phase4Members||[]):shuffledMembers(scene,index),
      player:isPlayer
    };
  }

  function ensureState(scene){
    scene.finaleMergeCount=Math.max(0,Math.min(4,Math.floor(Number(scene.finaleMergeCount)||0)));
    if(!Array.isArray(scene._finalJoinedSuperclusters)||!scene._finalJoinedSuperclusters.length)scene._finalJoinedSuperclusters=[descriptor(scene,0,true)];
    while(scene._finalJoinedSuperclusters.length<scene.finaleMergeCount+1)scene._finalJoinedSuperclusters.push(descriptor(scene,scene._finalJoinedSuperclusters.length,false));
    if(scene._finalJoinedSuperclusters.length>scene.finaleMergeCount+1)scene._finalJoinedSuperclusters=scene._finalJoinedSuperclusters.slice(0,scene.finaleMergeCount+1);
  }

  function drawDynamic(scene,x,y,radius,d,glow=false){
    const oldPlayer=scene.player,oldMembers=scene.phase4Members;
    scene.player=d.object;scene.phase4Members=d.members;
    const v=scene.drawObject(x,y,radius,d.object,false,glow);
    scene.player=oldPlayer;scene.phase4Members=oldMembers;
    return v;
  }

  const layouts={
    1:[[0,0]],
    2:[[-.24,0],[.24,0]],
    3:[[-.25,.14],[.25,.14],[0,-.24]],
    4:[[-.23,-.18],[.23,-.18],[-.23,.18],[.23,.18]],
    5:[[0,0],[0,-.31],[.30,0],[0,.31],[-.30,0]]
  };

  function drawJoined(scene,x,y,radius,glow=false){
    ensureState(scene);
    const list=scene._finalJoinedSuperclusters,count=Math.min(5,list.length),root=scene.add.container(x,y),g=scene.add.graphics();
    if(glow)g.fillStyle(C.cyan,.025).fillCircle(0,0,radius*1.14);
    const slots=layouts[count]||layouts[5],componentR=count===1?radius*.96:radius*(count===2?.59:.52);
    if(count>1){
      for(let i=1;i<count;i++){
        const color=i%2?C.cyan:0x2f8cff;
        g.lineStyle(Math.max(2,radius*.026),color,.30).lineBetween(slots[0][0]*radius,slots[0][1]*radius,slots[i][0]*radius,slots[i][1]*radius);
      }
      if(count===5){
        g.lineStyle(Math.max(1.8,radius*.014),C.cyan,.19).strokeEllipse(0,0,radius*1.22,radius*.54);
        g.lineStyle(Math.max(1.6,radius*.012),0x2f8cff,.17).strokeEllipse(0,0,radius*.58,radius*1.24);
      }
    }
    root.add(g);
    list.slice(0,count).forEach((d,i)=>{
      const s=slots[i],v=drawDynamic(scene,s[0]*radius,s[1]*radius,componentR,d,i===0&&glow);
      if(v.parentContainer===scene.ui)scene.ui.remove(v);root.add(v);
    });
    scene.ui.add(root);return root;
  }

  function mergeButton(scene){
    const x=W/2,y=scene.Y(771),w=174,h=96,c=scene.add.container(x,y),g=scene.add.graphics();
    g.fillStyle(C.green,.17).fillRoundedRect(-w/2,-h/2,w,h,7);g.lineStyle(3,C.green,.95).strokeRoundedRect(-w/2,-h/2,w,h,7);
    const icon=scene.add.image(0,-16,'action-absorb-phase4').setDisplaySize(54,54);
    const text=scene.add.text(0,27,'MERGE',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    if(text.setResolution)text.setResolution(Math.min(window.devicePixelRatio||1,3));
    const hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',()=>scene.chooseFinalSuperclusterV3());
    c.add([g,icon,text,hit]);scene.ui.add(c);return c;
  }

  proto.startUniverseFinale=function(){
    this.tweens.killAll();this.clearUI();ensureState(this);this.state='FINAL_PHASE_ENCOUNTER';
    const connected=this._finalJoinedSuperclusters.length;
    this.addText(14,this.Y(18),'BEYOND PHASE 4',12,C.white,{bold:true});
    this.addText(W-14,this.Y(20),`${connected} / 5 CONNECTED`,9,C.cyan,{bold:true,ox:1});

    const d=this.add.graphics();d.lineStyle(8,C.cyan,.07).lineBetween(0,this.Y(610),W,this.Y(226));d.lineStyle(3,C.cyan,.9).lineBetween(0,this.Y(610),W,this.Y(226));this.ui.add(d);
    this._finalPlayerVisual=drawJoined(this,128,this.Y(330),66,true);
    this._finalIncoming=descriptor(this,connected,false);
    this._finalIncomingVisual=drawDynamic(this,303,this.Y(480),64,this._finalIncoming,true);
    this.addText(14,this.Y(170),'YOU',10,C.green,{bold:true});
    this.addText(W-14,this.Y(603),'SUPERCLUSTER',10,C.orange,{bold:true,ox:1});
    this.tweens.add({targets:this._finalPlayerVisual,x:'+=4',y:'-=2',duration:650,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    this.tweens.add({targets:this._finalIncomingVisual,x:'-=3',y:'+=2',duration:760,yoyo:true,repeat:-1,ease:'Sine.inOut'});

    const py=this.Y(636),panel=this.add.graphics();panel.fillStyle(C.panel,.98).fillRoundedRect(10,py,400,78,8);panel.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,py,400,78,8);this.ui.add(panel);
    this.addText(W/2,py+26,'ANOTHER SUPERCLUSTER IS AHEAD.',13.5,C.white,{ox:.5,bold:true});
    mergeButton(this);
  };

  proto.chooseFinalSuperclusterV3=function(){
    if(this.state!=='FINAL_PHASE_ENCOUNTER')return;
    this.state='FINAL_PHASE_MERGING';
    const p=this._finalPlayerVisual,o=this._finalIncomingVisual,incoming=this._finalIncoming;
    this.addText(W/2,this.Y(660),'MERGE LOCKED IN',11,C.white,{ox:.5,bold:true});
    this.tweens.killTweensOf(p);this.tweens.killTweensOf(o);
    const px=p.x,py=p.y,ox=o.x,oy=o.y,cx=W/2,cy=this.Y(402);
    this.tweens.add({targets:p,x:cx-24,y:cy,duration:680,ease:'Sine.inOut'});
    this.tweens.addCounter({from:0,to:1,duration:980,ease:'Cubic.inOut',onUpdate:tw=>{
      const t=tw.getValue(),u=1-t,controlX=cx+90,controlY=cy-70;
      o.x=u*u*ox+2*u*t*controlX+t*t*(cx+28);o.y=u*u*oy+2*u*t*controlY+t*t*cy;o.setScale(1-.42*t);
    },onComplete:()=>{
      this._finalJoinedSuperclusters.push(incoming);this.finaleMergeCount=this._finalJoinedSuperclusters.length-1;
      this.flash(cx,cy,C.cyan);this.time.delayedCall(180,()=>this.showJoinedSuperclusterResult());
    }});
  };

  proto.showJoinedSuperclusterResult=function(){
    this.tweens.killAll();this.clearUI();this.state='FINAL_PHASE_JOINED';ensureState(this);
    const count=this._finalJoinedSuperclusters.length;
    this.addText(W/2,this.Y(85),`SUPERCLUSTERS CONNECTED: ${count} / 5`,15,count>=5?C.green:C.cyan,{ox:.5,bold:true});
    const v=drawJoined(this,W/2,this.Y(405),130,true);v.setScale(.74);this.tweens.add({targets:v,scale:.90,duration:520,ease:'Back.out'});
    this.addText(W/2,this.Y(580),count>=5?'THE CONNECTED STRUCTURE IS COMPLETE.':'THIS CONNECTED STRUCTURE IS NOW YOUR OBJECT.',8.5,C.white,{ox:.5,bold:true});
    this.time.delayedCall(count>=5?1800:900,()=>{if(count>=5)this.completeUniverseAssembly();else this.startUniverseFinale();});
  };

  proto.chooseFinalSupercluster=function(){return this.chooseFinalSuperclusterV3();};
  proto.mergeUniversePiece=function(){return this.chooseFinalSuperclusterV3();};

  proto.completeUniverseAssembly=function(){
    this.tweens.killAll();this.clearUI();this.state='FINAL_PHASE_COMPLETE';ensureState(this);
    this.addText(W/2,this.Y(64),'FIVE SUPERCLUSTERS CONNECTED',19,C.green,{ox:.5,bold:true});
    this.addText(W/2,this.Y(98),'THE LARGE-SCALE COSMIC WEB IS COMPLETE',8.5,C.muted,{ox:.5,bold:true});
    const v=drawJoined(this,W/2,this.Y(405),148,true);v.setScale(.74);this.tweens.add({targets:v,scale:.92,duration:900,ease:'Sine.inOut'});
    this.addText(W/2,this.Y(607),'PAUSE. THE FIVE STRUCTURES NOW DEFINE YOUR OBSERVABLE COSMOS.',8,C.cyan,{ox:.5,bold:true,width:380,align:'center'});

    this.time.delayedCall(1550,()=>{
      this.addText(W/2,this.Y(135),'YOU ARE NOW THE OBSERVABLE UNIVERSE',16,C.white,{ox:.5,bold:true,width:390,align:'center'});
      this.cameras.main.flash(240,32,217,255,false);
    });

    this.time.delayedCall(2250,()=>{
      const universeObject={name:'OBSERVABLE UNIVERSE',realName:'OBSERVABLE UNIVERSE',tier:SUPERCLUSTER,radiusM:4.4e26,massKg:1e53,speedMS:0,kind:'universe',color:C.cyan,solid:false};
      const simple=this.drawObject(W/2,this.Y(405),32,universeObject,false,true);
      simple.setAlpha(0).setScale(.38);
      this.tweens.add({targets:v,scale:.10,alpha:0,duration:1050,ease:'Cubic.inOut'});
      this.tweens.add({targets:simple,scale:1,alpha:1,delay:560,duration:520,ease:'Back.out'});
      this.addText(W/2,this.Y(650),'ZOOMING OUT TO THE OBSERVABLE HORIZON…',8.5,C.muted,{ox:.5,bold:true});
    });

    this.time.delayedCall(3900,()=>this.showUniverseAtomEncounter());
  };

  window.CometPhase4FinaleV3=Object.freeze({enabled:true,postPhase4Epilogue:true,normalDiagonalEncounter:true,onlyAction:'MERGE',captureSpriteForMerge:true,persistentJoinedObject:true,totalSuperclusters:5,observableUniversePause:true});
})();