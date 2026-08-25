# embed-shell

Die duenne Huelle fuer hayse.de. Kein Build, keine Abhaengigkeiten - zwei
statische HTML-Dateien mit einem Vollbild-`<iframe>`, die die eigentliche
Anwendung von `https://containerconfigurator.netlify.app` laden. Das
eigentliche App-Bundle (React, three.js etc.) wird hier NICHT mit ausgeliefert.

## Als eigene Netlify-Seite einrichten

1. Netlify -> "Add new site" -> "Import an existing project" -> GitHub ->
   Repo `ITPetya/schallschutz-konfigurator` waehlen.
2. Build-Einstellungen:
   - Base directory: `embed-shell`
   - Build command: leer lassen
   - Publish directory: `embed-shell` (bzw. `.` relativ zur Base directory)
3. Deploy branch: `main` (dieselbe Branch wie die Haupt-App - der Ordner
   `embed-shell/` wird von deren Build ignoriert, stoert sich also nicht).
4. Nach dem ersten Deploy: die neue Netlify-URL testen, dann `hayse.de` als
   Custom Domain von der bisherigen Seite ("containerconfigurator") auf diese
   neue Seite umziehen.

## Wenn sich die App-URL aendert

`src="https://containerconfigurator.netlify.app/"` in `index.html` und
`beta/index.html` anpassen - das ist die einzige Stelle. Sinnvoller
naechster Schritt: der App-Seite eine eigene Subdomain geben (z.B.
`app.hayse.de`) statt der rohen `.netlify.app`-URL, dann hier einmalig
eintragen.
