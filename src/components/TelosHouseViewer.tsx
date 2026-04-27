'use client';

import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { useState, Suspense, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

// Room descriptions for Telos House
const roomDescriptions: { [key: string]: string } = {
  gallery: 'A collaboration space for trade of ideas and knowledge.',
  bathroom1: 'The birth of the most innovative ideas come from when people are alone with their minds.',
  hardwareLab: 'Where the ideas are actualised and brought into life.',
  techRoom: 'Where our hardest workers spend their time with their heads down.',
  hallway: 'The trunk of the tree, the start of endless possibilities.',
  library: 'An endless resource of wisdom that encapsulates the ideas from hundreds of countless freethinkers throughout human history.',
  closet: 'A resource that keeps our founders looking fit for any occasion that might meet them.',
  bathroom2: 'The birth of the most innovative ideas come from when people are alone with their minds.',
  warroomServerHub: 'A place for strategizing collective ideas/ Where the online identity of our ideas is kept alive.',
  bathroom3: 'The birth of the most innovative ideas come from when people are alone with their minds.',
  kitchen: 'Fuel for the bellies is a great opportunity for further collaborative discussion and a break to keep everyone motivated.',
};

const roomLabels: { [key: string]: string } = {
  gallery: 'Gallery',
  bathroom1: 'Bathroom I',
  hardwareLab: 'Hardware Lab',
  techRoom: 'Tech Room',
  hallway: 'Hallway',
  library: 'Library',
  closet: 'Closet',
  bathroom2: 'Bathroom II',
  warroomServerHub: 'Warroom / Server Hub',
  bathroom3: 'Bathroom III',
  kitchen: 'Kitchen',
};

const roomCodes: { [key: string]: string } = {
  gallery: 'GAL/01',
  bathroom1: 'BTH/I',
  hardwareLab: 'HWL/02',
  techRoom: 'TCR/03',
  hallway: 'HLW/04',
  library: 'LIB/05',
  closet: 'CLS/06',
  bathroom2: 'BTH/II',
  warroomServerHub: 'WSH/07',
  bathroom3: 'BTH/III',
  kitchen: 'KCH/08',
};

const ROOM_ORDER: string[] = [
  'gallery',
  'hallway',
  'library',
  'kitchen',
  'hardwareLab',
  'techRoom',
  'warroomServerHub',
  'closet',
  'bathroom1',
  'bathroom2',
  'bathroom3',
];

interface RoomConfig {
  position: [number, number, number];
  size: [number, number, number];
}

const manualRoomPositions: { [key: string]: RoomConfig } = {
  gallery: { position: [0, 1, -4.01], size: [5.7, 1.7, 8] },
  bathroom1: { position: [3.75, 1, -1.6], size: [1.7, 1.7, 2.5] },
  hardwareLab: { position: [3.4, 1, 0.8], size: [2.55, 1.7, 2.2] },
  techRoom: { position: [3.4, 1, 3.6], size: [2.6, 1.7, 3.5] },
  hallway: { position: [1.4, 1, 2.8], size: [1.3, 1.7, 5.5] },
  library: { position: [-1.1, 1, 1.3], size: [3.5, 1.7, 2.2] },
  closet: { position: [-0.5, 1, 3.55], size: [1.5, 1.7, 1.95] },
  bathroom2: { position: [-2.05, 1, 3.7], size: [1.5, 1.7, 2.4] },
  warroomServerHub: { position: [-0.55, 1, 7], size: [2.75, 1.7, 2.4] },
  bathroom3: { position: [-2.5, 1, 6.155], size: [0.7, 1.7, 2.3] },
  kitchen: { position: [3.7, 1, -5.5], size: [1.7, 1.7, 5.1] },
};

interface HouseModelProps {
  onRoomClick: (roomName: string, position: THREE.Vector3) => void;
  onModelClick: () => void;
  isZoomed: boolean;
  hoveredRoom: string | null;
  setHoveredRoom: (room: string | null) => void;
  rotationProgress: number;
  /**
   * Uniform multiplier applied to the wrapping group. Scales the model AND
   * the room hover boxes together (they share the wrapper's coordinate
   * system) so the highlights stay aligned with the visible walls at any
   * scale boost.
   */
  scaleBoost?: number;
}

export interface HouseModelHandle {
  selectRoom: (roomName: string) => void;
}

const HouseModel = forwardRef<HouseModelHandle, HouseModelProps>(function HouseModel(
  { onRoomClick, onModelClick, isZoomed, hoveredRoom, setHoveredRoom, rotationProgress, scaleBoost = 1 },
  ref,
) {
  const { scene } = useGLTF('/models/telos-house.glb');
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.Group>(null);
  const [roomMeshes, setRoomMeshes] = useState<Map<string, THREE.Mesh>>(new Map());
  const startRotationRef = useRef(0);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.nativeEvent.button !== 0) return;

    event.stopPropagation();

    if (groupRef.current) {
      startRotationRef.current = groupRef.current.rotation.y;
    }

    const object = event.object;
    const roomName = object.userData.roomName;

    if (roomName && object instanceof THREE.Mesh) {
      const boundingBox = new THREE.Box3().setFromObject(object);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      const worldPos = center.multiplyScalar(4);

      onRoomClick(roomName, worldPos);
    }
  };

  // Programmatic select — runs the exact same path as a 3D click,
  // so the camera angle ends up identical for sidebar selection.
  useImperativeHandle(ref, () => ({
    selectRoom: (roomName: string) => {
      const mesh = roomMeshes.get(roomName);
      if (!mesh) return;

      if (groupRef.current) {
        startRotationRef.current = groupRef.current.rotation.y;
      }

      const boundingBox = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const worldPos = center.multiplyScalar(4);
      onRoomClick(roomName, worldPos);
    },
  }), [roomMeshes, onRoomClick]);

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const object = event.object;
    const roomName = object.userData.roomName;

    if (roomName) {
      setHoveredRoom(roomName);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredRoom(null);
    document.body.style.cursor = 'default';
  };

  // Rotation animation synchronized with camera zoom
  useFrame((_state, delta) => {
    if (groupRef.current) {
      if (isZoomed) {
        // Rotate to 135 degrees (3 * Math.PI / 4) to face sideways on screen
        const targetRotation = (3 * Math.PI) / 4; // 135 degrees

        // Only lerp if rotation hasn't finished (rotationProgress < 1)
        if (rotationProgress < 1) {
          groupRef.current.rotation.y = THREE.MathUtils.lerp(
            startRotationRef.current,
            targetRotation,
            rotationProgress
          );
        } else {
          // Lock at target rotation once animation completes
          groupRef.current.rotation.y = targetRotation;
        }
      } else {
        // Auto-rotate when not zoomed
        groupRef.current.rotation.y += delta * 0.2;
        startRotationRef.current = groupRef.current.rotation.y; // Keep updating start position
      }
    }

    // Sync outline rotation
    if (outlineRef.current && groupRef.current) {
      outlineRef.current.rotation.y = groupRef.current.rotation.y;
    }
  });

  // Create outline effect - only for actual house geometry
  useEffect(() => {
    if (outlineRef.current && scene) {
      const outlineGroup = outlineRef.current;
      outlineGroup.clear();

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Check if mesh has actual geometry (vertices)
          const geometry = child.geometry;
          if (geometry && geometry.attributes.position && geometry.attributes.position.count > 0) {
            // Clone the mesh for outline
            const outlineMesh = child.clone();

            // Create outline material
            outlineMesh.material = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              side: THREE.BackSide,
            });

            // Apply slightly larger scale to this specific mesh
            outlineMesh.scale.multiplyScalar(1.015); // Subtle outline

            outlineGroup.add(outlineMesh);
          }
        }
      });
    }
  }, [scene]);

  // Create room boxes using manual configuration
  useEffect(() => {
    if (!groupRef.current) return;

    const meshMap = new Map<string, THREE.Mesh>();

    Object.entries(manualRoomPositions).forEach(([roomName, config]) => {
      const [x, y, z] = config.position;
      const [width, height, depth] = config.size;

      const boxGeometry = new THREE.BoxGeometry(width, height, depth);
      const boxMaterial = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0,
        emissive: new THREE.Color(0x4444ff),
        emissiveIntensity: 0,
        wireframe: false,
      });

      const roomBox = new THREE.Mesh(boxGeometry, boxMaterial);
      roomBox.position.set(x, y, z);
      roomBox.userData.roomName = roomName;
      roomBox.userData.clickable = true;

      groupRef.current!.add(roomBox);
      meshMap.set(roomName, roomBox);
    });

    setRoomMeshes(meshMap);
  }, [scene]);

  // Hover-driven emission on the room boxes
  useEffect(() => {
    roomMeshes.forEach((mesh, roomName) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (hoveredRoom === roomName) {
        material.emissiveIntensity = 0.8;
        material.opacity = 0.5;
      } else {
        material.emissiveIntensity = 0;
        material.opacity = 0;
      }
    });
  }, [hoveredRoom, roomMeshes]);

  return (
    // Outer wrapper applies the uniform scaleBoost. Both the outline group
    // and the main group (which contains the primitive AND the room hover
    // boxes) sit inside it, so the highlight boxes track the visible walls
    // regardless of the boost factor.
    <group scale={scaleBoost}>
      {/* Outline layer - rendered behind */}
      <group ref={outlineRef} renderOrder={-1} scale={4} />

      {/* Main model */}
      <group
        ref={groupRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive
          object={scene}
          scale={4}
        />
      </group>
    </group>
  );
});

