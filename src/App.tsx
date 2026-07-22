import { useState } from "react";
import { Scene } from "./components/Scene";
import { OpeningsPanel } from "./components/OpeningsPanel";
import { AddOpeningPopup } from "./components/AddOpeningPopup";
import { ContainerSizeControls } from "./components/ContainerSizeControls";
import { DEFAULT_CONTAINER_SIZE, DEFAULT_WALL_THICKNESS, type ContainerSize } from "./constants/containerSizes";
import type { Opening } from "./types/openings";

function App() {
  const [size, setSize] = useState<ContainerSize>(DEFAULT_CONTAINER_SIZE);
  const [wallThickness, setWallThickness] = useState(DEFAULT_WALL_THICKNESS);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [showAddPopup, setShowAddPopup] = useState(false);

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
        <ContainerSizeControls
          size={size}
          wallThickness={wallThickness}
          onSizeChange={setSize}
          onWallThicknessChange={setWallThickness}
        />
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
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onOpenAdd={() => setShowAddPopup(true)}
          />
        </aside>

        {/* min-w-0/min-h-0 sind noetig, nicht nur kosmetisch (Jonas'
            Fehlerbericht 2026-07-22): ohne das erlaubt Flexbox einem Flex-Kind
            standardmaessig nicht, unter die intrinsische Groesse seines
            eigenen Inhalts zu schrumpfen - der Canvas hat kurz nach einem
            Resize eine intrinsische Groesse, die genau diesen Bug ausloest
            (Fenster verkleinern nach vorherigem Vergroessern haengt fest). */}
        <main className="relative min-h-0 min-w-0 flex-1">
          <Scene size={size} wallThickness={wallThickness} openings={openings} />
          {showAddPopup && (
            <AddOpeningPopup size={size} onAdd={handleAdd} onClose={() => setShowAddPopup(false)} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
