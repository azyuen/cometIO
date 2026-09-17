// cometIO UI music v1
// Uplifting related themes for Home and Collision Lab/Experiment screens.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const VOLUME_KEY='cometio-music-volume-v1';
  const getSaved=()=>{try{const v=Number(localStorage.getItem(VOLUME_KEY));return Number.isFinite(v)?Math.max(0,Math.min(100,v))/100:.84;}catch(e){return .84;}};
  const mtof=m=>440*Math.pow(2,(m-69)/12);

  class UIMusicEngine{
    constructor(){this.ctx=null;this.master=null;this.mode=null;this.timer=null;this.next=0;this.bar=0;this.unlocked=false;this.volume=getSaved();this.pending=null;this.noise=null;this.installUnlock();}
    installUnlock(){const u=()=>this.unlock();['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,u,{capture:true,passive:true}));document.addEventListener('visibilitychange',()=>{if(!this.ctx)return;if(document.hidden)this.ctx.suspend().catch(()=>{});else if(this.unlocked)this.ctx.resume().catch(()=>{});});}
    ensure(){if(this.ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);const len=this.ctx.sampleRate,b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;return true;}
    unlock(){if(!this.ensure())return;this.unlocked=true;if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});if(this.pending){const m=this.pending;this.pending=null;this.start(m);}}
    setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)||0));if(!this.master||!this.ctx)return;const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(this.mode?this.volume*.46:0,n+.12);}
    start(mode){if(mode!=='home'&&mode!=='lab')return;if(!this.unlocked){this.pending=mode;this.mode=mode;return;}if(!this.ensure())return;if(this.mode===mode&&this.timer)return;this.stop(.28,false);this.mode=mode;this.bar=0;this.next=this.ctx.currentTime+.06;const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(Math.max(.0001,g.value),n);g.linearRampToValueAtTime(Math.max(.0001,this.volume*.46),n+.55);this.tick();this.timer=setInterval(()=>this.tick(),100);if(mode==='lab')try{window.CometSoundtrack?.setVolume?.(0);}catch(e){}
    }
    stop(fade=.45,restore=true){this.pending=null;if(this.timer){clearInterval(this.timer);this.timer=null;}if(this.master&&this.ctx){const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(Math.max(.0001,g.value),n);g.linearRampToValueAtTime(.0001,n+fade);}this.mode=null;if(restore){const v=getSaved();try{window.CometSoundtrack?.setVolume?.(v);}catch(e){}}}
    tick(){if(!this.mode||!this.ctx)return;const bpm=this.mode==='home'?116:108,b=60/bpm,barDur=4*b,h=this.ctx.currentTime+1.1;while(this.next<h){this.renderBar(this.mode,this.bar,this.next,b);this.next+=barDur;this.bar=(this.bar+1)%16;}}
    osc(freq,time,dur,amp=.02,type='sine',pan=0,cutoff=6500,attack=.006,release=.12,detune=0){const c=this.ctx,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);o.detune.value=detune;f.type='lowpass';f.frequency.value=cutoff;f.Q.value=.35;o.connect(f);f.connect(g);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);}else g.connect(this.master);const e=time+dur,r=Math.min(release,Math.max(.025,dur*.4));g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),time+attack);g.gain.setValueAtTime(Math.max(.0002,amp*.72),Math.max(time+attack,e-r));g.gain.exponentialRampToValueAtTime(.0001,e+r);o.start(time);o.stop(e+r+.03);}
    note(midi,time,dur,kind='lead',amp=.02,pan=0){const f=mtof(midi);if(kind==='bass'){this.osc(f,time,dur,amp,'triangle',pan,1500,.004,.08);this.osc(f/2,time,dur,amp*.18,'sine',pan,800,.004,.10);return;}if(kind==='pad'){this.osc(f,time,dur,amp,'triangle',pan,4300,.25,.45);this.osc(f,time,dur,amp*.12,'sawtooth',-pan,2600,.28,.50,-7);return;}if(kind==='bell'){this.osc(f,time,dur,amp,'sine',pan,8500,.003,.20);this.osc(f*2,time,Math.min(dur,.25),amp*.16,'sine',-pan,9000,.003,.10);return;}if(kind==='pluck'){this.osc(f,time,dur,amp,'triangle',pan,5200,.002,.07);this.osc(f*2,time,Math.min(dur,.16),amp*.12,'sine',-pan,7500,.002,.05);return;}this.osc(f,time,dur,amp,'sine',pan,7000,.006,.15);}
    chord(root,ints,time,dur,amp=.008){ints.forEach((iv,i)=>this.note(root+iv,time,dur,'pad',amp,-.48+i*(.96/Math.max(1,ints.length-1))));}
    noiseHit(time,dur=.04,amp=.004,freq=6000){if(!this.noise)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=freq;s.connect(f);f.connect(g);g.connect(this.master);g.gain.setValueAtTime(amp,time);g.gain.exponentialRampToValueAtTime(.0001,time+dur);s.start(time);s.stop(time+dur+.02);}
    kick(time,amp=.022){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(76,time);o.frequency.exponentialRampToValueAtTime(43,time+.13);o.connect(g);g.connect(this.master);g.gain.setValueAtTime(amp,time);g.gain.exponentialRampToValueAtTime(.0001,time+.16);o.start(time);o.stop(time+.18);}
    renderBar(mode,bar,T,b){
      const prog=[[48,[0,4,7,11]],[43,[0,4,7,11]],[45,[0,3,7,10]],[41,[0,4,7,11]]],p=prog[Math.floor(bar/2)%4],root=p[0],ints=p[1];
      this.chord(root+12,ints,T,4*b+.05,mode==='home'?.0075:.0065);
      if(mode==='home'){
        [[0,0],[1.5,7],[2.5,12],[3.25,7]].forEach(([o,iv])=>this.note(root+iv,T+o*b,.42*b,'bass',.036));
        [0,2].forEach(o=>this.kick(T+o*b,.018));[.5,1.5,2.5,3.5].forEach(o=>this.noiseHit(T+o*b,.025,.0028,6800));
        [0,7,11,14,7,11,14,19].forEach((iv,k)=>this.note(root+24+iv,T+k*.5*b,.18*b,'bell',.0055,k%2?.28:-.28));
        const motifs={2:[[0,72,.7],[1,76,.55],[2,79,.75],[3.15,76,.5]],3:[[0,72,.6],[1.25,69,.5],[2.3,67,.65]],10:[[0,76,.65],[1,79,.55],[2,83,.75],[3.15,79,.5]],11:[[0,76,.55],[1.25,72,.5],[2.3,69,.65]]};
        (motifs[bar]||[]).forEach(([o,m,d])=>this.note(m,T+o*b,d*b,'bell',.023,.08));
      }else{
        [[0,0],[1,7],[2,12],[3,7]].forEach(([o,iv])=>this.note(root+iv,T+o*b,.36*b,'bass',.030));
        [0,2].forEach(o=>this.kick(T+o*b,.015));[.5,1.5,2.5,3.5].forEach(o=>this.noiseHit(T+o*b,.023,.0024,7200));
        const seq=[0,4,7,11,14,11,7,4];seq.forEach((iv,k)=>this.note(root+24+iv,T+k*.5*b,.15*b,'pluck',.007,k%2?.32:-.32));
        const motifs={4:[[0,67,.45],[.75,72,.4],[1.5,76,.55],[2.5,74,.45],[3.25,72,.45]],5:[[0,69,.55],[1.2,72,.45],[2.3,76,.6]],12:[[0,72,.45],[.75,76,.4],[1.5,79,.55],[2.5,77,.45],[3.25,76,.45]],13:[[0,74,.55],[1.2,76,.45],[2.3,79,.6]]};
        (motifs[bar]||[]).forEach(([o,m,d])=>this.note(m,T+o*b,d*b,'pluck',.020,.06));
      }
    }
  }

  const engine=new UIMusicEngine(),proto=GameScene.prototype;
  const wrap=(name,fn)=>{const base=proto[name];if(typeof base!=='function')return;proto[name]=function(...args){return fn.call(this,base,args);};};

  wrap('showHome',function(base,args){const r=base.apply(this,args);engine.start('home');return r;});
  wrap('showDevLab',function(base,args){const r=base.apply(this,args);engine.start('lab');return r;});
  wrap('showLabExperiment',function(base,args){const r=base.apply(this,args);engine.start('lab');return r;});
  wrap('showDevResult',function(base,args){const r=base.apply(this,args);engine.start('lab');return r;});
  wrap('startLabPhaseRun',function(base,args){engine.stop(.35,true);return base.apply(this,args);});
  ['startNewRun','resetRun','startEncounter','drawEncounter','showPhaseStartCard','showPhaseCompleteCard','showPhase4SystemBirth'].forEach(name=>wrap(name,function(base,args){engine.stop(.30,true);return base.apply(this,args);}));

  setTimeout(()=>{try{const g=window.Phaser?.GAMES?.[0],scene=g?.scene?.getScene?.('game');if(scene?.state==='HOME')engine.start('home');else if(scene?.state==='DEV_LAB'||scene?.state==='DEV_EXP')engine.start('lab');}catch(e){}},0);

  window.CometUIMusic=Object.freeze({version:1,homeTheme:'LAUNCH WINDOW',labTheme:'CURIOSITY ENGINE',setVolume:v=>engine.setVolume(v),startHome:()=>engine.start('home'),startLab:()=>engine.start('lab'),stop:()=>engine.stop(.35,true),current:()=>engine.mode});
})();
