import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Plane } from '@react-three/drei';
import * as THREE from 'three';

// Game constants - optimized for performance
const LANE_POSITIONS = [-4, 0, 4];
const GAME_SPEED_BASE = 0.8;
const COIN_SPAWN_RATE = 0.15;
const POWERUP_SPAWN_RATE = 0.05;
const OBSTACLE_SPAWN_RATE = 0.08;
const COLLISION_DISTANCE = 1.8;

// Time periods configuration with enhanced environments
const TIME_PERIODS = [
  {
    name: 'Space',
    background: '#0B0B2F',
    fogColor: '#1A1A4A',
    trackColor: '#2A2A5A',
    characterColor: '#00FFFF',
    coinColor: '#FFFFFF',
    obstacleColor: '#FF0080',
    lighting: { ambient: '#4A4AFF', directional: '#FFFFFF' },
    environmentObjects: ['asteroid', 'planet', 'satellite']
  },
  {
    name: 'Futuristic City',
    background: '#1A0A2E',
    fogColor: '#2A1A3E',
    trackColor: '#3A2A4E',
    characterColor: '#00FF80',
    coinColor: '#FFD700',
    obstacleColor: '#FF4000',
    lighting: { ambient: '#FF4080', directional: '#80FFFF' },
    environmentObjects: ['building', 'flyingCar', 'hologram']
  },
  {
    name: 'Prehistoric',
    background: '#2A1A0A',
    fogColor: '#4A3A2A',
    trackColor: '#6A5A4A',
    characterColor: '#8B4513',
    coinColor: '#FFD700',
    obstacleColor: '#654321',
    lighting: { ambient: '#FF8040', directional: '#FFFF80' },
    environmentObjects: ['tree', 'rock', 'volcano']
  },
  {
    name: 'Underwater',
    background: '#0A2A4A',
    fogColor: '#1A3A5A',
    trackColor: '#2A4A6A',
    characterColor: '#40E0D0',
    coinColor: '#FFD700',
    obstacleColor: '#8B0000',
    lighting: { ambient: '#4080FF', directional: '#80FFFF' },
    environmentObjects: ['coral', 'fish', 'seaweed']
  },
  {
    name: 'Modern Day',
    background: '#2A2A2A',
    fogColor: '#4A4A4A',
    trackColor: '#6A6A6A',
    characterColor: '#FF6B35',
    coinColor: '#FFD700',
    obstacleColor: '#8B0000',
    lighting: { ambient: '#FFFFFF', directional: '#FFFFFF' },
    environmentObjects: ['car', 'building', 'tree']
  },
  {
    name: 'Ancient Egypt',
    background: '#4A3A1A',
    fogColor: '#6A5A3A',
    trackColor: '#8A7A5A',
    characterColor: '#DAA520',
    coinColor: '#FFD700',
    obstacleColor: '#8B4513',
    lighting: { ambient: '#FFD700', directional: '#FFA500' },
    environmentObjects: ['pyramid', 'sphinx', 'palm']
  }
];

// Game state interfaces
interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  distance: number;
  speed: number;
  currentTimePeriod: number;
  isTransitioning: boolean;
}

interface PlayerState {
  lane: number;
  targetLane: number;
  isJumping: boolean;
  isSliding: boolean;
  jumpTime: number;
  slideTime: number;
}

interface GameObject {
  id: string;
  lane: number;
  position: { x: number; y: number; z: number };
}

interface Obstacle extends GameObject {
  type: 'barrier' | 'spike' | 'wall';
  height: number;
  width: number;
}

interface Coin extends GameObject {
  collected: boolean;
  rotationSpeed: number;
}

interface PowerUp extends GameObject {
  type: 'speed' | 'shield' | 'magnet' | 'jump';
  duration: number;
  collected: boolean;
}

