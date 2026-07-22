import { useEffect, useState, type ChangeEvent } from "react";

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  // Feuert NACH dem internen Fallback-auf-letzten-gueltigen-Wert, falls der
  // Aufrufer beim Verlassen des Feldes noch zusaetzliche Logik braucht (z. B.
  // Clamping) - siehe OpeningsPanel.tsx's Hoehen-Feld.
  onBlurCommitted?: () => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

// Ersetzt ein rohes <input type="number"> (Jonas' Fehlerbericht 2026-07-24:
// "man kann in den Feldern nie nichts eingeben, es steht zwingend immer eine
// 0 da, deswegen kann man auch kein - eintragen, was man eigentlich
// braucht"). Root Cause: ein Input, dessen value direkt an eine gerundete
// Zahl gebunden ist, akzeptiert keine Zwischenzustaende wie "-", "" oder
// "12." - jeder Tastendruck rundet sofort zurueck auf 0, bevor ueberhaupt
// eine negative Zahl fertig getippt werden kann. Haelt stattdessen den
// ROHEN Text als lokalen State, committet erst nach oben, wenn eine
// VOLLSTAENDIGE gueltige Zahl dasteht, und faellt beim Verlassen des Feldes
// auf den letzten gueltigen Wert zurueck, falls ein unvollstaendiger Zustand
// stehen geblieben ist.
export function NumberInput({ value, onChange, onBlurCommitted, step, min, max, className }: NumberInputProps) {
  const [text, setText] = useState(String(value));

  // Nur bei Aenderungen VON AUSSEN (z. B. Reset, Laden einer Datei)
  // synchronisieren - waehrend des Tippens laesst onChange unten den Text
  // frei stehen, statt ihn bei jedem Tastendruck zu ueberschreiben.
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);
    if (raw === "" || raw === "-") return; // Zwischenzustand, noch nicht committen
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onChange(parsed);
  }

  function handleBlur() {
    if (text === "" || text === "-" || Number.isNaN(Number(text))) {
      setText(String(value));
    }
    onBlurCommitted?.();
  }

  return (
    <input
      type="number"
      value={text}
      step={step}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
