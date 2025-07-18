import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, PlayerState, Obstacle, Coin, PowerUp } from '../types/game';
import { useGameLogic } from '../hooks/useGameLogic';

// Game constants
const LANE_POSITIONS = [-3, 0, 3];

// Player component with enhanced animations
function Player({ playerState, gameState }: { playerState: PlayerState; gameState: GameState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current || !headRef.current || !gameState.isPlaying) return;
    
    // Smooth lane transition
    const targetX = LANE_POSITIONS[playerState.lane];
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 10);
    headRef.current.position.x = meshRef.current.position.x;
    
    // Jump animation with arc
    if (playerState.isJumping) {
      const jumpProgress = (state.clock.elapsedTime * 10) % (Math.PI);
      const jumpHeight = Math.sin(jumpProgress) * 2.5 + 0.5;
      meshRef.current.position.y = jumpHeight;
      headRef.current.position.y = jumpHeight + 1;
      
      // Slight forward lean during jump
      meshRef.current.rotation.x = -0.2;
    } else if (playerState.isSliding) {
      meshRef.current.position.y = -0.3;
      headRef.current.position.y = 0.7;
      meshRef.current.rotation.x = 0.3;
      meshRef.current.scale.y = 0.6;
    } else {
      // Running animation
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 12) * 0.15;
      headRef.current.position.y = meshRef.current.position.y + 1;
      meshRef.current.rotation.x = 0;
      meshRef.current.scale.y = 1;
      
      // Arm swing simulation
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.1;
    }
  });

  return (
    <group>
      {/* Player body */}
      <Box ref={meshRef} args={[0.8, 1.6, 0.4]} position={[0, 0.5, 0]}>
        <meshStandardMaterial 
          color="#FF6B35" 
          emissive="#FF6B35"
          emissiveIntensity={0.1}
        />
      </Box>
      
      {/* Player head */}
      <Sphere ref={headRef} args={[0.35]} position={[0, 1.5, 0]}>
        <meshStandardMaterial 
          color="#FFD23F" 
          emissive="#FFD23F"
          emissiveIntensity={0.2}
        />
      </Sphere>
      
      {/* Eyes */}
      <Sphere args={[0.08]} position={[LANE_POSITIONS[playerState.lane] - 0.1, 1.6, 0.3]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
      <Sphere args={[0.08]} position={[LANE_POSITIONS[playerState.lane] + 0.1, 1.6, 0.3]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>
    </group>
  );
}

// Enhanced track with more visual details
function Track({ gameState }: { gameState: GameState }) {
  const trackRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!trackRef.current || !gameState.isPlaying) return;
    
    const speed = gameState.speed * 0.3;
    
    trackRef.current.children.forEach((child, index) => {
      child.position.z += speed;
      
      if (child.position.z > 15) {
        child.position.z = -100 + (index * 25);
      }
    });
  });

  const trackSegments = [];
  for (let i = 0; i < 8; i++) {
    trackSegments.push(
      <group key={i} position={[0, -0.5, -i * 25]}>
        {/* Main track surface */}
        <Box args={[12, 0.3, 22]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#2A2A3E" roughness={0.8} />
        </Box>
        
        {/* Lane dividers with glow */}
        <Box args={[0.15, 0.15, 22]} position={[-1.5, 0.15, 0]}>
          <meshStandardMaterial 
            color="#FFD23F" 
            emissive="#FFD23F"
            emissiveIntensity={0.3}
          />
        </Box>
        <Box args={[0.15, 0.15, 22]} position={[1.5, 0.15, 0]}>
          <meshStandardMaterial 
            color="#FFD23F" 
            emissive="#FFD23F"
            emissiveIntensity={0.3}
          />
        </Box>
        
        {/* Side barriers */}
        <Box args={[0.5, 2, 22]} position={[-6, 1, 0]}>
          <meshStandardMaterial color="#16213E" />
        </Box>
        <Box args={[0.5, 2, 22]} position={[6, 1, 0]}>
          <meshStandardMaterial color="#16213E" />
        </Box>
        
        {/* Track details */}
        {Array.from({ length: 5 }, (_, j) => (
          <Box key={j} args={[0.1, 0.05, 2]} position={[0, 0.2, -10 + j * 5]}>
            <meshStandardMaterial color="#FFD23F" emissive="#FFD23F" emissiveIntensity={0.2} />
          </Box>
        ))}
      </group>
    );
  }

  return <group ref={trackRef}>{trackSegments}</group>;
}