// Environment Objects Component
function EnvironmentObjects({ timePeriod, gameState }: { 
  timePeriod: typeof TIME_PERIODS[0]; 
  gameState: GameState;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current || !gameState.isPlaying) return;
    
    const speed = gameState.speed * GAME_SPEED_BASE;
    
    groupRef.current.children.forEach((child, index) => {
      child.position.z += speed * 0.5; // Slower than track for parallax
      
      if (child.position.z > 30) {
        child.position.z = -300 + (index * 60);
      }
    });
  });

  const getEnvironmentObject = (type: string, position: [number, number, number], scale = 1) => {
    switch (type) {
      case 'asteroid':
        return (
          <Sphere args={[2 * scale]} position={position}>
            <meshStandardMaterial 
              color="#666666" 
              roughness={0.9}
              metalness={0.1}
            />
          </Sphere>
        );
      case 'planet':
        return (
          <Sphere args={[8 * scale]} position={position}>
            <meshStandardMaterial 
              color="#4A90E2" 
              emissive="#1A3A5A"
              emissiveIntensity={0.3}
            />
          </Sphere>
        );
      case 'building':
        return (
          <Box args={[3 * scale, 15 * scale, 3 * scale]} position={position}>
            <meshStandardMaterial 
              color="#2A2A3A" 
              emissive="#FF4080"
              emissiveIntensity={0.2}
            />
          </Box>
        );
      case 'tree':
        return (
          <group position={position}>
            <Cylinder args={[0.5 * scale, 0.8 * scale, 4 * scale]} position={[0, 2 * scale, 0]}>
              <meshStandardMaterial color="#8B4513" />
            </Cylinder>
            <Sphere args={[2 * scale]} position={[0, 5 * scale, 0]}>
              <meshStandardMaterial color="#228B22" />
            </Sphere>
          </group>
        );
      case 'pyramid':
        return (
          <Cylinder args={[0, 4 * scale, 8 * scale, 4]} position={position}>
            <meshStandardMaterial 
              color="#DAA520" 
              roughness={0.8}
            />
          </Cylinder>
        );
      case 'coral':
        return (
          <Cylinder args={[0.3 * scale, 1 * scale, 3 * scale, 8]} position={position}>
            <meshStandardMaterial 
              color="#FF6347" 
              emissive="#FF6347"
              emissiveIntensity={0.3}
            />
          </Cylinder>
        );
      default:
        return null;
    }
  };

  const environmentObjects = [];
  for (let i = 0; i < 8; i++) {
    const objectType = timePeriod.environmentObjects[Math.floor(Math.random() * timePeriod.environmentObjects.length)];
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (12 + Math.random() * 8);
    const y = Math.random() * 5;
    const z = -i * 60 - Math.random() * 30;
    const scale = 0.5 + Math.random() * 1;
    
    environmentObjects.push(
      <group key={`env-${i}`}>
        {getEnvironmentObject(objectType, [x, y, z], scale)}
      </group>
    );
  }

  return <group ref={groupRef}>{environmentObjects}</group>;
}

