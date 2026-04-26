import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings2, Keyboard, Volume2, Zap, Play, RotateCcw, Trophy } from 'lucide-react';
import { TetrisEngine, GameState, Difficulty, DIFFICULTY_CONFIGS } from './tetrisEngine';

const AREA_X = 10; // standard tetris width
const AREA_Y = 20; // standard tetris height
const CELL_SIZE = 24; // px per cell

// Zen-themed block colors that blend with the dashboard palette
const ZEN_BLOCK_COLORS = [
  '#7fba6d', // L-piece - fresh green
  '#5b9bd5', // J-piece - calm blue
  '#e8a838', // S-piece - warm amber
  '#e07040', // Z-piece - sunset orange
  '#b06cb8', // T-piece - gentle purple
  '#8fa883', // O-piece - sage green (matches theme primary)
  '#e06070', // I-piece - soft coral
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function BlocksView() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGhost, setShowGhost] = useState(true);
  const [showHighscores, setShowHighscores] = useState(false);
  const [gameOverScore, setGameOverScore] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const engineRef = useRef<TetrisEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize game engine
  useEffect(() => {
    const engine = new TetrisEngine(
      AREA_X,
      AREA_Y,
      (state: GameState) => setGameState(state),
      (score: number) => setGameOverScore(score)
    );
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          engine.moveUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          engine.moveDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          engine.moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          engine.moveRight();
          break;
        case ' ':
          e.preventDefault();
          engine.hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          engine.pause();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          engine.start();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setGameOverScore(null);
    setShowHighscores(false);
    engine.setDifficulty(difficulty);
    engine.start();
  }, [difficulty]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
    setGameOverScore(null);
  }, []);

  const handleToggleSettings = useCallback(() => {
    const opening = !showSettings;
    setShowSettings(opening);
    if (opening && gameState?.isRunning && !gameState?.isPaused) {
      engineRef.current?.pause();
    }
  }, [showSettings, gameState]);

  // Build the full rendered board including the active piece & ghost
  const renderBoard = (): (number | null)[][] => {
    if (!gameState) {
      return Array.from({ length: AREA_Y }, () => new Array(AREA_X).fill(null));
    }

    // Deep copy the board
    const display = gameState.board.map(row => [...row]);

    if (gameState.currentPiece) {
      const { board: pBoard, x: px, y: py, type } = gameState.currentPiece;

      // Draw ghost piece first (underneath)
      if (difficulty === 'relaxed' && showGhost && gameState.ghostY !== null && gameState.ghostY !== py) {
        for (let y = 0; y < pBoard.length; y++) {
          for (let x = 0; x < pBoard[y].length; x++) {
            if (pBoard[y][x]) {
              const boardY = gameState.ghostY + y;
              const boardX = px + x;
              if (boardY >= 0 && boardY < AREA_Y && boardX >= 0 && boardX < AREA_X) {
                if (display[boardY][boardX] === null) {
                  display[boardY][boardX] = type + 100; // 100+ = ghost marker
                }
              }
            }
          }
        }
      }

      // Draw current piece
      for (let y = 0; y < pBoard.length; y++) {
        for (let x = 0; x < pBoard[y].length; x++) {
          if (pBoard[y][x]) {
            const boardY = py + y;
            const boardX = px + x;
            if (boardY >= 0 && boardY < AREA_Y && boardX >= 0 && boardX < AREA_X) {
              display[boardY][boardX] = type;
            }
          }
        }
      }
    }

    return display;
  };

  // Render next piece preview
  const renderNextPiece = () => {
    if (!gameState || !gameState.isRunning) return null;

    const PUZZLES: number[][][] = [
      [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      [[1, 1], [1, 1]],
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    ];

    const shape = PUZZLES[gameState.nextType];
    let minX = 4, maxX = -1, minY = 4, maxY = -1;

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX > maxX) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

    const cols = maxX - minX + 1;
    const cells = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const hasBlock = shape[y]?.[x] === 1;
        cells.push(
          <div
            key={`${x}-${y}`}
            className="rounded-sm transition-all duration-150"
            style={{
              width: 16,
              height: 16,
              backgroundColor: hasBlock
                ? ZEN_BLOCK_COLORS[gameState.nextType]
                : 'transparent',
              boxShadow: hasBlock
                ? `0 0 8px ${ZEN_BLOCK_COLORS[gameState.nextType]}50, inset 0 1px 0 rgba(255,255,255,0.3)`
                : undefined,
            }}
          />
        );
      }
    }

    return (
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cells}
      </div>
    );
  };

  const displayBoard = renderBoard();
  const stats = gameState?.stats;
  const isRunning = gameState?.isRunning ?? false;
  const isPaused = gameState?.isPaused ?? false;
  const isGameOver = gameState?.isGameOver ?? false;
  const highscores = engineRef.current?.getHighscores() ?? [];

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
                  <Keyboard size={16} className="text-primary" />
                  <span className="text-sm">Arrow Keys</span>
                </div>
                <button className="cursor-pointer w-11 h-6 rounded-full bg-primary relative">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-primary" />
                  <span className="text-sm">Sound FX</span>
                </div>
                <button className="cursor-pointer w-11 h-6 rounded-full bg-primary relative">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  <span className="text-sm">Ghost Piece</span>
                </div>
                <button
                  onClick={() => setShowGhost(!showGhost)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${showGhost ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div
                    className="cursor-pointer absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all"
                    style={{ left: showGhost ? 'calc(100% - 22px)' : '2px' }}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-border">
                <label className="text-xs text-muted-foreground mb-2 block">Difficulty</label>
                <div className="flex gap-1">
                  {(['relaxed', 'normal', 'challenge'] as Difficulty[]).map((d) => {
                    const config = DIFFICULTY_CONFIGS[d];
                    const isActive = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setDifficulty(d);
                          engineRef.current?.setDifficulty(d);
                        }}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs text-center transition-all ${isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80'
                          }`}
                      >
                        <span className="cursor-pointer block text-sm mb-0.5">{config.icon}</span>
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>↑ Arrow</span><span>Rotate</span></div>
                  <div className="flex justify-between"><span>← → Arrows</span><span>Move</span></div>
                  <div className="flex justify-between"><span>↓ Arrow</span><span>Soft Drop</span></div>
                  <div className="flex justify-between"><span>Space</span><span>Hard Drop</span></div>
                  <div className="flex justify-between"><span>N</span><span>New Game</span></div>
                  <div className="flex justify-between"><span>P</span><span>Pause</span></div>
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
              {stats?.score ?? 0}
            </div>
          </div>

          {/* Level */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center text-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-1">Level</div>
            <div className="text-xl font-bold text-foreground">{stats?.level ?? 1}</div>
          </div>

          {/* Lines */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center text-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-1">Lines</div>
            <div className="text-xl font-bold text-foreground">{stats?.lines ?? 0}</div>
          </div>

          {/* Time & APM */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border flex flex-col items-center justify-center text-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="flex justify-between text-xs mb-2 w-full px-1">
              <span className="text-muted-foreground">Time</span>
              <span className="text-foreground font-medium">{formatTime(stats?.time ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs w-full px-1">
              <span className="text-muted-foreground">APM</span>
              <span className="text-foreground font-medium">{stats?.apm ?? 0}</span>
            </div>
          </div>

          {/* Highscores button */}
          <button
            onClick={() => setShowHighscores(!showHighscores)}
            className="cursor-pointer w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <Trophy size={18} className="text-muted-foreground group-hover:text-foreground transition-all" />
            <span className="text-xs font-medium">Highscores</span>
          </button>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex lg:hidden flex-col w-full  mt-1">
          <div className="flex justify-between items-center bg-card/60 backdrop-blur-md rounded-xl p-2 px-3 border border-border shadow-sm">
            <div className="flex gap-4 text-xs font-bold font-mono">
              <div><span className="text-muted-foreground mr-1 text-[10px]">SC</span>{stats?.score ?? 0}</div>
              <div><span className="text-muted-foreground mr-1 text-[10px]">LV</span>{stats?.level ?? 1}</div>
              <div><span className="text-muted-foreground mr-1 text-[10px]">LN</span>{stats?.lines ?? 0}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 relative flex items-center justify-center">
                <div className="absolute scale-[0.45]">
                  {renderNextPiece()}
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                {isRunning && !isGameOver && (
                  <button
                    onClick={handlePause}
                    className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-all"
                  >
                    {isPaused ? <Play size={12} className="ml-0.5" /> : <div className="flex gap-[3px]"><div className="w-1 h-3 bg-current rounded-[1px]"></div><div className="w-1 h-3 bg-current rounded-[1px]"></div></div>}
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={handleStart}
                    className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-all"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}

                {!isRunning && !isGameOver && (
                  <button
                    onClick={handleStart}
                    className="cursor-pointer w-7 h-7 bg-primary text-primary-foreground rounded-lg flex items-center justify-center transition-all shadow-sm"
                  >
                    <Play size={12} className="ml-0.5" />
                  </button>
                )}

                <button
                  onClick={() => setShowHighscores(!showHighscores)}
                  className="cursor-pointer w-7 h-7 bg-card bg-opacity-80 border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                >
                  <Trophy size={11} />
                </button>
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
          style={{ containerType: 'size' }} // Enables CSS container queries for dynamic sizing
        >
          {/* Grid lines overlay & board styling */}
          <div
            className="relative bg-card/40 backdrop-blur-md rounded-2xl border border-border shadow-2xl overflow-hidden"
            style={{
              width: `min(100cqi, ${100 * (AREA_X / AREA_Y)}cqh)`,
              height: `min(${100 * (AREA_Y / AREA_X)}cqi, 100cqh)`,
              boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)',
              padding: 6,
            }}
          >
            <div
              className="grid w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${AREA_X}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${AREA_Y}, minmax(0, 1fr))`,
                gap: 1,
              }}
            >
              {displayBoard.map((row, y) =>
                row.map((cell, x) => {
                  const isGhost = cell !== null && cell >= 100;
                  const blockType = isGhost ? cell - 100 : cell;
                  const color = blockType !== null ? ZEN_BLOCK_COLORS[blockType] : undefined;

                  return (
                    <div
                      key={`${x}-${y}`}
                      className="rounded-[1px] transition-all duration-75 w-full h-full"
                      style={{
                        backgroundColor: isGhost
                          ? `${color}30`
                          : color
                            ? color
                            : 'transparent',
                        opacity: isGhost ? 0.6 : 1,
                        boxShadow: color && !isGhost
                          ? `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 6px ${color}30`
                          : undefined,
                        border: isGhost
                          ? `1px dashed ${color}60`
                          : color
                            ? `1px solid rgba(255,255,255,0.15)`
                            : '1px solid transparent',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Paused overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                <div className="text-2xl font-bold text-foreground mb-2">⏸ Paused</div>
                <button
                  onClick={handlePause}
                  className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md"
                >
                  Resume (P)
                </button>
              </div>
            )}

            {/* Game over overlay */}
            {isGameOver && (
              <div className="absolute inset-0 bg-card/85 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                <div className="text-2xl font-bold text-destructive mb-2">Game Over</div>
                <div className="text-lg font-medium text-foreground mb-1">
                  Score: {gameOverScore ?? 0}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Lines: {stats?.lines ?? 0} • Level: {stats?.level ?? 1} • {DIFFICULTY_CONFIGS[gameState?.difficulty ?? 'normal'].icon} {DIFFICULTY_CONFIGS[gameState?.difficulty ?? 'normal'].label}
                </div>
                <button
                  onClick={handleStart}
                  className="cursor-pointer px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-md flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  Play Again
                </button>
              </div>
            )}

            {/* Start screen */}
            {!isRunning && !isGameOver && (
              <div className="absolute inset-0 bg-card/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
                <div className="text-3xl mb-2" style={{ fontFamily: 'system-ui' }}>🎮</div>
                <div className="text-xl font-bold text-foreground mb-1">Tetras</div>
                <div className="text-xs text-muted-foreground mb-4 text-center px-8">
                  Use arrow keys to move & rotate.<br />
                  Space for hard drop.
                </div>

                {/* Difficulty selector */}
                <div className="flex gap-2 mb-5 px-4 w-full">
                  {(['relaxed', 'normal', 'challenge'] as Difficulty[]).map((d) => {
                    const config = DIFFICULTY_CONFIGS[d];
                    const isActive = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          setDifficulty(d);
                          engineRef.current?.setDifficulty(d);
                        }}
                        className={`flex-1 py-2.5 px-1 rounded-xl cursor-pointer text-center transition-all duration-200 border ${isActive
                          ? 'bg-primary/15 border-primary/50 shadow-sm'
                          : 'bg-background/30 border-transparent hover:bg-background/50 hover:border-border'
                          }`}
                      >
                        <span className="cursor-pointer block text-lg mb-0.5">{config.icon}</span>
                        <span className={`block text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                          {config.label}
                        </span>
                        <span className={`block text-[10px] mt-0.5 leading-tight ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
                          }`}>
                          {config.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleStart}
                  className="cursor-pointer px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm shadow-lg flex items-center gap-2 hover:scale-105"
                >
                  <Play size={14} />
                  Start Game (N)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Next piece + controls */}
        <div className="hidden lg:flex flex-col gap-3 min-w-[100px]">
          {/* Next piece */}
          <div
            className="w-full aspect-square bg-card/40 backdrop-blur-md rounded-xl p-4 border border-border flex flex-col justify-center items-center"
            style={{ boxShadow: '0 8px 32px rgba(143, 168, 131, 0.1), inset 0 2px 8px rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-xs text-muted-foreground mb-3 text-center">Next</div>
            <div className="flex items-center justify-center min-h-[72px]">
              {renderNextPiece() || (
                <div className="text-xs text-muted-foreground/50">—</div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap lg:flex-col gap-2 flex-1 lg:flex-none justify-center">
            {isRunning && !isGameOver && (
              <button
                onClick={handlePause}
                className="cursor-pointer px-4 py-2 bg-card/60 text-foreground rounded-lg border border-border hover:border-primary/50 hover:bg-card/80 transition-all text-sm flex items-center gap-2 justify-center"
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}

            {isRunning && (
              <button
                onClick={handleStart}
                className="cursor-pointer px-4 py-2 bg-card/60 text-foreground rounded-lg border border-border hover:border-primary/50 hover:bg-card/80 transition-all text-sm flex items-center gap-2 justify-center"
              >
                <RotateCcw size={13} />
                New Game
              </button>
            )}

            {!isRunning && !isGameOver && (
              <button
                onClick={handleStart}
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
                onClick={() => engineRef.current?.moveUp()}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-90"
              >
                ↑
              </button>
              <div />
              <button
                onClick={() => engineRef.current?.moveLeft()}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-90"
              >
                ←
              </button>
              <button
                onClick={() => engineRef.current?.hardDrop()}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-primary/30 transition-all text-[10px] active:scale-90"
              >
                ⬇
              </button>
              <button
                onClick={() => engineRef.current?.moveRight()}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-90"
              >
                →
              </button>
              <div />
              <button
                onClick={() => engineRef.current?.moveDown()}
                className="cursor-pointer w-8 h-8 mx-auto rounded-lg bg-background/60 border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background/80 hover:border-primary/40 transition-all text-xs active:scale-90"
              >
                ↓
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* Highscores modal */}
      {showHighscores && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
          <div
            className="bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Trophy size={16} className="text-primary" />
                Highscores
              </h3>
              <button
                onClick={() => setShowHighscores(false)}
                className="cursor-pointer w-7 h-7 rounded-lg bg-background/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {highscores.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No highscores yet. Start playing!
              </div>
            ) : (
              <div className="space-y-2">
                {highscores.map((hs, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-sm text-foreground">{hs.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{hs.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
