import { Router } from 'express';
import { getDb, Invoice } from '../../core/db';

const router = Router();

// GET /api/outgoing-invoices  → alle Ausgangsrechnungen
router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all<Invoice[]>(
      "SELECT * FROM invoices WHERE type = 'outgoing' ORDER BY createdAt DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/outgoing-invoices error', err);
    res.status(500).json({ error: 'Fehler beim Laden der Ausgangsrechnungen' });
  }
});

// POST /api/outgoing-invoices  → neue Ausgangsrechnung
router.post('/', async (req, res) => {
  try {
    const { title, amount, status } = req.body as Partial<Invoice>;

    if (!title || typeof amount !== 'number' || !status) {
      return res.status(400).json({ error: 'Ungültige Eingabedaten' });
    }

    const db = await getDb();
    const result = await db.run(
      "INSERT INTO invoices (type, title, amount, status) VALUES (?, ?, ?, ?)",
      ['outgoing', title, amount, status]
    );

    const created = await db.get<Invoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/outgoing-invoices error', err);
    res.status(500).json({ error: 'Fehler beim Anlegen der Ausgangsrechnung' });
  }
});

export default router;
