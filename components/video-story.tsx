"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDown, ArrowDownLeft } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { createPortraitFrames } from "./portrait-frames";
import styles from "./video-story.module.css";

const portraitQuery = "(max-width: 760px) and (orientation: portrait)";
const desktopVideo = "/videos/yamyam-scroll-desktop";
const portraitVideo = "/videos/yamyam-scroll-portrait";
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
  const [scrubEnabled, setScrubEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);

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
    const player = videoRef.current;
    if (!player) return;
    const portrait = window.matchMedia(portraitQuery);

    const updatePoster = () => {
      player.poster = `${portrait.matches ? portraitVideo : desktopVideo}-poster.webp`;
    };

    const refreshReadiness = () => {
      const ready = player.readyState >= player.HAVE_CURRENT_DATA && !player.error;
      setVideoReady(ready);
      if (ready) setFailed(false);
    };

    const checkError = () => {
      if (sectionRef.current?.dataset.renderer !== "frames" &&
        player.error && player.error.code !== player.error.MEDIA_ERR_ABORTED) setFailed(true);
    };

    const readinessEvents = ["loadeddata", "canplay", "emptied"];

    const selectSource = () => {
      const trigger = triggerRef.current;
      const activeProgress = trigger?.isActive ? trigger.progress : null;
      scrollTween.current?.kill();
      updatePoster();
      setVideoReady(false);
      setFailed(false);
      renderedProgress.set(0);
      player.load();

      if (trigger && activeProgress !== null) {
        ScrollTrigger.refresh();
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * activeProgress, behavior: "instant" });
        ScrollTrigger.update();
      }
    };

    updatePoster();
    refreshReadiness();
    readinessEvents.forEach((event) => player.addEventListener(event, refreshReadiness));
    player.addEventListener("error", checkError);
    portrait.addEventListener("change", selectSource);
    return () => {
      readinessEvents.forEach((event) => player.removeEventListener(event, refreshReadiness));
      player.removeEventListener("error", checkError);
      portrait.removeEventListener("change", selectSource);
    };
  }, [renderedProgress]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const player = videoRef.current;
    if (!section || !player || failed) return;
    const video = player;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const media = gsap.matchMedia();

    media.add({
      motion: "(prefers-reduced-motion: no-preference)",
      portrait: portraitQuery,
      touch: "(pointer: coarse)",
    }, ({ conditions }) => {
      if (!conditions?.motion) return;

      const playhead = { progress: 0 };
      let frameRequest: number | null = null;
      let fps = 30;
      let lastFrame = 0;
      const canvas = canvasRef.current;
      let frames = conditions.portrait && canvas
        ? createPortraitFrames(canvas, (position) => renderedProgress.set(position), useVideoFallback)
        : null;

      section.dataset.scrub = "true";
      setScrubEnabled(true);
      video.pause();
      video.preload = frames ? "none" : "auto";
      if (frames) section.dataset.renderer = "frames";

      function useVideoFallback() {
        frames?.dispose();
        frames = null;
        delete section?.dataset.renderer;
        video.preload = "auto";
        if (video.error) video.load();
        updateSourceTiming();
      }

      function seekFrame() {
        frameRequest = null;
        if (!lastFrame || video.seeking || video.error || video.readyState < 1) return;

        const videoProgress = Math.min(1, playhead.progress / videoEnd);
        const frame = Math.round(videoProgress * lastFrame);
        // Seek just inside each sample so the last source frame stays selectable.
        const time = (frame + 0.1) / fps;
        if (Math.abs(time - video.currentTime) > 0.2 / fps) video.currentTime = time;
      }

      function queueSeek() {
        if (frameRequest === null) frameRequest = requestAnimationFrame(seekFrame);
      }

      function updateSourceTiming() {
        if (frames) return;
        fps = video.videoHeight > video.videoWidth ? 24 : 30;
        lastFrame = Number.isFinite(video.duration) ? Math.max(0, Math.round(video.duration * fps) - 1) : 0;
        queueSeek();
      }

      function onSeeked() {
        if (frames) return;
        if (lastFrame) renderedProgress.set(Math.min(1, video.currentTime * fps / lastFrame));
        // A busy decoder uses the latest scroll position once the previous seek finishes.
        queueSeek();
      }

      video.addEventListener("loadedmetadata", updateSourceTiming);
      video.addEventListener("seeked", onSeeked);

      const scrub = gsap.to(playhead, {
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
          scrub: conditions.portrait || conditions.touch ? true : 0.22,
        },
      });

      triggerRef.current = scrub.scrollTrigger ?? null;
      frames?.render(playhead.progress / videoEnd);
      updateSourceTiming();
      onSeeked();

      if (!initialAnchorHandled.current && window.location.hash === "#about") {
        document.getElementById("about")?.scrollIntoView({ behavior: "instant" });
        ScrollTrigger.update();
      }
      initialAnchorHandled.current = true;

      return () => {
        scrollTween.current?.kill();
        video.removeEventListener("loadedmetadata", updateSourceTiming);
        video.removeEventListener("seeked", onSeeked);
        if (frameRequest !== null) cancelAnimationFrame(frameRequest);
        frames?.dispose();
        video.preload = "metadata";
        delete section.dataset.renderer;
        delete section.dataset.scrub;
        triggerRef.current = null;
        progress.set(0);
        renderedProgress.set(0);
        setScrubEnabled(false);
      };
    }, section);

    return () => media.revert();
  }, [failed, progress, renderedProgress]);

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
              preload="metadata"
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
    </section>
  );
}
