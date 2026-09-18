// Phase 4 UI match v1.
// New-filename late overlay to avoid stale iOS/PWA caches.
// Recreates the FINAL polished Phase 3 control layout for Phase 4 only.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometPhase4) return;
  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = Number(P4.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
  const SUPERCLUSTER = Number(P4.superclusterTier ?? TIERS.findIndex(t => t.name === 'SUPERCLUSTER'));
  const MAX_T = .92;
  const previousDrawPrompt = proto.drawPrompt;

  function active(scene) {
    const tier = Number(scene?.tierIndex);
    if (!Number.isFinite(tier) || tier < GALAXY || tier >= SUPERCLUSTER) return false;
    if (scene?._labSandboxRun === true && String(scene?._labSandboxPhase || '').toUpperCase() === 'PHS4') return true;
    if (scene?._devPhase4Test === true && scene?._devModeActive !== true) return true;
    if (scene?._p4GravityForce === true) return true;
    return !scene?._devModeActive;
  }

  function trajectory(scene) {
    if (!Number.isFinite(Number(scene._p4Trajectory))) scene._p4Trajectory = 0;
    return clamp(Number(scene._p4Trajectory), -MAX_T, MAX_T);
  }
  function angularMomentum(t) { return clamp((t + MAX_T) / (MAX_T * 2), 0, 1); }
  function members(scene) { return Array.isArray(scene?.phase4Members) ? scene.phase4Members : []; }
  function maxSac(scene) { return Math.max(0, members(scene).length - 1); }
  function sacCount(scene) {
    const selected = Math.max(0, Math.floor(Number(scene?._p4OrbitalSacrificeCount) || 0));
    scene._p4OrbitalSacrificeCount = Math.min(selected, maxSac(scene));
    return scene._p4OrbitalSacrificeCount;
  }
  const colour = n => '#' + Number(n || 0).toString(16).padStart(6, '0');

  function addOrbitalSacrifice(scene) {
    const available = maxSac(scene), selected = sacCount(scene);
    // Literal final Phase 3 geometry.
    const cx = 106, cy = scene.Y(617), w = 182, h = 32;
    const c = scene.add.container(cx, cy), g = scene.add.graphics();
    g.fillStyle(C.panel, .97).fillRoundedRect(-w/2, -h/2, w, h, 5);
    g.lineStyle(1.15, selected ? C.orange : C.cyan, .78).strokeRoundedRect(-w/2, -h/2, w, h, 5);

    const label = scene.add.text(-78, -7, 'ORBITAL SACRIFICE', {
      fontFamily: FONT, fontSize: '6.2px', fontStyle: 'bold', color: '#8db7ca'
    }).setOrigin(0, .5);
    const count = scene.add.text(0, 7, `${selected} / ${available}`, {
      fontFamily: FONT, fontSize: '8.8px', fontStyle: 'bold',
      color: selected ? '#ff9d3d' : '#f7fbff'
    }).setOrigin(.5);

    const minusHit = scene.add.rectangle(-70, 7, 27, 23, 0xffffff, .001).setInteractive({ useHandCursor:true });
    const plusHit = scene.add.rectangle(70, 7, 27, 23, 0xffffff, .001).setInteractive({ useHandCursor:true });
    const minus = scene.add.text(-70, 7, '−', {
      fontFamily: FONT, fontSize:'16px', fontStyle:'bold',
      color: selected ? '#20d9ff' : '#526f7b'
    }).setOrigin(.5);
    const plus = scene.add.text(70, 7, '+', {
      fontFamily: FONT, fontSize:'16px', fontStyle:'bold',
      color: selected < available ? '#20d9ff' : '#526f7b'
    }).setOrigin(.5);

    minusHit.on('pointerdown', () => {
      if (sacCount(scene) <= 0) return;
      scene._p4OrbitalSacrificeCount = sacCount(scene) - 1;
      scene.drawEncounter();
    });
    plusHit.on('pointerdown', () => {
      if (sacCount(scene) >= maxSac(scene)) return;
      scene._p4OrbitalSacrificeCount = sacCount(scene) + 1;
      scene.drawEncounter();
    });

    c.add([g, label, count, minusHit, plusHit, minus, plus]);
    scene.ui.add(c);
  }

  function addTrajectory(scene) {
    // Literal final Phase 3 geometry.
    const top = scene.Y(644), height = 64, left = 15, right = 405;
    const pg = scene.add.graphics();
    pg.fillStyle(C.panel, .97).fillRoundedRect(left, top, right-left, height, 7);
    pg.lineStyle(1.5, C.cyan, .82).strokeRoundedRect(left, top, right-left, height, 7);
    scene.ui.add(pg);

    let t = trajectory(scene), a = angularMomentum(t);
    scene.addText(28, scene.Y(650), 'TRAJECTORY', 7.6, C.cyan, { bold:true });
    const radial = scene.addText(28, scene.Y(666), 'RADIAL', 7.1, C.green, { bold:true });
    const tangential = scene.addText(392, scene.Y(666), 'TANGENTIAL', 7.1, C.orange, { ox:1, bold:true });

    const x0 = 103, x1 = 303, width = x1-x0, y = scene.Y(678);
    const track = scene.add.graphics();
    track.lineStyle(6, 0x183248, 1).lineBetween(x0, y, x1, y);
    track.lineStyle(2.5, C.cyan, .72).lineBetween(x0, y, x1, y);
    scene.ui.add(track);

    const thumb = scene.add.circle(x0 + a*width, y, 8, C.white, 1).setStrokeStyle(2, C.cyan, 1);
    scene.ui.add(thumb);
    const momentum = scene.addText(W/2, scene.Y(688), '', 6.55, C.white, { ox:.5, bold:true });

    function paint(value) {
      scene._p4Trajectory = clamp(value, -MAX_T, MAX_T);
      t = trajectory(scene); a = angularMomentum(t);
      thumb.x = x0 + a*width;
      const word = a < .34 ? 'LOW' : a < .67 ? 'MEDIUM' : 'HIGH';
      momentum.setText(`ANGULAR MOMENTUM: ${word}`);
      momentum.setColor?.(a < .34 ? colour(C.green) : a > .66 ? colour(C.orange) : colour(C.white));
      radial.setColor?.(colour(C.green));
      tangential.setColor?.(colour(C.orange));
    }
    paint(t);

    const hit = scene.add.rectangle((x0+x1)/2, y, width+26, 32, 0xffffff, .001).setInteractive({ useHandCursor:true });
    scene.ui.add(hit);
    let dragging = false;
    const fromPointer = p => ((clamp(p.x, x0, x1)-x0)/width*2-1)*MAX_T;
    hit.on('pointerdown', p => { dragging = true; paint(fromPointer(p)); });
    hit.on('pointermove', p => { if (dragging && p.isDown) paint(fromPointer(p)); });
    const finish = p => {
      if (!dragging) return;
      dragging = false;
      if (p) paint(fromPointer(p));
      scene.drawEncounter();
    };
    hit.on('pointerup', finish);
    hit.on('pointerout', p => { if (dragging && !p.isDown) finish(p); });
  }

  function actionButton(scene, x, label, color, canonical, textureKey) {
    const y = scene.Y(786), w = 122, h = 96;
    const c = scene.add.container(x, y), g = scene.add.graphics();
    g.fillStyle(color, .17).fillRoundedRect(-w/2, -h/2, w, h, 7);
    g.lineStyle(3, color, .95).strokeRoundedRect(-w/2, -h/2, w, h, 7);

    let icon;
    if (scene.textures?.exists(textureKey)) {
      icon = scene.add.image(0, -16, textureKey).setDisplaySize(54, 54);
    } else {
      icon = scene.add.graphics();
      icon.fillStyle(color, .9).fillCircle(0, -16, 14);
    }

    const txt = scene.add.text(0, 27, label, {
      fontFamily: FONT, fontSize:'16px', fontStyle:'bold', color:'#fff'
    }).setOrigin(.5);
    if (txt.setResolution) txt.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, .001).setInteractive({ useHandCursor:true });
    hit.on('pointerdown', () => scene.choose(canonical));
    c.add([g, icon, txt, hit]); scene.ui.add(c);
  }

  proto.drawPrompt = function(...args) {
    if (!active(this)) return previousDrawPrompt.apply(this, args);
    addOrbitalSacrifice(this);
    addTrajectory(this);
    actionButton(this, 73, 'CAPTURE', C.green, 'ABSORB', 'action-absorb-phase4');
    actionButton(this, 210, 'GRAZE', C.orange, 'DEFLECT', 'action-deflect-phase4');
    actionButton(this, 347, 'AVOID', C.blue, 'AVOID', 'action-avoid-phase4');
  };

  window.CometPhase4UIMatchV1 = Object.freeze({
    enabled:true,
    version:1,
    source:'final-polished-phase3-layout',
    radial:'green',
    tangential:'orange'
  });
})();