/*
 * Tetris Game Engine
 * Ported from JsTetris by Czarek Tomczak (https://github.com/cztomczak/jstetris)
 * Original License: BSD (revised)
 * Adapted for React with callback-based rendering
 *
 * Score:
 * 1) puzzle speed = 80+700/level
 * 2) if puzzles created in current level >= 10+level*2 then increase level
 * 3) after puzzle falling score is increased by 1000*level*linesRemoved
 * 4) each down action increases score by 5+level
 */

// Block colors matching the zen theme
export const BLOCK_COLORS = [
	"#38C44F", // block0 - green (L-piece)
	"#32a4fa", // block1 - blue (J-piece)
	"#FFAC1C", // block2 - orange (S-piece)
	"#FF6600", // block3 - deep orange (Z-piece)
	"#CC54C4", // block4 - purple (T-piece)
	"#999999", // block5 - grey (O-piece)
	"#FF0000", // block6 - red (I-piece)
];

// All 7 tetromino shapes
const PUZZLES: number[][][] = [
	// 0: L-piece
	[
		[0, 0, 1],
		[1, 1, 1],
		[0, 0, 0],
	],
	// 1: J-piece
	[
		[1, 0, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	// 2: S-piece
	[
		[0, 1, 1],
		[1, 1, 0],
		[0, 0, 0],
	],
	// 3: Z-piece
	[
		[1, 1, 0],
		[0, 1, 1],
		[0, 0, 0],
	],
	// 4: T-piece
	[
		[0, 1, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	// 5: O-piece (square)
	[
		[1, 1],
		[1, 1],
	],
	// 6: I-piece
	[
		[0, 0, 0, 0],
		[1, 1, 1, 1],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
];

// ─── Difficulty System ────────────────────────────────────

export type Difficulty = "relaxed" | "normal" | "challenge";

export interface DifficultyConfig {
	/** Label shown in UI */
	label: string;
	/** Description shown in UI */
	description: string;
	/** Speed multiplier (lower = faster). Applied to base speed formula. */
	speedMultiplier: number;
	/** Starting level */
	startLevel: number;
	/** Puzzles needed per level = base + level * factor */
	levelUpBase: number;
	levelUpFactor: number;
	/** Score multiplier for line clears and soft drops */
	scoreMultiplier: number;
	/** Number of pre-filled garbage rows at start (0 for none) */
	garbageRows: number;
	/** Emoji icon for UI */
	icon: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
	relaxed: {
		label: "Relaxed",
		description: "Slower speed, easy level-ups",
		speedMultiplier: 1.5,
		startLevel: 1,
		levelUpBase: 15,
		levelUpFactor: 1,
		scoreMultiplier: 0.5,
		garbageRows: 0,
		icon: "🌿",
	},
	normal: {
		label: "Normal",
		description: "Classic tetris experience",
		speedMultiplier: 1.0,
		startLevel: 1,
		levelUpBase: 10,
		levelUpFactor: 2,
		scoreMultiplier: 1.0,
		garbageRows: 0,
		icon: "🎮",
	},
	challenge: {
		label: "Challenge",
		description: "Faster, garbage rows, bonus points",
		speedMultiplier: 0.7,
		startLevel: 3,
		levelUpBase: 8,
		levelUpFactor: 3,
		scoreMultiplier: 1.5,
		garbageRows: 4,
		icon: "🔥",
	},
};

export interface GameStats {
	score: number;
	level: number;
	lines: number;
	time: number;
	apm: number;
	actions: number;
	puzzles: number;
}

export interface GameState {
	board: (number | null)[][]; // null = empty, number = block type (0-6)
	currentPiece: {
		type: number;
		board: boolean[][];
		x: number;
		y: number;
	} | null;
	nextType: number;
	stats: GameStats;
	difficulty: Difficulty;
	isRunning: boolean;
	isPaused: boolean;
	isGameOver: boolean;
	ghostY: number | null;
}

export type GameStateCallback = (state: GameState) => void;
export type GameOverCallback = (score: number) => void;

function randomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

export class TetrisEngine {
	// Area dimensions
	private areaX: number;
	private areaY: number;

	// Difficulty
	private difficulty: Difficulty = "normal";
	private diffConfig: DifficultyConfig = DIFFICULTY_CONFIGS["normal"];

	// Board: null = empty, number = block type color index
	private board: (number | null)[][];

	// Current puzzle state
	private puzzleType: number = 0;
	private nextType: number = 0;
	private puzzlePosition: number = 0;
	private puzzleBoard: boolean[][] = [];
	private puzzleX: number = 0;
	private puzzleY: number = 0;
	private puzzleSpeed: number = 780;
	private puzzleRunning: boolean = false;
	private puzzleStopped: boolean = false;

	// Timers
	private fallDownID: ReturnType<typeof setTimeout> | null = null;
	private forceMoveDownID: ReturnType<typeof setTimeout> | null = null;
	private statsTimerID: ReturnType<typeof setInterval> | null = null;

	// Stats
	private score: number = 0;
	private level: number = 1;
	private lines: number = 0;
	private time: number = 0;
	private apm: number = 0;
	private actions: number = 0;
	private puzzleCount: number = 0; // puzzles on current level

	// Game state
	private running: boolean = false;
	private paused: boolean = false;
	private gameOver: boolean = false;

	// Highscores stored in localStorage
	private highscores: { name: string; score: number }[] = [];

	// Callbacks
	private onStateChange: GameStateCallback;
	private onGameOver: GameOverCallback;

	constructor(
		areaX: number,
		areaY: number,
		onStateChange: GameStateCallback,
		onGameOver: GameOverCallback,
	) {
		this.areaX = areaX;
		this.areaY = areaY;
		this.onStateChange = onStateChange;
		this.onGameOver = onGameOver;

		// Initialize empty board
		this.board = this.createEmptyBoard();

		// Load highscores
		this.loadHighscores();

		// Init random types
		this.nextType = randomInt(PUZZLES.length);
	}

	// ─── Public API ──────────────────────────────────────────

	/** Set difficulty. Must be called before start(). */
	setDifficulty(difficulty: Difficulty): void {
		this.difficulty = difficulty;
		this.diffConfig = DIFFICULTY_CONFIGS[difficulty];
	}

	getDifficulty(): Difficulty {
		return this.difficulty;
	}

	start(): void {
		this.resetGame();
		this.level = this.diffConfig.startLevel;
		this.startStats();
		// Add garbage rows for challenge difficulty
		if (this.diffConfig.garbageRows > 0) {
			this.addGarbageRows(this.diffConfig.garbageRows);
		}
		this.initPuzzle();
		if (this.mayPlace()) {
			this.place();
		} else {
			this.triggerGameOver();
		}
	}

	reset(): void {
		this.clearTimers();
		this.board = this.createEmptyBoard();
		this.score = 0;
		this.level = this.diffConfig.startLevel;
		this.lines = 0;
		this.time = 0;
		this.apm = 0;
		this.actions = 0;
		this.puzzleCount = 0;
		this.running = false;
		this.paused = false;
		this.gameOver = false;
		this.puzzleRunning = false;
		this.puzzleStopped = false;
		this.nextType = randomInt(PUZZLES.length);
		this.emitState();
	}

	pause(): void {
		if (!this.running) return;

		if (this.paused) {
			// Resume
			this.puzzleRunning = true;
			this.fallDownID = setTimeout(() => this.fallDown(), this.puzzleSpeed);
			this.statsTimerID = setInterval(() => this.incTime(), 1000);
			this.paused = false;
		} else {
			if (!this.puzzleRunning) return;
			if (this.fallDownID) clearTimeout(this.fallDownID);
			if (this.statsTimerID) clearInterval(this.statsTimerID);
			this.paused = true;
			this.puzzleRunning = false;
		}
		this.emitState();
	}

	moveUp(): void {
		if (
			this.running &&
			this.puzzleRunning &&
			!this.puzzleStopped &&
			!this.paused
		) {
			if (this.mayRotate()) {
				this.rotate();
				this.actions++;
				this.emitState();
			}
		}
	}

	moveDown(): void {
		if (
			this.running &&
			this.puzzleRunning &&
			!this.puzzleStopped &&
			!this.paused
		) {
			if (this.mayMoveDown()) {
				this.score += Math.round(
					(5 + this.level) * this.diffConfig.scoreMultiplier,
				);
				this.doMoveDown();
				this.actions++;
				this.emitState();
			}
		}
	}

	moveLeft(): void {
		if (
			this.running &&
			this.puzzleRunning &&
			!this.puzzleStopped &&
			!this.paused
		) {
			if (this.canMoveLeft()) {
				this.doMoveLeft();
				this.actions++;
				this.emitState();
			}
		}
	}

	moveRight(): void {
		if (
			this.running &&
			this.puzzleRunning &&
			!this.puzzleStopped &&
			!this.paused
		) {
			if (this.canMoveRight()) {
				this.doMoveRight();
				this.actions++;
				this.emitState();
			}
		}
	}

	hardDrop(): void {
		if (
			this.running &&
			this.puzzleRunning &&
			!this.puzzleStopped &&
			!this.paused
		) {
			this.puzzleRunning = false;
			this.puzzleStopped = true;
			if (this.fallDownID) clearTimeout(this.fallDownID);
			this.forceMoveDownLoop();
		}
	}

	isPausedState(): boolean {
		return this.paused;
	}

	isRunningState(): boolean {
		return this.running;
	}

	isGameOverState(): boolean {
		return this.gameOver;
	}

	getHighscores(): { name: string; score: number }[] {
		return [...this.highscores];
	}

	destroy(): void {
		this.clearTimers();
	}

	// ─── Internal: Board ─────────────────────────────────────

	private createEmptyBoard(): (number | null)[][] {
		const board: (number | null)[][] = [];
		for (let y = 0; y < this.areaY; y++) {
			board.push(new Array(this.areaX).fill(null));
		}
		return board;
	}

	/**
	 * Add garbage rows at the bottom with random gaps.
	 * Used by Challenge difficulty to start with a harder board.
	 */
	private addGarbageRows(count: number): void {
		for (let i = 0; i < count; i++) {
			const gapX = randomInt(this.areaX); // one random gap per row
			const row: (number | null)[] = [];
			for (let x = 0; x < this.areaX; x++) {
				row.push(x === gapX ? null : 5); // use block type 5 (grey) for garbage
			}
			// Remove top empty row and add garbage at bottom
			this.board.shift();
			this.board.push(row);
		}
	}

	// ─── Internal: Stats ─────────────────────────────────────

	private startStats(): void {
		this.score = 0;
		this.level = 1;
		this.lines = 0;
		this.time = 0;
		this.apm = 0;
		this.actions = 0;
		this.puzzleCount = 0;
		if (this.statsTimerID) clearInterval(this.statsTimerID);
		this.statsTimerID = setInterval(() => this.incTime(), 1000);
	}

	private incTime(): void {
		this.time++;
		if (this.time > 0) {
			this.apm = Math.floor((this.actions / this.time) * 60);
		}
		this.emitState();
	}

	// ─── Internal: Game flow ─────────────────────────────────

	private resetGame(): void {
		this.clearTimers();
		this.board = this.createEmptyBoard();
		this.running = true;
		this.paused = false;
		this.gameOver = false;
		this.puzzleRunning = false;
		this.puzzleStopped = false;
		this.nextType = randomInt(PUZZLES.length);
	}

	private triggerGameOver(): void {
		this.clearTimers();
		this.running = false;
		this.puzzleRunning = false;
		this.gameOver = true;

		// Check highscore
		if (this.mayAddHighscore(this.score)) {
			this.addHighscore("Player", this.score);
		}

		this.onGameOver(this.score);
		this.emitState();
	}

	private clearTimers(): void {
		if (this.fallDownID) {
			clearTimeout(this.fallDownID);
			this.fallDownID = null;
		}
		if (this.forceMoveDownID) {
			clearTimeout(this.forceMoveDownID);
			this.forceMoveDownID = null;
		}
		if (this.statsTimerID) {
			clearInterval(this.statsTimerID);
			this.statsTimerID = null;
		}
	}

	// ─── Internal: Puzzle management ─────────────────────────

	private initPuzzle(): void {
		if (this.fallDownID) clearTimeout(this.fallDownID);
		if (this.forceMoveDownID) clearTimeout(this.forceMoveDownID);

		this.puzzleType = this.nextType;
		this.nextType = randomInt(PUZZLES.length);
		this.puzzlePosition = 0;
		this.puzzleSpeed =
			(80 + 700 / this.level) * this.diffConfig.speedMultiplier;
		this.puzzleRunning = false;
		this.puzzleStopped = false;
		this.puzzleX = 0;
		this.puzzleY = 0;

		// Create the puzzle board from the shape
		const shape = PUZZLES[this.puzzleType];
		this.puzzleBoard = shape.map((row) => row.map((cell) => cell === 1));
	}

	private mayPlace(): boolean {
		const puzzle = PUZZLES[this.puzzleType];
		const startX = Math.floor((this.areaX - puzzle[0].length) / 2);
		const startY = 0;

		for (let y = puzzle.length - 1; y >= 0; y--) {
			for (let x = 0; x < puzzle[y].length; x++) {
				if (puzzle[y][x]) {
					const boardY = startY + y;
					const boardX = startX + x;
					if (
						boardY >= 0 &&
						boardY < this.areaY &&
						boardX >= 0 &&
						boardX < this.areaX
					) {
						if (this.board[boardY][boardX] !== null) {
							return false;
						}
					}
				}
			}
		}
		return true;
	}

	private place(): void {
		// Update stats
		this.puzzleCount++;
		if (
			this.puzzleCount >=
			this.diffConfig.levelUpBase + this.level * this.diffConfig.levelUpFactor
		) {
			this.level++;
			this.puzzleCount = 0;
		}

		const puzzle = PUZZLES[this.puzzleType];
		const startX = Math.floor((this.areaX - puzzle[0].length) / 2);
		const startY = 0;

		this.puzzleX = startX;
		this.puzzleY = startY;

		// Create puzzle board
		this.puzzleBoard = puzzle.map((row) => row.map((cell) => cell === 1));

		this.puzzleRunning = true;
		this.fallDownID = setTimeout(() => this.fallDown(), this.puzzleSpeed);

		this.emitState();
	}

	// ─── Internal: Movement ──────────────────────────────────

	private mayMoveDown(): boolean {
		for (let y = 0; y < this.puzzleBoard.length; y++) {
			for (let x = 0; x < this.puzzleBoard[y].length; x++) {
				if (this.puzzleBoard[y][x]) {
					const newY = this.puzzleY + y + 1;
					const newX = this.puzzleX + x;
					if (newY >= this.areaY) {
						this.puzzleStopped = true;
						return false;
					}
					if (newY >= 0 && this.board[newY][newX] !== null) {
						this.puzzleStopped = true;
						return false;
					}
				}
			}
		}
		return true;
	}

	private doMoveDown(): void {
		this.puzzleY++;
	}

	private canMoveLeft(): boolean {
		for (let y = 0; y < this.puzzleBoard.length; y++) {
			for (let x = 0; x < this.puzzleBoard[y].length; x++) {
				if (this.puzzleBoard[y][x]) {
					const newX = this.puzzleX + x - 1;
					const newY = this.puzzleY + y;
					if (newX < 0) return false;
					if (newY >= 0 && newY < this.areaY && this.board[newY][newX] !== null)
						return false;
				}
			}
		}
		return true;
	}

	private doMoveLeft(): void {
		this.puzzleX--;
	}

	private canMoveRight(): boolean {
		for (let y = 0; y < this.puzzleBoard.length; y++) {
			for (let x = 0; x < this.puzzleBoard[y].length; x++) {
				if (this.puzzleBoard[y][x]) {
					const newX = this.puzzleX + x + 1;
					const newY = this.puzzleY + y;
					if (newX >= this.areaX) return false;
					if (newY >= 0 && newY < this.areaY && this.board[newY][newX] !== null)
						return false;
				}
			}
		}
		return true;
	}

	private doMoveRight(): void {
		this.puzzleX++;
	}

	private mayRotate(): boolean {
		const board = this.puzzleBoard;
		for (let y = 0; y < board.length; y++) {
			for (let x = 0; x < board[y].length; x++) {
				if (board[y][x]) {
					const newY = this.puzzleY + x;
					const newX = this.puzzleX + board.length - 1 - y;
					if (newY >= this.areaY) return false;
					if (newX < 0 || newX >= this.areaX) return false;
					if (newY >= 0 && this.board[newY][newX] !== null) return false;
				}
			}
		}
		return true;
	}

	private rotate(): void {
		const board = this.puzzleBoard;
		const size = board.length;
		const newBoard: boolean[][] = Array.from({ length: size }, () =>
			new Array(board[0].length).fill(false),
		);

		for (let y = 0; y < board.length; y++) {
			for (let x = 0; x < board[y].length; x++) {
				if (board[y][x]) {
					const newY = x;
					const newX = size - 1 - y;
					newBoard[newY][newX] = true;
				}
			}
		}
		this.puzzleBoard = newBoard;
	}

	// ─── Internal: Falling ───────────────────────────────────

	private fallDown(): void {
		if (this.puzzleRunning) {
			if (this.mayMoveDown()) {
				this.doMoveDown();
				this.emitState();
				this.fallDownID = setTimeout(() => this.fallDown(), this.puzzleSpeed);
			} else {
				this.lockPiece();
				const removedLines = this.removeFullLines();
				if (removedLines > 0) {
					this.lines += removedLines;
					this.score += Math.round(
						1000 * this.level * removedLines * this.diffConfig.scoreMultiplier,
					);
				}
				this.initPuzzle();
				if (this.mayPlace()) {
					this.place();
				} else {
					this.triggerGameOver();
				}
			}
		}
	}

	private forceMoveDownLoop(): void {
		if (!this.puzzleRunning && !this.gameOver) {
			if (this.mayMoveDown2()) {
				this.score += Math.round(
					(5 + this.level) * this.diffConfig.scoreMultiplier,
				);
				this.actions++;
				this.doMoveDown();
				this.emitState();
				this.forceMoveDownID = setTimeout(() => this.forceMoveDownLoop(), 20);
			} else {
				this.lockPiece();
				const removedLines = this.removeFullLines();
				if (removedLines > 0) {
					this.lines += removedLines;
					this.score += 1000 * this.level * removedLines;
				}
				this.initPuzzle();
				if (this.mayPlace()) {
					this.place();
				} else {
					this.triggerGameOver();
				}
			}
		}
	}

	// Like mayMoveDown but doesn't set stopped flag
	private mayMoveDown2(): boolean {
		for (let y = 0; y < this.puzzleBoard.length; y++) {
			for (let x = 0; x < this.puzzleBoard[y].length; x++) {
				if (this.puzzleBoard[y][x]) {
					const newY = this.puzzleY + y + 1;
					const newX = this.puzzleX + x;
					if (newY >= this.areaY) return false;
					if (newY >= 0 && this.board[newY][newX] !== null) return false;
				}
			}
		}
		return true;
	}

	// ─── Internal: Board operations ──────────────────────────

	private lockPiece(): void {
		for (let y = 0; y < this.puzzleBoard.length; y++) {
			for (let x = 0; x < this.puzzleBoard[y].length; x++) {
				if (this.puzzleBoard[y][x]) {
					const boardY = this.puzzleY + y;
					const boardX = this.puzzleX + x;
					if (
						boardY >= 0 &&
						boardY < this.areaY &&
						boardX >= 0 &&
						boardX < this.areaX
					) {
						this.board[boardY][boardX] = this.puzzleType;
					}
				}
			}
		}
	}

	private removeFullLines(): number {
		let linesRemoved = 0;
		for (let y = this.areaY - 1; y >= 0; y--) {
			if (this.isLineFull(y)) {
				this.removeLine(y);
				linesRemoved++;
				y++; // recheck same row since lines shifted down
			}
		}
		return linesRemoved;
	}

	private isLineFull(y: number): boolean {
		for (let x = 0; x < this.areaX; x++) {
			if (this.board[y][x] === null) return false;
		}
		return true;
	}

	private removeLine(y: number): void {
		// Remove the line
		this.board.splice(y, 1);
		// Add empty line at top
		this.board.unshift(new Array(this.areaX).fill(null));
	}

	// ─── Internal: Ghost piece ───────────────────────────────

	private computeGhostY(): number | null {
		if (!this.puzzleRunning && !this.running) return null;
		let ghostY = this.puzzleY;
		while (true) {
			let canMove = true;
			for (let y = 0; y < this.puzzleBoard.length; y++) {
				for (let x = 0; x < this.puzzleBoard[y].length; x++) {
					if (this.puzzleBoard[y][x]) {
						const newY = ghostY + y + 1;
						const newX = this.puzzleX + x;
						if (newY >= this.areaY) {
							canMove = false;
							break;
						}
						if (newY >= 0 && this.board[newY][newX] !== null) {
							canMove = false;
							break;
						}
					}
				}
				if (!canMove) break;
			}
			if (canMove) {
				ghostY++;
			} else {
				break;
			}
		}
		return ghostY;
	}

	// ─── Internal: Highscores ────────────────────────────────

	private loadHighscores(): void {
		try {
			const data = localStorage.getItem("tetris-highscores");
			if (data) {
				this.highscores = JSON.parse(data);
			}
		} catch {
			this.highscores = [];
		}
	}

	private saveHighscores(): void {
		try {
			localStorage.setItem(
				"tetris-highscores",
				JSON.stringify(this.highscores),
			);
		} catch {
			// ignore storage errors
		}
	}

	private mayAddHighscore(score: number): boolean {
		if (score === 0) return false;
		if (this.highscores.length < 10) return true;
		for (const hs of this.highscores) {
			if (score > hs.score) return true;
		}
		return false;
	}

	addHighscore(name: string, score: number): void {
		this.highscores.push({ name, score });
		this.highscores.sort((a, b) => b.score - a.score);
		if (this.highscores.length > 10) {
			this.highscores = this.highscores.slice(0, 10);
		}
		this.saveHighscores();
	}

	// ─── Internal: State emission ────────────────────────────

	private emitState(): void {
		const currentPiece = this.running
			? {
					type: this.puzzleType,
					board: this.puzzleBoard,
					x: this.puzzleX,
					y: this.puzzleY,
				}
			: null;

		const ghostY =
			this.running && (this.puzzleRunning || !this.puzzleStopped)
				? this.computeGhostY()
				: null;

		const state: GameState = {
			board: this.board.map((row) => [...row]),
			currentPiece,
			nextType: this.nextType,
			stats: {
				score: this.score,
				level: this.level,
				lines: this.lines,
				time: this.time,
				apm: this.apm,
				actions: this.actions,
				puzzles: this.puzzleCount,
			},
			difficulty: this.difficulty,
			isRunning: this.running,
			isPaused: this.paused,
			isGameOver: this.gameOver,
			ghostY,
		};

		this.onStateChange(state);
	}
}
