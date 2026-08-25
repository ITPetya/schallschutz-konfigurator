import { useRef, useState } from "react";
import type * as THREE from "three";
import { ProjectScene3D } from "../components/ProjectScene3D";
import { AccordionSection } from "../components/AccordionSection";
import { KundenverlaufSection } from "../components/KundenverlaufSection";
import { AnimatedButton } from "../components/AnimatedButton";
import { ViewerSidebarLayout } from "../components/ViewerSidebarLayout";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { DownloadDialog, type DownloadFormatOption } from "../components/DownloadDialog";
import type { ProjectConfig } from "../config/projectTypes";
import type { KundenverlaufEintrag } from "../config/kundenverlauf";
import { sanitizeFileName, downloadBlob } from "../config/configFileCodec";
import { encodeProject, PROJECT_FILE_EXTENSION } from "../config/projectFileCodec";

interface InternalProjectViewerProps {
  project: ProjectConfig;
  fileName?: string;
  // Oeffnet einen einzelnen Container aus der Baugruppe im schreibgeschuetzten
  // Detail-Viewer (Jonas' Vorgabe 2026-07-25: "man soll auch die einzelnen
  // Container aus den Baugruppen öffnen können") - siehe InternalPage.tsx.
  onOpenInstance: (instanceId: string) => void;
  // Siehe KonfiguratorPage.tsx's gleichnamiges Prop - nur InternalPage.tsx
  // setzt es (mit project.kundenverlauf), ProjectViewerPage.tsx
  // (oeffentliches /ansehen) laesst es weg.
  kundenverlauf?: KundenverlaufEintrag[];
  // Jonas' Vorgabe 2026-08-25: Modell-Export (GLB, spaeter 3D-PDF/STEP) nur
  // im internen Bereich anbieten, NICHT auf der oeffentlichen /ansehen-Seite -
  // siehe KonfiguratorPage.tsx fuer dasselbe Prop/Muster.
  showExport?: boolean;
}

// Schreibgeschuetzter Baugruppen-Viewer fuer den Konstrukteur-Bereich (Jonas'
// Vorgabe 2026-07-25: "Baugruppen auch genauso gleichwertig wie einzelne
// Container laden können") - gleiche Struktur wie KonfiguratorPage.tsx
// (Sidebar links, 3D-Viewer rechts), aber mit der Baugruppen-Instanzliste
// statt Groesse/Farbe/Einbauten, und ohne Ziehen/Ausrichten/Ansicht-Editieren
// (ProjectScene3D bekommt hier bewusst nur No-Op-Handler fuer Drag/Undo).
export function InternalProjectViewer({ project, fileName, onOpenInstance, kundenverlauf, showExport }: InternalProjectViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Jonas' Vorgabe 2026-08-25 (Download nur im internen Bereich): siehe
  // KonfiguratorPage.tsx fuer dieselbe Begruendung - hier exportiert die
  // GANZE Baugruppe statt eines einzelnen Containers.
  const exportGroupRef = useRef<THREE.Group>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const safeName = sanitizeFileName(fileName ?? project.name);
  // .sszprojekt gehoert nur zur Baugruppe (siehe .sszkonfig-Gegenstueck in
  // KonfiguratorPage.tsx) - die generellen 3D-Formate gelten fuer beide.
  const downloadFormats: DownloadFormatOption[] = [
    {
      id: "sszprojekt",
      label: "Als Projektdatei (.sszprojekt)",
      info: "Eigenes Dateiformat dieser Anwendung - zum späteren Wiederladen und Weiterbearbeiten im Konfigurator, nicht in anderer Software.",
      onDownload: async () => {
        const blob = await encodeProject(project);
        downloadBlob(blob, `${safeName}${PROJECT_FILE_EXTENSION}`);
      },
    },
    {
      id: "glb",
      label: "Als 3D-Modell (.glb)",
      info: "Reine 3D-Ansicht außerhalb der Webseite - öffnet unter Windows z. B. direkt mit der eingebauten App „3D-Viewer”, kein Zusatzprogramm nötig. Nicht zur Weiterbearbeitung in CAD-Software gedacht.",
      onDownload: async () => {
        if (!exportGroupRef.current) return;
        // Dynamischer Import - siehe KonfiguratorPage.tsx fuer die
        // ausfuehrliche Begruendung (dieselbe Datei wird auch vom
        // oeffentlichen /ansehen genutzt).
        const { exportGroupAsGlb } = await import("../utils/exportGlb");
        const blob = await exportGroupAsGlb(exportGroupRef.current);
        downloadBlob(blob, `${safeName}.glb`);
      },
    },
  ];

  return (
    <div className="flex h-full flex-col bg-white text-ink dark:bg-slate-900 dark:text-slate-100">
      <ViewerSidebarLayout
        sidebar={
          <>
            {fileName && <p className="mb-3 truncate text-sm font-bold text-brand-dark">{fileName}</p>}
            <AccordionSection title="Grundeinstellungen" defaultOpen>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <dt className="text-slate-400 dark:text-slate-500">Projektname</dt>
                <dd>{project.name}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Container</dt>
                <dd>{project.instances.length}</dd>
              </dl>
            </AccordionSection>
            <AccordionSection title="Container">
              {project.instances.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Container in diesem Projekt.</p>
              ) : (
                <div className="space-y-2">
                  {project.instances.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => setSelectedId(inst.id)}
                      // Jonas' Vorgabe 2026-08-11: Doppelklick oeffnet auch
                      // hier direkt die Detailansicht, additiv zum
                      // Einzelklick (waehlt nur aus) - gleiches Muster wie in
                      // WorkspacePage.tsx's Container-Liste und im 3D-Viewport
                      // (ProjectScene3D.tsx).
                      onDoubleClick={() => onOpenInstance(inst.id)}
                      className={`cursor-pointer rounded-lg border p-2 text-sm ${
                        selectedId === inst.id
                          ? "border-brand bg-brand/5"
                          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <p className="font-bold">{inst.label}</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {inst.config.size.length} × {inst.config.size.width} × {inst.config.size.height} mm · {inst.rotationY}°
                      </p>
                      <AnimatedButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInstance(inst.id);
                        }}
                        className="mt-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                      >
                        Details ansehen
                        <ArrowRightIcon size={13} />
                      </AnimatedButton>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>
            {kundenverlauf && <KundenverlaufSection entries={kundenverlauf} />}
            {showExport && (
              <div className="mt-6 space-y-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Herunterladen</p>
                <AnimatedButton
                  type="button"
                  onClick={() => setDownloadOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <DownloadIcon size={16} />
                  Herunterladen
                </AnimatedButton>
              </div>
            )}
          </>
        }
      >
        <ProjectScene3D
          instances={project.instances}
          selectedId={selectedId}
          draggingId={null}
          dragValid={true}
          onSelect={setSelectedId}
          onPointerDown={() => {}}
          onPointerMove={() => {}}
          onPointerUp={() => {}}
          onOpenDetail={onOpenInstance}
          exportGroupRef={exportGroupRef}
        />
      </ViewerSidebarLayout>
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} formats={downloadFormats} />
    </div>
  );
}
