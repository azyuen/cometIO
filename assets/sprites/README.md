# cometIO sprite library

The game will run with this folder completely empty. Existing procedural graphics are the fallback.

## Naming

Use the family folders and the pattern:

`<variant>_<lod>.png`

Examples:

- `rock/rock_01_32.png`
- `rock/rock_01_64.png`
- `rock/rock_01_128.png`
- `rock/rock_mystery_01_32.png`
- `comet/comet_01_64.png`
- `star/star_01_128.png`

LOD numbers are source texture resolutions, not game-world/display sizes.

## Registering a PNG

After adding a PNG, edit `sprite-manifest.js` and add its available resolution to that variant's `lods` list. For example:

```js
rock_01: { family: 'rock', lods: [32, 64, 128] }
```

The renderer then preloads those files automatically. No Phaser preload statements need to be added.

## Mystery sprites

Mystery variants are separate from normal variants so the encounter screen can remain ambiguous. Related objects intentionally share family mystery sprites; e.g. Tiny Meteorite, Large Meteorite and Asteroid all use the `rock` family.

If a mystery sprite is not available, the game uses its existing generic/procedural mystery graphic. It never substitutes a detailed normal sprite during the hidden-identity phase.