interface CameraControllerProps {
  isZoomed: boolean;
  roomPosition: THREE.Vector3 | null;
  setRotationProgress: (progress: number) => void;
  isSwitchingRooms: boolean;
}

function CameraController({ isZoomed, roomPosition, setRotationProgress, isSwitchingRooms }: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    const animateCamera = () => {
      const startPos = new THREE.Vector3().copy(camera.position);

      let endPos: THREE.Vector3;
      let isResetting = false;

      if (roomPosition) {
        const distanceFromCenter = Math.sqrt(
          roomPosition.x * roomPosition.x +
          roomPosition.z * roomPosition.z
        );

        const isCornerRoom = distanceFromCenter > 10;

        if (isCornerRoom) {
          endPos = new THREE.Vector3(
            roomPosition.x * 0.5,
            roomPosition.y + 10,
            roomPosition.z * 0.5
          );
        } else {
          endPos = new THREE.Vector3(
            roomPosition.x,
            roomPosition.y + 5,
            roomPosition.z + 3
          );
        }
      } else if (isZoomed) {
        endPos = new THREE.Vector3(0, 12, 0);
      } else {
        endPos = new THREE.Vector3(10, 8, 10);
        isResetting = true;
      }

      const rotationDuration = isResetting ? 150 : (isSwitchingRooms ? 0 : 800);
      const cameraDuration = isResetting ? 300 : (isSwitchingRooms ? 300 : 1000);
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const totalProgress = Math.min(elapsed / cameraDuration, 1);

        if (isResetting) {
          const progress = elapsed / cameraDuration;
          const eased = 1 - Math.pow(1 - progress, 2);
          camera.position.lerpVectors(startPos, endPos, eased);
          setRotationProgress(0);
        } else if (isSwitchingRooms) {
          setRotationProgress(1);
          const progress = elapsed / cameraDuration;
          const eased = 1 - Math.pow(1 - progress, 3);
          camera.position.lerpVectors(startPos, endPos, eased);
        } else {
          if (elapsed < rotationDuration) {
            const rotationProgress = elapsed / rotationDuration;
            const eased = 1 - Math.pow(1 - rotationProgress, 3);
            setRotationProgress(eased);
            camera.position.copy(startPos);
          } else {
            setRotationProgress(1);
            const cameraMoveTime = elapsed - rotationDuration;
            const cameraDurationRemaining = cameraDuration - rotationDuration;
            const cameraProgress = Math.min(cameraMoveTime / cameraDurationRemaining, 1);
            const eased = 1 - Math.pow(1 - cameraProgress, 3);
            camera.position.lerpVectors(startPos, endPos, eased);
          }
        }

        const lookAtTarget = roomPosition || new THREE.Vector3(0, 0, 0);
        camera.lookAt(lookAtTarget);

        if (totalProgress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    };

    animateCamera();
  }, [isZoomed, roomPosition, camera, setRotationProgress, isSwitchingRooms]);

  return null;
}

