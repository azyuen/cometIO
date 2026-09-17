// Phase 3 trajectory mechanics: make compact-object encounters strategic rather than a post-choice
// high-risk popup. The player sets RADIAL <-> TANGENTIAL approach before MERGE / SLING / ESCAPE.
// Tangential motion raises angular momentum and favours flyby/escape; radial motion favours merger
// but increases capture risk. One orbital may be committed in advance as an emergency gravity assist.
(() => {
  if (typeof GameScene === 'undefined') return;
  const proto = GameScene.prototype;
  const baseDrawArena = proto.drawArena;
  const baseDrawPrompt = proto.drawPrompt;
  const baseChoice = proto.choice;
  const baseChoose = proto.choose;
  const baseStartEncounter = proto.startEncounter;

  const PULSAR = TIERS.findIndex(t => t.name === 'PULSAR');
  const SMBH = TIERS.findIndex(t => t.name === 'SUPER MASSIVE BLACK HOLE');
  const MAX_T = .92;

  function active(scene) {
    const tier = Number(scene?.tierIndex);
    return PULSAR >= 0 && SMBH >= 0 && tier >= PULSAR && tier <= SMBH && !scene._devModeActive;
  }
  function trajectory(scene) {
    if (!Number.isFinite(Number(scene._p3Trajectory))) scene._p3Trajectory = 0;
    return clamp(Number(scene._p3Trajectory), -MAX_T, MAX_T);
  }
  function angularMomentum(t) { return clamp((t + MAX_T) / (MAX_T * 2), 0, 1); }
  function riskWord(choice, t, scene) {
    const a = angularMomentum(t);
    const gap = Number(scene?.other?.tier || 0) - Number(scene?.tierIndex || 0);
    if (choice === 'ABSORB') {
      const q = clamp(.76 - a * .58 - Math.max(0, gap) * .13, .04, .92);
      return q > .64 ? 'BEST MERGE' : q > .36 ? 'POSSIBLE' : 'VERY LOW';
    }
    if (choice === 'DEFLECT') {
      const q = clamp(.24 + a * .68 - Math.max(0, gap) * .06, .08, .94);
      return q > .72 ? 'STRONG' : q > .45 ? 'GOOD' : 'RISKY';
    }
    const q = clamp(.30 + a * .64 - Math.max(0, gap) * .07, .08, .96);
    return q > .78 ? 'HIGH' : q > .52 ? 'GOOD' : 'RISKY';
  }

  proto.startEncounter = function(...args) {
    this._p3Trajectory = 0;
    this._p3OrbitalAssist = false;
    return baseStartEncounter.apply(this, args);
  };

  // Phase 3 is no longer a mystery-choice phase: identify the gravity source before trajectory setup.
  proto.drawArena = function(...args) {
    const result = baseDrawArena.apply(this, args);
    if (!active(this) || !this.otherSprite?.active) return result;
    const x = this.otherSprite.x, y = this.otherSprite.y;
    try { this.otherSprite.destroy(true); } catch (e) {}
    this.otherSprite = this.drawObject(x, y, 42, this.other, false, true);
    // Replace the old UNKNOWN label in the live arena.
    const visit = node => {
      if (!node) return;
      if (typeof node.text === 'string' && node.text.trim() === 'UNKNOWN') {
        node.setText('IDENTIFIED'); node.setColor?.('#ff9f43');
      }
      if (Array.isArray(node.list)) node.list.forEach(visit);
    };
    visit(this.ui);
    this.addText(W - 14, this.Y(620), this.other.realName || this.other.name, 7.2, C.orange, {ox:1,bold:true,width:190,align:'right'});
    return result;
  };

  // Keep existing button art/Phase-3 relabelling, but replace generic risk captions with live trajectory guidance.
  proto.choice = function(x, y, label, color, risk) {
    if (active(this)) risk = riskWord(label, trajectory(this), this);
    return baseChoice.call(this, x, y, label, color, risk);
  };

  function addTrajectoryControl(scene) {
    const y = scene.Y(669), x0 = 72, x1 = 348, width = x1 - x0;
    const t = trajectory(scene), a = angularMomentum(t);
    scene.addText(W/2, scene.Y(624), 'TRAJECTORY', 8.8, C.cyan, {ox:.5,bold:true});
    scene.addText(x0, scene.Y(641), 'RADIAL', 7.7, C.orange, {ox:.5,bold:true});
    scene.addText(x1, scene.Y(641), 'TANGENTIAL', 7.7, C.green, {ox:.5,bold:true});
    scene.addText(x0, scene.Y(653), 'DIRECT', 5.8, C.muted, {ox:.5,bold:true});
    scene.addText(x1, scene.Y(653), 'SIDEWAYS FLYBY', 5.8, C.muted, {ox:.5,bold:true});

    const track = scene.add.graphics();
    track.lineStyle(7, 0x183248, 1).lineBetween(x0, y, x1, y);
    track.lineStyle(3, C.cyan, .68).lineBetween(x0, y, x1, y);
    scene.ui.add(track);
    const thumbX = x0 + a * width;
    const thumb = scene.add.circle(thumbX, y, 9, C.white, 1).setStrokeStyle(2, C.cyan, 1);
    scene.ui.add(thumb);

    const momentum = a < .34 ? 'LOW' : a < .67 ? 'MEDIUM' : 'HIGH';
    scene.addText(W/2, scene.Y(685), `ANGULAR MOMENTUM: ${momentum}`, 7.2, a > .66 ? C.green : a < .34 ? C.orange : C.white, {ox:.5,bold:true});

    const hit = scene.add.rectangle(W/2, y, width + 30, 38, 0xffffff, .001).setInteractive({useHandCursor:true});
    scene.ui.add(hit);
    const update = pointer => {
      const frac = clamp((pointer.x - x0) / width, 0, 1);
      scene._p3Trajectory = (frac * 2 - 1) * MAX_T;
      // Redraw the same encounter so labels and angular-momentum teaching update live.
      scene.drawEncounter();
    };
    hit.on('pointerdown', update);
    hit.on('pointermove', p => { if (p.isDown) update(p); });

    if ((Number(scene.orbitalCount) || 0) > 0) {
      const on = scene._p3OrbitalAssist === true;
      const by = scene.Y(709);
      const button = scene.add.container(W/2, by), g = scene.add.graphics();
      g.fillStyle(on ? C.orange : C.panel, on ? .20 : .95).fillRoundedRect(-151,-13,302,26,5);
      g.lineStyle(1.3, on ? C.orange : C.cyan, .86).strokeRoundedRect(-151,-13,302,26,5);
      const text = scene.add.text(0,0,on?'ORBITAL ASSIST ARMED • COST 1':'USE ORBITAL ASSIST • COST 1',{fontFamily:FONT,fontSize:'7.6px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      const bhit = scene.add.rectangle(0,0,302,26,0xffffff,.001).setInteractive({useHandCursor:true});
      bhit.on('pointerdown',()=>{scene._p3OrbitalAssist=!on;scene.drawEncounter();});
      button.add([g,text,bhit]); scene.ui.add(button);
    }
  }

  proto.drawPrompt = function(...args) {
    if (!active(this)) return baseDrawPrompt.apply(this, args);
    // Compact Phase-3 decision panel: encounter is already identified, so use this space for trajectory.
    const g = this.add.graphics();
    g.fillStyle(C.panel,.98).fillRoundedRect(10,this.Y(612),400,112,8);
    g.lineStyle(2,C.cyan,.88).strokeRoundedRect(10,this.Y(612),400,112,8);this.ui.add(g);
    addTrajectoryControl(this);
    this.choice(73,this.Y(786),'ABSORB',C.green,'');
    this.choice(210,this.Y(786),'DEFLECT',C.orange,'');
    this.choice(347,this.Y(786),'AVOID',C.blue,'');
  };

  function fatalChance(p) {
    if (Number.isFinite(Number(p?.fatalChance))) return clamp(Number(p.fatalChance),0,1);
    if (Number.isFinite(Number(p?.chance))) return clamp(1-Number(p.chance),0,1);
    return p?.success === false ? 1 : 0;
  }

  function applyTrajectory(scene, choice, pending) {
    const t = trajectory(scene), a = angularMomentum(t);
    pending.phase3Trajectory = t;
    pending.angularMomentum = a;
    pending.trajectoryLabel = a < .34 ? 'RADIAL' : a > .66 ? 'TANGENTIAL' : 'OBLIQUE';

    // Radial approach improves merger commitment; tangential approach improves flyby/escape.
    if (choice === 'ABSORB') {
      const baseSafe = clamp(Number(pending.chance) || (pending.success ? .6 : .2), .01, .99);
      let safe = clamp(baseSafe * (1.22 - .48*a), .015, .985);
      if (pending.compactGravityReverse) {
        const baseFatal = fatalChance(pending);
        const fatal = clamp(baseFatal * (1.22 - .66*a), .015, .985);
        safe = 1 - fatal;
        pending.fatalChance = fatal;
        pending.fragmentChance = safe;
      }
      pending.chance = safe;
      pending.success = Math.random() < safe;
      if (pending.compactGravityReverse) pending.result = pending.success ? 'fragment' : 'catastrophic';
      else if (!pending.success) pending.result = pending.result || 'catastrophic';
    } else if (choice === 'DEFLECT') {
      const oldFatal = fatalChance(pending);
      const fatal = clamp(oldFatal * (1.18 - .72*a), .002, .92);
      const cleanBase = clamp(Number(pending.cleanChance) || .45, 0, 1-fatal);
      const clean = clamp(cleanBase * (.72 + .68*a), .04, 1-fatal);
      const roll = Math.random();
      pending.fatalChance = fatal; pending.cleanChance = clean; pending.chance = 1-fatal;
      pending.result = roll < fatal ? 'catastrophic' : roll < fatal+clean ? 'clean' : 'rough';
      pending.success = pending.result !== 'catastrophic';
    } else {
      const base = clamp(Number(pending.chance) || .5, .01, .99);
      const chance = clamp(base * (.72 + .55*a), .08, .995);
      pending.chance = chance; pending.success = Math.random() < chance;
    }

    // Pre-committed orbital assist: one member is sacrificed to exchange energy/angular momentum
    // with the encounter. It is strongest for SLING/ESCAPE and deliberately cannot make MERGE safe.
    if (scene._p3OrbitalAssist && (Number(scene.orbitalCount)||0) > 0) {
      scene.orbitalCount = Math.max(0, Number(scene.orbitalCount)-1); scene.craters = scene.orbitalCount;
      pending.orbitalsSacrificed = 1; pending.phase3OrbitalAssist = true;
      if (choice === 'ABSORB') {
        const fatal = fatalChance(pending) * .78;
        pending.fatalChance = fatal; pending.chance = 1-fatal;
        pending.success = Math.random() >= fatal;
        if (pending.compactGravityReverse) pending.result = pending.success ? 'fragment' : 'catastrophic';
      } else if (choice === 'DEFLECT') {
        const fatal = fatalChance(pending) * .48;
        pending.fatalChance = fatal; pending.chance = 1-fatal;
        const roll = Math.random();
        pending.result = roll < fatal ? 'catastrophic' : 'clean'; pending.success = pending.result !== 'catastrophic';
      } else {
        pending.chance = clamp(Number(pending.chance)+.18,.08,.995); pending.success=Math.random()<pending.chance;
      }
    }
    return pending;
  }

  proto.choose = function(choice) {
    if (!active(this) || this.state !== 'APPROACH') return baseChoose.call(this, choice);
    // Crucially bypass the old post-choice HIGH-RISK orbital popup. Trajectory and orbital assist
    // have already been selected; pressing an action is the commitment.
    let pending = this.outcome(choice);
    pending = applyTrajectory(this, choice, pending);
    this.pending = pending;
    this.state = 'REVEAL';
    this.tweens.killAll();
    this.reveal(choice);
  };

  window.CometPhase3Trajectory = Object.freeze({
    enabled:true,
    endpoints:['RADIAL','TANGENTIAL'],
    teachesAngularMomentum:true,
    preActionDecision:true,
    orbitalAssistCost:1,
    oldHighRiskPopupBypassed:true
  });
})();
