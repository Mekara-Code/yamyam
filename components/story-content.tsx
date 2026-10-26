"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUpLeft, Plus } from "lucide-react";
import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import ProductStage from "./product-stage";
import "@/app/story.css";

const chapters = [
  {
    number: "۰۱",
    english: "A FRESH BEGINNING",
    label: "همه‌چیز از یک گوجه شروع می‌شود",
    title: <>یک شروعِ ساده.<br /><span>یک دنیای خوشمزه.</span></>,
    body: "گاهی برای فکرکردن به یک غذای خوب، فقط دیدن یک شاخه گوجه کافی‌ست. باقی‌اش را خیال شما می‌پزد.",
    note: "از رنگِ طبیعت، تا خیالِ یک غذای تازه",
  },
  {
    number: "۰۲",
    english: "LET THE FLAVOUR UNFOLD",
    label: "حالا، نوبتِ رنگ و مزه است",
    title: <>کمی رنگ.<br /><span>کلی اشتیاق.</span></>,
    body: "سسِ پاستای امشب؟ خورشِ روز جمعه؟ هر غذایی قصهٔ خودش را دارد؛ یام‌یام می‌تواند بخشی از قصهٔ شما باشد.",
    note: "برای ایده‌هایی که سرِ اجاق جان می‌گیرند",
  },
  {
    number: "۰۳",
    english: "YOUR NEXT DELICIOUS CHAPTER",
    label: "قصهٔ بعدی را شما بسازید",
    title: <>یک قوطی یام‌یام.<br /><span>به سلیقهٔ شما.</span></>,
    body: "رب گوجه‌فرنگی یام‌یام، در قوطی ۸۰۰ گرمی. یک انتخاب برای کنارِ دستِ شما، وقتِ ساختن مزه‌های آشنا.",
    note: "از همین‌جا، به آشپزخانهٔ شما",
  },
];

