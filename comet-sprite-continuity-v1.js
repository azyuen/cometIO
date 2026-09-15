// Sprite appearance continuity + static random orientation.
// The collision animation can create a synthetic "resulting object" sprite. Its appearance now
// becomes the real player's appearance after a successful ABSORB/MERGE instead of snapping back on
// the following encounter. Appearance fields are normal enumerable object properties, so manual
// checkpoints preserve them automatically.
(() => {
  const baseDrawObject = GameScene.prototype.drawObject;
  const baseAnimate = GameScene.prototype.animate;
  const baseResolve = GameScene.prototype.resolve;

  const APPEARANCE_KEYS = Object.freeze([
    'cometVisualVariant',
    'cometVisualRotation',
    'cometVisualFlipX',
    'cometVisualTint',
    'cometVisualAlpha'
  ]);

  function randomOrientation() {
    // Quarter turns preserve pixel edges cleanly on iOS/PWA while still giving four visibly
    // different orientations to asymmetric planets, rocks, nebulae, pulsars, black holes, etc.
    return Phaser.Math.RND.pick([0, 90, 180, 270]);
  }

  function ensureSerializableOrientation(object) {
    if (!object || !Number.isFinite(Number(object.tier))) return;
    if (!Number.isFinite(Number(object.cometVisualRotation))) {
      object.cometVisualRotation = randomOrientation();
    }
  }

  function textureKeyFor(variant, lod) {
    if (!variant || !lod || typeof cometSpriteTextureKey !== 'function') return null;
    return cometSpriteTextureKey(variant, lod);
  }

  function loadedLod(scene, variant, preferredLod) {
    const entry = COMET_SPRITE_ASSETS?.[variant];
    const lods = Array.isArray(entry?.lods) ? [...entry.lods] : [];
    const order = [];
    if (preferredLod) order.push(preferredLod);
    [64, 32, 128, ...lods].forEach(lod => {
      if (lod && !order.includes(lod)) order.push(lod);
    });
    for (const lod of order) {
      const key = textureKeyFor(variant, lod);
      if (key && scene.textures?.exists?.(key)) return { key, lod };
    }
    return null;
  }

  function setImageDiameter(image, diameter) {
    if (!image || !Number.isFinite(diameter)) return;
    const width = Math.max(1, image.width || image.frame?.realWidth || 1);
    const height = Math.max(1, image.height || image.frame?.realHeight || width);
    image.setDisplaySize(diameter, diameter * (height / width));
  }

  function applySerializableAppearance(scene, container, object) {
    const handle = container?.cometVisual;
    const image = handle?.image;
    if (!handle || !image || !object) return;

    // If this object already has an adopted variant, force the renderer onto it. The underlying
    // renderer may have rolled a different hidden Symbol-state variant after a tier-up/load.
    const variant = object.cometVisualVariant;
    if (variant && variant !== handle.variant) {
      const texture = loadedLod(scene, variant, handle.lod);
      if (texture) {
        image.setTexture(texture.key);
        const phaserTexture = scene.textures.get?.(texture.key);
        if (phaserTexture?.setFilter && Phaser.Textures?.FilterMode) {
          phaserTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        handle.variant = variant;
        handle.lod = texture.lod;
        setImageDiameter(image, Number(handle.baseDisplayDiameterPx) || Math.max(image.displayWidth || 1, 1));
      }
    }

    const rotation = Number(object.cometVisualRotation);
    if (Number.isFinite(rotation)) {
      image.setAngle(rotation);
      // Rotate family effects with the source art. The OUTER object container remains unrotated so
      // DEFLECT/AVOID trajectory animations can still control its angle independently.
      handle.effectsBack?.setAngle?.(rotation);
      handle.effectsFront?.setAngle?.(rotation);
    }

    if (typeof object.cometVisualFlipX === 'boolean') image.setFlipX(object.cometVisualFlipX);
    if (Number.isFinite(Number(object.cometVisualAlpha))) image.setAlpha(Number(object.cometVisualAlpha));
    if (Object.prototype.hasOwnProperty.call(object, 'cometVisualTint')) {
      const tint = object.cometVisualTint;
      if (tint == null) image.clearTint?.();
      else image.setTint?.(tint);
    }
  }

  function recordSerializableAppearance(container, object) {
    const handle = container?.cometVisual;
    const image = handle?.image;
    if (!handle || !image || !object) return;

    if (!object.cometVisualVariant && handle.variant) object.cometVisualVariant = handle.variant;
    if (!Number.isFinite(Number(object.cometVisualRotation))) object.cometVisualRotation = Number(image.angle) || 0;
    if (typeof object.cometVisualFlipX !== 'boolean') object.cometVisualFlipX = !!image.flipX;
    if (!Object.prototype.hasOwnProperty.call(object, 'cometVisualTint')) {
      object.cometVisualTint = handle.tint ?? null;
    }
    if (!Number.isFinite(Number(object.cometVisualAlpha))) object.cometVisualAlpha = Number(image.alpha) || 1;
  }

  function isAbsorbResultPreview(scene, x, object, mystery) {
    if (mystery || !scene?.pending || scene.pending.choice !== 'ABSORB') return false;
    if (object === scene.player || object === scene.other || object?.orbitalVisual) return false;
    if (scene.state !== 'REVEAL') return false;

    // The refined collision animation draws its resulting object either at screen centre, or at the
    // player's position when a tier-up follows a dominant-body absorb.
    const centralResult = Math.abs(Number(x) - W / 2) <= 24;
    const predictedTierUp = Number(object?.tier) !== Number(scene.player?.tier);
    return centralResult || predictedTierUp;
  }

  function appearanceSnapshot(object) {
    if (!object) return null;
    const out = { tier: Number(object.tier) };
    let hasAppearance = false;
    for (const key of APPEARANCE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) continue;
      out[key] = object[key];
      hasAppearance = true;
    }
    return hasAppearance ? out : null;
  }

  function adoptAppearance(player, staged) {
    if (!player || !staged) return false;
    // Do not put a same-tier preview skin onto a different tier. The merge preview is corrected
    // below to account for its 1.2x growth multiplier, so a mismatch is a safety fallback only.
    if (Number(staged.tier) !== Number(player.tier)) return false;
    for (const key of APPEARANCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(staged, key)) player[key] = staged[key];
    }
    return true;
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    // Every sprite-backed gameplay object gets a static random orientation, including named/unique
    // identities and families whose older metadata disabled rotation in standalone mode.
    ensureSerializableOrientation(object);

    const container = baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    applySerializableAppearance(this, container, object);
    recordSerializableAppearance(container, object);

    if (isAbsorbResultPreview(this, x, object, mystery)) {
      this._stagedPlayerAppearance = appearanceSnapshot(object);
    }
    return container;
  };

  GameScene.prototype.animate = function (choice, p, o, pr, or) {
    // Mechanics awards MERGE 1.2x growth, while encounter-animation-v2 historically predicted the
    // result using plain growthPoints(). Temporarily expose the same multiplier so the preview tier
    // is the tier the resolver will actually produce.
    if (choice === 'ABSORB' && this.pending?.result === 'merge' && typeof this.growthPoints === 'function') {
      const original = this.growthPoints;
      this.growthPoints = (...args) => original.apply(this, args) * 1.2;
      try {
        return baseAnimate.call(this, choice, p, o, pr, or);
      } finally {
        this.growthPoints = original;
      }
    }
    return baseAnimate.call(this, choice, p, o, pr, or);
  };

  GameScene.prototype.resolve = function () {
    const staged = this._stagedPlayerAppearance ? { ...this._stagedPlayerAppearance } : null;
    const pending = this.pending;
    const shouldAdopt = !this._devModeActive && !this._labSandboxRun &&
      pending?.choice === 'ABSORB' &&
      !pending?.compactGravityReverse &&
      (pending?.result === 'absorb' || pending?.result === 'merge');

    const value = baseResolve.call(this);

    if (shouldAdopt && staged) adoptAppearance(this.player, staged);
    this._stagedPlayerAppearance = null;
    return value;
  };

  window.CometSpriteContinuity = Object.freeze({
    rotationMode: 'static-quarter-turns',
    appearanceFields: [...APPEARANCE_KEYS],
    preservesThroughSave: true
  });
})();