// Enhanced obstacle with better visuals
function ObstacleComponent({ obstacle, gameState }: { obstacle: Obstacle; gameState: GameState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current || !gameState.isPlaying) return;
    
    meshRef.current.position.z += gameState.speed * 0.3;
    
    // Add some rotation for visual interest
    if (obstacle.obstacleType === 'spike') {
      meshRef.current.rotation.y += 0.02;
    }
  });

  const getObstacleGeometry = () => {
    switch (obstacle.obstacleType) {
      case 'barrier':
        return (
          <group>
            <Box args={[1.2, obstacle.height, 0.6]}>
              <meshStandardMaterial 
                color="#8B0000" 
                emissive="#8B0000"
                emissiveIntensity={0.1}
                roughness={0.3}
              />
            </Box>
            {/* Warning stripes */}
            <Box args={[1.3, 0.2, 0.7]} position={[0, obstacle.height / 2 - 0.3, 0]}>
              <meshStandardMaterial color="#FFD23F" emissive="#FFD23F" emissiveIntensity={0.3} />
            </Box>
          </group>
        );
      case 'spike':
        return (
          <Cylinder args={[0, 0.6, obstacle.height, 6]}>
            <meshStandardMaterial 
              color="#8B0000" 
              emissive="#8B0000"
              emissiveIntensity={0.2}
              metalness={0.5}
            />
          </Cylinder>
        );
      default:
        return (
          <Box args={[1, obstacle.height, 1]}>
            <meshStandardMaterial color="#8B0000" />
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

// Enhanced coin with animation
function CoinComponent({ coin, gameState }: { coin: Coin; gameState: GameState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !gameState.isPlaying) return;
    
    meshRef.current.position.z += gameState.speed * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 4;
    
    // Floating animation
    meshRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3 + coin.position.z) * 0.3;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[LANE_POSITIONS[coin.lane], 1, coin.position.z]}
      >
        <Cylinder args={[0.4, 0.4, 0.15, 12]} />
        <meshStandardMaterial 
          color="#FFD23F" 
          emissive="#FFD23F" 
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[LANE_POSITIONS[coin.lane], 1, coin.position.z]} 
        color="#FFD23F" 
        intensity={0.5} 
        distance={3}
      />
    </group>
  );
}

// Power-up component
function PowerUpComponent({ powerUp, gameState }: { powerUp: PowerUp; gameState: GameState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current || !gameState.isPlaying) return;
    
    meshRef.current.position.z += gameState.speed * 0.3;
    meshRef.current.rotation.x = state.clock.elapsedTime * 2;
    meshRef.current.rotation.y = state.clock.elapsedTime * 3;
    
    // Floating animation
    meshRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
  });

  const getPowerUpColor = () => {
    switch (powerUp.powerType) {
      case 'speed': return '#00FF00';
      case 'shield': return '#0080FF';
      case 'magnet': return '#FF00FF';
      default: return '#FFFFFF';
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[LANE_POSITIONS[powerUp.lane], 1.5, powerUp.position.z]}
      >
        <Box args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial 
          color={getPowerUpColor()} 
          emissive={getPowerUpColor()} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[LANE_POSITIONS[powerUp.lane], 1.5, powerUp.position.z]} 
        color={getPowerUpColor()} 
        intensity={0.8} 
        distance={4}
      />
    </group>
  );
}

// Camera controller with smooth following
function CameraController({ playerState, gameState }: { playerState: PlayerState; gameState: GameState }) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (!gameState.isPlaying) return;
    
    // Follow player with smooth interpolation
    const targetX = LANE_POSITIONS[playerState.lane] * 0.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.08);
    
    // Dynamic camera height based on player action
    let targetY = 2.5;
    if (playerState.isJumping) targetY = 3.2;
    if (playerState.isSliding) targetY = 1.8;
    
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    camera.position.z = 6;
    
    // Look ahead with slight offset
    camera.lookAt(LANE_POSITIONS[playerState.lane] * 0.2, 1.5, -15);
  });

  return null;
}