function Chapter({ chapter, index, progress, reduced }: {
  chapter: typeof chapters[number];
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const ranges = index === 0 ? [0, 0.22, 0.32] : index === 1 ? [0.25, 0.35, 0.57, 0.68] : [0.61, 0.74, 1];
  const opacity = useTransform(progress, ranges, index === 0 ? [1, 1, 0] : index === 1 ? [0, 1, 1, 0] : [0, 1, 1]);
  const y = useTransform(progress, ranges, index === 0 ? [0, 0, -35] : index === 1 ? [35, 0, 0, -35] : [35, 0, 0]);
  const clip = useTransform(progress, ranges, index === 0
    ? ["inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"]
    : index === 1
      ? ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"]
      : ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)"]);

  return (
    <motion.article className={`story-chapter story-chapter-${index + 1}`}
      style={{ opacity: reduced ? 1 : opacity, y: reduced ? 0 : y, clipPath: reduced ? "none" : clip }}>
      <p className="story-chapter-kicker"><span>{chapter.number}</span>{chapter.label}</p>
      <h2>{chapter.title}</h2>
      <p className="story-chapter-body">{chapter.body}</p>
      <p className="story-chapter-note"><span />{chapter.note}</p>
    </motion.article>
  );
}

function ScrollStory() {
  const wrapper = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrapper, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 28, mass: 0.4 });
  const [activeChapter, setActiveChapter] = useState(0);
  useMotionValueEvent(progress, "change", (latest) => {
    const next = latest < 0.3 ? 0 : latest < 0.66 ? 1 : 2;
    setActiveChapter((current) => current === next ? current : next);
  });

  const branchOpacity = useTransform(progress, [0, 0.2, 0.43], [1, 1, 0]);
  const branchX = useTransform(progress, [0, 0.45], [0, -110]);
  const branchY = useTransform(progress, [0, 0.45], [0, 70]);
  const branchRotate = useTransform(progress, [0, 0.45], [-13, -24]);
  const redOpacity = useTransform(progress, [0.19, 0.35, 0.58, 0.74], [0, 1, 1, 0]);
  const redScale = useTransform(progress, [0.19, 0.45, 0.74], [0.72, 1, 1.12]);
  const finalOpacity = useTransform(progress, [0.6, 0.8, 1], [0, 1, 1]);
  const firstWordOpacity = useTransform(progress, [0, 0.2, 0.4], [1, 1, 0]);
  const middleWordOpacity = useTransform(progress, [0.2, 0.38, 0.58, 0.74], [0, 1, 1, 0]);
  const progressScale = useTransform(progress, [0, 1], [0.02, 1]);

  return (
    <section id="story" ref={wrapper} className={`scroll-story ${reduced ? "is-reduced-motion" : ""}`} aria-label="داستان طعم یام‌یام">
      <div className="story-sticky">
        <div className="container story-stage">
          <div className="story-topline">
            <p><span className="eyebrow-dot" />داستانِ طعم</p>
            <span lang="en" dir="ltr">SCROLL TO DISCOVER</span>
          </div>

          <div className="story-art" aria-hidden="true">
            <motion.div className="story-word story-word-fresh" style={{ opacity: firstWordOpacity }} lang="en" dir="ltr">FRESH</motion.div>
            <motion.div className="story-word story-word-taste" style={{ opacity: middleWordOpacity }} lang="en" dir="ltr">TASTE</motion.div>
            <motion.div className="story-word story-word-yam" style={{ opacity: finalOpacity }} lang="en" dir="ltr">YAM<br />YAM</motion.div>
            <motion.div className="story-red-disc" style={{ opacity: redOpacity, scale: redScale }} />
            <motion.div className="story-orbit" style={{ opacity: finalOpacity }} />
            <motion.div className="story-branch" style={{ opacity: branchOpacity, x: branchX, y: branchY, rotate: branchRotate }}>
              <Image src="/images/branch.webp" alt="" width={1200} height={675} sizes="(max-width: 760px) 85vw, 48vw" />
            </motion.div>
          </div>

          <div className="story-copy-layers">
            {chapters.map((chapter, index) => <Chapter key={chapter.number} chapter={chapter} index={index} progress={progress} reduced={reduced} />)}
          </div>

          <ProductStage progress={progress} variant="story" className="story-product" />

          <div className="story-bottomline">
            <div className="story-progress" aria-label={`فصل ${chapters[activeChapter].number} از سه فصل`}>
              {chapters.map((chapter, index) => (
                <span className={activeChapter === index ? "is-active" : ""} key={chapter.number} aria-current={activeChapter === index ? "step" : undefined}>{chapter.number}</span>
              ))}
              <div className="story-progress-track"><motion.span style={{ scaleX: progressScale }} /></div>
            </div>
            <span className="story-bottom-english" lang="en" dir="ltr">{chapters[activeChapter].english}</span>
            <a href="#shop" className="story-shop-link">ادامه تا فروشگاه <ArrowDown size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoryContent() {
  const reduced = !!useReducedMotion();
  return (
    <>
      <section className="brand-hero" id="home" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <motion.div className="hero-copy" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <p className="brand-eyebrow"><span className="eyebrow-dot" />یام‌یام، همراهِ لحظه‌های خوشمزه</p>
            <h1 id="hero-title">طعمِ خوب،<br />از <span className="hero-inline-word">همین‌جا<svg viewBox="0 0 310 18" fill="none" aria-hidden="true"><path d="M5 12C75 2 209 1 304 8M18 16C110 8 224 9 286 13" /></svg></span><br /><span className="hero-title-last">شروع می‌شود.</span></h1>
            <p className="hero-description">برای غذاهایی که با عشق می‌پزید،<br />و مزه‌هایی که کنارِ هم می‌سازید.</p>
            <a className="button button-green hero-cta" href="#shop">وارد فروشگاه شوید <ArrowUpLeft size={21} aria-hidden="true" /></a>
            <a className="hero-story-link" href="#story">داستانِ یام‌یام را ورق بزنید <ArrowDown size={16} aria-hidden="true" /></a>
          </motion.div>

          <motion.div className="hero-visual" initial={reduced ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
            <div className="hero-visual-word" aria-hidden="true" lang="en" dir="ltr">YAM<br /><span>YAM</span></div>
            <div className="hero-orbit" aria-hidden="true" />
            <div className="hero-small-branch" aria-hidden="true"><Image src="/images/branch.webp" alt="" width={1200} height={675} sizes="(max-width: 760px) 150px, 210px" /></div>
            <ProductStage />
            <div className="hero-weight"><span>۸۰۰</span><span>گرم<br />خوش‌سلیقگی</span></div>
            <p className="hero-vertical-label" lang="en" dir="ltr">TOMATO PASTE / MADE FOR YOUR TABLE</p>
            <div className="hero-shadow" aria-hidden="true" />
          </motion.div>
        </div>

        <div className="container hero-footnote">
          <span>رب گوجه‌فرنگی یام‌یام</span>
          <div className="hero-footnote-middle" aria-hidden="true"><span />یک قوطی، هزار ایدهٔ خوشمزه<span /></div>
          <span lang="en" dir="ltr">GOOD TASTE. GOOD TIMES.</span>
        </div>
      </section>
      <ScrollStory />
      <section className="story-to-shop container" aria-label="ورود به فروشگاه">
        <div className="story-to-shop-mark" lang="en" dir="ltr">YOUR<br /><span>YAMYAM.</span></div>
        <div><p className="brand-eyebrow">حالا، نوبتِ انتخاب شماست</p><p className="story-to-shop-copy">از تماشا،<br /><span>تا آشپزخانهٔ شما.</span></p></div>
        <a href="#shop" className="story-shop-circle" aria-label="رفتن به فروشگاه یام‌یام"><ArrowDown size={28} aria-hidden="true" /></a>
      </section>
    </>
  );
}

export function FinalContent() {
  const reduced = !!useReducedMotion();
  return (
    <>
      <section className="table-story" id="about" aria-labelledby="table-title">
        <div className="container table-story-grid">
          <div className="table-story-heading">
            <p className="brand-eyebrow"><span className="eyebrow-dot" />برای دورِ هم بودن</p>
            <h2 id="table-title">خوشمزگی،<br /><span>به وقتِ خانه.</span></h2>
          </div>
          <div className="table-story-description">
            <p>بعضی مزه‌ها، فقط مزه نیستند؛ یادِ یک ناهارِ طولانی‌اند، یک سفرهٔ شلوغ، یا شامِ دونفره‌ای که بی‌مناسبت به خاطره تبدیل شد.</p>
            <p>یام‌یام را کنارِ دستتان بگذارید و قصهٔ خوشمزهٔ خودتان را بسازید.</p>
            <a href="#shop" className="text-link">یام‌یام را انتخاب کنید <ArrowLeft size={19} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="container table-specifications">
          <div><span>محصول</span><strong>رب گوجه‌فرنگی</strong></div>
          <div><span>وزن قوطی</span><strong>۸۰۰ گرم</strong></div>
          <div><span>همراهِ</span><strong>سلیقهٔ شما در آشپزی</strong></div>
          <span className="table-spec-mark" lang="en" dir="ltr">YAMYAM</span>
        </div>
      </section>

      <section className="container brand-faq" aria-labelledby="faq-title">
        <div className="faq-intro"><p className="brand-eyebrow">پیش از یک انتخابِ خوشمزه</p><h2 id="faq-title">شاید بپرسید.</h2><span lang="en" dir="ltr">A LITTLE MORE TO KNOW.</span></div>
        <div className="faq-list">
          <details><summary>وزن قوطی یام‌یام چقدر است؟ <Plus size={21} aria-hidden="true" /></summary><p>محصولی که در این فروشگاه می‌بینید، رب گوجه‌فرنگی یام‌یام در قوطی ۸۰۰ گرمی است.</p></details>
          <details><summary>یام‌یام را برای چه غذاهایی انتخاب کنیم؟ <Plus size={21} aria-hidden="true" /></summary><p>برای خورش، سس، پاستا یا هر غذایی که دوست دارید با رب گوجه‌فرنگی بپزید؛ مقدار و شیوهٔ استفاده را به سلیقهٔ خودتان انتخاب کنید.</p></details>
          <details><summary>چطور محصول را به سبد اضافه کنم؟ <Plus size={21} aria-hidden="true" /></summary><p>در بخش فروشگاه، محصول را انتخاب کنید و از دکمهٔ افزودن به سبد خرید استفاده کنید. سبد خرید همیشه از بالای صفحه در دسترس است.</p></details>
        </div>
      </section>

      <section className="brand-final-cta" aria-labelledby="final-title">
        <div className="container final-cta-inner">
          <motion.p className="final-english" lang="en" dir="ltr" initial={reduced ? false : { opacity: 0.4, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>LET’S MAKE<br /><span>SOMETHING GOOD.</span></motion.p>
          <div><p className="brand-eyebrow">مزهٔ بعدی، با شما</p><h2 id="final-title">یک قوطی.<br />هزار قصهٔ خوشمزه.</h2><a className="button button-green" href="#shop">وارد فروشگاه شوید <ArrowUpLeft size={20} aria-hidden="true" /></a></div>
        </div>
      </section>
    </>
  );
}
