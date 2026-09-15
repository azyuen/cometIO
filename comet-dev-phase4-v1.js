// Dedicated DEV Phase 4 test harness.
// Lets the developer jump directly into real Phase 4 mechanics/finale without changing a real run,
// writing saves, or recording high scores. Loaded after Phase 4 + its tuning layer.
(() => {
  if (!window.CometPhase4) return;

  const proto = GameScene.prototype;
  const baseShowDevLab = proto.showDevLab;
  const baseShowHome = proto.showHome;
  const baseDrawHud = proto.drawHud;
  const baseSave = proto.save;
  const baseLoad = proto.load;
  const baseFinishUniverse = proto.finishUniverse;
  const baseStartUniverseFinale = proto.startUniverseFinale;
  const baseCompleteUniverseAssembly = proto.completeUniverseAssembly;
  const baseShowUniverseAtomEncounter = proto.showUniverseAtomEncounter;

  const SMBH_INDEX = window.CometPhase4.firstTier;
  const GALAXY_INDEX = window.CometPhase4.galaxyTier;
  const CLUSTER_INDEX = window.CometPhase4.clusterTier;
  const SUPERCLUSTER_INDEX = window.CometPhase4.superclusterTier;

  const STATE_KEYS = [
    'runActive','state','tierIndex','growth','craters','encounters','absorbs','score',
    'regionId','lastRegionPromptEncounter','runStarted','player','other','pending',
    'preEncounterPlayer','preEncounterOther','actionHistory','collectedIdentityIds',
    'collectionBonusScore','manualSaves','manualLoads','scorePenalty','orbitalCount',
    'orbitalProgress','orbitalsUnlocked','universeCount','systemCaptures','finaleMergeCount'
  ];

  function copyState(scene) {
    const snapshot = {};
    STATE_KEYS.forEach(key => { snapshot[key] = scene[key]; });
    return snapshot;
  }

  function restoreState(scene, snapshot) {
    if (!snapshot) return;
    STATE_KEYS.forEach(key => {
      if (snapshot[key] === undefined) delete scene[key];
      else scene[key] = snapshot[key];
    });
  }

  function addTestBadge(scene, label = 'DEV P4 MENU') {
    if (!scene._devPhase4Test || !scene.ui) return;
    scene.miniButton(W - 63, scene.Y(16), 112, 24, label, C.purple, () => scene.showDevPhase4Menu());
  }

  function resetTemporaryPhase4State(scene, tierIndex, captures = 0) {
    scene._devModeActive = false; // Real Phase 4 rules deliberately require DEV collision mode to be off.
    scene._devPhase4Test = true;
    scene.runActive = true;
    scene.tierIndex = tierIndex;
    scene.growth = 0;
    scene.craters = 0;
    scene.encounters = 0;
    scene.absorbs = 0;
    scene.score = 0;
    scene.regionId = 'hyperspace';
    scene.lastRegionPromptEncounter = -1;
    scene.runStarted = Date.now();
    scene.other = null;
    scene.pending = null;
    scene.actionHistory = [];
    scene.collectedIdentityIds = [];
    scene.collectionBonusScore = 0;
    scene.orbitalCount = 0;
    scene.orbitalProgress = 0;
    scene.orbitalsUnlocked = true;
    scene.systemCaptures = captures;
    scene.finaleMergeCount = 0;
    scene.universeCount = 0;
    scene.setPlayer(true);
    if (scene.player) scene.player.phase4CaptureCount = captures;
  }

  proto.showDevPhase4Menu = function () {
    if (!this._devPhase4Snapshot) this._devPhase4Snapshot = copyState(this);
    this._devPhase4Test = true;
    this._devModeActive = true; // Menu is inert; real rules turn on only after a stage is launched.
    this.clearUI();
    this.state = 'DEV_PHASE4_MENU';

    const bg = this.add.graphics();
    bg.fillStyle(C.bg, .90).fillRect(0, SAFE_TOP, W, H - SAFE_TOP);
    this.ui.add(bg);

    this.addText(W / 2, this.Y(42), 'DEV • PHASE 4 TEST', 18, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(75), 'REAL PHASE 4 RULES • TEMPORARY TEST STATE', 8.4, C.purple, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(103), 'SAVE / LOAD / HIGH SCORES ARE DISABLED', 7.6, C.muted, { ox: .5, bold: true });

    const section = this.add.graphics();
    section.fillStyle(C.panel, .94).fillRoundedRect(16, this.Y(136), 388, 522, 10);
    section.lineStyle(1.5, C.purple, .60).strokeRoundedRect(16, this.Y(136), 388, 522, 10);
    this.ui.add(section);

    this.addText(W / 2, this.Y(161), 'PLAYABLE PHASE 4', 9.5, C.cyan, { ox: .5, bold: true });
    this.wideButton(112, this.Y(211), 172, 48, 'SMBH SYSTEM', C.cyan, () => this.launchDevPhase4Stage('smbh'));
    this.wideButton(308, this.Y(211), 172, 48, 'GALAXY', C.cyan, () => this.launchDevPhase4Stage('galaxy'));
    this.wideButton(112, this.Y(269), 172, 48, 'GALAXY CLUSTER', C.cyan, () => this.launchDevPhase4Stage('cluster'));
    this.wideButton(308, this.Y(269), 172, 48, 'SUPERCLUSTER', C.purple, () => this.launchDevPhase4Stage('supercluster'));

    this.addText(W / 2, this.Y(327), 'FINAL ASSEMBLY', 9.5, C.orange, { ox: .5, bold: true });
    this.wideButton(112, this.Y(374), 172, 44, 'MERGE 1', C.green, () => this.launchDevPhase4Stage('merge1'));
    this.wideButton(308, this.Y(374), 172, 44, 'MERGE 2', C.green, () => this.launchDevPhase4Stage('merge2'));
    this.wideButton(112, this.Y(426), 172, 44, 'MERGE 3', C.green, () => this.launchDevPhase4Stage('merge3'));
    this.wideButton(308, this.Y(426), 172, 44, 'UNIVERSE FORMS', C.orange, () => this.launchDevPhase4Stage('universe'));

    this.addText(W / 2, this.Y(482), 'ENDING', 9.5, C.orange, { ox: .5, bold: true });
    this.wideButton(112, this.Y(529), 172, 44, 'ATOM ENCOUNTER', C.orange, () => this.launchDevPhase4Stage('atom'));
    this.wideButton(308, this.Y(529), 172, 44, 'ENDING SCREEN', C.orange, () => this.showDevPhase4Completion());

    this.addText(W / 2, this.Y(589), 'PLAYABLE STAGES USE THE SAME ABSORB / DEFLECT / AVOID LOGIC AS THE REAL RUN.', 7.4, C.muted, { ox: .5, bold: true, width: 350, align: 'center' });

    this.wideButton(W / 2, this.Y(704), 300, 46, 'BACK TO COLLISION LAB', C.cyan, () => this.exitDevPhase4ToLab());
    this.wideButton(W / 2, this.Y(765), 250, 40, 'BACK HOME', C.muted, () => this.exitDevPhase4ToHome());
  };

  proto.launchDevPhase4Stage = function (stage) {
    if (!this._devPhase4Snapshot) this._devPhase4Snapshot = copyState(this);

    if (stage === 'smbh') {
      resetTemporaryPhase4State(this, SMBH_INDEX, 3);
      return this.startEncounter();
    }
    if (stage === 'galaxy') {
      resetTemporaryPhase4State(this, GALAXY_INDEX, 4);
      return this.startEncounter();
    }
    if (stage === 'cluster') {
      resetTemporaryPhase4State(this, CLUSTER_INDEX, 5);
      return this.startEncounter();
    }

    resetTemporaryPhase4State(this, SUPERCLUSTER_INDEX, 6);
    if (stage === 'supercluster' || stage === 'merge1') {
      this.finaleMergeCount = 0;
      return this.startUniverseFinale();
    }
    if (stage === 'merge2') {
      this.finaleMergeCount = 1;
      return this.startUniverseFinale();
    }
    if (stage === 'merge3') {
      this.finaleMergeCount = 2;
      return this.startUniverseFinale();
    }
    if (stage === 'universe') {
      this.finaleMergeCount = 3;
      return this.completeUniverseAssembly();
    }
    if (stage === 'atom') {
      this.finaleMergeCount = 3;
      return this.showUniverseAtomEncounter();
    }
    return this.showDevPhase4Menu();
  };

  proto.exitDevPhase4ToLab = function () {
    const snapshot = this._devPhase4Snapshot;
    this._devPhase4Test = false;
    this._devModeActive = true;
    restoreState(this, snapshot);
    this._devPhase4Snapshot = null;
    return this.showDevLab();
  };

  proto.exitDevPhase4ToHome = function () {
    this._devPhase4Test = false;
    this._devModeActive = true;
    this._devPhase4Snapshot = null;
    // DEV Lab owns the authoritative pre-DEV run snapshot, so let its normal exit restore it.
    if (typeof this.exitDevLab === 'function') return this.exitDevLab();
    return baseShowHome.call(this);
  };

  proto.showDevLab = function () {
    const result = baseShowDevLab.call(this);
    if (this._devModeActive && this.state === 'DEV_LAB') {
      this.miniButton(W - 62, this.Y(34), 112, 24, 'PHASE 4 TEST', C.purple, () => this.showDevPhase4Menu());
    }
    return result;
  };

  proto.drawHud = function (controls = false) {
    const result = baseDrawHud.call(this, controls);
    if (this._devPhase4Test) addTestBadge(this);
    return result;
  };

  proto.save = function (silent = false) {
    if (this._devPhase4Test) {
      if (!silent) this.toast('DEV TEST • SAVE DISABLED', C.orange);
      return true;
    }
    return baseSave.call(this, silent);
  };

  proto.load = function () {
    if (this._devPhase4Test) {
      this.toast('DEV TEST • LOAD DISABLED', C.orange);
      return false;
    }
    return baseLoad.call(this);
  };

  proto.showHome = function () {
    if (this._devPhase4Test) return this.exitDevPhase4ToHome();
    return baseShowHome.call(this);
  };

  proto.startUniverseFinale = function () {
    const result = baseStartUniverseFinale.call(this);
    if (this._devPhase4Test) addTestBadge(this);
    return result;
  };

  proto.completeUniverseAssembly = function () {
    const result = baseCompleteUniverseAssembly.call(this);
    if (this._devPhase4Test) addTestBadge(this);
    return result;
  };

  proto.showUniverseAtomEncounter = function () {
    const result = baseShowUniverseAtomEncounter.call(this);
    if (this._devPhase4Test) addTestBadge(this);
    return result;
  };

  proto.showDevPhase4Completion = function () {
    if (!this._devPhase4Snapshot) this._devPhase4Snapshot = copyState(this);
    this._devPhase4Test = true;
    this._devModeActive = false;
    this.clearUI();
    this.state = 'DEV_PHASE4_COMPLETE';
    this.cameras.main.flash(300, 255, 255, 255, false);
    this.addText(W / 2, this.Y(152), 'UNIVERSE COMPLETE', 24, C.green, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(195), 'DEV PREVIEW • NO SCORE RECORDED', 8.5, C.purple, { ox: .5, bold: true });

    const atomTier = TIERS[0];
    const atom = {
      name: atomTier.name, tier: 0, radiusM: atomTier.r, massKg: atomTier.m,
      speedMS: atomTier.v, kind: atomTier.kind, color: atomTier.color, solid: atomTier.solid
    };
    this.drawObject(W / 2, this.Y(365), 48, atom, false, true);
    this.addText(W / 2, this.Y(458), 'ALTERNATIVE UNIVERSE NO. 2', 18, C.white, { ox: .5, bold: true });
    this.addText(W / 2, this.Y(499), 'SOMEHOW, YOU ARE AN ATOM AGAIN.', 10, C.muted, { ox: .5, bold: true });

    this.wideButton(W / 2, this.Y(604), 300, 48, 'REPLAY ATOM ENDING', C.orange, () => this.launchDevPhase4Stage('atom'));
    this.wideButton(W / 2, this.Y(666), 300, 48, 'PHASE 4 TEST MENU', C.purple, () => this.showDevPhase4Menu());
    this.wideButton(W / 2, this.Y(728), 260, 42, 'BACK TO COLLISION LAB', C.cyan, () => this.exitDevPhase4ToLab());
  };

  proto.finishUniverse = function () {
    if (this._devPhase4Test) return this.showDevPhase4Completion();
    return baseFinishUniverse.call(this);
  };

  window.CometDevPhase4 = Object.freeze({
    enabled: true,
    stages: ['smbh','galaxy','cluster','supercluster','merge1','merge2','merge3','universe','atom','ending'],
    savesDisabled: true,
    highScoresDisabled: true
  });
})();
