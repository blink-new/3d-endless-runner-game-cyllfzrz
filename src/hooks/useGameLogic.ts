import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PlayerState, Obstacle, Coin, PowerUp } from '../types/game';

const LANE_POSITIONS = [-3, 0, 3];
const SPAWN_DISTANCE = 50;
const COIN_VALUE = 10;
const COLLISION_THRESHOLD = 1.5;

export function useGameLogic() {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    distance: 0,
    speed: 1,
    lives: 3
  });

  const [playerState, setPlayerState] = useState<PlayerState>({
    lane: 1,
    isJumping: false,
    isSliding: false,
    position: { x: 0, y: 0, z: 0 },
    animation: 'running'
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  const gameLoopRef = useRef<number>();
  const spawnTimerRef = useRef<number>(0);

  // Collision detection
  const checkCollisions = useCallback(() => {
    const playerX = LANE_POSITIONS[playerState.lane];
    // const playerY = playerState.isJumping ? 2 : playerState.isSliding ? -0.3 : 0.5;
    const playerZ = 0;

    // Check obstacle collisions
    obstacles.forEach(obstacle => {
      if (obstacle.isActive && obstacle.position.z > -2 && obstacle.position.z < 2) {
        const distance = Math.sqrt(
          Math.pow(playerX - LANE_POSITIONS[obstacle.lane], 2) +
          Math.pow(playerZ - obstacle.position.z, 2)
        );

        if (distance < COLLISION_THRESHOLD && obstacle.lane === playerState.lane) {
          // Check if player can avoid obstacle
          const canJumpOver = playerState.isJumping && obstacle.height < 1.5;
          const canSlideUnder = playerState.isSliding && obstacle.height > 1;
          
          if (!canJumpOver && !canSlideUnder) {
            // Collision detected
            setGameState((prev: GameState) => {
              const newLives = prev.lives - 1;
              return {
                ...prev,
                lives: newLives,
                isGameOver: newLives <= 0
              };
            });
            
            // Remove the obstacle
            setObstacles((prev: Obstacle[]) => prev.filter(obs => obs.id !== obstacle.id));
          }
        }
      }
    });

    // Check coin collections
    coins.forEach(coin => {
      if (!coin.collected && coin.position.z > -2 && coin.position.z < 2) {
        const distance = Math.sqrt(
          Math.pow(playerX - LANE_POSITIONS[coin.lane], 2) +
          Math.pow(playerZ - coin.position.z, 2)
        );

        if (distance < COLLISION_THRESHOLD && coin.lane === playerState.lane) {
          // Coin collected
          setGameState((prev: GameState) => ({
            ...prev,
            score: prev.score + COIN_VALUE
          }));
          
          // Mark coin as collected
          setCoins((prev: Coin[]) => prev.filter(c => c.id !== coin.id));
        }
      }
    });
  }, [playerState, obstacles, coins]);

  // Spawn objects
  const spawnObjects = useCallback(() => {
    spawnTimerRef.current += 1;
    
    // Spawn rate increases with speed
    const spawnRate = Math.max(0.01, 0.03 - gameState.speed * 0.005);
    
    if (Math.random() < spawnRate) {
      const lane = Math.floor(Math.random() * 3);
      const objectType = Math.random();
      
      if (objectType < 0.65) {
        // Spawn obstacle
        const obstacleTypes = ['barrier', 'spike'] as const;
        const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        const newObstacle: Obstacle = {
          id: `obstacle-${Date.now()}-${Math.random()}`,
          type: 'obstacle',
          obstacleType,
          position: { x: LANE_POSITIONS[lane], y: 0, z: -SPAWN_DISTANCE },
          lane,
          isActive: true,
          height: obstacleType === 'barrier' ? 2 : 1
        };
        
        setObstacles((prev: Obstacle[]) => [...prev, newObstacle]);
      } else if (objectType < 0.9) {
        // Spawn coin
        const newCoin: Coin = {
          id: `coin-${Date.now()}-${Math.random()}`,
          type: 'coin',
          position: { x: LANE_POSITIONS[lane], y: 1, z: -SPAWN_DISTANCE },
          lane,
          isActive: true,
          collected: false
        };
        
        setCoins((prev: Coin[]) => [...prev, newCoin]);
      } else {
        // Spawn power-up (rare)
        const powerTypes = ['speed', 'shield', 'magnet'] as const;
        const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        
        const newPowerUp: PowerUp = {
          id: `powerup-${Date.now()}-${Math.random()}`,
          type: 'powerup',
          powerType,
          position: { x: LANE_POSITIONS[lane], y: 1, z: -SPAWN_DISTANCE },
          lane,
          isActive: true,
          duration: 5000 // 5 seconds
        };
        
        setPowerUps(prev => [...prev, newPowerUp]);
      }
    }
  }, [gameState.speed]);

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      // Update game state
      setGameState(prev => ({
        ...prev,
        distance: prev.distance + prev.speed * 0.5,
        speed: Math.min(3, 1 + prev.distance / 2000) // Gradual speed increase
      }));

      // Update object positions
      setObstacles(prev => prev.map(obstacle => ({
        ...obstacle,
        position: {
          ...obstacle.position,
          z: obstacle.position.z + gameState.speed * 0.3
        }
      })).filter(obstacle => obstacle.position.z < 10));

      setCoins(prev => prev.map(coin => ({
        ...coin,
        position: {
          ...coin.position,
          z: coin.position.z + gameState.speed * 0.3
        }
      })).filter(coin => coin.position.z < 10));

      setPowerUps(prev => prev.map(powerUp => ({
        ...powerUp,
        position: {
          ...powerUp.position,
          z: powerUp.position.z + gameState.speed * 0.3
        }
      })).filter(powerUp => powerUp.position.z < 10));

      // Spawn new objects
      spawnObjects();
      
      // Check collisions
      checkCollisions();
    }, 50); // 20 FPS for game logic

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver, gameState.speed, spawnObjects, checkCollisions]);

  // Player controls
  const movePlayer = useCallback((direction: 'left' | 'right') => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    setPlayerState(prev => ({
      ...prev,
      lane: direction === 'left' 
        ? Math.max(0, prev.lane - 1)
        : Math.min(2, prev.lane + 1)
    }));
  }, [gameState.isPlaying, gameState.isPaused]);

  const jumpPlayer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || playerState.isJumping || playerState.isSliding) return;
    
    setPlayerState(prev => ({ ...prev, isJumping: true }));
    setTimeout(() => {
      setPlayerState(prev => ({ ...prev, isJumping: false }));
    }, 600);
  }, [gameState.isPlaying, gameState.isPaused, playerState.isJumping, playerState.isSliding]);

  const slidePlayer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || playerState.isJumping || playerState.isSliding) return;
    
    setPlayerState(prev => ({ ...prev, isSliding: true }));
    setTimeout(() => {
      setPlayerState(prev => ({ ...prev, isSliding: false }));
    }, 400);
  }, [gameState.isPlaying, gameState.isPaused, playerState.isJumping, playerState.isSliding]);

  const togglePause = useCallback(() => {
    if (!gameState.isPlaying) return;
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, [gameState.isPlaying]);

  const startGame = useCallback(() => {
    setGameState({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      distance: 0,
      speed: 1,
      lives: 3
    });
    
    setPlayerState({
      lane: 1,
      isJumping: false,
      isSliding: false,
      position: { x: 0, y: 0, z: 0 },
      animation: 'running'
    });
    
    setObstacles([]);
    setCoins([]);
    setPowerUps([]);
    spawnTimerRef.current = 0;
  }, []);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  return {
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
  };
}