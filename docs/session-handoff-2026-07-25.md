# Session Handoff — 2026-07-25

Written for a fresh Claude Code session picking this project up cold. Read
this first, then `docs/baugruppen-architektur.md` for the Baugruppen data
model specifically.

## What this project is

`schallschutz-konfigurator` — a client-only (no server, no login) React 19 +
Vite + TypeScript 3D configurator for custom soundproof shipping containers.
react-three-fiber/drei for the 3D viewer, three-bvh-csg for wall cutouts,
Tailwind v4 for styling, `motion/react` for icon animations. Configurations
are saved/loaded as AES-GCM "encrypted" files (`.sszkonfig` single container,
`.sszprojekt` multi-container project) — this is an editor-deterrent, not
real security, and is documented as such in `fileCrypto.ts`.

## Current deployment state (as of this handoff)

- **`main`** → production, live at `hayse.de`. Currently at commit
  `189b45c` — the full real app, includes everything described below.
- **`night-2026-07-23-beta`** → deploys via Netlify branch-deploy to
  `hayse.de/beta`. Currently at commit `a0d5e54` — **intentionally a dummy
  placeholder**, not a mirror of main. `src/App.tsx` on this branch renders
  a single static "keine Beta-Version gepusht" page with no router and no
  imports of the real app (bundle: ~191KB/16 modules vs. ~1.1MB/1134
  modules for the real app). This is deliberate: Jonas wants it obvious at
  a glance whether a real beta test is running, instead of beta silently
  mirroring production.
- **`archiv/rollen-mitarbeiter-backend-2026-07-23`** → frozen archive of the
  old multi-role (Kunde/Konstrukteur/Admin/Verkäufer) mock-backend version,
  from before the 2026-07-23 pivot to a pure client-side single-role app.
  Not touched, not relevant to current work.

### To start a new beta test cycle
```
git checkout night-2026-07-23-beta
git merge --ff-only origin/main   # brings back the real app
# ... do work, commit, push freely to night-2026-07-23-beta (pre-approved, see below) ...
# when ready to promote:
git checkout main
git merge --ff-only origin/night-2026-07-23-beta
git push origin main
# then put beta back to resting state: restore the dummy src/App.tsx
# (see git show a0d5e54:src/App.tsx for the exact content) and commit+push
```

### Standing permissions (also saved in Claude's cross-session memory)
- Push to `night-2026-07-23-beta` without asking first — Jonas said so
  explicitly ("nach 'beta' kannst du ohne fragen immer pushen"). Still write
  a real commit message, just skip the "should I push?" question.
- Pushing to `main` (production) still requires Jonas' explicit go-ahead
  each time.

## Access

- `/intern` — hidden Konstrukteur/employee view, not linked anywhere, only
  reachable via direct URL. Access code (client-side text comparison only,
  `InternalPage.tsx`, **not real auth**): `ssk-intern-2026`

## Architecture map

- `src/pages/WorkspacePage.tsx` — the one big editable page. Handles BOTH
  single-container ("Einzel") and Baugruppen ("Ensemble") modes in one
  component with one shared 3D viewer; mode is picked via a dropdown in
  `AppShell` (bridged through `ModeSwitchContext.tsx`) and stored in local
  `mode` state, not the URL. `/konfigurator` and `/projekt` both render this
  same page — the route is read once on mount only to pick the *initial*
  mode. Switching modes carries the current single config into the
  Baugruppe as a new instance (or writes back if editing an existing one).
- `src/pages/KonfiguratorPage.tsx` — read-only single-container detail
  viewer (no editing, no save/reset). Used by `InternalPage.tsx` and for
  drilling into one container from a loaded Baugruppe.
- `src/pages/InternalPage.tsx` + `src/pages/InternalProjectViewer.tsx` —
  the `/intern` employee view. Loads either file type; `.sszprojekt` shows
  `InternalProjectViewer` (read-only Baugruppe list + 3D view), with a
  "Details ansehen" link per container that drills into `KonfiguratorPage`
  (with a "Zurück zur Baugruppe" back-link).
