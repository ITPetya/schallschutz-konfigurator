// Sichtbare Versionsnummer, unten rechts auf allen Seiten der App (Jonas'
// Vorgabe 2026-08-25) - Format V.<major>.<minor>.<TT>.<MM>.<JJ>:
// - major: erhoeht sich bei einer "publizierten Version", also einer
//   kompletten Neuheit (z.B. der GLB-Export).
// - minor: erhoeht sich bei kleineren Fixes/Verbesserungen an Bestehendem,
//   zurueckgesetzt auf 0/1 bei jeder major-Erhoehung (Jonas hat das nicht
//   explizit gesagt, aber "erste Ziffer nur bei echten Neuheiten" impliziert
//   sonst eine immer weiter wachsende zweite Ziffer ohne erkennbaren Bezug
//   zur aktuellen major-Version).
// - danach das Datum der Version (TT.MM.JJ, zweistelliges Jahr).
// MUSS von Hand gepflegt werden - kein automatischer Build-Zeitstempel, weil
// das Datum die tatsaechliche Veroeffentlichung EINER bestimmten Version
// festhalten soll, nicht den Moment, in dem irgendwer die Seite gerade
// aufruft.
export const APP_VERSION = "V.1.1.25.08.26";
