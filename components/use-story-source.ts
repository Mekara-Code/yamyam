import { useLayoutEffect, useState } from "react";
import { preparePortraitFrames } from "./portrait-frames";
import { prepareStoryVideo } from "./story-media";

export const portraitQuery = "(max-width: 760px) and (orientation: portrait)";
export const desktopVideo = "/videos/yamyam-scroll-desktop";
export const portraitVideo = "/videos/yamyam-scroll-portrait";

type StoryMedia = { base: string; motion: boolean; portrait: boolean } & (
  { kind: "video"; url: string } | { kind: "frames"; urls: readonly string[] }
);

export function releaseStorySource(source: StoryMedia) {
  const urls = source.kind === "frames" ? source.urls : [source.url];
  for (const url of urls) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

export function useStorySource() {
  const [source, setSource] = useState<StoryMedia | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useLayoutEffect(() => {
    const portrait = window.matchMedia(portraitQuery);
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let cancelLoad = () => {};

    function selectSource() {
      cancelLoad();
      const download = new AbortController();
      const base = portrait.matches ? portraitVideo : desktopVideo;
      const format = { base, motion: motion.matches, portrait: portrait.matches };
      const fallback = { ...format, kind: "video", url: `${base}.mp4` } as const;
      let timer: number;

      const onStall = () => {
        download.abort();
        setSource(fallback);
      };
      const reportProgress = (position: number) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(onStall, 25_000);
        setLoadingProgress(position);
      };
      cancelLoad = () => {
        window.clearTimeout(timer);
        download.abort();
      };

      reportProgress(0);
      async function prepare() {
        try {
          const nextSource: StoryMedia = format.portrait && format.motion && typeof Image.prototype.decode === "function"
            ? { ...format, kind: "frames", urls: await preparePortraitFrames(download.signal, reportProgress) }
            : { ...format, kind: "video", url: await prepareStoryVideo(fallback.url, download.signal, reportProgress) };
          if (download.signal.aborted) releaseStorySource(nextSource);
          else setSource(nextSource);
        } catch {
          if (!download.signal.aborted) setSource(fallback);
        } finally {
          window.clearTimeout(timer);
        }
      }
      void prepare();
    }

    selectSource();
    portrait.addEventListener("change", selectSource);
    motion.addEventListener("change", selectSource);
    return () => {
      cancelLoad();
      portrait.removeEventListener("change", selectSource);
      motion.removeEventListener("change", selectSource);
    };
  }, []);

  return { source, loadingProgress };
}
