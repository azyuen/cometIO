// cometIO audio settings + gameplay SFX v2
// Settings popup, shared Music/SFX sliders, louder output headroom,
// encounter animation sounds, tier-up shimmer, and sad game-over sting.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined') return;

  const MUSIC_KEY='cometio-music-volume-v1';
  const SFX_KEY='cometio-sfx-volume-v1';
  const MUSIC_GAIN_MAX=2.0;   // 50% ~= previous 100%
  const SFX_GAIN_MAX=1.64;   // 50% ~= previous 100%
  const hex=n=>`#${Number(n||0).toString(16).padStart(6,'0')}`;
  const saved=(key,fallback)=>{try{const v=Number(localStorage.getItem(key));return Number.isFinite(v)?Math.max(0,Math.min(100,v)):fallback;}catch(e){return fallback;}};
  const persist=(key,v)=>{try{localStorage.setItem(key,String(Math.round(v)));}catch(e){}};

  const oldMute=(()=>{try{return !!window.CometSoundtrack?.current?.().muted;}catch(e){return false;}})();
  let musicVolume=saved(MUSIC_KEY,oldMute?0:84);
  let sfxVolume=saved(SFX_KEY,72);
  let settingsOpen=false;
  let lastGameOverAt=0;

  class SFXEngine{
    constructor(){this.ctx=null;this.master=null;this.noise=null;}
    ensure(){
      if(!this.ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
        this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=(sfxVolume/100)*SFX_GAIN_MAX;this.master.connect(this.ctx.destination);
        const len=this.ctx.sampleRate*2,b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=b;
      }
      if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
      return true;
    }
    setVolume(v){sfxVolume=Math.max(0,Math.min(100,Number(v)||0));persist(SFX_KEY,sfxVolume);if(this.master&&this.ctx){const n=this.ctx.currentTime,g=this.master.gain;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime((sfxVolume/100)*SFX_GAIN_MAX,n+.08);}}
    tone(freq,time,dur,amp=.12,type='sine',endFreq=null,cutoff=9000,pan=0,attack=.004,release=.08){
      if(!this.ensure()||sfxVolume<=0)return;const c=this.ctx,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),time);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),time+dur);f.type='lowpass';f.frequency.value=cutoff;f.Q.value=.4;o.connect(f);f.connect(g);
      if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);}else g.connect(this.master);
      const end=time+dur,r=Math.min(release,Math.max(.02,dur*.45));g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),time+attack);g.gain.setValueAtTime(Math.max(.0002,amp*.68),Math.max(time+attack,end-r));g.gain.exponentialRampToValueAtTime(.0001,end+r);o.start(time);o.stop(end+r+.03);
    }
    noiseSweep(time,dur,amp=.06,startF=400,endF=5000,pan0=-.3,pan1=.3){
      if(!this.ensure()||!this.noise||sfxVolume<=0)return;const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='bandpass';f.Q.value=1.1;f.frequency.setValueAtTime(startF,time);f.frequency.exponentialRampToValueAtTime(endF,time+dur);s.connect(f);f.connect(g);let out=g;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.setValueAtTime(pan0,time);p.pan.linearRampToValueAtTime(pan1,time+dur);g.connect(p);out=p;}out.connect(this.master);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(amp,time+.03);g.gain.exponentialRampToValueAtTime(.0001,time+dur);s.start(time);s.stop(time+dur+.03);
    }
    scan(){if(!this.ensure())return;const n=this.ctx.currentTime;this.tone(520,n,.11,.055,'sine',720,5000,-.15);this.tone(880,n+.13,.13,.042,'sine',1060,7000,.18);}
    absorb(){if(!this.ensure())return;const n=this.ctx.currentTime;this.noiseSweep(n,.42,.075,2100,260,-.5,.05);this.tone(95,n+.28,.28,.14,'sine',46,1300,0);this.tone(190,n+.30,.16,.052,'triangle',112,2200,.05);}
    deflect(){if(!this.ensure())return;const n=this.ctx.currentTime;this.noiseSweep(n,.19,.04,1200,4600,-.25,.45);this.tone(330,n+.11,.10,.075,'triangle',520,5000,.25);this.tone(940,n+.17,.17,.045,'sine',690,7200,.45);}
    avoid(){if(!this.ensure())return;const n=this.ctx.currentTime;this.noiseSweep(n,.46,.055,350,3900,-.7,.72);this.tone(220,n+.04,.36,.032,'sine',440,2400,-.25);}
    tierUp(){if(!this.ensure())return;const n=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,n+i*.105,.42,.038,'sine',null,8500,(i-1.5)*.18,.003,.20));this.tone(261.63,n,.85,.026,'triangle',392,3500,0,.01,.30);}
    gameOver(){
      if(!this.ensure())return;const n=this.ctx.currentTime;
      [[659.25,0,.62],[523.25,.48,.72],[440,.98,.86],[329.63,1.58,1.12],[220,2.35,1.75]].forEach(([f,o,d],i)=>{this.tone(f,n+o,d,.050-i*.004,'triangle',i===4?196:null,4300,0,.02,.38);this.tone(f/2,n+o,d+.28,.018,'sine',null,1800,0,.03,.48);});
      [220,261.63,329.63].forEach((f,i)=>this.tone(f,n+.9,3.5,.016,'sine',null,2600,(i-1)*.15,.30,.80));
    }
  }
  const sfx=new SFXEngine();

  function musicGain(v=musicVolume){return Math.max(0,Math.min(100,Number(v)||0))/100*MUSIC_GAIN_MAX;}
  function applyMusicVolume(v=musicVolume){
    musicVolume=Math.max(0,Math.min(100,Number(v)||0));persist(MUSIC_KEY,musicVolume);
    const api=window.CometSoundtrack;if(!api)return;
    try{
      const muted=!!api.current?.().muted;
      if(musicVolume<=0&&!muted)api.toggleMute?.();
      if(musicVolume>0&&muted)api.toggleMute?.();
      api.setVolume?.(musicGain(musicVolume));
    }catch(e){}
  }
  function duckMusic(mult=.12){try{window.CometSoundtrack?.setVolume?.(musicGain(musicVolume)*mult);}catch(e){}}
  function restoreMusic(){applyMusicVolume(musicVolume);}

  ['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,()=>{setTimeout(()=>{applyMusicVolume();sfx.ensure();},0);},{capture:true,passive:true}));

  function nodeHasExactLabel(node,re){
    if(!node)return false;
    if(typeof node.text==='string'&&re.test(node.text.trim()))return true;
    return Array.isArray(node.list)&&node.list.some(c=>nodeHasExactLabel(c,re));
  }
  function removeLegacyAudioButton(scene){
    for(const child of [...(scene.ui?.list||[])]){
      if(!nodeHasExactLabel(child,/^(MUSIC (ON|OFF)|SETTINGS|⚙)$/))continue;
      try{scene.ui.remove(child,false);}catch(e){}try{child.destroy(true);}catch(e){}
    }
  }

  function popupText(scene,parent,x,y,text,size,color=C.white,opt={}){
    const t=scene.add.text(x,y,text,{fontFamily:FONT,fontSize:`${size}px`,fontStyle:opt.bold?'bold':'normal',color:hex(color),align:opt.align||'left',wordWrap:opt.width?{width:opt.width,useAdvancedWrap:true}:undefined}).setOrigin(opt.ox??0,opt.oy??0);if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));parent.add(t);return t;
  }
  function popupButton(scene,parent,x,y,w,h,label,color,cb,fontSize=11){
    const c=scene.add.container(x,y),g=scene.add.graphics();g.fillStyle(color,.14).fillRoundedRect(-w/2,-h/2,w,h,7);g.lineStyle(1.7,color,.90).strokeRoundedRect(-w/2,-h/2,w,h,7);const t=scene.add.text(0,0,label,{fontFamily:FONT,fontSize:`${fontSize}px`,fontStyle:'bold',color:'#fff'}).setOrigin(.5),hit=scene.add.rectangle(0,0,w,h,0xffffff,.001).setInteractive({useHandCursor:true});if(t.setResolution)t.setResolution(Math.min(window.devicePixelRatio||1,3));hit.on('pointerdown',cb);c.add([g,t,hit]);parent.add(c);return c;
  }
  function slider(scene,parent,label,y,getValue,setValue,color){
    // Keep every control comfortably inside the 24..396 popup bounds.
    const minusX=58,plusX=362,buttonW=34,x0=94,x1=326,w=x1-x0;
    popupText(scene,parent,52,y-44,label,10,C.white,{bold:true});
    const valueText=popupText(scene,parent,368,y-44,`${Math.round(getValue())}%`,10,color,{bold:true,ox:1});
    const bg=scene.add.graphics(),fill=scene.add.graphics(),thumb=scene.add.circle(0,y,9,color,1);parent.add([bg,fill,thumb]);
    bg.lineStyle(7,0x183248,1).lineBetween(x0,y,x1,y);bg.lineStyle(1,C.cyan,.28).lineBetween(x0,y,x1,y);
    const redraw=v=>{v=Math.max(0,Math.min(100,v));fill.clear();fill.lineStyle(7,color,.88).lineBetween(x0,y,x0+w*v/100,y);thumb.x=x0+w*v/100;valueText.setText(`${Math.round(v)}%`);};
    redraw(getValue());
    const hit=scene.add.rectangle((x0+x1)/2,y,w+18,42,0xffffff,.001).setInteractive({useHandCursor:true});parent.add(hit);
    const setFromPointer=p=>{const v=Math.max(0,Math.min(100,((p.x-x0)/w)*100));setValue(v);redraw(v);};
    hit.on('pointerdown',p=>setFromPointer(p));hit.on('pointermove',p=>{if(p.isDown)setFromPointer(p);});
    popupButton(scene,parent,minusX,y,buttonW,30,'−',color,()=>{const v=Math.max(0,getValue()-10);setValue(v);redraw(v);},13);
    popupButton(scene,parent,plusX,y,buttonW,30,'+',color,()=>{const v=Math.min(100,getValue()+10);setValue(v);redraw(v);},13);
  }

  function showSettings(scene){
    if(settingsOpen)return;settingsOpen=true;
    const root=scene.add.container(0,0);root.setDepth?.(10000);scene.ui.add(root);scene._audioSettingsPopup=root;
    const shade=scene.add.rectangle(W/2,H/2,W,H,0x000000,.72).setInteractive();root.add(shade);
    const top=scene.Y(190),panel=scene.add.graphics();panel.fillStyle(C.panel,.995).fillRoundedRect(24,top,372,430,12);panel.lineStyle(2,C.cyan,.88).strokeRoundedRect(24,top,372,430,12);root.add(panel);
    popupText(scene,root,W/2,top+30,'SETTINGS',19,C.white,{bold:true,ox:.5});popupText(scene,root,W/2,top+59,'AUDIO',8.5,C.cyan,{bold:true,ox:.5});
    slider(scene,root,'MUSIC',top+140,()=>musicVolume,v=>applyMusicVolume(v),C.purple);
    popupText(scene,root,52,top+172,'0 = OFF   •   50 ≈ OLD MAX   •   100 = BOOSTED',7.0,C.muted,{bold:true,width:320});
    slider(scene,root,'SOUND FX',top+250,()=>sfxVolume,v=>sfx.setVolume(v),C.orange);
    popupText(scene,root,52,top+282,'ENCOUNTERS • FLYBYS • IMPACTS • GAME OVER',7.0,C.muted,{bold:true,width:320});
    popupButton(scene,root,W/2,top+365,286,48,'CLOSE',C.cyan,()=>{settingsOpen=false;try{root.destroy(true);}catch(e){}scene._audioSettingsPopup=null;});
  }

  function addSettingsButton(scene){
    removeLegacyAudioButton(scene);
    if(!scene?.ui||typeof scene.miniButton!=='function')return;
    // LAB is at x=42, Y=31; mirror that baseline at the right edge.
    scene.miniButton(W-42,scene.Y(31),58,24,'⚙',C.purple,()=>showSettings(scene));
  }

  function playGameOver(scene){
    const now=Date.now();if(now-lastGameOverAt<1800)return;lastGameOverAt=now;duckMusic(.08);sfx.gameOver();
  }

  const proto=GameScene.prototype;
  const wrap=(name,fn)=>{const base=proto[name];if(typeof base!=='function')return;proto[name]=function(...args){return fn.call(this,base,args);};};

  wrap('showHome',function(base,args){settingsOpen=false;restoreMusic();const r=base.apply(this,args);removeLegacyAudioButton(this);addSettingsButton(this);return r;});
  wrap('startNewRun',function(base,args){restoreMusic();return base.apply(this,args);});
  wrap('resetRun',function(base,args){restoreMusic();return base.apply(this,args);});
  wrap('startEncounter',function(base,args){restoreMusic();return base.apply(this,args);});

  wrap('reveal',function(base,args){sfx.scan();return base.apply(this,args);});
  wrap('animate',function(base,args){
    const choice=args[0];
    if(choice==='ABSORB')setTimeout(()=>sfx.absorb(),430);
    else if(choice==='DEFLECT')setTimeout(()=>sfx.deflect(),390);
    else if(choice==='AVOID')setTimeout(()=>sfx.avoid(),120);
    return base.apply(this,args);
  });
  wrap('drawResult',function(base,args){const res=args[0]||{},r=base.apply(this,args);if(String(res.title||'').includes('TIER UP'))setTimeout(()=>sfx.tierUp(),100);if(res.survived===false)setTimeout(()=>playGameOver(this),90);return r;});
  wrap('resolve',function(base,args){const r=base.apply(this,args);setTimeout(()=>{if(this.state==='P4_GAME_OVER'||this.state==='GAME_OVER')playGameOver(this);},120);return r;});
  wrap('finishUniverse',function(base,args){restoreMusic();return base.apply(this,args);});

  setTimeout(()=>{applyMusicVolume();sfx.setVolume(sfxVolume);try{const g=window.Phaser?.GAMES?.[0],scene=g?.scene?.getScene?.('game');if(scene?.state==='HOME')addSettingsButton(scene);}catch(e){}},0);

  window.CometAudio=Object.freeze({
    version:2,
    getSettings:()=>({music:Math.round(musicVolume),sfx:Math.round(sfxVolume)}),
    setMusic:v=>applyMusicVolume(v),setSFX:v=>sfx.setVolume(v),
    preview:{scan:()=>sfx.scan(),absorb:()=>sfx.absorb(),deflect:()=>sfx.deflect(),avoid:()=>sfx.avoid(),tierUp:()=>sfx.tierUp(),gameOver:()=>sfx.gameOver()}
  });
})();