// Ruhezustand des Beta-Branchs (Jonas' Vorgabe 2026-07-25: "der /beta Branch
// soll nur noch ein Dummy sein, und eine Art Seite haben die anzeigt, keine
// Beta-Version gepusht oder so") - dieser Branch (night-2026-07-23-beta)
// deployed ueber Netlify nach hayse.de/beta. Solange hier kein echter Test
// laeuft, zeigt er absichtlich NUR diese Platzhalterseite statt (unbemerkt)
// die Produktion zu spiegeln - so ist auf einen Blick klar, ob gerade eine
// Beta-Version aktiv ist oder nicht. Fuer den naechsten Testlauf: diesen
// Branch wieder auf den Stand von main zuruecksetzen und dort wie gewohnt
// weiterarbeiten.
function App() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <p className="font-heading text-2xl font-bold uppercase tracking-wide text-brand-dark">
        Schallschutz-Sondercontainer
      </p>
      <p className="text-sm font-bold uppercase tracking-widest text-brand">Beta</p>
      <p className="max-w-sm text-slate-500">
        Aktuell ist keine Beta-Version gepusht. Diese Seite dient als Platzhalter, solange hier gerade nichts
        getestet wird.
      </p>
    </div>
  );
}

export default App;
