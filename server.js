// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = "jugador!B2:AX";

// Crear carpeta de fotos si no existe
const photosDir = path.join(__dirname, "photos");
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir);
}

// 🔥 Normaliza nombres → sin tildes, sin ñ, sin caracteres raros
function normalizeText(str) {
  return str
    .normalize("NFD")                  // separar tildes
    .replace(/[\u0300-\u036f]/g, "")   // quitar tildes
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .toLowerCase()
    .trim();
}

// Convierte link de Drive → link directo descargable
function convertDriveUrl(url) {
  if (!url) return "";

  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
  }

  const match1 = url.match(/\/file\/d\/([^/]+)\//);
  if (match1) {
    return `https://drive.google.com/thumbnail?id=${match1[1]}&sz=w1000`;
  }

  const match2 = url.match(/id=([^&]+)/);
  if (match2) {
    return `https://drive.google.com/thumbnail?id=${match2[1]}&sz=w1000`;
  }

  return url;
}

// --- Servir frontend
app.use(express.static(path.join(__dirname, "public")));

// --- Servir fotos locales
app.use("/photos", express.static(path.join(__dirname, "photos")));

// --- Cache RAM
let cachedPlayers = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60 * 1000;

// Descargar imagen si no existe
async function downloadPhoto(photoUrl, filename) {
  const filepath = path.join(photosDir, filename);

  if (fs.existsSync(filepath)) {
    return; // ya existe, no descarga
  }

  try {
    const response = await axios({
      url: photoUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    fs.writeFileSync(filepath, response.data);
    console.log("📸 Foto guardada:", filename);
  } catch (err) {
    console.error("❌ Error descargando foto:", filename, err.message);
  }
}

// --- API principal
app.get("/api/players", async (req, res) => {
  const now = Date.now();

  // Cache válido → retorno inmediato
  if (cachedPlayers && now - lastFetch < CACHE_TTL_MS) {
    return res.json(cachedPlayers);
  }

  try {
    // Llamar Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    });

    const rows = response.data.values || [];

    const idxName = 0;
    const idxPhoto = 29;
    const idxBalance = 48;

    const players = [];

    for (const r of rows) {
      const name = (r[idxName] || "").trim();
      let balance = (r[idxBalance] || "0").trim();

      // regla especial
      if (name.toLowerCase() === "jesus david traslavina fuentes") {
        balance = "0";
      }

      const driveUrl = convertDriveUrl((r[idxPhoto] || "").trim());

      // 🔥 NORMALIZAR NOMBRE PARA USARLO COMO ARCHIVO
      const safeName = normalizeText(name);
      const filename = safeName.replace(/\s+/g, "_") + ".jpg";

      // Descargar foto si no existe
      if (driveUrl) {
        await downloadPhoto(driveUrl, filename);
      }

      const localPhotoUrl = `/photos/${filename}`;

      players.push({
        name,
        photo: localPhotoUrl,
        balance
      });
    }

    // Guardar en cache RAM
    cachedPlayers = players;
    lastFetch = now;

    res.json(players);

  } catch (err) {
    console.error("ERROR /api/players:", err);

    if (cachedPlayers) {
      return res.json(cachedPlayers);
    }

    res.status(500).json({ error: err.message });
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`✅ Backend funcionando en http://localhost:${PORT}`);
});
