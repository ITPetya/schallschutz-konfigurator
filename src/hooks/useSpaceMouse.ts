import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSpaceMouseReport, ZERO_SPACEMOUSE_AXES, type SpaceMouseAxisState } from "../utils/spaceMouseInput";

// 0x256F = 3Dconnexion (aktuelle eigene USB-Vendor-ID). 0x046D = Logitech -
// 3Dconnexion gehoerte frueher zu Logitech, manche aeltere/uebergangsweise
// ausgelieferte SpaceMouse-Modelle melden sich noch unter dieser Vendor-ID.
// Beide aufgenommen fuer breitere Geraete-Abdeckung (Jonas' Vorgabe
// 2026-08-11).
const SPACEMOUSE_VENDOR_IDS = [0x256f, 0x046d] as const;

export interface UseSpaceMouseResult {
  // 'hid' in navigator - nur in Chromium-basierten Browsern (Chrome/Edge)
  // vorhanden, siehe ViewerToolbar.tsx: der Button blendet sich komplett
  // aus, statt in Firefox/Safari kaputt/mit Fehlermeldung zu erscheinen
  // (Jonas: "nur in den Browsern die klappen").
  supported: boolean;
  connected: boolean;
  deviceName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  // Aktuellste Achsenwerte - per Ref statt State, damit ein eingehender
  // HID-Report (potenziell sehr haeufig) NICHT bei jedem Event einen
  // React-Rerender ausloest. Wird stattdessen einmal pro Animationsframe in
  // SpaceMouseCameraRig.tsx gelesen (siehe dort/useFrame) - genau das vom
  // Aufgabenauftrag verlangte Muster ("read the latest cached axis state
  // ... rather than driving camera updates directly from the HID event
  // handler").
  axisRef: React.RefObject<SpaceMouseAxisState>;
  buttonsRef: React.RefObject<number>;
}

/**
 * Verbindung zu einer 3Dconnexion SpaceMouse per WebHID. Oeffnet beim ersten
 * Laden automatisch ein bereits einmal erlaubtes Geraet erneut (WebHID-
 * Rechte gelten dauerhaft pro Origin, wie bei Kamera/Mikrofon - kein
 * erneuter Picker-Dialog noetig), reagiert auf physisches Abstecken, und
 * cached die zuletzt gemeldeten 6-DOF-Werte in einer Ref fuer den r3f-
 * Kamera-Loop.
 */
export function useSpaceMouse(): UseSpaceMouseResult {
  const supported = typeof navigator !== "undefined" && "hid" in navigator;

  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<HIDDevice | null>(null);
  const axisRef = useRef<SpaceMouseAxisState>({ ...ZERO_SPACEMOUSE_AXES });
  const buttonsRef = useRef(0);

  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    const result = parseSpaceMouseReport(event.reportId, event.data);
    if (!result) return;
    if (result.translation) Object.assign(axisRef.current, result.translation);
    if (result.rotation) Object.assign(axisRef.current, result.rotation);
    if (result.buttons !== undefined) buttonsRef.current = result.buttons;
  }, []);

  const attachDevice = useCallback(
    async (device: HIDDevice) => {
      try {
        if (!device.opened) await device.open();
        deviceRef.current = device;
        device.addEventListener("inputreport", handleInputReport);
        setConnected(true);
        setDeviceName(device.productName || "SpaceMouse");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verbindung zur SpaceMouse fehlgeschlagen");
      }
    },
    [handleInputReport],
  );

  const detachDevice = useCallback(() => {
    const device = deviceRef.current;
    if (device) device.removeEventListener("inputreport", handleInputReport);
    deviceRef.current = null;
    axisRef.current = { ...ZERO_SPACEMOUSE_AXES };
    buttonsRef.current = 0;
    setConnected(false);
    setDeviceName(null);
  }, [handleInputReport]);

  // Beim Laden: ein bereits erlaubtes Geraet automatisch OHNE erneuten
  // Picker-Dialog wieder oeffnen (siehe getDevices()-Dokumentation: liefert
  // nur Geraete, denen der Nutzer schon einmal per requestDevice()
  // zugestimmt hat).
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.hid
      .getDevices()
      .then((devices) => {
        if (cancelled) return;
        const known = devices.find((d) => (SPACEMOUSE_VENDOR_IDS as readonly number[]).includes(d.vendorId));
        if (known) void attachDevice(known);
      })
      .catch(() => {
        // getDevices() selbst sollte nie ablehnen, aber falls doch: kein
        // Auto-Connect, Nutzer kann trotzdem manuell per connect() verbinden.
      });
    return () => {
      cancelled = true;
    };
    // Nur einmal beim Mount pruefen - attachDevice ist stabil (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  // Physisches Abstecken sauber erkennen - der Browser meldet das global auf
  // navigator.hid, nicht (nur) am Geraet selbst.
  useEffect(() => {
    if (!supported) return;
    function handleDisconnect(event: HIDConnectionEvent) {
      if (deviceRef.current && event.device === deviceRef.current) {
        detachDevice();
      }
    }
    navigator.hid.addEventListener("disconnect", handleDisconnect);
    return () => navigator.hid.removeEventListener("disconnect", handleDisconnect);
  }, [supported, detachDevice]);

  const connect = useCallback(async () => {
    if (!supported) return;
    try {
      setError(null);
      // Loest Chromes/Edges nativen Geraete-Auswahldialog aus - unvermeidbar
      // beim ersten Verbinden, das ist Browser-eigene Berechtigungs-UI, keine
      // selbstgebaute Oberflaeche dafuer noetig (siehe Aufgabenbeschreibung).
      const devices = await navigator.hid.requestDevice({
        filters: SPACEMOUSE_VENDOR_IDS.map((vendorId) => ({ vendorId })),
      });
      const device = devices[0];
      if (device) await attachDevice(device);
    } catch (err) {
      // Nutzer hat den Picker abgebrochen (AbortError) - kein echter Fehler,
      // dafuer keine Fehlermeldung anzeigen.
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    }
  }, [supported, attachDevice]);

  const disconnect = useCallback(() => {
    const device = deviceRef.current;
    detachDevice();
    if (device?.opened) void device.close();
  }, [detachDevice]);

  return useMemo(
    () => ({ supported, connected, deviceName, error, connect, disconnect, axisRef, buttonsRef }),
    [supported, connected, deviceName, error, connect, disconnect],
  );
}
