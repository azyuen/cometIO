# cometIO Phase-Two Sprite Upload Names

All sprite designs use a 32 px and 64 px PNG pair. Keep transparency and use the exact case-sensitive filenames below.

The manifest already reserves every future filename in this document. Future/unuploaded entries intentionally use `lods: []`; when the PNG pair is uploaded, change that entry to `lods: [32, 64]` and bump its asset version.

## Already active: Dwarf Planet named collection

Folder: `assets/sprites/rockyPlanet/`

- `dwarf_ceres_32.png` / `dwarf_ceres_64.png`
- `dwarf_pluto_32.png` / `dwarf_pluto_64.png`
- `dwarf_eris_32.png` / `dwarf_eris_64.png`
- `dwarf_haumea_32.png` / `dwarf_haumea_64.png`
- `dwarf_makemake_32.png` / `dwarf_makemake_64.png`
- `dwarf_gonggong_32.png` / `dwarf_gonggong_64.png`
- `dwarf_quaoar_32.png` / `dwarf_quaoar_64.png`
- `dwarf_sedna_32.png` / `dwarf_sedna_64.png`

Dwarf Planet currently shares the proven generic/mystery rocky-planet rendering path.

## Already active: Rocky Planet

Folder: `assets/sprites/rockyPlanet/`

Generic/mystery:
- `rockyPlanet_01_32.png` / `rockyPlanet_01_64.png`
- `rockyPlanet_02_32.png` / `rockyPlanet_02_64.png`
- `rockyPlanet_mystery_01_32.png` / `rockyPlanet_mystery_01_64.png`

Named:
- `planet_mercury_32.png` / `planet_mercury_64.png`
- `planet_venus_32.png` / `planet_venus_64.png`
- `planet_earth_32.png` / `planet_earth_64.png`
- `planet_mars_32.png` / `planet_mars_64.png`

## Already active: Gas Planet

Folder: `assets/sprites/gasPlanet/`

Generic/mystery:
- `gasPlanet_01_32.png` / `gasPlanet_01_64.png`
- `gasPlanet_02_32.png` / `gasPlanet_02_64.png`
- `gasPlanet_mystery_01_32.png` / `gasPlanet_mystery_01_64.png`

Named:
- `planet_jupiter_32.png` / `planet_jupiter_64.png`
- `planet_saturn_32.png` / `planet_saturn_64.png`
- `planet_uranus_32.png` / `planet_uranus_64.png`
- `planet_neptune_32.png` / `planet_neptune_64.png`

## Yellow Dwarf Star

Folder: `assets/sprites/star/`

Generic/mystery:
- `yellowDwarf_01_32.png` / `yellowDwarf_01_64.png`
- `yellowDwarf_02_32.png` / `yellowDwarf_02_64.png`
- `yellowDwarf_mystery_01_32.png` / `yellowDwarf_mystery_01_64.png`

Named:
- `yellowDwarf_sun_32.png` / `yellowDwarf_sun_64.png`
- `yellowDwarf_alphaCentauriA_32.png` / `yellowDwarf_alphaCentauriA_64.png`
- `yellowDwarf_tauCeti_32.png` / `yellowDwarf_tauCeti_64.png`
- `yellowDwarf_18Scorpii_32.png` / `yellowDwarf_18Scorpii_64.png`

## Blue Giant Star

Folder: `assets/sprites/star/`

Generic/mystery:
- `blueGiant_01_32.png` / `blueGiant_01_64.png`
- `blueGiant_02_32.png` / `blueGiant_02_64.png`
- `blueGiant_mystery_01_32.png` / `blueGiant_mystery_01_64.png`

Named:
- `blueGiant_rigel_32.png` / `blueGiant_rigel_64.png`
- `blueGiant_spica_32.png` / `blueGiant_spica_64.png`
- `blueGiant_alnitak_32.png` / `blueGiant_alnitak_64.png`
- `blueGiant_bellatrix_32.png` / `blueGiant_bellatrix_64.png`

## Red Hypergiant Star gameplay tier

Folder: `assets/sprites/star/`

Generic/mystery:
- `redHypergiant_01_32.png` / `redHypergiant_01_64.png`
- `redHypergiant_02_32.png` / `redHypergiant_02_64.png`
- `redHypergiant_mystery_01_32.png` / `redHypergiant_mystery_01_64.png`

Named:
- `redHypergiant_betelgeuse_32.png` / `redHypergiant_betelgeuse_64.png`
- `redHypergiant_vyCanisMajoris_32.png` / `redHypergiant_vyCanisMajoris_64.png`
- `redHypergiant_uyScuti_32.png` / `redHypergiant_uyScuti_64.png`
- `redHypergiant_nmlCygni_32.png` / `redHypergiant_nmlCygni_64.png`

