import type { ContainerSize } from "../constants/containerSizes";
import { WALL_THICKNESS } from "../constants/openingTypes";
import type { Opening, WallId } from "../types/openings";
import { Wall } from "./Wall";

interface ContainerProps {
  size: ContainerSize;
  openings: Opening[];
}

const WALL_COLOR = "#c2410c";
const ROOF_FLOOR_COLOR = "#9a3412";

// Container als hohle Schale aus 4 einzeln schneidbaren Seitenwaenden + einer
// massiven Dach-/Bodenplatte (bewusst OHNE Durchbrueche in dieser
// Ausbaustufe, siehe Projektbrief). Jede Seitenwand ist eine eigene Wall-
// Instanz, damit Durchbrueche pro Wand aus der Geometrie herausgeschnitten
// werden koennen statt nur als Overlay/Textur zu erscheinen.
export function Container({ size, openings }: ContainerProps) {
  const { length: L, width: W, height: H } = size;
  const t = WALL_THICKNESS;

  const openingsByWall = (wall: WallId) => openings.filter((o) => o.wall === wall);

  return (
    <group>
      <Wall
        position={[0, H / 2, W / 2 - t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsByWall("front")}
        color={WALL_COLOR}
      />
      <Wall
        position={[0, H / 2, -W / 2 + t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsByWall("back")}
        color={WALL_COLOR}
      />
      <Wall
        position={[-L / 2 + t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsByWall("left")}
        color={WALL_COLOR}
      />
      <Wall
        position={[L / 2 - t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsByWall("right")}
        color={WALL_COLOR}
      />

      <mesh position={[0, H - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, t, W]} />
        <meshStandardMaterial color={ROOF_FLOOR_COLOR} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, t / 2, 0]} receiveShadow>
        <boxGeometry args={[L, t, W]} />
        <meshStandardMaterial color={ROOF_FLOOR_COLOR} roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}
