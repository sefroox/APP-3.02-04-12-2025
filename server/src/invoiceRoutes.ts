import express from 'express';
import path from 'path';
import { upload } from './upload';
import { createInvoice, getAllInvoices } from './invoiceRepository';

const router = express.Router();

// GET /api/invoices -> alle Rechnungen aus der DB
router.get('/', (_req, res) => {
  try {
    const invoices = getAllInvoices();
    res.json(invoices);
  } catch (err) {
    console.error('Fehler beim Laden der Rechnungen:', err);
    res.status(500).json({ message: 'Fehler beim Laden der Rechnungen' });
  }
});

// POST /api/invoices -> neue Rechnung + Datei speichern
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    const {
      amount,
      currency,
      invoiceDate,
      vendorName,
      projectId,
      costCenter,
      status,
      notes,
    } = req.body;

    // relative Pfad für Frontend/Downloads
    const relativePath = path.join('uploads', req.file.filename);

    const invoice = createInvoice({
      file_name: req.file.filename,
      file_path: relativePath,
      amount: amount ? Number(amount) : null,
      currency: currency || null,
      invoice_date: invoiceDate || null,
      vendor_name: vendorName || null,
      project_id: projectId || null,
      cost_center: costCenter || null,
      status: status || 'OPEN',
      notes: notes || null,
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error('Fehler beim Speichern der Rechnung:', err);
    res.status(500).json({ message: 'Fehler beim Speichern der Rechnung' });
  }
});

export default router;

