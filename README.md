# Zen Games — VS Code Extension

> Take a mindful break without leaving your editor. Zen Games is a VS Code extension that brings a curated collection of calming mini-games directly into your sidebar or main editor panel.

---

## Overview

Zen Games lives in the Activity Bar sidebar, giving you instant, one-click access to a game whenever you need a short mental reset. A single **Expand** button pops the game into a full main-editor panel for a more immersive experience—no context switching, no new windows.

The extension automatically syncs state between the sidebar and the expanded editor panel: closing the full-panel view seamlessly returns focus to the sidebar, right where you left off.

---

## Screenshots

<p align="center">
  <img src="media/screenshots/landing_dark.png" width="340" alt="Landing screen in dark mode" />
</p>

### Tetras — Block Puzzle

Tetras is a zen-tuned Tetris variant. On launch you choose a difficulty mode—**Relaxed**, **Normal**, or **Challenge**—each adjusting fall speed, level-up cadence, and whether garbage rows appear. Your companion **Pixel Pal** cheers you on from the bottom of the sidebar.

<p align="center">
  <img src="media/screenshots/tetras_dark.png" width="340" alt="Tetras game in dark mode showing mode picker and Pixel Pal companion" />
</p>

### Road Crossing

Guide your character safely across a multi-lane road using the arrow keys. The **Safety Owl** companion keeps you motivated at the bottom of the panel. Score and level are tracked in real time.

<p align="center">
  <img src="media/screenshots/road_crossing_dark.png" width="340" alt="Road Crossing in dark mode" />
</p>

---

## Features

| Feature              | Details                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| 🎮 **Tetras**        | 3-difficulty Tetris (Relaxed / Normal / Challenge) with score, level & line tracking |
| 🚗 **Road Crossing** | Arrow-key frogger-style game with progressively harder traffic                       |

---

## Getting Started

### Install from Marketplace

1. Open the **Extensions** view in VS Code (`Cmd/Ctrl + Shift + X`).
2. Search for **"Zen Games"**.
3. Click **Install**.
4. The Zen Games icon appears in the Activity Bar — click it to open the panel.
5. Pick a game and start playing.

---

## Game Controls

### Tetras

| Key       | Action                    |
| --------- | ------------------------- |
| `←` / `→` | Move piece left / right   |
| `↓`       | Soft drop (faster fall)   |
| `↑`       | Rotate piece clockwise    |
| `Space`   | Hard drop (instant place) |
| `P`       | Pause / Resume            |

### Road Crossing

| Key       | Action                          |
| --------- | ------------------------------- |
| `↑`       | Move character up (toward goal) |
| `↓`       | Move character down             |
| `←` / `→` | Move character left / right     |

---

## Extension Commands

| Command            | Trigger                   | Description                                 |
| ------------------ | ------------------------- | ------------------------------------------- |
| `zen-games.start`  | Command Palette           | Focus / open the Zen Games sidebar          |
| `zen-games.expand` | `⤢` icon in sidebar title | Expand the active game into the main editor |

---

## License

MIT — see [LICENSE](LICENSE) for details.
