import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedButton } from "./AnimatedButton";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";
import { PlusIcon } from "./icons/PlusIcon";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./primitives/DropdownMenu";
import { RAL_STANDARD_COLORS, RAL_SPECIAL_COLORS } from "../constants/ralColors";
import type { StartPreset } from "../constants/startPresets";
import type { ProjectConfig } from "../config/projectTypes";

// Eigener lazy Chunk (Jonas' Vorgabe 2026-08-18, siehe App.tsx-Kommentar zum
// selben Prinzip bei WorkspacePage/InternalPage): StartPresetThumbnail.tsx
// zieht ueber Container.tsx den kompletten three.js/r3f/three-bvh-csg-Stack
// nach (>1MB minifiziert) - StartPage.tsx wird (anders als WorkspacePage)
// bewusst NICHT lazy geladen (sie ist die allererste Seite, die jeder Nutzer
// sieht), ein direkter Eager-Import hier wuerde also GENAU den 2026-07-23
// behobenen Fehler wiederholen (voller 3D-Stack schon auf der Startseite).
const StartPresetThumbnail = lazy(() => import("./StartPresetThumbnail").then((m) => ({ default: m.StartPresetThumbnail })));

interface StartPresetCardProps {
  preset: StartPreset;
}

// Eine Preset-Karte auf der Startseite (Jonas' Vorgabe 2026-08-18, nach
// Skizze): Bezeichnung, automatisch generierte Vorschau (siehe
// StartPresetThumbnail.tsx), drei Farbpunkte und "Konfigurieren". Die
// Farbauswahl ist reiner Kartenzustand (wirkt sich NICHT auf das
// zugrundeliegende Preset aus) - erst "Konfigurieren" uebernimmt die
// aktuell gewaehlte Farbe in ein echtes neues Projekt.
export function StartPresetCard({ preset }: StartPresetCardProps) {
  const navigate = useNavigate();
  // Start = Preset-Standard (RAL 6005 Moosgruen bei allen acht Presets,
  // siehe startPresets.ts).
  const [outsideColor, setOutsideColor] = useState(preset.config.outsideColor);
  const isStandardColor = RAL_STANDARD_COLORS.some((c) => c.hex === outsideColor);
  const customColor = isStandardColor ? null : outsideColor;

  function handleConfigure() {
    const project: ProjectConfig = {
      formatVersion: 1,
      name: preset.label,
      instances: [
        {
          id: crypto.randomUUID(),
          label: `${preset.label} Container`,
          config: { ...preset.config, outsideColor },
          position: { x: 0, z: 0 },
          rotationY: 0,
        },
      ],
    };
    navigate("/projekt", { state: { project } });
  }

  return (
    // Jonas' Vorgabe 2026-08-18: Vorschau ca. 50% groesser (144 -> 216px,
    // siehe sizePx unten) - Karte dafuer entsprechend breiter (w-52 -> w-60),
    // aber mit knapperem Innenabstand/Abstand (p-4->p-3, gap-3->gap-2), da
    // der gesamte Preset-Bereich gleichzeitig kompakter werden soll.
    <div className="flex w-60 shrink-0 flex-col items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="font-heading text-sm font-bold text-brand-dark dark:text-brand-light">{preset.label} Container</p>
      <Suspense fallback={<div className="h-[216px] w-[216px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />}>
        <StartPresetThumbnail config={preset.config} outsideColor={outsideColor} sizePx={216} />
      </Suspense>
      <div className="flex items-center gap-2.5">
        {RAL_STANDARD_COLORS.map((c) => (
          <button
            key={c.code}
            type="button"
            title={`${c.code} – ${c.name}`}
            onClick={() => setOutsideColor(c.hex)}
            className={`h-6 w-6 rounded-full border-2 transition-[border-color] ${
              outsideColor === c.hex ? "border-brand" : "border-transparent"
            }`}
          >
            <span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={customColor ? `Sonderfarbe: ${customColor}` : "Sonderfarbe (RAL) wählen"}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-[border-color] ${
                customColor ? "border-brand" : "border-transparent"
              }`}
            >
              {customColor ? (
                <span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: customColor }} />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-400 dark:border-slate-500 dark:text-slate-500">
                  <PlusIcon size={12} />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            sideOffset={6}
            className="z-50 max-h-72 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {RAL_SPECIAL_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.code}
                onSelect={() => setOutsideColor(c.hex)}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700 ${
                  outsideColor === c.hex ? "font-semibold text-brand-dark" : "text-ink dark:text-slate-100"
                }`}
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: c.hex }} aria-hidden />
                <span className="flex-1 truncate">
                  {c.code} – {c.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AnimatedButton
        type="button"
        onClick={handleConfigure}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
      >
        Konfigurieren
        <ArrowRightIcon size={14} />
      </AnimatedButton>
    </div>
  );
}
