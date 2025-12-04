// services/geminiService.ts

// Typ für das Ergebnis der Rechnungsanalyse
export interface InvoiceAnalysisResult {
  supplier: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  dueDate: string | null;
  costCenter: string | null;
  project: string | null;
  rawText: string;
  notes?: string | null;
}

// Basis-URL für das Backend:
// - Standard: leer => Aufruf relativ zu der URL, unter der die App läuft (z.B. http://100.86.46.93:3001/api/analyze)
// - Optional überschreibbar über VITE_API_BASE_URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL &&
  import.meta.env.VITE_API_BASE_URL.trim() !== ''
    ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/+$/, '')
    : '';

/**
 * Ruft die KI-Analyse im Backend auf.
 * Frontend → /api/analyze → Backend (Port 3000, Route /api/analyze)
 */
export async function analyzeInvoiceViaBackend(
  text: string
): Promise<InvoiceAnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(
      'Fehler bei analyzeInvoiceViaBackend:',
      response.status,
      errorText
    );
    throw new Error('Fehler bei der KI-Analyse im Backend');
  }

  const data = (await response.json()) as InvoiceAnalysisResult;
  return data;
}

/**
 * Wrapper, falls im Code noch analyzeInvoiceText verwendet wird.
 * Nutzt intern das Backend.
 */
export async function analyzeInvoiceText(
  text: string
): Promise<InvoiceAnalysisResult> {
  return analyzeInvoiceViaBackend(text);
}

/**
 * Einfacher Platzhalter für natürliche Sprachbefehle.
 * Kann später erweitert werden, im Moment wird der Text nur zurückgegeben
 * oder optional geloggt.
 */
export async function processNaturalLanguageCommand(
  input: string
): Promise<{ reply: string }> {
  return {
    reply:
      input && input.trim().length > 0
        ? `Verstanden: ${input}`
        : 'Kein Befehl erkannt.',
  };
}

/**
 * Optionaler Platzhalter, falls analyzeInvoiceImage bereits importiert wird.
 * Wenn du später eine Bildanalyse über das Backend machen willst,
 * können wir hier einen Upload auf eine eigene Route einbauen.
 */
export async function analyzeInvoiceImage(
  _file: File
): Promise<InvoiceAnalysisResult> {
  throw new Error(
    'Die Bildanalyse über Bilder ist aktuell noch nicht implementiert. Bitte Textanalyse verwenden.'
  );
}

/**
 * Wird vom System/Settings-Panel verwendet, um die KI-/Backend-Verbindung zu testen.
 * System.tsx importiert: testAIConnection
 *
 * Wir pingen hier /api/health im Backend an.
 */
export async function testAIConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        message: `Backend erreichbar, aber Fehlerstatus: ${response.status} ${text}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      ok: true,
      message: `Verbindung erfolgreich. Status: ${
        (data as any).status || 'unknown'
      }`,
    };
  } catch (err: any) {
    console.error('Fehler bei testAIConnection:', err);
    return {
      ok: false,
      message: `Fehler bei der Verbindung zur KI/Backend: ${
        err?.message || String(err)
      }`,
    };
  }
}