// Enhanced Player component with realistic character
function Player({ playerState, gameState, timePeriod }: { 
  playerState: PlayerState; 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!bodyRef.current || !gameState.isPlaying) return;
    
    const runTime = state.clock.elapsedTime;
    const targetX = LANE_POSITIONS[playerState.targetLane];
    
    // Smooth lane transition with proper constraints
    const currentX = bodyRef.current.position.x;
    const newX = THREE.MathUtils.lerp(currentX, targetX, delta * 12);
    bodyRef.current.position.x = newX;
    
    // Sync all body parts to main body position
    [headRef, leftArmRef, rightArmRef, leftLegRef, rightLegRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = newX;
      }
    });
    
    // Jump animation
    if (playerState.isJumping) {
      const jumpProgress = Math.min(playerState.jumpTime / 0.6, 1);
      const jumpHeight = Math.sin(jumpProgress * Math.PI) * 3.5;
      bodyRef.current.position.y = 1 + jumpHeight;
      
      // Update all body parts Y position
      if (headRef.current) headRef.current.position.y = bodyRef.current.position.y + 1.2;
      if (leftArmRef.current) leftArmRef.current.position.y = bodyRef.current.position.y + 0.5;
      if (rightArmRef.current) rightArmRef.current.position.y = bodyRef.current.position.y + 0.5;
      if (leftLegRef.current) leftLegRef.current.position.y = bodyRef.current.position.y - 0.8;
      if (rightLegRef.current) rightLegRef.current.position.y = bodyRef.current.position.y - 0.8;
      
      // Jumping pose
      bodyRef.current.rotation.x = -0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.5;
    } else if (playerState.isSliding) {
      // Sliding animation
      bodyRef.current.position.y = 0.3;
      bodyRef.current.rotation.x = 0.8;
      bodyRef.current.scale.y = 0.6;
      
      if (headRef.current) {
        headRef.current.position.y = 0.8;
        headRef.current.rotation.x = -0.3;
      }
      if (leftArmRef.current) leftArmRef.current.position.y = 0.1;
      if (rightArmRef.current) rightArmRef.current.position.y = 0.1;
      if (leftLegRef.current) leftLegRef.current.position.y = -0.2;
      if (rightLegRef.current) rightLegRef.current.position.y = -0.2;
    } else {
      // Running animation
      const runCycle = runTime * 12;
      const bobAmount = Math.sin(runCycle) * 0.15;
      
      bodyRef.current.position.y = 1 + bobAmount;
      bodyRef.current.rotation.x = 0;
      bodyRef.current.scale.y = 1;
      
      if (headRef.current) {
        headRef.current.position.y = bodyRef.current.position.y + 1.2;
        headRef.current.rotation.x = 0;
      }
      
      // Arm swinging
      if (leftArmRef.current) {
        leftArmRef.current.position.y = bodyRef.current.position.y + 0.5;
        leftArmRef.current.rotation.x = Math.sin(runCycle) * 0.6;
      }
      if (rightArmRef.current) {
        rightArmRef.current.position.y = bodyRef.current.position.y + 0.5;
        rightArmRef.current.rotation.x = -Math.sin(runCycle) * 0.6;
      }
      
      // Leg movement
      if (leftLegRef.current) {
        leftLegRef.current.position.y = bodyRef.current.position.y - 0.8;
        leftLegRef.current.rotation.x = Math.sin(runCycle + Math.PI) * 0.5;
      }
      if (rightLegRef.current) {
        rightLegRef.current.position.y = bodyRef.current.position.y - 0.8;
        rightLegRef.current.rotation.x = Math.sin(runCycle) * 0.5;
      }
    }
  });

  return (
    <group>
      {/* Body */}
      <Box ref={bodyRef} args={[0.8, 1.4, 0.5]} position={[0, 1, 0]}>
        <meshStandardMaterial 
          color={timePeriod.characterColor}
          emissive={timePeriod.characterColor}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.2}
        />
      </Box>
      
      {/* Head */}
      <Sphere ref={headRef} args={[0.4]} position={[0, 2.2, 0]}>
        <meshStandardMaterial 
          color={timePeriod.characterColor}
          emissive={timePeriod.characterColor}
          emissiveIntensity={0.2}
        />
      </Sphere>
      
      {/* Eyes */}
      <Sphere args={[0.08]} position={[0.15, 2.3, 0.35]}>
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
      </Sphere>
      <Sphere args={[0.08]} position={[-0.15, 2.3, 0.35]}>
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
      </Sphere>
      
      {/* Arms */}
      <Box ref={leftArmRef} args={[0.3, 1, 0.3]} position={[0.6, 1.5, 0]}>
        <meshStandardMaterial color={timePeriod.characterColor} />
      </Box>
      <Box ref={rightArmRef} args={[0.3, 1, 0.3]} position={[-0.6, 1.5, 0]}>
        <meshStandardMaterial color={timePeriod.characterColor} />
      </Box>
      
      {/* Legs */}
      <Box ref={leftLegRef} args={[0.35, 1.2, 0.35]} position={[0.25, 0.2, 0]}>
        <meshStandardMaterial color={timePeriod.characterColor} />
      </Box>
      <Box ref={rightLegRef} args={[0.35, 1.2, 0.35]} position={[-0.25, 0.2, 0]}>
        <meshStandardMaterial color={timePeriod.characterColor} />
      </Box>
    </group>
  );
}

// Enhanced Track with time period theming
function Track({ gameState, timePeriod }: { 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  const trackRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!trackRef.current || !gameState.isPlaying) return;
    
    const speed = gameState.speed * GAME_SPEED_BASE;
    
    trackRef.current.children.forEach((child, index) => {
      child.position.z += speed;
      
      if (child.position.z > 20) {
        child.position.z = -200 + (index * 25);
      }
    });
  });

  const trackSegments = [];
  for (let i = 0; i < 12; i++) {
    trackSegments.push(
      <group key={i} position={[0, -0.5, -i * 25]}>
        {/* Main track surface */}
        <Box args={[15, 0.4, 23]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={timePeriod.trackColor}
            roughness={0.8}
            metalness={0.2}
          />
        </Box>
        
        {/* Lane dividers with glow */}
        <Box args={[0.2, 0.2, 23]} position={[-2, 0.2, 0]}>
          <meshStandardMaterial 
            color={timePeriod.coinColor}
            emissive={timePeriod.coinColor}
            emissiveIntensity={0.4}
          />
        </Box>
        <Box args={[0.2, 0.2, 23]} position={[2, 0.2, 0]}>
          <meshStandardMaterial 
            color={timePeriod.coinColor}
            emissive={timePeriod.coinColor}
            emissiveIntensity={0.4}
          />
        </Box>
        
        {/* Side barriers */}
        <Box args={[1, 3, 23]} position={[-8, 1.5, 0]}>
          <meshStandardMaterial color={timePeriod.obstacleColor} />
        </Box>
        <Box args={[1, 3, 23]} position={[8, 1.5, 0]}>
          <meshStandardMaterial color={timePeriod.obstacleColor} />
        </Box>
      </group>
    );
  }

  return <group ref={trackRef}>{trackSegments}</group>;
}

