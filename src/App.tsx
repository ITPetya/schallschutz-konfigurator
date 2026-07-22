import { useState } from "react";
import { Scene } from "./components/Scene";
import { CONTAINER_SIZES, DEFAULT_CONTAINER_SIZE, type ContainerSizeId } from "./constants/containerSizes";

function App() {
  const [sizeId, setSizeId] = useState<ContainerSizeId>(DEFAULT_CONTAINER_SIZE);
  const size = CONTAINER_SIZES[sizeId];

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-700 px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Schallschutz-Sondercontainer – 3D-Konfigurator
        </h1>
        <select
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value as ContainerSizeId)}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm"
        >
          {Object.values(CONTAINER_SIZES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-slate-700 bg-slate-800/50 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Durchbrüche
          </h2>
          <p className="text-sm text-slate-400">
            Kommt im nächsten Schritt: Standarddurchbrüche (Tür, Lüftungsgitter)
            und freie, parametrische Durchbrüche (Kabel-/Rohrdurchführung)
            werden hier platzierbar sein.
          </p>
        </aside>

        <main className="relative flex-1">
          <Scene size={size} />
        </main>
      </div>
    </div>
  );
}

export default App;
