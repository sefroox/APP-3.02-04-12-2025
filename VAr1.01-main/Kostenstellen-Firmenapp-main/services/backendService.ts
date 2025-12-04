/**
 * Ruft die Vision-KI im Backend auf und liest eine Rechnung aus einer Datei aus.
 * serverFilename = Dateiname, wie er vom Upload zurückgegeben wurde (storedName).
 */
export async function analyzeFileOnBackend(serverFilename: string): Promise<{
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
      body: JSON.stringify({ serverFilename }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("analyzeFileOnBackend: HTTP-Fehler", res.status, text);
      throw new Error(`Analyse fehlgeschlagen (Status ${res.status})`);
    }

    const data = await res.json();
    console.log("KI-Dateianalyse Ergebnis:", data);
    return data;
  } catch (err) {
    console.error("analyzeFileOnBackend: Fehler", err);
    throw err;
  }
}

