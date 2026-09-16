// Phase 4 finale v2: normal-style supercluster encounters, no puzzle-piece replacement sprites.
(() => {
  if(!window.CometPhase4SystemV6 || !window.CometPhase4RiskV1)return;
  const proto=GameScene.prototype,P4=window.CometPhase4,SUPERCLUSTER=P4.superclusterTier;
  const basePrompt=proto.drawPrompt,baseReveal=proto.reveal;

  function walk(node,fn){if(!node)return;fn(node);if(Array.isArray(node.list))node.list.forEach(c=>walk(c,fn));}
  function removeText(scene,patterns){walk(scene.ui,n=>{if(typeof n?.text!=='string')return;if(patterns.some(p=>p.test(n.text))){try{n.destroy();}catch(e){}}});}

  proto.drawPrompt=function(){const r=basePrompt.call(this);if(this.tierIndex>=P4.galaxyTier&&this.tierIndex<SUPERCLUSTER){removeText(this,[/CAPTURE: HIGH \/ CAN END RUN/i,/AVOID: SAFE \/ SPEED COST/i]);}return r;};
  proto.reveal=function(choice){const r=baseReveal.call(this,choice);if(this.tierIndex>=P4.galaxyTier&&this.tierIndex<SUPERCLUSTER){removeText(this,[/WATCH THE GRAVITATIONAL ENCOUNTER/i,/WATCH THE ENCOUNTER/i]);}return r;};

  function shuffledMembers(scene,index){
    const base=(scene.phase4Members||[]).map(m=>({...m}));
    for(let i=base.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[base[i],base[j]]=[base[j],base[i]];}
    return base.map((m,i)=>({...m,memberId:`final-${index}-${i}-${Date.now().toString(36)}`,sourceMemberId:m.memberId||m.sourceMemberId||null,color:i%3===0?C.purple:i%3===1?C.cyan:m.color}));
  }

  function superclusterObject(scene,index){
    const t=TIERS[SUPERCLUSTER];
    return {name:'SUPERCLUSTER',realName:`SUPERCLUSTER ${index+1}`,tier:SUPERCLUSTER,radiusM:t.r*(.88+Math.random()*.22),massKg:t.m*(.84+Math.random()*.28),speedMS:t.v*(.85+Math.random()*.25),kind:'cluster',color:index%2?C.purple:C.cyan,solid:false};
  }

  function drawDynamicSupercluster(scene,x,y,radius,members,object,glow=false){
    const oldPlayer=scene.player,oldMembers=scene.phase4Members;
    scene.player=object;scene.phase4Members=members;
    const v=scene.drawObject(x,y,radius,object,false,glow);
    scene.player=oldPlayer;scene.phase4Members=oldMembers;
    return v;
  }

  function ensureFinaleState(scene){
    scene.finaleMergeCount=Math.max(0,Math.min(4,Math.floor(Number(scene.finaleMergeCount)||0)));
    if(!Array.isArray(scene._finalSuperclusters))scene._finalSuperclusters=[];
    while(scene._finalSuperclusters.length<scene.finaleMergeCount){
      const idx=scene._finalSuperclusters.length+1;
      scene._finalSuperclusters.push({object:superclusterObject(scene,idx),members:shuffledMembers(scene,idx)});
    }
  }

  const JOIN_SLOTS=[[0,0],[0,-78],[76,8],[0,82],[-76,8]];

  function drawAssembly(scene,cx,cy,scale=.58){
    ensureFinaleState(scene);
    const root=scene.add.container(cx,cy);scene.ui.add(root);
    const paths=scene.add.graphics();
    paths.lineStyle(1.2,C.cyan,.16).strokeEllipse(0,2,178*scale,76*scale);
    paths.lineStyle(1.2,C.purple,.15).strokeEllipse(0,2,82*scale,176*scale);
    root.add(paths);

    const playerV=drawDynamicSupercluster(scene,JOIN_SLOTS[0][0]*scale,JOIN_SLOTS[0][1]*scale,46*scale,scene.phase4Members,scene.player,true);
    if(playerV.parentContainer===scene.ui)scene.ui.remove(playerV);root.add(playerV);
    scene._finalSuperclusters.slice(0,scene.finaleMergeCount).forEach((d,i)=>{
      const s=JOIN_SLOTS[i+1],v=drawDynamicSupercluster(scene,s[0]*scale,s[1]*scale,43*scale,d.members,d.object,false);
      if(v.parentContainer===scene.ui)scene.ui.remove(v);root.add(v);
    });
    return root;
  }

  proto.startUniverseFinale=function(){
    this.tweens.killAll();this.clearUI();this.state='FINAL_SUPERCLUSTER_ENCOUNTER';ensureFinaleState(this);
    this.addText(W/2,this.Y(45),'FINAL PHASE?',22,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(80),`${this.finaleMergeCount+1} OF 5 SUPERCLUSTERS CONNECTED`,8.7,C.cyan,{ox:.5,bold:true});

    drawAssembly(this,W/2,this.Y(245),.46);
    const incomingIndex=this.finaleMergeCount+1;
    const incoming={object:superclusterObject(this,incomingIndex),members:shuffledMembers(this,incomingIndex)};
    this._finaleIncomingDescriptor=incoming;

    const you=drawDynamicSupercluster(this,102,this.Y(475),53,this.phase4Members,this.player,true);
    const other=drawDynamicSupercluster(this,318,this.Y(490),51,incoming.members,incoming.object,false);
    this._finaleYouVisual=you;this._finaleOtherVisual=other;
    this.addText(102,this.Y(552),'YOUR SUPERCLUSTER',7.8,C.green,{ox:.5,bold:true});
    this.addText(318,this.Y(552),'ANOTHER SUPERCLUSTER',7.4,C.orange,{ox:.5,bold:true});

    const g=this.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(18,this.Y(593),384,78,8);g.lineStyle(1.8,C.cyan,.75).strokeRoundedRect(18,this.Y(593),384,78,8);this.ui.add(g);
    this.addText(W/2,this.Y(612),'A SUPERCLUSTER IS ON AN INTERSECTING PATH.',9.3,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(638),'WHAT DO YOU DO?',8.5,C.muted,{ox:.5,bold:true});
    this.wideButton(112,this.Y(724),174,54,'MERGE',C.green,()=>this.chooseFinalSupercluster('MERGE'));
    this.wideButton(308,this.Y(724),174,54,'AVOID',C.blue,()=>this.chooseFinalSupercluster('AVOID'));
  };

  proto.chooseFinalSupercluster=function(choice){
    if(this.state!=='FINAL_SUPERCLUSTER_ENCOUNTER')return;
    this.state='FINAL_SUPERCLUSTER_ANIMATING';
    const p=this._finaleYouVisual,o=this._finaleOtherVisual,d=this._finaleIncomingDescriptor;
    const slot=JOIN_SLOTS[Math.min(4,this.finaleMergeCount+1)];
    this.addText(W/2,this.Y(605),`${choice} LOCKED IN`,11,C.white,{ox:.5,bold:true});

    if(choice==='MERGE'){
      this.addText(W/2,this.Y(633),'GRAVITY PULLS BOTH LARGE-SCALE STRUCTURES INTO THE SAME COSMIC WEB.',7.2,C.cyan,{ox:.5,bold:true,width:370,align:'center'});
      this.tweens.add({targets:p,x:W/2-42,y:this.Y(455),duration:650,ease:'Sine.inOut'});
      this.tweens.add({targets:o,x:W/2+42,y:this.Y(455),duration:650,ease:'Sine.inOut'});
    }else{
      this.addText(W/2,this.Y(633),'YOU CHANGE COURSE, BUT THE OVERLAPPING GRAVITATIONAL WEB STILL CONNECTS THE STRUCTURES.',7.0,C.cyan,{ox:.5,bold:true,width:372,align:'center'});
      this.tweens.addCounter({from:0,to:1,duration:950,ease:'Sine.inOut',onUpdate:tw=>{const t=tw.getValue(),a=-1.9+t*2.8;o.x=W/2+Math.cos(a)*112;o.y=this.Y(460)+Math.sin(a)*56;}});
    }

    this.time.delayedCall(choice==='MERGE'?760:1020,()=>{
      this._finalSuperclusters.push(d);this.finaleMergeCount++;
      this.flash(W/2,this.Y(455),C.cyan);
      this.time.delayedCall(420,()=>{
        if(this.finaleMergeCount>=4)this.completeUniverseAssembly();else this.startUniverseFinale();
      });
    });
  };

  // Compatibility: old MERGE button callbacks from cached screens still route into the new encounter.
  proto.mergeUniversePiece=function(){return this.chooseFinalSupercluster('MERGE');};

  proto.completeUniverseAssembly=function(){
    this.tweens.killAll();this.clearUI();this.state='FINAL_SUPERCLUSTER_COMPLETE';ensureFinaleState(this);
    this.addText(W/2,this.Y(55),'FIVE SUPERCLUSTERS CONNECTED',19,C.green,{ox:.5,bold:true});
    this.addText(W/2,this.Y(88),'A WEB OF GALAXY CLUSTERS NOW SPANS THE VISIBLE COSMOS',8,C.muted,{ox:.5,bold:true,width:380,align:'center'});
    const assembly=drawAssembly(this,W/2,this.Y(405),1);
    assembly.setScale(.72);this.tweens.add({targets:assembly,scale:.88,duration:1250,yoyo:true,repeat:1,ease:'Sine.inOut'});
    this.addText(W/2,this.Y(612),'THE FIVE STRUCTURES REMAIN DISTINCT — THEY ARE NOW CONNECTED AS ONE LARGE-SCALE PATTERN.',7.2,C.cyan,{ox:.5,bold:true,width:380,align:'center'});
    this.time.delayedCall(2600,()=>this.showUniverseAtomEncounter());
  };

  window.CometPhase4FinaleV2=Object.freeze({enabled:true,title:'FINAL PHASE?',choices:['MERGE','AVOID'],bothChoicesJoin:true,usesLiveSuperclusterRenderer:true,connectedNotCollapsed:true});
})();