// Main 3D Scene
function GameScene({ 
  gameState, 
  playerState, 
  obstacles, 
  coins, 
  powerUps 
}: {
  gameState: GameState;
  playerState: PlayerState;
  obstacles: Obstacle[];
  coins: Coin[];
  powerUps: PowerUp[];
}) {
  return (
    <>
      {/* Enhanced lighting */}
      <ambientLight intensity={0.3} color="#1A1A2E" />
      <directionalLight 
        position={[10, 15, 5]} 
        intensity={1.2} 
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 8, -10]} intensity={0.8} color="#FF6B35" />
      <pointLight position={[0, 5, -30]} intensity={0.6} color="#FFD23F" />
      
      {/* Camera controller */}
      <CameraController playerState={playerState} gameState={gameState} />
      
      {/* Game objects */}
      <Track gameState={gameState} />
      <Player playerState={playerState} gameState={gameState} />
      
      {/* Dynamic objects */}
      {obstacles.map((obstacle) => (
        <ObstacleComponent key={obstacle.id} obstacle={obstacle} gameState={gameState} />
      ))}
      
      {coins.map((coin) => (
        <CoinComponent key={coin.id} coin={coin} gameState={gameState} />
      ))}
      
      {powerUps.map((powerUp) => (
        <PowerUpComponent key={powerUp.id} powerUp={powerUp} gameState={gameState} />
      ))}
      
      {/* Environment effects */}
      <fog attach="fog" args={['#1A1A2E', 25, 120]} />
    </>
  );
}

// Enhanced HUD
function GameHUD({ gameState }: { gameState: GameState }) {
  return (
    <div className="game-hud">
      {/* Main score display */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="score-display rounded-xl px-8 py-4 text-center slide-in">
          <div className="font-game text-3xl font-bold text-primary mb-2 glow-primary">
            {gameState.score.toLocaleString()}
          </div>
          <div className="font-sans text-lg text-accent">
            {Math.floor(gameState.distance)}m
          </div>
        </div>
      </div>
      
      {/* Speed indicator */}
      <div className="absolute top-6 right-6 z-50">
        <div className="score-display rounded-lg px-4 py-3">
          <div className="font-game text-sm text-primary mb-1">SPEED</div>
          <div className="font-game text-xl font-bold text-accent">
            {gameState.speed.toFixed(1)}x
          </div>
        </div>
      </div>
      
      {/* Lives indicator */}
      <div className="absolute top-6 left-6 z-50">
        <div className="score-display rounded-lg px-4 py-3">
          <div className="font-game text-sm text-primary mb-1">LIVES</div>
          <div className="flex space-x-1">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < gameState.lives ? 'bg-primary glow-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Pause indicator */}
      {gameState.isPaused && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="font-game text-4xl font-bold text-primary glow-primary pulse-glow">
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
        <h1 className="font-game text-5xl font-bold text-primary glow-primary pulse-glow">
          GAME OVER
        </h1>
        
        <div className="space-y-4">
          <div className="font-game text-3xl text-accent">
            {gameState.score.toLocaleString()}
          </div>
          <div className="font-sans text-lg text-foreground">
            Distance: {Math.floor(gameState.distance)}m
          </div>
          <div className="font-sans text-lg text-foreground">
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
        <h1 className="font-game text-7xl font-bold text-primary glow-primary pulse-glow">
          3D RUNNER
        </h1>
        
        <div className="space-y-6 text-foreground font-sans">
          <p className="text-2xl text-accent">
            Navigate three lanes, avoid obstacles, collect coins!
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
            Collect coins for 10 points each • Game speeds up over time
          </div>
        </div>
        
        <button
          onClick={onStart}
          className="game-button px-16 py-5 rounded-xl text-2xl font-bold"
        >
          START GAME
        </button>
      </div>
    </div>
  );
}

// Main Game Component
export default function Game3D() {
  const {
    gameState,
    playerState,
    obstacles,
    coins,
    powerUps,
    movePlayer,
    jumpPlayer,
    slidePlayer,
    togglePause,
    startGame,
    restartGame
  } = useGameLogic();

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
    <div className="game-container">
      {/* 3D Canvas */}
      <Canvas
        className="game-canvas"
        camera={{ position: [0, 2.5, 6], fov: 75 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: "high-performance"
        }}
        shadows
      >
        <GameScene
          gameState={gameState}
          playerState={playerState}
          obstacles={obstacles}
          coins={coins}
          powerUps={powerUps}
        />
      </Canvas>

      {/* UI Overlays */}
      {gameState.isPlaying && <GameHUD gameState={gameState} />}
      {!gameState.isPlaying && !gameState.isGameOver && <StartScreen onStart={startGame} />}
      <GameOverScreen gameState={gameState} onRestart={restartGame} />
      
      {/* Controls hint */}
      {gameState.isPlaying && !gameState.isPaused && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="text-center text-sm text-muted-foreground font-sans bg-background/30 backdrop-blur-sm rounded-lg px-4 py-2">
            ← → Move | ↑ Jump | ↓ Slide | Space Pause
          </div>
        </div>
      )}
    </div>
  );
}