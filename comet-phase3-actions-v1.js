// Phase 3 action language + gravity-pass animation.
// Internal mechanics remain ABSORB / DEFLECT / AVOID so scoring and outcome logic stay stable.
// Only the player-facing Phase 3 vocabulary changes:
//   ABSORB  -> MERGE
//   DEFLECT -> SLINGSHOT
//   AVOID   -> ESCAPE
(() => {
  const proto = GameScene.prototype;
  const baseChoice = proto.choice;
  const baseAnimate = proto.animate;

  function phase3Active(scene) {
    const pulsar = TIERS.findIndex(t => t.name === 'PULSAR');
    const galaxy = typeof window !== 'undefined' && window.CometPhase4?.galaxyTier != null
      ? Number(window.CometPhase4.galaxyTier)
      : TIERS.findIndex(t => t.name === 'GALAXY');
    const start = pulsar >= 0 ? pulsar : 14;
    const end = galaxy >= 0 ? galaxy : TIERS.length;
    return scene.tierIndex >= start && scene.tierIndex < end;
  }

  function phase3Label(label) {
    if (label === 'ABSORB') return 'MERGE';
    if (label === 'DEFLECT') return 'SLINGSHOT';
    if (label === 'AVOID') return 'ESCAPE';
    return label;
  }

  function findActionText(container, originalLabel) {
    return (container?.list || []).find(child => child?.text === originalLabel) || null;
  }

  proto.choice = function(x, y, label, color, risk) {
    const before = new Set(this.ui?.list || []);
    const result = baseChoice.call(this, x, y, label, color, risk);
    if (!phase3Active(this)) return result;

    // choice() returns no container in the existing action-icon implementation, so locate the new
    // container just added to the scene and relabel only its visible text. The icon and choose(label)
    // callback remain the existing ABSORB/DEFLECT/AVOID assets/mechanics exactly as requested.
    const container = [...(this.ui?.list || [])].reverse().find(child => !before.has(child) && Array.isArray(child?.list));
    const text = findActionText(container, label);
    if (text) {
      text.setText(phase3Label(label));
      if (label === 'DEFLECT') text.setFontSize?.('13px');
    }
    return result;
  };

  function lensingArc(scene, x, y, radius, alpha = .48) {
    const g = scene.add.graphics();
    g.lineStyle(2, C.purple, alpha);
    g.beginPath();
    g.arc(x, y, radius, Math.PI * .18, Math.PI * 1.42, false);
    g.strokePath();
    g.lineStyle(1.5, C.cyan, alpha * .7);
    g.beginPath();
    g.arc(x, y, radius + 6, Math.PI * .72, Math.PI * 1.92, false);
    g.strokePath();
    scene.ui.add(g);
    scene.tweens.add({targets:g,alpha:0,duration:850,ease:'Sine.out',onComplete:()=>g.destroy()});
  }

  function grazeSpark(scene, x, y, rough) {
    const flash = scene.add.circle(x, y, rough ? 5 : 3.5, rough ? C.orange : C.cyan, .92);
    scene.ui.add(flash);
    scene.tweens.add({targets:flash,scale:rough?2.7:2,alpha:0,duration:280,ease:'Quad.out',onComplete:()=>flash.destroy()});
    const count = rough ? 8 : 4;
    for (let i=0;i<count;i++) {
      const a = Phaser.Math.FloatBetween(-1.25,-.25);
      const s = scene.add.circle(x,y,Phaser.Math.FloatBetween(.8,1.8),rough?C.orange:C.cyan,.9);
      scene.ui.add(s);
      scene.tweens.add({targets:s,x:x+Math.cos(a)*Phaser.Math.Between(12,30),y:y+Math.sin(a)*Phaser.Math.Between(10,25),alpha:0,duration:Phaser.Math.Between(220,390),onComplete:()=>s.destroy()});
    }
  }

  function phase3Slingshot(scene, p, o, pr, or) {
    const result = String(scene.pending?.result || 'clean').toLowerCase();
    if (result === 'catastrophic') return false; // compact-gravity capture animation remains authoritative.

    const blackHole = o?.cometVisual?.object?.kind === 'blackhole' || /BLACK HOLE/.test(String(scene.other?.name || TIERS[scene.other?.tier]?.name || ''));
    const cx = 222;
    const cy = scene.Y(370);
    const sx = p.x;
    const sy = p.y;
    const startDiameter = Math.max(3, pr * 2);
    const rough = result === 'rough';

    scene.tweens.killTweensOf(p);
    scene.tweens.killTweensOf(o);
    scene.tweens.add({targets:o,x:cx,y:cy,duration:240,ease:'Sine.inOut'});
    lensingArc(scene,cx,cy,Math.max(18,or+8),blackHole?.62:.42);

    // A cubic gravity-assist path: approach from the left/below, skim the compact object's outer
    // visual edge, then leave upward/right. It reads as trajectory curvature rather than a collision.
    const clearance = Math.max(16, or + pr * .32 + 7);
    const c1x = cx - 92, c1y = cy + 68;
    const c2x = cx - clearance, c2y = cy - clearance * .30;
    const ex = W + 44, ey = scene.Y(214);
    let sparked = false;

    scene.tweens.addCounter({
      from:0,to:1,duration:1050,ease:'Sine.inOut',
      onUpdate:tw=>{
        const t=tw.getValue(),u=1-t;
        p.x=u*u*u*sx + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*ex;
        p.y=u*u*u*sy + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ey;
        // Rotate along the curved escape trajectory, not as a sharp ricochet.
        p.angle = -34*t;
        const near = Math.sin(Math.PI*t);
        if (rough && typeof p.setVisualDisplayDiameter === 'function') p.setVisualDisplayDiameter(startDiameter*(1-.10*near));
        if (!sparked && t>.50) {
          sparked=true;
          grazeSpark(scene,p.x,p.y,rough);
        }
      }
    });

    scene.time.delayedCall(1180,()=>scene.resolve());
    return true;
  }

  proto.animate = function(choice,p,o,pr,or) {
    if (phase3Active(this) && choice === 'DEFLECT') {
      const handled = phase3Slingshot(this,p,o,pr,or);
      if (handled) return;
    }
    return baseAnimate.call(this,choice,p,o,pr,or);
  };

  window.CometPhase3Actions = Object.freeze({
    enabled:true,
    labels:Object.freeze({ABSORB:'MERGE',DEFLECT:'SLINGSHOT',AVOID:'ESCAPE'}),
    mechanicsUnchanged:true,
    deflectAnimation:'curved-gravity-assist-graze'
  });
})();
