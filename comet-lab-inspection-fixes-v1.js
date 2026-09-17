// LAB inspection + cleanup pass.
// - PHASE 2 / PHASE 3 LAB tabs replay their real opening tutorial cards.
// - PHASE 4 LAB always replays the "A GALAXY BEGINS" system tutorial.
// - Opening tutorials include a LAB return button while running as a sandbox inspection.
// - Collision LAB uses only the current _labRefreshPreview renderer; the legacy DEV preview
//   renderer is suppressed so object names / APPROACH text cannot be drawn twice after a round.
(() => {
  'use strict';
  if (typeof GameScene === 'undefined' || !window.CometLabSuite) return;

  const proto = GameScene.prototype;
  const baseStartLabPhaseRun = proto.startLabPhaseRun;
  const baseShowDevLab = proto.showDevLab;
  const baseRefreshDevPreview = proto.refreshDevPreview;
  const baseShowPhaseStartCard = proto.showPhaseStartCard;
  const baseShowPhase4SystemBirth = proto.showPhase4SystemBirth;

  function walk(node, fn) {
    if (!node) return;
    fn(node);
    if (Array.isArray(node.list)) node.list.forEach(child => walk(child, fn));
  }

  function colour(value) {
    return `#${Number(value || 0).toString(16).padStart(6, '0')}`;
  }

  function normalisePhase(value) {
    const text = String(value || 'PHS2').toUpperCase().replace(/\s+/g, '');
    if (text === 'PHASE2' || text === 'PHS2') return 'PHS2';
    if (text === 'PHASE3' || text === 'PHS3') return 'PHS3';
    if (text === 'PHASE4' || text === 'PHS4') return 'PHS4';
    return 'PHS2';
  }

  function addLabReturn(scene) {
    if (!scene?._labSandboxRun || typeof scene.miniButton !== 'function') return;

    // Avoid stacking a second LAB button if another wrapper already supplied one.
    let exists = false;
    walk(scene.ui, node => {
      if (!Array.isArray(node?.list)) return;
      const label = node.list.find(child => typeof child?.text === 'string' && child.text === 'LAB');
      if (label && Number(node.y) <= scene.Y(60)) exists = true;
    });
    if (!exists) scene.miniButton(W - 48, scene.Y(18), 72, 24, 'LAB', C.purple, () => scene.returnFromLabPhase());
  }

  function purgeLegacyPreview(scene) {
    const list = Array.isArray(scene?._devPreviewObjects) ? scene._devPreviewObjects : [];
    list.forEach(object => {
      try { object?.destroy?.(true); } catch (e) {}
    });
    if (scene) scene._devPreviewObjects = [];
  }

  // The current collision LAB already owns a complete tracked preview in _labPreviewObjects.
  // Older DEV code can still call refreshDevPreview after a result (notably appearance carry-over);
  // redirect that call to the current LAB renderer rather than drawing a second set of labels.
  if (typeof baseRefreshDevPreview === 'function') {
    proto.refreshDevPreview = function (...args) {
      if (this._devModeActive && !this._labSandboxRun && this.state === 'DEV_LAB' && typeof this._labRefreshPreview === 'function') {
        purgeLegacyPreview(this);
        return this._labRefreshPreview();
      }
      return baseRefreshDevPreview.apply(this, args);
    };
  }

  proto.showDevLab = function (...args) {
    const result = baseShowDevLab.apply(this, args);
    if (this.state === 'DEV_LAB') {
      // Defensive cleanup for any legacy preview objects created by wrappers during the transition
      // back from a result screen, then redraw exactly one canonical preview.
      purgeLegacyPreview(this);
      if (typeof this._labRefreshPreview === 'function') this._labRefreshPreview();
    }
    return result;
  };

  // Every LAB phase-tab press is an inspection run, so replay the opening teaching experience
  // instead of dropping directly into the first encounter.
  proto.startLabPhaseRun = function (phase) {
    const key = normalisePhase(phase);

    // Clear any pending intro from a previous inspection before choosing the new one.
    this._pendingPhaseStartIntro = 0;

    if (key === 'PHS2') {
      this._pendingPhaseStartIntro = 2;
    } else if (key === 'PHS3') {
      this._pendingPhaseStartIntro = 3;
    } else if (key === 'PHS4') {
      // Phase 4's opening tutorial is the animated "A GALAXY BEGINS" system-birth card.
      // Reset only sandbox presentation state so it is replayed on every PHASE 4 tab press.
      this.phase4Members = [];
      this.phase4MembersInitialized = false;
      this.phase4BirthShown = false;
      this.phase4SeedScore = 0;
      this.phase4SeedInheritedOrbitals = 0;
      this._finalJoinedSuperclusters = [];
    }

    return baseStartLabPhaseRun.call(this, key);
  };

  if (typeof baseShowPhaseStartCard === 'function') {
    proto.showPhaseStartCard = function (phase) {
      const result = baseShowPhaseStartCard.call(this, phase);

      if (this._labSandboxRun && this.state === 'PHASE_START_CARD') {
        addLabReturn(this);

        // Keep the Phase 3 tutorial visually consistent with the live trajectory control:
        // radial / low angular momentum -> MERGE green,
        // tangential / high angular momentum -> SLING orange.
        if (Number(phase) === 3) {
          walk(this.ui, node => {
            if (typeof node?.text !== 'string' || typeof node?.setColor !== 'function') return;
            if (node.text.trim() === 'RADIAL') node.setColor(colour(C.green));
            if (node.text.trim() === 'TANGENTIAL') node.setColor(colour(C.orange));
          });
        }
      }
      return result;
    };
  }

  if (typeof baseShowPhase4SystemBirth === 'function') {
    proto.showPhase4SystemBirth = function (...args) {
      const result = baseShowPhase4SystemBirth.apply(this, args);
      addLabReturn(this);
      return result;
    };
  }

  window.CometLabInspectionFixes = Object.freeze({
    enabled: true,
    phaseTabsReplayTutorials: true,
    phase2Intro: 'PHASE START CARD',
    phase3Intro: 'PHASE START CARD',
    phase4Intro: 'A GALAXY BEGINS',
    labReturnOnTutorials: true,
    singleCanonicalCollisionPreview: true,
    legacyDevPreviewSuppressed: true
  });
})();