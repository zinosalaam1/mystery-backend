import express from "express";
import cors from "cors";
import fs from "fs";
import { v4 as uuid } from "uuid";

const app = express();

// ✅ CORS setup for credentials
app.use(cors({
  origin: "https://tour-arcade-mystery.vercel.app/", // <-- your frontend URL
  credentials: true
}));

app.use(express.json());

const GAME_FILE = "./data/gameState.json";

// Load game state
function loadGame() {
  return JSON.parse(fs.readFileSync(GAME_FILE));
}

// Save game state
function saveGame(state) {
  fs.writeFileSync(GAME_FILE, JSON.stringify(state, null, 2));
}

// Generate 15 random reward boxes
function generateRewardBoxes() {
  let boxes = [];
  while (boxes.length < 15) {
    let num = Math.floor(Math.random() * 50) + 1;
    if (!boxes.includes(num)) boxes.push(num);
  }
  return boxes;
}

// Initialize game at startup
function initializeGame() {
  let state = loadGame();
  if (!state.rewardBoxes.length) {
    state.rewardBoxes = generateRewardBoxes();
    saveGame(state);
  }
}
initializeGame();

// 🟡 Ping route
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// 🟡 Register username
app.post("/api/register", (req, res) => {
  const { username } = req.body;

  let state = loadGame();

  if (state.players[username]) {
    return res.json({ success: true, alreadyPlayed: true });
  }

  state.players[username] = {
    id: uuid(),
    played: false
  };

  saveGame(state);

  res.json({ success: true });
});

// 🔵 User selects a box
app.post("/api/select-box", (req, res) => {
  const { username, boxNumber } = req.body;

  let state = loadGame();

  if (!state.players[username]) {
    return res.json({ success: false, message: "User not registered." });
  }

  if (state.players[username].played) {
    return res.json({ success: false, message: "User already played." });
  }

  const isReward = state.rewardBoxes.includes(boxNumber);

  // Mark player as played
  state.players[username].played = true;

  let rewardWon = false;
  let message = "No reward";

  if (isReward && state.claimedRewards < 5) {
    rewardWon = true;
    state.claimedRewards += 1;
    state.winners.push({ username, boxNumber });
    message = "You won!";
  }

  saveGame(state);

  res.json({
    success: true,
    reward: rewardWon,
    message,
    rewardsLeft: 5 - state.claimedRewards,
    isReward
  });
});

// 🟣 Reset game (optional)
app.get("/api/reset", (req, res) => {
  let newState = {
    winners: [],
    claimedRewards: 0,
    rewardBoxes: generateRewardBoxes(),
    players: {}
  };

  saveGame(newState);
  res.json({ success: true, message: "Game reset!" });
});

app.listen(5000, () => console.log("Backend running on port 5000"));