- `src/pages/StartPage.tsx` — landing page. "Konfiguration starten" is a
  compound button: main area navigates to `/konfigurator` or `/projekt`
  depending on a small round Einzel/Ensemble toggle (same swap-arrow icon
  as Schnitt's "Richtung wechseln" in `Scene.tsx`). "Konfiguration laden"
  detects `.sszkonfig` vs `.sszprojekt` by extension and routes/decodes
  accordingly.
- `src/components/Scene.tsx` — single-container 3D viewer.
- `src/components/ProjectScene3D.tsx` — Baugruppen 3D viewer. Each instance
  gets an invisible/semi-transparent footprint plane (drag target +
  collision-color feedback, extends slightly beyond the container's real
  footprint so the color is actually visible from any camera angle — see
  `FOOTPRINT_MARGIN_M`) rendered under the real `Container` component.
- `src/components/SectionAndViewPanel.tsx` — extracted from `Scene.tsx` so
  both viewers share the same Schnitt (section-cut)/Ansicht (view style)
  bottom-left panels. Exports `useSectionPlane(size)` hook (state + THREE.Plane
  computation) and `<SectionAndViewPanel>` (pure presentation). In the
  Baugruppen viewer, Schnitt cuts whichever container is *selected*
  (disabled hint if none selected); Ansicht (background/shadows/terrain/
  style) applies scene-wide since there's only one shared environment —
  see the long comment on `onSetAllViewStyle` in `ProjectScene3D.tsx`.
- `src/components/ViewerToolbar.tsx` — Home button (top-right of the
  ViewCube, right-edge-aligned with it, Inventor-style) + Undo/Redo buttons
  (top-right corner of the *viewer*, deliberately NOT next to Home — Jonas
  was explicit these should be separate). Also renders an invisible
  `data-tour="viewcube-anchor"` div for the tutorial, since the real
  ViewCube is WebGL/`GizmoHelper` with no real DOM node to anchor a tour
  step to.
- `src/components/GrundeinstellungenOverlay.tsx` — modal shown on entering
  the configurator. Both modes ask "Bezeichnung"; single/Einzel mode also
  asks "Größe" (Standard = one of 3 presets, Sonder = free L/W/H) and
  "Farbe" (Standard = `RAL_STANDARD_COLORS`, Sonder = full
  `RAL_SPECIAL_COLORS`, ~211 real RAL Classic colors). Shown only when
  starting a genuinely new project — see the exact skip condition in
  `WorkspacePage.tsx`'s `showGrundeinstellungen` initializer (skipped if a
  file was loaded via routeConfig/routeProject, or if a meaningful
  non-default draft/project is already cached) — and re-shown again on
  "Zurücksetzen"/"Projekt zurücksetzen", since resetting is just as much
  "starting a new project yourself" as the very first visit.
- `src/tour/TourContext.tsx` — has a `suppressed` flag (added this session)
  so the tutorial can be hidden without losing its step position. Used so
  the tour never visually collides with the Grundeinstellungen overlay: the
  tour starts normally (even simultaneously with the overlay on first
  visit) but stays suppressed while `showGrundeinstellungen` is true,
  reappearing at the *same step* once the overlay closes — including when
  the overlay reappears mid-tour via a later reset, it resumes correctly
  instead of restarting from step 1.
- `src/components/TerrainBackground.tsx` — procedural "Gelände" background
  (trees, meadow, sky/clouds, optional ground relief at higher detail
  levels — 4 levels: low/medium/high/ultra via `terrainDetail`). Takes an
  `extentM` prop (container half-diagonal in `Scene.tsx`, furthest-instance
  reach in `ProjectScene3D.tsx`) so the tree ring and ground plane scale
  outward for large containers/spread-out Baugruppen instead of ending up
  with trees planted inside the building.
- `src/constants/ralColors.ts` — `RAL_STANDARD_COLORS` (2: Moosgrün,
  Signalgrau) + `RAL_SPECIAL_COLORS` (~211, the full RAL Classic palette,
  pulled from real reference data this session — previously only a
  41-color curated subset).
- `src/utils/collision.ts` — SAT collision for rotated rectangles, used
  unchanged by both the (now-removed) 2D Baugruppen view and the current
  3D one since it's rendering-agnostic.
- `src/config/` — `configFileCodec.ts`/`projectFileCodec.ts` (encode/decode
  + extensions `.sszkonfig`/`.sszprojekt`), `projectTypes.ts`
  (`ContainerInstance`/`ProjectConfig`), `draftStore.ts`/
  `projectDraftStore.ts` (localStorage autosave, keys `ssk_draft_config` /
  `ssk_project_draft`), `defaultContainerConfig.ts`.
- `src/components/icons/` — Lucide-derived icons animated via `motion/react`.
  `AnimatedButton.tsx` + `IconHoverContext.tsx`: icons don't self-animate on
  hover, they read hover/press state from the wrapping `AnimatedButton` via
  context (Motion/React's `whileHover` variant propagation does NOT reach
  child components automatically — confirmed empirically, not assumed).

## Established workflow / conventions (follow these)

- Millimeters everywhere in the data layer; only rendering components
  convert to meters locally via a per-file `MM_TO_M = 1/1000` constant.
- Real umlauts always (ä/ö/ü/ß), never oe/ue/ae/ss substitutes, in every
  user-visible string and comment.
- Before trusting a Playwright screenshot of a blank/white 3D canvas with
  zero console errors on the **dev server**: this is a known, repeatedly
  confirmed React 19 StrictMode dev-only artifact ("Context Lost"), not a
  real bug. Re-verify against a production build instead
  (`npm run build && npm run preview -- --port <free port>`).
