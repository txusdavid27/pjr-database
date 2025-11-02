// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = "jugador!B2:AX";


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




// Servir frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/players", async (req, res) => {
  try {
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

    const idxName = 0;       // Columna B → primer col del rango
    const idxPhoto = 31 - 2; // Columna AE (31) → 29
    const idxBalance = 50 - 2; // Columna AX (50) → 48

    const players = rows.map(r => {
      const name = (r[idxName] || "").trim();
      let balance = (r[idxBalance] || "0").trim();

      // ✅ AQUI la regla especial para Jesús David
      if (name.toLowerCase() === "jesus david traslavina fuentes".toLowerCase()) {
        balance = "0";
      }

      return {
        name,
        photo: convertDriveUrl((r[idxPhoto] || "").trim()),
        balance
      };
    });

    res.json(players);
  } catch (err) {
    console.error("ERROR /api/players:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend funcionando en http://localhost:${PORT}`);
});