// Named reveal sprites are optional. Mystery/decision rendering always delegates to the generic family.
// If a named PNG is not registered/loaded, the existing family/procedural renderer is used unchanged.
(() => {
  const baseDrawObject = GameScene.prototype.drawObject;
  const NAMED_STATE = Symbol('cometNamedVisualState');
  const MAX_SAFE_NAMED_SCALE = 3;

  function availableNamedTexture(scene, variant) {
    const entry = COMET_SPRITE_ASSETS[variant];
    if (!entry || !Array.isArray(entry.lods) || !entry.lods.length) return null;
    const lods = [...entry.lods].sort((a, b) => b - a);
    for (const lod of lods) {
      const key = cometSpriteTextureKey(variant, lod);
      if (scene.textures.exists(key)) return { key, lod };
    }
    return null;
  }

  function getNamedState(object, identity) {
    let state = object?.[NAMED_STATE];
    if (state) return state;

    let rotation = 0;
    if (identity?.allowRotation) {
      const step = Number(identity.rotationStep) || 0;
      if (step > 0) rotation = Math.floor(Math.random() * Math.max(1, Math.round(360 / step))) * step;
      else rotation = Math.random() * 360;
    }

    state = {
      rotation,
      flipX: !!identity?.allowFlip && Math.random() < COMET_VISUAL_SETTINGS.defaultFlipChance
    };

    try {
      Object.defineProperty(object, NAMED_STATE, { value: state, enumerable: true, configurable: true });
    } catch (e) {
      // Rendering still works if an unusual immutable object is ever supplied.
    }
    return state;
  }

  function setDisplayDiameter(image, diameterPx) {
    const width = Math.max(image.width || 1, 1);
    const height = Math.max(image.height || width, 1);
    image.setDisplaySize(diameterPx, diameterPx * (height / width));
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    // Never expose named identity artwork during the uncertainty/decision stage.
    if (mystery || !object?.identityId || !object?.namedSpriteBase) {
      return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    }

    const named = availableNamedTexture(this, object.namedSpriteBase);
    if (!named) return baseDrawObject.call(this, x, y, radius, object, mystery, glow);

    const diameter = Math.max(1, radius * 2);
    if (diameter > named.lod * MAX_SAFE_NAMED_SCALE) {
      return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    }

    const identity = getCometNamedIdentity(object.identityId);
    const state = getNamedState(object, identity);
    const container = this.add.container(x, y);
    const image = this.add.image(0, 0, named.key);
    const texture = this.textures.get?.(named.key);

    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    image.setAngle(state.rotation);
    image.setFlipX(state.flipX);
    image.setAlpha(1);
    if (image.setBlendMode && typeof Phaser !== 'undefined' && Phaser.BlendModes) {
      image.setBlendMode(Phaser.BlendModes.NORMAL);
    }
    setDisplayDiameter(image, diameter);

    container.add(image);
    this.ui.add(container);

    container.cometVisual = {
      scene: this,
      container,
      object,
      mystery: false,
      variant: object.namedSpriteBase,
      lod: named.lod,
      image,
      baseDisplayDiameterPx: diameter,
      tint: null,
      fallback: false,
      namedIdentity: true
    };
    container.cometCollisionFamily = getCometVisualDefinition(object).collisionFamily;
    container.setVisualDisplayDiameter = function (diameterPx) {
      container.cometVisual.baseDisplayDiameterPx = Math.max(1, diameterPx);
      setDisplayDiameter(image, container.cometVisual.baseDisplayDiameterPx);
      return container;
    };
    container.refreshVisualLOD = () => container;
    return container;
  };
})();