// Realistic Obstacle component
function ObstacleComponent({ obstacle, gameState, timePeriod }: { 
  obstacle: Obstacle; 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current || !gameState.isPlaying) return;
    
    meshRef.current.position.z += gameState.speed * GAME_SPEED_BASE;
    
    // Add rotation for visual interest
    if (obstacle.type === 'spike') {
      meshRef.current.rotation.y += 0.05;
    }
  });

  const getObstacleGeometry = () => {
    switch (obstacle.type) {
      case 'barrier':
        return (
          <group>
            <Box args={[obstacle.width, obstacle.height, 0.8]}>
              <meshStandardMaterial 
                color={timePeriod.obstacleColor}
                emissive={timePeriod.obstacleColor}
                emissiveIntensity={0.2}
                roughness={0.3}
                metalness={0.7}
              />
            </Box>
            {/* Warning stripes */}
            <Box args={[obstacle.width + 0.2, 0.3, 0.9]} position={[0, obstacle.height / 2 - 0.4, 0]}>
              <meshStandardMaterial 
                color={timePeriod.coinColor}
                emissive={timePeriod.coinColor}
                emissiveIntensity={0.5}
              />
            </Box>
          </group>
        );
      case 'spike':
        return (
          <Cylinder args={[0, 0.8, obstacle.height, 8]}>
            <meshStandardMaterial 
              color={timePeriod.obstacleColor}
              emissive={timePeriod.obstacleColor}
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
            />
          </Cylinder>
        );
      case 'wall':
        return (
          <Box args={[obstacle.width, obstacle.height, 1.2]}>
            <meshStandardMaterial 
              color={timePeriod.obstacleColor}
              roughness={0.9}
            />
          </Box>
        );
      default:
        return (
          <Box args={[obstacle.width, obstacle.height, 0.8]}>
            <meshStandardMaterial color={timePeriod.obstacleColor} />
          </Box>
        );
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[LANE_POSITIONS[obstacle.lane], obstacle.height / 2, obstacle.position.z]}
    >
      {getObstacleGeometry()}
    </mesh>
  );
}

// Realistic Gold Coin component
function CoinComponent({ coin, gameState, timePeriod }: { 
  coin: Coin; 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !gameState.isPlaying || coin.collected) return;
    
    meshRef.current.position.z += gameState.speed * GAME_SPEED_BASE;
    meshRef.current.rotation.y = state.clock.elapsedTime * coin.rotationSpeed;
    
    // Floating animation
    const floatY = 1.5 + Math.sin(state.clock.elapsedTime * 4 + coin.position.z) * 0.3;
    meshRef.current.position.y = floatY;
    
    if (glowRef.current) {
      glowRef.current.position.y = floatY;
      glowRef.current.position.z = meshRef.current.position.z;
      glowRef.current.rotation.y = meshRef.current.rotation.y;
    }
  });

  if (coin.collected) return null;

  return (
    <group>
      {/* Main coin */}
      <mesh
        ref={meshRef}
        position={[LANE_POSITIONS[coin.lane], 1.5, coin.position.z]}
      >
        <Cylinder args={[0.5, 0.5, 0.2, 16]} />
        <meshStandardMaterial 
          color={timePeriod.coinColor}
          emissive={timePeriod.coinColor}
          emissiveIntensity={0.6}
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh
        ref={glowRef}
        position={[LANE_POSITIONS[coin.lane], 1.5, coin.position.z]}
      >
        <Cylinder args={[0.8, 0.8, 0.1, 16]} />
        <meshStandardMaterial 
          color={timePeriod.coinColor}
          emissive={timePeriod.coinColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Point light for glow */}
      <pointLight 
        position={[LANE_POSITIONS[coin.lane], 1.5, coin.position.z]} 
        color={timePeriod.coinColor}
        intensity={1} 
        distance={5}
      />
    </group>
  );
}

