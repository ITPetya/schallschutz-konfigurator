import { useEffect, useRef, useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { HomeIcon } from "./icons/HomeIcon";
import { UndoIcon } from "./icons/UndoIcon";
import { RedoIcon } from "./icons/RedoIcon";
import { RulerIcon } from "./icons/RulerIcon";
import { SectionIcon } from "./icons/SectionIcon";
import { ViewIcon } from "./icons/ViewIcon";
import { SpaceMouseIcon } from "./icons/SpaceMouseIcon";
import { AlignIcon } from "./icons/AlignIcon";
import { MeasureResultPanel } from "./MeasureResultPanel";
import { SpaceMouseSettingsPanel } from "./SpaceMouseSettingsPanel";
import { AlignmentResultPanel, type AlignmentResultPanelProps } from "./AlignmentResultPanel";
import { SectionResultPanel, ViewResultPanel, type SectionPlaneState } from "./SectionAndViewPanel";
import { useToolbarVerticalOffset } from "../hooks/useToolbarVerticalOffset";
import type { MeasurePoint } from "../utils/measurePoints";
import type { UnitPreferences } from "../config/unitPreferencesStore";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";

const DEFAULT_UNIT_PREFS: UnitPreferences = { primary: "mm", secondary: null };

interface ViewerToolbarProps {
  // Jonas' Vorgabe 2026-08-12: die Werkzeug-Spalte soll bei drohender
  // Kollision mit dem Home-Button nach oben ausweichen (siehe
  // useToolbarVerticalOffset.ts) - dafuer muss sie die tatsaechliche Hoehe
  // ihres "position: relative"-Elternelements kennen. Scene.tsx/
  // ProjectScene3D.tsx reichen den Ref auf ihre umschliessende
  // "relative min-h-0 flex-1"-Huelle (auch um Canvas herum) durch.
  containerRef: React.RefObject<HTMLElement | null>;
  onReset: () => void;
  // Optional (Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für
  // strg+z usw.") - fehlen im schreibgeschuetzten Viewer (KonfiguratorPage.tsx),
  // dort gibt es nichts rueckgaengig zu machen.
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Schnitt (Jonas' Vorgabe 2026-08-10: jetzt Werkzeug-Button statt fester
  // Position unten links, siehe SectionAndViewPanel.tsx's SectionResultPanel).
  section: SectionPlaneState;
  sectionDisabledHint?: string;
  // Ansicht - optional wie zuvor, fehlt im schreibgeschuetzten Viewer.
  viewStyle?: ViewStyle;
  background?: BackgroundStyle;
  shadowsEnabled?: boolean;
  terrainDetail?: TerrainDetail;
  onViewStyleChange?: (v: ViewStyle) => void;
  onBackgroundChange?: (b: BackgroundStyle) => void;
  onShadowsEnabledChange?: (v: boolean) => void;
  onTerrainDetailChange?: (d: TerrainDetail) => void;
  // Jonas' Vorgabe 2026-08-10: Messwerkzeug (wie in Inventor) - optional,
  // weil nicht jeder Viewer (z. B. der schreibgeschuetzte Konstrukteur-
  // Viewer) es unbedingt anbieten muss.
  measureActive?: boolean;
  onToggleMeasure?: () => void;
  measureSelected?: MeasurePoint[];
  unitPrefs?: UnitPreferences;
  onChangeUnitPrefs?: (prefs: UnitPreferences) => void;
  // Jonas' Vorgabe 2026-08-11: 3Dconnexion SpaceMouse als zusaetzliche
  // Kamerasteuerung (siehe hooks/useSpaceMouse.ts). Der Button blendet sich
  // komplett aus, wenn spaceMouseSupported false ist (WebHID gibt es nur in
  // Chromium-basierten Browsern) - "nur in den Browsern die klappen", keine
  // Fehler-/Hinweis-UI fuer alle anderen. Optional, weil der
  // schreibgeschuetzte Konstrukteur-Viewer keine eigene Verbindungssteuerung
  // braucht/anbietet.
  spaceMouseSupported?: boolean;
  spaceMouseConnected?: boolean;
  spaceMouseDeviceName?: string | null;
  onSpaceMouseConnect?: () => void;
  onSpaceMouseDisconnect?: () => void;
  // Jonas' Vorgabe 2026-08-12: Empfindlichkeit einstellbar (siehe
  // hooks/useSpaceMouseSensitivity.ts) - optional aus demselben Grund wie
  // die anderen SpaceMouse-Props (schreibgeschuetzter Viewer bietet das
  // Panel gar nicht erst an).
  spaceMouseSensitivity?: number;
  onSpaceMouseSensitivityChange?: (v: number) => void;
  // Jonas' Vorgabe 2026-08-12: "Ausrichten" als eigenes Werkzeug (ersetzt die
  // alte Dropdown-Sektion in der Seitenleiste) - Flaechen im Viewer anklicken
  // (siehe AlignmentFaceMarkers.tsx/AlignmentResultPanel.tsx). Optional wie
  // Messen/SpaceMouse, weil nur die Baugruppen-Ansicht (ProjectScene3D.tsx)
  // ueberhaupt mehrere Container hat, zwischen denen ausgerichtet werden
  // koennte - der Einzelcontainer-Viewer (Scene.tsx) bietet es gar nicht an.
  alignmentActive?: boolean;
  onToggleAlignment?: () => void;
  alignmentPanelProps?: Omit<AlignmentResultPanelProps, "active">;
}

// Home-Button direkt neben dem ViewCube (Jonas' Vorgabe 2026-07-25: "wie bei
// Inventor ausgeführt ... auch da beim ViewCube") - Rückgängig/Wiederholen
// dagegen bewusst NICHT dort, sondern oben rechts im Viewer (Jonas' Vorgabe
// 2026-07-25: "die vor und zurück buttons sollten oben rechts im viewer
// sein"), gleicher Button-Stil (halbtransparenter weisser Kreis) an beiden
// Stellen.
export function ViewerToolbar({
  containerRef,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  section,
  sectionDisabledHint,
  viewStyle,
  background,
  shadowsEnabled,
  terrainDetail,
  onViewStyleChange,
  onBackgroundChange,
  onShadowsEnabledChange,
  onTerrainDetailChange,
  measureActive,
  onToggleMeasure,
  measureSelected,
  unitPrefs,
  onChangeUnitPrefs,
  spaceMouseSupported,
  spaceMouseConnected,
  spaceMouseDeviceName,
  onSpaceMouseConnect,
  onSpaceMouseDisconnect,
  spaceMouseSensitivity,
  onSpaceMouseSensitivityChange,
  alignmentActive,
  onToggleAlignment,
  alignmentPanelProps,
}: ViewerToolbarProps) {
  // "Ansicht" hat (anders als Schnitt/Messen) kein eigenes "aktiv"-Konzept
  // im Modell - der Button ist einfach "aktiv", solange sein Panel offen
  // ist, unabhaengig davon, was darin eingestellt wird.
  const [viewOpen, setViewOpen] = useState(false);
  const canShowView = !!(onViewStyleChange && onBackgroundChange && onShadowsEnabledChange && viewStyle && background && shadowsEnabled !== undefined && terrainDetail);
  // Jonas' Vorgabe 2026-08-12: "sobald sie verbunden ist, soll man über den
  // Button das Menü für Empfindlichkeit etc. darüber öffnen" - genau wie
  // "Ansicht" ein reines UI-"offen"-Flag, unabhaengig vom Verbindungsstatus
  // selbst. Faellt automatisch zu, sobald das Geraet getrennt wird (siehe
  // Effekt weiter unten), statt als leeres Panel offen zu bleiben.
  const [spaceMouseOpen, setSpaceMouseOpen] = useState(false);
  useEffect(() => {
    if (!spaceMouseConnected) setSpaceMouseOpen(false);
  }, [spaceMouseConnected]);

  // Jonas' Vorgabe 2026-08-12: die Werkzeug-Spalte weicht bei drohender
  // Kollision mit dem Home-Button nach oben aus, statt (wie zuvor
  // ausschliesslich per CSS) immer stur vertikal zentriert zu bleiben -
  // siehe useToolbarVerticalOffset.ts fuer die genaue Regel. columnRef sitzt
  // NUR an der Button-Spalte (deren Buttonanzahl entscheidet ueber die
  // Kollision), der berechnete Versatz wird aber auf BEIDE Saeulen
  // angewendet, damit Panels weiterhin optisch auf Hoehe ihres Buttons
  // bleiben (siehe Kommentar bei der Panel-Saeule weiter unten).
  const columnRef = useRef<HTMLDivElement>(null);
  const verticalTop = useToolbarVerticalOffset({ containerRef, columnRef, hasUndoRedo: !!(onUndo && onRedo) });
  const verticalStyle: React.CSSProperties | undefined = verticalTop !== undefined ? { top: verticalTop, transform: "none" } : undefined;

  return (
    <>
      {onUndo && onRedo && (
        <div data-tour="viewer-toolbar" className="absolute right-4 top-4 flex gap-1.5">
          <ToolButton onClick={onUndo} disabled={!canUndo} label="Rückgängig (Strg+Z)">
            <UndoIcon size={16} />
          </ToolButton>
          <ToolButton onClick={onRedo} disabled={!canRedo} label="Wiederholen (Strg+Y)">
            <RedoIcon size={16} />
          </ToolButton>
        </div>
      )}
      {/* Jonas' Vorgabe 2026-08-10: eigene, vertikale, mittig am rechten
          Viewer-Rand schwebende Werkzeugleiste - "Schnitt"/"Ansicht" mussten
          dafuer aus ihrer alten festen Position unten links weichen (dort
          sitzt jetzt das Fadenkreuz, siehe Scene.tsx/ProjectScene3D.tsx) und
          funktionieren jetzt "genauso wie Messen": eigener animierter
          Werkzeug-Button, Panel waechst direkt AUS dem Button (siehe
          ToolResultPanel.tsx), keine feste Position mehr. Gleiche
          Positionierungs-Konvention wie der bestehende Seitenleiste-
          einklappen-Button (WorkspacePage.tsx: "absolute left-2 top-1/2
          -translate-y-1/2"), auf die rechte Seite gespiegelt, right-4 statt
          right-2 (Jonas' Fehlerbericht: "mehr Randabstand, eher wie vor und
          zurück oder home"). */}
      {/* Jonas' Fehlerbericht 2026-08-11 ("kollidierende Seitenmenüs"):
          vorher hing JEDES Panel absolut an SEINEM EIGENEN Button (relative
          Slots nebeneinander im selben Stapel) - waren gleichzeitig zwei
          Panels offen (z.B. Schnitt UND Messen), ueberlappten sie sich
          optisch, weil jedes Panel unabhaengig auf der Hoehe seines eigenen
          Buttons zentriert wurde, aber Panels oft deutlich hoeher sind als
          der Button-Reihenabstand. Fix (mit Jonas abgestimmt): alle
          GLEICHZEITIG offenen Panels landen jetzt in EINER gemeinsamen
          flex-col-Saeule (echter Dokumentenfluss statt unabhaengiger
          Absolut-Positionierung), wodurch sie sich automatisch gegenseitig
          verdraengen/stapeln statt zu ueberlappen - kein Panel schliesst sich
          dabei automatisch, wie gewuenscht. Diese Saeule ist ein EIGENSTAENDIGES
          "top-1/2 -translate-y-1/2"-Element (Geschwister der Button-Saeule,
          NICHT ihr Kind) und zentriert sich dadurch selbst vertikal an der
          vollen Viewer-Hoehe, unabhaengig von der (viel kleineren) Button-
          Saeulenhoehe - waechst der Stapel (mehrere Panels offen), waechst er
          SYMMETRISCH nach oben UND unten vom Zentrum weg, statt einseitig nur
          nach unten zu laufen und dabei eher an den unteren Viewer-Rand zu
          stossen. max-h+overflow-y-auto bleibt zusaetzlich als Sicherheitsnetz
          fuer sehr niedrige Fensterhoehen mit allen drei Panels gleichzeitig
          offen - dann scrollt der Stapel intern statt unsichtbar ueber den
          Rand hinauszulaufen. Die Button-Saeule selbst bleibt davon komplett
          unberuehrt und dadurch weiterhin fix an ihrem Platz, egal wie
          viele/welche Panels gerade offen sind (Jonas' frueherer
          Fehlerbericht: "die Buttons sollen sich nicht wegbewegen, wenn ein
          Fenster oeffnet"). */}
      {/* Uebernimmt denselben Vertikal-Versatz wie die Button-Saeule (siehe
          verticalStyle oben) - sonst wuerde bei ausweichender Button-Saeule
          ein Panel optisch nicht mehr auf Hoehe seines Buttons erscheinen. */}
      {/* Jonas' Fehlerbericht 2026-08-12 (zweimal gemeldet - der erste Versuch,
          die Bildlaufleiste per CSS nur optisch zu verstecken
          (scrollbar-width:none + ::-webkit-scrollbar hidden), reichte NICHT:
          sie blitzte trotzdem kurz auf): overflow-y-auto als Sicherheitsnetz
          fuer sehr niedrige Fensterhoehen (siehe Kommentar oben) berechnet
          waehrend der Panel-Oeffnen/Schliessen-Animation die scrollbare
          Ueberlaufflaeche kurzzeitig anders als im Ruhezustand - welcher
          genaue Timing-Mechanismus dahintersteckt, liess sich ohne Browser
          in dieser Umgebung nicht abschliessend nachvollziehen, das rein
          kosmetische Verstecken traf ihn aber nicht zuverlaessig genug.
          Deshalb jetzt overflow-y-HIDDEN statt auto - dadurch KANN gar
          nie eine Bildlaufleiste entstehen (Browser rechnen bei "hidden"
          erst gar keine), unabhaengig vom Animations-Timing. Preis dafuer:
          das Sicherheitsnetz verliert seine Scroll-Faehigkeit - bei einem
          extrem niedrigen Fenster mit allen vier Panels gleichzeitig offen
          wird der ueberschuessige Teil jetzt abgeschnitten statt scrollbar
          zu sein. Dieser Edge-Case war ohnehin selten/theoretisch, waehrend
          die Bildlaufleiste bei JEDEM normalen Oeffnen/Schliessen sichtbar
          war - klar der bessere Kompromiss. */}
      <div
        className="absolute right-[3.75rem] top-1/2 z-20 flex max-h-[85%] w-64 -translate-y-1/2 flex-col gap-2 overflow-y-hidden"
        style={verticalStyle}
      >
        <SectionResultPanel active={section.sectionEnabled} section={section} disabledHint={sectionDisabledHint} />
        {canShowView && (
          <ViewResultPanel
            active={viewOpen}
            viewStyle={viewStyle!}
            background={background!}
            shadowsEnabled={shadowsEnabled!}
            terrainDetail={terrainDetail!}
            onViewStyleChange={onViewStyleChange!}
            onBackgroundChange={onBackgroundChange!}
            onShadowsEnabledChange={onShadowsEnabledChange!}
            onTerrainDetailChange={onTerrainDetailChange}
          />
        )}
        {onToggleMeasure && (
          <MeasureResultPanel
            active={!!measureActive}
            selected={measureSelected ?? []}
            unitPrefs={unitPrefs ?? DEFAULT_UNIT_PREFS}
            onChangeUnitPrefs={onChangeUnitPrefs ?? (() => {})}
          />
        )}
        {spaceMouseConnected && onSpaceMouseDisconnect && onSpaceMouseSensitivityChange && (
          <SpaceMouseSettingsPanel
            active={spaceMouseOpen}
            deviceName={spaceMouseDeviceName ?? null}
            sensitivity={spaceMouseSensitivity ?? 1}
            onSensitivityChange={onSpaceMouseSensitivityChange}
            onDisconnect={onSpaceMouseDisconnect}
          />
        )}
        {onToggleAlignment && alignmentPanelProps && <AlignmentResultPanel active={!!alignmentActive} {...alignmentPanelProps} />}
      </div>

      <div ref={columnRef} className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2" style={verticalStyle}>
        <ToolButton dataTour="section-view" onClick={() => section.setSectionEnabled((v) => !v)} label="Schnitt" active={section.sectionEnabled}>
          <SectionIcon size={16} />
        </ToolButton>

        {canShowView && (
          <ToolButton dataTour="view-style-panel" onClick={() => setViewOpen((v) => !v)} label="Ansicht" active={viewOpen}>
            <ViewIcon size={16} />
          </ToolButton>
        )}

        {onToggleMeasure && (
          <ToolButton dataTour="tool-measure" onClick={onToggleMeasure} label="Messen" active={measureActive}>
            <RulerIcon size={16} />
          </ToolButton>
        )}

        {onToggleAlignment && (
          <ToolButton dataTour="tour-ausrichten" onClick={onToggleAlignment} label="Ausrichten" active={alignmentActive}>
            <AlignIcon size={16} />
          </ToolButton>
        )}

        {spaceMouseSupported && (onSpaceMouseConnect || onSpaceMouseDisconnect) && (
          <ToolButton
            // Jonas' Vorgabe 2026-08-12: verbunden -> Klick oeffnet/schliesst
            // das Einstellungen-Panel (Empfindlichkeit etc., siehe
            // SpaceMouseSettingsPanel.tsx), nicht mehr sofort trennen -
            // Trennen ist dafuer als eigener Button IM Panel verfuegbar.
            // Noch nicht verbunden -> Klick verbindet weiterhin direkt.
            onClick={spaceMouseConnected ? () => setSpaceMouseOpen((v) => !v) : onSpaceMouseConnect!}
            label={spaceMouseConnected ? `SpaceMouse-Einstellungen (${spaceMouseDeviceName ?? "Gerät"})` : "SpaceMouse verbinden"}
            // Bleibt gefuellt/"aktiv" solange verbunden (Verbindungs-
            // Indikator, wie zuvor) - unabhaengig davon, ob das Panel gerade
            // offen ist, das steuert nur seine eigene ToolResultPanel-
            // Sichtbarkeit oben.
            active={spaceMouseConnected}
          >
            <SpaceMouseIcon size={16} />
          </ToolButton>
        )}
      </div>
      {/* Jonas' Vorgabe 2026-07-25: "oben rechts vom ViewCube ... fluchtend
          mit der rechten Außenkante des Würfels" - GizmoHelper platziert den
          Wuerfel mit margin=[80,80] (Zentrum 80px von rechts/unten), die
          Box selbst ist 60px breit -> rechte Kante liegt bei rechts ~35px
          von der Canvas-Kante, obere Kante bei unten ~110-125px (die
          Iso-Ansicht des Wuerfels ragt diagonal etwas darueber hinaus). */}
      <div className="absolute bottom-[150px] right-[34px]">
        <ToolButton onClick={onReset} label="Ansicht zurücksetzen">
          <HomeIcon size={16} />
        </ToolButton>
      </div>
      {/* Unsichtbarer Anker fuer die Tutorial-Tour (Jonas' Vorgabe 2026-07-25:
          "auch der ViewCube ... soll im Tutorial angezeigt werden") - der
          ViewCube selbst ist WebGL (drei's GizmoHelper), kein echtes
          DOM-Element mit eigenen Attributen, deshalb dieser positionsgleiche
          Platzhalter statt eines echten Tour-Ziels darauf. */}
      <div data-tour="viewcube-anchor" aria-hidden className="pointer-events-none absolute bottom-4 right-4 h-24 w-24" />
    </>
  );
}

function ToolButton({
  onClick,
  disabled,
  label,
  active,
  dataTour,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  // Gefuellter Zustand fuer Umschalt-Buttons (bisher gab's hier nur
  // Einmal-Aktionen) - Jonas' Vorgabe 2026-08-10, Messwerkzeug-Toggle.
  active?: boolean;
  // Tutorial-Anker (siehe tour/tourDefinitions.ts) - sitzt direkt auf dem
  // Button selbst, seit die Panels nicht mehr einzeln pro Button verpackt
  // sind (siehe "kollidierende Seitenmenüs"-Fix oben).
  dataTour?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatedButton
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      // h-9 w-9 (Jonas' Fehlerbericht 2026-08-10: "so gross wie alle
      // anderen Buttons ... Plus, Hochladen, Vor, Zurück, Home") - dieselbe
      // Groesse wie die Plus-/Hochladen-Buttons in WorkspacePage.tsx,
      // vorher hier h-8 w-8 (leicht kleiner).
      className={
        active
          ? "flex h-9 w-9 items-center justify-center rounded-full border border-brand bg-brand text-white shadow-sm"
          : "flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400"
      }
    >
      {children}
    </AnimatedButton>
  );
}
