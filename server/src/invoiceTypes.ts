export interface InvoiceRecord {
  id: string;
  file_name: string;
  file_path: string;
  amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  project_id: string | null;
  cost_center: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

