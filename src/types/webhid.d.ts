// Minimale WebHID-Typdeklarationen (Jonas' Vorgabe 2026-08-11: 3Dconnexion
// SpaceMouse-Unterstuetzung) - TypeScripts mitgelieferte "DOM"-Lib (siehe
// tsconfig.app.json) kennt navigator.hid/HIDDevice NICHT, das ist erst in
// neueren, separat gepflegten DOM-Typpaketen enthalten, die dieses Projekt
// nicht installiert hat. Statt einer vollen externen Typ-Abhaengigkeit nur
// den Ausschnitt deklariert, der hier tatsaechlich gebraucht wird (siehe
// https://wicg.github.io/webhid/ fuer die vollstaendige Spezifikation).
// Nur in Chromium-basierten Browsern (Chrome/Edge) tatsaechlich zur
// Laufzeit vorhanden - siehe hooks/useSpaceMouse.ts's "hid" in navigator
// Laufzeitpruefung, die dieser Datei entspricht (statischer Typ hier
// bedeutet NICHT, dass die API zur Laufzeit ueberall existiert).

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[];
}

interface HIDReportItem {
  isAbsolute?: boolean;
  isArray?: boolean;
  isRange?: boolean;
  hasNull?: boolean;
  usages?: number[];
  usageMinimum?: number;
  usageMaximum?: number;
  reportSize?: number;
  reportCount?: number;
  unitExponent?: number;
  unitSystem?: string;
  logicalMinimum?: number;
  logicalMaximum?: number;
  physicalMinimum?: number;
  physicalMaximum?: number;
}

interface HIDReportInfo {
  reportId?: number;
  items?: HIDReportItem[];
}

interface HIDCollectionInfo {
  usagePage?: number;
  usage?: number;
  type?: number;
  children?: HIDCollectionInfo[];
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
  featureReports?: HIDReportInfo[];
}

interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

interface HIDDeviceEventMap {
  inputreport: HIDInputReportEvent;
}

declare class HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: HIDCollectionInfo[];
  open(): Promise<void>;
  close(): Promise<void>;
  forget(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
  addEventListener<K extends keyof HIDDeviceEventMap>(
    type: K,
    listener: (this: HIDDevice, ev: HIDDeviceEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof HIDDeviceEventMap>(
    type: K,
    listener: (this: HIDDevice, ev: HIDDeviceEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

interface HIDEventMap {
  connect: HIDConnectionEvent;
  disconnect: HIDConnectionEvent;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
  addEventListener<K extends keyof HIDEventMap>(
    type: K,
    listener: (this: HID, ev: HIDEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof HIDEventMap>(
    type: K,
    listener: (this: HID, ev: HIDEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Navigator {
  readonly hid: HID;
}
