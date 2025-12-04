import { Router } from 'express';
import { getDb, Invoice } from '../../core/db';

const router = Router();

// GET /api/invoices  → alle Eingangsrechnungen
router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all<Invoice[]>(
      "SELECT * FROM invoices WHERE type = 'incoming' ORDER BY createdAt DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/invoices error', err);
    res.status(500).json({ error: 'Fehler beim Laden der Eingangsrechnungen' });
  }
});

// POST /api/invoices  → neue Eingangsrechnung
router.post('/', async (req, res) => {
  try {
    const { title, amount, status } = req.body as Partial<Invoice>;

    if (!title || typeof amount !== 'number' || !status) {
      return res.status(400).json({ error: 'Ungültige Eingabedaten' });
    }

    const db = await getDb();
    const result = await db.run(
      "INSERT INTO invoices (type, title, amount, status) VALUES (?, ?, ?, ?)",
      ['incoming', title, amount, status]
    );

    const created = await db.get<Invoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/invoices error', err);
    res.status(500).json({ error: 'Fehler beim Anlegen der Eingangsrechnung' });
  }
});

export default router;
