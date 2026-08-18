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

// Jonas' Vorgabe 2026-08-18: die Glimm-Animation soll "laufen" - erst
// "Konfiguration starten" (links), dann direkt im Anschluss "Projekt laden"
// (rechts), "als wuerde die Animation in den anderen Button uebergehen"
// statt beide (wie bisher) gleichzeitig/unabhaengig voneinander zu blinken.
// Shine.tsx's `delay`-Prop verzoegert nur den ALLERERSTEN Durchlauf, danach
// uebernimmt loopDelay - da beide Buttons dieselbe duration (Shine.tsx-
// Default 1200ms) UND denselben loopDelay=2000 haben, bleibt der einmal
// gesetzte Versatz (SHINE_HANDOFF_DELAY_MS = duration des ersten Buttons)
// bei JEDEM weiteren Loop-Durchlauf automatisch erhalten - Button 2 startet
// dadurch dauerhaft immer genau dann, wenn Button 1 fertig ist.
const SHINE_HANDOFF_DELAY_MS = 1200;

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
    // Jonas' Fehlerbericht 2026-08-18, vierte Runde ("der Header fehlt jetzt
    // komplett"): die vorherige Runde hatte den Hintergrund auf
    // position:fixed umgestellt (inset-0 relativ zum kompletten Browser-
    // Viewport statt zu diesem Wurzel-Element) - das deckte damit auch die
    // Kopfzeile ab, die AppShell.tsx als GESCHWISTER dieser Seite oberhalb
    // rendert. Root Cause jetzt anders geloest, siehe die zwei verschachtelten
    // Ebenen unten: eine AEUSSERE, NIE scrollende Ebene haelt den
    // Hintergrund (zurueck auf position:absolute, aber jetzt sicher, weil
    // IHRE eigene Box sich nie durch Scrollen veraendert) und bleibt exakt
    // auf den eigentlichen Seiteninhalt (unterhalb der Kopfzeile) beschraenkt
    // - eine INNERE Ebene traegt das eigentliche overflow-y-auto/den
    // scrollenden Inhalt. Der urspruengliche Leck-Bug (siehe Git-Historie:
    // "weiss im Darkmode" - ein absolut positionierter Hintergrund deckt nur
    // die STATISCHE Box seines Elternelements ab, nicht gescrollten
    // Ueberschuss) kann so nicht mehr auftreten, weil die Hintergrund-Ebene
    // an einem Element haengt, das selbst NIE scrollt.
    <div className="relative z-0 h-full overflow-hidden">
      {/* Platzhalter-Hintergrund (Jonas' Vorgabe 2026-07-22: "wie hinter
          Milchglas", nicht extrem - Bild wird spaeter ersetzt). scale-110
          verhindert, dass der Weichzeichner am Bildrand einen harten Rand
          durchscheinen laesst; das halbtransparente weisse Overlay erzeugt
          den Milchglas-Effekt und haelt den Text darueber lesbar. z-0 auf
          diesem AEUSSEREN Wrapper (nicht nur "relative") ist noetig, damit
          er einen EIGENEN Stacking-Context aufmacht - sonst "entkommen" die
          -z-10-Kinder bis zum naechsten Vorfahren, der einen aufmacht, und
          werden dort HINTER dessen normalem bg-white gemalt (Debugging-Fund
          2026-07-22). */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: "url(/start-background.svg)" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-white/55 dark:bg-slate-900/70" />

      {/* INNERE, scrollende Ebene (siehe Begruendung oben) - traegt den
          kompletten sichtbaren Inhalt. */}
      <div className="flex h-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden px-6 py-8 text-center">
        {/* Jonas' Vorgabe 2026-08-18: Mittellinie bei 35% der Seite (h-[35%]),
            Inhalt sitzt via justify-end am UNTEREN Rand dieser Zone (nicht
            justify-center - sonst gleich viel Leerraum ueber dem Titel wie
            unter den Buttons bis zur Mittellinie), Presets schliessen direkt
            darunter an.
            Jonas' Fehlerbericht 2026-08-18, vierte Runde ("Platz ueber der
            Ueberschrift darf auch komprimiert werden, Abstaende sollen nur
            im Verhaeltnis gleich bleiben, kollidiert bei duennem/niedrigem
            Fenster immer noch"): das feste min-h-[280px] der letzten Runde
            war ein harter Klotz, der bei wenig Platz nicht mitschrumpfte -
            jetzt clamp()-basierte Abstaende (gap/pb skalieren mit der
            Viewport-Hoehe zwischen einem kleinen und dem bisherigen Wert,
            KEIN fixer Sprung) plus ein deutlich kleineres min-h-[180px] als
            reine Sicherheitsuntergrenze (deckt nur noch Titel+eine
            Button-Zeile ohne jeden Luftabstand ab - der eigentliche
            Kollisions-Fix liegt aber in der Preset-Zone weiter unten:
            justify-center dort liess ueberlaufenden Inhalt hier HINEIN
            bluten, siehe dortiger Kommentar). */}
        {/* Jonas' Vorgabe 2026-08-18 (weitere Nachbesserung): "Platz
            oberhalb/unterhalb der Mittellinie darf mehr sein, nach oben
            2,5% und nach unten 2,5% geschoben" - pb-[2.5vh] hier schiebt
            den Hero-Inhalt 2,5% der Viewport-Hoehe VOR die Mittellinie
            zurueck, das spiegelbildliche pt-[2.5vh] auf der Preset-Zone
            weiter unten schiebt SIE 2,5% hinter die Mittellinie - zusammen
            ein 5vh breiter Puffer, mittig auf der 35%-Linie. */}
        <div className="flex h-[35%] min-h-[180px] w-full shrink-0 flex-col items-center justify-end gap-[clamp(0.75rem,3vh,1.5rem)] pb-[2.5vh]">
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
              <Shine asChild loop loopDelay={2000} delay={SHINE_HANDOFF_DELAY_MS}>
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
          <Shine asChild loop loopDelay={2000} delay={SHINE_HANDOFF_DELAY_MS}>
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
        {/* Jonas' Fehlerbericht 2026-08-18 ("grauer Balken unten, wurde mit
            der 35%-Anpassung sogar noch groesser"): der Hero-Block oben ist
            fest auf h-[35%] der Seite gesetzt, aber DIESER Bereich hier lag
            bisher einfach lose im normalen Fluss darunter - bei natuerlicher
            (nicht bis zum Seitenende reichender) Kartenhoehe blieb der GANZE
            Rest zwischen Kartenende und unterem Seitenrand unbenutzter
            Leerraum. flex-1 macht diesen Bereich zur vollen verbleibenden
            Zone (100% - 35% Hero).
            Jonas' Fehlerbericht 2026-08-18, vierte Runde ("kollidiert immer
            noch", Screenshot zeigte die Buttons ueber den Preset-Karten-
            Titeln): der Grund war justify-center HIER - bei einem sehr
            niedrigen Fenster, wo der Karussell-Inhalt hoeher als diese Zone
            ist, verteilt justify-center den Ueberlauf GLEICHMAESSIG nach
            OBEN UND UNTEN - die obere Haelfte des Ueberlaufs blutete dadurch
            sichtbar in den Hero-Bereich hinein. justify-start laesst
            ueberlaufenden Inhalt nur noch NACH UNTEN (in die scrollbare
            Zone) ueberlaufen, nie nach oben - genau das behebt die
            gemeldete Kollision. */}
        {/* pt-[2.5vh] - siehe Kommentar am Hero-Block oben (spiegelbildlicher
            Puffer auf der anderen Seite der Mittellinie). */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-2 pt-[2.5vh]">
          {/* Preset-Karussell (Jonas' Vorgabe 2026-08-18) - wie "Konfiguration
              starten" bewusst nur auf Laptop/PC/Tablet (siehe isPhone-Kommentar
              oben: Konfigurieren bleibt dem Handy vorbehalten). */}
          {!isPhone && <StartPresetCarousel />}
          {error && <p className="max-w-sm text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
