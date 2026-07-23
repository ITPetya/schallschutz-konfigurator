import { useState } from "react";
import { ProjectScene3D } from "../components/ProjectScene3D";
import { AccordionSection } from "../components/AccordionSection";
import { AnimatedButton } from "../components/AnimatedButton";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import type { ProjectConfig } from "../config/projectTypes";

interface InternalProjectViewerProps {
  project: ProjectConfig;
  fileName?: string;
  // Oeffnet einen einzelnen Container aus der Baugruppe im schreibgeschuetzten
  // Detail-Viewer (Jonas' Vorgabe 2026-07-25: "man soll auch die einzelnen
  // Container aus den Baugruppen öffnen können") - siehe InternalPage.tsx.
  onOpenInstance: (instanceId: string) => void;
}

// Schreibgeschuetzter Baugruppen-Viewer fuer den Konstrukteur-Bereich (Jonas'
// Vorgabe 2026-07-25: "Baugruppen auch genauso gleichwertig wie einzelne
// Container laden können") - gleiche Struktur wie KonfiguratorPage.tsx
// (Sidebar links, 3D-Viewer rechts), aber mit der Baugruppen-Instanzliste
// statt Groesse/Farbe/Einbauten, und ohne Ziehen/Ausrichten/Ansicht-Editieren
// (ProjectScene3D bekommt hier bewusst nur No-Op-Handler fuer Drag/Undo).
export function InternalProjectViewer({ project, fileName, onOpenInstance }: InternalProjectViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {fileName && <p className="mb-3 truncate text-sm font-bold text-brand-dark">{fileName}</p>}
            <AccordionSection title="Grundeinstellungen" defaultOpen>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <dt className="text-slate-400">Projektname</dt>
                <dd>{project.name}</dd>
                <dt className="text-slate-400">Container</dt>
                <dd>{project.instances.length}</dd>
              </dl>
            </AccordionSection>
            <AccordionSection title="Container" defaultOpen>
              {project.instances.length === 0 ? (
                <p className="text-sm text-slate-400">Keine Container in diesem Projekt.</p>
              ) : (
                <div className="space-y-2">
                  {project.instances.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => setSelectedId(inst.id)}
                      className={`cursor-pointer rounded-lg border p-2 text-sm ${
                        selectedId === inst.id ? "border-brand bg-brand/5" : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="font-bold">{inst.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
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
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1">
          <ProjectScene3D
            instances={project.instances}
            selectedId={selectedId}
            draggingId={null}
            dragValid={true}
            onSelect={setSelectedId}
            onPointerDown={() => {}}
            onPointerMove={() => {}}
            onPointerUp={() => {}}
          />
        </main>
      </div>
    </div>
  );
}
