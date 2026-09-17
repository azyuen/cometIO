// cometIO dynamic soundtrack v1
// Eight phase tracks (two per phase) + one high-risk encounter cue.
// Procedural Web Audio keeps the PWA lightweight and lets risk music duck/resume smoothly.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const TRACKS = Object.freeze({
    p1a:{name:'SPACE EXOTICA',phase:1,bpm:168,beats:6,bars:16,style:'exotica',delay:.21,feedback:.16},
    p1b:{name:'RETRO SPACE SURF',phase:1,bpm:132,beats:4,bars:16,style:'surf',delay:.11,feedback:.12},
    p2a:{name:'COSMIC FUNK',phase:2,bpm:112,beats:4,bars:16,style:'funk',delay:.12,feedback:.13},
    p2b:{name:'COSMIC DISCO',phase:2,bpm:118,beats:4,bars:16,style:'disco',delay:.16,feedback:.15},
    p3a:{name:'JAZZ GROOVE',phase:3,bpm:138,beats:4,bars:16,style:'jazz',delay:.09,feedback:.10},
    p3b:{name:'SPACE ROCK MOTORIK',phase:3,bpm:124,beats:4,bars:16,style:'motorik',delay:.14,feedback:.12},
    p4a:{name:'COSMIC DUB',phase:4,bpm:96,beats:4,bars:16,style:'dub',delay:.31,feedback:.23},
    p4b:{name:'CINEMATIC RETRO SPACE',phase:4,bpm:90,beats:4,bars:16,style:'cinematic',delay:.28,feedback:.14},
    danger:{name:'HIGH RISK ENCOUNTER',phase:0,bpm:128,beats:4,bars:12,style:'danger',delay:.12,feedback:.11,risk:true}
  });
  const PHASE_TRACKS = Object.freeze({1:['p1a','p1b'],2:['p2a','p2b'],3:['p3a','p3b'],4:['p4a','p4b']});
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const tier=n=>typeof TIERS!=='undefined'?TIERS.findIndex(t=>t.name===n):-1;
  const ROCKY=tier('ROCKY PLANET'),PULSAR=tier('PULSAR'),SMBH=tier('SUPER MASSIVE BLACK HOLE'),GALAXY=tier('GALAXY');

  class LoopTrack{
    constructor(engine,def,level=.32){
      this.engine=engine;this.def=def;this.level=level;this.bar=0;this.nextTime=0;this.timer=0;this.dead=false;
      const c=engine.ctx;
      this.input=c.createGain();this.volume=c.createGain();this.volume.gain.value=0;
      const dry=c.createGain();dry.gain.value=.92;this.input.connect(dry);dry.connect(this.volume);
      this.delay=c.createDelay(1.6);this.delay.delayTime.value=def.delay||.12;
      this.feedback=c.createGain();this.feedback.gain.value=def.feedback||.1;
      this.wet=c.createGain();this.wet.gain.value=def.risk?.18:.13;
      const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=def.risk?4300:6200;f.Q.value=.25;
      this.input.connect(this.delay);this.delay.connect(f);f.connect(this.wet);this.wet.connect(this.volume);f.connect(this.feedback);this.feedback.connect(this.delay);
      this.volume.connect(engine.master);
    }
    start(fade=.7){if(this.dead)return;this.nextTime=this.engine.ctx.currentTime+.06;this.setLevel(this.level,fade);this.tick();this.timer=setInterval(()=>this.tick(),110);}
    tick(){if(this.dead||this.engine.ctx.state==='closed')return;const h=this.engine.ctx.currentTime+1.15;while(this.nextTime<h){this.engine.renderBar(this,this.bar,this.nextTime);this.nextTime+=this.def.beats*60/this.def.bpm;this.bar=(this.bar+1)%this.def.bars;}}
    setLevel(v,d=.45){if(this.dead)return;const g=this.volume.gain,n=this.engine.ctx.currentTime;g.cancelScheduledValues(n);g.setValueAtTime(Math.max(.0001,g.value),n);g.linearRampToValueAtTime(Math.max(.0001,v),n+Math.max(.02,d));}
    stop(fade=.65){if(this.dead)return;this.dead=true;clearInterval(this.timer);const n=this.engine.ctx.currentTime,g=this.volume.gain;g.cancelScheduledValues(n);g.setValueAtTime(Math.max(.0001,g.value),n);g.linearRampToValueAtTime(.0001,n+fade);setTimeout(()=>{try{this.input.disconnect();this.delay.disconnect();this.feedback.disconnect();this.wet.disconnect();this.volume.disconnect();}catch(e){}},Math.ceil((fade+1.5)*1000));}
  }

  class SoundtrackEngine{
    constructor(){
      this.ctx=null;this.master=null;this.noise=null;this.base=null;this.risk=null;this.scene=null;this.phase=1;this.phaseStartEncounter=0;this.currentKey='';this.riskActive=false;this.unlocked=false;this.muted=false;
      try{this.muted=localStorage.getItem('cometio-music-muted-v1')==='1';}catch(e){}
      this.installUnlock();
    }
    installUnlock(){
      const unlock=()=>this.unlock();['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,unlock,{capture:true,passive:true}));
      document.addEventListener('visibilitychange',()=>{if(!this.ctx)return;if(document.hidden)this.ctx.suspend().catch(()=>{});else if(this.unlocked)this.ctx.resume().catch(()=>{});});
      window.addEventListener('keydown',e=>{if(String(e.key).toLowerCase()==='m')this.toggleMute();});
    }
    unlock(){
      if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:.72;this.master.connect(this.ctx.destination);this.makeNoise();}
      this.unlocked=true;if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});if(this.scene)this.sync(this.scene,true);
    }
    makeNoise(){const len=this.ctx.sampleRate*2,b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;}
    attach(scene){this.scene=scene;}
    toggleMute(){this.muted=!this.muted;try{localStorage.setItem('cometio-music-muted-v1',this.muted?'1':'0');}catch(e){}if(this.master&&this.ctx){const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(this.muted?0:.72,n+.18);}return !this.muted;}
    setVolume(v){if(!this.master||!this.ctx)return;v=Math.max(0,Math.min(1,Number(v)||0));const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(this.muted?0:v,n+.18);}
    inferPhase(scene){
      if(!scene)return this.phase||1;
      if(scene._activePhaseStart>=1&&scene._activePhaseStart<=3)return scene._activePhaseStart;
      if(scene._activePhaseCard?.phase>=1&&scene._activePhaseCard.phase<=4)return scene._activePhaseCard.phase;
      if(GALAXY>=0&&scene.tierIndex>=GALAXY)return 4;
      if(Array.isArray(scene.phase4Members)&&scene.phase4Members.length)return 4;
      const t=Number(scene.tierIndex)||0;
      if(SMBH>=0&&t>=SMBH)return this.phase===4?4:3;
      if(PULSAR>=0&&t>=PULSAR)return 3;
      if(ROCKY>=0&&t>=ROCKY)return 2;
      return 1;
    }
    setPhase(phase,scene=this.scene,force=false){phase=Math.max(1,Math.min(4,Number(phase)||1));if(scene)this.scene=scene;if(phase!==this.phase){this.phase=phase;this.phaseStartEncounter=Number(scene?.encounters)||0;force=true;}if(!this.ctx||!this.unlocked||!scene||scene.state==='HOME')return;this.chooseBase(scene,force);}
    chooseBase(scene,force=false){if(!this.ctx||!scene)return;const p=this.inferPhase(scene);if(p!==this.phase){this.phase=p;this.phaseStartEncounter=Number(scene.encounters)||0;force=true;}const rounds=Math.max(0,(Number(scene.encounters)||0)-this.phaseStartEncounter),slot=Math.floor(rounds/4)%2,key=PHASE_TRACKS[this.phase][slot];if(force||key!==this.currentKey)this.startBase(key);}
    startBase(key){if(!this.ctx||!TRACKS[key]||(this.currentKey===key&&this.base))return;const old=this.base;this.currentKey=key;const next=new LoopTrack(this,TRACKS[key],.32);this.base=next;next.start(.9);if(this.riskActive)next.setLevel(.045,.25);if(old)old.stop(.9);}
    home(){this.riskActive=false;if(this.risk){this.risk.stop(.35);this.risk=null;}if(this.base){this.base.stop(.65);this.base=null;}this.currentKey='';}
    sync(scene,force=false){if(scene)this.scene=scene;if(!this.ctx||!this.unlocked||!this.scene)return;if(this.scene.state==='HOME'){this.home();return;}if(this.scene.state==='P4_GAME_OVER'||this.scene.state==='GAME_OVER'){this.exitRisk();return;}this.setPhase(this.inferPhase(this.scene),this.scene,force);}
    dangerous(scene){const r=scene?.pending;if(!r)return false;const gap=Number(r.gap)||0,mass=Math.max(.0001,Number(r.massRatio)||1),grav=(Number(r.targetEscape)||0)/Math.max(1,Number(scene.player?.speedMS)||1);if(gap>=2||mass>=5||grav>=1.45)return true;if(r.choice==='ABSORB'&&Number(r.chance)<.67)return true;if(r.choice==='DEFLECT'&&((Number(r.fatalChance)||0)>.085||Number(r.chance)<.80))return true;if(r.choice==='AVOID'&&Number(r.chance)<.70)return true;return false;}
    enterRisk(scene){if(!this.ctx||!this.unlocked||!this.dangerous(scene)){this.exitRisk();return;}if(this.riskActive)return;this.riskActive=true;if(this.base)this.base.setLevel(.055,.32);this.risk=new LoopTrack(this,TRACKS.danger,.39);this.risk.start(.32);}
    exitRisk(){if(!this.riskActive&&!this.risk)return;this.riskActive=false;if(this.risk){this.risk.stop(.55);this.risk=null;}if(this.base)this.base.setLevel(.32,.75);}

    node(track,type='sine',freq=440,time=0,dur=.3,amp=.04,pan=0,attack=.008,release=.08,cutoff=7000,detune=0){
      const c=this.ctx,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),time);o.detune.value=detune;f.type='lowpass';f.frequency.value=cutoff;f.Q.value=.45;o.connect(f);f.connect(g);
      if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(track.input);}else g.connect(track.input);
      const a=Math.max(.002,attack),r=Math.max(.02,release),end=time+Math.max(.03,dur);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),time+a);g.gain.setValueAtTime(Math.max(.0002,amp*.72),Math.max(time+a,end-r));g.gain.exponentialRampToValueAtTime(.0001,end+r);o.start(time);o.stop(end+r+.03);
    }
    note(track,time,dur,midi,kind='lead',amp=.04,pan=0){
      const f=mtof(midi);
      if(kind==='bass'){this.node(track,'triangle',f,time,dur,amp,pan,.004,.08,1700);this.node(track,'sine',f/2,time,dur,amp*.22,pan,.004,.08,900);return;}
      if(kind==='pad'){this.node(track,'triangle',f,time,dur,amp,pan,.28,.45,4200);this.node(track,'sawtooth',f,time,dur,amp*.14,-pan,.32,.48,2500,-6);return;}
      if(kind==='organ'){this.node(track,'sine',f,time,dur,amp,pan,.004,.06,5000);this.node(track,'sine',f*2,time,dur,amp*.28,pan,.004,.06,5000);return;}
      if(kind==='rhodes'){this.node(track,'sine',f,time,dur,amp,pan,.006,.15,5200);this.node(track,'sine',f*2,time,dur,amp*.22,-pan,.006,.12,4600);return;}
      if(kind==='mallet'){this.node(track,'sine',f,time,dur,amp,pan,.002,.13,8000);this.node(track,'sine',f*2.01,time,Math.min(dur,.23),amp*.33,pan,.002,.05,8000);this.node(track,'sine',f*3.9,time,Math.min(dur,.16),amp*.12,-pan,.002,.04,8000);return;}
      if(kind==='twang'){this.node(track,'sawtooth',f,time,dur,amp,pan,.002,.10,3300);this.node(track,'triangle',f,time,dur,amp*.35,-pan,.002,.12,4600,3);return;}
      if(kind==='glass'){this.node(track,'sine',f,time,dur,amp,pan,.004,.22,9000);this.node(track,'sine',f*2,time,dur,amp*.16,-pan,.004,.18,8500);return;}
      this.node(track,'sawtooth',f,time,dur,amp,pan,.006,.10,5200);this.node(track,'triangle',f/2,time,dur,amp*.22,-pan,.006,.10,3200);
    }
    chord(track,time,dur,root,intervals,kind='pad',amp=.012){const n=intervals.length;intervals.forEach((iv,i)=>this.note(track,time,dur,root+iv,kind,amp,-.5+(n===1?0:i/(n-1))));}
    noiseHit(track,time,dur,amp,filter='highpass',freq=5000,pan=0){if(!this.noise)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type=filter;f.frequency.value=freq;f.Q.value=.7;s.connect(f);f.connect(g);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(track.input);}else g.connect(track.input);g.gain.setValueAtTime(Math.max(.0001,amp),time);g.gain.exponentialRampToValueAtTime(.0001,time+dur);s.start(time);s.stop(time+dur+.02);}
    kick(track,time,amp=.07){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(95,time);o.frequency.exponentialRampToValueAtTime(43,time+.15);o.connect(g);g.connect(track.input);g.gain.setValueAtTime(amp,time);g.gain.exponentialRampToValueAtTime(.0001,time+.19);o.start(time);o.stop(time+.21);}
    tom(track,time,freq=150,amp=.035){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(freq*.72,time+.16);o.connect(g);g.connect(track.input);g.gain.setValueAtTime(amp,time);g.gain.exponentialRampToValueAtTime(.0001,time+.2);o.start(time);o.stop(time+.22);}

    renderBar(t,bar,T){const b=60/t.def.bpm;switch(t.def.style){case'exotica':return this.renderExotica(t,bar,T,b);case'surf':return this.renderSurf(t,bar,T,b);case'funk':return this.renderFunk(t,bar,T,b);case'disco':return this.renderDisco(t,bar,T,b);case'jazz':return this.renderJazz(t,bar,T,b);case'motorik':return this.renderMotorik(t,bar,T,b);case'dub':return this.renderDub(t,bar,T,b);case'cinematic':return this.renderCinematic(t,bar,T,b);case'danger':return this.renderDanger(t,bar,T,b);}}

    renderExotica(t,bar,T,e){
      const prog=[[50,[0,3,7,10]],[53,[0,4,7,11]],[55,[0,5,7,10]],[48,[0,4,7,11]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,6*e+.08,r+12,ints,'pad',.009);this.note(t,T,1.15*e,r,'bass',.065);this.note(t,T+3*e,1.05*e,r+7,'bass',.050);
      if(bar%4!==3)(bar%2?[[0,0],[1,3],[3,7],[4,10]]:[[0,0],[2,7],[3,10],[5,7]]).forEach(([s,iv])=>this.note(t,T+s*e,.52*e,r+24+iv,'mallet',.020,s<3?-.25:.25));this.tom(t,T,110,.040);this.tom(t,T+3*e,145,.030);[2,5].forEach(s=>this.note(t,T+s*e,.20*e,84,'glass',.007,s<3?-.35:.35));
      const A=[[[0,62,1.4],[2,65,.8],[3,69,1.25],[5,67,.65]],[[0,65,1.1],[2,62,.8],[3,60,1.3],[5,62,.7]]],B=[[[0,69,1.2],[2,72,.8],[3,74,1.3],[5,72,.7]],[[0,69,1],[2,67,.8],[3,65,1.2],[5,62,.8]]],starts=[3,4,11,12];if(starts.includes(bar)){const block=bar>=11?B:A,ph=block[(bar===4||bar===12)?1:0];ph.forEach(([s,m,d])=>{this.note(t,T+s*e,d*e,m,'mallet',.034,.08);this.note(t,T+s*e,d*e,m-12,'glass',.007,-.08);});}
    }
    renderSurf(t,bar,T,b){
      const prog=[[40,[0,3,7,10]],[43,[0,4,7,10]],[45,[0,3,7,10]],[47,[0,5,7,10]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.05,r+12,ints,'organ',.008);(bar%2?[[0,0],[1.5,7],[2.5,10],[3.5,12]]:[[0,0],[1,7],[2,12],[3,7]]).forEach(([o,iv])=>this.note(t,T+o*b,.48*b,r+iv,'bass',.070));(bar%2?[0,2,3]:[.5,1.5,2.5,3.5]).forEach(o=>this.note(t,T+o*b,.18*b,r+12,'twang',.012,o<2?-.2:.2));this.kick(t,T,.055);this.kick(t,T+2*b,.055);this.noiseHit(t,T+b,.08,.018,'bandpass',3200);this.noiseHit(t,T+3*b,.08,.018,'bandpass',3200);if(bar%4===3)[[2.5,190],[3,160],[3.5,130]].forEach(([o,f])=>this.tom(t,T+o*b,f,.024));
      const A=bar===2?[[0,64,.55],[.75,67,.45],[1.5,71,.65],[2.75,67,.5]]:bar===3?[[0,64,.55],[1,62,.5],[2,59,.7],[3,62,.55]]:null,B=bar===9?[[0,67,.55],[.75,71,.45],[1.5,74,.65],[2.75,71,.5]]:bar===10?[[0,67,.55],[1,64,.5],[2,62,.7],[3,59,.55]]:null;(A||B||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'twang',.034,.1));
    }
    renderFunk(t,bar,T,b){
      const prog=[[45,[0,3,7,10]],[41,[0,4,7,11]],[48,[0,4,7,11]],[43,[0,4,7,9]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.05,r+12,ints,'pad',.009);(bar%2?[[0,0],[1,7],[2.5,12],[3.25,7]]:[[0,0],[1.5,7],[2.5,0],[3.25,10]]).forEach(([o,iv])=>this.note(t,T+o*b,.44*b,r+iv,'bass',.072));(bar%2?[1,2.5]:[.5,2,3]).forEach(o=>this.chord(t,T+o*b,.16*b,r+12,ints.slice(1),'organ',.010));this.kick(t,T,.060);this.kick(t,T+2.5*b,.060);[1,3].forEach(o=>this.noiseHit(t,T+o*b,.085,.017,'bandpass',3000));
      const p={2:[[0,69,.7],[1,72,.55],[2,76,.75],[3,72,.55]],3:[[0,69,.55],[.75,67,.4],[1.5,64,.7],[2.75,67,.55]],8:[[0,72,.55],[.75,76,.5],[1.5,79,.7],[2.75,76,.55]],9:[[0,72,.6],[1,69,.5],[2,67,.6],[3,64,.75]],14:[[0,69,.7],[1,72,.55],[2,76,.75],[3,72,.55]],15:[[0,69,.55],[.75,67,.4],[1.5,64,.7],[2.75,67,.55]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'lead',.030,.08));
    }
    renderDisco(t,bar,T,b){
      const prog=[[47,[0,3,7,10]],[43,[0,4,7,11]],[50,[0,4,7,11]],[45,[0,4,7,14]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.08,r+12,ints,'pad',.009);(bar%2?[[0,0],[1.5,7],[2.5,10],[3.5,12]]:[[0,0],[1,7],[2.5,12],[3.25,7]]).forEach(([o,iv])=>this.note(t,T+o*b,.40*b,r+iv,'bass',.066));[0,1,2,3].forEach(o=>this.kick(t,T+o*b,.042));[1,3].forEach(o=>this.noiseHit(t,T+o*b,.07,.013,'bandpass',3800));[0,1,2,3,4,5,6,7].forEach(k=>this.note(t,T+k*.5*b,.17*b,r+24+[0,7,11,14,7,11,14,19][k],'glass',.005,k%2?.35:-.35));
      const p={2:[[0,71,.65],[1,74,.55],[2,78,.75],[3,74,.55]],3:[[0,71,.55],[1.25,69,.5],[2.25,66,.65],[3.25,69,.5]],9:[[0,74,.55],[1,78,.55],[2,81,.75],[3.25,78,.5]],10:[[0,74,.6],[1,71,.5],[2.25,69,.6],[3,66,.75]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'glass',.027,.08));
    }
    renderJazz(t,bar,T,b){
      const prog=[[41,[0,3,7,10]],[46,[0,3,7,10]],[44,[0,4,7,10]],[43,[0,4,7,10]],[41,[0,3,7,10]],[39,[0,4,7,11]],[43,[0,4,7,10]],[41,[0,3,7,10]]],[r,ints]=prog[bar%8],comp=[[0,2.5],[.5,2,3.25],[0,1.75,3],[.5,2.5]][bar%4];comp.forEach(o=>this.chord(t,T+o*b,.48*b,r+12,ints.slice(1),'rhodes',.014));[0,1,2,3].forEach((o,i)=>this.note(t,T+o*b,.70*b,r+[0,7,10,7][i],'bass',.066));this.kick(t,T,.055);this.kick(t,T+2*b,.055);[1,3].forEach(o=>this.noiseHit(t,T+o*b,.08,.018,'bandpass',3000));
      const A0=[[0,65,.8],[1.25,68,.55],[2.25,70,.9],[3.4,68,.4]],A1=[[0,65,.7],[1,63,.55],[2,60,.9],[3.25,63,.5]],B0=[[0,65,.55],[.9,68,.55],[1.8,72,.75],[3,70,.55]],B1=[[0,68,.65],[1.25,65,.55],[2.15,63,.6],[3,60,.85]];let ph=null;if([0,2,4,6].includes(bar))ph=A0;if([1,3,5,7].includes(bar))ph=A1;if([8,10,12,14].includes(bar))ph=B0;if([9,11,13,15].includes(bar))ph=B1;(ph||[]).forEach(([o,m,d])=>{this.note(t,T+o*b,d*b,m,'lead',.030,.10);this.note(t,T+o*b,d*b,m-12,'rhodes',.007,-.10);});if(bar%4===3)[[2.5,[58,62,65]],[3.25,[60,63,67]]].forEach(([o,ch])=>ch.forEach((m,i)=>this.note(t,T+o*b,.28*b,m,'lead',.012,-.3+i*.3)));
    }
    renderMotorik(t,bar,T,b){
      const prog=[[40,[0,3,7,10]],[43,[0,4,7,11]],[36,[0,4,7,11]],[38,[0,5,7,12]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.05,r+12,ints,'pad',.009);for(let k=0;k<8;k++)this.note(t,T+k*.5*b,.30*b,r+(k===3||k===7?7:0),'bass',.045);[0,1,2,3].forEach(o=>this.kick(t,T+o*b,.040));[1,3].forEach(o=>this.noiseHit(t,T+o*b,.075,.015,'bandpass',3200));[0,7,12,7,3,7,12,7].forEach((iv,k)=>this.note(t,T+k*.5*b,.20*b,r+24+iv,'lead',.007,k%2?.3:-.3));
      const p={3:[[0,64,.75],[1,67,.55],[2,71,.85],[3.25,69,.5]],4:[[0,67,.65],[1,64,.55],[2.25,62,.6],[3,59,.8]],10:[[0,71,.65],[1,74,.55],[2,76,.8],[3,74,.55]],11:[[0,71,.6],[1.25,67,.5],[2.25,64,.6],[3,62,.75]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'lead',.027,.08));
    }
    renderDub(t,bar,T,b){
      const prog=[[45,[0,3,7,10]],[41,[0,4,7,11]],[48,[0,4,7,12]],[43,[0,5,7,10]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.05,r+12,ints,'pad',.005);(bar%2?[[0,0,.75],[2,7,.6],[3.25,10,.45]]:[[0,0,.9],[1.5,7,.55],[3,0,.75]]).forEach(([o,iv,d])=>this.note(t,T+o*b,d*b,r+iv,'bass',.082));[.5,1.5,2.5,3.5].forEach(o=>this.chord(t,T+o*b,.17*b,r+12,ints.slice(1),'organ',.011));this.kick(t,T,.060);if(bar%2===0)this.kick(t,T+2*b,.045);this.noiseHit(t,T+2*b,.075,.014,'bandpass',3600);
      const p={3:[[0,69,.7],[1,72,.55],[2.25,76,.75],[3.25,72,.5]],4:[[0,69,.55],[1.25,67,.45],[2.5,64,.7]],11:[[0,72,.6],[1,76,.55],[2,79,.8],[3.25,76,.45]],12:[[0,72,.55],[1.5,69,.5],[2.75,67,.7]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'mallet',.026,.08));
    }
    renderCinematic(t,bar,T,b){
      const prog=[[49,[0,3,7,10]],[45,[0,4,7,11]],[40,[0,4,7,12]],[47,[0,5,7,10]]],[r,ints]=prog[Math.floor(bar/2)%4];this.chord(t,T,4*b+.1,r+12,ints,'pad',.010);this.note(t,T,1.4*b,r,'bass',.060);this.note(t,T+2*b,1.4*b,r+7,'bass',.050);(ints[1]===3?[12,19,15,19]:[12,19,16,19]).forEach((iv,k)=>this.note(t,T+k*b,.25*b,r+iv,'glass',.007,k%2?.25:-.25));this.kick(t,T,.040);this.kick(t,T+2*b,.040);[1,3].forEach(o=>this.note(t,T+o*b,.08*b,88,'glass',.004,o===1?-.3:.3));
      const p={3:[[0,68,1],[1.5,71,.7],[2.75,73,.8]],4:[[0,71,.9],[1.75,68,.75],[3,66,.8]],10:[[0,73,.9],[1.25,76,.75],[2.75,78,.8]],11:[[0,76,.8],[1.5,73,.8],[3,71,.8]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'lead',.026,.08));
    }
    renderDanger(t,bar,T,b){
      const roots=[40,40,38,41],ints=[[0,3,7,10],[0,3,6,10],[0,3,7,10],[0,2,7,10]],r=roots[Math.floor(bar/2)%4],ch=ints[Math.floor(bar/2)%4];this.chord(t,T,4*b+.04,r+12,ch,'pad',.008);[0,0,7,0,3,0,6,0].forEach((iv,k)=>this.note(t,T+k*.5*b,.27*b,r+iv,'organ',.040,k%2?.05:-.05));this.kick(t,T,.070);this.kick(t,T+2*b,.070);[1,3].forEach(o=>this.noiseHit(t,T+o*b,.08,.020,'bandpass',2900));for(let k=0;k<8;k++)this.note(t,T+k*.5*b,.07*b,92,'glass',.003,k%2?.35:-.35);
      const p={2:[[0,64,.45],[.75,67,.35],[1.5,70,.45],[2.5,67,.35]],3:[[0,64,.4],[1,63,.35],[2,58,.55]],8:[[0,67,.4],[.75,70,.35],[1.5,73,.45],[2.5,70,.35]],9:[[0,67,.4],[1,64,.35],[2,63,.55]]};(p[bar]||[]).forEach(([o,m,d])=>this.note(t,T+o*b,d*b,m,'lead',.026,.10));
    }
  }

  const engine=new SoundtrackEngine(),proto=GameScene.prototype;
  const wrap=(name,fn)=>{const base=proto[name];if(typeof base!=='function')return;proto[name]=function(...args){return fn.call(this,base,args);};};
  function addMusicToggle(scene){if(!scene||!scene.ui||typeof scene.miniButton!=='function'||scene._musicToggleInjected)return;scene._musicToggleInjected=true;scene.miniButton(W-58,scene.Y(18),98,22,engine.muted?'MUSIC OFF':'MUSIC ON',C.purple,()=>{engine.toggleMute();scene._musicToggleInjected=false;scene.showHome();});}

  wrap('create',function(base,args){const r=base.apply(this,args);engine.attach(this);setTimeout(()=>engine.sync(this,true),0);return r;});
  wrap('showHome',function(base,args){engine.home();this._musicToggleInjected=false;const r=base.apply(this,args);addMusicToggle(this);return r;});
  wrap('startNewRun',function(base,args){engine.attach(this);engine.setPhase(1,this,true);const r=base.apply(this,args);engine.setPhase(1,this,true);return r;});
  wrap('resetRun',function(base,args){engine.attach(this);engine.setPhase(1,this,true);const r=base.apply(this,args);engine.sync(this,true);return r;});
  wrap('load',function(base,args){const r=base.apply(this,args);setTimeout(()=>engine.sync(this,true),0);return r;});
  wrap('startEncounter',function(base,args){const r=base.apply(this,args);setTimeout(()=>{engine.exitRisk();engine.sync(this,false);},0);return r;});
  wrap('drawEncounter',function(base,args){const r=base.apply(this,args);setTimeout(()=>engine.sync(this,false),0);return r;});
  wrap('showPhaseStartCard',function(base,args){const p=Number(args[0])||engine.inferPhase(this);engine.setPhase(p,this,true);return base.apply(this,args);});
  wrap('showPhaseCompleteCard',function(base,args){engine.exitRisk();const p=Number(args[0])||engine.inferPhase(this);engine.setPhase(p,this,false);return base.apply(this,args);});
  wrap('showPhase4SystemBirth',function(base,args){engine.setPhase(4,this,true);return base.apply(this,args);});
  wrap('reveal',function(base,args){engine.enterRisk(this);return base.apply(this,args);});
  wrap('drawResult',function(base,args){engine.exitRisk();return base.apply(this,args);});
  wrap('resolve',function(base,args){const r=base.apply(this,args);setTimeout(()=>{if(this.state==='P4_GAME_OVER'||this.state==='GAME_OVER')engine.exitRisk();},0);return r;});
  wrap('finishUniverse',function(base,args){engine.exitRisk();return base.apply(this,args);});

  setTimeout(()=>{try{const g=window.Phaser?.GAMES?.[0],s=g?.scene?.getScene?.('game');if(s){engine.attach(s);if(s.state==='HOME')addMusicToggle(s);engine.sync(s,true);}}catch(e){}},0);

  window.CometSoundtrack=Object.freeze({
    version:1,
    phaseTracks:{1:['SPACE EXOTICA','RETRO SPACE SURF'],2:['COSMIC FUNK','COSMIC DISCO'],3:['JAZZ GROOVE','SPACE ROCK MOTORIK'],4:['COSMIC DUB','CINEMATIC RETRO SPACE']},
    riskTrack:'HIGH RISK ENCOUNTER',twoTracksPerPhase:true,rotateEveryEncounters:4,riskStartsAfterChoiceLocked:true,
    toggleMute:()=>engine.toggleMute(),setVolume:v=>engine.setVolume(v),current:()=>({phase:engine.phase,track:TRACKS[engine.currentKey]?.name||null,risk:engine.riskActive,muted:engine.muted})
  });
})();
