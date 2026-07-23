import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ContainerInstance, ProjectConfig } from "../config/projectTypes";
import { loadProjectDraft, saveProjectDraft } from "../config/projectDraftStore";
import { PROJECT_FILE_EXTENSION, decodeProject, encodeProject } from "../config/projectFileCodec";
import { downloadBlob, sanitizeFileName } from "../config/configFileCodec";
import { rectsOverlap, type OrientedRect } from "../utils/collision";
import { defaultConfig } from "../config/defaultContainerConfig";
import { PlusIcon } from "../components/icons/PlusIcon";
import { TrashIcon } from "../components/icons/TrashIcon";
import { RotateCcwIcon } from "../components/icons/RotateCcwIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";

// Mindestabstand zwischen zwei Container-Grundrissen (siehe docs/baugruppen-
// architektur.md - "reale Container brauchen Zugangsraum, nicht nur
// Kante-an-Kante"). Millimeter, wie ueberall im Datenmodell.
const CLEARANCE_MM = 500;

function emptyProject(): ProjectConfig {
  return { formatVersion: 1, name: "Neues Projekt", instances: [] };
}

function footprintOf(inst: ContainerInstance): OrientedRect {
  return {
    x: inst.position.x,
    z: inst.position.z,
    halfWidth: inst.config.size.length / 2,
    halfDepth: inst.config.size.width / 2,
    rotationDeg: inst.rotationY,
  };
}

function collidesWithAny(candidate: OrientedRect, others: ContainerInstance[]): boolean {
  return others.some((other) => rectsOverlap(candidate, footprintOf(other), CLEARANCE_MM));
}

// Reihum-Platzierung fuer neu hinzugefuegte Container: rechts neben der
// bisher am weitesten rechts stehenden Instanz, mit CLEARANCE_MM Abstand -
// bewusst kein Versuch, Luecken zwischen bestehenden Instanzen zu finden
// (siehe Architektur-Doku: einfache, deterministische Heuristik reicht für
// eine erste Version).
function findFreePosition(instances: ContainerInstance[], length: number): { x: number; z: number } {
  if (instances.length === 0) return { x: 0, z: 0 };
  let rightmostEdge = 0;
  for (const inst of instances) {
    rightmostEdge = Math.max(rightmostEdge, inst.position.x + inst.config.size.length / 2);
  }
  return { x: rightmostEdge + CLEARANCE_MM + length / 2, z: 0 };
}

function screenToWorld(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; z: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, z: 0 };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, z: transformed.y };
}

interface DragState {
  id: string;
  offsetX: number;
  offsetZ: number;
  lastValid: { x: number; z: number };
}

