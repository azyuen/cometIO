// New opening Atom sprite family + final Observable Universe sprite.
// Runs immediately after sprite-manifest.js and before Phaser scene preload.
(() => {
  const atomVariants = [
    'atom_01','atom_02','atom_03','atom_04','atom_05','atom_06','atom_07'
  ];

  // Use a distinct manifest family name so the historical atomic force-32 corruption workaround
  // in the renderer does not downgrade this newly exported clean pack. Explicit file paths keep
  // the assets in the existing /atomic directory.
  atomVariants.forEach((variant) => {
    COMET_SPRITE_ASSETS[variant] = {
      family: 'earthAtom',
      lods: [32, 64],
      version: 5,
      files: {
        32: `assets/sprites/atomic/${variant}_32.png?v=5`,
        64: `assets/sprites/atomic/${variant}_64.png?v=5`
      }
    };
  });

  COMET_SPRITE_ASSETS.universe_final = {
    family: 'universe',
    lods: [32, 64],
    version: 1,
    files: {
      32: 'assets/sprites/universe/universe_final_32.png?v=1',
      64: 'assets/sprites/universe/universe_final_64.png?v=1'
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
    fixedLods: { mystery: 32, normal: 64 }
  });

  window.CometCosmicSpriteAssetsV1 = Object.freeze({
    enabled: true,
    atomVariants: [...atomVariants],
    atomPalette: 'EARTHY_MIXED',
    atomLods: [32, 64],
    universeVariant: 'universe_final',
    universeLods: [32, 64]
  });
})();
