// Standard-Aussenmasse von ISO-Seecontainern in Metern (Laenge x Breite x Hoehe).
// Dienen als Startwerte fuer den Schallschutz-Sondercontainer - spaeter frei
// konfigurierbar, siehe Projektbrief.
export type ContainerSizeId = "20ft" | "40ft";

export interface ContainerSize {
  id: ContainerSizeId;
  label: string;
  length: number;
  width: number;
  height: number;
}

export const CONTAINER_SIZES: Record<ContainerSizeId, ContainerSize> = {
  "20ft": { id: "20ft", label: "20-Fuß-Container", length: 6.058, width: 2.438, height: 2.591 },
  "40ft": { id: "40ft", label: "40-Fuß-Container", length: 12.192, width: 2.438, height: 2.591 },
};

export const DEFAULT_CONTAINER_SIZE: ContainerSizeId = "20ft";
