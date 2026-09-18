// LAB/gameplay visual parity.
// - Clean planet sprites use 64px art when displayed large enough.
// - Known-corrupt generic rocky 64px sources remain on their clean 32px fallback.
// - Collision LAB carries the player's visible sprite forward after each action so it can be used to
//   test the same appearance continuity as the real game. LAB remains isolated from saves/collection.
(() => {
  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const baseUpdate = proto.update;
  const baseResolve = proto.resolve;
  const baseShowDevLab = proto.showDevLab;

  // The previously quarantined 64px planet sources have been re-exported.
  const BAD_64 = new Set();
  const APPEARANCE_KEYS = [
    'cometVisualVariant', 'cometVisualRotation', 'cometVisualFlipX',
    'cometVisualTint', 'cometVisualAlpha'
  ];

  function effectiveDiameter(handle) {
    if (!handle?.container) return Number(handle?.baseDisplayDiameterPx) || 0;
    const scale = Math.max(Math.abs(handle.container.scaleX || 1), Math.abs(handle.container.scaleY || 1));
    return (Number(handle.baseDisplayDiameterPx) || 0) * scale;
  }

  function shouldPrefer64(scene, handle) {
    const variant = handle?.variant;
    if (!variant || BAD_64.has(variant)) return false;
    const entry = COMET_SPRITE_ASSETS?.[variant];
    if (!entry || !['rockyPlanet', 'gasPlanet'].includes(entry.family)) return false;
    if (!Array.isArray(entry.lods) || !entry.lods.includes(64)) return false;
    const threshold = Number(COMET_VISUAL_SETTINGS?.lodThresholds?.smallMaxPx) || 48;
    if (effectiveDiameter(handle) <= threshold) return false;
    const key = cometSpriteTextureKey(variant, 64);
    return scene.textures?.exists?.(key) === true;
  }

  function force64(scene, container) {
    const handle = container?.cometVisual;
    if (!handle?.image || !shouldPrefer64(scene, handle) || handle.lod === 64) return;
    const key = cometSpriteTextureKey(handle.variant, 64);
    handle.image.setTexture(key);
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && Phaser.Textures?.FilterMode) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const diameter = Number(handle.baseDisplayDiameterPx) || Math.max(handle.image.displayWidth || 1, 1);
    const width = Math.max(handle.image.width || 1, 1);
    const height = Math.max(handle.image.height || width, 1);
    handle.image.setDisplaySize(diameter, diameter * (height / width));
    handle.lod = 64;
  }

  function wrapDiameterSetter(scene, container) {
    if (!container?.cometVisual || container._comet64Wrapped) return;
    container._comet64Wrapped = true;
    const original = container.setVisualDisplayDiameter;
    if (typeof original === 'function') {
      container.setVisualDisplayDiameter = function (diameter) {
        const value = original.call(this, diameter);
        force64(scene, this);
        return value;
      };
    }
  }

  proto.drawObject = function (...args) {
    const container = baseDrawObject.apply(this, args);
    wrapDiameterSetter(this, container);
    force64(this, container);
    return container;
  };

  // Keep large planet sprites on their appropriate 64px source after late display-size changes.
  proto.update = function (time, delta) {
    if (typeof baseUpdate === 'function') baseUpdate.call(this, time, delta);
    for (const handle of this._cometVisualHandles || []) {
      if (handle?.container?.active) force64(this, handle.container);
    }
  };

  function clonePlayerForLab(scene, staged) {
    const player = scene.player ? { ...scene.player } : null;
    if (!player) return null;
    if (!staged) return player;

    const stagedTier = Number(staged.tier);
    if (Number.isInteger(stagedTier) && stagedTier >= 0 && stagedTier < TIERS.length && stagedTier !== player.tier) {
      const tier = TIERS[stagedTier];
      Object.assign(player, {
        name: tier.name,
        realName: `GENERIC ${tier.name}`,
        tier: stagedTier,
        radiusM: tier.r,
        massKg: tier.m,
        speedMS: tier.v,
        kind: tier.kind,
        color: tier.color,
        solid: tier.solid,
        hint: tier.hint
      });
      delete player.identityId;
      delete player.namedSpriteBase;
      delete player.scienceClass;
      delete player.identityStatus;
    }

    for (const key of APPEARANCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(staged, key)) player[key] = staged[key];
    }
    return player;
  }

  proto.resolve = function () {
    const collisionLab = this._devModeActive && !this._labSandboxRun;
    const pending = this.pending;
    const staged = this._stagedPlayerAppearance ? { ...this._stagedPlayerAppearance } : null;
    const carryAppearance = collisionLab && pending?.choice === 'ABSORB' &&
      (pending?.result === 'absorb' || pending?.result === 'merge') && !pending?.compactGravityReverse;

    const result = baseResolve.call(this);

    if (collisionLab) {
      this._labCarryPlayer = clonePlayerForLab(this, carryAppearance ? staged : null);
      this._labCarrySelectedA = this._devSelectedA;
    }
    return result;
  };

  proto.showDevLab = function () {
    const carry = this._labCarryPlayer ? { ...this._labCarryPlayer } : null;
    const carryKey = this._labCarrySelectedA;
    const result = baseShowDevLab.call(this);

    if (carry && carryKey && carryKey === this._devSelectedA && this.state === 'DEV_LAB') {
      this._devObjectA = carry;
      if (Number.isInteger(carry.tier)) {
        const selectedTier = Number(String(this._devSelectedA || '').split(':').pop());
        if (carry.tier !== selectedTier) this._devSelectedA = `tier:${carry.tier}`;
      }
      if (this._devSelectA && [...this._devSelectA.options].some(option => option.value === this._devSelectedA)) {
        this._devSelectA.value = this._devSelectedA;
      }
      this.refreshDevPreview?.(false, false);
    }

    this._labCarryPlayer = null;
    this._labCarrySelectedA = null;
    return result;
  };

  window.CometLabVisualParity = Object.freeze({
    largePlanetLod: 64,
    quarantined64: [...BAD_64],
    labCarriesPlayerAppearance: true,
    note: 'Collision LAB mirrors visuals but remains isolated from progression saves/collection.'
  });
})();
