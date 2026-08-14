import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube, GizmoViewport } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import type { ContainerInstance } from "../config/projectTypes";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { DisplaySettingsProvider, type ViewStyle } from "../context/DisplaySettingsContext";
import { useTheme } from "../context/ThemeContext";
import { ViewerToolbar } from "./ViewerToolbar";
import { ViewerLoadingOverlay } from "./ViewerLoadingOverlay";
import { ViewerStatusBar } from "./ViewerStatusBar";
import { MeasureMarkers } from "./MeasureMarkers";
import { AlignmentFaceMarkers } from "./AlignmentFaceMarkers";
import { SpaceMouseCameraRig } from "./SpaceMouseCameraRig";
import { useSectionPlane } from "./SectionAndViewPanel";
import { useUnitPreferences } from "../hooks/useUnitPreferences";
import { useViewPreferences } from "../hooks/useViewPreferences";
import { useViewerShortcuts } from "../hooks/useViewerShortcuts";
import { useSpaceMouse } from "../hooks/useSpaceMouse";
import { useSpaceMouseSensitivity } from "../hooks/useSpaceMouseSensitivity";
import { computeMeasurePoints, measurePointsToWorld, type MeasurePoint } from "../utils/measurePoints";
import { computeAlignmentFaces, type AlignmentFacePoint } from "../utils/alignmentDependencies";
import { isRectFullyCutAway } from "../utils/planeClipping";
import type { ContainerSize } from "../constants/containerSizes";
import { DEFAULT_FLOOR_THICKNESS, DEFAULT_SOUND_CLASS, defaultFloorInsulated } from "../constants/lcStandard";
import type { AlignmentDependency } from "../config/projectTypes";

const MM_TO_M = 1 / 1000;

// Fallback-Groesse fuer die Schnitt-Achsenbereiche, solange kein Container
// ausgewaehlt ist (useSectionPlane braucht immer eine gueltige Groesse, der
// Hook kann nicht bedingt aufgerufen werden) - wird nie sichtbar genutzt,
// weil das Schnitt-Panel dann ohnehin den disabledHint statt Reglern zeigt.
const FALLBACK_SIZE: ContainerSize = { length: 7000, width: 2990, height: 2990 };

// Gleicher ViewCube-Stil wie Scene.tsx (Einzelcontainer-Konfigurator) - siehe
// dort fuer die Herleitung der Bezeichnungen/Reihenfolge.
const VIEWCUBE_FACES = ["Vorne", "Hinten", "Oben", "Unten", "Links", "Rechts"];

// Stabile leere Referenz fuer measurePoints, solange das Messwerkzeug
// inaktiv ist (siehe dortiger Kommentar) - eine neue leere Array-Instanz bei
// jedem Render wuerde MeasureMarkers unnoetig neu rendern lassen, obwohl
// sich inhaltlich nichts geaendert hat.
const EMPTY_MEASURE_POINTS: MeasurePoint[] = [];
// Gleiches Prinzip fuer die Ausrichten-Flaechen (Jonas' Vorgabe 2026-08-12).
const EMPTY_ALIGNMENT_FACES: AlignmentFacePoint[] = [];

// Wandelt einen Kamera-Strahl (aus einem r3f-Pointer-Event) in die
// Schnittkoordinate mit der Bodenebene (Welt-Y=0) um - GENAUER als
// event.point (das nur die Position auf dem tatsaechlich getroffenen Mesh
// waere), funktioniert deshalb auch waehrend des Ziehens zuverlaessig, wenn
// der Cursor durch die Bewegung nicht mehr exakt ueber dem urspruenglichen
// Mesh steht (Pointer Capture haelt die Events am Mesh, der Strahl selbst
// bleibt aber immer korrekt).
function rayToGroundXZ(ray: THREE.Ray): { x: number; z: number } {
  const t = ray.direction.y !== 0 ? -ray.origin.y / ray.direction.y : 0;
  return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
}

export interface ProjectScene3DHandlers {
  onSelect: (id: string | null) => void;
  onPointerDown: (id: string, ground: { x: number; z: number }) => void;
  onPointerMove: (id: string, ground: { x: number; z: number }) => void;
  onPointerUp: (id: string) => void;
  // Jonas' Vorgabe 2026-08-10: Doppelklick auf einen Container in der
  // Baugruppen-Ansicht oeffnet ihn in der Detailbearbeitung (wie ein
  // Doppelklick auf ein Bauteil in einer Inventor-Baugruppe).
  onOpenDetail: (id: string) => void;
}

