require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = "jugador!B2:AX";
const CACHE_FILE = path.join(__dirname, "cache.json");
const PHOTOS_DIR = path.join(__dirname, "photos");
const SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds

// Ensure photos directory exists
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR);
}

// --- IN-MEMORY STATE ---
let cachedPlayers = [];
let lastSyncTime = 0;

// --- UTILS ---

// Normalize text for filenames
function normalizeText(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove special chars
    .trim()
    .toLowerCase();
}

// Convert Drive URL to direct download URL
function convertDriveUrl(url) {
  if (!url) return "";
  // Direct ID match (common in some copy-paste scenarios)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
  }
  // Standard /file/d/ format
  const match1 = url.match(/\/file\/d\/([^/]+)\//);
  if (match1) {
    return `https://drive.google.com/thumbnail?id=${match1[1]}&sz=w1000`;
  }
  // Query param id= format
  const match2 = url.match(/id=([^&]+)/);
  if (match2) {
    return `https://drive.google.com/thumbnail?id=${match2[1]}&sz=w1000`;
  }
  return url;
}

// --- CORE LOGIC ---

// Load cache from disk on startup
function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      cachedPlayers = JSON.parse(data);
      console.log(`💾 Loaded ${cachedPlayers.length} players from disk cache.`);
    }
  } catch (err) {
    console.error("⚠️ Error loading disk cache:", err.message);
  }
}

// Background Image Downloader
async function downloadMissingImages(players) {
  for (const p of players) {
    if (!p.driveUrl) continue;

    const filename = p.filename;
    const filepath = path.join(PHOTOS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      try {
        console.log(`⬇️ Downloading photo for: ${p.name}`);
        const response = await axios({
          url: p.driveUrl,
          method: "GET",
          responseType: "arraybuffer",
          timeout: 10000, // 10s timeout
        });
        fs.writeFileSync(filepath, response.data);
      } catch (err) {
        console.error(`❌ Failed to download photo for ${p.name}:`, err.message);
      }
    }
  }
}

// Main Sync Function
async function syncData() {
  console.log("🔄 Starting background sync...");
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values || [];
    const idxName = 0;
    const idxPhoto = 29;
    const idxBalance = 48;

    const newPlayers = [];

    for (const r of rows) {
      const name = (r[idxName] || "").trim();
      if (!name) continue; // Skip empty names

      let balance = (r[idxBalance] || "0").trim();

      // Special rule
      if (name.toLowerCase() === "jesus david traslavina fuentes") {
        balance = "0";
      }

      const driveUrl = convertDriveUrl((r[idxPhoto] || "").trim());
      const safeName = normalizeText(name);
      const filename = safeName.replace(/\s+/g, "_") + ".jpg";

      newPlayers.push({
        name,
        balance,
        photo: `/photos/${filename}`, // Public URL
        filename, // Internal use for downloader
        driveUrl, // Internal use for downloader
      });
    }

    // Atomic update of memory cache
    cachedPlayers = newPlayers;
    lastSyncTime = Date.now();

    // Persist to disk
    fs.writeFileSync(CACHE_FILE, JSON.stringify(newPlayers, null, 2));
    console.log(`✅ Synced ${newPlayers.length} players. Data saved to disk.`);

    // Trigger image download in background (don't await)
    downloadMissingImages(newPlayers);

  } catch (err) {
    console.error("🔥 Sync failed:", err.message);
    // On error, we just keep the old cache.
  }
}

// --- SERVER SETUP ---

// 1. Load initial state
loadCacheFromDisk();

// 2. Start background loop
// Run immediately on start (non-blocking)
syncData();
// Schedule interval
setInterval(syncData, SYNC_INTERVAL_MS);

// 3. Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use("/photos", express.static(PHOTOS_DIR, { maxAge: "1d" })); // Cache photos for 1 day

// 4. API Endpoint
app.get("/api/players", (req, res) => {
  // Ultra-fast response from memory
  res.set("Cache-Control", "public, max-age=30"); // Browser cache 30s
  res.json(cachedPlayers);
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Mode: High Performance (Background Sync + RAM Cache)`);
});
