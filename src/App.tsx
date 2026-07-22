import { useState } from "react";
import { Scene } from "./components/Scene";
import { OpeningsPanel } from "./components/OpeningsPanel";
import { CONTAINER_SIZES, DEFAULT_CONTAINER_SIZE, type ContainerSizeId } from "./constants/containerSizes";
import type { Opening } from "./types/openings";

function App() {
  const [sizeId, setSizeId] = useState<ContainerSizeId>(DEFAULT_CONTAINER_SIZE);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const size = CONTAINER_SIZES[sizeId];

  function handleAdd(opening: Opening) {
    setOpenings((prev) => [...prev, opening]);
  }

  function handleUpdate(id: string, patch: Partial<Opening>) {
    setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleRemove(id: string) {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="h-1.5 bg-brand-light" />
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h1 className="font-heading text-lg font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer <span className="text-brand-light">–</span> 3D-Konfigurator
        </h1>
        <select
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value as ContainerSizeId)}
          className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-ink shadow-sm"
        >
          {Object.values(CONTAINER_SIZES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand">
            Durchbrüche
          </h2>
          <div className="mb-3 h-0.5 w-10 bg-brand-light" />
          <OpeningsPanel
            size={size}
            openings={openings}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        </aside>

        {/* min-w-0/min-h-0 sind noetig, nicht nur kosmetisch (Jonas'
            Fehlerbericht 2026-07-22): ohne das erlaubt Flexbox einem Flex-Kind
            standardmaessig nicht, unter die intrinsische Groesse seines
            eigenen Inhalts zu schrumpfen - der Canvas hat kurz nach einem
            Resize eine intrinsische Groesse, die genau diesen Bug ausloest
            (Fenster verkleinern nach vorherigem Vergroessern haengt fest). */}
        <main className="relative min-h-0 min-w-0 flex-1">
          <Scene size={size} openings={openings} />
        </main>
      </div>
    </div>
  );
}

export default App;
