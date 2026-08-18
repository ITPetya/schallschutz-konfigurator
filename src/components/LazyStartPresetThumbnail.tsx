import { lazy } from "react";

// Eigener lazy Chunk (Jonas' Vorgabe 2026-08-18, siehe App.tsx-Kommentar zum
// selben Prinzip bei WorkspacePage/InternalPage): StartPresetThumbnail.tsx
// zieht ueber Container.tsx den kompletten three.js/r3f/three-bvh-csg-Stack
// nach (>1MB minifiziert) - StartPage.tsx wird (anders als WorkspacePage)
// bewusst NICHT lazy geladen (sie ist die allererste Seite, die jeder Nutzer
// sieht), ein direkter Eager-Import haette also GENAU den 2026-07-23
// behobenen Fehler wiederholt (voller 3D-Stack schon auf der Startseite).
// EIN gemeinsamer lazy()-Wrapper statt je eines eigenen in
// StartPresetCard.tsx und im Vorlade-Batch (StartPresetCarousel.tsx) - beide
// brauchen exakt dieselbe Komponente, ein gemeinsamer Import haelt den
// Suspense-Chunk eindeutig statt ihn zweimal zu deklarieren.
export const LazyStartPresetThumbnail = lazy(() =>
  import("./StartPresetThumbnail").then((m) => ({ default: m.StartPresetThumbnail })),
);
