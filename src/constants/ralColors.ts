export interface RalColor {
  code: string;
  name: string;
  hex: string;
}

// Standardfarben des Containers (Jonas' Vorgabe 2026-07-22) - alles andere
// zaehlt als Sonderfarbe (Aufpreis in der Realitaet, hier nur zur
// Unterscheidung in der Auswahl).
export const RAL_STANDARD_COLORS: RalColor[] = [
  { code: "RAL 6005", name: "Moosgrün", hex: "#0f4336" },
  { code: "RAL 7004", name: "Signalgrau", hex: "#969693" },
];

// Kuratierte Auswahl gaengiger RAL-Classic-Toene als Sonderfarben-Palette -
// Hex-Werte sind uebliche sRGB-Naeherungen (RAL ist ein physischer
// Farbstandard, auf einem Bildschirm nie exakt darstellbar), keine
// vollstaendige RAL-Classic-Liste (~213 Toene), aber quer durch alle Serien.
export const RAL_SPECIAL_COLORS: RalColor[] = [
  { code: "RAL 1000", name: "Grünbeige", hex: "#cdba88" },
  { code: "RAL 1003", name: "Signalgelb", hex: "#e5be01" },
  { code: "RAL 1015", name: "Hellelfenbein", hex: "#e6d690" },
  { code: "RAL 1021", name: "Rapsgelb", hex: "#f3da0b" },
  { code: "RAL 1023", name: "Verkehrsgelb", hex: "#fad201" },
  { code: "RAL 2004", name: "Reinorange", hex: "#e75b12" },
  { code: "RAL 2009", name: "Verkehrsorange", hex: "#de5307" },
  { code: "RAL 3000", name: "Feuerrot", hex: "#af2b1e" },
  { code: "RAL 3003", name: "Rubinrot", hex: "#9b111e" },
  { code: "RAL 3020", name: "Verkehrsrot", hex: "#c1121c" },
  { code: "RAL 4005", name: "Blaulila", hex: "#6c4675" },
  { code: "RAL 4008", name: "Signalviolett", hex: "#922b3e" },
  { code: "RAL 5002", name: "Ultramarinblau", hex: "#20214f" },
  { code: "RAL 5010", name: "Enzianblau", hex: "#0e294b" },
  { code: "RAL 5012", name: "Lichtblau", hex: "#3481b8" },
  { code: "RAL 5015", name: "Himmelblau", hex: "#2271b3" },
  { code: "RAL 5017", name: "Verkehrsblau", hex: "#063971" },
  { code: "RAL 6000", name: "Patinagrün", hex: "#316650" },
  { code: "RAL 6002", name: "Laubgrün", hex: "#2d572c" },
  { code: "RAL 6009", name: "Tannengrün", hex: "#27352a" },
  { code: "RAL 6011", name: "Resedagrün", hex: "#587246" },
  { code: "RAL 6018", name: "Gelbgrün", hex: "#57a639" },
  { code: "RAL 6021", name: "Blassgrün", hex: "#89ac76" },
  { code: "RAL 6029", name: "Minzgrün", hex: "#08414a" },
  { code: "RAL 7001", name: "Silbergrau", hex: "#8a9597" },
  { code: "RAL 7015", name: "Schiefergrau", hex: "#434750" },
  { code: "RAL 7016", name: "Anthrazitgrau", hex: "#293133" },
  { code: "RAL 7021", name: "Schwarzgrau", hex: "#23282b" },
  { code: "RAL 7024", name: "Graphitgrau", hex: "#474a51" },
  { code: "RAL 7035", name: "Lichtgrau", hex: "#d7d7d7" },
  { code: "RAL 7038", name: "Achatgrau", hex: "#b5b8b1" },
  { code: "RAL 7040", name: "Fenstergrau", hex: "#9da1aa" },
  { code: "RAL 7042", name: "Verkehrsgrau A", hex: "#8f9695" },
  { code: "RAL 8001", name: "Ockerbraun", hex: "#9d622b" },
  { code: "RAL 8017", name: "Schokoladenbraun", hex: "#45322e" },
  { code: "RAL 9001", name: "Cremeweiß", hex: "#fdf4e3" },
  { code: "RAL 9002", name: "Grauweiß", hex: "#e7ebda" },
  { code: "RAL 9005", name: "Tiefschwarz", hex: "#0a0a0a" },
  { code: "RAL 9006", name: "Weißaluminium", hex: "#a5a8a5" },
  { code: "RAL 9007", name: "Graualuminium", hex: "#8f8f8c" },
  { code: "RAL 9010", name: "Reinweiß", hex: "#f7f9f4" },
  { code: "RAL 9016", name: "Verkehrsweiß", hex: "#f6f6f6" },
];
