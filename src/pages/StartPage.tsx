import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeProject, PROJECT_FILE_EXTENSION } from "../config/projectFileCodec";
import { getActiveHistoryId, hasMeaningfulProjectDraft, loadProjectDraft } from "../config/projectHistoryStore";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { AnimatedButton } from "../components/AnimatedButton";
import { Shine } from "../components/primitives/Shine";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/primitives/DropdownMenu";
import { StartPresetCarousel } from "../components/StartPresetCarousel";
import { useTour } from "../tour/TourContext";
import { useIsPhoneViewport } from "../hooks/useIsPhoneViewport";
import { schedulePreload } from "../utils/idlePreload";

const LOAD_BUTTON_CLASSNAME =
  "flex items-center justify-center gap-2 rounded-full border-2 border-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white";

// Zentrierter Startbildschirm: "Konfiguration starten" + "Projekt laden".
// Seit dem Zusammenlegen von Einzel-/Ensemble-Modus (siehe WorkspacePage.tsx)
// gibt es nur noch EINEN Einstieg - ein Projekt, in dem beliebig viele
// Container angelegt werden koennen - deshalb kein Umschalt-Button mehr.
export function StartPage() {
  const navigate = useNavigate();
  const { notifyEvent } = useTour();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCache = hasMeaningfulProjectDraft();
  // Jonas' Vorgabe 2026-07-28: auf dem Handy nur noch "Projekt laden" -
  // Konfigurieren (3D-CSG, viele Eingabefelder) bleibt Laptop/PC/Tablet
  // vorbehalten, siehe useIsPhoneViewport.ts.
  const isPhone = useIsPhoneViewport();

  // Auf dem Handy landet ein geladenes Projekt im schreibgeschuetzten
  // /ansehen statt im editierbaren /projekt (Jonas' Vorgabe 2026-07-28: "das
  // Ding soll auf dem Handy nur ein Viewer sein") - siehe ProjectViewerPage.tsx.
  const loadedProjectRoute = isPhone ? "/ansehen" : "/projekt";

  // Intelligentes Vorladen (Jonas' Vorgabe 2026-08-11, per Playwright-
  // Untersuchung bestaetigt): App.tsx laedt WorkspacePage/ProjectViewerPage
  // per React.lazy() erst bei der tatsaechlichen Navigation - dabei zieht
  // WorkspacePage transitiv den gesamten three.js/r3f/drei/three-bvh-csg-
  // Stack nach (siehe App.tsx-Kommentar dort, "ProjectScene3D"-Chunk allein
  // >1,2MB minifiziert). Gemessen per Playwright mit gedrosseltem Netzwerk
  // (~1,6 Mbit/s): der klassische, im Netzwerk-Tab sichtbare Kaltstart-Chunk-
  // Ladevorgang beim ERSTEN Klick auf "Konfiguration starten"/"Projekt
  // laden" - genau der Import()-Chunk-Fall, den die Recherche als
  // Hauptkandidaten fuer "first use"-Ladehakler nennt (siehe App.tsx). Von
  // StartPage aus fuehrt praktisch JEDER Pfad (Konfiguration starten, Aus
  // Cache/Datei laden, Demo-Projekt) zu genau EINER dieser beiden Zielrouten
  // (loadedProjectRoute je nach isPhone) - kein Ratespiel wie bei anderen
  // Stellen im Projekt, StartPage IST die Weiche dorthin. Deshalb hier
  // gezielt (nicht pauschal wie bei einer generischen App-Start-Vorladung)
  // per requestIdleCallback genau den einen wahrscheinlich noetigen Chunk
  // vorladen, sobald der Haupt-Thread nach dem eigenen (leichten) Rendern
  // dieser Seite frei ist - das eigentliche StartPage-Rendern selbst braucht
  // den 3D-Stack nicht und wird dadurch nicht ausgebremst. dynamic import()
  // mit demselben Modulpfad wie in App.tsx's lazy(() => import(...)) fuellt
  // den Browser-eigenen Modul-Cache; der spaetere echte lazy()-Aufruf bei
  // Navigate() trifft dadurch auf ein bereits aufgeloestes Promise statt neu
  // zu laden/parsen.
  useEffect(() => {
    const cancel = schedulePreload(() => {
      if (isPhone) {
        void import("./ProjectViewerPage");
      } else {
        void import("./WorkspacePage");
      }
    });
    return cancel;
  }, [isPhone]);

  async function loadProjectFile(file: File) {
    try {
      const project = await decodeProject(file);
      setError(null);
      navigate(loadedProjectRoute, { state: { project } });
    } catch {
      setError("Datei konnte nicht geladen werden – ist es eine gültige Projektdatei (.sszprojekt)?");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // erlaubt erneutes Auswaehlen derselben Datei
    if (!file) return;
    await loadProjectFile(file);
  }

  function handleLoadFromCache() {
    const cached = loadProjectDraft();
    if (!cached) return;
    // historyId mitgeben (nur hier, NICHT beim Datei-Laden oben) - "Aus
    // Cache laden" oeffnet den bereits AKTIVEN Verlaufs-Eintrag wieder,
    // WorkspacePage soll also weiter in genau diesen schreiben statt einen
    // neuen Eintrag fuer denselben Stand anzulegen (Jonas' Vorgabe 2026-07-28:
    // ein neuer Eintrag nur bei einem WECHSEL zu einem anderen Projekt).
    navigate(loadedProjectRoute, { state: { project: cached, historyId: getActiveHistoryId() ?? undefined } });
  }

  return (
    // z-0 (nicht nur "relative") ist noetig, damit dieses Element einen
    // EIGENEN Stacking-Context aufmacht - sonst "entkommen" die -z-10-Kinder
    // bis zum naechsten Vorfahren, der einen aufmacht, und werden dort HINTER
    // dessen normalem (nicht positioniertem) bg-white gemalt, das faelschlich
    // "spaeter" gezeichnet wird (Debugging-Fund 2026-07-22).
    //
    // Jonas' Vorgabe 2026-08-18 (Preset-Karussell): der Seiteninhalt kann
    // jetzt hoeher als der Viewport werden (acht Preset-Karten) -
    // overflow-y-auto statt overflow-hidden, damit die Seite dann scrollt
    // statt Inhalt abzuschneiden (die horizontale Bleed-Begruendung fuer
    // overflow-hidden oben gilt weiter, deshalb overflow-x bewusst separat
    // weiter hidden). justify-center bewusst entfernt: bei ueberlaufendem
    // Inhalt in einem scrollenden Flex-Container ist der Seitenanfang mit
    // justify-center browseruebergreifend teils nicht mehr zuverlaessig
    // erreichbar ("scroll to safe center"-Eigenheit) - grosszuegiges
    // vertikales Padding wirkt bei kurzem Inhalt optisch aehnlich zentriert,
    // bleibt aber bei langem Inhalt zuverlaessig durchscrollbar.
    //
    // Jonas' Vorgabe 2026-08-18 (Nachbesserung): der obere "Konfiguration
    // starten"-Bereich soll nur noch ca. 40-45% der Seite einnehmen, der
    // gesamte Preset-Bereich insgesamt kompakter wirken - gap-8/py-10 auf
    // gap-6/py-8 reduziert (wirkt gleichmaessig auf alle Top-Level-
    // Geschwister, straffe also sowohl den Abstand vor als auch nach dem
    // Karussell).
    <div className="relative z-0 flex h-full flex-col items-center gap-6 overflow-y-auto overflow-x-hidden px-6 py-8 text-center">
      {/* Platzhalter-Hintergrund (Jonas' Vorgabe 2026-07-22: "wie hinter
          Milchglas", nicht extrem - Bild wird spaeter ersetzt). scale-110
          verhindert, dass der Weichzeichner am Bildrand einen harten Rand
          durchscheinen laesst; das halbtransparente weisse Overlay erzeugt
          den Milchglas-Effekt und haelt den Text darueber lesbar. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: "url(/start-background.svg)" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-white/55 dark:bg-slate-900/70" />

      {/* Jonas' Vorgabe 2026-08-18: "50% der Seite soll der Bereich mit
          Konfiguration Starten und Projekt Laden sein, darunter soll die
          Mitte der Höhe verlaufen" - eigener h-1/2-Block statt nur einer
          losen Abstands-Heuristik (siehe vorherige gap/py-Anpassung), damit
          die Grenze exakt bei der halben Seitenhoehe liegt, unabhaengig
          davon, wie viel Inhalt darunter (Presets) noch folgt. h-1/2 loest
          gegen die Hoehe DIESES Wurzel-Elements auf (h-full, siehe oben) -
          bleibt dadurch bei genau 50% des sichtbaren Viewport-Slots stehen,
          auch wenn der Preset-Bereich darunter die Seite scrollbar macht.
          shrink-0, damit ein spaeter waechst Karussell diesen Block nicht
          zusammendrueckt. */}
      <div className="flex h-1/2 w-full shrink-0 flex-col items-center justify-center gap-6">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-brand-dark dark:text-brand-light">
            Container Studio
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">3D-Konfigurator für individuelle Sondercontainer</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
        {/* Kein "Konfiguration starten" auf dem Handy (Jonas' Vorgabe
            2026-07-28: Konfigurieren bleibt Laptop/PC/Tablet vorbehalten) -
            der Hinweistext darunter erklaert, warum der Button fehlt, statt
            ihn einfach kommentarlos verschwinden zu lassen. */}
        {!isPhone && (
          // loop + loopDelay (Jonas' Vorgabe 2026-08-10: "die Glimm-Animation
          // soll nicht nur einmal sein, sondern wiederkehrend, aber nicht zu
          // aufdringlich - einmal Animation, kurze Pause, dann wieder im
          // Loop") - Shine.tsx unterstuetzt das bereits eingebaut: nach jedem
          // Durchlauf wartet es loopDelay ms, bevor der naechste startet,
          // statt (wie vorher, Standardwert loop=false) nur einmal beim
          // Mounten zu spielen.
          <Shine asChild loop loopDelay={2000}>
            <AnimatedButton
              type="button"
              data-tour="start-configuration"
              onClick={() => {
                notifyEvent("project-started");
                navigate("/projekt", { state: { fresh: true } });
              }}
              className="flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
            >
              Konfiguration starten
              <ArrowRightIcon size={18} />
            </AnimatedButton>
          </Shine>
        )}

        {/* "Projekt laden" ist IMMER derselbe, optisch unveraenderte Button
            (Jonas' Vorgabe: "es soll keine optische Veränderung an dem
            Button sein, nur dass das Menü kommt, wenn etwas im Cache ist") -
            nur das Klickverhalten dahinter unterscheidet sich: mit Cache
            oeffnet ein Radix-Dropdown-Menu (animate-ui-Basis, siehe
            https://animate-ui.com/docs/components/radix/dropdown-menu),
            ohne Cache geht der Klick direkt auf den Dateidialog. */}
        {hasCache ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Shine asChild loop loopDelay={2000}>
                <AnimatedButton type="button" className={LOAD_BUTTON_CLASSNAME}>
                  <UploadIcon size={18} />
                  Projekt laden
                </AnimatedButton>
              </Shine>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={8}
              className="w-56 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <DropdownMenuItem
                onSelect={handleLoadFromCache}
                className="block cursor-pointer rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Aus Cache laden
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => fileInputRef.current?.click()}
                className="block cursor-pointer rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Aus Datei laden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Shine asChild loop loopDelay={2000}>
            <AnimatedButton type="button" onClick={() => fileInputRef.current?.click()} className={LOAD_BUTTON_CLASSNAME}>
              <UploadIcon size={18} />
              Projekt laden
            </AnimatedButton>
          </Shine>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={PROJECT_FILE_EXTENSION}
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
        {isPhone && (
          <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Neue Konfigurationen können nur auf einem Laptop, PC oder Tablet erstellt werden. Auf dem Handy können
            bereits gespeicherte Projekte angeschaut werden.
          </p>
        )}
      </div>
      {/* Preset-Karussell (Jonas' Vorgabe 2026-08-18) - wie "Konfiguration
          starten" bewusst nur auf Laptop/PC/Tablet (siehe isPhone-Kommentar
          oben: Konfigurieren bleibt dem Handy vorbehalten). */}
      {!isPhone && <StartPresetCarousel />}
      {error && <p className="max-w-sm text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
