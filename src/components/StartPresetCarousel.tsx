import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { StartPresetCard } from "./StartPresetCard";
import { LazyStartPresetThumbnail } from "./LazyStartPresetThumbnail";
import { AnimatedButton } from "./AnimatedButton";
import { ArrowLeftIcon } from "./icons/ArrowLeftIcon";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";
import { START_PRESETS } from "../constants/startPresets";
import { schedulePreload } from "../utils/idlePreload";
// Groesse muss exakt der visible-card-Groesse entsprechen (StartPresetCard.tsx),
// sonst waere der vorgeladene Snapshot in der falschen Aufloesung fuer die
// tatsaechliche Anzeigegroesse zwischengespeichert.
const PRELOAD_SIZE_PX = 216;

// Wie viele Karten gleichzeitig sichtbar sind (Jonas' Vorgabe 2026-08-18,
// nach Skizze: vier volle Karten in der Reihe).
const VISIBLE_COUNT = 4;
// Jonas' Vorgabe 2026-08-18, urspruenglich "ein Klick soll dabei immer zwei
// weiter gehen" (STEP=2) - Fehlerbericht 2026-08-18, vierte Runde: "besser
// ist doch immer nur einer pro Klick, nicht immer direkt 2" - jetzt STEP=1.
// Eigenstaendig von VISIBLE_COUNT, deshalb ein eigenes Fenster (sliding
// window, nicht nicht-ueberlappende Seiten): drei der vier sichtbaren Karten
// bleiben nach einem Klick stehen, nur eine ist neu - "laeuft wie in einem
// Karussell".
const STEP = 1;

// Wie weit eine Kartenreihe seitlich faehrt, bevor/nachdem sie im
// ueberlaufenden Rand (overflow-hidden am umschliessenden Wrapper, direkt
// neben den Pfeil-Buttons) verschwindet (Jonas' Fehlerbericht 2026-08-18:
// "die Elemente sollen wirklich sich bewegen und auf Hoehe des Buttons dann
// wie in einen Schlitz verschwinden" - die vorherigen 48px waren kaum als
// echte Bewegung wahrnehmbar, eher ein Zittern). Ein voller Kartenbreite
// plus Abstand entsprechender Wert laesst die Reihe tatsaechlich sichtbar
// über den Rand hinaus fahren, bevor der harte Clip (kein Fade, siehe
// SLIDE_VARIANTS unten) sie am Wrapper-Rand kappt - genau der "Schlitz"-
// Effekt statt eines weichen Verblassens.
const SLIDE_DISTANCE_PX = 260;

