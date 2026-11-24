import Image from "next/image";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import styles from "./story-loading.module.css";

export function StoryLoading({
  progress,
  ready,
  onComplete,
}: {
  progress: number;
  ready: boolean;
  onComplete: () => void;
}) {
  const logoRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    let flight: Animation | undefined;
    const frame = requestAnimationFrame(() => {
      const logo = logoRef.current;
      const headerLogo = document.querySelector(".site-header .brand-logo");
      if (!logo || !headerLogo || typeof logo.animate !== "function") {
        onComplete();
        return;
      }

      const from = logo.getBoundingClientRect();
      const to = headerLogo.getBoundingClientRect();
      const x = to.left + to.width / 2 - from.left - from.width / 2;
      const y = to.top + to.height / 2 - from.top - from.height / 2;
      const scale = to.width / from.width;

      flight = logo.animate(
        [{ transform: "none" }, { transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})` }],
        { duration: 760, easing: "cubic-bezier(.22, .78, .25, 1)", fill: "forwards" },
      );
      void flight.finished.then(onComplete, () => {});
    });

    return () => {
      cancelAnimationFrame(frame);
      flight?.cancel();
    };
  }, [ready, onComplete]);

  const percent = Math.round(progress * 100);

  return (
    <div className={styles.loader} data-story-loading={ready ? "leaving" : "pending"}>
      <div className={styles.curtain} />
      <div className={styles.center}>
        <div className={styles.orbits} aria-hidden="true" style={{ "--progress": `${percent}%` } as CSSProperties}>
          <div className={styles.progress} />
          <div className={styles.sweep} />
        </div>
        <div className={styles.logo} ref={logoRef}>
          <Image src="/images/yamyam-logo.png" width={228} height={228} alt="" loading="eager" fetchPriority="high" />
        </div>
        <div className={styles.status} role="progressbar" aria-label="آماده‌سازی ویدیو" aria-valuenow={percent || undefined}>
          <span>در حال آماده‌سازی ویدیو</span>
          {percent > 0 && <span className={styles.percent}>{progress.toLocaleString("fa-IR", { style: "percent" })}</span>}
        </div>
      </div>
    </div>
  );
}
