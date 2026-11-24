import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./story-scenes.module.css";

export const storyImages = "/images/tomato-story";
export const canImage = { src: `${storyImages}/can.webp`, width: 724, height: 907 };

const captions = {
  packed: "این قوطی یام‌یام",
  grocery: "جاش توی فروشگاه شماست!",
  kitchen: "یا توی آشپزخونه شماست!",
};

const venues = {
  grocery: { alt: "قفسهٔ چوبی فروشگاه با قوطی‌های رب گوجه‌فرنگی یام‌یام" },
  kitchen: { alt: "پاستا با سس گوجه و ریحان روی پیشخوان آشپزخانه" },
};

type Venue = keyof typeof venues;

function VenueImage({ venue, eager = false, decorative = false }: {
  venue: Venue;
  eager?: boolean;
  decorative?: boolean;
}) {
  return (
    <picture className={styles.picture}>
      <source media="(max-width: 760px) and (orientation: portrait)"
        srcSet={`${storyImages}/${venue}-portrait.webp`} width={900} height={1350} />
      <source media="(max-width: 760px)" srcSet={`${storyImages}/${venue}-small.webp`} />
      <Image src={`${storyImages}/${venue}.webp`} alt={decorative ? "" : venues[venue].alt}
        width={1536} height={1024} loading={eager ? "eager" : "lazy"} fetchPriority="low" />
    </picture>
  );
}

function DisplayCan({ slot }: { slot?: number }) {
  return (
    <div className={styles.displayCan} style={slot === undefined ? undefined : { "--slot": slot } as CSSProperties}
      data-stock-can={slot === undefined ? undefined : ""}>
      <Image {...canImage} alt="" sizes="(max-width: 760px) 17vw, 15vw" loading="lazy" />
    </div>
  );
}

function VenueFrame({ venue, animated }: { venue: Venue; animated: boolean }) {
  return (
    <div className={`${styles.frame} ${styles[venue]}`}>
      <VenueImage venue={venue} eager={animated} decorative={animated} />
      {venue === "grocery" && [-3, -2, -1, 1, 2, 3].map((slot) => <DisplayCan key={slot} slot={slot} />)}
      {animated
        ? <div className={styles.displayCan} data-shot={`${venue}-seat`} />
        : <DisplayCan />}
    </div>
  );
}

export function StoryVenue({ venue }: { venue: Venue }) {
  return (
    <div className={`${styles.venue} ${styles[venue]}`} data-shot={venue} aria-hidden="true">
      <div className={styles.ambient}><VenueImage venue={venue} eager decorative /></div>
      <VenueFrame venue={venue} animated />
    </div>
  );
}

export function StoryCaption({ moment }: { moment: keyof typeof captions }) {
  return (
    <p className={`${styles.caption} ${moment === "packed" ? styles.packed : styles.onPhoto}`}
      data-shot={`${moment}-caption`}>
      {captions[moment]}
    </p>
  );
}

export function StoryStills() {
  return (
    <div className={styles.stills} id="story-scenes">
      <div className={styles.stillPacked}>
        <h2>{captions.packed}</h2>
        <Image {...canImage} alt="قوطی رب گوجه‌فرنگی یام‌یام" loading="lazy" />
      </div>
      {(["grocery", "kitchen"] as const).map((venue) => (
        <section key={venue} className={`${styles.stillVenue} ${styles[venue]}`}>
          <h2>{captions[venue]}</h2>
          <VenueFrame venue={venue} animated={false} />
        </section>
      ))}
    </div>
  );
}
