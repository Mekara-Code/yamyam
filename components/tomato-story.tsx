"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { paintPaste } from "./paste-flow";
import { canImage, storyImages, StoryCaption, StoryStills, StoryVenue } from "./story-scenes";
import styles from "./tomato-story.module.css";

const tomatoes = [
  { src: `${storyImages}/tomato-1.webp`, width: 414, height: 396 },
  { src: `${storyImages}/tomato-2.webp`, width: 416, height: 421 },
  { src: `${storyImages}/tomato-3.webp`, width: 371, height: 330 },
];

// Two loose rings leave a clear silhouette around the foreground tomato.
const orbitSlots = [
  [-44, -25, 8.8], [-32, -39, 6.1], [-16, -42, 5.3], [4, -44, 7.5],
  [23, -38, 5.6], [36, -28, 10.0], [43, -13, 5.4], [46, 3, 7.2],
  [40, 20, 10.8], [28, 34, 5.9], [12, 41, 8.5], [-5, 43, 5.0],
  [-23, 39, 9.4], [-38, 31, 6.7], [-46, 16, 10.0], [-48, -1, 6.0],
  [-30, -15, 7.2], [24, -18, 7.1], [-28, 17, 5.4], [25, 14, 5.8],
];

const satellites = orbitSlots.map(([x, y, size], index) => {
  // A stable seed keeps the random variation in sync for SSR and hydration.
  const fraction = (seed: number) => {
    const value = Math.sin((index + 1) * seed) * 43758.5453;
    return value - Math.floor(value);
  };
  const offset = fraction(93.31);
  const angle = Math.round((fraction(12.99) - 0.5) * 145);
  return {
    x: x + (offset - 0.5) * 4,
    y: y + (fraction(78.23) - 0.5) * 4,
    size: size * (0.91 + offset * 0.18),
    angle,
    blur: size > 9 ? 1.6 : index % 4 === 2 ? 1.25 : 0,
    image: tomatoes[index % tomatoes.length],
  };
});

const basilLeaves = [
  [-39, -34, 5.4, -16], [-23, -27, 4.1, 62], [15, -31, 5.4, 85],
  [35, -11, 5.7, 23], [34, 30, 6.8, 68], [5, 34, 4.3, -53],
  [-26, 29, 5.6, 13], [-40, 5, 6.7, 112],
];

const storyLength = 21;
const chapters = [
  { title: "گوجهٔ تازه", start: 0, focus: 0 },
  { title: "برش و ریزش", start: 2.93, focus: 5.2 },
  { title: "قوطی یام‌یام", start: 8.84, focus: 10.15 },
  { title: "قفسه", start: 10.9, focus: 14.1 },
  { title: "آشپزخانه", start: 16.38, focus: 20.35 },
];

