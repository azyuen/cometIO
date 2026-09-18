// Phase 4 ending v4.
// Supercluster is the Phase 4 endpoint. Everything after the Phase 4 card is a cosmic epilogue:
// five superclusters connect, the Observable Universe is announced, then an equal-size final Atom
// collision resolves into one new Atom and the true game-complete screen.
(() => {
  if(!window.CometPhase4FinaleV3||!window.CometPhase4||typeof GameScene==='undefined')return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const UNIVERSE_BONUS=Number(P4.universeBonus)||5000;
  const LAB_PASSCODE='UNIATOM';
  const LAB_UNLOCK_KEY='cometio-dev-unlocked-v1';
  const FINAL_SCORE_KEY='cometio-final-score-v1';
  const OBSERVABLE_UNIVERSE_MASS=1e53;

  const baseResolve=proto.resolve;
  const baseStartEncounter=proto.startEncounter;
  const baseShowPhaseCompleteCard=proto.showPhaseCompleteCard;
  const baseContinueFromPhaseCard=proto.continueFromPhaseCard;
  const baseContinueNextUniverse=proto.continueNextUniverse;

  function addLabReturn(scene){
    if(scene._labSandboxRun&&typeof scene.returnFromLabPhase==='function')scene.miniButton(49,scene.Y(18),76,24,'LAB',C.purple,()=>scene.returnFromLabPhase());
  }

  function tierObject(index){
    const t=TIERS[index];
    return {name:t.name,realName:t.name,tier:index,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,hint:t.hint};
  }

  function phase4Backdrop(scene){
    const bg=scene.add.graphics();bg.fillStyle(C.bg,1).fillRect(-20,-20,W+40,H+40);
    for(let i=0;i<92;i++){
      const x=Phaser.Math.Between(7,W-7),y=Phaser.Math.Between(scene.Y(6),H-10),size=Phaser.Math.RND.pick([1,1,1,2]);
      const color=i%19===0?C.purple:i%13===0?C.cyan:C.star;
      bg.fillStyle(color,Phaser.Math.RND.pick([.17,.25,.36,.52,.70])).fillRect(x,y,size,size);
    }
    bg.lineStyle(1.5,C.cyan,.38).lineBetween(7,scene.Y(110),75,scene.Y(45));
    bg.lineStyle(1.5,C.purple,.30).lineBetween(338,scene.Y(610),416,scene.Y(532));
    scene.ui.addAt(bg,0);
  }

  function phase4Button(scene,label,callback){
    const c=scene.add.container(W/2,scene.Y(754)),g=scene.add.graphics(),w=330,h=58;
    g.fillStyle(C.cyan,.14).fillRoundedRect(-w/2,-h/2,w,h,8);g.lineStyle(2,C.cyan,.95).strokeRoundedRect(-w/2,-h/2,w,h,8);
    const t=scene.add.text(0,0,label,{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);
    if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));
    const hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',callback);
    c.add([g,t,hit]);scene.ui.add(c);
  }

  function drawPhase4Progression(scene){
    const supercluster=tierObject(SUPERCLUSTER);
    const visual=scene.drawObject(W/2,scene.Y(421),82,supercluster,false,true);
    scene.tweens.add({
      targets:visual,
      y:{from:scene.Y(426),to:scene.Y(416)},
      angle:{from:-1.2,to:1.2},
      duration:2600,
      yoyo:true,
      repeat:-1,
      ease:'Sine.inOut'
    });
    scene.addText(W/2,scene.Y(530),'SUPERCLUSTER',10.5,C.white,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(553),'THE LARGE-SCALE COSMIC WEB',7.5,C.cyan,{ox:.5,bold:true});
    return visual;
  }

  function showPhase4Complete(scene){
    scene.tweens.killAll();scene.clearUI();scene.state='PHASE_COMPLETE_CARD';
    scene._phase4CompletionShown=true;
    scene._activePhaseCard={phase:4,epilogue:true,final:false,button:'WHAT NEXT?'};
    phase4Backdrop(scene);
    scene.addText(18,scene.Y(16),'COMET IO',15,C.white,{bold:true});
    scene.addText(18,scene.Y(38),'SMALL THINGS GO FAR',6.5,C.cyan,{bold:true});
    scene.addText(W/2,scene.Y(91),'PHASE 4 COMPLETE',20,C.green,{ox:.5,bold:true});
    const frame=scene.add.graphics();frame.fillStyle(C.panel,.58).fillRoundedRect(27,scene.Y(128),366,118,9);frame.lineStyle(1.8,C.cyan,.90).strokeRoundedRect(27,scene.Y(128),366,118,9);scene.ui.add(frame);
    scene.addText(W/2,scene.Y(151),'THE COSMIC AGE',27,C.white,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(207),'GALAXIES GATHER INTO THE LARGEST COSMIC STRUCTURES.',8.5,C.muted,{ox:.5,bold:true,width:350,align:'center'});
    drawPhase4Progression(scene);
    scene.addText(W/2,scene.Y(650),'FROM GALAXY TO SUPERCLUSTER.',8.4,C.muted,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(688),'YOU HAVE REACHED THE END OF PHASE 4.',10,C.white,{ox:.5,bold:true});
    phase4Button(scene,'WHAT NEXT?',()=>{
      if(scene.state!=='PHASE_COMPLETE_CARD')return;
      scene.state='PHASE4_EPILOGUE_TRANSITION';scene._phase4EpilogueUnlocked=true;scene._activePhaseCard=null;
      scene.finaleMergeCount=Math.max(0,Math.min(4,Math.floor(Number(scene.finaleMergeCount)||0)));
      return scene.startUniverseFinale();
    });
    addLabReturn(scene);
  }

  proto.showPhaseCompleteCard=function(phase){
    if(Number(phase)===4)return showPhase4Complete(this);
    return baseShowPhaseCompleteCard.call(this,phase);
  };

  proto.continueFromPhaseCard=function(config){
    if(config?.phase===4&&config?.epilogue&&this.state==='PHASE_COMPLETE_CARD'){
      this.state='PHASE4_EPILOGUE_TRANSITION';this._phase4EpilogueUnlocked=true;this._activePhaseCard=null;
      return this.startUniverseFinale();
    }
    return baseContinueFromPhaseCard.call(this,config);
  };

  proto.resolve=function(){
    const before=Number(this.tierIndex)||0;
    const result=baseResolve.call(this);
    if(before<SUPERCLUSTER&&Number(this.tierIndex)>=SUPERCLUSTER&&!this._devModeActive){
      this._phase4EpilogueUnlocked=false;this._phase4CompletionShown=true;
      this.time.delayedCall(45,()=>{if(!this._devModeActive&&Number(this.tierIndex)>=SUPERCLUSTER)this.showPhaseCompleteCard(4);});
    }
    return result;
  };

  proto.startEncounter=function(){
    if(Number(this.tierIndex)>=SUPERCLUSTER&&!this._devModeActive){
      if(this._phase4EpilogueUnlocked)return this.startUniverseFinale();
      return this.showPhaseCompleteCard(4);
    }
    return baseStartEncounter.call(this);
  };

  function finalUniverseObject(){
    return {name:'OBSERVABLE UNIVERSE',realName:'OBSERVABLE UNIVERSE',tier:SUPERCLUSTER,radiusM:4.4e26,massKg:OBSERVABLE_UNIVERSE_MASS,speedMS:0,kind:'universe',color:C.cyan,solid:false};
  }
  function atomObject(){
    const t=TIERS[0];return {name:t.name,realName:t.examples?.[0]||t.name,tier:0,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid,hint:t.hint};
  }

  proto.showUniverseAtomEncounter=function(){
    this.tweens.killAll();this.clearUI();this.state='UNIVERSE_ATOM';
    this.addText(W/2,this.Y(55),'ENCOUNTER DETECTED',19,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(88),'BEYOND THE OBSERVABLE HORIZON…',9,C.muted,{ox:.5,bold:true});
    this.addText(W/2,this.Y(116),'THE HORIZON IS THE LIMIT OF WHAT YOUR UNIVERSE CAN SHOW YOU.',7.2,C.cyan,{ox:.5,bold:true,width:380,align:'center'});
    const divider=this.add.graphics();divider.lineStyle(2.5,C.cyan,.70).lineBetween(0,this.Y(607),W,this.Y(226));this.ui.add(divider);

    // Deliberately equal apparent size: the final action echoes the very first Atom-vs-Atom absorb.
    const r=40;
    this._universeSprite=this.drawObject(118,this.Y(345),r,finalUniverseObject(),false,true);
    this._finalAtomSprite=this.drawObject(302,this.Y(475),r,atomObject(),false,true);
    this.addText(15,this.Y(177),'YOU',10,C.green,{bold:true});
    this.addText(W-15,this.Y(603),'UNKNOWN OBJECT',10,C.orange,{ox:1,bold:true});
    this.addText(W/2,this.Y(584),'APPARENT SIZE: EQUAL',8,C.muted,{ox:.5,bold:true});

    const panel=this.add.graphics();panel.fillStyle(C.panel,.98).fillRoundedRect(10,this.Y(636),400,78,8);panel.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,this.Y(636),400,78,8);this.ui.add(panel);
    this.addText(W/2,this.Y(655),'IT LOOKS STRANGELY FAMILIAR.',14,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(684),'THERE IS ONLY ONE THING TO TRY.',9,C.muted,{ox:.5,bold:true});
    this.wideButton(W/2,this.Y(771),300,70,'ABSORB',C.green,()=>this.absorbFinalAtom());
    addLabReturn(this);
  };

  function impactBurst(scene,x,y){
    const flash=scene.add.circle(x,y,8,C.white,.96),ring=scene.add.circle(x,y,11,C.orange,.08);ring.setStrokeStyle(2.5,C.orange,.95);scene.ui.add([flash,ring]);
    scene.tweens.add({targets:flash,scale:2.8,alpha:0,duration:190,ease:'Quad.out',onComplete:()=>flash.destroy()});
    scene.tweens.add({targets:ring,scale:4.8,alpha:0,duration:390,ease:'Cubic.out',onComplete:()=>ring.destroy()});
    for(let i=0;i<18;i++){
      const a=Phaser.Math.FloatBetween(0,Math.PI*2),d=Phaser.Math.Between(24,66),p=scene.add.rectangle(x,y,Phaser.Math.Between(2,4),Phaser.Math.Between(2,5),i%4===0?C.white:C.orange,.9);p.rotation=a;scene.ui.add(p);
      scene.tweens.add({targets:p,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,alpha:0,scale:.2,duration:Phaser.Math.Between(280,480),ease:'Quad.out',onComplete:()=>p.destroy()});
    }
  }

  proto.absorbFinalAtom=function(){
    if(this.state!=='UNIVERSE_ATOM')return;
    this.state='UNIVERSE_ATOM_ABSORB';
    const u=this._universeSprite,a=this._finalAtomSprite,cx=W/2,cy=this.Y(395);
    this.tweens.killTweensOf(u);this.tweens.killTweensOf(a);
    this.addText(W/2,this.Y(660),'ABSORB LOCKED IN',11,C.white,{ox:.5,bold:true});
    this.tweens.add({targets:u,x:cx,y:cy,duration:560,ease:'Cubic.in'});
    this.tweens.add({targets:a,x:cx,y:cy,duration:560,ease:'Cubic.in'});
    this.time.delayedCall(545,()=>{u.setAlpha(0);a.setAlpha(0);impactBurst(this,cx,cy);});
    this.time.delayedCall(720,()=>{
      const result=this.drawObject(cx,cy,46,atomObject(),false,true);this._finalNewAtom=result;result.setScale(.48).setAlpha(.08);
      this.tweens.add({targets:result,scale:1,alpha:1,duration:340,ease:'Back.out'});
      this.addText(W/2,this.Y(486),'ONE NEW ATOM',12,C.green,{ox:.5,bold:true}).setAlpha(.9);
    });
    this.time.delayedCall(1550,()=>this.finishUniverse());
  };

  function patchNewestHighScore(scene,before,completed){
    try{
      const scores=scene.getScores();let candidate=null;
      for(const s of scores){if(Number(s.score)!==Number(scene.score)||Number(s.date)<before-2500)continue;if(!candidate||Number(s.date)>Number(candidate.date))candidate=s;}
      if(!candidate)return false;
      candidate.object=`OBSERVABLE UNIVERSE • U${completed}`;candidate.massKg=OBSERVABLE_UNIVERSE_MASS;candidate.universes=completed;candidate.tierIndex=SUPERCLUSTER;
      localStorage.setItem(SCORES_KEY,JSON.stringify(scores));return true;
    }catch(e){return false;}
  }

  function bankCompletion(scene,completed){
    if(scene._labSandboxRun)return {saved:false,topFive:false,preview:true};
    let topFive=false;
    try{
      localStorage.setItem(LAB_UNLOCK_KEY,'1');
      localStorage.setItem(FINAL_SCORE_KEY,JSON.stringify({score:Number(scene.score)||0,massKg:OBSERVABLE_UNIVERSE_MASS,object:'OBSERVABLE UNIVERSE',universes:completed,tierIndex:SUPERCLUSTER,streak:[...(scene.actionHistory||[])],completedAt:Date.now()}));
    }catch(e){}
    try{
      if(typeof scene.qualifies==='function'&&scene.qualifies()){
        const before=Date.now();scene.recordScore();topFive=patchNewestHighScore(scene,before,completed);
      }
    }catch(e){}
    return {saved:true,topFive,preview:false};
  }

  function endButton(scene,y,label,color,callback,width=310){
    const c=scene.add.container(W/2,scene.Y(y)),g=scene.add.graphics();g.fillStyle(color,.14).fillRoundedRect(-width/2,-24,width,48,7);g.lineStyle(2,color,.92).strokeRoundedRect(-width/2,-24,width,48,7);
    const t=scene.add.text(0,0,label,{fontFamily:FONT,fontSize:'11.5px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));
    const hit=scene.add.rectangle(0,0,width,48,0xffffff,.001).setInteractive({useHandCursor:true});hit.on('pointerdown',callback);c.add([g,t,hit]);scene.ui.add(c);return c;
  }

  proto.finishUniverse=function(){
    this.score+=UNIVERSE_BONUS;this.encounters++;this.actionHistory||=[];this.actionHistory.push('ABSORB');
    const completed=Math.max(1,Math.floor(Number(this.universeCount)||0)+1);this.universeCount=completed;
    const status=bankCompletion(this,completed);
    this.tweens.killAll();this.clearUI();this.state='GAME_COMPLETE';
    const bg=this.add.graphics();bg.fillStyle(C.bg,1).fillRect(-20,-20,W+40,H+40);for(let i=0;i<100;i++){const x=Phaser.Math.Between(8,W-8),y=Phaser.Math.Between(this.Y(8),H-10);bg.fillStyle(i%17===0?C.purple:i%11===0?C.cyan:C.star,Phaser.Math.RND.pick([.18,.28,.42,.64])).fillRect(x,y,Phaser.Math.RND.pick([1,1,1,2]),Phaser.Math.RND.pick([1,1,1,2]));}this.ui.add(bg);
    this.addText(W/2,this.Y(67),'GAME COMPLETE',26,C.green,{ox:.5,bold:true});
    this.addText(W/2,this.Y(105),'FROM ONE ATOM TO THE OBSERVABLE UNIVERSE — AND BACK AGAIN.',8.2,C.muted,{ox:.5,bold:true,width:380,align:'center'});

    const card=this.add.graphics();card.fillStyle(C.panel,.91).fillRoundedRect(34,this.Y(145),352,338,11);card.lineStyle(2,C.cyan,.86).strokeRoundedRect(34,this.Y(145),352,338,11);this.ui.add(card);
    this.addText(W/2,this.Y(176),'FINAL SCORE',10,C.orange,{ox:.5,bold:true});
    this.addText(W/2,this.Y(209),Number(this.score).toLocaleString('en-US'),30,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(254),'PEAK OBJECT  •  OBSERVABLE UNIVERSE',8.5,C.cyan,{ox:.5,bold:true});
    this.addText(W/2,this.Y(286),status.preview?'PHS4 LAB PREVIEW • SCORE NOT SAVED':status.topFive?'TOP FIVE HIGH SCORE SAVED':'FINAL RUN SAVED',8.5,status.preview?C.orange:status.topFive?C.green:C.cyan,{ox:.5,bold:true});
    const line=this.add.graphics();line.lineStyle(1.4,C.cyan,.34).lineBetween(72,this.Y(320),348,this.Y(320));this.ui.add(line);
    this.addText(W/2,this.Y(347),'COLLISION LAB PASSWORD',9.5,C.cyan,{ox:.5,bold:true});
    this.addText(W/2,this.Y(386),LAB_PASSCODE,31,C.white,{ox:.5,bold:true});
    this.addText(W/2,this.Y(430),status.preview?'THIS IS THE SAME END SCREEN USED BY THE FULL GAME.':'COLLISION LAB IS NOW UNLOCKED.',7.7,C.muted,{ox:.5,bold:true,width:310,align:'center'});
    this.addText(W/2,this.Y(462),`UNIVERSE BONUS  +${UNIVERSE_BONUS.toLocaleString('en-US')}`,8.5,C.orange,{ox:.5,bold:true});

    endButton(this,550,'CONTINUE AS A NEW ATOM',C.green,()=>this.continueNextUniverse());
    endButton(this,612,this._labSandboxRun?'RETURN TO COLLISION LAB':'OPEN COLLISION LAB',C.purple,()=>{
      if(this._labSandboxRun&&typeof this.returnFromLabPhase==='function')return this.returnFromLabPhase();
      if(typeof this.showDevLab==='function')return this.showDevLab();
      return this.showHome();
    });
    endButton(this,674,'HOME',C.cyan,()=>this.showHome(),240);
    this.cameras.main.flash(320,255,255,255,false);
  };

  proto.continueNextUniverse=function(){
    this._phase4CompletionShown=false;this._phase4EpilogueUnlocked=false;this._finalJoinedSuperclusters=[];this._finalIncoming=null;this._finalPlayerVisual=null;this._finalIncomingVisual=null;this._finalNewAtom=null;
    return baseContinueNextUniverse.call(this);
  };

  window.CometPhase4EndingV4=Object.freeze({enabled:true,phase4Endpoint:'SUPERCLUSTER',phase4Button:'WHAT NEXT?',postPhase4Epilogue:true,finalHorizonWording:'OBSERVABLE HORIZON',equalSizeFinalCollision:true,collisionResult:'NEW ATOM',gameCompleteScreen:true,labPreview:true,labPasscode:LAB_PASSCODE});
})();