import { useState } from "react";
import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import { CopyButton } from "./CopyButton";
import { formatLength, type LengthUnit } from "../utils/lengthUnits";

interface MeasureDistanceLabelProps {
  a: [number, number, number];
  b: [number, number, number];
  unit: LengthUnit;
}

// Unterhalb dieser Achsenabweichung (Meter) gilt eine Achse als "0" und wird
// im XYZ-Modus ausgeblendet (Jonas' Vorgabe 2026-08-10: "damit das nicht
// direkt ueberfuellt ist") - 0,5mm statt exakt 0, damit Rundungsrauschen
// (z. B. minimale Gleitkomma-Abweichungen bei eigentlich exakt gleicher
// Achse) nicht als winzige, aber ungleich-Null-Achse mit angezeigt wird.
const ZERO_EPS_M = 0.0005;

// Jonas' Vorgabe 2026-08-10: "die Maße sollen auch im Viewer angezeigt
// werden", Klick auf das Maß selbst (NICHT auf den Copy-Button) wechselt
// zwischen Direkt- und XYZ-Anzeige - Standard ist Direkt, ein Klick zeigt
// XYZ (nur die Achsen ungleich Null), ein weiterer Klick geht zurueck zu
// Direkt. Schwebt als echtes DOM-Element (drei's <Html>) am Mittelpunkt der
// Messlinie - bewusst IMMER oben sichtbar wie eine echte CAD-Bemaßung
// (anders als die rohen Messpunkte/-linie selbst, siehe MeasureMarkers.tsx,
// die weiterhin normal von Waenden verdeckt werden koennen).
export function MeasureDistanceLabel({ a, b, unit }: MeasureDistanceLabelProps) {
  const [hovered, setHovered] = useState(false);
  const [mode, setMode] = useState<"direct" | "xyz">("direct");
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  const directMeters = Math.hypot(dx, dy, dz);

  const axisRows = [
    { label: "X", meters: Math.abs(dx) },
    { label: "Y", meters: Math.abs(dy) },
    { label: "Z", meters: Math.abs(dz) },
  ].filter((row) => row.meters > ZERO_EPS_M);

  const showXyz = mode === "xyz" && axisRows.length > 0;

  return (
    <Html position={mid} center>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setMode((m) => (m === "direct" ? "xyz" : "direct"))}
        className="flex cursor-pointer flex-col items-center gap-0.5 whitespace-nowrap rounded-full border border-brand bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-dark shadow-md dark:bg-slate-800/95 dark:text-brand-light"
      >
        {showXyz ? (
          axisRows.map((row) => (
            <LabelValue key={row.label} prefix={row.label} text={formatLength(row.meters, unit)} hovered={hovered} />
          ))
        ) : (
          <LabelValue text={formatLength(directMeters, unit)} hovered={hovered} />
        )}
      </div>
    </Html>
  );
}

function LabelValue({ prefix, text, hovered }: { prefix?: string; text: string; hovered: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {prefix && <span className="text-brand-light">{prefix}</span>}
      {text}
      <AnimatePresence>
        {hovered && (
          <motion.span
            key="copy"
            initial={{ opacity: 0, width: 0, scale: 0.5 }}
            animate={{ opacity: 1, width: "auto", scale: 1 }}
            exit={{ opacity: 0, width: 0, scale: 0.5 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex overflow-hidden"
          >
            <CopyButton value={text} label={prefix ? `${prefix}-Abstand kopieren` : "Abstand kopieren"} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
