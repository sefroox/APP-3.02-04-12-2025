// services/apiService.ts

// Basis-URL für dein Backend / API.
// Wenn sich deine NAS-IP oder der Backend-Port ändert, HIER anpassen.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://100.86.46.93:3001";

const API_BASE = API_BASE_URL;

/**
 * Prüft, ob dein Backend erreichbar ist.
 * Wird z.B. in System.tsx benutzt.
 */
export async function checkBackendStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return false;

    const data = await res.json().catch(() => ({ status: "fail" }));
    return data.status === "ok";
  } catch (err) {
    console.error("Backend-Check fehlgeschlagen", err);
    return false;
  }
}

// ========================================
//  FILE UPLOAD
//  Upload von Belegen (PDF/Bild) zum Backend.
//  Wird in Invoices.tsx verwendet.
// ========================================
export async function uploadFileToServer(
  file: File
): Promise<{ url: string; filename: string; serverFilename: string } | null> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("Upload fehlgeschlagen", res.status, errorText);
      alert(`Upload fehlgeschlagen (Status ${res.status}).`);
      return null;
    }

    const data: any = await res.json();

    // tatsächlicher Server-Dateiname (so liegt die Datei im uploads-Ordner)
    const storedName: string =
      data.storedName || data.filename || data.name || file.name;

    // URL bestimmen
    let url: string =
      data.url ||
      data.fileUrl ||
      (storedName ? `/uploads/${storedName}` : "");

    if (!url && data.filename) {
      url = `/uploads/${data.filename}`;
    }

    // Absolute URL zusammenbauen
    if (url && !url.startsWith("http")) {
      url = `${API_BASE}${url}`;
    }

    // Schöner Name für die UI
    const filename: string =
      data.originalName || data.filename || data.name || file.name;

    console.log("Upload erfolgreich, URL:", url, "storedName:", storedName);

    return { url, filename, serverFilename: storedName };
  } catch (err) {
    console.error("Upload-Fehler", err);
    alert("Upload fehlgeschlagen (Netzwerk-Fehler).");
    return null;
  }
}

// ========================================
//  KI-VISION: Datei auf dem Backend analysieren
//  Wird von Invoices.tsx nach dem Upload aufgerufen
// ========================================
export async function analyzeFileOnBackend(
  serverFilename: string
): Promise<{
  supplier: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  dueDate: string | null;
  costCenter: string | null;
  project: string | null;
  rawText: string;
  notes: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serverFilename: serverFilename.trim(),
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("analyzeFileOnBackend: HTTP-Error", res.status, t);
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log("analyzeFileOnBackend RESULT:", data);
    return data;
  } catch (err) {
    console.error("analyzeFileOnBackend ERROR:", err);
    throw err;
  }
}

/**
 * WhatsApp-Funktionen – Platzhalter
 */
type WhatsAppStatus = {
  connected: boolean;
  status?: "disconnected" | "scanning" | "connected";
};

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return { connected: false, status: "disconnected" };
}

export async function getWhatsAppQR(): Promise<string | null> {
  return null;
}

export async function initWhatsAppSession(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function resetWhatsAppSession(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function requestPairingCode(
  _phoneNumber: string
): Promise<string | null> {
  return null;
}

// ========================================
//  Gesamtdaten (Rechnungen) vom Server laden
//  Holt die Invoices aus deinem Backend (GET /api/invoices)
// ========================================
export async function loadDataFromServer(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/invoices`, {
      method: "GET",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("loadDataFromServer: HTTP-Fehler", res.status, t);
      return null;
    }

    const data = await res.json();
    console.log("loadDataFromServer: Daten vom Backend:", data);

    // Wenn Backend ein Array an Rechnungen zurückgibt,
    // packen wir es in ein Objekt { invoices: [...] }
    if (Array.isArray(data)) {
      return { invoices: data };
    }

    // Falls das Backend schon ein Objekt mit invoices zurückgibt,
    // einfach so durchreichen.
    return data;
  } catch (err) {
    console.error("loadDataFromServer: Fehler", err);
    return null;
  }
}

// ========================================
//  Gesamtdaten (Rechnungen) zum Server speichern
//  Schickt geänderte Invoices an POST /api/invoices/bulk
// ========================================
export async function saveDataToServer(data: any): Promise<boolean> {
  try {
    // Wir erwarten entweder data.invoices oder direkt ein Array
    const invoices = Array.isArray(data) ? data : data?.invoices;

    if (!invoices) {
      console.warn("saveDataToServer: keine invoices im Payload gefunden");
      return false;
    }

    const res = await fetch(`${API_BASE}/api/invoices/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoices),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("saveDataToServer: HTTP-Fehler", res.status, t);
      return false;
    }

    console.log("saveDataToServer: erfolgreich gespeichert");
    return true;
  } catch (err) {
    console.error("saveDataToServer: Fehler", err);
    return false;
  }
}

