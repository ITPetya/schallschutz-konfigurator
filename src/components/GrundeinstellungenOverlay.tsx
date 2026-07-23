import { useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { NumberInput } from "./NumberInput";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";
import { CONTAINER_SIZE_PRESETS, DEFAULT_CONTAINER_SIZE, type ContainerSize } from "../constants/containerSizes";
import { RAL_SPECIAL_COLORS, RAL_STANDARD_COLORS } from "../constants/ralColors";

export interface GrundeinstellungenResult {
  name: string;
  size?: ContainerSize;
  outsideColor?: string;
}

interface GrundeinstellungenOverlayProps {
  mode: "single" | "project";
  onSubmit: (result: GrundeinstellungenResult) => void;
}

const toggleBtn = (active: boolean) =>
  `flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`;

// Overlay beim ERSTEN Einstieg in den Konfigurator (Jonas' Vorgabe
// 2026-07-25: "soll ein Overlay-Fenster aufpoppen, welches ein paar
// Grundeinstellungen abfragt") - fragt Bezeichnung immer ab, Größe/Farbe nur
// im Einzel-Modus (im Ensemble-Modus gibt es beim Start noch keinen
// einzelnen Container, auf den sich Größe/Farbe beziehen könnten - dort
// bleibt nur der Projektname). Erscheint NICHT, wenn schon eine sinnvolle
// (nicht-leere/nicht-Standard) Konfiguration im Cache liegt, siehe
// WorkspacePage.tsx für die genaue Bedingung.
export function GrundeinstellungenOverlay({ mode, onSubmit }: GrundeinstellungenOverlayProps) {
  const [name, setName] = useState(mode === "single" ? "Container-Konfiguration" : "Neues Projekt");
  const [sizeMode, setSizeMode] = useState<"standard" | "sonder">("standard");
  const [presetIndex, setPresetIndex] = useState(0);
  const [customSize, setCustomSize] = useState<ContainerSize>(DEFAULT_CONTAINER_SIZE);
  const [colorMode, setColorMode] = useState<"standard" | "sonder">("standard");
  const [colorHex, setColorHex] = useState(RAL_STANDARD_COLORS[0].hex);

  function handleSubmit() {
    if (mode === "project") {
      onSubmit({ name });
      return;
    }
    const size = sizeMode === "standard" ? CONTAINER_SIZE_PRESETS[presetIndex] : customSize;
    onSubmit({ name, size, outsideColor: colorHex });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Grundeinstellungen</p>
        <p className="mb-4 text-sm text-slate-600">
          {mode === "single"
            ? "Ein paar Basisangaben, bevor es losgeht – alles lässt sich später noch anpassen."
            : "Wie soll deine Baugruppe heißen?"}
        </p>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Bezeichnung</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>

        {mode === "single" && (
          <>
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Größe</p>
              <div className="mb-2 flex gap-1">
                <button type="button" className={toggleBtn(sizeMode === "standard")} onClick={() => setSizeMode("standard")}>
                  Standard
                </button>
                <button type="button" className={toggleBtn(sizeMode === "sonder")} onClick={() => setSizeMode("sonder")}>
                  Sonder
                </button>
              </div>
              {sizeMode === "standard" ? (
                <div className="flex flex-col gap-1">
                  {CONTAINER_SIZE_PRESETS.map((p, i) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPresetIndex(i)}
                      className={`rounded-lg px-3 py-1.5 text-left text-xs font-medium ${
                        presetIndex === i ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.label} mm
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <SizeField label="Länge (mm)" value={customSize.length} onChange={(v) => setCustomSize((s) => ({ ...s, length: v }))} />
                  <SizeField label="Breite (mm)" value={customSize.width} onChange={(v) => setCustomSize((s) => ({ ...s, width: v }))} />
                  <SizeField label="Höhe (mm)" value={customSize.height} onChange={(v) => setCustomSize((s) => ({ ...s, height: v }))} />
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Farbe (außen)</p>
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  className={toggleBtn(colorMode === "standard")}
                  onClick={() => {
                    setColorMode("standard");
                    setColorHex(RAL_STANDARD_COLORS[0].hex);
                  }}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={toggleBtn(colorMode === "sonder")}
                  onClick={() => {
                    setColorMode("sonder");
                    setColorHex(RAL_SPECIAL_COLORS[0].hex);
                  }}
                >
                  Sonder
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: colorHex }} aria-hidden />
                <select
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  {(colorMode === "standard" ? RAL_STANDARD_COLORS : RAL_SPECIAL_COLORS).map((c) => (
                    <option key={c.code} value={c.hex}>
                      {c.code} – {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        <AnimatedButton
          type="button"
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Weiter
          <ArrowRightIcon size={16} />
        </AnimatedButton>
      </div>
    </div>
  );
}

function SizeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-500">
      {label}
      <NumberInput
        step={10}
        min={0}
        value={value}
        onChange={onChange}
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none"
      />
    </label>
  );
}
