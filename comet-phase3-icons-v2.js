// Final Phase 3 action icon override.
// Uses the approved transparent 64px assets while keeping internal ABSORB/DEFLECT/AVOID mechanics.
(() => {
  const proto = GameScene.prototype;
  const basePreload = proto.preload;
  const baseChoice = proto.choice;

  const ICONS = Object.freeze({
    ABSORB: 'phase3-icon-merge-final',
    DEFLECT: 'phase3-icon-sling-final',
    AVOID: 'phase3-icon-escape-final'
  });
  const LABELS = Object.freeze({ ABSORB:'MERGE', DEFLECT:'SLING', AVOID:'ESCAPE' });

  proto.preload = function () {
    if (basePreload) basePreload.call(this);
    this.load.image(ICONS.ABSORB, 'assets/ui/action_phase3_merge_64.png?v=1');
    this.load.image(ICONS.DEFLECT, 'assets/ui/action_phase3_sling_64.png?v=1');
    this.load.image(ICONS.AVOID, 'assets/ui/action_phase3_escape_64.png?v=1');
  };

  function bounds() {
    const start = TIERS.findIndex(t => t.name === 'PULSAR');
    const galaxy = Number(window.CometPhase4?.galaxyTier ?? TIERS.findIndex(t => t.name === 'GALAXY'));
    return {
      start: start >= 0 ? start : 14,
      end: galaxy >= 0 ? galaxy : TIERS.length
    };
  }

  function phase3Tier(tier) {
    const n = Number(tier);
    const {start,end} = bounds();
    return Number.isFinite(n) && n >= start && n < end;
  }

  function phase3Active(scene) {
    if (!scene) return false;
    if (!scene._devModeActive && !scene._labSandboxRun) return phase3Tier(scene.tierIndex);
    return [
      scene.tierIndex,
      scene.player?.tier,
      scene.other?.tier,
      scene._devObjectA?.tier,
      scene._devObjectB?.tier
    ].some(phase3Tier);
  }

  function newActionContainer(scene, before) {
    return [...(scene.ui?.list || [])].reverse().find(child =>
      !before.has(child) && Array.isArray(child?.list)
    ) || null;
  }

  function iconChild(container) {
    return (container?.list || []).find(child =>
      typeof child?.setTexture === 'function' && child?.texture
    ) || null;
  }

  function textChild(container, internal, visible) {
    return (container?.list || []).find(child =>
      typeof child?.setText === 'function' && (child.text === internal || child.text === visible)
    ) || null;
  }

  proto.choice = function (x, y, label, color, risk) {
    const before = new Set(this.ui?.list || []);
    const value = baseChoice.call(this, x, y, label, color, risk);
    if (!phase3Active(this) || !ICONS[label]) return value;

    const container = newActionContainer(this, before);
    const visible = LABELS[label];
    const text = textChild(container, label, visible);
    const icon = iconChild(container);

    if (text) {
      text.setText(visible);
      text.setFontSize?.('16px');
    }
    if (icon && this.textures?.exists?.(ICONS[label])) {
      icon.setTexture(ICONS[label]);
      icon.setDisplaySize(54, 54);
      icon.clearTint?.();
      icon.setAlpha?.(1);
    }
    return value;
  };

  window.CometPhase3FinalIcons = Object.freeze({
    labels: LABELS,
    icons: ICONS,
    labAware: true,
    transparent64pxAssets: true
  });
})();
