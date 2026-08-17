import type { ContainerConfig } from "./types";
import { decryptJson, encryptJson } from "./fileCrypto";
import { buildKundenverlauf } from "./kundenverlauf";

// Datei-Format fuer heruntergeladene/eingelesene Konfigurationen (Jonas'
// Vorgabe 2026-07-23: "ohne Server", die Konfiguration wird stattdessen als
// Datei gespeichert/eingelesen - "sie soll nicht auslesbar sein, also kein
// plain .json sondern verschluesselt"). Die eigentliche Verschluesselung
// steckt seit der Baugruppen-Nacht-Session (2026-07-23) in fileCrypto.ts,
// gemeinsam genutzt mit projectFileCodec.ts (.sszprojekt) - siehe dort fuer
// den Ehrlichkeitshinweis zur Schluesselverwaltung.
export const CONFIG_FILE_EXTENSION = ".sszkonfig";

// Jonas' Vorgabe 2026-08-17: beim Herunterladen wird der lokale
// Kundenverlauf (kundenverlauf.ts) auf einer KOPIE eingebettet, nie am
// Live-Objekt - der Verlauf soll nicht Teil des editierten Zustands/der
// Undo-Historie werden, nur des tatsaechlich exportierten Snapshots.
export function encodeConfig(config: ContainerConfig): Promise<Blob> {
  return encryptJson({ ...config, kundenverlauf: buildKundenverlauf() });
}

export function decodeConfig(file: File): Promise<ContainerConfig> {
  return decryptJson<ContainerConfig>(file);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "Container-Konfiguration";
  return trimmed.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "").slice(0, 80) || "Container-Konfiguration";
}
