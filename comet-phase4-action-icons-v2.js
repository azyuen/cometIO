// Phase 4 action buttons using the supplied galaxy-scale sprite art.
(() => {
  if (!window.CometPhase4) return;
  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = P4.galaxyTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const baseDrawPrompt = proto.drawPrompt;

  function active(scene) {
    return !scene._devModeActive && scene.tierIndex >= GALAXY && scene.tierIndex < SUPERCLUSTER;
  }

  function iconButton(scene, x, label, color, canonical, textureKey) {
    const y = scene.Y(771), w = 122, h = 96;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-w/2, -h/2, w, h, 7);

    const icon = scene.add.image(0, -16, textureKey).setDisplaySize(54, 54);
    const text = scene.add.text(0, 27, label, {
      fontFamily: FONT, fontSize:'16px', fontStyle:'bold', color:'#fff'
    }).setOrigin(.5);
    if (text.setResolution) text.setResolution(Math.min(window.devicePixelRatio || 1, 3));

    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({useHandCursor:true});
    hit.on('pointerdown', () => scene.choose(canonical));
    c.add([g, icon, text, hit]);
    scene.ui.add(c);
  }

  proto.drawPrompt = function() {
    if (!active(this)) return baseDrawPrompt.call(this);

    const y = this.Y(636), g = this.add.graphics();
    g.fillStyle(C.panel,.98).fillRoundedRect(10,y,400,78,8);
    g.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,y,400,78,8);
    this.ui.add(g);
    this.addText(W/2,y+17,'A COSMIC SYSTEM IS AHEAD.',14.5,C.white,{ox:.5,bold:true});
    this.addText(W/2,y+44,'HOW WILL YOUR SYSTEM INTERACT?',10.5,C.muted,{ox:.5,bold:true});

    iconButton(this,73,'CAPTURE',C.green,'ABSORB','action-absorb-phase4');
    iconButton(this,210,'GRAZE',C.orange,'DEFLECT','action-deflect-phase4');
    iconButton(this,347,'AVOID',C.blue,'AVOID','action-avoid-phase4');
  };

  window.CometPhase4ActionIconsV2 = Object.freeze({
    enabled:true,
    capture:'action-absorb-phase4',
    graze:'action-deflect-phase4',
    avoid:'action-avoid-phase4',
    suppliedSpriteArt:true
  });
})();