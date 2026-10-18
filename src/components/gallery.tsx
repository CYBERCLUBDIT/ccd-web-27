"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import type { ClubContent } from "@/lib/models";
import styles from "./gallery.module.css";

export function Gallery({
  items,
  compact = false,
}: {
  items: ClubContent[];
  compact?: boolean;
}) {
  const [category, setCategory] = useState("All photos");
  const [selected, setSelected] = useState<ClubContent | null>(null);
  const photos = items.filter((item) => item.image_url);
  const categories = [
    "All photos",
    ...new Set(photos.map((item) => item.category).filter(Boolean)),
  ];
  const visible = photos.filter(
    (item) => category === "All photos" || item.category === category,
  );
  const selectedIndex = visible.findIndex((item) => item.id === selected?.id);
  function move(direction: number) {
    setSelected(
      visible[(selectedIndex + direction + visible.length) % visible.length],
    );
  }
  return (
    <div className={styles.gallery}>
      {!compact && (
        <>
          <div className={styles.intro}>
            <div>
              <span className="eyebrow">A COMMUNITY IN MOTION</span>
              <h2>Small moments. Shared discoveries.</h2>
            </div>
            <p>
              Learning, meeting people, and finding new perspectives. Explore
              moments from the club, one photograph at a time.
            </p>
          </div>
          <div className={styles.filters} aria-label="Photo categories">
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
            <span>{visible.length} photographs</span>
          </div>
        </>
      )}
      <div className={styles.grid}>
        {(compact ? visible.slice(0, 3) : visible).map((item, index) => (
          <button
            className={styles.photo}
            type="button"
            key={item.id}
            onClick={() => setSelected(item)}
            aria-label={`View photo: ${item.title}`}
          >
            <img
              src={item.image_url}
              alt={item.description || item.title}
              loading="lazy"
              decoding="async"
              style={{ aspectRatio: index % 3 === 1 ? "3 / 4" : "4 / 3" }}
            />
            <span className={styles.caption}>
              <span>
                <small>{item.category || "Club moments"}</small>
                <strong>{item.title}</strong>
              </span>
              <Expand size={18} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      {!compact && (
        <p className={styles.credit}>
          Cybersecurity Summit · 23 May 2026 · Photography by Lazaro Grapher
        </p>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className={styles.viewer}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              move(event.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          {selected && (
            <>
              <DialogTitle>{selected.title}</DialogTitle>
              <img
                className={styles.fullPhoto}
                src={selected.image_url}
                alt={selected.description || selected.title}
              />
              <DialogDescription>{selected.description}</DialogDescription>
              <div className={styles.controls}>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous photo"
                >
                  <ArrowLeft size={20} />
                </button>
                <span aria-live="polite">
                  {selectedIndex + 1} / {visible.length}
                </span>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next photo"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
