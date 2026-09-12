# cometIO

A simple Phaser prototype exploring deceptive scale encounters.

## Prototype loop

1. Two objects approach in separate panes at roughly the same apparent size.
2. The player chooses **Absorb** or **Crash**.
3. The panes disappear and the game reveals the objects at their true relative scale.
4. The collision resolves based on mass and speed.
5. Successful encounters award score, speed points, or craters and continue the run.

The current prototype contains three deliberately hand-authored encounters:

- Dust Particle vs Grain of Sand
- Pebble vs Asteroid
- Atom vs Saturn

## Run locally

Open `index.html` in a browser with internet access. Phaser is currently loaded from a CDN, so there is no build step.

## Next useful prototype steps

- Randomise opponents from the object catalogue.
- Let the player's surviving object persist and grow between encounters.
- Improve the scale-reveal transition.
- Add simple pixel-art sprites and impact particles.
- Tune Absorb/Crash rules once the core choice feels fun.
