// Generisches Verschluesselungs-Grundgeruest, extrahiert aus
// configFileCodec.ts (Nacht-Session 2026-07-23) fuer die Baugruppen-
// Projektdateien (.sszprojekt), die denselben Editier-Schutz brauchen wie
// einzelne Container-Konfigurationen - keine inhaltliche Aenderung
// gegenueber der bisherigen Logik, nur herausgezogen, damit configFileCodec.ts
// und projectFileCodec.ts nicht dieselbe Krypto-Logik zweimal enthalten.
//
// WICHTIGER EHRLICHKEITSHINWEIS (gilt fuer beide Dateiformate): Das ist eine
// reine Client-Anwendung ohne eigenes Backend - es gibt also keinen Ort, an
// dem ein Schluessel geheim gehalten werden koennte. Der hier verwendete
// AES-GCM-Schluessel wird aus einer FEST im Quellcode hinterlegten
// Passphrase abgeleitet und ist damit fuer jeden, der das JS-Bundle
// inspiziert, extrahierbar. Das verhindert zuverlaessig das beilaeufige
// Oeffnen/Bearbeiten der Datei in einem Texteditor (der eigentliche Zweck),
// ist aber KEINE Verschluesselung gegen einen motivierten Angreifer.
const KEY_PASSPHRASE = "ssk-container-konfigurator-v1";
const SALT = new TextEncoder().encode("ssk-fixed-salt-v1");

async function deriveKey(): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY_PASSPHRASE), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson(data: unknown): Promise<Blob> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  // IV wird der Ciphertext vorangestellt - beim Entschluesseln wieder abgetrennt.
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return new Blob([combined], { type: "application/octet-stream" });
}

export async function decryptJson<T>(file: File): Promise<T> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length < 13) throw new Error("Datei ist zu klein, um gueltig zu sein.");
  const iv = buf.slice(0, 12);
  const ciphertext = buf.slice(12);
  const key = await deriveKey();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