// Realistic Power-up component
function PowerUpComponent({ powerUp, gameState, timePeriod }: { 
  powerUp: PowerUp; 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !gameState.isPlaying || powerUp.collected) return;
    
    meshRef.current.position.z += gameState.speed * GAME_SPEED_BASE;
    meshRef.current.rotation.x = state.clock.elapsedTime * 2;
    meshRef.current.rotation.y = state.clock.elapsedTime * 1.5;
    
    if (coreRef.current) {
      coreRef.current.rotation.x = -state.clock.elapsedTime * 1.5;
      coreRef.current.rotation.z = state.clock.elapsedTime * 3;
    }
    
    // Floating animation
    const floatY = 2 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
    meshRef.current.position.y = floatY;
  });

  const getPowerUpColor = () => {
    switch (powerUp.type) {
      case 'speed': return '#00FF00';
      case 'shield': return '#0080FF';
      case 'magnet': return '#FF00FF';
      case 'jump': return '#FFFF00';
      default: return '#FFFFFF';
    }
  };

  if (powerUp.collected) return null;

  return (
    <group>
      {/* Outer shell */}
      <mesh
        ref={meshRef}
        position={[LANE_POSITIONS[powerUp.lane], 2, powerUp.position.z]}
      >
        <Box args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial 
          color={getPowerUpColor()}
          emissive={getPowerUpColor()}
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
          metalness={0.5}
        />
      </mesh>
      
      {/* Inner core */}
      <mesh
        ref={coreRef}
        position={[LANE_POSITIONS[powerUp.lane], 2, powerUp.position.z]}
      >
        <Sphere args={[0.3]} />
        <meshStandardMaterial 
          color={getPowerUpColor()}
          emissive={getPowerUpColor()}
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[LANE_POSITIONS[powerUp.lane], 2, powerUp.position.z]} 
        color={getPowerUpColor()}
        intensity={1.2} 
        distance={6}
      />
    </group>
  );
}

// Camera controller
function CameraController({ playerState, gameState }: { 
  playerState: PlayerState; 
  gameState: GameState; 
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (!gameState.isPlaying) return;
    
    // Follow player smoothly
    const targetX = LANE_POSITIONS[playerState.targetLane] * 0.25;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
    
    // Dynamic camera height
    let targetY = 3;
    if (playerState.isJumping) targetY = 3.5;
    if (playerState.isSliding) targetY = 2.5;
    
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.position.z = 8;
    
    // Look ahead
    camera.lookAt(LANE_POSITIONS[playerState.targetLane] * 0.15, 2, -15);
  });

  return null;
}

// Main Game Scene
function GameScene({ 
  gameState, 
  playerState, 
  obstacles, 
  coins, 
  powerUps,
  timePeriod
}: {
  gameState: GameState;
  playerState: PlayerState;
  obstacles: Obstacle[];
  coins: Coin[];
  powerUps: PowerUp[];
  timePeriod: typeof TIME_PERIODS[0];
}) {
  return (
    <>
      {/* Dynamic lighting based on time period */}
      <ambientLight intensity={0.4} color={timePeriod.lighting.ambient} />
      <directionalLight 
        position={[15, 20, 10]} 
        intensity={1.2} 
        color={timePeriod.lighting.directional}
        castShadow
      />
      <pointLight position={[0, 10, -15]} intensity={0.8} color={timePeriod.lighting.ambient} />
      
      <CameraController playerState={playerState} gameState={gameState} />
      
      <Track gameState={gameState} timePeriod={timePeriod} />
      <Player playerState={playerState} gameState={gameState} timePeriod={timePeriod} />
      <EnvironmentObjects timePeriod={timePeriod} gameState={gameState} />
      
      {obstacles.map((obstacle) => (
        <ObstacleComponent 
          key={obstacle.id} 
          obstacle={obstacle} 
          gameState={gameState}
          timePeriod={timePeriod}
        />
      ))}
      
      {coins.map((coin) => (
        <CoinComponent 
          key={coin.id} 
          coin={coin} 
          gameState={gameState}
          timePeriod={timePeriod}
        />
      ))}
      
      {powerUps.map((powerUp) => (
        <PowerUpComponent 
          key={powerUp.id} 
          powerUp={powerUp} 
          gameState={gameState}
          timePeriod={timePeriod}
        />
      ))}
      
      {/* Dynamic fog */}
      <fog attach="fog" args={[timePeriod.fogColor, 25, 120]} />
    </>
  );
}

