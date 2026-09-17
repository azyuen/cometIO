// Phase 3 trajectory mechanics v2.
// The player sets RADIAL <-> TANGENTIAL before MERGE / SLING / ESCAPE.
// v2 fixes two issues from v1:
// 1) extreme SMBH gravity could crush the base AVOID chance before trajectory was applied, so even
//    maximum tangential angular momentum barely helped;
// 2) redrawing on pointer-down interrupted slider dragging.
// High tangential angular momentum now represents a genuinely large impact parameter: it strongly
// lowers capture probability without making survival certain, while radial approaches remain lethal.
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
    const lab = scene?._labSandboxRun === true;
    return PULSAR >= 0 && SMBH >= 0 && tier >= PULSAR && tier <= SMBH && (!scene._devModeActive || lab);
  }
  function trajectory(scene) {
    if (!Number.isFinite(Number(scene._p3Trajectory))) scene._p3Trajectory = 0;
    return clamp(Number(scene._p3Trajectory), -MAX_T, MAX_T);
  }
  function angularMomentum(t) { return clamp((t + MAX_T) / (MAX_T * 2), 0, 1); }
  function curve(a, power = 1.65) { return Math.pow(clamp(a,0,1), power); }
  function speedRatio(scene) {
    return clamp((Number(scene?.player?.speedMS)||1) / Math.max(1, Number(scene?.other?.speedMS)||1), .15, 3);
  }
  function speedAdjustment(scene) {
    // Existing speed remains relevant, but cannot erase the geometric protection of a large impact parameter.
    const ratio = speedRatio(scene);
    return clamp(Math.log10(ratio) * .10, -.07, .07);
  }

  function predictedSurvival(scene, choice, a) {
    const gap = Math.max(0, Number(scene?.other?.tier||0)-Number(scene?.tierIndex||0));
    const high = curve(a);
    const speed = speedAdjustment(scene);
    if (choice === 'AVOID') {
      // Tangential trajectory means the object never dives deeply into the gravity well.
      return clamp(.16 + high * .76 - gap * .025 + speed, .08, .94);
    }
    if (choice === 'DEFLECT') {
      // A sling needs a closer pass than ESCAPE, so its survival ceiling is deliberately lower.
      return clamp(.12 + high * .70 - gap * .035 + speed, .06, .88);
    }
    // MERGE remains an all-in choice. High angular momentum mostly converts a failed capture attempt
    // into a survivable shear/flyby rather than making the merger itself likely.
    return clamp(.06 + high * .60 - gap * .045 + speed*.5, .025, .72);
  }

  function riskWord(choice, t, scene) {
    const a = angularMomentum(t);
    if (choice === 'ABSORB') {
      const mergeBias = clamp(.82 - a*.70 - Math.max(0,(scene.other?.tier||0)-scene.tierIndex)*.10,.02,.90);
      return mergeBias > .62 ? 'BEST MERGE' : mergeBias > .32 ? 'POSSIBLE' : 'VERY LOW';
    }
    const s = predictedSurvival(scene, choice, a);
    return s >= .82 ? 'VERY HIGH' : s >= .68 ? 'HIGH' : s >= .48 ? 'GOOD' : s >= .28 ? 'RISKY' : 'EXTREME';
  }

  proto.startEncounter = function(...args) {
    this._p3Trajectory = 0;
    this._p3OrbitalAssist = false;
    return baseStartEncounter.apply(this, args);
  };

  proto.drawArena = function(...args) {
    const result = baseDrawArena.apply(this, args);
    if (!active(this) || !this.otherSprite?.active) return result;
    const x = this.otherSprite.x, y = this.otherSprite.y;
    try { this.otherSprite.destroy(true); } catch (e) {}
    this.otherSprite = this.drawObject(x, y, 42, this.other, false, true);
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

  proto.choice = function(x, y, label, color, risk) {
    if (active(this)) risk = riskWord(label, trajectory(this), this);
    return baseChoice.call(this, x, y, label, color, risk);
  };

  function addTrajectoryControl(scene) {
    const y = scene.Y(669), x0 = 72, x1 = 348, width = x1 - x0;
    let t = trajectory(scene), a = angularMomentum(t);
    scene.addText(W/2, scene.Y(624), 'TRAJECTORY', 8.8, C.cyan, {ox:.5,bold:true});
    scene.addText(x0, scene.Y(641), 'RADIAL', 7.7, C.orange, {ox:.5,bold:true});
    scene.addText(x1, scene.Y(641), 'TANGENTIAL', 7.7, C.green, {ox:.5,bold:true});
    scene.addText(x0, scene.Y(653), 'DIRECT', 5.8, C.muted, {ox:.5,bold:true});
    scene.addText(x1, scene.Y(653), 'SIDEWAYS FLYBY', 5.8, C.muted, {ox:.5,bold:true});

    const track = scene.add.graphics();
    track.lineStyle(7, 0x183248, 1).lineBetween(x0, y, x1, y);
    track.lineStyle(3, C.cyan, .68).lineBetween(x0, y, x1, y);
    scene.ui.add(track);
    const thumb = scene.add.circle(x0 + a*width, y, 9, C.white, 1).setStrokeStyle(2, C.cyan, 1);
    scene.ui.add(thumb);
    const momentumText = scene.addText(W/2, scene.Y(685), '', 7.2, C.white, {ox:.5,bold:true});

    function paint(value) {
      scene._p3Trajectory = clamp(value,-MAX_T,MAX_T);
      t = trajectory(scene); a = angularMomentum(t);
      thumb.x = x0 + a*width;
      const momentum = a < .34 ? 'LOW' : a < .67 ? 'MEDIUM' : 'HIGH';
      momentumText.setText(`ANGULAR MOMENTUM: ${momentum}`);
      momentumText.setColor?.(a > .66 ? '#25f29a' : a < .34 ? '#ff9d3d' : '#f7fbff');
    }
    paint(t);

    const hit = scene.add.rectangle(W/2, y, width + 34, 42, 0xffffff, .001).setInteractive({useHandCursor:true});
    scene.ui.add(hit);
    let dragging = false;
    const fromPointer = pointer => ((clamp(pointer.x,x0,x1)-x0)/width*2-1)*MAX_T;
    hit.on('pointerdown', pointer => { dragging=true; paint(fromPointer(pointer)); });
    hit.on('pointermove', pointer => { if (dragging && pointer.isDown) paint(fromPointer(pointer)); });
    const finish = pointer => {
      if (!dragging) return;
      dragging=false;
      if (pointer) paint(fromPointer(pointer));
      // Only redraw after the gesture finishes, so dragging cannot destroy its own hit area.
      scene.drawEncounter();
    };
    hit.on('pointerup', finish);
    hit.on('pointerout', pointer => { if (dragging && !pointer.isDown) finish(pointer); });

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
    const t = trajectory(scene), a = angularMomentum(t), high = curve(a);
    pending.phase3Trajectory = t;
    pending.angularMomentum = a;
    pending.trajectoryLabel = a < .34 ? 'RADIAL' : a > .66 ? 'TANGENTIAL' : 'OBLIQUE';

    if (choice === 'ABSORB') {
      const baseSafe = clamp(Number(pending.chance) || (pending.success ? .6 : .2), .01, .99);
      let safe = clamp(baseSafe * (1.20 - .55*a), .015, .985);
      if (pending.compactGravityReverse) {
        // Against a dominant compact object, angular momentum mainly prevents capture; it does NOT
        // turn a tangential pass into a successful SMBH merger. Survival is therefore a shear/flyby.
        const targetSafe = predictedSurvival(scene,'ABSORB',a);
        safe = clamp(Math.max(1-fatalChance(pending), targetSafe), .015, .92);
        pending.fatalChance = 1-safe;
        pending.fragmentChance = safe;
      }
      pending.chance = safe;
      pending.success = Math.random() < safe;
      if (pending.compactGravityReverse) pending.result = pending.success ? 'fragment' : 'catastrophic';
      else if (!pending.success) pending.result = pending.result || 'catastrophic';
    } else if (choice === 'DEFLECT') {
      const survival = Math.max(1-fatalChance(pending), predictedSurvival(scene,'DEFLECT',a));
      const fatal = clamp(1-survival,.002,.94);
      const cleanBase = clamp(Number(pending.cleanChance)||.35,0,1-fatal);
      const cleanFloor = survival * clamp(.24 + high*.58, .18, .78);
      const clean = clamp(Math.max(cleanBase,cleanFloor),.03,1-fatal);
      const roll=Math.random();
      pending.fatalChance=fatal; pending.cleanChance=clean; pending.chance=1-fatal;
      pending.result=roll<fatal?'catastrophic':roll<fatal+clean?'clean':'rough';
      pending.success=pending.result!=='catastrophic';
    } else {
      // IMPORTANT: do not multiply the legacy AVOID chance. Its escape-velocity term correctly says
      // a radial plunge near an SMBH is hopeless, but a high-impact-parameter tangential flyby never
      // enters that deep potential well. Use the greater of the legacy chance and trajectory model.
      const legacy = clamp(Number(pending.chance)||.08,.01,.995);
      const chance = clamp(Math.max(legacy,predictedSurvival(scene,'AVOID',a)),.08,.995);
      pending.chance=chance; pending.fatalChance=1-chance;
      pending.success=Math.random()<chance;
    }

    if (scene._p3OrbitalAssist && (Number(scene.orbitalCount)||0)>0) {
      scene.orbitalCount=Math.max(0,Number(scene.orbitalCount)-1); scene.craters=scene.orbitalCount;
      pending.orbitalsSacrificed=1; pending.phase3OrbitalAssist=true;
      if (choice==='ABSORB') {
        const fatal=fatalChance(pending)*.72;
        pending.fatalChance=fatal;pending.chance=1-fatal;pending.success=Math.random()>=fatal;
        if(pending.compactGravityReverse)pending.result=pending.success?'fragment':'catastrophic';
      } else if(choice==='DEFLECT') {
        const fatal=fatalChance(pending)*.42;
        pending.fatalChance=fatal;pending.chance=1-fatal;
        const clean=clamp(Math.max(Number(pending.cleanChance)||0,(1-fatal)*.72),0,1-fatal);
        const roll=Math.random();pending.result=roll<fatal?'catastrophic':roll<fatal+clean?'clean':'rough';pending.success=pending.result!=='catastrophic';
      } else {
        // Orbital sacrifice supplies an additional gravitational energy/angular-momentum exchange.
        pending.chance=clamp(1-(1-Number(pending.chance))*0.38,.08,.995);
        pending.fatalChance=1-pending.chance;pending.success=Math.random()<pending.chance;
      }
    }
    return pending;
  }

  proto.choose = function(choice) {
    if (!active(this) || this.state !== 'APPROACH') return baseChoose.call(this, choice);
    let pending=this.outcome(choice);
    pending=applyTrajectory(this,choice,pending);
    this.pending=pending;this.state='REVEAL';this.tweens.killAll();this.reveal(choice);
  };

  window.CometPhase3Trajectory=Object.freeze({
    enabled:true,version:2,endpoints:['RADIAL','TANGENTIAL'],teachesAngularMomentum:true,
    preActionDecision:true,orbitalAssistCost:1,oldHighRiskPopupBypassed:true,
    maxTangentialEscapeTarget:'~85–94% depending on tier gap and speed',sliderDragFixed:true
  });
})();
