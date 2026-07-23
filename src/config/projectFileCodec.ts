import type { ProjectConfig } from "./projectTypes";
import { decryptJson, encryptJson } from "./fileCrypto";

// .sszprojekt - Baugruppen-Projektdatei, gleiches Prinzip wie .sszkonfig
// (siehe configFileCodec.ts und fileCrypto.ts fuer den Ehrlichkeitshinweis
// zur Verschluesselung). Eine ProjectConfig ist vollstaendig eigenstaendig -
// alle enthaltenen Container-Konfigurationen sind eingebettet, keine
// externen Referenzen auf einzelne .sszkonfig-Dateien (siehe Architektur-
// Doku: "eine Datei = ein Projekt, ueberall geoeffnet, keine fehlenden
// Abhaengigkeiten").
export const PROJECT_FILE_EXTENSION = ".sszprojekt";

export function encodeProject(project: ProjectConfig): Promise<Blob> {
  return encryptJson(project);
}

export function decodeProject(file: File): Promise<ProjectConfig> {
  return decryptJson<ProjectConfig>(file);
}
