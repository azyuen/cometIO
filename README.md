# cometIO

A portrait-mobile Phaser web-game prototype about deceptive cosmic scale, incomplete information and risk/reward encounters.

## Core loop

Two objects approach in separate panes at misleadingly similar apparent sizes. The player sees their own mass, speed and tier, but the target's true scale is hidden until a choice is locked in.

- **Absorb** — highest risk and reward. A head-on attempt to gain growth, mass and speed. Failure is game over.
- **Deflect** — medium risk. A grazing encounter can produce a clean slingshot with speed/craters, a rough but survivable deflection that strips speed/mass, or—mainly against extreme mismatches—a catastrophic collision.
- **Avoid** — safest option. Early course correction usually survives but costs speed; sufficiently powerful gravity can still capture the player.

After the action, the result screen compares the two objects' real size, mass and speed and explains why the outcome occurred.

## Progression and regions

Progression uses 17 game tiers from Atom through Super Massive Black Hole. Growth is intentionally game-balanced rather than proportional to literal astronomical mass.

Every four successful encounters, the player chooses a region: Outer Heliosphere, Oort Cloud, Scattered Disk, Kuiper Belt, Asteroid Belt, Inner Solar System, Outer Solar System or Hyperspace. Each region biases the encounter table toward scientifically plausible object populations while still allowing progression.

Larger encounters are identified with representative real objects such as Ceres, Jupiter, the Sun, Rigel, the Orion Nebula, the Crab Pulsar, Cygnus X-1 and Sagittarius A*.

## Persistence

Runs can be saved and loaded in browser local storage. The best five local scores record player name, score, mass, object/tier reached and successful action streak.

## Mobile web app

The game includes a web-app manifest and Apple Home Screen icon. The UI reserves a black status-bar area at the top for phone HUD elements and renders interface text at high resolution while keeping the space objects visually game-like.
