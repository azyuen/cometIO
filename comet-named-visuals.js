// Named reveal sprites are optional. Mystery/decision rendering always delegates to the generic family.
// If a named PNG is not registered/loaded, the existing family/procedural renderer is used unchanged.
(() => {
  const baseDrawObject = GameScene.prototype.drawObject;
  const NAMED_STATE = Symbol('cometNamedVisualState');

  function namedLodOrder(entry, diameterPx, variant) {
    const lods = Array.isArray(entry?.lods) ? [...entry.lods] : [];
    if (!lods.length) return [];

    // Known source-art workarounds: prefer the clean 32px file and nearest-neighbour upscale.
    // Gas-planet 64px files contain literal RGB garbage beneath transparency; Ceres' current 64px
    // source can render black/empty on the Home Screen build, while its 32px counterpart is stable.
    if ((entry.family === 'gasPlanet' || variant === 'dwarf_ceres') && lods.includes(32)) {
      return [32, ...lods.filter(lod => lod !== 32)];
    }

    const threshold = COMET_VISUAL_SETTINGS?.lodThresholds?.smallMaxPx ?? 48;
    const preferred = diameterPx <= threshold ? 32 : 64;
    return lods.sort((a, b) => {
      if (a === preferred) return -1;
      if (b === preferred) return 1;
      return Math.abs(a - preferred) - Math.abs(b - preferred);
    });
  }

  function availableNamedTexture(scene, variant, diameterPx) {
    const entry = COMET_SPRITE_ASSETS[variant];
    if (!entry || !Array.isArray(entry.lods) || !entry.lods.length) return null;

    for (const lod of namedLodOrder(entry, diameterPx, variant)) {
      const key = cometSpriteTextureKey(variant, lod);
      if (scene.textures.exists(key)) return { key, lod };
    }
    return null;
  }

  function applyNearestFilter(scene, key) {
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  function getNamedState(object, identity) {
    let state = object?.[NAMED_STATE];
    if (state) return state;

    const standalone = typeof window !== 'undefined' && window.COMET_STANDALONE === true;
    let rotation = 0;
    if (!standalone && identity?.allowRotation) {
      const step = Number(identity.rotationStep) || 0;
      if (step > 0) rotation = Math.floor(Math.random() * Math.max(1, Math.round(360 / step))) * step;
      else rotation = Math.random() * 360;
    }

    state = {
      rotation,
      flipX: !standalone && !!identity?.allowFlip && Math.random() < COMET_VISUAL_SETTINGS.defaultFlipChance
    };

    try {
      Object.defineProperty(object, NAMED_STATE, { value: state, enumerable: true, configurable: true });
    } catch (e) {}
    return state;
  }

  function setDisplayDiameter(image, diameterPx) {
    const width = Math.max(image.width || 1, 1);
    const height = Math.max(image.height || width, 1);
    image.setDisplaySize(diameterPx, diameterPx * (height / width));
  }

  GameScene.prototype.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    if (mystery || !object?.identityId || !object?.namedSpriteBase) {
      return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    }

    const diameter = Math.max(1, radius * 2);
    const named = availableNamedTexture(this, object.namedSpriteBase, diameter);
    if (!named) return baseDrawObject.call(this, x, y, radius, object, mystery, glow);

    const identity = getCometNamedIdentity(object.identityId);
    const state = getNamedState(object, identity);
    const container = this.add.container(x, y);
    const image = this.add.image(0, 0, named.key);

    applyNearestFilter(this, named.key);
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
      const nextDiameter = Math.max(1, diameterPx);
      const nextNamed = availableNamedTexture(container.cometVisual.scene, object.namedSpriteBase, nextDiameter);

      if (nextNamed && nextNamed.key !== image.texture.key) {
        image.setTexture(nextNamed.key);
        applyNearestFilter(container.cometVisual.scene, nextNamed.key);
        container.cometVisual.lod = nextNamed.lod;
      }

      container.cometVisual.baseDisplayDiameterPx = nextDiameter;
      setDisplayDiameter(image, nextDiameter);
      return container;
    };
    container.refreshVisualLOD = () => {
      container.setVisualDisplayDiameter(container.cometVisual.baseDisplayDiameterPx);
      return container;
    };
    return container;
  };
})();
