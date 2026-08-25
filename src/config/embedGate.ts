// Blockt Direktaufrufe der rohen App-URL ohne passenden ?key=-Parameter.
// Bewusst rein clientseitig statt einer Netlify Edge Function (Jonas'
// Vorgabe 2026-08-25: soll ohne Umgebungsvariablen und ohne Netlify-
// spezifische Infrastruktur auskommen, da die Einbau-Situation bei
// zukuenftigen Kunden nicht bekannt ist - der Check muss auf jedem
// beliebigen statischen Host funktionieren). Dadurch schwaecher als der
// vorherige serverseitige Ansatz: der erwartete Schluessel steckt im
// ausgelieferten JS-Bundle und ist mit DevTools auffindbar - bleibt aber
// im selben "semi sicher genug gegen zufaelliges Weiterreichen"-Rahmen,
// den Jonas explizit gewaehlt hat.
//
// GATED_HOSTS bewusst eng gehalten: hayse.de selbst und alle Branch-/
// Preview-Deploys (Beta etc.) sind NICHT betroffen, nur die rohe
// Netlify-Subdomain der Haupt-App. /viewer.html (das kleine Embed-Widget
// fuer Kundenseiten) hat einen eigenen Einstiegspunkt (src/viewer/entry.tsx)
// und importiert diese Datei nicht - bleibt also ungeschuetzt.

const GATED_HOSTS = new Set(["containerconfigurator.netlify.app"]);
const EMBED_ACCESS_KEY = "YsEy6JohTmFxm9FhPs1jnEfuJEwc5x5c";

export function isEmbedAccessBlocked(): boolean {
  if (!GATED_HOSTS.has(window.location.hostname)) return false;
  const providedKey = new URLSearchParams(window.location.search).get("key");
  return providedKey !== EMBED_ACCESS_KEY;
}
