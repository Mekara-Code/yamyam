"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown, ArrowDownLeft } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { createPortraitFrames } from "./portrait-frames";
import { StoryLoading } from "./story-loading";
import { desktopVideo, portraitQuery, portraitVideo, releaseStorySource, useStorySource } from "./use-story-source";
import styles from "./video-story.module.css";

const videoEnd = 0.95;
const playbackTimeout = 12_000;
const storyMediaLabel = "پاشش رب و گوجه‌ها دور قوطی یام‌یام می‌چرخد و رب داخل قوطی می‌ریزد.";

// Positions refer to the frame actually on screen, including the portrait atlas.
const spiralStart = 0.365;
const spiralHold = 0.451;
const spiralEnd = 0.514;
const productStart = 0.813;
const finalHold = 0.942;

type Cue = [start: number, settle: number] | [start: number, settle: number, leave: number, end: number];

function useReveal(frame: MotionValue<number>, cue: Cue, rise = 30) {
  const opacity = useTransform(frame, cue, cue.length === 2 ? [0, 1] : [0, 1, 1, 0]);
  const y = useTransform(frame, cue, cue.length === 2
    ? [`${rise}%`, "0%"]
    : [`${rise}%`, "0%", "0%", `-${rise}%`]);
  const visibility = useTransform(() => {
    const position = frame.get();
    return position > cue[0] && (cue[3] === undefined || position < cue[3]) ? "visible" : "hidden";
  });
  return { opacity, y, visibility };
}

export function VideoStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrollTween = useRef<gsap.core.Tween | null>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const spiralButtonRef = useRef<HTMLButtonElement>(null);
  const productTitleRef = useRef<HTMLHeadingElement>(null);
  const keyboardDestination = useRef<{ element: HTMLElement; frame: number } | null>(null);
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
  const openingOpacity = useTransform(renderedProgress, [0.108, 0.148], [1, 0]);
  const openingVisibility = useTransform(() => renderedProgress.get() < 0.148 ? "visible" : "hidden");
  const openingLineY = useTransform(renderedProgress, [0.071, 0.125], ["0%", "-76%"]);
  const openingLineOpacity = useTransform(renderedProgress, [0.079, 0.125], [1, 0]);
  const openingAccentY = useTransform(renderedProgress, [0, 0.054, 0.091, 0.148], ["13%", "0%", "0%", "-67%"]);
  const openingAccentOpacity = useTransform(renderedProgress, [0.098, 0.148], [1, 0]);
  const underlineScale = useTransform(renderedProgress, [0, 0.055], [0.16, 1]);
  const startButtonOpacity = useTransform(renderedProgress, [0.065, 0.107], [1, 0]);
  const startButtonVisibility = useTransform(() => renderedProgress.get() < 0.107 ? "visible" : "hidden");

  const spiralLayer = useReveal(renderedProgress, [spiralStart, 0.39, 0.484, spiralEnd], 0);
  const spiralLine = useReveal(renderedProgress, [spiralStart, 0.398, 0.486, 0.51]);
  const spiralAccent = useReveal(renderedProgress, [0.39, 0.418, 0.49, spiralEnd], 42);
  const continueButton = useReveal(renderedProgress, [0.425, 0.444, 0.477, 0.501], 20);

  const productLabel = useReveal(renderedProgress, [productStart, 0.848], 35);
  const productTitle = useReveal(renderedProgress, [0.849, 0.889]);
  const productDetails = useReveal(renderedProgress, [0.894, finalHold], 15);

  useMotionValueEvent(renderedProgress, "change", (frame) => {
    const start = startButtonRef.current;
    const next = spiralButtonRef.current;
    if (start) start.inert = frame >= 0.082;
    if (next) next.inert = frame < 0.437 || frame >= 0.486;

    const destination = keyboardDestination.current;
    if (destination && frame >= destination.frame) {
      keyboardDestination.current = null;
      requestAnimationFrame(() => destination.element.focus({ preventScroll: true }));
    }
  });

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
      keyboardDestination.current = null;
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

  function advanceStory(target: number, focus: HTMLElement | null = null) {
    const trigger = triggerRef.current;
    if (!trigger) return;

    scrollTween.current?.kill();
    keyboardDestination.current = focus
      ? { element: focus, frame: target === 1 ? finalHold : 0.445 }
      : null;
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
      onInterrupt: () => {
        keyboardDestination.current = null;
        restoreScrollBehavior();
      },
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

          <motion.div className={`${styles.caption} ${styles.copy}`}
            style={scrubEnabled ? { opacity: openingOpacity, visibility: openingVisibility } : undefined}>
            <h1 className={styles.openingTitle} id="video-story-title">
              <span className={styles.mask}>
                <motion.span style={scrubEnabled ? { y: openingLineY, opacity: openingLineOpacity } : undefined}>
                  غذا با یام‌یام
                </motion.span>
              </span>
              <span className={styles.mask}>
                <motion.em style={scrubEnabled ? { y: openingAccentY, opacity: openingAccentOpacity } : undefined}>
                  جان می‌گیرد.
                </motion.em>
              </span>
            </h1>
            <motion.div className={styles.underline} aria-hidden="true"
              style={scrubEnabled ? { scaleX: underlineScale, opacity: openingAccentOpacity } : undefined} />
            {scrubEnabled ? (
              <motion.button ref={startButtonRef} className={styles.action} type="button"
                style={{ opacity: startButtonOpacity, visibility: startButtonVisibility }}
                onClick={(event) => advanceStory(videoEnd * spiralHold, event.detail === 0 ? spiralButtonRef.current : null)}>
                شروع داستان <ArrowDown size={17} aria-hidden="true" />
              </motion.button>
            ) : (
              <a className={styles.action} href="#about">
                دربارهٔ محصول <ArrowDownLeft size={17} aria-hidden="true" />
              </a>
            )}
          </motion.div>
        </div>

        <motion.div className={`${styles.caption} ${styles.spiralCaption}`}
          style={scrubEnabled ? { opacity: spiralLayer.opacity, visibility: spiralLayer.visibility } : undefined}>
          <h2 className={styles.spiralTitle}>
            <span className={styles.mask}>
              <motion.span style={scrubEnabled ? spiralLine : undefined}>غلظتش را</motion.span>
            </span>
            <span className={styles.mask}>
              <motion.em style={scrubEnabled ? spiralAccent : undefined}>ببینید.</motion.em>
            </span>
          </h2>
          {scrubEnabled && (
            <motion.button ref={spiralButtonRef} className={styles.action} type="button" style={continueButton} inert
              onClick={(event) => advanceStory(1, event.detail === 0 ? productTitleRef.current : null)}>
              ادامهٔ داستان <ArrowDown size={17} aria-hidden="true" />
            </motion.button>
          )}
        </motion.div>

        <motion.section
          className={`${styles.caption} ${styles.product}`}
          aria-labelledby="product-title"
          style={scrubEnabled ? { opacity: productLabel.opacity, visibility: productLabel.visibility } : undefined}
        >
          <motion.p className={styles.productLabel} style={scrubEnabled ? { y: productLabel.y } : undefined}>
            رب گوجه‌فرنگی یام‌یام
          </motion.p>
          <div className={styles.mask}>
            <motion.h2 className={styles.productTitle} id="product-title" ref={productTitleRef} tabIndex={-1}
              style={scrubEnabled ? productTitle : undefined}>
              <span>این همه طعم،</span> <em>در یک قوطی.</em>
            </motion.h2>
          </div>
          <motion.div className={styles.productDetails} style={scrubEnabled ? productDetails : undefined}>
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
