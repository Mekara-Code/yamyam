import { fetchStoryAsset } from "./story-media";

const frameWidth = 360;
const frameHeight = 640;
const columns = 4;
const framesPerSheet = 16;
const sheetCount = 15;
const lastFrame = sheetCount * framesPerSheet - 1;

type Sheet = {
  image: HTMLImageElement;
  status: "loading" | "ready" | "failed";
};

function sheetUrl(index: number) {
  return `/videos/portrait-frames/${index}.webp`;
}

export async function preparePortraitFrames(
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const downloads = new AbortController();
  const abortDownloads = () => downloads.abort(signal.reason);
  if (signal.aborted) throw signal.reason;
  signal.addEventListener("abort", abortDownloads, { once: true });

  const sheets: Blob[] = new Array(sheetCount);
  let nextIndex = 0;
  let downloaded = 0;

  async function loadSheets() {
    while (nextIndex < sheetCount) {
      const index = nextIndex++;
      const response = await fetchStoryAsset(sheetUrl(index), downloads.signal);
      sheets[index] = await response.blob();
      if (downloads.signal.aborted) return;
      onProgress(++downloaded / sheetCount);
    }
  }

  try {
    // Warm the compressed sheets while leaving decoding to the frame renderer.
    await Promise.all(Array.from({ length: 4 }, loadSheets));
    if (signal.aborted) throw signal.reason;
    return sheets.map((sheet) => URL.createObjectURL(sheet));
  } finally {
    downloads.abort();
    signal.removeEventListener("abort", abortDownloads);
  }
}

export function createPortraitFrames(
  canvas: HTMLCanvasElement,
  onFrame: (progress: number) => void,
  onError: () => void,
  sources?: readonly string[],
) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || typeof Image.prototype.decode !== "function") return null;

  canvas.width = frameWidth;
  canvas.height = frameHeight;

  const sheets = new Map<number, Sheet>();
  let requestedFrame = 0;
  let activeSheet = -1;
  let drawnFrame = -1;

  const draw = () => {
    const sheet = sheets.get(activeSheet);
    if (sheet?.status === "failed") {
      onError();
      return;
    }
    if (sheet?.status !== "ready" || requestedFrame === drawnFrame) return;

    const offset = requestedFrame % framesPerSheet;
    const x = (offset % columns) * frameWidth;
    const y = Math.floor(offset / columns) * frameHeight;
    context.drawImage(sheet.image, x, y, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

    if (drawnFrame === -1) canvas.dataset.ready = "";
    drawnFrame = requestedFrame;
    onFrame(drawnFrame / lastFrame);
  };

  function loadSheet(index: number) {
    if (index < 0 || index >= sheetCount || sheets.has(index)) return;

    const image = new Image();
    const sheet: Sheet = { image, status: "loading" };
    sheets.set(index, sheet);
    image.fetchPriority = index === activeSheet ? "high" : "low";
    image.src = sources?.[index] ?? sheetUrl(index);
    void image.decode().then(
      () => {
        if (sheets.get(index) !== sheet) return;
        sheet.status = "ready";
        draw();
      },
      () => {
        if (sheets.get(index) !== sheet) return;
        sheet.status = "failed";
        draw();
      },
    );
  }

  return {
    render(progress: number) {
      requestedFrame = Math.round(Math.min(1, progress) * lastFrame);
      const index = Math.floor(requestedFrame / framesPerSheet);
      if (index !== activeSheet) {
        activeSheet = index;
        // Keep only three decoded sheets, including the frames for reverse scrolling.
        for (const [loadedIndex, sheet] of sheets) {
          if (Math.abs(loadedIndex - index) > 1) {
            sheets.delete(loadedIndex);
            sheet.image.removeAttribute("src");
          }
        }
        loadSheet(index);
        loadSheet(index + 1);
        loadSheet(index - 1);
      }
      draw();
    },
    dispose() {
      for (const sheet of sheets.values()) sheet.image.removeAttribute("src");
      sheets.clear();
      delete canvas.dataset.ready;
    },
  };
}