export function TomatoStory() {
  const story = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  useLayoutEffect(() => {
    const section = story.current;
    const scene = stage.current;
    if (!section || !scene) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const shot = <T extends HTMLElement = HTMLElement>(name: string) =>
        scene.querySelector<T>(`[data-shot="${name}"]`)!;
      const orbit = Array.from(scene.querySelectorAll<HTMLElement>("[data-satellite]"));
      const leaves = Array.from(scene.querySelectorAll<HTMLElement>("[data-basil]"));
      const dock = shot("tomato-dock");
      const rig = shot("tomato-rig");
      const whole = shot("whole");
      const halves = [shot("left-half"), shot("right-half")];
      const knife = shot("knife");
      const canDock = shot("can");
      const lid = shot("lid");
      const canMouth = shot("mouth");
      const canBody = shot("can-body");
      const canPhoto = shot("can-photo");
      const canShadow = shot("can-shadow");
      const hand = shot("hand");
      const grocery = shot("grocery");
      const kitchen = shot("kitchen");
      const grocerySeat = shot("grocery-seat");
      const kitchenSeat = shot("kitchen-seat");
      const packedCaption = shot("packed-caption");
      const groceryCaption = shot("grocery-caption");
      const kitchenCaption = shot("kitchen-caption");
      const stream = shot<HTMLCanvasElement>("stream").getContext("2d");
      const pour = { front: 0, tail: 0, time: 0 };
      const sceneY = (fraction: number) => scene.clientHeight * fraction;
      const isNarrow = () => scene.clientWidth <= 760
        && !window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches;
      const cuttingHeight = () => sceneY(isNarrow() ? 0.70 : 0.565);
      const pouringHeight = () => sceneY(isNarrow() ? 0.235 : 0.21);
      const seatX = (seat: HTMLElement) => {
        const rect = seat.getBoundingClientRect();
        return rect.left + rect.width / 2 - scene.getBoundingClientRect().left - canDock.offsetLeft;
      };
      const seatY = (seat: HTMLElement) =>
        seat.getBoundingClientRect().top - scene.getBoundingClientRect().top - canDock.offsetTop;
      const seatScale = (seat: HTMLElement) => seat.getBoundingClientRect().width / canDock.offsetWidth;
      const handReach = (fraction: number) => scene.clientWidth * fraction / seatScale(grocerySeat);
      let previousChapter = 0;

      section.dataset.animated = "true";
      setActiveChapter(0);
      gsap.set(halves, { rotation: 0, xPercent: 0, scaleX: 0.87 });
      gsap.set(knife, { y: () => -sceneY(0.68), rotation: -14, autoAlpha: 0 });
      gsap.set(canDock, { y: () => sceneY(0.23), autoAlpha: 0 });
      gsap.set(lid, { autoAlpha: 0, xPercent: 56, yPercent: -16, rotation: -22 });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: () => `top top+=${Number.parseFloat(getComputedStyle(scene.parentElement!).top)}`,
          end: "bottom bottom",
          scrub: 0.38,
          invalidateOnRefresh: true,
        },
      });
      trigger.current = timeline.scrollTrigger ?? null;

      timeline
        .to(shot("progress"), { scaleX: 1, duration: storyLength }, 0)
        .to(shot("copy"), { autoAlpha: 0, y: -34, ease: "power2.in", duration: 1.32 }, 0.22)
        .to(shot("orbits"), { autoAlpha: 0, scale: 1.13, duration: 2.15 }, 0.1)
        .to(orbit, {
          x: (index) => satellites[index].x * scene.clientWidth * 0.011,
          y: (index) => satellites[index].y * scene.clientHeight * 0.009,
          rotation: (index) => satellites[index].angle * 0.55,
          scale: 0.7,
          autoAlpha: 0,
          duration: 1.95,
          stagger: { each: 0.019, from: "random" },
          ease: "power1.in",
        }, 0.1)
        .to(leaves, {
          x: (index) => basilLeaves[index][0] * scene.clientWidth * 0.014,
          y: (index) => basilLeaves[index][1] * scene.clientHeight * 0.012,
          rotation: (index) => index % 2 ? 100 : -115,
          scale: 0.5,
          autoAlpha: 0,
          duration: 1.84,
          stagger: 0.06,
          ease: "power1.in",
        }, 0.16)
        .to(dock, {
          x: () => scene.clientWidth * 0.5 - dock.offsetLeft,
          y: () => cuttingHeight() - dock.offsetTop,
          duration: 2.65,
          ease: "power2.inOut",
        }, 0.28)
        .to(whole, { rotation: 180, duration: 2.65, ease: "power2.inOut" }, 0.28)
        .to(rig, { scale: 0.86, duration: 2.65, ease: "power2.inOut" }, 0.28)
        .fromTo(knife, { y: () => -sceneY(0.68), autoAlpha: 0 }, {
          y: () => -sceneY(0.18), rotation: -5, autoAlpha: 1, duration: 0.81, ease: "power2.out",
        }, 2.15)
        .to(knife, { y: () => sceneY(0.37), rotation: 6, duration: 1.23, ease: "power1.in" }, 2.96)
        .to(knife, { autoAlpha: 0, duration: 0.24 }, 3.96)
        .set(halves, { autoAlpha: 1 }, 3.47)
        .to(whole, { autoAlpha: 0, duration: 0.1 }, 3.47)
        .to(halves, {
          xPercent: (index) => index === 0 ? -19 : 19,
          rotation: (index) => index === 0 ? -16 : 16,
          scaleX: 1,
          duration: 0.91,
          ease: "back.out(1.2)",
        }, 3.45)
        .to(dock, { y: () => pouringHeight() - dock.offsetTop, duration: 1.18, ease: "power2.inOut" }, 4.59)
        .to(rig, { scale: () => isNarrow() ? 0.64 : 0.56, duration: 1.18, ease: "power2.inOut" }, 4.59)
        .to(halves, {
          rotation: (index) => index === 0 ? -42 : 42,
          xPercent: (index) => index === 0 ? -14 : 14,
          duration: 1.1,
          ease: "power2.inOut",
        }, 4.63)
        .fromTo(canDock, { y: () => sceneY(0.23), autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.97, ease: "power2.out",
        }, 4.91)
        .to(pour, { front: 1, duration: 0.53, ease: "power1.in" }, 5.68)
        .to(pour, { time: 3, duration: 2.48 }, 5.68)
        .to(canMouth, { "--fill": 1, duration: 1.32 }, 6.21)
        .to(pour, { tail: 1, duration: 0.63, ease: "power1.in" }, 7.5)
        .to(halves, {
          x: (index) => scene.clientWidth * (index === 0 ? -0.62 : 0.62),
          y: () => -sceneY(0.23),
          rotation: (index) => index === 0 ? -120 : 120,
          autoAlpha: 0,
          duration: 1.04,
          ease: "power2.in",
        }, 7.55)
        .to(lid, { autoAlpha: 1, duration: 0.3 }, 8.1)
        .to(lid, { xPercent: 0, yPercent: 0, rotation: 0, duration: 0.66, ease: "power2.inOut" }, 8.18)
        .set(canPhoto, { autoAlpha: 1 }, 8.84)
        .set([lid, canMouth, canBody], { autoAlpha: 0 }, 8.84)
        .to(canDock, {
          y: () => -sceneY(0.27),
          scale: () => isNarrow() ? 1.58 : 1.63,
          duration: 1.12,
          ease: "power2.out",
        }, 8.86)
        .fromTo(packedCaption, { y: 16, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out",
        }, 9.31)
        .to(packedCaption, { y: -18, autoAlpha: 0, duration: 0.45 }, 10.62)
        .to(grocery, { autoAlpha: 1, duration: 0.86, ease: "power2.inOut" }, 10.66)
        .to(canShadow, { autoAlpha: 0, duration: 0.35 }, 10.69)
        .to(canDock, {
          x: () => -scene.clientWidth * 0.115,
          y: () => -sceneY(0.39),
          scale: () => seatScale(grocerySeat) * 1.45,
          rotation: -9,
          duration: 1.08,
          ease: "power2.inOut",
        }, 10.67)
        .to(canPhoto, { filter: "brightness(0.88) saturate(0.89)", duration: 0.7 }, 11.18)
        .to(canDock, {
          x: () => seatX(grocerySeat),
          y: () => seatY(grocerySeat),
          scale: () => seatScale(grocerySeat),
          rotation: 0,
          duration: 1.45,
          ease: "power2.inOut",
        }, 11.68)
        .to(canShadow, { autoAlpha: 1, duration: 0.36 }, 12.77)
        .fromTo(groceryCaption, { y: 16, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.61, ease: "power2.out",
        }, 13.15)
        .fromTo(hand, { x: () => handReach(0.52), autoAlpha: 0, rotation: 4 }, {
          x: 0, autoAlpha: 1, rotation: 0, duration: 0.97, ease: "power2.out",
        }, 14.66)
        .to(groceryCaption, { y: -13, autoAlpha: 0, duration: 0.46 }, 15.39)
        .to(canShadow, { autoAlpha: 0, duration: 0.28 }, 15.67)
        .to(canDock, {
          x: () => seatX(grocerySeat) + scene.clientWidth * 0.16,
          y: () => seatY(grocerySeat) - sceneY(0.25),
          rotation: 10,
          duration: 0.74,
          ease: "power2.in",
        }, 15.72)
        .to(canDock, {
          x: () => scene.clientWidth * 0.61,
          y: () => seatY(kitchenSeat) - sceneY(0.25),
          scale: () => seatScale(kitchenSeat),
          duration: 0.65,
          ease: "power1.inOut",
        }, 16.46)
        .to(kitchen, { autoAlpha: 1, duration: 0.86, ease: "power2.inOut" }, 16.2)
        .set(grocery, { autoAlpha: 0 }, 17.07)
        .to(canPhoto, { filter: "brightness(0.96) saturate(0.92)", duration: 0.5 }, 16.59)
        .to(canDock, {
          x: () => seatX(kitchenSeat),
          y: () => seatY(kitchenSeat),
          scale: () => seatScale(kitchenSeat),
          rotation: 0,
          duration: 1.34,
          ease: "power2.inOut",
        }, 17.34)
        .to(canShadow, { autoAlpha: 1, duration: 0.43 }, 18.38)
        .to(hand, {
          x: () => scene.clientWidth * 0.53 / seatScale(kitchenSeat),
          yPercent: -10,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power2.in",
        }, 18.72)
        .fromTo(kitchenCaption, { y: 16, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.68, ease: "power2.out",
        }, 19.05);

      timeline.eventCallback("onUpdate", () => {
        if (stream) paintPaste(stream, pour.front, pour.tail, pour.time);
        const time = timeline.time();
        const chapter = chapters.findLastIndex(({ start }) => time >= start);
        if (chapter !== previousChapter) {
          previousChapter = chapter;
          setActiveChapter(chapter);
        }
      });

      return () => {
        delete section.dataset.animated;
        trigger.current = null;
        if (stream) paintPaste(stream, 0, 0, 0);
      };
    }, scene);

    return () => media.revert();
  }, []);

  function goTo(time: number) {
    const scroll = trigger.current;
    if (!scroll) return;
    const top = scroll.start + (scroll.end - scroll.start) * (time / storyLength);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  return (
    <section ref={story} id="home" className={styles.story} aria-labelledby="tomato-title">
      <span id="story" className={styles.storyAnchor} />
      <div className={styles.sticky}>
        <div ref={stage} className={styles.stage}>
          <div className={styles.copy} data-shot="copy">
            <p className={styles.kicker}>رب گوجه‌فرنگی یام‌یام</p>
            <h1 id="tomato-title">همه‌چیز از<br /><em>یک گوجه</em><br />شروع می‌شود.</h1>
            <p className={styles.intro}>مسیر گوجهٔ تازه تا سفره را با اسکرول دنبال کنید.</p>
            <button type="button" onClick={() => goTo(2.65)} className={styles.startButton}>
              شروع داستان <ArrowDown size={19} aria-hidden="true" />
            </button>
            <a className={styles.staticLink} href="#story-scenes">
              ادامهٔ داستان <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>

          <p className={styles.srOnly}>
            گوجهٔ مرکزی ۱۸۰ درجه می‌چرخد. کارد آن را می‌شکافد و رب داخل آن به قوطی یام‌یام می‌ریزد.
            قوطی کنار شش قوطی دیگر روی قفسه می‌نشیند. دستی آن را برمی‌دارد و کنار پاستا می‌گذارد.
          </p>

          <div className={styles.art} aria-hidden="true">
            <StoryVenue venue="grocery" />
            <StoryVenue venue="kitchen" />
            <div className={styles.orbitDock}>
              <div className={styles.orbits} data-shot="orbits">
                <i /><i /><i />
              </div>
              {satellites.map(({ x, y, size, angle, blur, image }, index) => (
                <div
                  key={index}
                  className={styles.satellite}
                  data-satellite
                  style={{
                    left: `${50 + x}%`,
                    top: `${50 + y}%`,
                    width: `${size}%`,
                    "--angle": `${angle}deg`,
                    "--depth-blur": `${blur}px`,
                  } as CSSProperties}
                >
                  <Image {...image} alt="" sizes="(max-width: 760px) 11vw, 8vw" loading="eager" />
                </div>
              ))}
              {basilLeaves.map(([x, y, size, angle], index) => (
                <div key={index} className={styles.basil} data-basil style={{
                  left: `${50 + x}%`,
                  top: `${50 + y}%`,
                  width: `${size}%`,
                  "--angle": `${angle}deg`,
                } as CSSProperties}>
                  <Image src={`${storyImages}/basil.webp`} alt="" width={285} height={292} loading="eager" />
                </div>
              ))}
            </div>

            <div className={styles.tomatoDock} data-shot="tomato-dock">
              <div className={styles.tomatoRig} data-shot="tomato-rig">
                <div className={styles.whole} data-shot="whole">
                  <Image src={`${storyImages}/tomato-hero.webp`} alt="" width={1150} height={999}
                    sizes="(max-width: 760px) 54vw, 33vw" preload />
                </div>
                <div className={`${styles.cutHalf} ${styles.leftHalf}`} data-shot="left-half">
                  <Image src={`${storyImages}/tomato-cut.webp`} alt="" width={559} height={1046} loading="eager" fetchPriority="low" />
                </div>
                <div className={`${styles.cutHalf} ${styles.rightHalf}`} data-shot="right-half">
                  <Image src={`${storyImages}/tomato-cut.webp`} alt="" width={559} height={1046} loading="eager" fetchPriority="low" />
                </div>
              </div>
            </div>

            <div className={styles.knife} data-shot="knife">
              <Image src={`${storyImages}/chef-knife.webp`} alt="" width={102} height={745} loading="eager" />
            </div>

            <canvas className={styles.stream} data-shot="stream" width={160} height={250} />

            <div className={styles.can} data-shot="can">
              <div className={styles.shadow} data-shot="can-shadow" />
              <Image {...canImage} alt="" className={styles.canBody} data-shot="can-body" loading="eager" />
              <div className={styles.mouth} data-shot="mouth" />
              <Image {...canImage} alt="" className={styles.lid} data-shot="lid" loading="eager" />
              <Image {...canImage} alt="" className={styles.canPhoto} data-shot="can-photo" loading="eager" />
              <div className={styles.grip} data-shot="hand">
                <Image src={`${storyImages}/hand.webp`} alt="" width={950} height={497} loading="eager" fetchPriority="low" />
              </div>
            </div>
          </div>

          <StoryCaption moment="packed" />
          <StoryCaption moment="grocery" />
          <StoryCaption moment="kitchen" />

          <div className={styles.controls}>
            <div className={styles.progress} aria-hidden="true"><span data-shot="progress" /></div>
            <nav className={styles.chapters} aria-label="مرحله‌های داستان تولید رب">
              {chapters.map(({ title, focus }, index) => (
                <button key={title} type="button" aria-current={activeChapter === index ? "step" : undefined}
                  onClick={() => goTo(focus)}>
                  {title}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className={styles.fallback}><StoryStills /></div>
    </section>
  );
}