Betelgeuse and UY Scuti are scientifically tagged as red supergiants in the identity catalogue while remaining in the game's Red Hypergiant progression tier.

## Nebula

Folder: `assets/sprites/nebula/`

Generic/mystery:
- `nebula_01_32.png` / `nebula_01_64.png`
- `nebula_02_32.png` / `nebula_02_64.png`
- `nebula_mystery_01_32.png` / `nebula_mystery_01_64.png`

Named:
- `nebula_orion_32.png` / `nebula_orion_64.png`
- `nebula_carina_32.png` / `nebula_carina_64.png`
- `nebula_eagle_32.png` / `nebula_eagle_64.png`
- `nebula_helix_32.png` / `nebula_helix_64.png`
- `nebula_ring_32.png` / `nebula_ring_64.png`
- `nebula_dumbbell_32.png` / `nebula_dumbbell_64.png`
- `nebula_butterfly_32.png` / `nebula_butterfly_64.png`
- `nebula_catsEye_32.png` / `nebula_catsEye_64.png`
- `nebula_hourglass_32.png` / `nebula_hourglass_64.png`
- `nebula_rosette_32.png` / `nebula_rosette_64.png`
- `nebula_tarantula_32.png` / `nebula_tarantula_64.png`
- `nebula_horsehead_32.png` / `nebula_horsehead_64.png`

The current Eagle and Helix sprite pairs are refreshed art; overwrite the existing files with the same filenames. Their manifest asset versions are bumped so cached installs request the new images.

## Pulsar

Folder: `assets/sprites/pulsar/`

Generic/mystery:
- `pulsar_01_32.png` / `pulsar_01_64.png`
- `pulsar_02_32.png` / `pulsar_02_64.png`
- `pulsar_mystery_01_32.png` / `pulsar_mystery_01_64.png`

Named:
- `pulsar_crab_32.png` / `pulsar_crab_64.png`
- `pulsar_vela_32.png` / `pulsar_vela_64.png`
- `pulsar_geminga_32.png` / `pulsar_geminga_64.png`
- `pulsar_b1509_32.png` / `pulsar_b1509_64.png`
- `pulsar_b1257_12_32.png` / `pulsar_b1257_12_64.png`
- `pulsar_b1957_20_32.png` / `pulsar_b1957_20_64.png`
- `pulsar_j0337_1715_32.png` / `pulsar_j0337_1715_64.png`
- `pulsar_j1748_2446ad_32.png` / `pulsar_j1748_2446ad_64.png`
- `pulsar_j0437_4715_32.png` / `pulsar_j0437_4715_64.png`
- `pulsar_j1023_0038_32.png` / `pulsar_j1023_0038_64.png`
- `pulsar_b1919_21_32.png` / `pulsar_b1919_21_64.png`
- `pulsar_j2124_3358_32.png` / `pulsar_j2124_3358_64.png`

## Black Hole

Folder: `assets/sprites/blackHole/`

Generic/mystery:
- `blackHole_01_32.png` / `blackHole_01_64.png`
- `blackHole_02_32.png` / `blackHole_02_64.png`
- `blackHole_mystery_01_32.png` / `blackHole_mystery_01_64.png`

Named:
- `blackHole_cygnusX1_32.png` / `blackHole_cygnusX1_64.png`
- `blackHole_v404Cygni_32.png` / `blackHole_v404Cygni_64.png`
- `blackHole_gaiaBH1_32.png` / `blackHole_gaiaBH1_64.png`
- `blackHole_maxiJ1820_070_32.png` / `blackHole_maxiJ1820_070_64.png`

## Super Massive Black Hole

Folder: `assets/sprites/blackHole/`

Generic/mystery:
- `smbh_01_32.png` / `smbh_01_64.png`
- `smbh_02_32.png` / `smbh_02_64.png`
- `smbh_mystery_01_32.png` / `smbh_mystery_01_64.png`

Named:
- `smbh_sagittariusA_32.png` / `smbh_sagittariusA_64.png`
- `smbh_m87_32.png` / `smbh_m87_64.png`
- `smbh_ton618_32.png` / `smbh_ton618_64.png`
- `smbh_ngc4889_32.png` / `smbh_ngc4889_64.png`

## Collection totals

Collectibles begin at Dwarf Planet:

- Dwarf Planet: 8
- Rocky Planet: 4
- Gas Planet: 4
- Yellow Dwarf Star: 4
- Blue Giant Star: 4
- Red Hypergiant Star: 4
- Nebula: 12
- Pulsar: 12
- Black Hole: 4
- Super Massive Black Hole: 4

Total: **60 unique collectible objects**.

Named comets remain outside the collection and may repeat after any outcome.
