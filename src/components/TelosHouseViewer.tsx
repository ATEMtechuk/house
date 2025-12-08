'use client';

import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { useState, Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Room descriptions for Telos House
const roomDescriptions: { [key: string]: string } = {
  room1: 'Room 1 - First space in Telos House',
  room2: 'Room 2 - Second space in Telos House',
  room3: 'Room 3 - Third space in Telos House',
  room4: 'Room 4 - Fourth space in Telos House',
  room5: 'Room 5 - Fifth space in Telos House',
  room6: 'Room 6 - Sixth space in Telos House',
  room7: 'Room 7 - Seventh space in Telos House',
  room8: 'Room 8 - Eighth space in Telos House',
  room9: 'Room 9 - Ninth space in Telos House',
  room10: 'Room 10 - Tenth space in Telos House',
  room11: 'Room 11 - Eleventh space in Telos House',
};

// Manual room configuration - YOU CAN EDIT THESE VALUES
// Each room has: position (x, y, z), and size (width, height, depth)
// All values are relative to the house center (0, 0, 0)
// Adjust these to match your actual house layout
interface RoomConfig {
  position: [number, number, number]; // [x, y, z]
  size: [number, number, number]; // [width, height, depth]
}

const manualRoomPositions: { [key: string]: RoomConfig } = {
  // Based on your Blender layout drawing
  // Room 1 - Large room on the right (red outline)
  room1: { position: [0, 1, -4.01], size: [5.7, 1.7, 8] },

  // Room 2 - Small room bottom right (orange)
  room2: { position: [3.75, 1, -1.6], size: [1.7, 1.7, 2.5] },

  // Room 3 - Green room (bottom middle)
  room3: { position: [3.4, 1, 0.8], size: [2.55, 1.7, 2.2] },

  // Room 4 - Purple room (bottom left)
  room4: { position: [3.4, 1, 3.6], size: [2.6, 1.7, 3.5] },

  // Room 5 - Yellow room (middle left)
  room5: { position: [1.4, 1, 2.8], size: [1.3, 1.7, 5.5] },

  // Room 6 - Gray room (top middle left)
  room6: { position: [-1.1, 1, 1.3], size: [3.5, 1.7, 2.2] },

  // Room 7 - Closet (top left, small)
  room7: { position: [-0.5, 1, 3.55], size: [1.5, 1.7, 1.95] },

  // Room 8 - Purple "room 8" (top left)
  room8: { position: [-2.05, 1, 3.7], size: [1.5, 1.7, 2.4] },

  // Room 9 - Pink "Room 9" (far top left)
  room9: { position: [-0.55, 1, 7], size: [2.75, 1.7, 2.4] },

  // Room 10 - "Room 10" (very top left)
  room10: { position: [-2.5, 1, 6.155], size: [0.7, 1.7, 2.3] },

  // Room 11 - Next to Room 1
  room11: { position: [3.7, 1, -5.5], size: [1.7, 1.7, 5.1] },
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
    // Ignore right-clicks
    if (event.nativeEvent.button !== 0) return;

    event.stopPropagation();

    // Store current rotation BEFORE any action
    if (groupRef.current) {
      startRotationRef.current = groupRef.current.rotation.y;
    }

    // Get the clicked object
    const object = event.object;

    // Check if this object has an assigned room name
    const roomName = object.userData.roomName;

    if (roomName && object instanceof THREE.Mesh) {
      // Calculate room center position
      const boundingBox = new THREE.Box3().setFromObject(object);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      // Convert to world position with scaling
      const worldPos = center.multiplyScalar(4); // Account for 4x scale

      onRoomClick(roomName, worldPos);
    } else {
      // If no specific room clicked, trigger aerial view
      onModelClick();
    }
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const object = event.object;

    // Check if this object has an assigned room name
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

      // Create a visible semi-transparent box mesh for this room
      const boxGeometry = new THREE.BoxGeometry(width, height, depth);
      const boxMaterial = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.2, // Always visible so you can see where rooms are
        emissive: new THREE.Color(0x4444ff),
        emissiveIntensity: 0.3,
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
        material.opacity = 0.5; // More visible when hovered
      } else {
        material.emissiveIntensity = 0.3; // Base glow
        material.opacity = 0.2; // Always slightly visible so you can see room positions
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
}

function CameraController({ isZoomed, roomPosition, setRotationProgress }: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    const animateCamera = () => {
      const startPos = new THREE.Vector3().copy(camera.position);

      let endPos: THREE.Vector3;
      let isResetting = false;

      if (roomPosition) {
        // Zoom to specific room - position camera above and slightly offset
        endPos = new THREE.Vector3(
          roomPosition.x,
          roomPosition.y + 3,
          roomPosition.z + 2
        );
      } else if (isZoomed) {
        // Aerial view of whole house
        endPos = new THREE.Vector3(0, 8, 0);
      } else {
        // Default view - RESET (fast animation)
        endPos = new THREE.Vector3(10, 8, 10);
        isResetting = true;
      }

      // Fast reset (300ms) vs normal animation (1000ms)
      const rotationDuration = isResetting ? 150 : 800;
      const cameraDuration = isResetting ? 300 : 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const totalProgress = Math.min(elapsed / cameraDuration, 1);

        if (isResetting) {
          // Quick reset - just move camera directly
          const progress = elapsed / cameraDuration;
          const eased = 1 - Math.pow(1 - progress, 2); // Faster easing
          camera.position.lerpVectors(startPos, endPos, eased);
          setRotationProgress(0); // Reset rotation immediately
        } else {
          // Normal zoom animation - Rotation happens first (0-0.8s), then camera moves (0.8-1.0s)
          if (elapsed < rotationDuration) {
            // Phase 1: Rotate to north while staying in place
            const rotationProgress = elapsed / rotationDuration;
            const eased = 1 - Math.pow(1 - rotationProgress, 3);
            setRotationProgress(eased);

            // Camera stays at start position
            camera.position.copy(startPos);
          } else {
            // Phase 2: Rotation complete, now move camera
            setRotationProgress(1);

            const cameraMoveTime = elapsed - rotationDuration;
            const cameraDurationRemaining = cameraDuration - rotationDuration;
            const cameraProgress = Math.min(cameraMoveTime / cameraDurationRemaining, 1);
            const eased = 1 - Math.pow(1 - cameraProgress, 3);

            camera.position.lerpVectors(startPos, endPos, eased);
          }
        }

        // Look at room or center
        const lookAtTarget = roomPosition || new THREE.Vector3(0, 0, 0);
        camera.lookAt(lookAtTarget);

        if (totalProgress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    };

    animateCamera();
  }, [isZoomed, roomPosition, camera, setRotationProgress]);

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

  const handleRoomClick = (roomName: string, position: THREE.Vector3) => {
    setSelectedRoom(roomName);
    setRoomPosition(position);
    setIsZoomed(true);
    setRotationProgress(0); // Reset progress for new animation
  };

  const handleModelClick = () => {
    setIsZoomed(true);
    setRoomPosition(null); // Aerial view without specific room
    setRotationProgress(0); // Reset progress for new animation
  };

  const handleReset = () => {
    setIsZoomed(false);
    setSelectedRoom(null);
    setRoomPosition(null);
    setRotationProgress(0);
  };

  return (
    <div
      className="relative w-full h-screen"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Title */}
      <h1
        className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-6xl font-bold text-white pointer-events-none"
        style={{
          textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 255, 255, 0.4)',
          letterSpacing: '0.05em'
        }}
      >
        TELOS HOUSE
      </h1>

      <Canvas
        camera={{ position: [10, 8, 10], fov: 60 }}
        style={{ background: '#1a1a1a' }}
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

      {/* Room Description Overlay */}
      {selectedRoom && (
        <div className="absolute top-32 left-4 bg-black bg-opacity-80 text-white p-6 rounded-lg max-w-md">
          <button
            onClick={() => setSelectedRoom(null)}
            className="absolute top-2 right-2 text-white hover:text-gray-300"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-2 capitalize">{selectedRoom}</h2>
          <p className="text-gray-200">{roomDescriptions[selectedRoom]}</p>
        </div>
      )}

      {/* Reset Button */}
      {isZoomed && (
        <button
          onClick={handleReset}
          className="absolute top-32 right-4 bg-black bg-opacity-80 hover:bg-opacity-90 text-white px-6 py-3 rounded-lg backdrop-blur-sm transition-all border border-white border-opacity-30"
        >
          Reset
        </button>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white p-4 rounded-lg">
        <p className="text-sm">Watch the house rotate automatically</p>
        <p className="text-sm">Click on the house to zoom to aerial view</p>
        <p className="text-sm">Click on individual rooms to zoom in close</p>
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/telos-house.glb');
