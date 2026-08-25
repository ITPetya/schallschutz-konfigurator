// Blockt Direktaufrufe der rohen App-URL. Bewusst rein clientseitig, ohne
// Server/Env-Variablen (Jonas' Vorgabe 2026-08-25 - muss auf jedem
// beliebigen statischen Host bei zukuenftigen Kunden funktionieren).
//
// Der Schluessel steht NICHT in der URL (siehe Historie: eine erste Version
// haengte ?key=... an den iframe-src - Jonas bemerkte zurecht, dass das per
// "Element untersuchen" sofort sichtbar und damit copy-paste-aufrufbar ist).
// Stattdessen ein postMessage-Handshake: die App piept beim Start
// "embed-ready" an ihr Elternfenster, die Shell-Seite (embed-shell/index.html
// im selben Repo) antwortet mit dem Schluessel. Ein simples Kopieren der
// iframe-URL bringt also keinen funktionierenden Link mehr - wer den
// Schluessel finden will, muss den JS-Quelltext der Shell-Seite lesen statt
// nur kurz ins DOM zu schauen. Bleibt weiterhin kein echter Schutz gegen
// jemanden, der bewusst den Quelltext durchsucht - nur eine deutlich hoehere
// Huerde als vorher, exakt wie von Jonas gewollt.
//
// GATED_HOSTS bewusst eng: hayse.de selbst und alle Branch-/Preview-Deploys
// (Beta etc.) sind NICHT betroffen, nur die rohe Netlify-Subdomain der
// Haupt-App. /viewer.html hat einen eigenen Einstiegspunkt und importiert
// diese Datei nicht - bleibt ungeschuetzt.

const GATED_HOSTS = new Set(["containerconfigurator.netlify.app"]);
const EMBED_ACCESS_KEY = "YsEy6JohTmFxm9FhPs1jnEfuJEwc5x5c";
const HANDSHAKE_TIMEOUT_MS = 3000;

// Jonas' Fehlerbericht 2026-08-25: /intern (nicht verlinkte Mitarbeiter-
// Ansicht) und /ansehen (schreibgeschuetzter Handy-Freigabelink fuer Kunden,
// siehe pages/ProjectViewerPage.tsx) werden BEIDE direkt aufgerufen/verteilt
// - nie ueber eine Einbettungs-Shell. Der Host-Gate wuerde sie sonst genauso
// blocken wie die Haupt-App unter "/", obwohl sie nie fuer den
// Shell-Handshake gedacht waren. Beide Pfade sind deshalb IMMER ausgenommen,
// unabhaengig vom Host.
const EXEMPT_PATH_PREFIXES = ["/intern", "/ansehen"];

function isExemptPath(): boolean {
  const path = window.location.pathname;
  return EXEMPT_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isHostGated(): boolean {
  return GATED_HOSTS.has(window.location.hostname) && !isExemptPath();
}

/**
 * Synchroner Vorab-Check fuer den Initial-State in main.tsx: auf einem
 * nicht-gegateten Host (hayse.de, Beta, lokale Entwicklung) darf sofort im
 * ersten Render `<App />` gezeigt werden, ohne auf den asynchronen
 * postMessage-Roundtrip zu warten - sonst gaebe es bei JEDEM Seitenaufruf
 * (nicht nur eingebetteten) einen kurzen leeren Frame, bis der useEffect
 * durchgelaufen ist.
 */
export function canSkipEmbedAuth(): boolean {
  return !isHostGated();
}

/**
 * Ruft `onResult(true, config)` auf, wenn die App angezeigt werden darf -
 * `config` ist die rohe, noch ungepruefte Konfiguration aus der Shell
 * (siehe applyEmbedStandardConfig in embedStandardConfig.ts fuer die
 * eigentliche Validierung/Anwendung; bewusst als `unknown` statt eines
 * konkreten Typs, damit dieses Modul generisch als Transport-Schicht bleibt
 * und nichts ueber die Bedeutung der Konfiguration wissen muss). Gibt eine
 * Cleanup-Funktion zurueck (fuer React's useEffect, wichtig wegen
 * StrictMode's doppeltem Effect-Aufruf in der Dev-Umgebung).
 */
export function requestEmbedAuth(
  onResult: (allowed: boolean, config?: unknown) => void,
): () => void {
  if (!isHostGated()) {
    onResult(true);
    return () => {};
  }
  if (window.self === window.top) {
    // Direkter Aufruf, kein iframe - kein Elternfenster, das antworten koennte.
    onResult(false);
    return () => {};
  }

  let settled = false;
  const timeoutId = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", handleMessage);
    onResult(false);
  }, HANDSHAKE_TIMEOUT_MS);

  function handleMessage(event: MessageEvent) {
    if (settled) return;
    const data = event.data as { type?: string; key?: string; config?: unknown } | null;
    if (!data || data.type !== "embed-auth") return;
    settled = true;
    window.clearTimeout(timeoutId);
    window.removeEventListener("message", handleMessage);
    onResult(data.key === EMBED_ACCESS_KEY, data.config);
  }

  window.addEventListener("message", handleMessage);
  window.parent.postMessage({ type: "embed-ready" }, "*");

  return () => {
    settled = true;
    window.clearTimeout(timeoutId);
    window.removeEventListener("message", handleMessage);
  };
}
