import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube, GizmoViewport } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import { ViewerToolbar } from "./ViewerToolbar";
import { ViewerLoadingOverlay } from "./ViewerLoadingOverlay";
import { ViewerStatusBar } from "./ViewerStatusBar";
import { MeasureMarkers } from "./MeasureMarkers";
import { WallFaceMarkers } from "./WallFaceMarkers";
import { SelectableFaceMarkers, type SelectableFace } from "./SelectableFaceMarkers";
import { SpaceMouseCameraRig } from "./SpaceMouseCameraRig";
import { useSectionPlane } from "./SectionAndViewPanel";
import { useUnitPreferences } from "../hooks/useUnitPreferences";
import { useViewPreferences } from "../hooks/useViewPreferences";
import { useViewerShortcuts } from "../hooks/useViewerShortcuts";
import { useSpaceMouse } from "../hooks/useSpaceMouse";
import { useSpaceMouseSensitivity } from "../hooks/useSpaceMouseSensitivity";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening, PanelId } from "../types/openings";
import type { PartitionWallConfig } from "../types/partitionWall";
import { computeMeasurePoints, type MeasurePoint } from "../utils/measurePoints";
import { computeWallFaces } from "../utils/wallFaces";
import { computeOpeningFaces } from "../utils/openingFaces";
import { computePartitionWallFocus } from "../utils/partitionWallFocus";
import { DEFAULT_FLOOR_THICKNESS } from "../constants/lcStandard";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { useTheme } from "../context/ThemeContext";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";

interface SceneProps {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  insideColor: string;
  outsideColor: string;
  insideUnpainted: boolean;
  // Jonas' Korrektur 2026-08-11 (spaeter am selben Tag): Bodendicke ist
  // wieder frei einstellbar (siehe Container.tsx/lcStandard.ts) - optional
  // mit Default DEFAULT_FLOOR_THICKNESS in Container.tsx, falls ein Aufrufer
  // das Prop (noch) nicht setzt.
  floorThickness?: number;
  // Hohl oder isoliert gefuellt - optional mit Default true in
  // Container.tsx, falls ein Aufrufer das Prop (noch) nicht setzt.
  floorInsulated?: boolean;
  // Optionale Trennwaende (Jonas' Vorgabe 2026-08-14), siehe
  // types/partitionWall.ts/PartitionWall.tsx/Container.tsx.
  partitionWalls?: PartitionWallConfig[];
  // Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für strg+z usw." -
  // optional, weil der schreibgeschuetzte Viewer (KonfiguratorPage.tsx)
  // nichts rueckgaengig machen kann.
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Jonas' Vorgabe 2026-08-13 ("Einbauten hinzufügen"-Assistent): Live-
  // Vorschau der gerade im Assistenten konfigurierten (noch nicht
  // committeten) Einbaute - wird NUR fuers Rendering in die an <Container>
  // gehende Liste gemischt, landet nie in `openings`/der Undo-Historie
  // selbst (die haelt WorkspacePage.tsx separat).
  draftOpening?: Opening | null;
  // Waehrend der Assistent offen ist: macht die 6 Waende im Viewer klickbar
  // (WallFaceMarkers.tsx, gleiches Muster wie "Ausrichten"), onPickPanel
  // meldet die angeklickte Wand nach oben. selectedPanel hebt die aktuell im
  // Assistenten gewaehlte Wand farblich hervor.
  wallPickActive?: boolean;
  selectedPanel?: PanelId | null;
  onPickPanel?: (panel: PanelId) => void;
  // Jonas' Vorgabe 2026-08-14: Live-Vorschau der gerade im Assistenten
  // angelegten (noch nicht committeten) Trennwand - gleiches Prinzip wie
  // draftOpening oben, nur fuers Trennwand-Rendering.
  draftPartitionWall?: PartitionWallConfig | null;
  // Gesetzt, solange eine Trennwand im Drill-in-Editor fokussiert ist -
  // steuert automatisch Kamera + Schnitt (siehe useEffect unten,
  // computePartitionWallFocus). null = normale Container-Ansicht, der vorher
  // aktive Schnitt-Zustand wird wiederhergestellt.
  focusPartitionWall?: PartitionWallConfig | null;
  // Jonas' Vorgabe 2026-08-17: bereits platzierte Einbauten/Trennwaende
  // sollen im 3D-Viewer anklickbar sein (Hervorhebung) und per Doppelklick
  // die passende Seitenleisten-Ansicht oeffnen - alle optional, weil der
  // schreibgeschuetzte Konstrukteur-Viewer (KonfiguratorPage.tsx) keine
  // Bearbeitung anbietet und diese Props deshalb weglaesst.
  selectedOpeningId?: string | null;
  // Nimmt auch null an (Jonas' Vorgabe 2026-08-17: Klick ins Leere/Escape
  // soll die Auswahl loeschen koennen) - onOpenOpening bekommt nie null,
  // Doppelklick waehlt immer eine konkrete Einbaute.
  onSelectOpening?: (id: string | null) => void;
  onOpenOpening?: (id: string) => void;
  selectedPartitionWallId?: string | null;
  onSelectPartitionWall?: (id: string | null) => void;
  onOpenPartitionWall?: (id: string) => void;
}

