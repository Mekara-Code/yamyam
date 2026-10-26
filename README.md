# YAM YAM

A Persian, right-to-left product story and interactive tomato-paste store built with Next.js 16, React, Three.js and Framer Motion. The product uses a real glTF model with photographic label artwork. Vazirmatn is bundled locally.

## Run locally

```powershell
npm install
npm run dev
```

Open [http://127.0.0.1:3003](http://127.0.0.1:3003). The development command binds to the local machine on port 3003.

## Check and build

```powershell
npm run typecheck
npm run build
```

The project uses Next.js static export. The production files are generated in `out/` and can be served by a static web host. The interactive scenes and cart run in the browser; a Next.js application server is not needed for the exported site.

## Experience

- Scroll through the product story with a Three.js can and Framer Motion transitions.
- Enter the Three.js store and select a can to send it toward the basket.
- Open the cart to change quantities, remove items or empty it. The cart holds up to 12 cans and saves its quantity in this browser's local storage.
- The basket is a local demonstration. This project does not submit orders or process payments.

## Product assets

The hero model is `public/models/yam-yam.glb`; the simplified shelf model is `public/models/yam-yam-shelf.glb`. Both use metres, +Y up and the English label facing +Z. To face the Persian label toward a +Z camera, rotate the model around Y by `-2.342189069` radians.

Transparent WebP renders are in `public/images/`. The asset dimensions, byte sizes, triangle counts and glTF validation results are recorded in `scripts/assets-info.json`.

To rebuild the web copies, run `scripts/build-web-assets.py` with Python, Pillow and NumPy. It reads the sibling `yam-yam-3d/` source model, textures and renders, plus `../output/tomato-hero-photoreal-transparent.png`. Original source assets are preserved.

## Main files

- `components/story-content.tsx` and `components/product-stage.tsx`: product story and hero scene.
- `components/store-scene.tsx` and `lib/store-engine.ts`: store controls, shelves, picking and can animation.
- `components/cart-provider.tsx` and `components/cart-drawer.tsx`: local cart state and drawer.
- `app/globals.css`: shared layout and visual styles.
