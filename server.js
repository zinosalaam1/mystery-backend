import express from "express";
import cors from "cors";
import fs from "fs";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve dirname (ESM does not support __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_FILE = path.join(__dirname, "data", "gameState.json");
const MAX_CHANCES = 3;

app.use(cors({
  origin: "https://tour-arcade-mystery.vercel.app",
  credentials: true
}));

app.use(express.json());

// Ensure gameState.json exists
if (!fs.existsSync(GAME_FILE)) {
  fs.writeFileSync(
    GAME_FILE,
    JSON.stringify({
      winners: [],
      claimedRewards: 0,
      rewardBoxes: [],
      players: {}
    }, null, 2)
  );
}

// Load/save game state
const loadGame = () => JSON.parse(fs.readFileSync(GAME_FILE));
const saveGame = (state) =>
  fs.writeFileSync(GAME_FILE, JSON.stringify(state, null, 2));

// Generate 15 random reward boxes
const generateRewardBoxes = () => {
  let boxes = [];
  while (boxes.length < 15) {
    const num = Math.floor(Math.random() * 50) + 1;
    if (!boxes.includes(num)) boxes.push(num);
  }
  return boxes;
};

// Initialize game
const initializeGame = () => {
  const state = loadGame();
  if (!state.rewardBoxes.length) {
    state.rewardBoxes = generateRewardBoxes();
    saveGame(state);
  }
};
initializeGame();

// Ping
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Register user
app.post("/api/register", (req, res) => {
  const { username } = req.body;
  let state = loadGame();

  if (!state.players[username]) {
    state.players[username] = {
      id: uuid(),
      remainingChances: MAX_CHANCES,
      playedBoxes: []
    };
    saveGame(state);
  }

  res.json({
    success: true,
    remainingChances: state.players[username].remainingChances
  });
});

// Select box
app.post("/api/select-box", (req, res) => {
  const { username, boxNumber } = req.body;
  let state = loadGame();

  const player = state.players[username];
  if (!player) {
    return res.status(400).json({ success: false, message: "User not registered." });
  }

  if (player.remainingChances <= 0) {
    return res.json({ success: false, message: "No remaining chances.", remainingChances: 0 });
  }

  if (player.playedBoxes.includes(boxNumber)) {
    return res.json({
      success: false,
      message: "Box already selected.",
      remainingChances: player.remainingChances
    });
  }

  const isReward = state.rewardBoxes.includes(boxNumber) && state.claimedRewards < 5;

  if (isReward) {
    state.claimedRewards += 1;
    state.winners.push({ username, boxNumber });
  }

  player.playedBoxes.push(boxNumber);
  player.remainingChances -= 1;

  saveGame(state);

  res.json({
    success: true,
    reward: isReward,
    message: isReward ? "You won!" : "No reward",
    remainingChances: player.remainingChances,
    rewardsLeft: 5 - state.claimedRewards
  });
});

// Reset game
app.get("/api/reset", (req, res) => {
  const newState = {
    winners: [],
    claimedRewards: 0,
    rewardBoxes: generateRewardBoxes(),
    players: {}
  };
  saveGame(newState);

  res.json({ success: true, message: "Game reset!" });
});

// Run server
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
