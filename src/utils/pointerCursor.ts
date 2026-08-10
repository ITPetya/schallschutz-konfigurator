// Jonas' Fehlerbericht 2026-08-10: "bei allen klickbaren Sachen soll der
// Mauszeiger zur Hand werden" - fuer echte DOM-Buttons/Links erledigt das
// eine globale CSS-Regel (index.css), aber r3f setzt bei interaktiven
// Meshes (Messpunkte, Container-Grundriss zum Auswaehlen/Ziehen) KEINEN
// Hand-Cursor automatisch, das muss hier per Pointer-Over/-Out manuell auf
// den Canvas gesetzt werden.
export function setPointerCursor(): void {
  document.body.style.cursor = "pointer";
}

export function resetPointerCursor(): void {
  document.body.style.cursor = "auto";
}