- Playwright test gotcha hit repeatedly this session: `getByRole("button",
  { name: "X" })` without `exact: true` does *case-insensitive substring*
  matching — "Weiter" matches "Erweiterte Einstellungen", causing strict-mode
  violations or silently clicking the wrong element. Always use
  `exact: true` for short/common button labels in this codebase.
- Typecheck (`npx tsc -b --noEmit`) and `npm run build` after every
  meaningful change; visually verify anything UI/3D-related via Playwright
  screenshots that are actually read, not just checked for absence of
  console errors.
- When something looks structurally identical across two files (this
  session: the Schnitt/Ansicht panel logic), extract a shared component
  rather than duplicating — but don't over-abstract single-use logic.

## What got built this session (chronological)

Earlier in the (much longer) overnight session, before this transcript:
5 concrete bug fixes, then an open-ended "build whatever you think is best,
I can't respond for 5h" directive that produced: the Baugruppen (multi-
container project) feature with drag/rotate/SAT collision in a 2D SVG
top-down view, mate/flush alignment, loading `.sszkonfig` into a Baugruppe,
a mode-switch button, Netlify branch-deploy + `hayse.de/beta` redirect,
4 terrain detail levels, and icons animating on whole-button hover instead
of icon-only hover.

This session's major arc:
1. Replaced the 2D SVG Baugruppen view with a real 3D viewer
   (`ProjectScene3D.tsx`), merging the single-container and Baugruppen
   editors into one `WorkspacePage.tsx` with a dropdown mode switch.
   Found and fixed two real bugs while verifying the 3D drag interaction:
   OrbitControls was rotating the camera *simultaneously* with a container
   drag (its native DOM listener isn't stopped by `stopPropagation()` on
   the r3f pointer event — a three.js/r3f quirk), and the collision-red
   footprint color was completely invisible from any camera angle because
   it sat exactly under the opaque container at ground level (fixed by
   extending the footprint plane beyond the container's real footprint).
2. Large follow-up feature batch: StartPage Einzel/Ensemble toggle button,
   Grundeinstellungen overlay, undo/redo (debounced history, one entry per
   edit "burst" not per keystroke/drag-frame, `Ctrl+Z`/`Ctrl+Y`), middle-
   mouse-button pan (was dolly/zoom by default), Inventor-style Home
   button, Schnitt/Ansicht panels brought into the Baugruppen viewer,
   full RAL Classic color list, "Konfiguration laden" accepting both file
   types, an "Anfragen" button for Baugruppen, `/intern` supporting
   Baugruppen + drilling into individual containers, and two new tutorial
   steps covering the ViewCube/camera controls and the undo/redo/Home
   toolbar.
3. Follow-up precision fixes from visual feedback: moved Undo/Redo to the
   viewer's top-right corner (was incorrectly next to Home); repositioned
   Home to sit cleanly above-right of the ViewCube, right-edge-aligned,
   with more clearance (was overlapping the cube); made
   `TerrainBackground`'s tree ring/ground scale with container/Baugruppe
   size; fixed a real tour/overlay collision bug (see `TourContext.tsx`
   `suppressed` above) that also covered the "resume, don't restart" case
   for a mid-tour reset.
4. Promoted the whole batch to `main` (clean fast-forward, zero
   divergence) and turned the beta branch into the resting-state dummy
   described above.

## Known non-issues (don't chase these as bugs)

- Blank 3D canvas + "THREE.WebGLRenderer: Context Lost" in `npm run dev`
  Playwright screenshots, zero console errors: React 19 StrictMode
  dev-only artifact, never happens in a production build. Re-test against
  `vite preview` instead.
- Nonlinear/non-obvious mapping between mouse-drag pixels and world-space
  container movement in `ProjectScene3D.tsx`: this is correct, expected
  perspective-camera behavior (ray-ground intersection), not a bug — the
  camera also dynamically reframes (`cameraDistance`/`maxReachM`) as
  instances move, which compounds with perspective foreshortening. Don't
  try to reverse-engineer a fixed px-per-mm ratio; if you need to drive a
  drag precisely in a test, use closed-loop homing (read the actual
  position after small probe moves, compute a local Jacobian, iterate) —
  see the session's Playwright scripts for a worked example.

## Open items / not done

- No automated regression test suite exists — everything is verified ad
  hoc via one-off Playwright scripts in a scratchpad directory (not
  committed). Worth considering a small persistent Playwright test file in
  the repo if this pace of iteration continues.
- The `configs/` folder at the repo root (a couple of stray `.sszkonfig`
  test-download files) is untracked and has been deliberately left out of
  every commit this session as clutter — not part of the app. Fine to
  delete or leave; just don't accidentally `git add -A` it into a commit.
- Bundle size warning on the real app build (`AccordionSection`/
  `ProjectScene3D` chunk ~1.1MB minified) is pre-existing, not addressed
  this session — flagged by Vite on every build, not a regression.
