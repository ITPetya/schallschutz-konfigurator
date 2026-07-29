import { useLoadingPhase } from "../hooks/useLoadingPhase";
import { OrbitIcon } from "./icons/OrbitIcon";
import { DiscIcon } from "./icons/DiscIcon";

interface LoadingIconProps {
  active: boolean;
  // "saving": Speichern-Vorgaenge (disc-3) - "generic": alles andere (orbit),
  // siehe LoadingIndicator.tsx.
  kind?: "generic" | "saving";
  size?: number;
  className?: string;
}

// Reines Icon (ohne Overlay/Text) fuer Stellen, an denen ein Ladezustand NUR
// innerhalb eines bestehenden Elements sichtbar sein soll - z. B. ersetzt in
// WorkspacePage.tsx das Download-Icon eines "Speichern"-Buttons waehrend der
// asynchronen Kodierung. Haelt sich an dieselbe 0,8s-Regel wie
// LoadingIndicator.tsx (useLoadingPhase.ts), damit ein normaler, schneller
// Speichervorgang nicht kurz aufblitzt.
export function LoadingIcon({ active, kind = "generic", size = 16, className }: LoadingIconProps) {
  const { phase } = useLoadingPhase(active);
  if (phase === "idle") return null;
  return kind === "saving" ? <DiscIcon size={size} className={className} /> : <OrbitIcon size={size} className={className} />;
}
