// Phase 4 risk/reward pass.
// Makes the final phase dangerous again without adding another permanent resource system.
// CAPTURE can end the run, GRAZE can strip several real members / regress Cluster -> Galaxy,
// and AVOID is safest but costs speed, making repeated avoidance progressively less reliable.
(() => {
  if (!window.CometPhase4SystemV6 || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const P4 = window.CometPhase4;
  const GALAXY = P4.galaxyTier;
  const CLUSTER = P4.clusterTier;
  const SUPERCLUSTER = P4.superclusterTier;
  const VERSION = 1;

  const baseOutcome = proto.outcome;
  const baseResolve = proto.resolve;
  const baseDrawResult = proto.drawResult;
  const baseDrawPrompt = proto.drawPrompt;
  const baseShowBirth = proto.showPhase4SystemBirth;

  function active(scene) {
    return !scene._devModeActive && scene.tierIndex >= GALAXY && scene.tierIndex < SUPERCLUSTER;
  }

  function ratio(scene) {
    return Math.max(1e-8, Number(scene.other?.massKg || 1) / Math.max(1, Number(scene.player?.massKg || 1)));
  }

  function speedRatio(scene) {
    return Math.max(.05, Number(scene.player?.speedMS || 1) / Math.max(1, Number(scene.other?.speedMS || 1)));
  }

  function ensureOutgoing(scene, pending, desired) {
    pending.transferOutMembers ||= [];
    const used = new Set(pending.transferOutMembers.map(m => m.memberId));
    const pool = (scene.phase4Members || []).filter(m => !used.has(m.memberId));
    while (pending.transferOutMembers.length < desired && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      pending.transferOutMembers.push({ ...pool.splice(i, 1)[0] });
    }
  }

  function captureFatalChance(scene, pending) {
    const r = pending.massRatio || ratio(scene);
    const gap = Number(pending.gap) || 0;
    const speed = speedRatio(scene);
    if (r < 1.20 && gap <= 0) return 0;
    const massRisk = Math.max(0, Math.log10(Math.max(1, r))) * .26;
    const tierRisk = Math.max(0, gap) * .16;
    const slowRisk = Math.max(0, 1 - Math.min(1, speed)) * .23;
    return clamp(.12 + massRisk + tierRisk + slowRisk, .12, .78);
  }

  function grazeSeverity(scene, pending) {
    const r = pending.massRatio || ratio(scene);
    const gap = Math.max(0, Number(pending.gap) || 0);
    const slow = Math.max(0, 1 - Math.min(1, speedRatio(scene)));
    return clamp(Math.log10(Math.max(1, r)) * .48 + gap * .20 + slow * .22, 0, 1);
  }

  function avoidChance(scene, pending) {
    const r = pending.massRatio || ratio(scene);
    const gap = Math.max(0, Number(pending.gap) || 0);
    const speed = speedRatio(scene);
    const speedBonus = clamp(Math.log10(Math.max(.1, speed)) * .10, -.16, .12);
    return clamp(.965 - gap * .055 - Math.max(0, Math.log10(r)) * .06 + speedBonus, .58, .995);
  }

  proto.outcome = function(choice) {
    const pending = baseOutcome.call(this, choice);
    if (!active(this) || !pending) return pending;

    pending.v7RiskReward = true;
    pending.v7SpeedRatio = speedRatio(this);

    if (choice === 'ABSORB' && !pending.success) {
      const inheritedCatastrophe = !!pending.v5PreventSMBHRegression;
      const fatalChance = inheritedCatastrophe ? 1 : captureFatalChance(this, pending);
      pending.v7FatalChance = fatalChance;
      if (inheritedCatastrophe || (fatalChance > 0 && Math.random() < fatalChance)) {
        pending.result = 'captured';
        pending.v7FatalCapture = true;
        pending.success = false;
        ensureOutgoing(this, pending, Math.max(1, (this.phase4Members || []).length));
      }
    }

    if (choice === 'DEFLECT' && pending.result === 'stripped') {
      const severity = grazeSeverity(this, pending);
      pending.v7GrazeSeverity = severity;
      const desired = severity >= .72 ? 4 : severity >= .46 ? 3 : severity >= .22 ? 2 : 1;
      ensureOutgoing(this, pending, desired);

      if (this.tierIndex >= CLUSTER) {
        const regressChance = severity >= .82 ? .70 : severity >= .58 ? .38 : severity >= .40 ? .16 : 0;
        if (regressChance && Math.random() < regressChance) {
          pending.v7TierRegression = true;
          pending.v7RegressFrom = this.tierIndex;
          pending.v7RegressTo = GALAXY;
        }
      }
    }

    if (choice === 'AVOID') {
      const chance = avoidChance(this, pending);
      pending.chance = chance;
      pending.success = Math.random() < chance;
      pending.result = pending.success ? 'clean' : 'stripped';
      pending.amount = pending.success ? 0 : 1;
      pending.v7AvoidChance = chance;
      if (!pending.success) ensureOutgoing(this, pending, ratio(this) > 3 ? 2 : 1);
    }

    return pending;
  };

  function avoidSpeedCost(scene, pending) {
    const r = pending.massRatio || ratio(scene);
    const gap = Math.max(0, Number(pending.gap) || 0);
    const base = pending.success ? .075 : .16;
    const cost = clamp(base + gap * .025 + Math.max(0, Math.log10(r)) * .035, pending.success ? .06 : .14, pending.success ? .20 : .34);
    scene.player.speedMS = Math.max(50000, scene.player.speedMS * (1 - cost));
    pending.v7AvoidSpeedLoss = cost;
    return cost;
  }

  function showFatalCapture(scene) {
    const r = scene.pending || {};
    scene.tweens.killAll();
    scene.clearUI();
    scene.state = 'P4_GAME_OVER';
    scene.runActive = false;

    const bg = scene.add.graphics();
    bg.fillStyle(C.bg,.94).fillRect(-10,-10,W+20,H+20);scene.ui.add(bg);
    scene.addText(W/2,scene.Y(68),'SYSTEM CAPTURED',22,C.red,{ox:.5,bold:true});
    scene.addText(W/2,scene.Y(105),'YOUR GALAXY COULD NOT ESCAPE THE STRONGER SYSTEM',8.8,C.muted,{ox:.5,bold:true,width:370,align:'center'});

    scene.drawObject(W/2,scene.Y(305),72,scene.other,false,true);
    scene.addText(W/2,scene.Y(402),scene.other.realName || scene.other.name,11,C.orange,{ox:.5,bold:true,width:370,align:'center'});

    const panel=scene.add.graphics();
    panel.fillStyle(C.panel,.98).fillRoundedRect(25,scene.Y(446),370,176,9);
    panel.lineStyle(1.5,C.red,.78).strokeRoundedRect(25,scene.Y(446),370,176,9);scene.ui.add(panel);
    scene.addText(43,scene.Y(466),'WHAT HAPPENED?',9,C.cyan,{bold:true});
    scene.addText(43,scene.Y(493),'CAPTURE is an all-in gravitational commitment. The larger system dominated the encounter and captured your galaxy.',8.8,C.white,{bold:true,width:334,lineSpacing:3});
    scene.addText(43,scene.Y(558),`TARGET MASS ≈ ${Math.max(1,r.massRatio||1).toFixed((r.massRatio||1)>=10?0:1)}× YOUR SYSTEM`,8.2,C.orange,{bold:true,width:334});
    scene.addText(43,scene.Y(585),'YOUR LAST SAVE IS STILL AVAILABLE.',7.7,C.green,{bold:true});

    if (scene._labSandboxRun) {
      scene.wideButton(W/2,scene.Y(690),310,48,'RETRY PHASE 4',C.cyan,()=>scene.startLabPhaseRun('PHS4'));
      scene.wideButton(W/2,scene.Y(752),280,44,'RETURN TO LAB',C.purple,()=>scene.returnFromLabPhase());
    } else {
      scene.wideButton(W/2,scene.Y(690),310,48,'LOAD LAST SAVE',C.blue,()=>scene.load());
      scene.wideButton(W/2,scene.Y(752),280,44,'RESTART RUN',C.red,()=>scene.startNewRun());
    }
  }

  proto.resolve = function() {
    if (!active(this) || !this.pending?.v7RiskReward) return baseResolve.call(this);
    const r = this.pending;

    if (r.v7FatalCapture) {
      this.actionHistory ||= [];
      this.actionHistory.push('ABSORB');
      this.encounters++;
      return showFatalCapture(this);
    }

    if (r.choice === 'AVOID') avoidSpeedCost(this, r);

    if (r.choice === 'DEFLECT' && r.result === 'stripped') {
      const severity = Number(r.v7GrazeSeverity) || 0;
      this.growth = Math.max(0, this.growth - (.20 + severity * .75));
      if (r.v7TierRegression && this.tierIndex >= CLUSTER) {
        this.tierIndex = GALAXY;
        this.growth = TIERS[GALAXY].need * .48;
        this.setPlayer(false);
      }
    }

    return baseResolve.call(this);
  };

  proto.drawResult = function(result) {
    const r=this.pending;
    if (active(this) && r?.v7RiskReward) {
      if (r.choice === 'AVOID') {
        const loss=Math.round((r.v7AvoidSpeedLoss||0)*100);
        if (r.success) {
          result={...result,title:'SAFE FLYBY',detail:`SPEED -${loss}% • SYSTEM PRESERVED`,reason:'You escaped the gravitational encounter, but changing course and maintaining separation cost speed. Repeated avoidance makes future escapes less reliable.'};
        } else {
          const n=(r.transferOutMembers||[]).length;
          result={...result,title:'CLOSE ESCAPE',detail:`SPEED -${loss}% • ORBITALS -${n}`,reason:'You escaped, but the slower flyby spent long enough in the target’s gravity for material to be stripped from your system.',color:C.orange};
        }
      }
      if (r.choice === 'DEFLECT' && r.result === 'stripped') {
        const n=(r.transferOutMembers||[]).length;
        if (r.v7TierRegression) {
          r.v4ClusterInteraction=false;
          result={...result,title:'SYSTEM DISRUPTED',detail:`GALAXY CLUSTER → GALAXY • ORBITALS -${n}`,reason:'The graze became a major tidal stripping event. Enough of your cluster was pulled away that the surviving bound structure fell back to galaxy scale.',color:C.red};
        } else if (n >= 2) {
          result={...result,title:'HEAVY TIDAL STRIPPING',detail:`ORBITALS -${n} • SYSTEM MASS LOST`,reason:'The close pass favoured the other system. Several real members were stripped from your outer structure — a Graze can win material, but it can also cost meaningful progress.',color:C.orange};
        }
      }
    }
    return baseDrawResult.call(this,result);
  };

  function cleanRiskLegend(scene) {
    // Keep button faces clean: one compact legend sits inside the prompt panel, above the buttons.
    scene.addText(W/2,scene.Y(704),'CAPTURE: HIGH / CAN END RUN   •   GRAZE: MEDIUM   •   AVOID: SAFE / SPEED COST',5.8,C.muted,{ox:.5,bold:true,width:398,align:'center'});
  }

  proto.drawPrompt = function() {
    const result=baseDrawPrompt.call(this);
    if(active(this))cleanRiskLegend(this);
    return result;
  };

  proto.showPhase4SystemBirth = function() {
    const result=baseShowBirth.call(this);
    if(this.state==='P4_SYSTEM_BIRTH'){
      this.addText(W/2,this.Y(662),'CAPTURE CAN END THE RUN • GRAZE CAN COST ORBITALS • AVOID COSTS SPEED',6.9,C.orange,{ox:.5,bold:true,width:380,align:'center'});
    }
    return result;
  };

  window.CometPhase4RiskV1=Object.freeze({
    enabled:true,version:VERSION,
    captureCanEndRun:true,
    grazeCanRegressTier:true,
    avoidCostsSpeed:true,
    repeatedAvoidGetsRiskier:true,
    stabilityStatAdded:false
  });
})();