// Enhanced HUD
function GameHUD({ gameState, timePeriod }: { 
  gameState: GameState;
  timePeriod: typeof TIME_PERIODS[0];
}) {
  return (
    <div className="game-hud">
      {/* Main score display */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="score-display rounded-xl px-8 py-4 text-center slide-in">
          <div className="font-orbitron text-4xl font-bold text-primary mb-2 glow-primary">
            {gameState.score.toLocaleString()}
          </div>
          <div className="font-rajdhani text-lg text-accent">
            {Math.floor(gameState.distance)}m
          </div>
          <div className="font-rajdhani text-sm text-foreground mt-1">
            {timePeriod.name}
          </div>
        </div>
      </div>
      
      {/* Speed indicator */}
      <div className="absolute top-6 right-6 z-50">
        <div className="score-display rounded-lg px-4 py-3">
          <div className="font-orbitron text-sm text-primary mb-1">SPEED</div>
          <div className="font-orbitron text-xl font-bold text-accent">
            {gameState.speed.toFixed(1)}x
          </div>
        </div>
      </div>
      
      {/* Time period transition indicator */}
      {gameState.isTransitioning && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60">
          <div className="text-center">
            <div className="font-orbitron text-6xl font-bold text-primary glow-primary pulse-glow mb-4">
              TRAVELING THROUGH TIME
            </div>
            <div className="font-orbitron text-3xl text-accent">
              Entering {timePeriod.name}
            </div>
          </div>
        </div>
      )}
      
      {/* Pause indicator */}
      {gameState.isPaused && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="font-orbitron text-4xl font-bold text-primary glow-primary pulse-glow">
            PAUSED
          </div>
        </div>
      )}
    </div>
  );
}

// Game Over Screen
function GameOverScreen({ 
  gameState, 
  onRestart 
}: { 
  gameState: GameState; 
  onRestart: () => void; 
}) {
  if (!gameState.isGameOver) return null;

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-50">
      <div className="text-center space-y-8 p-10 rounded-xl score-display max-w-md">
        <h1 className="font-orbitron text-5xl font-bold text-primary glow-primary pulse-glow">
          GAME OVER
        </h1>
        
        <div className="space-y-4">
          <div className="font-orbitron text-3xl text-accent">
            {gameState.score.toLocaleString()}
          </div>
          <div className="font-rajdhani text-lg text-foreground">
            Distance: {Math.floor(gameState.distance)}m
          </div>
          <div className="font-rajdhani text-lg text-foreground">
            Max Speed: {gameState.speed.toFixed(1)}x
          </div>
        </div>
        
        <button
          onClick={onRestart}
          className="game-button px-10 py-4 rounded-lg text-xl font-bold"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

// Start Screen
function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-10 p-10 max-w-2xl">
        <h1 className="font-orbitron text-7xl font-bold text-primary glow-primary pulse-glow">
          TIME RUNNER
        </h1>
        
        <div className="space-y-6 text-foreground font-rajdhani">
          <p className="text-2xl text-accent">
            Run through time! Navigate lanes, avoid obstacles, collect coins!
          </p>
          
          <div className="grid grid-cols-2 gap-6 text-lg">
            <div className="space-y-2">
              <div className="font-semibold text-primary">← → Arrow Keys</div>
              <div className="text-sm">Switch lanes</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">↑ Arrow Key</div>
              <div className="text-sm">Jump over obstacles</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">↓ Arrow Key</div>
              <div className="text-sm">Slide under obstacles</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">Space Bar</div>
              <div className="text-sm">Pause game</div>
            </div>
          </div>
          
          <div className="text-accent text-lg">
            Every 300m you travel through a new time period!<br/>
            Collect coins for 10 points each • One life only!
          </div>
        </div>
        
        <button
          onClick={onStart}
          className="game-button px-16 py-5 rounded-xl text-2xl font-bold"
        >
          START TIME TRAVEL
        </button>
      </div>
    </div>
  );
}

