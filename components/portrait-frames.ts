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

export function createPortraitFrames(
  canvas: HTMLCanvasElement,
  onFrame: (progress: number) => void,
  onError: () => void,
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
    image.src = `/videos/portrait-frames/${index}.webp`;
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
