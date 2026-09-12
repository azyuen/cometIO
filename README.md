# cometIO

A Phaser web-game prototype about deceptive cosmic scale and risk/reward collisions.

## Core loop

Two objects approach in separate panes and appear roughly the same size on screen. The player knows their own size, mass and speed, but the approaching object's true size and mass are hidden until after a decision.

The player chooses:

- **Absorb** — highest risk/highest reward. Attempt a head-on absorption. Success adds mass and speed and can evolve the player's object into a larger class. Failure means being absorbed and game over.
- **Deflect** — medium risk. Attempt a grazing encounter or gravitational slingshot. Success can add speed and award **craters**, a currency intended for future power-ups. Failure means impact and game over.
- **Avoid** — lowest risk. Change course early. Successful avoidance costs speed, with larger/more massive targets generally imposing a larger penalty. Failure can result in orbital capture or orbital decay and impact.

## Physics model

The prototype stores approximate physical values for each object:

- size (radius)
- mass
- speed

Outcome probabilities are based on relative size, relative mass, relative speed, collision energy and the target's escape velocity. The system is deliberately game-friendly rather than a full orbital simulation, but very large bodies can overwhelm strategies that work against smaller objects.

Excessive relative speed makes head-on absorption harder because kinetic energy rises with speed squared. Higher speed is more useful for escape and deflection.

## Current progression

The player begins as a dust particle. Successful absorption increases mass and can move through game stages such as grain of sand, pebble, boulder, meteoroid, asteroid, comet, moon, planet and beyond.

These progression labels are a game abstraction rather than strict astronomical taxonomy.

## Deployment

The game is a static `index.html` and is suitable for GitHub Pages. Phaser is loaded from a CDN, so there is currently no build step.
