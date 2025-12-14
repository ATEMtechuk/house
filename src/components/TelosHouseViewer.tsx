'use client';

import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { useState, Suspense, useEffect, useRef } from 'react';
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
}

function HouseModel({ onRoomClick, onModelClick, isZoomed, hoveredRoom, setHoveredRoom, rotationProgress }: HouseModelProps) {
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

    // Create room boxes based on manual configuration
    Object.entries(manualRoomPositions).forEach(([roomName, config]) => {
      const [x, y, z] = config.position;
      const [width, height, depth] = config.size;

      // Create an invisible box mesh for this room (visible only on hover)
      const boxGeometry = new THREE.BoxGeometry(width, height, depth);
      const boxMaterial = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0, // Invisible by default
        emissive: new THREE.Color(0x4444ff),
        emissiveIntensity: 0,
        wireframe: false // Set to true to see just the edges
      });

      const roomBox = new THREE.Mesh(boxGeometry, boxMaterial);
      roomBox.position.set(x, y, z);
      roomBox.userData.roomName = roomName;
      roomBox.userData.clickable = true;

      // Add to the group
      groupRef.current!.add(roomBox);
      meshMap.set(roomName, roomBox);

      console.log(`Created "${roomName}" at [${x}, ${y}, ${z}] with size [${width}, ${height}, ${depth}]`);
    });

    setRoomMeshes(meshMap);
  }, [scene]);

  // Update emissive intensity and opacity based on hover
  useEffect(() => {
    roomMeshes.forEach((mesh, roomName) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (hoveredRoom === roomName) {
        material.emissiveIntensity = 0.8; // Much brighter when hovered
        material.opacity = 0.5; // Visible when hovered
      } else {
        material.emissiveIntensity = 0; // No glow when not hovered
        material.opacity = 0; // Completely invisible when not hovered
      }
    });
  }, [hoveredRoom, roomMeshes]);

  return (
    <>
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
    </>
  );
}

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
      <div style={{ color: 'white', fontSize: '20px' }}>
        Loading Telos House...
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  return (
    <div
      className="relative w-full h-screen flex flex-col"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Title - Responsive - Lower on mobile */}
      <h1
        className="absolute top-16 md:top-8 left-1/2 -translate-x-1/2 z-10 text-3xl md:text-6xl font-bold text-white pointer-events-none"
        style={{
          textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4)',
          letterSpacing: '0.05em'
        }}
      >
        TELOS HOUSE
      </h1>

      {/* Canvas container - Smaller on mobile to fit screen */}
      <div className="flex-1 w-full h-[70vh] md:h-screen">
        <Canvas
          camera={{ position: [10, 8, 10], fov: isMobile ? 95 : 60 }}
          style={{ background: '#1a1a1a', width: '100%', height: '100%' }}
        >
        {/* Multiple light sources for better visibility */}
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
            onRoomClick={handleRoomClick}
            onModelClick={handleModelClick}
            isZoomed={isZoomed}
            hoveredRoom={hoveredRoom}
            setHoveredRoom={setHoveredRoom}
            rotationProgress={rotationProgress}
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
            RIGHT: undefined
          }}
        />
        </Canvas>
      </div>

      {/* Reset Button - Mobile at top-right below title, Desktop at top-right */}
      {isZoomed && (
        <button
          onClick={handleReset}
          className="absolute top-32 right-2 md:top-20 md:right-4 bg-black bg-opacity-80 hover:bg-opacity-90 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg backdrop-blur-sm transition-all border border-white border-opacity-30 text-lg md:text-xl z-10"
        >
          Reset
        </button>
      )}

      {/* Room Description Overlay - Mobile higher up at bottom, Desktop at top-left */}
      {selectedRoom && (
        <div className="absolute bottom-28 left-4 right-4 md:bottom-auto md:top-20 md:left-4 md:right-auto bg-black bg-opacity-90 text-white p-4 md:p-6 rounded-lg md:max-w-md max-h-[40vh] md:max-h-none overflow-y-auto z-10">
          <button
            onClick={() => setSelectedRoom(null)}
            className="absolute top-2 right-2 text-white hover:text-gray-300 text-xl"
          >
            ✕
          </button>
          <h2 className="text-2xl md:text-3xl font-bold mb-2 capitalize pr-6">{selectedRoom}</h2>
          <p className="text-base md:text-lg text-gray-200">{roomDescriptions[selectedRoom]}</p>
        </div>
      )}

      {/* Instructions - Hide on mobile when room is selected */}
      <div className={`absolute bottom-4 left-4 bg-black bg-opacity-60 text-white p-3 md:p-4 rounded-lg text-xs md:text-sm ${selectedRoom ? 'hidden md:block' : 'block'}`}>
        <p>Watch the house rotate automatically</p>
        <p>Click on individual rooms to explore</p>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/telos-house.glb');
