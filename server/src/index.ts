import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';
import invoiceRoutes from './invoiceRoutes';

dotenv.config();

const app = express();
// Fester Port 3000, kein 3001 mehr
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * STATISCHE AUSLIEFERUNG DER BELEGDATEIEN
 * Dateien liegen unter /server/uploads
 * werden im Browser erreichbar unter /files/<dateiname>
 */
app.use('/files', express.static(path.join(process.cwd(), 'uploads')));

/**
 * EINGANGSRECHNUNGEN (NEU MIT SQLITE)
 * /api/invoices GET/POST
 */
app.use('/api/invoices', invoiceRoutes);

/**
 * KI-Analyse-Endpunkt
 * - Kann Text
 * - Oder eine Datei aus /uploads lesen
 */
app.post('/analyze', async (req, res) => {
  const { text, filename, mimeType } = req.body as {
    text?: string;
    filename?: string;
    mimeType?: string;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY ist nicht gesetzt');
    return res
      .status(500)
      .json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  if (!text && !filename) {
    return res.status(400).json({ error: 'text or filename is required' });
  }

  const prompt =
    'Du bist eine Rechnungs-KI. ' +
    'Lies den folgenden Rechnungs- oder Belegtext und gib eine JSON-Antwort mit den Feldern ' +
    'supplier (Name des Lieferanten/Firma), invoiceNumber, invoiceDate, dueDate, ' +
    'totalAmount (als Zahl) und summary (kurze Zusammenfassung) zurück. ' +
    'Formatiere NUR reines JSON ohne Erklärungstext.';

  try {
    let response;

    // 🔹 Textanalyse
    if (text && text.trim()) {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt + '\n\nRECHNUNGSTEXT:\n' + text }],
            },
          ],
        }
      );
    }

    // 🔹 Dateianalyse
    if (!text && filename) {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadDir, filename);

        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');

        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'application/pdf',
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }
        );
      } catch (err) {
        console.error('Fehler beim Lesen der Datei für Analyse:', err);
        return res
          .status(400)
          .json({ error: 'file_not_found_or_unreadable' });
      }
    }

    const modelText: string =
      (response as any)?.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let parsed: any = null;
    try {
      const jsonMatch =
        modelText.match(/```json([\s\S]*?)```/i) ||
        modelText.match(/```([\s\S]*?)```/);

      const jsonString = jsonMatch ? jsonMatch[1] : modelText;
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.warn('JSON aus KI nicht parsebar.', err);
    }

    res.json({ raw: modelText, structured: parsed });
  } catch (err: any) {
    const details = err?.response?.data || err.message || String(err);
    console.error('Gemini-Analyse fehlgeschlagen:', details);
    return res.status(500).json({ error: 'Gemini analysis failed', details });
  }
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf Port ${PORT}`);
});

