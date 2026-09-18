// New opening Atom sprite family + final Observable Universe sprite.
// Runs immediately after sprite-manifest.js and before Phaser scene preload.
(() => {
  const atomVariants = [
    'atom_01','atom_02','atom_03','atom_04','atom_05','atom_06','atom_07'
  ];

  // The current 64px Atom exports can produce the historical rainbow/checker-square corruption on
  // some Phaser/WebGL paths. Keep both files in the asset pack, but identify them as atomic so the
  // renderer's proven clean-32 policy is used in live gameplay until the 64px sources are re-exported.
  atomVariants.forEach((variant) => {
    COMET_SPRITE_ASSETS[variant] = {
      family: 'atomic',
      lods: [32, 64],
      version: 6,
      files: {
        32: `assets/sprites/atomic/${variant}_32.png?v=6`,
        64: `assets/sprites/atomic/${variant}_64.png?v=6`
      }
    };
  });

  COMET_SPRITE_ASSETS.universe_final = {
    family: 'universe',
    lods: [32, 64],
    version: 2,
    files: {
      32: 'assets/sprites/universe/universe_final_32.png?v=2',
      64: 'assets/sprites/universe/universe_final_64.png?v=2'
    }
  };

  // Preserve the mixed earthy colours baked into the PNGs. Random tinting made the old atoms look
  // more uniform and would defeat the visual transition toward the Dust Particle tier.
  Object.assign(COMET_VISUAL_FAMILIES.atomic, {
    normalVariants: atomVariants,
    mysteryVariants: atomVariants,
    sharedVariants: atomVariants,
    tintEnabled: false,
    tintPalette: [],
    mysteryTintPalette: [],
    lodByDisplayedSize: true,
    fixedLods: { mystery: 32, normal: 32 }
  });

  window.CometCosmicSpriteAssetsV1 = Object.freeze({
    enabled: true,
    atomVariants: [...atomVariants],
    atomPalette: 'EARTHY_MIXED',
    atomLods: [32, 64],
    liveAtomLod: 32,
    stable32Workaround: true,
    universeVariant: 'universe_final',
    universeLods: [32, 64]
  });
})();