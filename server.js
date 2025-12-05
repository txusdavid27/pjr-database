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
const RANGE = "jugador!A2:AY";
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

// Helper to parse numbers safely
function parseNum(val) {
  if (!val) return 0;
  // Remove currency symbols, dots (thousands), replace comma with dot if needed
  // Assuming format might be "1.000" or "1,000" or "$ 1000"
  // Simple approach: remove everything except digits, minus sign.
  // BUT, we need to handle decimals.
  // Let's assume standard input. If it has non-numeric chars, strip them.
  const clean = val.toString().replace(/[^0-9.-]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
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
    const newPlayers = [];

    // Column Indices based on A=0
    // A=0, B=1, ..., AX=49

    for (const r of rows) {
      // Helper to get value at index safely
      const get = (i) => (r[i] || "").trim();

      const id = get(0);
      const nombre = get(1);

      if (!nombre) continue; // Skip if no name

      // Map all fields
      const player = {
        id: id,
        nombre: nombre,
        apodo: get(2),
        numero: get(3),
        nacimiento: get(4),
        edad: parseNum(get(5)),
        sexo: get(6),
        activo: get(7),
        lesiones: get(8),
        caracter: get(9),
        fortalezas: get(10),
        debilidades: get(11),
        velocidad: parseNum(get(12)),
        resistencia: parseNum(get(13)),
        fuerza: parseNum(get(14)),
        cabeza: parseNum(get(15)),
        tiro: parseNum(get(16)),
        defenza: parseNum(get(17)),
        ataque: parseNum(get(18)),
        pase: parseNum(get(19)),
        tiro_2: parseNum(get(20)), // Repeated field
        goles: parseNum(get(21)),
        amarillas: parseNum(get(22)),
        rojas: parseNum(get(23)),
        asistencias: parseNum(get(24)),
        atajadas: parseNum(get(25)),
        mejor_tiempo: get(26),
        roles: get(27),
        posicion: get(28),
        posicion_secundaria: get(29),
        // Photo is at index 30 (Column AE)
        // Wait, let's verify indices carefully.
        // List provided:
        // 0:id, 1:nombre, ..., 29:posicion_secundaria, 30:foto
        foto_url_raw: get(30),
        contacto_emergencia: get(31),
        contacto_propio: get(32),
        documento: get(33),
        apariciones: parseNum(get(34)),
        puntualidad: parseNum(get(35)),
        disputados: parseNum(get(36)),
        partidos_pagos: parseNum(get(37)),
        deuda_partidos: parseNum(get(38)),
        amarillas_pagas: parseNum(get(39)),
        rojas_pagas: parseNum(get(40)),
        deuda_tarjetas: parseNum(get(41)),
        deuda_uniformes: parseNum(get(42)),
        deuda_inscripcion: parseNum(get(43)),
        aporte_total: parseNum(get(44)),
        deuda_total: parseNum(get(45)),
        bonos: parseNum(get(46)),
        pares_de_amarillas: parseNum(get(47)),
        arco_cero: parseNum(get(48)),
        balance_neto: parseNum(get(49)), // AX
        entrenamientos: parseNum(get(50)),
      };

      // Special rule for specific user (legacy logic preserved)
      if (player.nombre.toLowerCase() === "jesus david traslavina fuentes") {
        player.balance_neto = 0;
      }

      // Handle Photo Logic
      const driveUrl = convertDriveUrl(player.foto_url_raw);
      const safeName = normalizeText(player.nombre);
      const filename = safeName.replace(/\s+/g, "_") + ".jpg";

      // Add computed fields for frontend
      player.photo = `/photos/${filename}`;
      player.filename = filename;
      player.driveUrl = driveUrl;

      // Backward compatibility for existing frontend (optional but good practice)
      player.name = player.nombre;
      player.balance = player.balance_neto; // Map to old field name if needed by current UI before update

      newPlayers.push(player);
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
