"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingExperience({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-experience">
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="page-scroll-progress"
            style={{ scaleX: progress }}
          />
        )}
        {children}
      </div>
    </MotionConfig>
  );
}

const captions = [
  "Find your people.",
  "Follow the evidence.",
  "Build your confidence.",
  "Defend what matters.",
];
export function HeroCaption() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!visible || reduced || paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % captions.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [visible, reduced, paused]);
  return (
    <div className="hero-caption" ref={ref}>
      <span className="caption-prefix">YOUR NEXT CHAPTER</span>
      <div className="caption-window" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            initial={reduced ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -12, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {captions[index]}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="sr-only">
        Find your people. Follow the evidence. Build your confidence. Defend
        what matters.
      </span>
      {!reduced && (
        <Button
          variant="ghost"
          size="icon"
          className="motion-pause"
          aria-label={
            paused ? "Play rotating hero text" : "Pause rotating hero text"
          }
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </Button>
      )}
    </div>
  );
}

const ribbonWords = [
  "LEARN WITH PURPOSE",
  "FOLLOW THE EVIDENCE",
  "PRACTISE RESPONSIBLY",
  "GROW TOGETHER",
  "DEFEND WHAT MATTERS",
];
export function MovingRibbon() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={`moving-ribbon${visible && !reduced && !paused ? " ribbon-running" : ""}`}
      ref={ref}
    >
      <div className="ribbon-window">
        <div className="ribbon-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div className="ribbon-copy" key={copy}>
              {ribbonWords.map((word) => (
                <span key={word}>
                  {word}
                  <span className="ribbon-cross">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">{ribbonWords.join(". ")}.</span>
      {!reduced && (
        <Button
          variant="ghost"
          size="icon"
          className="ribbon-pause"
          aria-label={
            paused ? "Play moving text ribbon" : "Pause moving text ribbon"
          }
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </Button>
      )}
    </div>
  );
}

export function PartnerMarquee() {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const names = [
    "Partner one",
    "Partner two",
    "Partner three",
    "Partner four",
    "Partner five",
  ];
  return (
    <section
      className={`partner-marquee${paused ? " is-paused" : ""}`}
      aria-label="Partner showcase prototype"
    >
      <div className="container partner-caption">
        <span>OUR PARTNERS</span>
        <small>Logo placeholders · partners to be confirmed</small>
        <Button
          variant="ghost"
          size="icon"
          aria-label={paused ? "Play partner strip" : "Pause partner strip"}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </Button>
      </div>
      <div className="partner-window">
        <div
          className="partner-track"
          style={reduced ? { animation: "none" } : undefined}
        >
          {[0, 1].map((copy) => (
            <div
              className="partner-copy"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {names.map((name, i) => (
                <div className="partner-wordmark" key={name}>
                  <span
                    className={`partner-symbol symbol-${i}`}
                    aria-hidden="true"
                  >
                    {["◇", "◈", "◎", "✳", "⬡"][i]}
                  </span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
