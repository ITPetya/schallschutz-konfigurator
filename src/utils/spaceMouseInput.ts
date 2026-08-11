// Reine Parser-Logik fuer 3Dconnexion SpaceMouse HID-Eingabeberichte (Jonas'
// Vorgabe 2026-08-11: 6-DOF-Eingabegeraet als zusaetzliche Kamerasteuerung,
// siehe hooks/useSpaceMouse.ts fuer die WebHID-Verbindung selbst und
// components/SpaceMouseCameraRig.tsx fuer die Kamera-Anwendung). Absichtlich
// als reine Funktion (keine Geraete-/DOM-Abhaengigkeit) ausgelagert, weil in
// dieser Umgebung KEINE echte SpaceMouse zum Testen verfuegbar ist - so
// laesst sich die Byte-Interpretation wenigstens mit synthetischen
// DataViews auf innere Konsistenz pruefen (richtige Offsets, Vorzeichen,
// Byte-Reihenfolge), auch wenn nicht bestaetigt werden kann, dass sie
// exakt dem tatsaechlichen Output einer echten Hardware entspricht - siehe
// Abschlussbericht der Session fuer den expliziten Hinweis an Jonas.
//
// Format (aus der von 3Dconnexion dokumentierten/community-etablierten HID-
// Struktur, wie sie u.a. Linux' spacenavd/libspnav und diverse Open-Source-
// WebHID-/node-hid-Treiber fuer SpaceMouse-Geraete uebereinstimmend
// interpretieren):
//   Report-ID 1: Translation, 3x signed int16 little-endian: x, y, z
//   Report-ID 2: Rotation, 3x signed int16 little-endian: rx, ry, rz
//   Report-ID 3: Tasten, Bitmaske (Byte-Anzahl variiert je nach Modell/
//     Tastenzahl, mindestens 1 Byte)
// Rohwerte liegen je nach Modell bei voller Auslenkung grob im Bereich
// +-350 bis +-500 - vom Geraet NICHT auf +-1 normiert.

export interface SpaceMouseAxisState {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface SpaceMouseReportResult {
  translation?: Pick<SpaceMouseAxisState, "x" | "y" | "z">;
  rotation?: Pick<SpaceMouseAxisState, "rx" | "ry" | "rz">;
  buttons?: number;
}

export const SPACEMOUSE_REPORT_ID = {
  TRANSLATION: 1,
  ROTATION: 2,
  BUTTONS: 3,
} as const;

export const ZERO_SPACEMOUSE_AXES: SpaceMouseAxisState = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };

/**
 * Parst EINEN WebHID-"inputreport"-Payload einer 3Dconnexion SpaceMouse in
 * ein partielles 6-DOF-/Tasten-Update. Reine Funktion - kein Geraetezugriff,
 * keine Nebenwirkungen - damit sie auch ohne Hardware mit synthetischen
 * Byte-Arrays ueberprueft werden kann.
 *
 * Gibt null zurueck bei unbekannter Report-ID oder einem Payload, der zu
 * kurz fuer die erwarteten Felder ist (manche Modelle variieren die Laenge
 * des Tasten-Reports je nach Tastenzahl, tragen aber immer mindestens 1
 * Byte).
 */
export function parseSpaceMouseReport(reportId: number, data: DataView): SpaceMouseReportResult | null {
  switch (reportId) {
    case SPACEMOUSE_REPORT_ID.TRANSLATION: {
      if (data.byteLength < 6) return null;
      return {
        translation: {
          x: data.getInt16(0, true),
          y: data.getInt16(2, true),
          z: data.getInt16(4, true),
        },
      };
    }
    case SPACEMOUSE_REPORT_ID.ROTATION: {
      if (data.byteLength < 6) return null;
      return {
        rotation: {
          rx: data.getInt16(0, true),
          ry: data.getInt16(2, true),
          rz: data.getInt16(4, true),
        },
      };
    }
    case SPACEMOUSE_REPORT_ID.BUTTONS: {
      if (data.byteLength < 1) return null;
      // Little-endian Bitmaske ueber so viele Bytes, wie der Report traegt -
      // deckt Modelle mit mehr als 8 Tasten ab (>1 Byte Maske). Auf 4 Bytes
      // gedeckelt (32 Bit) - JS' Bitoperatoren arbeiten ohnehin nur auf
      // 32-Bit-Ints, mehr Tasten hat aktuell kein SpaceMouse-Modell.
      let mask = 0;
      const byteCount = Math.min(data.byteLength, 4);
      for (let i = byteCount - 1; i >= 0; i--) {
        mask = ((mask << 8) | data.getUint8(i)) >>> 0;
      }
      return { buttons: mask };
    }
    default:
      return null;
  }
}
