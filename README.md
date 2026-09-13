# cometIO

A portrait-mobile Phaser web-game prototype about deceptive cosmic scale, incomplete information and risk/reward encounters.

## Core loop

Two objects approach in separate panes at misleadingly similar apparent sizes. The player sees their own mass, speed and tier, but the target's true scale is hidden until a choice is locked in.

- **Absorb** — highest risk and reward. A head-on attempt to gain growth, mass and speed. Outcomes depend on the relative object scale.
- **Deflect** — medium risk. A grazing encounter can produce a clean slingshot with speed/craters, a rough but survivable deflection that strips speed/mass, or—mainly against extreme mismatches—a catastrophic collision.
- **Avoid** — safest option. Early course correction usually survives but costs speed; sufficiently powerful gravity can still capture the player.

## Visual architecture

Gameplay/progression data remains in `comet-data.js`. Sprite metadata lives separately in `comet-visual-config.js`.

`comet-visual-renderer.js` wraps the existing procedural `drawObject()` renderer. If a registered sprite is available, it draws the sprite. If not, it calls the original procedural renderer, so the game continues to work with an empty sprite library.

Sprite assets live under:

`assets/sprites/<visualFamily>/`

Current visual families:

- `atomic`
- `dust`
- `rock`
- `comet`
- `rockyPlanet`
- `gasPlanet`
- `star`
- `nebula`
- `pulsar`
- `blackHole`

File convention:

`<variant>_<lod>.png`

Example:

`assets/sprites/rock/rock_01_64.png`

After adding a PNG, register the available LOD in `assets/sprites/sprite-manifest.js`. The loader is configuration-driven; no Phaser preload code needs to be added.

LOD selection is based on the existing calculated on-screen display size. The current defaults are:

- up to 48px displayed diameter → prefer 32px texture
- 49–96px → prefer 64px texture
- above 96px → prefer 128px texture

If the preferred LOD is unavailable, the closest registered LOD is used. Texture changes preserve the existing display size.

Mystery variants are separate from revealed variants. Related objects can therefore share ambiguous art without exposing their true identity during the decision stage. If mystery art is missing, the original generic mystery renderer is used instead of substituting revealing normal art.

The visual renderer also provides family-level tint palettes, stable per-encounter rotation/flip/alpha variation, collision-family metadata and no-op effect hooks for future comet tails, stellar glows, pulsar beams, nebula effects and black-hole accretion effects.

### Visual debug mode

Debug overlays are disabled by default. To enable them at runtime:

```js
CometVisuals.setDebug(true)
```

Then render/start the next encounter. The overlay shows true type, visual family, collision family, variant, LOD, displayed size and tint. It must remain disabled for normal play because it intentionally reveals hidden identity information.

### Tests

Run the dependency-free visual smoke test with:

```bash
node tests/visual-smoke-test.js
```

It checks family mappings, zero-asset procedural fallback, mystery-art protection, LOD selection and size preservation across LOD changes.

## Progression and regions

Progression uses 17 game tiers from Atom through Super Massive Black Hole. Growth is intentionally game-balanced rather than proportional to literal astronomical mass.

Every four successful encounters, the player chooses a region: Outer Heliosphere, Oort Cloud, Scattered Disk, Kuiper Belt, Asteroid Belt, Inner Solar System, Outer Solar System or Hyperspace. Each region biases the encounter table toward scientifically plausible object populations while still allowing progression.

## Persistence

Runs can be saved and loaded in browser local storage. The best five local scores record player name, score, mass, object/tier reached and action totals.

## Mobile web app

The game includes a web-app manifest and Apple Home Screen icon. The UI reserves a black status-bar area at the top for phone HUD elements.
