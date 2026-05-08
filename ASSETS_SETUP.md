# GLB Asset Setup (Cartoon Low Poly)

Put your downloaded `.glb` files in these paths:

- `assets/models/boats/boat.glb`
- `assets/models/characters/rower.glb`
- `assets/models/obstacles/buoy.glb`
- `assets/models/obstacles/crate.glb`
- `assets/models/obstacles/rock.glb`
- `assets/models/scenery/Tree.glb`
- `assets/models/scenery/reeds.glb`

Player setup now uses two separate models:
- Boat: `assets/models/boats/boat.glb`
- Character: `assets/models/characters/rower.glb`

If your file names are different, update `src/assetCatalog.js`.

## Recommended Sources

- Kenney: https://kenney.nl/assets/category:3D
- Poly Pizza: https://polypizza.com/
- Quaternius animated characters: https://poly.pizza/bundle/Animated-Men-Pack-DAC9SDgMQT

## License Notes

Prefer CC0 / Public Domain assets when possible.
If an asset is CC BY, keep attribution in your project docs.

## Hosting Note (GitHub Pages)

這個專案的 `vite.config.js` 設定了 `publicDir: "assets"`。
因此遊戲端載入模型時會使用 `/models/...` 路徑（不是 `/assets/...`）。
