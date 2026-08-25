// Schuetzt die "rohe" Netlify-Subdomain der App (containerconfigurator.netlify.app)
// vor Direktaufrufen ohne Schluessel. hayse.de selbst sowie alle Branch-/
// Preview-Deploys (Beta etc.) sind bewusst NICHT betroffen, siehe GATED_HOSTS -
// Jonas will Beta weiterhin frei erreichbar lassen (2026-08-25).
//
// Modell: der Schluessel steckt als ?key=... Query-Parameter fest im iframe-src
// der jeweiligen "Shell"-Seite (siehe embed-shell/index.html in diesem Repo -
// das ist zugleich das Muster, das Kunden fuer eigene Einbettungen bekommen).
// Kein echter Zugangsschutz gegen jemanden, der bewusst Requests/Header
// faelscht (z.B. per curl) - nur eine Huerde gegen zufaelliges Direktaufrufen
// eines gefundenen Links durch technisch wenig versierte Besucher. Jonas hat
// dieses Sicherheitsniveau ("semi sicher") explizit so gewollt.
//
// /viewer.html (das kleine, eigenstaendige Embed-Widget fuer Kundenseiten,
// gebaut 2026-08-19) bleibt bewusst UNGESCHUETZT - Dateien mit Endung werden
// unten immer durchgelassen, siehe hasFileExtension.

import type { Context } from "@netlify/edge-functions";

const GATED_HOSTS = new Set(["containerconfigurator.netlify.app"]);

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split("/").pop() ?? "";
  return lastSegment.includes(".");
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);

  if (!GATED_HOSTS.has(url.hostname)) return;
  if (hasFileExtension(url.pathname)) return;

  const expectedKey = Netlify.env.get("EMBED_ACCESS_KEY");
  const providedKey = url.searchParams.get("key");

  if (expectedKey && providedKey === expectedKey) return;

  return Response.redirect("https://hayse.de", 302);
};

export const config = { path: "/*" };
