import db from './db';
import { InvoiceRecord } from './invoiceTypes';
import crypto from 'crypto';

export function getAllInvoices(): InvoiceRecord[] {
  const stmt = db.prepare<[], InvoiceRecord>(
    'SELECT * FROM invoices ORDER BY invoice_date DESC, created_at DESC'
  );
  return stmt.all();
}

interface CreateInvoiceInput {
  file_name: string;
  file_path: string;
  amount?: number | null;
  currency?: string | null;
  invoice_date?: string | null;
  vendor_name?: string | null;
  project_id?: string | null;
  cost_center?: string | null;
  status?: string | null;
  notes?: string | null;
}

export function createInvoice(input: CreateInvoiceInput): InvoiceRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO invoices (
      id, file_name, file_path,
      amount, currency, invoice_date,
      vendor_name, project_id, cost_center,
      status, notes,
      created_at, updated_at
    ) VALUES (
      @id, @file_name, @file_path,
      @amount, @currency, @invoice_date,
      @vendor_name, @project_id, @cost_center,
      @status, @notes,
      @created_at, @updated_at
    )
  `);

  const invoice: InvoiceRecord = {
    id,
    file_name: input.file_name,
    file_path: input.file_path,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    invoice_date: input.invoice_date ?? null,
    vendor_name: input.vendor_name ?? null,
    project_id: input.project_id ?? null,
    cost_center: input.cost_center ?? null,
    status: input.status ?? 'OPEN',
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };

  stmt.run(invoice);
  return invoice;
}