const MM_TO_M = 1 / 1000;

// Relative Richtungen statt Himmelsrichtungen (Jonas' Fehlerbericht
// 2026-07-23, siehe types/openings.ts) - Reihenfolge entspricht weiterhin
// GizmoViewcube's Erwartung (+X,-X,+Y,-Y,+Z,-Z): +X=Vorne (vorher Sueden),
// -X=Hinten (vorher Norden), +Z=Links (vorher Osten), -Z=Rechts (vorher
// Westen), Oben/Unten unveraendert.
const VIEWCUBE_FACES = ["Vorne", "Hinten", "Oben", "Unten", "Links", "Rechts"];

export function Scene({
  size,
  wallThickness,
  openings,
  insideColor,
  outsideColor,
  insideUnpainted,
  floorThickness,
  floorInsulated,
  partitionWalls = [],
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  draftOpening,
  wallPickActive,
  selectedPanel,
  onPickPanel,
  draftPartitionWall,
  focusPartitionWall,
  selectedOpeningId,
  onSelectOpening,
  onOpenOpening,
  selectedPartitionWallId,
  onSelectPartitionWall,
  onOpenPartitionWall,
}: SceneProps) {
  // Kamera/Grid/Schnittebene rechnen intern in Metern (Three.js-Konvention,
  // siehe Container.tsx) - size kommt in mm an (Jonas' Vorgabe 2026-07-22).
  const lengthM = size.length * MM_TO_M;
  const widthM = size.width * MM_TO_M;
  const heightM = size.height * MM_TO_M;
  const cameraDistance = Math.max(lengthM, widthM) * 1.6 + 4;
  // Halbe Grundriss-Diagonale (Meter) - Reichweite des Containers ab dem
  // Ursprung, siehe TerrainBackground.tsx's extentM.
  const containerExtentM = Math.hypot(lengthM, widthM) / 2;

  // Fuer den Home-Button (Jonas' Vorgabe 2026-07-25: "wie bei Inventor")
  // neben dem ViewCube - OrbitControls' eingebautes reset() faehrt Kamera
  // und target auf genau die Werte zurueck, die beim ERSTEN Rendern dieser
  // Controls galten (position0/target0, siehe three-stdlib), das passt
  // hier automatisch, weil Kamera/target unten unveraendert aus den Props
  // kommen und sich nur bei einer echten Groessenaenderung neu aufbauen.
  const controlsRef = useRef<OrbitControlsImpl>(null);
  // Jonas' Vorgabe 2026-08-12: die Werkzeug-Spalte (ViewerToolbar.tsx) muss
  // die tatsaechliche Hoehe dieses umschliessenden "relative"-Elements
  // kennen, um bei drohender Kollision mit dem Home-Button nach oben
  // auszuweichen (siehe hooks/useToolbarVerticalOffset.ts).
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Schnitt-Logik (Zustand + Ebenenberechnung) ausgelagert, damit
  // ProjectScene3D.tsx dieselbe Logik fuer den ausgewaehlten Baugruppen-
  // Container wiederverwenden kann, siehe SectionAndViewPanel.tsx.
  const section = useSectionPlane(size);
  const { theme } = useTheme();

  // Jonas' Vorgabe 2026-08-11: 3Dconnexion SpaceMouse als zusaetzliche,
  // immer verfuegbare Kamerasteuerung neben der Maus - siehe
  // hooks/useSpaceMouse.ts (Verbindung/WebHID) und SpaceMouseCameraRig.tsx
  // (Anwendung der Achsenwerte auf die Kamera, JEDEN Frame innerhalb des
  // Canvas unten).
  const spaceMouse = useSpaceMouse();
  const { sensitivity: spaceMouseSensitivity, setSensitivity: setSpaceMouseSensitivity } = useSpaceMouseSensitivity();

  // Jonas' Vorgabe 2026-08-14: Ansicht-Einstellungen sind keine
  // Container-Eigenschaft mehr, sondern reine Browser-Praeferenz - Scene
  // zieht sie sich selbst (genau wie unitPrefs unten), statt sie von aussen
  // als Props+Callbacks zu bekommen.
  const { prefs: viewPrefs, updatePrefs: updateViewPrefs } = useViewPreferences();
  const isTerrain = viewPrefs.background === "terrain";
  // Container.tsx meldet sich per onReady, sobald sein CSG-Aufbau (Waende +
  // Eckbeschlaege) WIRKLICH fertig ist - nicht nur "gemountet" (Container
  // gibt seine 14 Teile selbst stueckweise frei, siehe dort/
  // hooks/useChunkedReveal.ts). Solange das nicht der Fall ist, zeigt das
  // Milchglas-Overlay unten den gestuften Ladezustand.
  const [containerReady, setContainerReady] = useState(false);

  // Jonas' Vorgabe 2026-08-10 ("wie in Inventor Bauteile messen"): erster/
  // zweiter Klick auf einen Messpunkt liefert die Distanz - dritter Klick
  // startet mit diesem Punkt als neuem ersten Punkt neu (kein extra
  // "zuruecksetzen"-Klick noetig). Punkte selbst kommen aus
  // utils/measurePoints.ts (Container-Ecken + Durchbruch-/Tuer-Merkmale),
  // NICHT aus freiem Klicken auf die Mesh-Oberflaeche - siehe MeasureMarkers.tsx
  // fuer die Begruendung (CSG-Restflaechen liefern keine sauberen Kanten/
  // Kreise fuer generisches Snapping).
  const [measureActive, setMeasureActive] = useState(false);
  const [measureSelected, setMeasureSelected] = useState<MeasurePoint[]>([]);
  const resolvedFloorThickness = floorThickness ?? DEFAULT_FLOOR_THICKNESS;
  const measurePoints = useMemo(
    () => computeMeasurePoints(size, wallThickness, resolvedFloorThickness, openings),
    [size, wallThickness, resolvedFloorThickness, openings],
  );
  const { prefs: unitPrefs, setPrefs: setUnitPrefs } = useUnitPreferences();

  // Welt-Rechtecke fuer die Klick-/Hover-Markierungen bereits platzierter
  // Einbauten (Jonas' Vorgabe 2026-08-17) - siehe openingFaces.ts.
  const openingFaces = useMemo(
    () => computeOpeningFaces(openings, size, wallThickness, resolvedFloorThickness),
    [openings, size, wallThickness, resolvedFloorThickness],
  );
  // Eine Trennwand als GANZE Flaeche (Container-Breite x -Hoehe an ihrer
  // positionU) - anders als bei Einbauten braucht es dafuer keinen eigenen
  // Helfer (siehe partitionWallFocus.ts's Kommentar zur selben Herleitung:
  // Rotation [0, PI/2, 0] identisch zu Vorne/Hinten).
  const partitionWallFaces = useMemo<SelectableFace[]>(
    () =>
      partitionWalls.map((pw) => ({
        id: pw.id,
        position: [pw.positionU * MM_TO_M, (size.height * MM_TO_M) / 2, 0],
        rotation: [0, Math.PI / 2, 0],
        width: size.width * MM_TO_M,
        height: size.height * MM_TO_M,
      })),
    [partitionWalls, size],
  );

  function handleMeasurePick(p: MeasurePoint) {
    setMeasureSelected((prev) => (prev.length >= 2 ? [p] : prev.some((s) => s.id === p.id) ? prev : [...prev, p]));
  }

  function handleToggleMeasure() {
    setMeasureActive((v) => !v);
    setMeasureSelected([]);
  }

  // Jonas' Vorgabe 2026-08-17: Klick ins Leere ODER Escape soll die aktuell
  // aktive Auswahl loeschen lassen - "die Auswahl soll verfallen", ueberall
  // wo etwas auswaehlbar ist. Escape geht danach hierarchisch weiter: ist
  // NICHTS mehr ausgewaehlt, beendet ein zweiter Druck stattdessen das
  // aktive Werkzeug (Messen/Schnitt) - "wenn beim Schnitt etwas ausgewaehlt
  // ist, erst das Ausgewaehlte, beim zweiten Mal den Schnitt". Bewusst OHNE
  // die "Einbauten hinzufügen"/Trennwand-Assistenten (openingWizard/
  // partitionDraft/partitionOpeningWizard) - die haben ihr eigenes explizites
  // Schliessen-Kreuz und leben ausserhalb dieser Komponente in
  // WorkspacePage.tsx, nicht Teil von Jonas' Vorgabe.
  function clearSelection(): boolean {
    let cleared = false;
    if (selectedOpeningId) {
      onSelectOpening?.(null);
      cleared = true;
    }
    if (selectedPartitionWallId) {
      onSelectPartitionWall?.(null);
      cleared = true;
    }
    if (measureSelected.length > 0) {
      setMeasureSelected([]);
      cleared = true;
    }
    return cleared;
  }

  function handleEscape() {
    if (clearSelection()) return;
    if (measureActive) handleToggleMeasure();
    if (section.sectionEnabled) section.setSectionEnabled(false);
  }

  // Jonas' Vorgabe 2026-08-12: Mausrad-Taste doppelt klicken = wie der
  // Home-Button, "M" druecken = wie der Messen-Button, Escape hierarchisch
  // Auswahl/Werkzeug beenden (siehe useViewerShortcuts.ts).
  useViewerShortcuts({ containerRef: viewerContainerRef, controlsRef, onToggleMeasure: handleToggleMeasure, onEscape: handleEscape });

  // Jonas' Vorgabe 2026-08-14 (Trennwand-Drill-in): beim Fokussieren einer
  // Trennwand automatisch auf ihre C-Schienen-Seite blicken + einen Schnitt
  // bis kurz davor legen, weil sie normalerweise unsichtbar im geschlossenen
  // Container sitzt - siehe utils/partitionWallFocus.ts fuer die Herleitung.
  // Kamera-Positionierung ist bewusst ein einmaliges Setzen, keine Animation
  // (keine Vorgabe fuer eine Flug-Animation). Beim Verlassen (focus -> null)
  // wird NUR der vorherige Schnitt-Zustand wiederhergestellt, nicht die
  // Kamera - der Nutzer soll dort weiterschauen koennen, wo er zuletzt hin
  // orbitiert hat.
  const previousSectionRef = useRef<{ enabled: boolean; axis: typeof section.sectionAxis; offsetMm: number; direction: 1 | -1 } | null>(null);
  useEffect(() => {
    if (focusPartitionWall) {
      // NUR beim UEBERGANG unfokussiert -> fokussiert sichern - dieser Effekt
      // feuert bei JEDER Bearbeitung der Trennwand erneut (Position/Staerke/
      // Spiegeln aendern jeweils die Objektidentitaet von focusPartitionWall,
      // gewollt: die Kamera/der Schnitt sollen live mitziehen). Ein
      // unbedingtes Ueberschreiben hier wuerde bei jeder solchen Aenderung
      // faelschlich den BEREITS FOKUSSIERTEN Zustand als "vorherigen"
      // Zustand einfrieren und beim Zurueck-Button die falsche (nicht die
      // echte vor-dem-Fokussieren-)Ansicht wiederherstellen.
      if (!previousSectionRef.current) {
        previousSectionRef.current = {
          enabled: section.sectionEnabled,
          axis: section.sectionAxis,
          offsetMm: section.sectionOffsetMm,
          direction: section.cutDirection,
        };
      }
      const focus = computePartitionWallFocus(focusPartitionWall, size);
      section.handleAxisChange("x");
      section.setSectionOffsetMm(focus.sectionOffsetMm);
      section.setCutDirection(focus.cutDirection);
      section.setSectionEnabled(true);
      const controls = controlsRef.current;
      if (controls) {
        controls.object.position.set(...focus.cameraPosition);
        controls.target.set(...focus.target);
        controls.update();
      }
    } else if (previousSectionRef.current) {
      const prev = previousSectionRef.current;
      previousSectionRef.current = null;
      section.handleAxisChange(prev.axis);
      section.setSectionOffsetMm(prev.offsetMm);
      section.setCutDirection(prev.direction);
      section.setSectionEnabled(prev.enabled);
    }
    // section-Objekt aendert sich jedes Render (neues Objekt-Literal aus
    // useSectionPlane) - nur auf den tatsaechlichen Fokus-Wechsel reagieren,
    // sonst wuerde dieser Effekt bei jeder Schnitt-Reglerbewegung erneut
    // feuern und die eigene Aenderung ueberschreiben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPartitionWall, size]);

  return (
    // Jonas' Fehlerbericht 2026-08-11 ("Viewer als echtes Fenster"): ViewCube/
    // Fadenkreuz/Werkzeugleiste sassen naeher am unteren Rand als am
    // seitlichen, seit die Fussleiste (ViewerStatusBar) dazukam - Ursache war,
    // dass die Fussleiste bisher ALS OVERLAY (absolute inset-x-0 bottom-0)
    // UEBER dem Canvas lag, waehrend der Canvas selbst weiterhin die VOLLE
    // Hoehe (inklusive der von der Fussleiste optisch verdeckten 24px)
    // einnahm - GizmoHelper (ViewCube/Fadenkreuz) misst seine margin-Werte
    // gegen die ECHTEN Canvas-Pixelmasse, kannte die Fussleiste also gar
    // nicht. Fix: die Fussleiste bekommt jetzt ECHTEN Platz im Layout (flex-
    // Spalte, zweite Zeile) statt eines Overlays - der Canvas-Bereich
    // darueber ist dadurch ein flex-1-Kind mit tatsaechlich kleinerer Hoehe,
    // GizmoHelper/alle absolut positionierten Werkzeug-Elemente (ViewerToolbar)
    // liegen INNERHALB dieses kleineren Bereichs und richten sich dadurch
    // automatisch nach dem echten sichtbaren Viewer-Rahmen aus, nicht mehr
    // nach dem vollen Elternelement.
    <div className="flex h-full w-full flex-col">
      <div ref={viewerContainerRef} className="relative min-h-0 flex-1">
      <Canvas
        shadows={viewPrefs.shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
        // Jonas' Vorgabe 2026-08-17: Klick ins Leere loescht die Auswahl -
        // nur die Auswahl selbst, nicht ein aktives Werkzeug (das beendet
        // ausschliesslich Escape, siehe handleEscape oben).
        onPointerMissed={() => clearSelection()}
      >
        {!isTerrain && <color attach="background" args={[theme === "dark" ? "#1e293b" : "#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={viewPrefs.shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />
        <DisplaySettingsProvider value={{ viewStyle: viewPrefs.viewStyle, insideColor, outsideColor, insideUnpainted }}>
          <SectionPlaneProvider value={section.sectionPlane}>
            <Container
              size={size}
              wallThickness={wallThickness}
              openings={draftOpening ? [...openings, draftOpening] : openings}
              floorThickness={resolvedFloorThickness}
              floorInsulated={floorInsulated}
              partitionWalls={draftPartitionWall ? [...partitionWalls, draftPartitionWall] : partitionWalls}
              onReady={() => setContainerReady(true)}
            />
          </SectionPlaneProvider>
        </DisplaySettingsProvider>

        {measureActive && (
          <MeasureMarkers
            points={measurePoints}
            selected={measureSelected}
            onPick={handleMeasurePick}
            unit={unitPrefs.primary}
            sectionPlane={section.sectionPlane}
          />
        )}

        {wallPickActive && onPickPanel && (
          <WallFaceMarkers
            faces={computeWallFaces(size, wallThickness, resolvedFloorThickness)}
            selected={selectedPanel ?? null}
            onPick={onPickPanel}
            sectionPlane={section.sectionPlane}
          />
        )}

        {/* Jonas' Vorgabe 2026-08-17: Einbauten/Trennwaende nur ausserhalb
            der Anlegen-/Mess-Werkzeuge anklickbar - sonst Konflikt mit deren
            eigenen Klick-Overlays an derselben Stelle (gleiches Gating-
            Prinzip wie WallFaceMarkers/MeasureMarkers oben). */}
        {!wallPickActive && !measureActive && onSelectOpening && onOpenOpening && (
          <SelectableFaceMarkers
            faces={openingFaces}
            selectedId={selectedOpeningId ?? null}
            onSelect={onSelectOpening}
            onOpen={onOpenOpening}
            sectionPlane={section.sectionPlane}
          />
        )}
        {!wallPickActive && !measureActive && !focusPartitionWall && onSelectPartitionWall && onOpenPartitionWall && (
          <SelectableFaceMarkers
            faces={partitionWallFaces}
            selectedId={selectedPartitionWallId ?? null}
            onSelect={onSelectPartitionWall}
            onOpen={onOpenPartitionWall}
            sectionPlane={section.sectionPlane}
          />
        )}

        {/* HDRI-Umgebungsbilder (public/hdri/) - dem Dateinamen nach vermutlich
            von Poly Haven (dort CC0/gemeinfrei) bezogen, aber die genaue
            Bezugsquelle ist im Projekt bisher nicht dokumentiert/bestaetigt -
            vor Live-Schaltung als Unterseite pruefen/bestaetigen. */}
        {isTerrain ? (
          <>
            <TerrainBackground detail={viewPrefs.terrainDetail} extentM={containerExtentM} />
            <Environment files="/hdri/rooitou_park_1k.hdr" background={false} />
          </>
        ) : (
          <>
            {/* raycast={() => null} (Jonas' Vorgabe 2026-08-17): sonst wuerde
                JEDER Klick auf das Gitter als "getroffen" statt "verfehlt"
                zaehlen und Canvas' onPointerMissed (Klick ins Leere loescht
                die Auswahl) praktisch nie ausloesen. */}
            <Grid args={[40, 40]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={30} position={[0, 0, 0]} raycast={() => null} />
            <Environment files="/hdri/studio_small_03_1k.hdr" />
          </>
        )}

        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={2}
          maxDistance={40}
          target={[0, heightM / 2, 0]}
          // Mittlere Maustaste verschiebt die ANSICHT (Jonas' Vorgabe
          // 2026-07-25, am 2026-08-10 nochmal bestaetigt: "die Ansicht soll
          // verschoben werden mit der mittleren Maustaste, aber keine
          // Container/Objekte, nur die Ansicht") - ersetzt das three.js-
          // Standardverhalten (Dolly/Zoom auf der mittleren Taste), Zoom
          // bleibt ueber das Mausrad weiterhin moeglich. Rechte Taste bleibt
          // zusaetzlich Pan. Dass dabei NIE ein Container mitverschoben
          // wird, stellt nicht diese Zuordnung sicher, sondern das
          // e.button===0-Gate in ProjectScene3D.tsx's handlePointerEvent.
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        />
        {/* Rein additive Kamerasteuerung ueber die SpaceMouse, siehe
            SpaceMouseCameraRig.tsx - greift nur, wenn ein Geraet verbunden
            ist, faengt der Maus-Steuerung ueber OrbitControls nie ins
            Handwerk (kein "SpaceMouse-Modus", laeuft parallel). */}
        <SpaceMouseCameraRig axisRef={spaceMouse.axisRef} controlsRef={controlsRef} enabled={spaceMouse.connected} sensitivity={spaceMouseSensitivity} />
        {/* Inventor-artiger ViewCube (Jonas' Vorgabe 2026-07-22): hellgrau,
            halbtransparent, unten rechts im Viewer. */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewcube
            faces={VIEWCUBE_FACES}
            color="#e2e8f0"
            hoverColor="#008eb4"
            textColor="#075471"
            strokeColor="#94a3b8"
            opacity={0.75}
          />
        </GizmoHelper>
        {/* Jonas' Vorgabe 2026-08-10: Fadenkreuz unten links (Gegenstueck zum
            ViewCube unten rechts), zeigt die Richtungen X/Y/Z. Die
            ANGEZEIGTEN Beschriftungen weichen bewusst von drei's/three.js'
            tatsaechlicher Achsenbenennung ab (labels-Prop tauscht NUR den
            Text, nicht die echte Geometrie/Kamera-Logik): Jonas nennt die
            Welt-Y-Achse (echte Hoehe, siehe Container.tsx: H liegt auf
            Welt-Y) "Z", und die Welt-Z-Achse (Containerbreite) "Y" -
            "X ist von links nach rechts, Y ist die Tiefe, Z ist die Höhe".
            Jonas' Fehlerbericht 2026-08-10: "soll wie in Inventor sein...
            nur ein Infomaterial, wenn mans braucht" - disabled (keine
            Kamera-Interaktion, reine Anzeige) und hideNegativeAxes (nur 3
            statt 6 Arme) fuer den reduzierten Look, per group scale
            verkleinert (auf GizmoHelper selbst wirkt scale NICHT - das ist
            reines Prop-Durchreichen an eine feste HUD-Kamera, kein normaler
            Szenen-Node). KEIN hideAxisHeads mehr - Jonas' Fehlerbericht:
            "es steht kein X,Y,Z am Kreuz" - drei's GizmoViewport zeichnet
            die Buchstaben-Beschriftung NUR in dieselbe Sprite-Textur wie den
            "Kopf" jeder Achse (siehe node_modules/@react-three/drei/core/
            GizmoViewport.js: AxisHead), hideAxisHeads entfernt beides
            zusammen - es gibt keine Moeglichkeit, nur die Pfeilspitze ohne
            das Label zu verstecken.
            renderPriority={2} auf DIESEM zweiten GizmoHelper ist wichtig:
            drei's Hud-Komponente (beide GizmoHelper nutzen sie intern)
            raeumt bei renderPriority===1 den kompletten Canvas leer und
            zeichnet die Hauptszene neu, BEVOR sie ihren eigenen Inhalt
            zeichnet - zwei GizmoHelper mit demselben Default (1) haben sich
            deshalb gegenseitig ueberschrieben (der zweite hat den ViewCube
            des ersten mit weggeraeumt). Mit renderPriority={2} macht der
            zweite Hud nur noch autoClear=false + zeichnet obendrauf, ohne
            den ViewCube wieder zu loeschen. */}
        <GizmoHelper alignment="bottom-left" margin={[56, 56]} renderPriority={2}>
          <group scale={0.6}>
            <GizmoViewport
              labels={["X", "Z", "Y"]}
              axisColors={["#dc2626", "#16a34a", "#008eb4"]}
              labelColor="white"
              disabled
              hideNegativeAxes
            />
          </group>
        </GizmoHelper>
      </Canvas>

      <ViewerLoadingOverlay contentNotReady={!containerReady} />

      <ViewerToolbar
        containerRef={viewerContainerRef}
        onReset={() => {
          controlsRef.current?.reset();
        }}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        section={section}
        viewStyle={viewPrefs.viewStyle}
        background={viewPrefs.background}
        shadowsEnabled={viewPrefs.shadowsEnabled}
        terrainDetail={viewPrefs.terrainDetail}
        onViewStyleChange={(v) => updateViewPrefs({ viewStyle: v })}
        onBackgroundChange={(b) => updateViewPrefs({ background: b })}
        onShadowsEnabledChange={(v) => updateViewPrefs({ shadowsEnabled: v })}
        onTerrainDetailChange={(d) => updateViewPrefs({ terrainDetail: d })}
        measureActive={measureActive}
        onToggleMeasure={handleToggleMeasure}
        measureSelected={measureSelected}
        unitPrefs={unitPrefs}
        onChangeUnitPrefs={setUnitPrefs}
        spaceMouseSupported={spaceMouse.supported}
        spaceMouseConnected={spaceMouse.connected}
        spaceMouseDeviceName={spaceMouse.deviceName}
        onSpaceMouseConnect={spaceMouse.connect}
        onSpaceMouseDisconnect={spaceMouse.disconnect}
        spaceMouseSensitivity={spaceMouseSensitivity}
        onSpaceMouseSensitivityChange={setSpaceMouseSensitivity}
      />
      </div>

      {/* Echter Layout-Platz statt Overlay (siehe Begruendung oben) - dadurch
          zieht der Canvas-Bereich sich automatisch um diese Hoehe zusammen,
          statt dass die Fussleiste ihn nur optisch ueberdeckt. */}
      <ViewerStatusBar buildProgress={{ done: containerReady ? 1 : 0, total: 1 }} />
    </div>
  );
}