// Baugruppen-Projekt-Editor (siehe docs/baugruppen-architektur.md): 2D-
// Ebenenansicht von oben statt freier 3D-Bewegung, weil Container nur auf
// einer gemeinsamen Bodenebene stehen - Drag zum Verschieben, Knopf zum
// Drehen in 90-Grad-Schritten, SAT-Kollisionstest mit Mindestabstand.
export function ProjectPage() {
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectConfig>(() => loadProjectDraft() ?? emptyProject());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragValid, setDragValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveProjectDraft(project);
  }, [project]);

  const viewBox = useMemo(() => {
    const PAD = 3000;
    const MIN_HALF = 10000;
    let minX = -MIN_HALF;
    let maxX = MIN_HALF;
    let minZ = -MIN_HALF;
    let maxZ = MIN_HALF;
    for (const inst of project.instances) {
      // Grobzuegige, rotationssichere Huelle (Summe statt Diagonale reicht -
      // muss nur ausreichend gross sein, keine exakte Passform).
      const reach = inst.config.size.length / 2 + inst.config.size.width / 2;
      minX = Math.min(minX, inst.position.x - reach);
      maxX = Math.max(maxX, inst.position.x + reach);
      minZ = Math.min(minZ, inst.position.z - reach);
      maxZ = Math.max(maxZ, inst.position.z + reach);
    }
    return `${minX - PAD} ${minZ - PAD} ${maxX - minX + PAD * 2} ${maxZ - minZ + PAD * 2}`;
  }, [project.instances]);

  function handleAddInstance() {
    const config = defaultConfig();
    const instance: ContainerInstance = {
      id: crypto.randomUUID(),
      label: `Container ${project.instances.length + 1}`,
      config,
      position: findFreePosition(project.instances, config.size.length),
      rotationY: 0,
    };
    setProject((p) => ({ ...p, instances: [...p.instances, instance] }));
    setSelectedId(instance.id);
  }

  function handleRemove(id: string) {
    setProject((p) => ({ ...p, instances: p.instances.filter((i) => i.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function handleLabelChange(id: string, label: string) {
    setProject((p) => ({ ...p, instances: p.instances.map((i) => (i.id === id ? { ...i, label } : i)) }));
  }

  function handleRotate(id: string) {
    setProject((p) => {
      const target = p.instances.find((i) => i.id === id);
      if (!target) return p;
      const rotated: ContainerInstance = { ...target, rotationY: (target.rotationY + 90) % 360 };
      const others = p.instances.filter((i) => i.id !== id);
      if (collidesWithAny(footprintOf(rotated), others)) return p;
      return { ...p, instances: p.instances.map((i) => (i.id === id ? rotated : i)) };
    });
  }

  function handleEdit(instance: ContainerInstance) {
    navigate("/konfigurator", { state: { config: instance.config, returnToProject: { instanceId: instance.id } } });
  }

  function handlePointerDown(e: React.PointerEvent, inst: ContainerInstance) {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setSelectedId(inst.id);
    const svg = svgRef.current;
    if (!svg) return;
    const p = screenToWorld(svg, e.clientX, e.clientY);
    dragRef.current = {
      id: inst.id,
      offsetX: p.x - inst.position.x,
      offsetZ: p.z - inst.position.z,
      lastValid: { ...inst.position },
    };
    setDragValid(true);
  }

  function handlePointerMove(e: React.PointerEvent, inst: ContainerInstance) {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || drag.id !== inst.id || !svg) return;
    const p = screenToWorld(svg, e.clientX, e.clientY);
    const candidatePos = { x: p.x - drag.offsetX, z: p.z - drag.offsetZ };
    const candidate: OrientedRect = {
      x: candidatePos.x,
      z: candidatePos.z,
      halfWidth: inst.config.size.length / 2,
      halfDepth: inst.config.size.width / 2,
      rotationDeg: inst.rotationY,
    };
    const others = project.instances.filter((i) => i.id !== inst.id);
    const valid = !collidesWithAny(candidate, others);
    setDragValid(valid);
    if (valid) drag.lastValid = candidatePos;
    setProject((proj) => ({
      ...proj,
      instances: proj.instances.map((i) => (i.id === inst.id ? { ...i, position: candidatePos } : i)),
    }));
  }

  function handlePointerUp(e: React.PointerEvent, inst: ContainerInstance) {
    const drag = dragRef.current;
    if (!drag || drag.id !== inst.id) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    const finalPos = drag.lastValid;
    setProject((proj) => ({
      ...proj,
      instances: proj.instances.map((i) => (i.id === inst.id ? { ...i, position: finalPos } : i)),
    }));
    dragRef.current = null;
    setDragValid(true);
  }

  async function handleDownloadProject() {
    const blob = await encodeProject(project);
    downloadBlob(blob, `${sanitizeFileName(project.name)}${PROJECT_FILE_EXTENSION}`);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const loaded = await decodeProject(file);
      setProject(loaded);
      setSelectedId(null);
      setError(null);
    } catch {
      setError("Datei konnte nicht geladen werden – ist es eine gültige Projektdatei (.sszprojekt)?");
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Projekt</p>
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              className="mb-4 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />

            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Container</p>
              <button
                type="button"
                onClick={handleAddInstance}
                aria-label="Container hinzufügen"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
              >
                <PlusIcon size={16} />
              </button>
            </div>

            {project.instances.length === 0 && (
              <p className="text-sm text-slate-400">Noch keine Container im Projekt.</p>
            )}

            <div className="space-y-2">
              {project.instances.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className={`cursor-pointer rounded-lg border p-2.5 text-sm shadow-sm ${
                    selectedId === inst.id ? "border-brand bg-white" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inst.label}
                      onChange={(e) => handleLabelChange(inst.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotate(inst.id);
                      }}
                      aria-label={`${inst.label} drehen`}
                      className="shrink-0 text-slate-400 hover:text-brand"
                    >
                      <RotateCcwIcon size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(inst.id);
                      }}
                      aria-label={`${inst.label} entfernen`}
                      className="shrink-0 text-slate-400 hover:text-red-500"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {inst.config.size.length} × {inst.config.size.width} mm · {inst.rotationY}°
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(inst);
                    }}
                    className="mt-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                  >
                    Detail bearbeiten
                    <ArrowRightIcon size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Speichern &amp; Laden</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadProject}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200"
                >
                  <DownloadIcon size={16} />
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white"
                >
                  <UploadIcon size={16} />
                  Laden
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={PROJECT_FILE_EXTENSION}
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1 bg-slate-100">
          <svg ref={svgRef} viewBox={viewBox} className="h-full w-full" onPointerDown={() => setSelectedId(null)}>
            <defs>
              <pattern id="project-grid" width={1000} height={1000} patternUnits="userSpaceOnUse">
                <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#e2e8f0" strokeWidth={20} />
              </pattern>
            </defs>
            <rect
              x={-1000000}
              y={-1000000}
              width={2000000}
              height={2000000}
              fill="url(#project-grid)"
            />
            {project.instances.map((inst) => {
              const isDragging = dragRef.current?.id === inst.id;
              const fill = isDragging && !dragValid ? "#fecaca" : selectedId === inst.id ? "#bae6fd" : "#e2e8f0";
              const stroke = isDragging && !dragValid ? "#dc2626" : selectedId === inst.id ? "#0284c7" : "#64748b";
              return (
                <g
                  key={inst.id}
                  onPointerDown={(e) => handlePointerDown(e, inst)}
                  onPointerMove={(e) => handlePointerMove(e, inst)}
                  onPointerUp={(e) => handlePointerUp(e, inst)}
                  style={{ cursor: "grab", touchAction: "none" }}
                >
                  <g transform={`translate(${inst.position.x} ${inst.position.z}) rotate(${inst.rotationY})`}>
                    <rect
                      x={-inst.config.size.length / 2}
                      y={-inst.config.size.width / 2}
                      width={inst.config.size.length}
                      height={inst.config.size.width}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={60}
                    />
                  </g>
                  <text
                    x={inst.position.x}
                    y={inst.position.z}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={280}
                    fill="#1e293b"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  >
                    {inst.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </main>
      </div>
    </div>
  );
}
