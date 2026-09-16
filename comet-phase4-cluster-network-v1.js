// Galaxy Cluster visual/model refinement.
// At cluster scale, persistent members become galaxies in an irregular gravitational cluster:
// centrally concentrated, scattered in depth, with only sparse nearest-neighbour filaments.
(() => {
  if(!window.CometPhase4SystemV6 || !window.CometPhase4)return;
  const proto=GameScene.prototype,P4=window.CometPhase4;
  const GALAXY=P4.galaxyTier,CLUSTER=P4.clusterTier,SUPERCLUSTER=P4.superclusterTier;
  const BLACK_HOLE=TIERS.findIndex(t=>t.name==='BLACK HOLE');
  const SMBH=P4.firstTier;
  const baseSetPlayer=proto.setPlayer,baseStartEncounter=proto.startEncounter,baseDrawObject=proto.drawObject,baseResolve=proto.resolve;

  const PROFILES=['andromeda','milkyway','whirlpool','pinwheel','triangulum','generic'];
  function hash(s=''){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h);}
  function rand(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x);}
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
      galaxyProfile:galaxyProfileFor(member,index),source:'cluster-member-galaxy',
      coreIdentityId:hasBlackHoleCore?member.identityId:null,
      coreNamedSpriteBase:hasBlackHoleCore?member.namedSpriteBase:null,
      coreName:hasBlackHoleCore?(member.realName||member.name):null,blackHoleCore:hasBlackHoleCore
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
    const p={andromeda:[2,.42,1.35],milkyway:[4,.62,1.28],whirlpool:[2,.82,1.58],pinwheel:[4,.94,1.68],triangulum:[3,.82,1.40],generic:[3,.68,1.43]}[profile]||[3,.68,1.43];
    g.fillStyle(color,.055).fillEllipse(0,0,radius*2.2,radius*(.9+p[1]));
    for(let arm=0;arm<p[0];arm++){
      const start=arm*Math.PI*2/p[0];g.lineStyle(Math.max(1,radius*.12),color,.60).beginPath();
      for(let j=0;j<=13;j++){const t=j/13,a=start+t*Math.PI*p[2],d=radius*(.12+.86*t),px=Math.cos(a)*d,py=Math.sin(a)*d*p[1];if(!j)g.moveTo(px,py);else g.lineTo(px,py);}g.strokePath();
    }
    if(member.blackHoleCore){g.fillStyle(0x03040a,.98).fillCircle(0,0,Math.max(2,radius*.20));g.lineStyle(Math.max(1,radius*.07),C.purple,.90).strokeCircle(0,0,Math.max(2.6,radius*.27));}
    else g.fillStyle(0xfff0c4,.90).fillCircle(0,0,Math.max(1.5,radius*.13));
    c.add(g);parent.add(c);
    const dx=(index%3-1)*2.4,dy=((index*2)%3-1)*1.8;
    const drift=scene.tweens.add({targets:c,x:x+dx,y:y+dy,angle:index%2?4:-4,duration:4600+(index%5)*520,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    parent.once('destroy',()=>{try{drift.stop();}catch(e){}});
    return c;
  }

  function clusterSlot(member,index,radius){
    const seed=hash(`${member?.memberId||member?.realName||member?.name||'galaxy'}:${index}`)+31;
    const angle=rand(seed)*Math.PI*2;
    // Bias toward the centre but retain a broad halo of outlying galaxies.
    const radial=(.12+Math.pow(rand(seed+11),.78)*.72)*radius;
    const x=Math.cos(angle)*radial+(rand(seed+23)-.5)*radius*.16;
    const y=Math.sin(angle)*radial*.70+(rand(seed+41)-.5)*radius*.12;
    return {x,y};
  }

  function sparseLinks(g,points,radius){
    if(points.length<2)return;
    const used=new Set();let drawn=0,max=Math.min(10,Math.max(4,points.length-1));
    // Connect each galaxy only to a nearby neighbour. This produces an irregular cluster/filament
    // texture rather than five radial spokes or a geometric web.
    for(let i=0;i<points.length&&drawn<max;i++){
      let best=-1,bestD=Infinity;
      for(let j=0;j<points.length;j++){
        if(i===j)continue;
        const dx=points[i].x-points[j].x,dy=points[i].y-points[j].y,d=dx*dx+dy*dy;
        if(d<bestD){bestD=d;best=j;}
      }
      if(best<0)continue;
      const key=i<best?`${i}:${best}`:`${best}:${i}`;
      if(used.has(key)||Math.sqrt(bestD)>radius*.72)continue;
      used.add(key);drawn++;
      g.lineStyle(Math.max(1,radius*.012),drawn%3===0?C.purple:C.cyan,.12+(drawn%2)*.035)
        .lineBetween(points[i].x,points[i].y,points[best].x,points[best].y);
    }
    // A couple of faint cross-cluster filaments stop the cloud looking like isolated pairs.
    for(let i=0;i<Math.min(3,Math.floor(points.length/4));i++){
      const a=(i*3)%points.length,b=(a+Math.floor(points.length/2)+1)%points.length;
      g.lineStyle(1,i%2?C.cyan:C.purple,.075).lineBetween(points[a].x,points[a].y,points[b].x,points[b].y);
    }
  }

  function drawClusterCloud(scene,x,y,radius,object,members,glow=false){
    const c=scene.add.container(x,y),g=scene.add.graphics();
    if(glow)g.fillStyle(C.cyan,.022).fillCircle(0,0,radius*1.20);
    g.fillStyle(C.cyan,.018).fillEllipse(0,0,radius*2.04,radius*1.46);
    g.fillStyle(C.purple,.012).fillEllipse(-radius*.08,radius*.04,radius*1.58,radius*1.12);

    const visible=(members||[]).slice(-16);
    const centreIndex=Math.max(0,visible.findIndex(m=>m.blackHoleCore));
    const centreMember=visible[centreIndex]||visible[0];
    const others=visible.filter((_,i)=>i!==centreIndex);
    const points=others.map((m,i)=>clusterSlot(m,i,radius*.92));
    if(centreMember)points.push({x:(rand(hash(centreMember.realName||centreMember.name)+5)-.5)*radius*.10,y:(rand(hash(centreMember.realName||centreMember.name)+9)-.5)*radius*.07,centre:true});
    sparseLinks(g,points,radius);
    c.add(g);

    others.forEach((m,i)=>{
      const p=points[i],depth=.82+rand(hash(m.realName||m.name)+i*17)*.32;
      miniGalaxy(scene,c,p.x,p.y,Math.max(5.2,radius*.095*depth),m,i);
    });
    if(centreMember){const p=points[points.length-1];miniGalaxy(scene,c,p.x,p.y,Math.max(7.2,radius*.135),centreMember,99);}
    if((members||[]).length>visible.length){const t=scene.add.text(0,radius*.91,`+${members.length-visible.length} GALAXIES`,{fontFamily:FONT,fontSize:'6px',fontStyle:'bold',color:'#8db7ca'}).setOrigin(.5);c.add(t);}
    scene.ui.add(c);return c;
  }

  proto.drawObject=function(x,y,radius,object,mystery=false,glow=false){
    if(!mystery&&Number(object?.tier)===CLUSTER){
      let members=[];
      if(object===this.player){normalizeClusterMembers(this);members=this.phase4Members||[];}
      else if(Array.isArray(object.phase4Members))members=object.phase4Members.map(asClusterGalaxy);
      else{for(let i=0;i<10;i++)members.push(asClusterGalaxy({name:`MEMBER ${i+1}`,realName:`MEMBER ${i+1}`,tier:GALAXY,kind:'galaxy',color:i%2?C.cyan:C.purple},i));}
      return drawClusterCloud(this,x,y,radius,object,members,glow);
    }
    return baseDrawObject.call(this,x,y,radius,object,mystery,glow);
  };

  window.CometPhase4ClusterNetworkV1=Object.freeze({enabled:true,memberScale:'GALAXIES',clusterCloud:true,filamentPlacement:false,sparseRandomLinks:true,blackHoleHostGalaxies:true,noOrbitalRotation:true});
})();