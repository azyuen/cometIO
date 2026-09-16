// Galaxy Cluster visual/model refinement.
// At cluster scale, persistent members become galaxies distributed along a filament network rather than orbitals.
(() => {
  if(!window.CometPhase4SystemV6 || !window.CometPhase4)return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const BLACK_HOLE=TIERS.findIndex(t=>t.name==='BLACK HOLE');
  const SMBH=P4.firstTier;
  const baseSetPlayer=proto.setPlayer,baseStartEncounter=proto.startEncounter,baseDrawObject=proto.drawObject,baseResolve=proto.resolve;

  const PROFILES=['andromeda','milkyway','whirlpool','pinwheel','triangulum','generic'];
  function hash(s=''){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h);}
  function galaxyProfileFor(m,i){return m.galaxyProfile||PROFILES[(hash(m.realName||m.name)+i)%PROFILES.length];}

  function asClusterGalaxy(member,index){
    if(!member)return member;
    if(member.kind==='galaxy'||Number(member.tier)>=GALAXY)return {...member,galaxyProfile:galaxyProfileFor(member,index)};
    const originalTier=Number(member.tier)||0;
    const hasBlackHoleCore=originalTier===BLACK_HOLE||originalTier===SMBH||member.kind==='blackhole';
    const t=TIERS[GALAXY];
    return {
      ...member,
      memberId:member.memberId||`cluster-galaxy-${Date.now().toString(36)}-${index}`,
      sourceMemberId:member.sourceMemberId||member.memberId||null,
      name:hasBlackHoleCore?`${member.realName||member.name} HOST GALAXY`:'MEMBER GALAXY',
      realName:hasBlackHoleCore?`${member.realName||member.name} HOST GALAXY`:'MEMBER GALAXY',
      tier:GALAXY,kind:'galaxy',radiusM:t.r*(.62+(index%4)*.09),massKg:t.m*(.58+(index%5)*.11),speedMS:t.v,
      galaxyProfile:galaxyProfileFor(member,index),
      source:'cluster-member-galaxy',
      coreIdentityId:hasBlackHoleCore?member.identityId:null,
      coreNamedSpriteBase:hasBlackHoleCore?member.namedSpriteBase:null,
      coreName:hasBlackHoleCore?(member.realName||member.name):null,
      blackHoleCore:hasBlackHoleCore
    };
  }

  function normalizeClusterMembers(scene){
    if(scene.tierIndex<CLUSTER||!Array.isArray(scene.phase4Members)||!scene.phase4Members.length)return;
    scene.phase4Members=scene.phase4Members.map(asClusterGalaxy);
    scene.systemCaptures=scene.phase4Members.length;
    if(scene.player){scene.player.phase4System=true;scene.player.phase4CaptureCount=scene.phase4Members.length;}
  }

  proto.setPlayer=function(resetSpeed=false){const r=baseSetPlayer.call(this,resetSpeed);normalizeClusterMembers(this);return r;};
  proto.startEncounter=function(){normalizeClusterMembers(this);return baseStartEncounter.call(this);};
  proto.resolve=function(){const r=baseResolve.call(this);normalizeClusterMembers(this);return r;};

  function miniGalaxy(scene,parent,x,y,radius,member,index){
    const c=scene.add.container(x,y),g=scene.add.graphics(),color=member.color||((index%2)?C.cyan:C.purple),profile=galaxyProfileFor(member,index);
    const p={
      andromeda:[2,.42,1.35],milkyway:[4,.62,1.28],whirlpool:[2,.82,1.58],pinwheel:[4,.94,1.68],triangulum:[3,.82,1.40],generic:[3,.68,1.43]
    }[profile]||[3,.68,1.43];
    g.fillStyle(color,.055).fillEllipse(0,0,radius*2.2,radius*(.9+p[1]));
    for(let arm=0;arm<p[0];arm++){
      const start=arm*Math.PI*2/p[0];g.lineStyle(Math.max(1,radius*.12),color,.60).beginPath();
      for(let j=0;j<=13;j++){const t=j/13,a=start+t*Math.PI*p[2],d=radius*(.12+.86*t),px=Math.cos(a)*d,py=Math.sin(a)*d*p[1];if(!j)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();
    }
    if(member.blackHoleCore){g.fillStyle(0x03040a,.98).fillCircle(0,0,Math.max(2,radius*.20));g.lineStyle(Math.max(1,radius*.07),C.purple,.90).strokeCircle(0,0,Math.max(2.6,radius*.27));}
    else g.fillStyle(0xfff0c4,.90).fillCircle(0,0,Math.max(1.5,radius*.13));
    c.add(g);parent.add(c);
    const drift=scene.tweens.add({targets:c,angle:index%2?5:-5,duration:5200+(index%4)*600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    parent.once('destroy',()=>{try{drift.stop();}catch(e){}});
    return c;
  }

  function filamentSlot(index,count,radius){
    const arms=5,arm=index%arms,lane=Math.floor(index/arms),a=-Math.PI/2+arm*(Math.PI*2/arms);
    const t=Math.min(.92,.34+lane*.22+(index%2)*.055),bend=(arm%2?1:-1)*radius*.11*Math.sin(t*Math.PI);
    return {x:Math.cos(a)*radius*t + Math.cos(a+Math.PI/2)*bend,y:Math.sin(a)*radius*t*.72 + Math.sin(a+Math.PI/2)*bend*.55,arm,t};
  }

  function drawClusterNetwork(scene,x,y,radius,object,members,glow=false){
    const c=scene.add.container(x,y),g=scene.add.graphics();
    if(glow)g.fillStyle(C.cyan,.025).fillCircle(0,0,radius*1.22);
    const outer=radius*1.02,anchors=[];
    for(let arm=0;arm<5;arm++){const a=-Math.PI/2+arm*Math.PI*2/5;anchors.push({x:Math.cos(a)*outer,y:Math.sin(a)*outer*.72});}
    anchors.forEach((p,i)=>{g.lineStyle(Math.max(1.3,radius*.022),i%2?C.cyan:C.purple,.26).lineBetween(0,0,p.x,p.y);const q=anchors[(i+1)%anchors.length];g.lineStyle(1,C.cyan,.11).lineBetween(p.x*.62,p.y*.62,q.x*.62,q.y*.62);});
    g.fillStyle(C.cyan,.025).fillEllipse(0,0,radius*2.05,radius*1.48);c.add(g);

    const visible=(members||[]).slice(-14);
    visible.forEach((m,i)=>{const s=filamentSlot(i,visible.length,outer*.93),rr=Math.max(5.5,radius*(i===0?.12:.10));miniGalaxy(scene,c,s.x,s.y,rr,m,i);});
    const centreMember=visible.find(m=>m.blackHoleCore)||visible[0];
    if(centreMember)miniGalaxy(scene,c,0,0,Math.max(7,radius*.14),centreMember,99);
    if((members||[]).length>visible.length){const t=scene.add.text(0,radius*.92,`+${members.length-visible.length} GALAXIES`,{fontFamily:FONT,fontSize:'6px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5);c.add(t);}
    scene.ui.add(c);return c;
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    if(!mystery&&Number(object?.tier)===CLUSTER){
      let members=[];
      if(object===this.player){normalizeClusterMembers(this);members=this.phase4Members||[];}
      else if(Array.isArray(object.phase4Members))members=object.phase4Members.map(asClusterGalaxy);
      else{
        const n=8;for(let i=0;i<n;i++)members.push(asClusterGalaxy({name:`MEMBER ${i+1}`,realName:`MEMBER ${i+1}`,tier:GALAXY,kind:'galaxy',color:i%2?C.cyan:C.purple},i));
      }
      return drawClusterNetwork(this,x,y,radius,object,members,glow);
    }
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  window.CometPhase4ClusterNetworkV1=Object.freeze({enabled:true,memberScale:'GALAXIES',filamentPlacement:true,blackHoleHostGalaxies:true,noOrbitalRotation:true});
})();