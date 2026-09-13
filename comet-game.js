class GameScene extends Phaser.Scene{
  constructor(){super('game');this.state='APPROACH';}
  create(){this.cameras.main.setBackgroundColor(C.bg);this.cameras.main.roundPixels=true;this.makeBackdrop();this.resetRun();}
  Y(v){return v+SAFE_TOP;}
  resetRun(){this.tierIndex=0;this.growth=0;this.craters=0;this.encounters=0;this.absorbs=0;this.score=0;this.actionHistory=[];this.regionId='outer-heliosphere';this.lastRegionPromptEncounter=-1;this.runStarted=Date.now();this.setPlayer(true);this.startEncounter();}
  setPlayer(resetSpeed=false){const t=TIERS[this.tierIndex],old=this.player?.speedMS||t.v;this.player={name:t.name,tier:this.tierIndex,radiusM:t.r,massKg:t.m,speedMS:resetSpeed?t.v:clamp(Math.max(t.v*.82,old),t.v*.55,t.v*2.4),kind:t.kind,color:t.color,solid:t.solid};}
  region(){return REGIONS.find(r=>r.id===this.regionId)||REGIONS[0];}

  makeBackdrop(){
    const g=this.add.graphics().setDepth(-20);
    g.fillStyle(C.bg).fillRect(0,SAFE_TOP,W,H-SAFE_TOP);
    for(let i=0;i<135;i++){
      const x=Phaser.Math.Between(8,W-8),y=Phaser.Math.Between(SAFE_TOP+5,H-5),a=Phaser.Math.RND.pick([.22,.35,.55,.8]),s=Phaser.Math.RND.pick([1,1,1,2]);
      g.fillStyle(i%17?C.star:C.blue,a).fillRect(x,y,s,s);
    }
    g.lineStyle(18,C.purple,.08).beginPath().moveTo(-50,this.Y(315)).lineTo(150,this.Y(250)).lineTo(310,this.Y(330)).lineTo(470,this.Y(245)).strokePath();
    g.fillStyle(C.black,1).fillRect(0,0,W,SAFE_TOP);
  }
  clearUI(){if(this.ui)this.ui.destroy(true);this.ui=this.add.container(0,0);}
  addText(x,y,text,size,color=C.white,o={}){
    const t=this.add.text(x,y,text,{fontFamily:FONT,fontSize:`${size}px`,fontStyle:o.bold?'bold':'normal',color:`#${color.toString(16).padStart(6,'0')}`,align:o.align||'left',lineSpacing:o.lineSpacing||0,wordWrap:o.width?{width:o.width,useAdvancedWrap:true}:undefined});
    t.setOrigin(o.ox??0,o.oy??0); if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3)); this.ui.add(t); return t;
  }
  shortTier(n){return n.replace('YELLOW DWARF STAR','YELLOW DWARF').replace('BLUE GIANT STAR','BLUE GIANT').replace('RED HYPERGIANT STAR','RED HYPERGIANT').replace('SUPER MASSIVE BLACK HOLE','SM BLACK HOLE');}
  exampleName(t){const a=t.examples||[];return a.length?a[Phaser.Math.Between(0,a.length-1)]:t.name;}

  pickOpponent(){
    const p=this.tierIndex,f=p/(TIERS.length-1),rg=this.region();let idx;
    if(Math.random()<rg.chance)idx=rg.pool[Phaser.Math.Between(0,rg.pool.length-1)];
    else{
      const w=[{g:0,w:.72-.30*f},{g:-1,w:.14-.03*f},{g:1,w:.10+.13*f},{g:2,w:.025+.10*f},{g:-2,w:.015+.01*f},{g:3,w:.005+.055*f}],v=w.filter(x=>p+x.g>=0&&p+x.g<TIERS.length);
      let total=v.reduce((s,x)=>s+x.w,0),r=Math.random()*total,gap=0;
      for(const x of v){r-=x.w;if(r<=0){gap=x.g;break;}}
      const max=Math.min(5,TIERS.length-1-p); if(max>=2&&Math.random()<.018+.035*f)gap=Phaser.Math.Between(2,max); idx=clamp(p+gap,0,TIERS.length-1);
    }
    const t=TIERS[idx];
    return{name:t.name,realName:this.exampleName(t),tier:idx,radiusM:t.r*Math.pow(10,Phaser.Math.FloatBetween(-.08,.08)),massKg:t.m*Math.pow(10,Phaser.Math.FloatBetween(-.14,.14)),speedMS:t.v*Phaser.Math.FloatBetween(.78,1.28),kind:t.kind,color:t.color,solid:t.solid,hint:t.hint,gap:idx-p};
  }
  startEncounter(){if(this.encounters>0&&this.encounters%4===0&&this.lastRegionPromptEncounter!==this.encounters){this.showRegionSelect();return;}this.other=this.pickOpponent();this.drawEncounter();}
  drawEncounter(){this.clearUI();this.state='APPROACH';this.drawHud(true);this.drawArena();this.drawPrompt();}

  drawHud(controls=false){
    const t=TIERS[this.tierIndex],y=this.Y(18),gap=5,x0=10,cw=96.25,ch=62;
    const rows=[['MASS',this.massText(this.player.massKg)],['SPEED',this.speedText(this.player.speedMS)],['CRATERS',String(this.craters)],[`TIER ${this.tierIndex+1}`,this.shortTier(t.name)]];
    rows.forEach((row,i)=>{
      const x=x0+i*(cw+gap),g=this.add.graphics();g.fillStyle(C.panel,.96).fillRoundedRect(x,y,cw,ch,7);g.lineStyle(2,C.cyan,.76).strokeRoundedRect(x,y,cw,ch,7);this.ui.add(g);
      if(i===0)this.miniRock(x+17,y+30,10,C.rock); if(i===1)this.speedGauge(x+17,y+30); if(i===2)this.miniRock(x+17,y+30,10,0x9da4b6,true);
      if(i===3){const b=this.add.graphics(),pct=this.tierIndex===TIERS.length-1?1:clamp(this.growth/t.need,0,1);b.fillStyle(0x20364a).fillRoundedRect(x+8,y+50,cw-16,5,2);b.fillStyle(C.cyan).fillRoundedRect(x+8,y+50,(cw-16)*pct,5,2);this.ui.add(b);}
      const tx=i<3?x+34:x+7;this.addText(tx,y+8,row[0],9.5,C.muted,{bold:true});this.addText(tx,y+27,row[1],i===3?8.5:10.5,C.white,{bold:true,width:i===3?84:62});
    });
    this.addText(13,this.Y(92),'REGION',9.5,C.muted,{bold:true});
    this.addText(13,this.Y(108),this.region().short,10,C.white,{bold:true,width:235});
    this.addText(W-13,this.Y(94),`ROUND ${this.encounters+1}`,9,C.muted,{ox:1,bold:true});
    this.addText(W-13,this.Y(110),`SCORE ${this.score.toLocaleString('en-US')}`,10,C.white,{ox:1,bold:true});
    const l=this.add.graphics();l.lineStyle(2,C.cyan,.7).lineBetween(13,this.Y(130),72,this.Y(130)).lineBetween(W-72,this.Y(130),W-13,this.Y(130));this.ui.add(l);
    if(controls){this.miniButton(29,this.Y(145),52,22,'SAVE',C.green,()=>this.save(false));this.miniButton(88,this.Y(145),52,22,'LOAD',C.blue,()=>this.load());this.miniButton(166,this.Y(145),94,22,'HIGH SCORES',C.orange,()=>this.showScores());}
  }
  miniRock(x,y,r,color,cr=false){const g=this.add.graphics();g.fillStyle(color).fillCircle(x,y,r);g.fillStyle(C.rockDark,.75).fillCircle(x-3,y-2,3).fillCircle(x+3,y+3,cr?4:2);g.lineStyle(1,C.white,.25).strokeCircle(x,y,r);this.ui.add(g);}
  speedGauge(x,y){const g=this.add.graphics();g.lineStyle(3,C.cyan,1).arc(x,y+3,10,Phaser.Math.DegToRad(195),Phaser.Math.DegToRad(345),false).strokePath();g.lineStyle(2,C.white,.8).lineBetween(x,y+3,x+6,y-5);g.fillStyle(C.red).fillRect(x+8,y-3,3,8);this.ui.add(g);}
  miniButton(x,y,w,h,label,color,cb){const c=this.add.container(x,y),g=this.add.graphics();g.fillStyle(color,.13).fillRoundedRect(-w/2,-h/2,w,h,4);g.lineStyle(1,color,.85).strokeRoundedRect(-w/2,-h/2,w,h,4);const t=this.add.text(0,0,label,{fontFamily:FONT,fontSize:'8.5px',fontStyle:'bold',color:'#fff'}).setOrigin(.5),hit=this.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));hit.on('pointerdown',cb);c.add([g,t,hit]);this.ui.add(c);}
  toast(text,color=C.cyan){const c=this.add.container(W/2,this.Y(174)),g=this.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(-84,-15,168,30,5);g.lineStyle(1,color,.9).strokeRoundedRect(-84,-15,168,30,5);const t=this.add.text(0,0,text,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`}).setOrigin(.5);if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));c.add([g,t]);this.ui.add(c);this.tweens.add({targets:c,alpha:0,delay:800,duration:450,onComplete:()=>c.destroy()});}

  drawObject(x,y,r,o,hide=false,glow=false){
    const c=this.add.container(x,y),g=this.add.graphics(),color=hide?C.rock:o.color;if(glow)g.fillStyle(C.orange,.10).fillCircle(0,0,r+11);
    if(!hide&&o.kind==='blackhole'){g.fillStyle(0x05050a).fillCircle(0,0,r);g.lineStyle(Math.max(2,r*.12),C.purple,.75).strokeCircle(0,0,r*1.18);}
    else if(!hide&&o.kind==='nebula'){g.fillStyle(color,.2).fillCircle(-r*.25,0,r*.75).fillCircle(r*.25,r*.12,r*.72);g.fillStyle(color,.55).fillCircle(0,0,r*.46);}
    else{g.fillStyle(color).fillCircle(0,0,r);g.lineStyle(2,C.white,.2).strokeCircle(0,0,r);}
    if(hide||['rock','ice','world','dust'].includes(o.kind))g.fillStyle(C.rockDark,.55).fillCircle(-r*.26,-r*.12,Math.max(3,r*.16)).fillCircle(r*.24,r*.22,Math.max(3,r*.12)).fillCircle(r*.18,-r*.28,Math.max(2,r*.09));
    if(!hide&&o.kind==='gas')g.lineStyle(Math.max(2,r*.11),0xe8c981,.85).strokeEllipse(0,0,r*2.7,r*.75);
    if(!hide&&o.kind==='pulsar')g.lineStyle(3,C.cyan,.8).lineBetween(-r*1.8,0,r*1.8,0);c.add(g);this.ui.add(c);return c;
  }
  drawArena(){
    const d=this.add.graphics();d.lineStyle(8,C.cyan,.07).lineBetween(0,this.Y(610),W,this.Y(226));d.lineStyle(3,C.cyan,.9).lineBetween(0,this.Y(610),W,this.Y(226));this.ui.add(d);
    this.youSprite=this.drawObject(128,this.Y(330),36,this.player,false,true);this.otherSprite=this.drawObject(303,this.Y(480),42,this.other,true);this.trail(128,this.Y(330));this.specks(303,this.Y(480));
    this.addText(14,this.Y(170),'YOU',10,C.green,{bold:true});this.addText(W-14,this.Y(603),'UNKNOWN',10,C.orange,{bold:true,ox:1});
    this.tweens.add({targets:this.youSprite,x:'+=4',y:'-=2',duration:650,yoyo:true,repeat:-1,ease:'Sine.inOut'});this.tweens.add({targets:this.otherSprite,x:'-=3',y:'+=2',duration:760,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }
  trail(x,y){const g=this.add.graphics(),bx=x-92,by=y+48;g.lineStyle(18,C.orange,.11).lineBetween(bx,by,x-27,y+13);g.lineStyle(9,0xff6633,.42).lineBetween(bx+12,by-4,x-30,y+10);g.lineStyle(5,0xffc34e,.7).lineBetween(bx+25,by-8,x-32,y+7);for(let i=0;i<18;i++)g.fillStyle(i%2?C.orange:C.red,Phaser.Math.FloatBetween(.35,.9)).fillRect(Phaser.Math.Between(bx,x-28),Phaser.Math.Between(y+6,by+15),Phaser.Math.Between(2,4),Phaser.Math.Between(2,4));this.ui.addAt(g,Math.max(0,this.ui.length-2));}
  specks(x,y){const g=this.add.graphics();for(let i=0;i<9;i++){const a=Phaser.Math.FloatBetween(0,Math.PI*2),d=Phaser.Math.Between(50,105);g.fillStyle(C.rock,Phaser.Math.FloatBetween(.25,.7)).fillCircle(x+Math.cos(a)*d,y+Math.sin(a)*d,Phaser.Math.Between(2,5));}this.ui.add(g);}

  drawPrompt(){
    const y=this.Y(636),g=this.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(10,y,400,78,8);g.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,y,400,78,8);this.ui.add(g);
    this.addText(W/2,y+17,'AN OBJECT IS AHEAD.',15,C.white,{ox:.5,bold:true});this.addText(W/2,y+44,'DO YOU WANT TO TRY AND…',11,C.muted,{ox:.5,bold:true});
    this.choice(73,this.Y(771),'ABSORB',C.green,'HIGH RISK');this.choice(210,this.Y(771),'DEFLECT',C.orange,'MEDIUM');this.choice(347,this.Y(771),'AVOID',C.blue,'SAFEST');
  }
  choice(x,y,label,color,risk){
    const c=this.add.container(x,y),g=this.add.graphics();g.fillStyle(color,.17).fillRoundedRect(-61,-48,122,96,7);g.lineStyle(3,color,.95).strokeRoundedRect(-61,-48,122,96,7);const icon=this.add.graphics();
    if(label==='ABSORB'){icon.lineStyle(4,color,1).arc(0,-14,17,.25,Math.PI*1.78,false).strokePath();icon.fillStyle(color).fillCircle(0,-14,3);}else if(label==='DEFLECT'){icon.fillStyle(color).fillCircle(-7,-15,10);icon.lineStyle(4,color,1).lineBetween(7,-22,23,-36);icon.fillTriangle(23,-36,13,-33,20,-25);}else{icon.lineStyle(6,color,1).arc(0,-13,19,.3,2,false).strokePath();icon.fillStyle(color).fillTriangle(18,-25,7,-26,14,-16);}
    const a=this.add.text(0,24,label,{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#fff'}).setOrigin(.5),b=this.add.text(0,42,risk,{fontFamily:FONT,fontSize:'8px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`}).setOrigin(.5),hit=this.add.rectangle(0,0,122,96,0xffffff,.001).setInteractive({useHandCursor:true});if(a.setResolution){a.setResolution(Math.min(window.devicePixelRatio||1,3));b.setResolution(Math.min(window.devicePixelRatio||1,3));}hit.on('pointerdown',()=>this.choose(label));c.add([g,icon,a,b,hit]);this.ui.add(c);
  }

  showRegionSelect(){this.clearUI();this.state='REGION';this.drawHud(false);this.addText(W/2,this.Y(154),'CHOOSE YOUR NEXT REGION',16,C.white,{ox:.5,bold:true});this.addText(W/2,this.Y(180),'REGION CHANGES WHAT YOU ARE LIKELY TO MEET',9,C.muted,{ox:.5,bold:true});REGIONS.forEach((r,i)=>this.regionButton(108+(i%2)*204,this.Y(247+Math.floor(i/2)*126),r));}
  regionButton(x,y,r){const sel=r.id===this.regionId,c=this.add.container(x,y),g=this.add.graphics(),color=sel?C.green:C.cyan;g.fillStyle(color,sel?.16:.08).fillRoundedRect(-94,-54,188,108,7);g.lineStyle(sel?2:1.5,color,.9).strokeRoundedRect(-94,-54,188,108,7);const a=this.add.text(0,-33,r.name,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:172}}).setOrigin(.5),b=this.add.text(0,-4,r.science,{fontFamily:FONT,fontSize:'8px',color:'#8db7ca',align:'center',wordWrap:{width:170}}).setOrigin(.5),d=this.add.text(0,26,`COMMON: ${r.common}`,{fontFamily:FONT,fontSize:'7.5px',fontStyle:'bold',color:`#${color.toString(16).padStart(6,'0')}`,align:'center',wordWrap:{width:172}}).setOrigin(.5),hit=this.add.rectangle(0,0,188,108,0xffffff,.001).setInteractive({useHandCursor:true});[a,b,d].forEach(t=>t.setResolution&&t.setResolution(Math.min(window.devicePixelRatio||1,3)));hit.on('pointerdown',()=>{this.regionId=r.id;this.lastRegionPromptEncounter=this.encounters;this.save(true);this.other=this.pickOpponent();this.drawEncounter();});c.add([g,a,b,d,hit]);this.ui.add(c);}

  save(silent=false){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:3,tierIndex:this.tierIndex,growth:this.growth,craters:this.craters,encounters:this.encounters,absorbs:this.absorbs,score:this.score,regionId:this.regionId,lastRegionPromptEncounter:this.lastRegionPromptEncounter,player:this.player,actionHistory:this.actionHistory,elapsedMs:Date.now()-this.runStarted}));if(!silent)this.toast('RUN SAVED',C.green);return true;}catch(e){if(!silent)this.toast('SAVE FAILED',C.red);return false;}}
  load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw){this.toast('NO SAVED RUN',C.orange);return;}const d=JSON.parse(raw);if(!Number.isInteger(d.tierIndex)||d.tierIndex<0||d.tierIndex>=TIERS.length)throw 0;Object.assign(this,{tierIndex:d.tierIndex,growth:+d.growth||0,craters:+d.craters||0,encounters:+d.encounters||0,absorbs:+d.absorbs||0,score:+d.score||0,regionId:REGIONS.some(r=>r.id===d.regionId)?d.regionId:'outer-heliosphere',lastRegionPromptEncounter:Number.isFinite(d.lastRegionPromptEncounter)?d.lastRegionPromptEncounter:-1,actionHistory:Array.isArray(d.actionHistory)?d.actionHistory:[],runStarted:Date.now()-(+d.elapsedMs||0),player:d.player});if(!this.player)this.setPlayer(true);this.startEncounter();}catch(e){this.toast('SAVE CORRUPT',C.red);}}
  clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
  getScores(){try{const s=JSON.parse(localStorage.getItem(SCORES_KEY)||'[]');return Array.isArray(s)?s:[];}catch(e){return[];}}
  qualifies(){const s=this.getScores();return s.length<5||this.score>(s[s.length-1]?.score??-1);}
  recordScore(){if(!this.qualifies())return;const s=this.getScores();let name=(window.prompt('Top five score! Enter your name:','PLAYER')||'PLAYER').trim().slice(0,12).toUpperCase()||'PLAYER';s.push({name,score:this.score,massKg:this.player.massKg,tierIndex:this.tierIndex,object:TIERS[this.tierIndex].name,streak:[...this.actionHistory],date:Date.now()});s.sort((a,b)=>b.score-a.score);localStorage.setItem(SCORES_KEY,JSON.stringify(s.slice(0,5)));}
  showScores(returnTo='encounter'){
    this.clearUI();this.state='SCORES';this.addText(W/2,this.Y(38),'HIGH SCORES',21,C.white,{ox:.5,bold:true});this.addText(W/2,this.Y(68),'TOP 5 ON THIS DEVICE',9,C.muted,{ox:.5,bold:true});const s=this.getScores();
    if(!s.length)this.addText(W/2,this.Y(330),'NO SCORES YET\nSURVIVE A RUN TO SET ONE.',12,C.muted,{ox:.5,align:'center',lineSpacing:8,bold:true});
    s.forEach((v,i)=>{const y=this.Y(132+i*123),g=this.add.graphics(),idx=clamp(+v.tierIndex||0,0,TIERS.length-1),t=TIERS[idx],o={...this.player,name:t.name,tier:idx,radiusM:t.r,massKg:t.m,speedMS:t.v,kind:t.kind,color:t.color,solid:t.solid};g.fillStyle(C.panel,.96).fillRoundedRect(16,y-43,388,106,8);g.lineStyle(1.5,i?C.cyan:C.orange,.7).strokeRoundedRect(16,y-43,388,106,8);this.ui.add(g);this.drawObject(48,y,18,o);this.addText(77,y-33,`#${i+1}  ${String(v.name||'PLAYER').slice(0,12)}`,11,i?C.white:C.orange,{bold:true});this.addText(390,y-33,(+v.score||0).toLocaleString('en-US'),11,C.green,{ox:1,bold:true});this.addText(77,y-11,String(v.object||t.name),9,C.muted,{bold:true});this.addText(77,y+8,`MASS ${this.massText(+v.massKg||t.m)}`,8.5,C.white,{bold:true});const st=(v.streak||[]).map(a=>a==='ABSORB'?'A':a==='DEFLECT'?'D':'V'),shown=st.length>18?['…',...st.slice(-17)]:st;this.addText(77,y+28,`STREAK ${shown.join(' › ')||'—'}`,8,C.muted,{bold:true,width:305});});
    this.wideButton(W/2,this.Y(793),300,46,returnTo==='gameover'?'NEW RUN':'BACK TO RUN',C.cyan,()=>returnTo==='gameover'?this.resetRun():this.drawEncounter());
  }

  choose(choice){if(this.state!=='APPROACH')return;this.state='REVEAL';this.tweens.killAll();this.pending=this.outcome(choice);this.reveal(choice);}
  outcome(choice){
    const p=this.player,o=this.other,gap=o.tier-p.tier,relV=relativeSpeed(p,o),esc=escapeVelocity(o),mass=clamp(logRatio(p.massKg,o.massKg),-1.2,1.2),size=clamp(logRatio(p.radiusM,o.radiusM),-1.2,1.2),speed=clamp(logRatio(p.speedMS,o.speedMS),-1,1),roll=Math.random();
    if(choice==='ABSORB'){const z=1.05-1.28*gap+.72*mass+.28*size+.28*speed,ch=clamp(1/(1+Math.exp(-z)),.03,.97);return{choice,chance:ch,success:roll<ch,relV,targetEscape:esc,gap,massRatio:o.massKg/p.massKg,sizeRatio:o.radiusM/p.radiusM};}
    if(choice==='DEFLECT'){
      const gravity=esc/Math.max(relV,1),clean=clamp(.91-.075*Math.max(gap,0)-.05*Math.max(gap-2,0)-.10*gravity+.04*speed,.46,.97),fatal=clamp(.004+.015*Math.pow(Math.max(gap,0),2)+.035*gravity,.003,.42);
      let result;if(roll<fatal)result='catastrophic';else if(roll<fatal+(1-fatal)*clean)result='clean';else result='rough';
      return{choice,chance:1-fatal,cleanChance:clean*(1-fatal),fatalChance:fatal,result,success:result!=='catastrophic',relV,targetEscape:esc,gap,massRatio:o.massKg/p.massKg,sizeRatio:o.radiusM/p.radiusM};
    }
    const grav=esc/Math.max(p.speedMS,1),ch=clamp(.975-.055*Math.max(gap,0)-.07*Math.max(gap-2,0)-.09*grav,.12,.995);return{choice,chance:ch,success:roll<ch,relV,targetEscape:esc,gap,massRatio:o.massKg/p.massKg,sizeRatio:o.radiusM/p.radiusM,failType:Math.random()<clamp(grav/(grav+1),.2,.85)?'ORBIT':'ORBIT_CRASH'};
  }

  reveal(choice){
    this.clearUI();this.drawHud(false);this.addText(W/2,this.Y(155),'TRUE SCALE REVEAL',14,C.white,{ox:.5,bold:true});const ratio=this.other.radiusM/this.player.radiusM;let pr=34,or=pr*ratio;if(or>145){const s=145/or;or=145;pr=Math.max(1.4,pr*s);}if(or<5){const s=5/Math.max(or,.00001);or=5;pr=Math.min(145,pr*s);}
    const p=this.drawObject(102,this.Y(345),Math.max(1.5,pr),this.player),o=this.drawObject(318,this.Y(410),Math.max(1.5,or),this.other);p.setScale(5).setAlpha(.25);o.setScale(.18).setAlpha(.25);
    const a=this.addText(18,this.Y(542),`YOU\n${this.player.name}`,11,C.green,{bold:true,lineSpacing:4,width:160}),b=this.addText(W-18,this.Y(542),`IDENTIFIED\n${this.other.realName}`,11,C.orange,{ox:1,align:'right',bold:true,lineSpacing:4,width:190});a.setAlpha(0);b.setAlpha(0);
    this.addText(W-18,this.Y(584),this.other.name,9,C.muted,{ox:1,align:'right',bold:true,width:190});
    this.tweens.add({targets:p,scale:1,alpha:1,duration:850,ease:'Cubic.out'});this.tweens.add({targets:o,scale:1,alpha:1,duration:850,ease:'Cubic.out'});this.tweens.add({targets:[a,b],alpha:1,delay:450,duration:350});
    const g=this.add.graphics();g.fillStyle(C.panel,.98).fillRoundedRect(10,this.Y(646),400,68,8);g.lineStyle(2,C.cyan,.86).strokeRoundedRect(10,this.Y(646),400,68,8);this.ui.add(g);this.addText(W/2,this.Y(666),`${choice} LOCKED IN`,13,C.white,{ox:.5,bold:true});this.addText(W/2,this.Y(691),'WATCH THE ENCOUNTER…',9,C.muted,{ox:.5,bold:true});this.time.delayedCall(1500,()=>this.animate(choice,p,o,pr,or));
  }
  animate(choice,p,o,pr,or){const m=W/2;if(choice==='ABSORB'){this.tweens.add({targets:p,x:m-Math.min(pr,22),y:this.Y(375),duration:560,ease:'Quad.in'});this.tweens.add({targets:o,x:m+Math.min(or,22),y:this.Y(375),duration:560,ease:'Quad.in'});this.time.delayedCall(550,()=>this.flash(m,this.Y(375),C.orange));this.time.delayedCall(850,()=>this.resolve());return;}if(choice==='DEFLECT'){this.tweens.add({targets:p,x:198,y:this.Y(340),angle:-25,duration:540,ease:'Quad.in'});this.tweens.add({targets:o,x:245,y:this.Y(400),duration:540});this.time.delayedCall(530,()=>{this.flash(218,this.Y(365),C.orange);if(this.pending.result==='clean')this.tweens.add({targets:p,x:390,y:this.Y(205),angle:-70,duration:560,ease:'Cubic.out'});else if(this.pending.result==='rough')this.tweens.add({targets:p,x:365,y:this.Y(270),angle:-35,scale:.82,duration:650,ease:'Cubic.out'});});this.time.delayedCall(1120,()=>this.resolve());return;}if(this.pending.success){this.tweens.add({targets:p,x:210,y:this.Y(270),angle:-30,duration:520});this.tweens.add({targets:p,x:395,y:this.Y(185),angle:-60,delay:490,duration:500});this.time.delayedCall(1050,()=>this.resolve());}else{this.tweens.add({targets:p,x:255,y:this.Y(330),angle:200,scale:.65,duration:560});this.tweens.add({targets:p,x:300,y:this.Y(415),angle:470,scale:.3,delay:530,duration:560});this.time.delayedCall(1150,()=>this.resolve());}}
  flash(x,y,color){const f=this.add.circle(x,y,9,color,.95);this.ui.add(f);this.tweens.add({targets:f,scale:7,alpha:0,duration:330});}
  growthPoints(){const g=this.other.tier-this.tierIndex;let p=g<=-2?.32:g===-1?.58:g===0?1:g===1?1.65:g===2?2.45:3.2;return p*clamp(.9+.16*Math.max(0,logRatio(this.other.massKg,this.player.massKg)),.85,1.25);}

  resolve(){
    const r=this.pending;let title='',detail='',reason='',color=C.green,evolved=false,penalty=null;
    if(r.success&&r.choice==='ABSORB'){
      const gp=this.growthPoints();this.growth+=gp;this.absorbs++;this.player.speedMS=clamp(this.player.speedMS+clamp(this.other.speedMS*(r.gap<=0?.08:.13),40,50000),150,1.5e6);this.player.massKg+=Math.min(this.other.massKg,this.player.massKg*4)*.35;
      while(this.tierIndex<TIERS.length-1&&this.growth>=TIERS[this.tierIndex].need){this.growth-=TIERS[this.tierIndex].need;this.tierIndex++;this.setPlayer(false);evolved=true;}
      title=evolved?'TIER UP!':'ABSORPTION SUCCESS';detail=evolved?`YOU ARE NOW A ${TIERS[this.tierIndex].name}`:`GROWTH +${gp.toFixed(1)} • ${this.growth.toFixed(1)} / ${TIERS[this.tierIndex].need.toFixed(1)} TO NEXT TIER`;reason='Your mass, size and approach speed were enough to win the head-on encounter.';
    }else if(!r.success&&r.choice==='ABSORB'){title='YOU WERE ABSORBED';detail=`${this.other.realName} was too much to take head-on.`;color=C.red;reason=`The target carried about ${this.compact(Math.max(1,r.massRatio))}× your mass. Absorb is an all-in collision.`;}

    if(r.choice==='DEFLECT'&&r.result==='clean'){
      const boost=clamp(escapeVelocity(this.other)*.05,40,45000),c=Math.max(1,Math.round(1+Math.max(0,r.gap)*1.4));this.player.speedMS=clamp(this.player.speedMS+boost,150,1.5e6);this.craters+=c;title='CLEAN DEFLECTION';detail=`SPEED +${this.speedText(boost)} • CRATERS +${c}`;reason='Your glancing path escaped the target’s gravity and converted some of the encounter into a speed boost.';
    }else if(r.choice==='DEFLECT'&&r.result==='rough'){
      const grav=r.targetEscape/Math.max(r.relV,1),speedLoss=clamp(.09+.045*Math.max(0,r.gap)+.05*grav,.08,.45),massLoss=clamp(.035+.022*Math.max(0,r.gap),.03,.18),growthLoss=Math.min(this.growth,.15+.07*Math.max(0,r.gap));
      this.player.speedMS=Math.max(120,this.player.speedMS*(1-speedLoss));this.player.massKg*=1-massLoss;this.player.radiusM*=Math.cbrt(1-massLoss);this.growth=Math.max(0,this.growth-growthLoss);penalty={speedLoss,massLoss,growthLoss};title='ROUGH DEFLECTION';detail=`SURVIVED • SPEED -${Math.round(speedLoss*100)}% • MASS -${Math.round(massLoss*100)}%`;color=C.orange;reason='You escaped, but the target’s gravity and grazing impact stripped material and bled speed. Deflect is now usually survivable rather than binary.';
    }else if(r.choice==='DEFLECT'&&r.result==='catastrophic'){
      title='DEFLECTION FAILED';detail=`${this.other.realName} overwhelmed the glancing trajectory.`;color=C.red;reason=`This was an extreme mismatch: the target was ${Math.max(0,r.gap)} tier${Math.abs(r.gap)===1?'':'s'} above you and its gravity pulled the pass into collision.`;
    }

    if(r.success&&r.choice==='AVOID'){
      const cost=clamp(.035+.025*Math.max(0,r.gap)+.055*(escapeVelocity(this.other)/Math.max(this.player.speedMS,1)),.03,.52);this.player.speedMS=Math.max(120,this.player.speedMS*(1-cost));title='SAFE PASS';detail=`COURSE CORRECTION COST ${Math.round(cost*100)}% SPEED`;reason='You changed course early enough to escape the target’s gravitational pull, but the manoeuvre cost momentum.';
    }else if(!r.success&&r.choice==='AVOID'){
      title=r.failType==='ORBIT'?'CAPTURED IN ORBIT':'ORBITAL DECAY';detail=r.failType==='ORBIT'?`${this.other.realName}'s gravity trapped you.`:`Captured by ${this.other.realName}, then pulled inward.`;color=C.red;reason='The target’s escape velocity was too large relative to your speed, so the attempted escape became gravitational capture.';
    }

    const survived=r.success;
    if(survived){this.actionHistory.push(r.choice);const base=r.choice==='ABSORB'?110:r.choice==='DEFLECT'?(r.result==='rough'?28:60):25;this.score+=Math.round(base+this.tierIndex*12+Math.max(0,r.gap)*(r.choice==='ABSORB'?55:30));this.encounters++;this.save(true);}else this.clearSave();
    this.drawResult({title,detail,reason,color,survived,penalty});
  }

  drawResult(res){
    const r=this.pending,top=!res.survived&&this.qualifies();this.clearUI();this.drawHud(false);
    const px=95,ox=325,base=this.Y(155),g=this.add.graphics();g.fillStyle(C.panel,.97).fillRoundedRect(14,base,392,510,10);g.lineStyle(2,res.color,.9).strokeRoundedRect(14,base,392,510,10);this.ui.add(g);
    this.addText(W/2,base+25,res.title,19,res.color,{ox:.5,bold:true,align:'center',width:365});
    this.addText(W/2,base+55,this.other.realName,12,C.orange,{ox:.5,bold:true});this.addText(W/2,base+75,this.other.name,9,C.muted,{ox:.5,bold:true});
    this.drawObject(px,base+130,28,this.player);this.drawObject(ox,base+130,28,this.other);
    this.addText(px,base+168,'YOU',9,C.green,{ox:.5,bold:true});this.addText(ox,base+168,'TARGET',9,C.orange,{ox:.5,bold:true});
    const rows=[['SIZE',this.sizeText(this.player.radiusM),this.sizeText(this.other.radiusM)],['MASS',this.massText(this.player.massKg),this.massText(this.other.massKg)],['SPEED',this.speedText(this.player.speedMS),this.speedText(this.other.speedMS)]];
    rows.forEach((row,i)=>{const yy=base+200+i*35;this.addText(W/2,yy,row[0],8.5,C.muted,{ox:.5,bold:true});this.addText(154,yy,row[1],9.5,C.white,{ox:1,bold:true});this.addText(266,yy,row[2],9.5,C.white,{bold:true});});
    this.addText(W/2,base+307,`TARGET ESCAPE VELOCITY ${this.speedText(r.targetEscape)}`,9,C.muted,{ox:.5,bold:true});
    if(r.choice==='DEFLECT')this.addText(W/2,base+330,`CLEAN ${Math.round((r.cleanChance||0)*100)}% • ROUGH ${Math.round(Math.max(0,1-(r.cleanChance||0)-(r.fatalChance||0))*100)}% • FATAL ${Math.round((r.fatalChance||0)*100)}%`,8.5,C.muted,{ox:.5,bold:true});
    else this.addText(W/2,base+330,`RESOLVED CHANCE ${Math.round(r.chance*100)}%`,8.5,C.muted,{ox:.5,bold:true});
    const rb=this.add.graphics();rb.fillStyle(C.panel2,.9).fillRoundedRect(32,base+354,356,91,7);this.ui.add(rb);this.addText(45,base+365,'WHY?',9,C.cyan,{bold:true});this.addText(45,base+384,res.reason,9.5,C.white,{width:330,lineSpacing:3});
    this.addText(W/2,base+466,res.detail,10,C.white,{ox:.5,align:'center',width:350,bold:true});if(top)this.addText(W/2,base+490,'TOP FIVE SCORE!',10,C.orange,{ox:.5,bold:true});
    if(res.survived)this.wideButton(W/2,this.Y(711),330,58,'NEXT ENCOUNTER',C.cyan,()=>this.startEncounter());else if(top)this.wideButton(W/2,this.Y(711),330,58,'ENTER TOP 5 SCORE',C.orange,()=>{this.recordScore();this.showScores('gameover');});else this.wideButton(W/2,this.Y(711),330,58,'RESTART RUN',C.red,()=>this.resetRun());
  }
  wideButton(x,y,w,h,label,color,cb){const c=this.add.container(x,y),g=this.add.graphics();g.fillStyle(color,.17).fillRoundedRect(-w/2,-h/2,w,h,8);g.lineStyle(2,color,.95).strokeRoundedRect(-w/2,-h/2,w,h,8);const t=this.add.text(0,0,label,{fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#fff'}).setOrigin(.5),hit=this.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));hit.on('pointerdown',cb);c.add([g,t,hit]);this.ui.add(c);}

  speedText(v){return v>=1e6?`${(v/1e6).toFixed(2)} Mm/s`:v>=1000?`${(v/1000).toFixed(v>=10000?1:2)} km/s`:`${Math.round(v)} m/s`;}
  massText(k){return k>=1e35?k.toExponential(1)+' kg':k>=1e24?`${(k/5.972e24).toPrecision(3)} M⊕`:k>=1e15?k.toExponential(1)+' kg':k>=1e9?`${(k/1e9).toPrecision(3)} Gkg`:k>=1000?`${(k/1000).toPrecision(3)} t`:k>=1?`${k.toPrecision(3)} kg`:k>=1e-3?`${(k*1000).toPrecision(3)} g`:k.toExponential(1)+' kg';}
  sizeText(r){const d=r*2;return d>=9.461e15?`${(d/9.461e15).toPrecision(2)} ly`:d>=1e9?`${(d/1e9).toPrecision(3)} million km`:d>=1000?`${(d/1000).toPrecision(3)} km`:d>=1?`${d.toPrecision(3)} m`:d>=1e-3?`${(d*1000).toPrecision(3)} mm`:d>=1e-6?`${(d*1e6).toPrecision(3)} µm`:d>=1e-9?`${(d*1e9).toPrecision(3)} nm`:d.toExponential(1)+' m';}
  ratioText(r){return r>=1?`1:${this.compact(r)}`:`${this.compact(1/r)}:1`;}
  compact(n){if(!Number.isFinite(n))return'∞';return n>=1e6||n<.001?n.toExponential(1).replace('+',''):n>=100?Math.round(n).toLocaleString('en-US'):n>=10?n.toFixed(1):n.toFixed(2);}
}

new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#020a19',antialias:true,pixelArt:false,roundPixels:true,resolution:Math.min(window.devicePixelRatio||1,3),scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},scene:[GameScene]});
