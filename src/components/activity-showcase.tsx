"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
const activities = [
  {
    id: "workshops",
    title: "Workshops & study groups",
    text: "Learn network security, digital forensics, and incident response with other club members.",
    topics: "Guided sessions · Shared resources",
    href: "/learning",
    link: "Explore learning",
    photo: "/illustrations/network-lab.svg",
    alt: "Illustration of connected network devices",
  },
  {
    id: "ctfs",
    title: "CTFs & practical challenges",
    text: "Work through security puzzles and investigate digital evidence in authorised practice environments.",
    topics: "Team challenges · Hands-on practice",
    href: "/learning",
    link: "Explore practice labs",
    photo: "/illustrations/code-lab.svg",
    alt: "Illustration of a terminal window",
  },
  {
    id: "awareness",
    title: "Cybersecurity awareness",
    text: "Help fellow students recognise scams, secure their accounts, and stay safer online.",
    topics: "Campus sessions · Safer digital habits",
    href: "/events",
    link: "See events",
    photo: "/illustrations/security-grid.svg",
    alt: "Illustration of a security shield",
  },
];
export function ActivityShowcase() {
  const [active, setActive] = useState("workshops");
  const reduced = useReducedMotion();
  const selected = activities.find((a) => a.id === active)!;
  return (
    <div className="activities-editorial">
      <div className="activities-editorial-list">
        <Accordion
          type="single"
          value={active}
          onValueChange={(value) => {
            if (value) setActive(value);
          }}
        >
          {activities.map((item, i) => (
            <AccordionItem
              value={item.id}
              key={item.id}
              className="activity-editorial-item"
            >
              <AccordionTrigger>
                <span className="activity-editorial-number">0{i + 1}</span>
                <span>{item.title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>{item.text}</p>
                <span className="activity-editorial-topics">{item.topics}</span>
                <Link href={item.href}>
                  {item.link}
                  <ArrowUpRight size={16} />
                </Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <figure className="activities-editorial-photo">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={selected.id}
            src={selected.photo}
            alt={selected.alt}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.35 }}
            loading="lazy"
          />
        </AnimatePresence>
        <figcaption>
          <span>{selected.title}</span>
          <small>Practice. Explore. Discover.</small>
        </figcaption>
      </figure>
    </div>
  );
}
