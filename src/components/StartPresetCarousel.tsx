import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StartPresetCard } from "./StartPresetCard";
import { AnimatedButton } from "./AnimatedButton";
import { ArrowLeftIcon } from "./icons/ArrowLeftIcon";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";
import { START_PRESETS } from "../constants/startPresets";

// Wie viele Karten gleichzeitig sichtbar sind (Jonas' Vorgabe 2026-08-18,
// nach Skizze: vier volle Karten in der Reihe).
const VISIBLE_COUNT = 4;
// "ein Klick soll dabei immer zwei weiter gehen" - eigenstaendig von
// VISIBLE_COUNT, deshalb ein eigenes Fenster (sliding window, nicht
// nicht-ueberlappende Seiten): zwei der vier sichtbaren Karten bleiben nach
// einem Klick stehen, zwei sind neu - "laeuft wie in einem Karussell".
const STEP = 2;

// Startseiten-Preset-Karussell (Jonas' Vorgabe 2026-08-18). Acht Presets
// (startPresets.ts), vier gleichzeitig sichtbar, Pfeile verschieben das
// Fenster um je zwei Karten und wickeln am Ende/Anfang herum (modulo statt
// fester Seiten - "Karussell", kein Anfang/Ende). Nur die AKTUELL sichtbaren
// Karten werden gemountet (siehe StartPresetThumbnail.tsx's Snapshot-
// Mechanismus - jede Karte baut einmalig eine echte CSG-Vorschauszene auf,
// alle acht gleichzeitig zu halten waere unnoetiger Mehraufwand fuer eine
// reine Icon-Vorschau).
export function StartPresetCarousel() {
  const [startIndex, setStartIndex] = useState(0);
  const total = START_PRESETS.length;

  function next() {
    setStartIndex((i) => (i + STEP) % total);
  }
  function prev() {
    setStartIndex((i) => (i - STEP + total) % total);
  }

  const visiblePresets = Array.from({ length: VISIBLE_COUNT }, (_, i) => START_PRESETS[(startIndex + i) % total]);
  const pageCount = Math.ceil(total / STEP);
  const activePage = startIndex / STEP;

  return (
    // gap-4 -> gap-3 (Jonas' Vorgabe 2026-08-18: gesamter Preset-Bereich
    // soll kompakter wirken).
    <div className="flex flex-col items-center gap-3">
      <p className="font-heading text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Presets</p>
      <div className="flex items-center gap-3">
        <AnimatedButton
          type="button"
          onClick={prev}
          aria-label="Vorherige Presets"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-400"
        >
          <ArrowLeftIcon size={16} />
        </AnimatedButton>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={startIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex gap-4"
            >
              {visiblePresets.map((preset) => (
                <StartPresetCard key={preset.id} preset={preset} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatedButton
          type="button"
          onClick={next}
          aria-label="Weitere Presets"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-400"
        >
          <ArrowRightIcon size={16} />
        </AnimatedButton>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: pageCount }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === activePage ? "bg-brand" : "bg-slate-300 dark:bg-slate-600"}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
