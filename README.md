# YAM YAM

A Persian, right-to-left product story built with Next.js 16, React, GSAP and Framer Motion. Vazirmatn is bundled locally.

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

The project uses Next.js static export. The production files are generated in `out/` and can be served by a static web host. The animations run in the browser.

## Experience

- Scroll in either direction to seek through the product video. Framer Motion renders the progress line and the opening and closing copy.
- Readers who prefer reduced motion can use the video’s native controls.
- The videos in `public/videos/` use the supplied 30 fps landscape and 24 fps portrait clips, with frequent keyframes for seeking.

## Product assets

The hero model is `public/models/yam-yam.glb`; the simplified shelf model is `public/models/yam-yam-shelf.glb`. Both use metres, +Y up and the English label facing +Z. To face the Persian label toward a +Z camera, rotate the model around Y by `-2.342189069` radians.

Transparent WebP renders are in `public/images/`. The asset dimensions, byte sizes, triangle counts and glTF validation results are recorded in `scripts/assets-info.json`.

To rebuild the web copies, run `scripts/build-web-assets.py` with Python, Pillow and NumPy. It reads the sibling `yam-yam-3d/` source model, textures and renders, plus `../output/tomato-hero-photoreal-transparent.png`. Original source assets are preserved.

## Main files

- `components/video-story.tsx`: scroll-driven video with responsive sources and product information over the final frames.
- `app/globals.css`: shared layout and visual styles.