// Main Game Component with optimized logic
export default function Game3D() {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    distance: 0,
    speed: 1,
    currentTimePeriod: 0,
    isTransitioning: false
  });

  const [playerState, setPlayerState] = useState<PlayerState>({
    lane: 1,
    targetLane: 1,
    isJumping: false,
    isSliding: false,
    jumpTime: 0,
    slideTime: 0
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [lastSpawnZ, setLastSpawnZ] = useState(-50);

  const currentTimePeriod = TIME_PERIODS[gameState.currentTimePeriod];

  // Optimized game loop - reduced frequency for better performance
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        const newDistance = prev.distance + prev.speed * 0.6;
        const newSpeed = Math.min(1 + newDistance / 1000, 4); // Max speed 4x
        
        // Check for time period transition every 300m
        const newTimePeriodIndex = Math.floor(newDistance / 300);
        const shouldTransition = newTimePeriodIndex !== Math.floor(prev.distance / 300);
        
        if (shouldTransition) {
          const availablePeriods = TIME_PERIODS.map((_, i) => i).filter(i => i !== prev.currentTimePeriod);
          const randomIndex = availablePeriods[Math.floor(Math.random() * availablePeriods.length)];
          
          setTimeout(() => {
            setGameState(current => ({ ...current, isTransitioning: false }));
          }, 2500);
          
          return {
            ...prev,
            distance: newDistance,
            speed: newSpeed,
            currentTimePeriod: randomIndex,
            isTransitioning: true
          };
        }
        
        return {
          ...prev,
          distance: newDistance,
          speed: newSpeed
        };
      });

      // Update player state
      setPlayerState(prev => {
        const newState = {
          ...prev,
          lane: prev.targetLane, // Sync lane with target
          jumpTime: prev.isJumping ? prev.jumpTime + 0.02 : 0,
          slideTime: prev.isSliding ? prev.slideTime + 0.02 : 0,
          isJumping: prev.isJumping && prev.jumpTime < 0.6,
          isSliding: prev.isSliding && prev.slideTime < 0.8
        };
        return newState;
      });

      // Spawn new objects less frequently for better performance
      setLastSpawnZ(prev => {
        const newZ = prev - 2.5;
        
        // Spawn obstacles
        if (Math.random() < OBSTACLE_SPAWN_RATE) {
          const newObstacle: Obstacle = {
            id: `obstacle-${Date.now()}-${Math.random()}`,
            lane: Math.floor(Math.random() * 3),
            position: { x: 0, y: 0, z: newZ - 15 },
            type: ['barrier', 'spike', 'wall'][Math.floor(Math.random() * 3)] as any,
            height: 2 + Math.random() * 1.5,
            width: 1.5 + Math.random() * 0.5
          };
          setObstacles(current => [...current, newObstacle]);
        }
        
        // Spawn coins
        if (Math.random() < COIN_SPAWN_RATE) {
          const newCoin: Coin = {
            id: `coin-${Date.now()}-${Math.random()}`,
            lane: Math.floor(Math.random() * 3),
            position: { x: 0, y: 0, z: newZ - 10 },
            collected: false,
            rotationSpeed: 3 + Math.random() * 3
          };
          setCoins(current => [...current, newCoin]);
        }
        
        // Spawn power-ups
        if (Math.random() < POWERUP_SPAWN_RATE) {
          const newPowerUp: PowerUp = {
            id: `powerup-${Date.now()}-${Math.random()}`,
            lane: Math.floor(Math.random() * 3),
            position: { x: 0, y: 0, z: newZ - 20 },
            type: ['speed', 'shield', 'magnet', 'jump'][Math.floor(Math.random() * 4)] as any,
            duration: 5000,
            collected: false
          };
          setPowerUps(current => [...current, newPowerUp]);
        }
        
        return newZ;
      });

      // Clean up old objects more aggressively for better performance
      setObstacles(current => current.filter(obj => obj.position.z < 20));
      setCoins(current => current.filter(obj => obj.position.z < 20 && !obj.collected));
      setPowerUps(current => current.filter(obj => obj.position.z < 20 && !obj.collected));

    }, 25); // 40 FPS for better performance

    return () => clearInterval(gameLoop);
  }, [gameState.isPlaying, gameState.isPaused]);

  // Optimized collision detection
  useEffect(() => {
    if (!gameState.isPlaying) return;

    const playerLane = playerState.lane;
    const playerZ = 0;

    // Check coin collisions
    coins.forEach(coin => {
      if (!coin.collected && 
          coin.lane === playerLane && 
          Math.abs(coin.position.z - playerZ) < COLLISION_DISTANCE) {
        coin.collected = true;
        setGameState(prev => ({ ...prev, score: prev.score + 10 }));
        setCoins(current => current.filter(c => c.id !== coin.id));
      }
    });

    // Check power-up collisions
    powerUps.forEach(powerUp => {
      if (!powerUp.collected && 
          powerUp.lane === playerLane && 
          Math.abs(powerUp.position.z - playerZ) < COLLISION_DISTANCE) {
        powerUp.collected = true;
        setGameState(prev => ({ ...prev, score: prev.score + 50 }));
        setPowerUps(current => current.filter(p => p.id !== powerUp.id));
      }
    });

    // Check obstacle collisions (only when not jumping/sliding appropriately)
    obstacles.forEach(obstacle => {
      if (obstacle.lane === playerLane && 
          Math.abs(obstacle.position.z - playerZ) < COLLISION_DISTANCE) {
        
        // Check if player can avoid obstacle
        const canJumpOver = playerState.isJumping && obstacle.height < 2.5;
        const canSlideUnder = playerState.isSliding && obstacle.height > 1.5;
        
        if (!canJumpOver && !canSlideUnder) {
          // Game over on first hit (1 life only)
          setGameState(prev => ({ ...prev, isGameOver: true }));
          setObstacles(current => current.filter(o => o.id !== obstacle.id));
        }
      }
    });

  }, [gameState.isPlaying, playerState.lane, playerState.isJumping, playerState.isSliding, obstacles, coins, powerUps]);

  // Optimized controls with proper lane constraints
  const movePlayer = useCallback((direction: 'left' | 'right') => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    setPlayerState(prev => {
      const newTargetLane = direction === 'left' 
        ? Math.max(0, prev.targetLane - 1)
        : Math.min(2, prev.targetLane + 1);
      
      return { ...prev, targetLane: newTargetLane };
    });
  }, [gameState.isPlaying, gameState.isPaused]);

  const jumpPlayer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || playerState.isJumping || playerState.isSliding) return;
    setPlayerState(prev => ({ ...prev, isJumping: true, jumpTime: 0 }));
  }, [gameState.isPlaying, gameState.isPaused, playerState.isJumping, playerState.isSliding]);

  const slidePlayer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || playerState.isSliding || playerState.isJumping) return;
    setPlayerState(prev => ({ ...prev, isSliding: true, slideTime: 0 }));
  }, [gameState.isPlaying, gameState.isPaused, playerState.isSliding, playerState.isJumping]);

  const togglePause = useCallback(() => {
    if (!gameState.isPlaying) return;
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, [gameState.isPlaying]);

  const startGame = () => {
    setGameState({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      distance: 0,
      speed: 1,
      currentTimePeriod: Math.floor(Math.random() * TIME_PERIODS.length),
      isTransitioning: false
    });
    setPlayerState({
      lane: 1,
      targetLane: 1,
      isJumping: false,
      isSliding: false,
      jumpTime: 0,
      slideTime: 0
    });
    setObstacles([]);
    setCoins([]);
    setPowerUps([]);
    setLastSpawnZ(-50);
  };

  const restartGame = () => {
    startGame();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          movePlayer('right');
          break;
        case 'ArrowUp':
          event.preventDefault();
          jumpPlayer();
          break;
        case 'ArrowDown':
          event.preventDefault();
          slidePlayer();
          break;
        case 'Space':
          event.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, jumpPlayer, slidePlayer, togglePause]);

  return (
    <div className="game-container" style={{ backgroundColor: currentTimePeriod.background }}>
      {/* 3D Canvas with optimized settings */}
      <Canvas
        className="game-canvas"
        camera={{ position: [0, 3, 8], fov: 75 }}
        gl={{ 
          antialias: false, // Disabled for better performance
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        performance={{ min: 0.8 }} // Maintain 80% performance
      >
        <GameScene
          gameState={gameState}
          playerState={playerState}
          obstacles={obstacles}
          coins={coins}
          powerUps={powerUps}
          timePeriod={currentTimePeriod}
        />
      </Canvas>

      {/* UI Overlays */}
      {gameState.isPlaying && <GameHUD gameState={gameState} timePeriod={currentTimePeriod} />}
      {!gameState.isPlaying && !gameState.isGameOver && <StartScreen onStart={startGame} />}
      <GameOverScreen gameState={gameState} onRestart={restartGame} />
      
      {/* Controls hint */}
      {gameState.isPlaying && !gameState.isPaused && !gameState.isTransitioning && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="text-center text-sm text-muted-foreground font-rajdhani bg-background/30 backdrop-blur-sm rounded-lg px-4 py-2">
            ← → Move | ↑ Jump | ↓ Slide | Space Pause
          </div>
        </div>
      )}
    </div>
  );
}