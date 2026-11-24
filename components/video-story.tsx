"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDown, ArrowDownLeft } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { createPortraitFrames } from "./portrait-frames";
import { StoryLoading } from "./story-loading";
import { desktopVideo, portraitQuery, portraitVideo, releaseStorySource, useStorySource } from "./use-story-source";
import styles from "./video-story.module.css";

const playbackTimeout = 12_000;
const videoEnd = 0.95;
const spiralCue = [0.367, 0.415, 0.487, 0.54];
const spiralStop = videoEnd * ((spiralCue[1] + spiralCue[2]) / 2);
const storyMediaLabel = "پاشش رب و گوجه‌ها دور قوطی یام‌یام می‌چرخد و رب داخل قوطی می‌ریزد.";

export function VideoStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrollTween = useRef<gsap.core.Tween | null>(null);
  const initialAnchorHandled = useRef(false);
  const retainedScrollProgress = useRef<number | null>(null);
  const { source, loadingProgress } = useStorySource();
  const [firstMediaReady, setFirstMediaReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [scrubEnabled, setScrubEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const finishLoader = useCallback(() => setShowLoader(false), []);

  const progress = useMotionValue(0);
  const renderedProgress = useMotionValue(0);
  const copyOffset = useTransform(progress, [0.008, 0.19], ["0svh", "-78svh"], {
    ease: (value) => value * value,
  });
  const copyOpacity = useTransform(progress, [0.135, 0.19], [1, 0]);
  const copyVisibility = useTransform(() => progress.get() < 0.19 ? "visible" : "hidden");

  const spiralOpacity = useTransform(renderedProgress, spiralCue, [0, 1, 1, 0]);
  const spiralOffset = useTransform(renderedProgress, spiralCue, [28, 0, 0, -32]);
  const spiralVisibility = useTransform(() => {
    const position = renderedProgress.get();
    return position > spiralCue[0] && position < spiralCue[3] ? "visible" : "hidden";
  });

  const productOpacity = useTransform(renderedProgress, [0.631, 0.722], [0, 1]);
  const productOffset = useTransform(renderedProgress, [0.631, 0.738], [26, 0]);
  const productVisibility = useTransform(() => renderedProgress.get() > 0.631 ? "visible" : "hidden");
  const detailsOpacity = useTransform(renderedProgress, [0.838, 0.928], [0, 1]);
  const detailsOffset = useTransform(renderedProgress, [0.838, 0.945], [14, 0]);
  const detailsVisibility = useTransform(() => renderedProgress.get() > 0.838 ? "visible" : "hidden");

  useLayoutEffect(() => {
    const story = sectionRef.current;
    const player = videoRef.current;
    if (!story || !player || !source) return;
    const section = story;
    const video = player;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const playhead = { progress: 0 };
    const canvas = canvasRef.current;
    const directVideo = source.base + ".mp4";
    let frames: ReturnType<typeof createPortraitFrames> = null;
    let frameRequest: number | null = null;
    let readyTimer: number | undefined;
    let activeVideo: string | undefined;
    let scrub: gsap.core.Tween | undefined;
    let fps = 30;
    let lastFrame = 0;

    setVideoReady(false);
    setFailed(false);
    video.poster = source.base + "-poster.webp";
    video.pause();

    function showMedia() {
      if (readyTimer === undefined) return;
      window.clearTimeout(readyTimer);
      readyTimer = undefined;
      setFirstMediaReady(true);
    }

    function stopScrubbing() {
      scrollTween.current?.kill();
      scrub?.scrollTrigger?.kill();
      scrub?.kill();
      triggerRef.current = null;
      delete section.dataset.scrub;
      progress.set(0);
      renderedProgress.set(0);
      setScrubEnabled(false);
    }

    function handleVideoFailure() {
      if (activeVideo !== directVideo) {
        installVideo(directVideo);
        return;
      }
      activeVideo = undefined;
      setVideoReady(false);
      setFailed(true);
      stopScrubbing();
      showMedia();
    }

    function installVideo(url: string) {
      frames?.dispose();
      frames = null;
      delete section.dataset.renderer;
      window.clearTimeout(readyTimer);
      activeVideo = url;
      lastFrame = 0;
      video.preload = "auto";
      video.src = url;
      video.load();
      readyTimer = window.setTimeout(handleVideoFailure, playbackTimeout);
    }

    function seekFrame() {
      frameRequest = null;
      if (!activeVideo || !lastFrame || video.seeking || video.error || video.readyState < 1) return;
      const videoProgress = Math.min(1, playhead.progress / videoEnd);
      const frame = Math.round(videoProgress * lastFrame);
      // Seek just inside each sample so the last source frame stays selectable.
      const time = (frame + 0.1) / fps;
      if (Math.abs(time - video.currentTime) > 0.2 / fps) video.currentTime = time;
    }

    function queueSeek() {
      if (activeVideo && triggerRef.current && frameRequest === null) frameRequest = requestAnimationFrame(seekFrame);
    }

    function updateSourceTiming() {
      if (!activeVideo) return;
      fps = video.videoHeight > video.videoWidth ? 24 : 30;
      lastFrame = Number.isFinite(video.duration) ? Math.max(0, Math.round(video.duration * fps) - 1) : 0;
      queueSeek();
    }

    function refreshReadiness() {
      if (!activeVideo || video.readyState < video.HAVE_CURRENT_DATA || video.error) return;
      setVideoReady(true);
      showMedia();
    }

    function onSeeked() {
      if (activeVideo && lastFrame) renderedProgress.set(Math.min(1, video.currentTime * fps / lastFrame));
      queueSeek();
    }

    function checkError() {
      if (activeVideo && video.error && video.error.code !== video.error.MEDIA_ERR_ABORTED) handleVideoFailure();
    }

    video.addEventListener("loadedmetadata", updateSourceTiming);
    video.addEventListener("loadeddata", refreshReadiness);
    video.addEventListener("canplay", refreshReadiness);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", checkError);

    if (source.motion) {
      section.dataset.scrub = "true";
      setScrubEnabled(true);
      const directScrub = source.portrait || window.matchMedia("(pointer: coarse)").matches;
      scrub = gsap.to(playhead, {
        progress: 1,
        ease: "none",
        onUpdate: () => {
          progress.set(playhead.progress);
          if (frames) frames.render(playhead.progress / videoEnd);
          else queueSeek();
        },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: directScrub ? true : 0.22,
        },
      });

      triggerRef.current = scrub.scrollTrigger ?? null;
      const trigger = triggerRef.current;
      if (!initialAnchorHandled.current && window.location.hash === "#about") {
        document.getElementById("about")?.scrollIntoView({ behavior: "instant" });
      } else if (trigger && retainedScrollProgress.current !== null) {
        const top = trigger.start + (trigger.end - trigger.start) * retainedScrollProgress.current;
        window.scrollTo({ top, behavior: "instant" });
      }
      initialAnchorHandled.current = true;
      ScrollTrigger.update();
    }

    if (source.kind === "frames" && canvas) {
      frames = createPortraitFrames(canvas, (position) => {
        renderedProgress.set(position);
        showMedia();
      }, () => installVideo(directVideo), source.urls);
    }

    if (frames) {
      section.dataset.renderer = "frames";
      readyTimer = window.setTimeout(() => installVideo(directVideo), playbackTimeout);
      frames.render(playhead.progress / videoEnd);
    } else {
      installVideo(source.kind === "video" ? source.url : directVideo);
    }

    return () => {
      retainedScrollProgress.current = triggerRef.current?.progress ?? null;
      stopScrubbing();
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      window.clearTimeout(readyTimer);
      video.removeEventListener("loadedmetadata", updateSourceTiming);
      video.removeEventListener("loadeddata", refreshReadiness);
      video.removeEventListener("canplay", refreshReadiness);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", checkError);
      frames?.dispose();
      delete section.dataset.renderer;
      video.preload = "none";
      video.removeAttribute("src");
      video.load();
      releaseStorySource(source);
    };
  }, [source, progress, renderedProgress]);

  function advanceStory(target: number) {
    const trigger = triggerRef.current;
    if (!trigger) return;

    scrollTween.current?.kill();
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    function restoreScrollBehavior() {
      root.style.scrollBehavior = previousBehavior;
      scrollTween.current = null;
    }

    const destination = trigger.start + (trigger.end - trigger.start) * target;
    scrollTween.current = gsap.to(window, {
      scrollTo: { y: destination, autoKill: true },
      duration: gsap.utils.clamp(0.8, 1.35, Math.abs(window.scrollY - destination) / 830),
      ease: "power2.inOut",
      onComplete: restoreScrollBehavior,
      onInterrupt: restoreScrollBehavior,
    });
  }

  return (
    <section className={styles.story} id="home" ref={sectionRef} aria-labelledby="video-story-title">
      <span id="story" className={styles.storyAnchor} />
      <span id="about" className={styles.aboutAnchor} />

      <div className={styles.stage}>
        <div className={styles.scene}>
          <div className={styles.media} data-ready={videoReady && !failed ? "" : undefined}>
            <picture>
              <source media={portraitQuery} srcSet={`${portraitVideo}-poster.webp`} width={720} height={1280} />
              <Image src={`${desktopVideo}-poster.webp`} alt="" width={1600} height={900}
                loading="eager" fetchPriority="high" />
            </picture>
            <video
              ref={videoRef}
              width={1600}
              height={900}
              preload="none"
              muted
              playsInline
              controls={!scrubEnabled && !failed}
              data-failed={failed ? "" : undefined}
              aria-label={storyMediaLabel}
            >
              <source src={`${portraitVideo}.mp4`} type="video/mp4" media={portraitQuery} />
              <source src={`${desktopVideo}.mp4`} type="video/mp4" />
            </video>
            <canvas ref={canvasRef} role="img" aria-label={storyMediaLabel} />
          </div>

          <motion.div className={styles.copy} style={{ opacity: copyOpacity, y: copyOffset, visibility: copyVisibility }}>
            <h1 id="video-story-title">غذا با یام‌یام<br /><em>جان می‌گیرد.</em></h1>
            {scrubEnabled ? (
              <button className={styles.action} type="button" onClick={() => advanceStory(spiralStop)}>
                شروع داستان <ArrowDown size={17} aria-hidden="true" />
              </button>
            ) : (
              <a className={styles.action} href="#about">
                دربارهٔ محصول <ArrowDownLeft size={17} aria-hidden="true" />
              </a>
            )}
          </motion.div>

          <motion.div className={styles.spiralCaption}
            style={{ opacity: spiralOpacity, y: spiralOffset, visibility: spiralVisibility }}>
            <p>غلظتش را <em>ببینید.</em></p>
            <button className={styles.action} type="button" onClick={() => advanceStory(1)}>
              ادامهٔ داستان <ArrowDown size={17} aria-hidden="true" />
            </button>
          </motion.div>
        </div>

        <motion.section
          className={styles.product}
          aria-labelledby="product-title"
          style={scrubEnabled ? { opacity: productOpacity, y: productOffset, visibility: productVisibility } : undefined}
        >
          <h2 id="product-title">
            <span>رب گوجه‌فرنگی یام‌یام</span>
            این همه طعم، <em>در یک قوطی.</em>
          </h2>
          <motion.div style={scrubEnabled
            ? { opacity: detailsOpacity, y: detailsOffset, visibility: detailsVisibility }
            : undefined}>
            <p>برای پاستا، خورش و سس‌های خانگی</p>
            <dl className={styles.specification}>
              <dt>وزن خالص</dt>
              <dd>۸۰۰ گرم</dd>
            </dl>
          </motion.div>
        </motion.section>

        <div className={styles.track} aria-hidden="true">
          <motion.span style={{ scaleX: progress }} />
        </div>
      </div>
      {showLoader && <StoryLoading progress={loadingProgress} ready={firstMediaReady} onComplete={finishLoader} />}
    </section>
  );
}