function Loader() {
  return (
    <Html center>
      <div className="font-label text-xs text-[color:var(--color-parchment)] opacity-80">
        ↳ Loading Telos House
      </div>
    </Html>
  );
}

export default function TelosHouseViewer() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [roomPosition, setRoomPosition] = useState<THREE.Vector3 | null>(null);
  const [rotationProgress, setRotationProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSwitchingRooms, setIsSwitchingRooms] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HouseModelHandle>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cursor-aware spotlight on the stage (subtle parallax of the phthalo glow)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', `${mx}%`);
      el.style.setProperty('--my', `${my}%`);
    };
    const onLeave = () => {
      el.style.setProperty('--mx', `50%`);
      el.style.setProperty('--my', `50%`);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const handleRoomClick = (roomName: string, position: THREE.Vector3) => {
    const wasAlreadyZoomed = isZoomed && roomPosition !== null;
    setIsSwitchingRooms(wasAlreadyZoomed);
    setSelectedRoom(roomName);
    setRoomPosition(position);
    setIsZoomed(true);
    setRotationProgress(wasAlreadyZoomed ? 1 : 0);
  };

  const handleModelClick = () => {
    setIsSwitchingRooms(false);
    setIsZoomed(true);
    setRoomPosition(null);
    setRotationProgress(0);
  };

  const handleReset = () => {
    setIsSwitchingRooms(false);
    setIsZoomed(false);
    setSelectedRoom(null);
    setRoomPosition(null);
    setRotationProgress(0);
  };

  const handleSidebarSelect = (roomName: string) => {
    houseRef.current?.selectRoom(roomName);
  };

  return (
    <div
      ref={stageRef}
      className="relative w-full h-screen overflow-hidden bg-[color:var(--color-obsidian)] flex flex-col md:block"
      onContextMenu={(e) => e.preventDefault()}
      style={{ ['--mx' as string]: '50%', ['--my' as string]: '50%' }}
    >
      {/* Background layers ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 cursor-spotlight" />
      <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-90" />
      <div className="pointer-events-none absolute inset-0 vignette" />

      {/* ── MOBILE HEADER ── (in flex-col flow, hidden on desktop) */}
      <div
        className="md:hidden pointer-events-auto relative z-10 flex-shrink-0 px-5 pb-3"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="relative min-w-0">
            <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-60 mb-1.5">
              ↳ The Telos Charter / 04
            </p>
            <h1 className="font-serif-display text-2xl leading-[0.95] text-[color:var(--color-stark)]">
              Telos House
            </h1>
            <p className="font-label mt-2 text-[9px] text-[color:var(--color-parchment)] opacity-80">
              Architectural Explorer
            </p>
            <div className="mt-2 h-px w-32 bg-[color:var(--color-parchment)]/30" />
          </div>
          <div className="flex-shrink-0">
            <div className="glass-panel relative tick-corner px-3 py-2">
              <p className="font-label text-[8px] text-[color:var(--color-parchment)] opacity-50">Status</p>
              <p className="font-label text-[10px] text-[color:var(--color-stark)] mt-0.5 whitespace-nowrap">
                {isZoomed ? (selectedRoom ? 'Inspecting' : 'Zoomed') : 'Live'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas wrapper — flex-1 in mobile flow, absolute full-bleed on desktop.
          Mobile guarantees the canvas only takes whatever vertical space is left
          after the header and bottom panel, so the bottom panel is never cut off
          regardless of phone aspect ratio. */}
      <div className="relative flex-1 min-h-0 md:absolute md:inset-0 md:flex-none">
        <Canvas
          camera={{ position: [10, 8, 10], fov: isMobile ? 95 : 60 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-10, 10, -5]} intensity={1} />
          <pointLight position={[0, 5, 0]} intensity={1} />
          <hemisphereLight intensity={0.8} groundColor="#444444" />

          <CameraController
            isZoomed={isZoomed}
            roomPosition={roomPosition}
            setRotationProgress={setRotationProgress}
            isSwitchingRooms={isSwitchingRooms}
          />

          <Suspense fallback={<Loader />}>
            <HouseModel
              ref={houseRef}
              onRoomClick={handleRoomClick}
              onModelClick={handleModelClick}
              isZoomed={isZoomed}
              hoveredRoom={hoveredRoom}
              setHoveredRoom={setHoveredRoom}
              rotationProgress={rotationProgress}
              scaleBoost={isMobile ? 1.05 : 1}
            />
          </Suspense>

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={30}
            enableZoom={false}
            enableRotate={false}
            enablePan={false}
            mouseButtons={{
              LEFT: undefined,
              MIDDLE: undefined,
              RIGHT: undefined,
            }}
          />
        </Canvas>
      </div>

      {/* ── MOBILE BOTTOM PANEL ── (in flex-col flow, hidden on desktop)
          Always present in the mobile layout, swaps Caravan info ↔ Dossier in
          the same slot, and exposes Reset whenever zoomed. Because this lives
          in the flex flow as a flex-shrink-0 sibling of the flex-1 canvas, it
          can never be cut off — the canvas yields whatever vertical space the
          panel needs at any aspect ratio. */}
      <div
        className="md:hidden pointer-events-auto relative z-10 flex-shrink-0 flex flex-col gap-2 px-5 pt-3"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="glass-panel relative tick-corner px-3 py-2.5">
          {selectedRoom ? (
            <RoomDossier
              roomKey={selectedRoom}
              onClose={() => setSelectedRoom(null)}
              compact
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-60 flex-shrink-0">
                Caravan
              </span>
              <span className="block h-3 w-px bg-[color:var(--color-parchment)]/30 flex-shrink-0" />
              <p className="text-[11px] text-[color:var(--color-parchment)]/85 leading-snug flex-1">
                {isZoomed
                  ? 'Top-down survey active. Tap a room on the model.'
                  : 'The structure rotates on its axis. Tap a room to enter.'}
              </p>
            </div>
          )}
        </div>

        {isZoomed && (
          <button
            onClick={handleReset}
            className="self-end px-4 py-2 bg-[color:var(--color-phthalo)] text-[color:var(--color-stark)] font-label text-[10px] hover:bg-[color:var(--color-phthalo)]/80 transition-colors tick-corner relative"
          >
            ↩ Reset View
          </button>
        )}
      </div>

      {/* ── DESKTOP UI OVERLAY ── (absolute, hidden on mobile) */}
      <div className="hidden md:flex pointer-events-none md:absolute md:inset-0 md:z-10 md:h-full md:w-full md:flex-col md:p-8">
        {/* Header */}
        <header className="pointer-events-auto flex items-start justify-between gap-3">
          <div className="relative min-w-0">
            <p className="font-label text-[10px] text-[color:var(--color-parchment)] opacity-60 mb-2">
              ↳ The Telos Charter / 04
            </p>
            <h1 className="font-serif-display text-5xl leading-[0.95] text-[color:var(--color-stark)]">
              Telos House
            </h1>
            <p className="font-label mt-3 text-xs text-[color:var(--color-parchment)] opacity-80">
              Architectural Explorer · Empty Viewport Edition
            </p>
            <div className="mt-3 h-px w-56 bg-[color:var(--color-parchment)]/30" />
          </div>

          <div className="flex items-start gap-2 flex-shrink-0">
            <MetaPill label="Project" value="THCRVN/25" />
            <MetaPill label="Status" value={isZoomed ? (selectedRoom ? 'Inspecting' : 'Zoomed') : 'Live Render'} />
          </div>
        </header>

        {/* Middle row */}
        <div className="mt-8 flex flex-1 min-h-0 items-stretch justify-between gap-6">
          {/* Left: Room navigation */}
          <aside className="pointer-events-auto glass-panel relative tick-corner w-[260px] max-w-[44vw] flex flex-col p-5">
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="font-label text-[10px] text-[color:var(--color-parchment)] opacity-70">
                Interior Rooms
              </h3>
              <span className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-40">
                {String(ROOM_ORDER.length).padStart(2, '0')}
              </span>
            </div>

            <ul className="thin-scroll space-y-1 overflow-y-auto pr-2 max-h-[60vh]">
              {ROOM_ORDER.map((key) => {
                const isSelected = selectedRoom === key;
                const isHovered = hoveredRoom === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => handleSidebarSelect(key)}
                      onMouseEnter={() => setHoveredRoom(key)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      className={`group flex w-full items-center justify-between gap-3 px-3 py-2.5 transition-colors text-left ${
                        isSelected
                          ? 'text-[color:var(--color-stark)]'
                          : isHovered
                          ? 'text-[color:var(--color-stark)]'
                          : 'text-[color:var(--color-parchment)]/80 hover:text-[color:var(--color-stark)]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`block h-[7px] w-[7px] ${
                            isSelected
                              ? 'bg-[color:var(--color-stark)]'
                              : 'border border-[color:var(--color-parchment)]/60'
                          }`}
                        />
                        <span className={`text-[13px] ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                          {roomLabels[key]}
                        </span>
                      </span>
                      <span className="font-label text-[9px] opacity-60">
                        {roomCodes[key]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 pt-4 border-t border-[color:var(--color-parchment)]/10">
              <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50">
                Tip · Pick a room from the model or this index
              </p>
            </div>
          </aside>

          {/* Right: Stats / room dossier */}
          <aside className="pointer-events-auto glass-panel relative tick-corner w-[280px] max-w-[44vw] p-5 self-start">
            {selectedRoom ? (
              <RoomDossier
                roomKey={selectedRoom}
                onClose={() => setSelectedRoom(null)}
              />
            ) : (
              <HomeStats />
            )}
          </aside>
        </div>


        {/* Desktop footer */}
        <footer className="pointer-events-auto mt-auto pt-6 flex flex-row gap-6 items-center justify-between">
          <div className="glass-panel relative tick-corner px-5 py-3 flex items-center gap-4 flex-1 min-w-0">
            <span className="font-label text-[10px] text-[color:var(--color-parchment)] opacity-60 flex-shrink-0">
              Caravan
            </span>
            <span className="block h-3 w-px bg-[color:var(--color-parchment)]/30 flex-shrink-0" />
            <p className="text-[12px] text-[color:var(--color-parchment)]/85 leading-snug">
              {isZoomed
                ? selectedRoom
                  ? 'Pick another room — on the model or the index — to traverse.'
                  : 'Top-down survey active. Pick a room from the index or the model.'
                : 'The structure rotates on its axis. Click a room — on the model or the index — to enter.'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <CoordinateBadge />
            {isZoomed && (
              <button
                onClick={handleReset}
                className="group relative tick-corner px-6 py-3 bg-[color:var(--color-phthalo)] text-[color:var(--color-stark)] font-label text-[10px] hover:bg-[color:var(--color-phthalo)]/80 transition-colors"
              >
                <span className="relative z-[1]">↩ Reset View</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel relative tick-corner px-4 py-2 min-w-[150px]">
      <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50">{label}</p>
      <p className="font-label text-[11px] text-[color:var(--color-stark)] mt-0.5">{value}</p>
    </div>
  );
}

function CoordinateBadge() {
  return (
    <div className="glass-panel relative tick-corner px-4 py-2">
      <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50">Origin</p>
      <p className="font-label text-[11px] text-[color:var(--color-stark)] mt-0.5">
        51.5074°N · 0.1278°W
      </p>
    </div>
  );
}

function HomeStats() {
  return (
    <div>
      <h3 className="font-label text-[10px] text-[color:var(--color-parchment)] opacity-70 mb-5">
        Charter Stats
      </h3>
      <div className="space-y-5">
        <Stat label="Catalogued Rooms" value="11" unit="zones" />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Floors" value="01" />
          <Stat label="Edition" value="V/04" />
        </div>
        <div className="pt-3 border-t border-[color:var(--color-parchment)]/10">
          <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50 mb-2">
            Orientation
          </p>
          <div className="flex items-center gap-2 text-[color:var(--color-stark)]">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="font-label text-[11px]">North-Facing Axis</span>
          </div>
        </div>
        <div className="pt-3 border-t border-[color:var(--color-parchment)]/10">
          <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50 mb-2">
            Drafted
          </p>
          <p className="font-serif-display text-base text-[color:var(--color-stark)]">
            Telos Londinium 1
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50">
        {label}
      </p>
      <p className="font-serif-display text-2xl text-[color:var(--color-stark)] leading-tight mt-1">
        {value}
        {unit && (
          <span className="ml-2 font-label text-[10px] opacity-60 align-middle">{unit}</span>
        )}
      </p>
    </div>
  );
}

function RoomDossier({
  roomKey,
  onClose,
  compact = false,
}: {
  roomKey: string;
  onClose: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="relative pr-6">
        <button
          onClick={onClose}
          aria-label="Close dossier"
          className="absolute top-0 right-0 text-[color:var(--color-parchment)] opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        >
          ×
        </button>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif-display text-base leading-tight text-[color:var(--color-stark)] truncate">
            {roomLabels[roomKey]}
          </h2>
          <span className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-60 flex-shrink-0">
            {roomCodes[roomKey]}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-[color:var(--color-parchment)]/85 leading-snug line-clamp-3">
          {roomDescriptions[roomKey]}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onClose}
        aria-label="Close dossier"
        className="absolute -top-1 -right-1 text-[color:var(--color-parchment)] opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
      >
        ×
      </button>
      <div className="flex items-center justify-between mb-4 pr-6">
        <h3 className="font-label text-[10px] text-[color:var(--color-parchment)] opacity-70">
          Dossier
        </h3>
        <span className="font-label text-[9px] text-[color:var(--color-parchment)] opacity-50">
          {roomCodes[roomKey]}
        </span>
      </div>
      <h2 className="font-serif-display text-2xl text-[color:var(--color-stark)] leading-tight">
        {roomLabels[roomKey]}
      </h2>
      <div className="my-4 h-px w-12 bg-[color:var(--color-parchment)]/40" />
      <p className="text-[13px] text-[color:var(--color-parchment)]/90 leading-relaxed">
        {roomDescriptions[roomKey]}
      </p>
      <div className="mt-5 pt-3 border-t border-[color:var(--color-parchment)]/10 grid grid-cols-2 gap-3">
        <div>
          <p className="font-label text-[9px] opacity-50">Marker</p>
          <p className="font-label text-[11px] text-[color:var(--color-stark)] mt-1">
            {roomCodes[roomKey]}
          </p>
        </div>
        <div>
          <p className="font-label text-[9px] opacity-50">Index</p>
          <p className="font-label text-[11px] text-[color:var(--color-stark)] mt-1">
            {String(ROOM_ORDER.indexOf(roomKey) + 1).padStart(2, '0')} / {String(ROOM_ORDER.length).padStart(2, '0')}
          </p>
        </div>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/telos-house.glb');
