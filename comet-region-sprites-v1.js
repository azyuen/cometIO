// Pixel-art artwork for the phase-specific region selection cards.
// Expected upload folder: assets/sprites/regions/*.png
(() => {
  if (typeof GameScene === 'undefined') return;

  const proto = GameScene.prototype;
  const previousPreload = proto.preload;
  const previousRegionButton = proto.regionButton;

  const REGION_SPRITES = Object.freeze({
    'zodiacal-cloud': 'zodiacal_cloud_64.png',
    'main-asteroid-belt': 'main_asteroid_belt_64.png',
    'kuiper-belt': 'kuiper_belt_64.png',
    'scattered-disc': 'scattered_disc_64.png',

    'inner-solar-system': 'inner_solar_system_64.png',
    'outer-solar-system': 'outer_solar_system_64.png',
    'solar-neighbourhood': 'solar_neighbourhood_64.png',
    'orion-molecular-cloud': 'orion_molecular_cloud_64.png',

    'supernova-remnant': 'supernova_remnant_64.png',
    'globular-cluster': 'globular_cluster_64.png',
    'galactic-bulge': 'galactic_bulge_64.png',
    'galactic-centre': 'galactic_centre_64.png',

    'local-group': 'local_group_64.png',
    'virgo-cluster': 'virgo_cluster_64.png',
    'laniakea-supercluster': 'laniakea_supercluster_64.png',
    'cosmic-web': 'cosmic_web_64.png'
  });

  const textureKey = id => `comet-region:${id}:64`;

  proto.preload = function () {
    if (typeof previousPreload === 'function') previousPreload.call(this);
    Object.entries(REGION_SPRITES).forEach(([id, file]) => {
      this.load.image(textureKey(id), `assets/sprites/regions/${file}?v=1`);
    });
  };

  function useNearest(scene, key) {
    const texture = scene.textures.get?.(key);
    if (texture?.setFilter && Phaser.Textures?.FilterMode) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  proto.regionButton = function (x, y, r) {
    const key = textureKey(r.id);

    // If an asset has not been uploaded yet, preserve the existing placeholder card.
    if (!REGION_SPRITES[r.id] || !this.textures.exists(key)) {
      return typeof previousRegionButton === 'function'
        ? previousRegionButton.call(this, x, y, r)
        : undefined;
    }

    const selected = r.id === this.region().id;
    const color = selected ? C.green : C.cyan;
    const w = 184, h = 184;
    const c = this.add.container(x, y);
    const g = this.add.graphics();

    g.fillStyle(C.panel, .96).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.lineStyle(selected ? 2.5 : 1.5, color, selected ? .96 : .72)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    g.fillStyle(C.panel2, .28).fillRoundedRect(-78, -80, 156, 132, 6);
    g.lineStyle(1, C.cyan, .12).strokeRoundedRect(-78, -80, 156, 132, 6);
    g.lineStyle(1, color, .30).lineBetween(-72, 53, 72, 53);

    useNearest(this, key);
    const image = this.add.image(0, -15, key).setDisplaySize(128, 128);

    const nameSize = r.name.length > 20 ? '8.7px' : r.name.length > 16 ? '9.4px' : '10.2px';
    const label = this.add.text(0, 70, r.name, {
      fontFamily: FONT,
      fontSize: nameSize,
      fontStyle: 'bold',
      color: '#fff',
      align: 'center',
      wordWrap: { width: 164 }
    }).setOrigin(.5);
    if (label.setResolution) label.setResolution(Math.min(window.devicePixelRatio || 1, 3));

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, .001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.regionId = r.id;
      this.lastRegionPromptEncounter = this.encounters;
      this.save(true);
      this.other = this.pickOpponent();
      this.drawEncounter();
    });

    c.add([g, image, label, hit]);
    this.ui.add(c);
    return c;
  };

  window.CometRegionSprites = Object.freeze({
    version: 1,
    folder: 'assets/sprites/regions/',
    displaySize: 128,
    assets: { ...REGION_SPRITES }
  });
})();
