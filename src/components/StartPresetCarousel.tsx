import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
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

// Motion's "dynamic variants" (Funktionen statt fester Objekte, gelesen
// ueber die "custom"-Prop unten) - horizontale Verschiebung statt der
// vorherigen vertikalen Fade (Jonas' Fehlerbericht 2026-08-18, siehe
// motion.div weiter unten fuer die volle Begruendung).
const SLIDE_VARIANTS: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -48 : 48, opacity: 0 }),
};

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
  // Jonas' Fehlerbericht 2026-08-18: die Uebergangs-Animation wirkte "wie
  // ein Flipboard" statt wie ein Karussell/ein auf dem Boden liegendes,
  // gedrehtes Rad - direction haelt fest, ob zuletzt "weiter" (1, neue
  // Karten kommen von rechts, alte gehen nach links) oder "zurueck" (-1,
  // umgekehrt) gedrueckt wurde, damit die neuen Karten aus genau der
  // Richtung hereinrollen, in die auch die Pfeiltaste zeigt - siehe
  // motion.div unten (initial/exit als Funktionen von direction).
  const [direction, setDirection] = useState(1);
  const total = START_PRESETS.length;

  function next() {
    setDirection(1);
    setStartIndex((i) => (i + STEP) % total);
  }
  function prev() {
    setDirection(-1);
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

        {/* mode="popLayout" statt "wait" (Jonas' Fehlerbericht 2026-08-18):
            "wait" liesse die alte Kartenreihe erst KOMPLETT verschwinden,
            bevor die neue erscheint - genau der abrupte "Flipboard"-Effekt,
            den er nicht wollte. "popLayout" nimmt die austretende Reihe
            sofort aus dem normalen Layout-Fluss heraus (verhindert das
            sonst uebliche Stapeln zweier normal fliessender Kartenreihen
            uebereinander), waehrend sie weiter sichtbar herausgleitet UND
            gleichzeitig die neue hereinrollt - wie ein durchgehend
            drehendes Rad statt eines Umblaetterns. */}
        <div className="overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={startIndex}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
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