// Motion's "dynamic variants" (Funktionen statt fester Objekte, gelesen
// ueber die "custom"-Prop unten) - horizontale Verschiebung statt der
// vorherigen vertikalen Fade (Jonas' Fehlerbericht 2026-08-18, siehe
// motion.div weiter unten fuer die volle Begruendung). Bewusst OHNE
// opacity-Animation (Fehlerbericht 2026-08-18, zweite Runde): ein Fade
// kaschierte die Bewegung selbst - jetzt bleibt die Reihe waehrend der
// gesamten Fahrt voll sichtbar, das "Verschwinden" passiert ausschliesslich
// durch den harten overflow-hidden-Clip am Wrapper-Rand (siehe dortiger
// Kommentar), nicht durch Ausblenden - genau der gewuenschte "Schlitz"-Effekt.
const SLIDE_VARIANTS: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? SLIDE_DISTANCE_PX : -SLIDE_DISTANCE_PX }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir >= 0 ? -SLIDE_DISTANCE_PX : SLIDE_DISTANCE_PX }),
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

  // Jonas' Fehlerbericht 2026-08-18 ("sichtbare Previews priorisieren, Rest
  // danach im Hintergrund"): das Karussell startet IMMER bei Index 0 (siehe
  // useState oben), die anfangs sichtbaren vier (Indizes 0-3) rendern
  // bereits ihre EIGENE echte StartPresetCard-Instanz - sie hier ZUSAETZLICH
  // im unsichtbaren Vorlade-Batch zu rendern waere reine Doppelarbeit
  // (identische Farbe/Preset), die genau den sichtbaren Karten Rechenzeit
  // wegnimmt. .slice(VISIBLE_COUNT) ueberspringt sie deshalb bewusst.
  const presetsToPreload = START_PRESETS.slice(VISIBLE_COUNT);
  // Jonas' Fehlerbericht 2026-08-18, dritte Runde ("Animationen laggen noch,
  // solange die Previews laden"): ein fester PRELOAD_STAGGER_MS-Timer startet
  // die naechste Hintergrund-Vorschau IMMER nach derselben Wartezeit, egal ob
  // der Haupt-Thread gerade frei ist oder noch mit der vorherigen (bzw. mit
  // einer laufenden Animation) beschaeftigt ist - bei einer laenger
  // dauernden CSG-Vorschau ueberlappten sich dadurch zwei gleichzeitig
  // laufende Aufbauten, deren gemeinsame Pro-Frame-Arbeit das Framebudget
  // sprengte. schedulePreload (idlePreload.ts, bereits an anderer Stelle
  // dieser Seite fuers Route-Vorladen im Einsatz) nutzt stattdessen
  // requestIdleCallback: die naechste Vorschau startet erst, wenn der
  // Haupt-Thread TATSAECHLICH frei ist (laufende Animationen/Interaktionen
  // bekommen automatisch Vorrang), nicht nach einer festen Zeitspanne.
  const [preloadCount, setPreloadCount] = useState(0);
  useEffect(() => {
    if (preloadCount >= presetsToPreload.length) return;
    return schedulePreload(() => setPreloadCount((n) => n + 1));
    // presetsToPreload.length ist ueber die Lebensdauer dieser Komponente
    // konstant (START_PRESETS/VISIBLE_COUNT aendern sich nie zur Laufzeit) -
    // absichtlich nicht in den Deps, um bei jedem Render eine neue Array-
    // Referenz zu ignorieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadCount]);

  return (
    // gap-4 -> gap-3 (Jonas' Vorgabe 2026-08-18: gesamter Preset-Bereich
    // soll kompakter wirken).
    <div className="flex flex-col items-center gap-3">
      {/* Jonas' Vorgabe 2026-08-18 ("Presets pre-loaden, damit die Karussell-
          Animation geschmeidig ist"), Fehlerbericht 2026-08-18 zweite Runde
          ("sichtbare Previews priorisieren, Rest danach im Hintergrund"):
          rendert die uebrigen Presets (NICHT die anfangs sichtbaren vier,
          siehe presetsToPreload oben) GESTAFFELT (siehe preloadCount/
          PRELOAD_STAGGER_MS oben) in ihrer Standardfarbe unsichtbar durch -
          jede schreibt ihren fertigen Snapshot in den geteilten Cache
          (presetThumbnailCache.ts, siehe StartPresetThumbnail.tsx). Ruckt
          eine Karte spaeter per Pfeiltaste neu ins Sichtfeld, findet
          StartPresetCard/-Thumbnail dort meist schon einen fertigen Eintrag
          und zeigt ihn SOFORT an, statt jedesmal einen neuen CSG-Aufbau +
          Snapshot-Einfang abzuwarten. Bewusst unsichtbar statt display:none
          (ein WebGL-Canvas ohne echte Layout-Groesse rendert nicht
          zuverlaessig) - opacity-0 behaelt die echten Pixel-Masse, waehrend
          pointer-events-none/aria-hidden es aus Interaktion und
          Screenreadern heraushalten. Kein eigener Suspense-Fallback noetig
          (fallback={null}): diese Instanzen sollen nirgends sichtbar etwas
          anzeigen, nur im Hintergrund den Cache fuellen. */}
      <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        {presetsToPreload.slice(0, preloadCount).map((preset) => (
          <Suspense key={preset.id} fallback={null}>
            <LazyStartPresetThumbnail
              config={preset.config}
              outsideColor={preset.config.outsideColor}
              cacheKey={`${preset.id}:${preset.config.outsideColor}`}
              sizePx={PRELOAD_SIZE_PX}
            />
          </Suspense>
        ))}
      </div>
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
            drehendes Rad statt eines Umblaetterns.
            Jonas' Fehlerbericht 2026-08-18, vierte Runde ("Karten ploppen
            beim Verlassen des Sichtbereichs zu ploetzlich weg, soll eine
            imaginaere Linie kurz vor dem Pfeil geben, hinter der sie
            Schritt fuer Schritt verschwinden"): mask-image mit einem
            Verlauf zu transparent an beiden Raendern - eine Karte, die
            durch den Rand-Bereich gleitet (egal ob im Ruhezustand am
            aeussersten Platz oder waehrend der Schlitz-Animation), blendet
            dadurch stufenlos aus, statt vom harten overflow-hidden-Rand
            (siehe Begruendung oben) schlagartig gekappt zu werden. */}
        <div
          className="overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        >
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
