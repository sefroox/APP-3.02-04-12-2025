import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, StoredFile } from '../../core/db';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// POST /api/files/upload  (Feldname: file)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO files (originalName, storedName, mimeType, size)
       VALUES (?, ?, ?, ?)`,
      [req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
    );

    const saved = await db.get<StoredFile>(
      'SELECT * FROM files WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(saved);
  } catch (err) {
    console.error('POST /api/files/upload error', err);
    res.status(500).json({ error: 'Fehler beim Upload' });
  }
});

// GET /api/files  → Liste aller Belege
router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const files = await db.all<StoredFile[]>(
      'SELECT * FROM files ORDER BY createdAt DESC'
    );
    res.json(files);
  } catch (err) {
    console.error('GET /api/files error', err);
    res.status(500).json({ error: 'Fehler beim Laden der Belege' });
  }
});

export default router;
