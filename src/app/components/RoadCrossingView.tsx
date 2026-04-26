import { Settings2, Users, Bell, Music, Gauge, Play, RotateCcw } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

type GameState = 'idle' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';
type TrafficSpeed = 'Slow' | 'Normal' | 'Fast';
type Direction = 'up' | 'down' | 'left' | 'right';
type Obstacle = { id: number; x: number; y: number; direction: 'left' | 'right' };

const GRID_WIDTH = 9;
const GRID_HEIGHT = 8;
const START_POS = { x: 4, y: 7 };

const createInitialObstacles = (): Obstacle[] => [
  { id: 1, x: 2, y: 5, direction: 'right' },
  { id: 2, x: 5, y: 5, direction: 'right' },
  { id: 3, x: 1, y: 4, direction: 'left' },
  { id: 4, x: 6, y: 4, direction: 'left' },
  { id: 5, x: 3, y: 3, direction: 'right' },
  { id: 6, x: 7, y: 3, direction: 'right' },
  { id: 7, x: 0, y: 2, direction: 'left' },
  { id: 8, x: 4, y: 2, direction: 'left' },
];

export function RoadCrossingView() {
  const [showSettings, setShowSettings] = useState(false);
  const [playerPosition, setPlayerPosition] = useState(START_POS);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [trafficSpeed, setTrafficSpeed] = useState<TrafficSpeed>('Normal');
  const [character, setCharacter] = useState('🐸');
  const [obstacles, setObstacles] = useState<Obstacle[]>(createInitialObstacles());

  const containerRef = useRef<HTMLDivElement>(null);

  const getSpeedInterval = () => {
    switch (trafficSpeed) {
      case 'Slow': return 600;
      case 'Fast': return 250;
      case 'Normal':
      default: return 400;
    }
  };

  const handleLevelUp = useCallback(() => {
    setScore(s => s + 100 * level);
    setLevel(l => l + 1);
    setPlayerPosition(START_POS);
  }, [level]);

  const handleGameOver = useCallback(() => {
    setGameState('gameover');
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    if (gameState !== 'playing') return;

    setPlayerPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, prev.y - 1);
          break;
        case 'down':
          newY = Math.min(GRID_HEIGHT - 1, prev.y + 1);
          break;
        case 'left':
          newX = Math.max(0, prev.x - 1);
          break;
        case 'right':
          newX = Math.min(GRID_WIDTH - 1, prev.x + 1);
          break;
      }

      // Check win condition (reached the top safe zone)
      if (newY === 0 && prev.y !== 0) {
        setTimeout(() => {
          setGameState('levelcomplete');
          setTimeout(() => {
            handleLevelUp();
            setGameState('playing');
          }, 1500);
        }, 50);
        return { x: newX, y: newY };
      }

      // Small score increment for moving up
      if (newY < prev.y && newY <= 6) {
        setTimeout(() => setScore(s => s + 10), 0);
      }

      return { x: newX, y: newY };
    });
  }, [gameState, handleLevelUp]);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, []);

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' && e.key !== 'p' && e.key !== 'P') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove('right');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, gameState, togglePause]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setObstacles(prev => prev.map(obs => {
        if (obs.direction === 'right') {
          return { ...obs, x: obs.x >= GRID_WIDTH - 1 ? 0 : obs.x + 1 };
        } else {
          return { ...obs, x: obs.x <= 0 ? GRID_WIDTH - 1 : obs.x - 1 };
        }
      }));
    }, Math.max(getSpeedInterval() - (level * 15), 100)); // Gets slightly faster each level

    return () => clearInterval(interval);
  }, [gameState, trafficSpeed, level]);

  // Collision Detection
  useEffect(() => {
    if (gameState !== 'playing') return;

    const collided = obstacles.some(
      obs => obs.x === playerPosition.x && obs.y === playerPosition.y
    );
    if (collided) {
      handleGameOver();
    }
  }, [playerPosition, obstacles, gameState, handleGameOver]);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setPlayerPosition(START_POS);
    setObstacles(createInitialObstacles());
    setGameState('playing');
  };

  const handleToggleSettings = useCallback(() => {
    const opening = !showSettings;
    setShowSettings(opening);
    if (opening && gameState === 'playing') {
      setGameState('paused');
    }
  }, [showSettings, gameState]);

  const isRunning = gameState === 'playing' || gameState === 'paused';
  const isPaused = gameState === 'paused';
  const isGameOver = gameState === 'gameover';

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col p-2 lg:p-4 relative overflow-hidden focus:outline-none"
      tabIndex={0}
    >
      {/* Settings modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-2xl p-6 w-80 max-w-sm mx-4 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Settings2 size={18} className="text-primary" />
                Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="cursor-pointer w-7 h-7 rounded-lg bg-background/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-primary" />
                  <span className="text-sm">Traffic Speed</span>
                </div>
                <select
                  value={trafficSpeed}
                  onChange={(e) => setTrafficSpeed(e.target.value as TrafficSpeed)}
                  className="px-2 py-1 text-xs bg-background rounded-md border border-border"
                >
                  <option value="Slow">Slow</option>
                  <option value="Normal">Normal</option>
                  <option value="Fast">Fast</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-primary" />
                  <span className="text-sm">Haptic Feedback</span>
                </div>
                <button className="cursor-pointer w-11 h-6 rounded-full bg-primary relative">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Music size={16} className="text-primary" />
                  <span className="text-sm">Ambient Sounds</span>
                </div>
                <button className="cursor-pointer w-11 h-6 rounded-full bg-primary relative">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="pt-3 border-t border-border">
                <label className="text-xs text-muted-foreground mb-2 block">Character</label>
                <div className="flex gap-2">
                  {['🐸', '🦆', '🐢', '🐇'].map((char) => (
                    <button
                      key={char}
                      onClick={() => setCharacter(char)}
                      className={`cursor-pointer w-10 h-10 rounded-lg bg-background/50 border transition-all duration-200 text-lg ${character === char ? 'border-primary bg-primary/20' : 'border-border hover:border-primary/50 hover:bg-primary/10'
                        }`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main game layout */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 w-full max-w-full flex-1 min-h-0 h-full justify-center">
        {/* Stats panel (left) */}
        <div className="hidden lg:flex flex-col gap-3 min-w-[120px]">
          {/* Settings button */}
          <button
            onClick={handleToggleSettings}
            className="cursor-pointer w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center gap-2 hover:bg-card/60 transition-all group lg:min-h-[64px]"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <Settings2 size={16} className="text-muted-foreground group-hover:text-foreground transition-all" />
            <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-all">Settings</div>
          </button>

          {/* Score */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center text-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-1">Score</div>
            <div
              className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              style={{ fontFamily: 'system-ui' }}
            >
              {score}
            </div>
          </div>

          {/* Level */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center text-center flex-1 lg:flex-none"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-1">Level</div>
            <div className="text-xl font-bold text-foreground">{level}</div>
          </div>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex lg:hidden flex-col w-full mt-1">
          <div className="flex justify-between items-center bg-card/60 backdrop-blur-md rounded-xl p-2 px-3 border border-border shadow-sm">
            <div className="flex gap-4 text-xs font-bold font-mono">
              <div><span className="text-muted-foreground mr-1 text-[10px]">SC</span>{score}</div>
              <div><span className="text-muted-foreground mr-1 text-[10px]">LV</span>{level}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                {isRunning && !isGameOver && (
                  <button
                    onClick={togglePause}
                    className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-all"
                  >
                    {isPaused ? <Play size={12} className="ml-0.5" /> : <div className="flex gap-[3px]"><div className="w-1 h-3 bg-current rounded-[1px]"></div><div className="w-1 h-3 bg-current rounded-[1px]"></div></div>}
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={startGame}
                    className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-all"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}

                {!isRunning && !isGameOver && (
                  <button
                    onClick={startGame}
                    className="cursor-pointer w-7 h-7 bg-primary text-primary-foreground rounded-lg flex items-center justify-center transition-all shadow-sm"
                  >
                    <Play size={12} className="ml-0.5" />
                  </button>
                )}

                <button
                  onClick={handleToggleSettings}
                  className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                >
                  <Settings2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Game board wrapper */}
        <div
          className="relative flex-1 min-h-0 w-full lg:w-auto overflow-hidden flex items-start justify-center p-2 lg:p-0"
          style={{ containerType: 'size' }}
        >
          <div
            className="relative bg-gradient-to-b from-secondary/30 via-muted/20 to-secondary/30 rounded-2xl border border-border overflow-hidden"
            style={{
              width: `min(100cqi, ${100 * (GRID_WIDTH / GRID_HEIGHT)}cqh)`,
              height: `min(${100 * (GRID_HEIGHT / GRID_WIDTH)}cqi, 100cqh)`,
              boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)',
              padding: 6,
            }}
          >
            <div
              className="grid w-full h-full relative"
              style={{
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
              }}
            >
              {Array.from({ length: GRID_HEIGHT * GRID_WIDTH }).map((_, index) => {
                const x = index % GRID_WIDTH;
                const y = Math.floor(index / GRID_WIDTH);
                const isPlayer = x === playerPosition.x && y === playerPosition.y;
                const obstacle = obstacles.find(o => o.x === x && o.y === y);
                const isRoad = y >= 2 && y <= 5;
                const isSafeZone = y === 0 || y === 7;

                return (
                  <div
                    key={index}
                    className={`
                      w-full h-full flex items-center justify-center transition-all duration-200 relative
                      ${isSafeZone ? 'bg-primary/20 border-y border-primary/30/50' : isRoad ? `bg-slate/30 border-b border-slate/40 ${y === 2 ? 'border-t' : ''}` : 'bg-background/20'}
                    `}
                    style={{
                      boxShadow: isRoad ? '-inset 0 2px 8px rgba(92, 111, 122, 0.05)' : undefined
                    }}
                  >
                  </div>
                );
              })}

              <div className="absolute inset-0 pointer-events-none">
                {gameState !== 'idle' && (
                  <div
                    className="absolute flex items-center justify-center z-20 transition-all duration-200 drop-shadow-md"
                    style={{
                      width: `${100 / GRID_WIDTH}%`, height: `${100 / GRID_HEIGHT}%`,
                      left: `${(playerPosition.x / GRID_WIDTH) * 100}%`,
                      top: `${(playerPosition.y / GRID_HEIGHT) * 100}%`
                    }}
                  >
                    <span className="text-2xl animate-pulse transition-transform">{character}</span>
                  </div>
                )}
                
                {gameState !== 'idle' && obstacles.map(obs => {
                  const isWrapping = (obs.direction === 'right' && obs.x === 0) || (obs.direction === 'left' && obs.x === GRID_WIDTH - 1);
                  return (
                    <div
                      key={obs.id}
                      className="absolute flex items-center justify-center z-10 -drop-shadow-md"
                      style={{
                        width: `${100 / GRID_WIDTH}%`, height: `${100 / GRID_HEIGHT}%`,
                        left: `${(obs.x / GRID_WIDTH) * 100}%`,
                        top: `${(obs.y / GRID_HEIGHT) * 100}%`,
                        transition: isWrapping ? 'none' : `all ${Math.max(getSpeedInterval() - (level * 15), 100)}ms linear`
                      }}
                    >
                      <span className="text-2xl transform inline-block" style={{ transform: obs.direction === 'left' ? 'scaleX(1)' : 'scaleX(-1)' }}>
                        🚗
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overlays */}
            {gameState === 'idle' && (
              <div className="absolute inset-0 bg-card/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                <div className="text-3xl mb-2" style={{ fontFamily: 'system-ui' }}>🛣️</div>
                <div className="text-xl font-bold text-foreground mb-1">Cross the Road</div>
                <div className="text-xs text-muted-foreground mb-4 text-center px-8">
                  Use arrow keys to move.<br />
                  Reach top to progress.
                </div>
                <button
                  onClick={startGame}
                  className="cursor-pointer px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-lg flex items-center gap-2 hover:scale-105"
                >
                  <Play size={14} />
                  Start Crossing
                </button>
              </div>
            )}

            {isPaused && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                <div className="text-2xl font-bold text-foreground mb-2">⏸ Paused</div>
                <button
                  onClick={togglePause}
                  className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md"
                >
                  Resume (P)
                </button>
              </div>
            )}

            {gameState === 'levelcomplete' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-md border border-primary/40 shadow-[inset_0_0_80px_rgba(143,168,131,0.3)] animate-in fade-in duration-300">
                <div className="text-4xl mb-2 animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">Level {level} Cleared!</h2>
                <div className="text-sm font-medium text-foreground opacity-80 decoration-slice">
                  Get ready...
                </div>
              </div>
            )}

            {gameState === 'gameover' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-destructive/10 backdrop-blur-md border border-destructive/20 shadow-[inset_0_0_100px_rgba(255,0,0,0.1)]">
                <div className="text-3xl mb-1">💥</div>
                <h2 className="text-2xl font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Splat!</h2>
                <div className="text-lg font-medium text-foreground mb-1">
                  Score: {score}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Level: {level}
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-lg shadow-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95"
                >
                  <RotateCcw size={16} />
                  Try Again
                </button>
              </div>
            )}

            <div className="absolute top-2 left-4 px-2 py-1 bg-primary/20 rounded-md text-xs text-primary font-medium border border-primary/30">
              🎯 Goal Zone
            </div>
            <div className="absolute bottom-2 left-4 px-2 py-1 bg-primary/20 rounded-md text-xs text-primary font-medium border border-primary/30">
              🏁 Start
            </div>
          </div>
        </div>

        {/* Right panel: Controls */}
        <div className="hidden lg:flex flex-col gap-3 min-w-[100px]">
          {/* Active Player preview */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-4 border border-border flex flex-col justify-center items-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-3 text-center">Character</div>
            <div className="flex items-center justify-center min-h-[72px] text-4xl">
              {character}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap lg:flex-col gap-2 flex-1 lg:flex-none justify-center">
            {isRunning && !isGameOver && (
              <button
                onClick={togglePause}
                className="cursor-pointer px-4 py-2 bg-card/60 text-foreground rounded-lg border border-border hover:border-primary/50 hover:bg-card/80 transition-all text-sm flex items-center gap-2 justify-center"
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}

            {isRunning && (
              <button
                onClick={startGame}
                className="cursor-pointer px-4 py-2 bg-card/60 text-foreground rounded-lg border border-border hover:border-primary/50 hover:bg-card/80 transition-all text-sm flex items-center gap-2 justify-center"
              >
                <RotateCcw size={13} />
                New Game
              </button>
            )}

            {!isRunning && !isGameOver && (
              <button
                onClick={startGame}
                className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md flex items-center gap-2 justify-center"
              >
                <Play size={14} />
                Start
              </button>
            )}
          </div>

          {/* Touch / on-screen controls */}
          <div
            className="w-full lg:w-auto bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-2 text-center">Controls</div>
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                onClick={() => handleMove('up')}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-95"
              >
                ↑
              </button>
              <div />
              <button
                onClick={() => handleMove('left')}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-95"
              >
                ←
              </button>
              <button
                onClick={() => handleMove('down')}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-95"
              >
                ↓
              </button>
              <button
                onClick={() => handleMove('right')}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-95"
              >
                →
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

