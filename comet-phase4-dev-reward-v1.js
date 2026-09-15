// Phase 4 completion reward.
// Completing the Observable Universe now unlocks DEV access, reveals the existing DEV passcode,
// and banks the final run score at the reward moment instead of before the Phase 4 title card.
(() => {
  if (!window.CometPhaseCards || !window.CometPhase4) return;

  const proto = GameScene.prototype;
  const baseFinishUniverse = proto.finishUniverse;
  const baseShowPhaseCompleteCard = proto.showPhaseCompleteCard;
  const baseContinueFromPhaseCard = proto.continueFromPhaseCard;

  const DEV_PASSCODE = '8888';
  const DEV_UNLOCK_KEY = 'cometio-dev-unlocked-v1';
  const FINAL_SCORE_KEY = 'cometio-final-score-v1';
  const OBSERVABLE_UNIVERSE_MASS = 1e53;
  const FINAL_BUTTON_OLD = 'TAP TO BEGIN A NEW UNIVERSE';
  const FINAL_BUTTON_NEW = 'UNLOCK DEV MODE';

  function walkDisplayList(node, visitor) {
    if (!node) return;
    visitor(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walkDisplayList(child, visitor));
  }

  function replaceVisibleText(scene, from, to) {
    walkDisplayList(scene.ui, child => {
      if (typeof child?.text === 'string' && child.text === from && typeof child.setText === 'function') {
        child.setText(to);
      }
    });
  }

  function actionSummary(scene) {
    const history = Array.isArray(scene.actionHistory) ? scene.actionHistory : [];
    const absorbs = history.filter(a => a === 'ABSORB').length;
    const deflects = history.filter(a => a === 'DEFLECT').length;
    const avoids = history.filter(a => a === 'AVOID').length;
    return { total: absorbs + deflects + avoids, absorbs, deflects, avoids };
  }

  function finalSnapshot(scene) {
    return {
      score: Number(scene.score) || 0,
      massKg: OBSERVABLE_UNIVERSE_MASS,
      object: 'OBSERVABLE UNIVERSE',
      universes: Math.max(1, Math.floor(Number(scene.universeCount) || 1)),
      tierIndex: window.CometPhase4.superclusterTier,
      actions: actionSummary(scene),
      streak: Array.isArray(scene.actionHistory) ? [...scene.actionHistory] : [],
      saves: Math.max(0, Math.floor(Number(scene.manualSaves) || 0)),
      loads: Math.max(0, Math.floor(Number(scene.manualLoads) || 0)),
      scorePenalty: Math.max(0, Math.floor(Number(scene.scorePenalty) || 0)),
      completedAt: Date.now()
    };
  }

  function patchNewestUniverseHighScore(scene, completed, score, before) {
    try {
      const scores = scene.getScores();
      let candidate = null;
      for (const entry of scores) {
        if (Number(entry.score) !== Number(score)) continue;
        if (Number(entry.date) < before - 2000) continue;
        if (!candidate || Number(entry.date) > Number(candidate.date)) candidate = entry;
      }
      if (!candidate) return false;
      candidate.object = `OBSERVABLE UNIVERSE • U${completed}`;
      candidate.massKg = OBSERVABLE_UNIVERSE_MASS;
      candidate.universes = completed;
      candidate.tierIndex = window.CometPhase4.superclusterTier;
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
      return true;
    } catch (e) {
      return false;
    }
  }

  function bankFinalScore(scene) {
    if (scene._phase4FinalScoreBanked) return scene._phase4FinalScoreStatus || { saved: true, topFive: false };

    const snapshot = finalSnapshot(scene);
    let localSaved = false;
    let topFive = false;

    try {
      localStorage.setItem(FINAL_SCORE_KEY, JSON.stringify(snapshot));
      localStorage.setItem(DEV_UNLOCK_KEY, '1');
      localSaved = true;
    } catch (e) {}

    // Preserve the existing top-five leaderboard/name-entry behaviour. If this run qualifies,
    // recordScore() asks for the player's name and then we relabel that entry as the Universe run.
    try {
      if (typeof scene.qualifies === 'function' && scene.qualifies()) {
        const before = Date.now();
        const completed = snapshot.universes;
        const score = snapshot.score;
        scene.recordScore();
        topFive = patchNewestUniverseHighScore(scene, completed, score, before);
      }
    } catch (e) {}

    scene._phase4FinalScoreBanked = true;
    scene._phase4FinalScoreStatus = { saved: localSaved || topFive, topFive, snapshot };
    return scene._phase4FinalScoreStatus;
  }

  function rewardButton(scene, y, label, color, callback, width = 310) {
    const c = scene.add.container(W / 2, scene.Y(y));
    const g = scene.add.graphics();
    g.fillStyle(color, .14).fillRoundedRect(-width / 2, -25, width, 50, 7);
    g.lineStyle(2, color, .92).strokeRoundedRect(-width / 2, -25, width, 50, 7);
    const t = scene.add.text(0, 0, label, {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f7fbff'
    }).setOrigin(.5);
    if (t.setResolution) t.setResolution(Math.min(window.devicePixelRatio || 1, 3));
    const hit = scene.add.rectangle(0, 0, width, 50, 0xffffff, .001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', callback);
    c.add([g, t, hit]);
    scene.ui.add(c);
    return c;
  }

  proto.showPhase4DevReward = function () {
    const status = bankFinalScore(this);
    const snapshot = status.snapshot || finalSnapshot(this);

    this.tweens.killAll();
    this.clearUI();
    this.state = 'PHASE4_DEV_REWARD';
    this._activePhaseCard = null;

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, 1).fillRect(-20, -20, W + 40, H + 40);
    for (let i = 0; i < 95; i++) {
      const x = Phaser.Math.Between(8, W - 8);
      const y = Phaser.Math.Between(this.Y(8), H - 10);
      const size = Phaser.Math.RND.pick([1, 1, 1, 2]);
      const color = i % 19 === 0 ? C.purple : i % 13 === 0 ? C.cyan : C.star;
      bg.fillStyle(color, Phaser.Math.RND.pick([.18, .28, .42, .64])).fillRect(x, y, size, size);
    }
    bg.lineStyle(2, C.purple, .36).lineBetween(8, this.Y(715), 96, this.Y(627));
    bg.lineStyle(2, C.cyan, .46).lineBetween(330, this.Y(120), 414, this.Y(38));
    this.ui.addAt(bg, 0);

    this.addText(W / 2, this.Y(76), 'DEV MODE UNLOCKED', 24, C.green, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(114), 'YOU COMPLETED ALL FOUR PHASES', 9, C.muted, { ox: .5, bold: true });

    const card = this.add.graphics();
    card.fillStyle(C.panel, .88).fillRoundedRect(34, this.Y(158), 352, 326, 11);
    card.lineStyle(2, C.cyan, .86).strokeRoundedRect(34, this.Y(158), 352, 326, 11);
    card.lineStyle(1, C.purple, .38).strokeRoundedRect(42, this.Y(166), 336, 310, 8);
    this.ui.add(card);

    this.addText(W / 2, this.Y(190), 'DEV PASSCODE', 10, C.cyan, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(224), DEV_PASSCODE, 34, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(275), 'KEEP THIS CODE FOR THE DEV BUTTON ON HOME', 7.5, C.muted, {
      ox: .5, bold: true, width: 300, align: 'center'
    });

    const divider = this.add.graphics();
    divider.lineStyle(1.5, C.cyan, .35).lineBetween(72, this.Y(311), 348, this.Y(311));
    this.ui.add(divider);

    this.addText(W / 2, this.Y(337), 'FINAL SCORE', 9.5, C.orange, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(371), Number(snapshot.score).toLocaleString('en-US'), 27, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(417), 'OBSERVABLE UNIVERSE', 9, C.cyan, { ox: .5, bold: true });
    this.addText(
      W / 2,
      this.Y(448),
      status.topFive ? 'TOP FIVE SCORE SAVED' : 'FINAL RUN SAVED',
      8.5,
      status.saved ? C.green : C.orange,
      { ox: .5, bold: true }
    );

    rewardButton(this, 570, 'ENTER DEV MODE', C.purple, () => {
      if (typeof this.enterDevLab === 'function') return this.enterDevLab();
      if (typeof this.showDevPinGate === 'function') return this.showDevPinGate();
      return this.showHome();
    });
    rewardButton(this, 636, 'HOME', C.cyan, () => this.showHome(), 250);

    this.addText(W / 2, this.Y(704), 'DEV MODE IS A COMPLETION REWARD.', 8, C.muted, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(731), 'PASSCODE 8888 WILL ALSO WORK FROM HOME.', 8, C.muted, { ox: .5, bold: true });
    this.cameras.main.flash(260, 37, 242, 154, false);
  };

  // The original Phase 4 finale banks a qualifying score immediately. Defer that one operation
  // until the player presses the completion reward button so the reward and score-save happen together.
  proto.finishUniverse = function () {
    if (this._devPhase4Test || this._devModeActive) return baseFinishUniverse.call(this);

    const hadOwnQualifies = Object.prototype.hasOwnProperty.call(this, 'qualifies');
    const ownQualifies = this.qualifies;
    this.qualifies = () => false;
    try {
      return baseFinishUniverse.call(this);
    } finally {
      if (hadOwnQualifies) this.qualifies = ownQualifies;
      else delete this.qualifies;
    }
  };

  proto.showPhaseCompleteCard = function (phase) {
    const result = baseShowPhaseCompleteCard.call(this, phase);
    if (phase === 4 && !this._devPhase4Test && !this._devModeActive) {
      if (this._activePhaseCard) this._activePhaseCard.button = FINAL_BUTTON_NEW;
      replaceVisibleText(this, FINAL_BUTTON_OLD, FINAL_BUTTON_NEW);
    }
    return result;
  };

  proto.continueFromPhaseCard = function (config) {
    if (config?.final && this.state === 'PHASE_COMPLETE_CARD' && !this._devPhase4Test && !this._devModeActive) {
      this.state = 'PHASE4_REWARD_TRANSITION';
      return this.showPhase4DevReward();
    }
    return baseContinueFromPhaseCard.call(this, config);
  };

  window.CometPhase4DevReward = Object.freeze({
    enabled: true,
    passcode: DEV_PASSCODE,
    finalScoreKey: FINAL_SCORE_KEY,
    unlockKey: DEV_UNLOCK_KEY
  });
})();