interface ProjectScene3DProps extends ProjectScene3DHandlers {
  instances: ContainerInstance[];
  selectedId: string | null;
  draggingId: string | null;
  dragValid: boolean;
  // Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für strg+z usw."
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Jonas' Vorgabe 2026-08-12: "Ausrichten" als eigenes Werkzeug (Flaechen im
  // Viewer anklicken statt Dropdowns) - erstellt eine dauerhafte Abhaengigkeit
  // in project.dependencies (WorkspacePage.tsx haelt/loest sie, siehe
  // alignmentDependencies.ts). Optional: fehlt im schreibgeschuetzten
  // Konstrukteur-Viewer (InternalProjectViewer.tsx), dort blendet sich der
  // Werkzeug-Button dann komplett aus.
  onCreateDependency?: (dep: Omit<AlignmentDependency, "id">) => void;
}

// 3D-Ansicht der Baugruppe (Jonas' Vorgabe 2026-07-25: "soll auch einen 3D
// Viewer haben nicht so komisch 2D") - ersetzt die bisherige SVG-Draufsicht.
// Jede Instanz bekommt ein unsichtbares/halbtransparentes Grundriss-Rechteck
// auf Bodenhoehe (Drag-Ziel + Kollisions-Faerbung, siehe InstanceGroup unten)
// UNTER dem echten 3D-Container (wiederverwendet die bestehende
// Container-Komponente unveraendert) - dadurch bleibt die Interaktion
// (Ziehen, Ausrichten, Kollision) exakt dieselbe wie vorher in der 2D-Ansicht
// (siehe collision.ts/computeMate-/computeFlushPosition in WorkspacePage.tsx),
// nur jetzt in echtem 3D sichtbar statt in einer Draufsicht.
export function ProjectScene3D({
  instances,
  selectedId,
  draggingId,
  dragValid,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onOpenDetail,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCreateDependency,
}: ProjectScene3DProps) {
  // Reichweite (Meter) der ganzen Baugruppe ab dem Ursprung - fuer die
  // Kameradistanz UND fuer TerrainBackground's extentM (Jonas' Vorgabe
  // 2026-07-25: "die Waldgrenzen sollen sich mit erweitern, wenn ... die
  // Baugruppe größer wird"), damit Baumring/Wiese immer mitwachsen, statt
  // bei einer ausgedehnten Baugruppe mitten im Gebaeude zu stehen.
  const maxReachM = useMemo(() => {
    if (instances.length === 0) return 6;
    let maxReach = 6;
    for (const inst of instances) {
      const reachMm = Math.hypot(inst.position.x, inst.position.z) + Math.hypot(inst.config.size.length, inst.config.size.width) / 2;
      maxReach = Math.max(maxReach, reachMm * MM_TO_M);
    }
    return maxReach;
  }, [instances]);
  const cameraDistance = instances.length === 0 ? 14 : maxReachM * 1.3 + 4;

  // Siehe Scene.tsx fuer die Begruendung (Home-Button + reset()).
  const controlsRef = useRef<OrbitControlsImpl>(null);
  // Siehe Scene.tsx: fuer useToolbarVerticalOffset.ts (Jonas' Vorgabe
  // 2026-08-12, Werkzeug-Spalte weicht dem Home-Button aus).
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Siehe Scene.tsx: 3Dconnexion SpaceMouse als zusaetzliche Kamerasteuerung
  // (Jonas' Vorgabe 2026-08-11) - hier ebenfalls fuer die Baugruppen-Ansicht,
  // steuert dieselbe geteilte Kamera/OrbitControls, greift nicht in
  // Container-Auswahl/-Ziehen ein (reine Kamera-Ergaenzung, siehe
  // SpaceMouseCameraRig.tsx).
  const spaceMouse = useSpaceMouse();
  const { sensitivity: spaceMouseSensitivity, setSensitivity: setSpaceMouseSensitivity } = useSpaceMouseSensitivity();

  // Jonas' Vorgabe 2026-08-14: Ansicht-Einstellungen sind keine Container-
  // Eigenschaft mehr, sondern reine Browser-Praeferenz, EIN geteilter Wert
  // fuer die ganze Szene (nicht mehr "auf alle Instanzen geschrieben", siehe
  // frueherer onSetAllViewStyle-Mechanismus - das war nur eine Notloesung,
  // solange viewStyle noch technisch pro Instanz gespeichert war). Genau wie
  // unitPrefs unten zieht sich ProjectScene3D das selbst, statt es von aussen
  // als Props+Callbacks zu bekommen.
  const { prefs: viewPrefs, updatePrefs: updateViewPrefs } = useViewPreferences();
  const isTerrain = viewPrefs.background === "terrain";
  const { theme } = useTheme();

  const selectedInstance = instances.find((i) => i.id === selectedId) ?? null;
  // "Schnitt" bezieht sich immer auf GENAU den ausgewaehlten Container (siehe
  // sectionDisabledHint unten, falls keiner ausgewaehlt ist) - der Hook
  // braucht trotzdem immer eine gueltige Groesse (Hooks duerfen nicht bedingt
  // aufgerufen werden), FALLBACK_SIZE wird dann aber nie sichtbar genutzt.
  const section = useSectionPlane(selectedInstance?.config.size ?? FALLBACK_SIZE);
  // Jonas' Fehlerbericht 2026-08-11 (Messwerkzeug/Schnittansicht): dieselbe
  // Transformation wie InstanceGroup's worldSectionPlane weiter unten (dort
  // lokal pro Instanz, hier einmal fuer die AUSGEWAEHLTE Instanz auf
  // Szenen-Ebene, weil MeasureMarkers unten Punkte MEHRERER Instanzen
  // gleichzeitig zeigt, nicht in eine einzelne InstanceGroup verschachtelt
  // ist) - noetig, damit die Messpunkt-Sichtbarkeit (siehe
  // MeasureMarkers.tsx) dieselbe Welt-Ebene wie die tatsaechliche CSG-
  // Beschneidung der Waende nutzt, statt der lokalen (Instanz-Ursprung)
  // Ebene aus section.sectionPlane.
  const measureSectionPlane = useMemo(() => {
    if (!section.sectionPlane || !selectedInstance) return null;
    const rotRad = (selectedInstance.rotationY * Math.PI) / 180;
    const xM = selectedInstance.position.x * MM_TO_M;
    const zM = selectedInstance.position.z * MM_TO_M;
    const matrix = new THREE.Matrix4().makeRotationY(rotRad);
    matrix.setPosition(xM, 0, zM);
    return section.sectionPlane.clone().applyMatrix4(matrix);
  }, [section.sectionPlane, selectedInstance]);
  // Jede Instanz gibt ihre eigenen 14 Teile (Waende + Eckbeschlaege) bereits
  // STUECKWEISE via useChunkedReveal frei (siehe Container.tsx) - dadurch
  // blockiert der Haupt-Thread nie so lange, dass ein Ladescreen dazwischen
  // nicht aktualisiert werden koennte. Hier wird nur noch getrackt, WELCHE
  // Instanzen ihr onReady bereits gemeldet haben, um das Milchglas-Overlay
  // anzuzeigen, bis WIRKLICH alle Container fertig sind (Jonas' Fehlerbericht
  // 2026-07-29, zweite Runde).
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const handleInstanceReady = useCallback((id: string) => {
    setReadyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);
  // Wenn sich die Instanzliste aendert (Container hinzugefuegt/entfernt),
  // muessen bereits verschwundene IDs aus dem Ready-Set fallen, sonst bleibt
  // eine neu hinzugefuegte Instanz faelschlich als "schon fertig" gezaehlt.
  useEffect(() => {
    const validIds = new Set(instances.map((i) => i.id));
    setReadyIds((prev) => {
      const filtered = new Set([...prev].filter((id) => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [instances]);
  const contentNotReady = instances.length > 0 && readyIds.size < instances.length;

  const [measureActive, setMeasureActive] = useState(false);
  const [measureSelected, setMeasureSelected] = useState<MeasurePoint[]>([]);
  // Jonas' Fehlerbericht 2026-08-10 ("Verschieben von Containern lagt sehr"),
  // wieder aufgegriffen 2026-08-11: dieser Cache haelt die pro Instanz
  // berechneten LOKALEN Messpunkte (computeMeasurePoints - der teure Teil:
  // schleift ueber alle Durchbrueche/Rundungen) fest, solange sich
  // instance.config (Groesse/Wandstaerke/Durchbrueche) NICHT geaendert hat.
  // Beim Ziehen eines Containers (handleInstancePointerMove in
  // WorkspacePage.tsx) aendert sich JEDEN Frame NUR instance.position (neues
  // Objekt per Spread, config bleibt exakt dieselbe Referenz) - ohne diesen
  // Cache wuerde measurePoints unten (Dependency [instances]) bei JEDER
  // Drag-Bewegung ALLE Instanzen komplett neu durchrechnen, obwohl sich fuer
  // keine einzige Instanz die eigentliche Geometrie (nur ihre Well-Position)
  // geaendert hat - genau die Art unnoetiger Pro-Frame-Arbeit, die Jonas'
  // Fehlerbericht zur Drag-Traegheit in der Baugruppen-Ansicht beschreibt.
  const localMeasurePointsCache = useRef(new Map<string, { config: ContainerInstance["config"]; points: MeasurePoint[] }>());
  // Jonas' Vorgabe 2026-08-10 ("wie in Inventor Bauteile messen, in der
  // Baugruppe Abstaende von Containern oder die Container-Aussenmasse") -
  // Messpunkte JEDER Instanz (Container-Ecken + Durchbruch-/Tuer-Merkmale,
  // siehe utils/measurePoints.ts) einzeln in ihrem eigenen lokalen Rahmen
  // berechnet, dann per measurePointsToWorld() um die Instanz-Position/
  // -Rotation in Welt-Koordinaten umgerechnet - so lassen sich auch Punkte
  // AUF VERSCHIEDENEN Containern gegeneinander messen (z. B. der Abstand
  // zwischen zwei Containern). Punkt-IDs mit der Instanz-ID prefixed, damit
  // sie zwischen Instanzen eindeutig bleiben.
  //
  // Jonas' Fehlerbericht 2026-08-11 (Performance): ausserdem komplett
  // uebersprungen, solange das Messwerkzeug gar nicht aktiv ist (!measureActive
  // -> stabile leere Liste) - vorher lief diese Berechnung fuer ALLE
  // Instanzen bei JEDER Aenderung von `instances`, also auch waehrend eines
  // Drags mit ausgeschaltetem Messwerkzeug, komplett umsonst.
  const measurePoints = useMemo(() => {
    if (!measureActive) return EMPTY_MEASURE_POINTS;
    const cache = localMeasurePointsCache.current;
    const liveIds = new Set(instances.map((i) => i.id));
    for (const id of cache.keys()) {
      if (!liveIds.has(id)) cache.delete(id);
    }
    return instances.flatMap((inst) => {
      const cached = cache.get(inst.id);
      let localPoints: MeasurePoint[];
      if (cached && cached.config === inst.config) {
        localPoints = cached.points;
      } else {
        localPoints = computeMeasurePoints(
          inst.config.size,
          inst.config.wallThickness,
          inst.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS,
          inst.config.openings,
        ).map((p) => ({ ...p, id: `${inst.id}:${p.id}` }));
        cache.set(inst.id, { config: inst.config, points: localPoints });
      }
      return measurePointsToWorld(localPoints, inst.position, inst.rotationY);
    });
  }, [instances, measureActive]);
  const { prefs: unitPrefs, setPrefs: setUnitPrefs } = useUnitPreferences();

  function handleMeasurePick(p: MeasurePoint) {
    setMeasureSelected((prev) => (prev.length >= 2 ? [p] : prev.some((s) => s.id === p.id) ? prev : [...prev, p]));
  }

  function handleToggleMeasure() {
    setMeasureActive((v) => !v);
    setMeasureSelected([]);
  }

  // Jonas' Vorgabe 2026-08-12: "Ausrichten" als eigenes Werkzeug - zwei
  // Flaechen anklicken (aehnlich wie Messen), dann Fluchtend/Passend +
  // Abstand waehlen. Selektions-/UI-Zustand bleibt LOKAL hier (wie bei
  // measureActive/measureSelected) - nur das FERTIGE Ergebnis
  // (onCreateDependency) geht an WorkspacePage.tsx, das project.dependencies
  // haelt.
  const [alignmentActive, setAlignmentActive] = useState(false);
  const [alignmentSelected, setAlignmentSelected] = useState<AlignmentFacePoint[]>([]);
  const [alignmentMode, setAlignmentMode] = useState<"mate" | "flush">("mate");
  const [alignmentDistanceMm, setAlignmentDistanceMm] = useState(500);
  const alignmentFaces = useMemo(() => (alignmentActive ? computeAlignmentFaces(instances) : EMPTY_ALIGNMENT_FACES), [instances, alignmentActive]);
  // Jonas' Fehlerbericht 2026-08-13: Ausrichten-Flaechen kannten bisher
  // keinen Schnitt - eine weggeschnittene Flaeche des ausgewaehlten
  // Containers blieb trotzdem anklickbar/markiert. "Schnitt" bezieht sich
  // immer nur auf den ausgewaehlten Container (siehe measureSectionPlane
  // oben, dieselbe bereits welt-transformierte Ebene), deshalb nur dessen
  // Flaechen gegen die Ebene pruefen - Flaechen anderer Instanzen sind nie
  // betroffen. isRectFullyCutAway prueft ALLE VIER Ecken statt nur des
  // Mittelpunkts (Jonas' Fehlerbericht 2026-08-13, zweite Runde) - eine
  // X-Flaeche z. B. bei einem R/L- oder O/U-Schnitt liegt sonst faelschlich
  // fast immer "weggeschnitten" da, obwohl nur ein Teil betroffen ist (siehe
  // planeClipping.ts fuer die ausfuehrliche Begruendung). rotationY hier
  // dieselbe Formel wie AlignmentFaceMarkers.tsx.
  const visibleAlignmentFaces = useMemo(() => {
    if (!measureSectionPlane || !selectedInstance) return alignmentFaces;
    return alignmentFaces.filter((f) => {
      if (f.instanceId !== selectedInstance.id) return true;
      const rotationY = f.axis === "x" ? Math.PI / 2 : 0;
      return !isRectFullyCutAway(f.position, [0, rotationY, 0], f.width, f.height, measureSectionPlane);
    });
  }, [alignmentFaces, measureSectionPlane, selectedInstance]);
  // Faellt eine bereits gewaehlte Flaeche durch einen DANACH gesetzten/
  // verschobenen Schnitt aus visibleAlignmentFaces heraus, aus der Auswahl
  // entfernen - sonst wuerde "Verknuepfen" mit einer nicht mehr sichtbaren
  // Flaeche arbeiten (gleiches Prinzip wie MeasureMarkers.tsx's usableIds/
  // showDimensions fuer verwaiste Messpunkt-Auswahlen).
  useEffect(() => {
    setAlignmentSelected((prev) =>
      prev.filter((f) => visibleAlignmentFaces.some((v) => v.instanceId === f.instanceId && v.axis === f.axis && v.sign === f.sign)),
    );
  }, [visibleAlignmentFaces]);

  function handleToggleAlignment() {
    setAlignmentActive((v) => !v);
    setAlignmentSelected([]);
  }

  // Erste Flaeche = "reference" (bleibt stehen), zweite = "target" (wird
  // ausgerichtet) - ein zweiter Klick wird ignoriert, wenn er auf demselben
  // Container liegt (kann sich nicht an sich selbst ausrichten) ODER eine
  // andere Achse hat (Fluchtend/Passend ergeben nur zwischen zwei Flaechen
  // MIT DERSELBEN Achse einen geometrischen Sinn - eine X-Flaeche gegen eine
  // Z-Flaeche waere nicht sinnvoll aufloesbar, siehe alignmentDependencies.ts's
  // resolveAlignmentDependencies). Ein Klick nach bereits zwei Auswahlen
  // beginnt eine neue Auswahl.
  function handleAlignmentPick(f: AlignmentFacePoint) {
    setAlignmentSelected((prev) => {
      if (prev.length === 0) return [f];
      if (prev.length === 1) return prev[0].instanceId === f.instanceId || prev[0].axis !== f.axis ? prev : [prev[0], f];
      return [f];
    });
  }

  function handleClearAlignmentSelection() {
    setAlignmentSelected([]);
  }

  function handleCreateAlignment() {
    const [reference, target] = alignmentSelected;
    if (!reference || !target || !onCreateDependency) return;
    onCreateDependency({
      target: { instanceId: target.instanceId, axis: target.axis, sign: target.sign },
      reference: { instanceId: reference.instanceId, axis: reference.axis, sign: reference.sign },
      mode: alignmentMode,
      distanceMm: alignmentDistanceMm,
    });
    setAlignmentSelected([]);
  }

  // Siehe Scene.tsx: Mausrad-Taste doppelt klicken = wie der Home-Button,
  // "M" druecken = wie der Messen-Button (Jonas' Vorgabe 2026-08-12, siehe
  // useViewerShortcuts.ts).
  useViewerShortcuts({
    containerRef: viewerContainerRef,
    controlsRef,
    onToggleMeasure: handleToggleMeasure,
    onToggleAlignment: onCreateDependency ? handleToggleAlignment : undefined,
  });

  // Jonas' Fehlerbericht 2026-08-10 ("Verschieben/Auswaehlen von Containern
  // lagt sehr"): EINE stabile (useCallback) Funktion statt vormals einer neu
  // erzeugten Closure PRO Instanz PRO Render (`(e) => handlePointerEvent(inst.id, e, ...)`
  // in der .map() unten) - nur so kann InstanceGroup unten sinnvoll per
  // React.memo verglichen werden, sonst haette jede Instanz bei JEDEM Render
  // (auch fuer Aenderungen an ANDEREN Instanzen) eine "neue" Prop-Referenz
  // bekommen und waere zwangslaeufig neu gerendert worden.
  const handlePointerEvent = useCallback(
    (id: string, e: ThreeEvent<PointerEvent>, action: "down" | "move" | "up") => {
      // Jonas' Vorgabe 2026-08-10: nur die LINKE Maustaste darf einen
      // Container auswaehlen/verschieben - mittlere/rechte Taste sind fuer
      // die Kamera reserviert (Pan, siehe OrbitControls' mouseButtons
      // unten) und sollen beim Draufdruecken auf einen Container weder
      // etwas auswaehlen noch ihn verschieben. Ohne dieses Gate wuerde
      // JEDER Tastendruck (auch Mitte/Rechts) hier landen und gleichzeitig
      // (a) den Container auswaehlen/zu verschieben beginnen UND (b)
      // OrbitControls' natives Pan ausloesen, da e.stopPropagation() nur
      // die r3f/three.js-Raycasting-Ausbreitung stoppt, nicht den nativen
      // DOM-Listener von OrbitControls (siehe Kommentar dort) - fuehrte zu
      // gleichzeitigem Kamera-Pan + Container-Drag.
      if (action === "down" && e.button !== 0) return;
      e.stopPropagation();
      if (action === "down") {
        (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
        onSelect(id);
        onPointerDown(id, rayToGroundXZ(e.ray));
      } else if (action === "move") {
        onPointerMove(id, rayToGroundXZ(e.ray));
      } else {
        onPointerUp(id);
      }
    },
    [onSelect, onPointerDown, onPointerMove, onPointerUp],
  );

  return (
    // Siehe Scene.tsx fuer die ausfuehrliche Begruendung: die Fussleiste
    // (ViewerStatusBar) bekommt hier ebenfalls echten Layout-Platz (flex-col,
    // zweite Zeile) statt eines Overlays, damit ViewCube/Fadenkreuz/
    // Werkzeugleiste (alle im flex-1-Canvas-Bereich darueber) sich am echten
    // sichtbaren Viewer-Rahmen ausrichten statt an der vollen Elementhoehe
    // inklusive der von der Fussleiste verdeckten Flaeche.
    <div className="flex h-full w-full flex-col">
      <div ref={viewerContainerRef} className="relative min-h-0 flex-1">
      <Canvas
        shadows={viewPrefs.shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
        onPointerMissed={() => onSelect(null)}
      >
        {!isTerrain && <color attach="background" args={[theme === "dark" ? "#1e293b" : "#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={viewPrefs.shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />

        {instances.map((inst) => (
          <InstanceGroup
            key={inst.id}
            instance={inst}
            selected={selectedId === inst.id}
            dragging={draggingId === inst.id}
            // Zu EINEM Bool zusammengefasst statt dragValid roh
            // durchzureichen: fuer alle NICHT gezogenen Instanzen bleibt
            // dragInvalid dadurch dauerhaft "false" (stabiler Primitive-
            // Wert), auch waehrend dragValid sich beim Ziehen laufend
            // aendert - sonst haette JEDE Instanz bei JEDER
            // Kollisionspruefung neu gerendert, nicht nur die gezogene.
            dragInvalid={draggingId === inst.id && !dragValid}
            sectionPlane={inst.id === selectedId ? section.sectionPlane : null}
            viewStyle={viewPrefs.viewStyle}
            onPointerEvent={handlePointerEvent}
            onInstanceReady={handleInstanceReady}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {measureActive && (
          <MeasureMarkers
            points={measurePoints}
            selected={measureSelected}
            onPick={handleMeasurePick}
            unit={unitPrefs.primary}
            sectionPlane={measureSectionPlane}
          />
        )}

        {alignmentActive && (
          <AlignmentFaceMarkers
            faces={visibleAlignmentFaces}
            selected={alignmentSelected}
            onPick={handleAlignmentPick}
            sectionPlane={measureSectionPlane}
            sectionInstanceId={selectedInstance?.id ?? null}
          />
        )}

        {/* Siehe Scene.tsx fuer den Kommentar zur (unbestaetigten) Poly-Haven-
            Herkunft dieser HDRI-Dateien. */}
        {isTerrain ? (
          <>
            <TerrainBackground detail={viewPrefs.terrainDetail} extentM={maxReachM} />
            <Environment files="/hdri/rooitou_park_1k.hdr" background={false} />
          </>
        ) : (
          <>
            <Grid args={[60, 60]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={50} position={[0, 0, 0]} />
            <Environment files="/hdri/studio_small_03_1k.hdr" />
          </>
        )}

        {/* Waehrend ein Container per Pointer-Drag verschoben wird, MUSS
            OrbitControls deaktiviert sein: e.stopPropagation() im r3f-
            Pointer-Event stoppt nur die Ausbreitung im r3f/three.js-
            Raycasting-System, nicht aber den nativen DOM-Pointer-Listener,
            den drei's OrbitControls direkt am Canvas-Element registriert -
            ohne dieses Flag rotiert die Kamera waehrend jedes Drags
            gleichzeitig mit (fuehrte zu einer stark verzerrten
            Streifschuss-Ansicht, sichtbar in Playwright-Screenshots waehrend
            des Ziehens). */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!draggingId}
          minDistance={2}
          maxDistance={80}
          target={[0, 1.2, 0]}
          // Siehe Scene.tsx: mittlere Maustaste verschiebt die Ansicht. Dass
          // dabei nie ein Container mitverschoben wird, regelt das
          // e.button===0-Gate in handlePointerEvent oben, nicht diese Zeile.
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        />
        {/* Siehe Scene.tsx - rein additive Kamerasteuerung, kein Einfluss auf
            Container-Auswahl/-Ziehen (das laeuft ueber handlePointerEvent
            oben, komplett unabhaengig). Waehrend draggingId gesetzt ist,
            sind OrbitControls bereits deaktiviert (enabled={!draggingId}
            oben) - die SpaceMouse bleibt dabei bewusst weiter aktiv, sie
            bewegt nur die Kamera, nie einen Container. */}
        <SpaceMouseCameraRig axisRef={spaceMouse.axisRef} controlsRef={controlsRef} enabled={spaceMouse.connected} sensitivity={spaceMouseSensitivity} />
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
        {/* Siehe Scene.tsx fuer die Herleitung der vertauschten Y/Z-
            Beschriftung, den "nur Infomaterial"-Look, das fehlende
            hideAxisHeads (loescht sonst auch die Beschriftung, siehe dort)
            und renderPriority={2} (verhindert, dass dieser zweite
            GizmoHelper den ViewCube des ersten beim Zeichnen mit weg-
            raeumt - Jonas' Fehlerbericht 2026-08-10: "der ViewCube ist
            weg"). */}
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

      <ViewerLoadingOverlay contentNotReady={contentNotReady} />

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
        sectionDisabledHint={selectedId ? undefined : "Container auswählen, um einen Schnitt zu setzen."}
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
        onToggleAlignment={onCreateDependency && handleToggleAlignment}
        alignmentActive={alignmentActive}
        alignmentPanelProps={{
          selected: alignmentSelected,
          labelFor: (id: string) => instances.find((i) => i.id === id)?.label ?? "?",
          mode: alignmentMode,
          onModeChange: setAlignmentMode,
          distanceMm: alignmentDistanceMm,
          onDistanceChange: setAlignmentDistanceMm,
          onCreate: handleCreateAlignment,
          onClearSelection: handleClearAlignmentSelection,
        }}
      />
      </div>

      {/* Echter Layout-Platz statt Overlay - siehe Begruendung oben. */}
      <ViewerStatusBar buildProgress={{ done: readyIds.size, total: instances.length }} containerCount={instances.length} />
    </div>
  );
}

interface InstanceGroupProps {
  instance: ContainerInstance;
  selected: boolean;
  dragging: boolean;
  // Siehe Aufrufstelle unten (ProjectScene3D) - schon zu dragging&&!dragValid
  // zusammengefasst uebergeben, damit nicht gezogene Instanzen einen
  // stabilen (immer "false") Wert bekommen statt bei jeder
  // Kollisionspruefung neu zu rendern.
  dragInvalid: boolean;
  // In der LOKALEN Achse der Instanz berechnet (wie in Scene.tsx, wo der
  // Container immer im Weltursprung steht) - three.js' clippingPlanes sind
  // aber IMMER Welt-Koordinaten, unabhaengig vom Mesh/Group-Transform.
  // Deshalb unten mit der eigenen Position/Rotation in eine Welt-Ebene
  // umgerechnet, bevor sie ans Material weitergereicht wird - sonst wuerde
  // ein Schnitt an einem verschobenen/gedrehten Container an der falschen
  // Stelle (relativ zum echten Weltursprung) auftauchen.
  sectionPlane: THREE.Plane | null;
  // Jonas' Vorgabe 2026-08-14: kommt jetzt aus der geteilten Ansicht-
  // Praeferenz (useViewPreferences in ProjectScene3D), nicht mehr aus
  // instance.config.viewStyle - als Prop durchgereicht statt hier selbst
  // erneut den Hook aufzurufen, sonst wuerde eine Aenderung im Eltern-Hook
  // NICHT reaktiv bei dieser (memoized) Instanz ankommen (jeder Hook-Aufruf
  // haelt seinen eigenen, unabhaengigen useState).
  viewStyle: ViewStyle;
  // EINE stabile Funktion statt separater onPointerDown/Move/Up (siehe
  // Aufrufstelle) - noetig, damit React.memo unten ueberhaupt greifen kann.
  onPointerEvent: (id: string, e: ThreeEvent<PointerEvent>, action: "down" | "move" | "up") => void;
  // Wird aufgerufen, sobald der Container DIESER Instanz alle 14 Bauteile
  // fertig freigegeben hat - siehe Container.tsx's onReady.
  onInstanceReady: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

// Rand, um den das Grundriss-Rechteck ueber die tatsaechliche
// Container-Grundflaeche hinaussteht (Meter). Ohne diesen Rand liegt die
// Flaeche exakt unter dem opaken Container und ist aus JEDER normalen
// (erhoehten/isometrischen) Kamera-Perspektive komplett unsichtbar - das
// Kollisions-Rot war dadurch beim Ziehen nie zu sehen (bestaetigt per
// Playwright-Screenshot waehrend einer echten Kollision: kein Rot
// erkennbar). Mit Rand ragt ein farbiger Streifen rundum unter dem
// Container hervor und bleibt so aus jedem Blickwinkel sichtbar.
const FOOTPRINT_MARGIN_M = 0.6;

// Jonas' Fehlerbericht 2026-08-10 ("Auswaehlen/Verschieben von Containern
// lagt sehr"): React.memo, damit das Aendern EINER Instanz (Auswahl/Drag/
// Ready-Status) nicht mehr automatisch ALLE anderen Instanzen der Baugruppe
// neu rendert - greift nur, weil ALLE Props unten jetzt referenzstabil sind,
// solange sich fuer DIESE Instanz nichts aendert (siehe onPointerEvent/
// onInstanceReady/dragInvalid-Kommentare an der Aufrufstelle).
const InstanceGroup = memo(function InstanceGroup({
  instance,
  selected,
  dragging,
  dragInvalid,
  sectionPlane,
  viewStyle,
  onPointerEvent,
  onInstanceReady,
  onOpenDetail,
}: InstanceGroupProps) {
  const lengthM = instance.config.size.length * MM_TO_M;
  const widthM = instance.config.size.width * MM_TO_M;
  const xM = instance.position.x * MM_TO_M;
  const zM = instance.position.z * MM_TO_M;
  const rotRad = (instance.rotationY * Math.PI) / 180;

  const footprintColor = dragInvalid ? "#dc2626" : selected ? "#0284c7" : "#94a3b8";
  const footprintOpacity = dragInvalid ? 0.6 : dragging || selected ? 0.4 : 0.12;

  const worldSectionPlane = useMemo(() => {
    if (!sectionPlane) return null;
    const matrix = new THREE.Matrix4().makeRotationY(rotRad);
    matrix.setPosition(xM, 0, zM);
    return sectionPlane.clone().applyMatrix4(matrix);
  }, [sectionPlane, rotRad, xM, zM]);

  return (
    <group position={[xM, 0, zM]} rotation={[0, rotRad, 0]}>
      {/* Grundriss-Rechteck auf Bodenhoehe - der eigentliche Drag-/Auswahl-
          Hit-Bereich (groesser, verlaesslicher Treffer als der Container
          selbst) und Kollisions-Farbfeedback. Ragt bewusst ueber die
          Container-Grundflaeche hinaus (siehe FOOTPRINT_MARGIN_M). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={(e) => onPointerEvent(instance.id, e, "down")}
        onPointerMove={(e) => onPointerEvent(instance.id, e, "move")}
        onPointerUp={(e) => onPointerEvent(instance.id, e, "up")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenDetail(instance.id);
        }}
      >
        <planeGeometry args={[lengthM + FOOTPRINT_MARGIN_M, widthM + FOOTPRINT_MARGIN_M]} />
        <meshBasicMaterial color={footprintColor} transparent opacity={footprintOpacity} depthWrite={false} />
      </mesh>

      <DisplaySettingsProvider
        value={{
          viewStyle,
          insideColor: instance.config.insideColor,
          outsideColor: instance.config.outsideColor,
          insideUnpainted: instance.config.insideUnpainted ?? false,
        }}
      >
        <SectionPlaneProvider value={worldSectionPlane}>
          <Container
            size={instance.config.size}
            wallThickness={instance.config.wallThickness}
            openings={instance.config.openings}
            floorThickness={instance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS}
            floorInsulated={instance.config.floorInsulated ?? defaultFloorInsulated(instance.config.soundClass ?? DEFAULT_SOUND_CLASS)}
            partitionWalls={instance.config.partitionWalls ?? []}
            onReady={() => onInstanceReady(instance.id)}
          />
        </SectionPlaneProvider>
      </DisplaySettingsProvider>
    </group>
  );
});
