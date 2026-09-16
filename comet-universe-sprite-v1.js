// Dedicated final Observable Universe sprite. Loaded last so it replaces the old procedural
// universe drawing without changing the existing finale timing, zoom, encounter, or reset logic.
(() => {
  if (typeof GameScene === 'undefined' || !window.CometCosmicSpriteAssetsV1) return;
  const proto = GameScene.prototype;
  const baseDrawObject = proto.drawObject;
  const VARIANT = 'universe_final';

  function pickTexture(scene, diameterPx) {
    const preferred = diameterPx <= (COMET_VISUAL_SETTINGS?.lodThresholds?.smallMaxPx ?? 48) ? 32 : 64;
    const order = preferred === 32 ? [32, 64] : [64, 32];
    for (const lod of order) {
      const key = cometSpriteTextureKey(VARIANT, lod);
      if (scene.textures.exists(key)) return { key, lod };
    }
    return null;
  }

  function setNearest(scene, key) {
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && typeof Phaser !== 'undefined' && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  function setDiameter(image, diameterPx) {
    image.setDisplaySize(Math.max(1, diameterPx), Math.max(1, diameterPx));
  }

  proto.drawObject = function (x, y, radius, object, mystery = false, glow = false) {
    if (object?.kind !== 'universe') {
      return baseDrawObject.call(this, x, y, radius, object, mystery, glow);
    }

    const diameter = Math.max(1, radius * 2);
    const texture = pickTexture(this, diameter);
    if (!texture) return baseDrawObject.call(this, x, y, radius, object, mystery, glow);

    const container = this.add.container(x, y);
    if (glow) {
      const halo = this.add.graphics();
      halo.fillStyle(C.cyan, .035).fillCircle(0, 0, radius + 12);
      halo.fillStyle(C.purple, .022).fillCircle(0, 0, radius + 6);
      container.add(halo);
    }

    const image = this.add.image(0, 0, texture.key);
    setNearest(this, texture.key);
    setDiameter(image, diameter);
    if (mystery) image.setAlpha(.68);
    container.add(image);
    this.ui.add(container);

    container.cometVisual = {
      scene: this,
      container,
      object,
      mystery,
      variant: VARIANT,
      lod: texture.lod,
      image,
      baseDisplayDiameterPx: diameter,
      tint: null,
      fallback: false,
      finalUniverse: true
    };
    container.cometCollisionFamily = 'cosmic';
    container.setVisualDisplayDiameter = function (diameterPx) {
      const nextDiameter = Math.max(1, diameterPx);
      const nextTexture = pickTexture(container.cometVisual.scene, nextDiameter);
      if (nextTexture && nextTexture.key !== image.texture.key) {
        image.setTexture(nextTexture.key);
        setNearest(container.cometVisual.scene, nextTexture.key);
        container.cometVisual.lod = nextTexture.lod;
      }
      container.cometVisual.baseDisplayDiameterPx = nextDiameter;
      setDiameter(image, nextDiameter);
      return container;
    };
    container.refreshVisualLOD = () => {
      container.setVisualDisplayDiameter(container.cometVisual.baseDisplayDiameterPx);
      return container;
    };
    return container;
  };

  window.CometUniverseSpriteV1 = Object.freeze({
    enabled: true,
    variant: VARIANT,
    replacesProceduralUniverse: true,
    preservesFinaleFlow: true
  });
})();
