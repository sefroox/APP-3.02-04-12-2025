export type Invoice = {
  id: number;
  type: 'incoming' | 'outgoing';
  title: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type StoredFile = {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Eingangsrechnungen
export async function getIncomingInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/api/invoices`);
  return handleResponse<Invoice[]>(res);
}

export async function createIncomingInvoice(
  title: string,
  amount: number,
  status: string = 'open'
): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, amount, status }),
  });
  return handleResponse<Invoice>(res);
}

// Ausgangsrechnungen
export async function getOutgoingInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/api/outgoing-invoices`);
  return handleResponse<Invoice[]>(res);
}

export async function createOutgoingInvoice(
  title: string,
  amount: number,
  status: string = 'open'
): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/outgoing-invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, amount, status }),
  });
  return handleResponse<Invoice>(res);
}

// Dateien / Upload
export async function listFiles(): Promise<StoredFile[]> {
  const res = await fetch(`${API_BASE}/api/files`);
  return handleResponse<StoredFile[]>(res);
}

export async function uploadFile(file: File): Promise<StoredFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<StoredFile>(res);
}

