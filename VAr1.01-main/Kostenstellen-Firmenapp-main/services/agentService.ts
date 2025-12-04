import { InvoiceStatus } from "../types";

export type AgentIntent = 
  | { type: 'CREATE_INVOICE_INCOMING', data: { supplier: string, amount: number, description: string, isNet?: boolean } }
  | { type: 'CREATE_INVOICE_OUTGOING', data: { customer: string, amount: number, description: string, isNet?: boolean } }
  | { type: 'CREATE_PROJECT', data: { name: string, budget: number } }
  | { type: 'DELETE_ENTITY', data: { entityType: 'invoice' | 'project', identifier: string, password?: string } }
  | { type: 'QUERY_PROJECT_STATUS', data: { projectName: string } }
  | { type: 'QUERY_COST_CENTER', data: { identifier: string, getAll?: boolean } }
  | { type: 'QUERY_FINANCE_STATUS', data: {} }
  | { type: 'LIST_ENTITIES', data: { entity: 'projects' | 'invoices' | 'tasks' | 'cost_centers' | 'contacts', subType?: 'incoming' | 'outgoing' | 'customer' | 'supplier' } }
  | { type: 'CREATE_TASK', data: { title: string, dueDate?: string, assignedTo?: string } } 
  | { type: 'QUERY_INVOICE_PDF', data: { identifier: string, getAll?: boolean, subType?: 'incoming' | 'outgoing' } } 
  | { type: 'CREATE_CONTACT', data: { name: string, type: 'customer' | 'supplier', email?: string, phone?: string } }
  | { type: 'QUERY_CONTACT', data: { name: string } }
  | { type: 'CHAT', data: { message: string } }
  | { type: 'UNKNOWN', data: {} };

export const parseAgentCommand = (text: string): AgentIntent => {
    const lowerText = text.toLowerCase();

    const extractAmount = (str: string): number => {
        const cleanStr = str.replace(/202\d/g, '').replace(/258789/g, ''); 
        const match = cleanStr.match(/(\d+([.,]\d{1,2})?)/);
        return match ? parseFloat(match[0].replace(',', '.')) : 0;
    };

    const extractBetween = (str: string, startMarkers: string[], endMarkers: string[]): string => {
        let startIndex = -1;
        for (const marker of startMarkers) {
            const idx = str.toLowerCase().indexOf(marker);
            if (idx !== -1) {
                startIndex = idx + marker.length;
                break;
            }
        }
        if (startIndex === -1) return "Unbekannt";

        const sub = str.substring(startIndex);
        let endIndex = sub.length;

        for (const marker of endMarkers) {
            const idx = sub.toLowerCase().indexOf(marker);
            if (idx !== -1 && idx < endIndex) {
                endIndex = idx;
            }
        }
        
        const result = sub.substring(0, endIndex).trim();
        return result.length > 0 ? result : "Unbekannt";
    };

    if (['hallo', 'hi', 'servus', 'moin', 'guten tag', 'hey'].some(g => lowerText.startsWith(g))) {
         return { type: 'CHAT', data: { message: "Hallo! Ich bin dein Assistent. Ich kann Rechnungen schreiben, Kontakte anlegen und Projekte verwalten." } };
    }

    // --- KONTAKTE ---
    if (lowerText.includes('kontakt') || lowerText.includes('kunde') || lowerText.includes('lieferant')) {
        if (lowerText.includes('neu') || lowerText.includes('erstell') || lowerText.includes('anlegen') || lowerText.includes('hinzufügen')) {
            const name = extractBetween(text, ['kunde ', 'lieferant ', 'kontakt ', 'namens ', 'firma '], [' mit', ' email', ' tel', ' nummer', '.']);
            const type = lowerText.includes('lieferant') ? 'supplier' : 'customer';
            
            let email = undefined;
            if (lowerText.includes('@')) {
                const words = text.split(' ');
                email = words.find(w => w.includes('@'));
            }

            return {
                type: 'CREATE_CONTACT',
                data: { name: name !== 'Unbekannt' ? name : 'Neuer Kontakt', type, email }
            };
        }
        if (lowerText.includes('zeig') || lowerText.includes('suche') || lowerText.includes('info') || lowerText.includes('adresse') || lowerText.includes('wer ist')) {
            const name = extractBetween(text, ['zu ', 'über ', 'kontakt ', 'kunde ', 'lieferant ', 'von '], [' ', '?', '.']);
            return { type: 'QUERY_CONTACT', data: { name: name !== 'Unbekannt' ? name : '' } };
        }
        if (lowerText.includes('alle') || lowerText.includes('liste')) {
            return { type: 'LIST_ENTITIES', data: { entity: 'contacts' } };
        }
    }

    // --- AUFGABEN ---
    if (lowerText.includes('aufgabe') || lowerText.includes('erinner') || lowerText.includes('task') || lowerText.includes('todo')) {
        const title = extractBetween(text, ['aufgabe ', 'dass ', 'erinnern ', 'todo '], ['.', '!', ' am ', ' bis ']);
        return { type: 'CREATE_TASK', data: { title: title !== 'Unbekannt' ? title : text } };
    }

    // --- PDFS ---
    if ((lowerText.includes('pdf') || lowerText.includes('druck')) && (lowerText.includes('rechnung') || lowerText.includes('beleg'))) {
        let subType: 'incoming' | 'outgoing' | undefined = undefined;
        if (lowerText.includes('ausgang') || lowerText.includes('kunde') || lowerText.includes('ausgestellt')) subType = 'outgoing';
        if (lowerText.includes('eingang') || lowerText.includes('lieferant')) subType = 'incoming';

        if (lowerText.includes('alle')) {
            return {
                type: 'QUERY_INVOICE_PDF',
                data: { identifier: '', getAll: true, subType }
            };
        }

        const identifier = extractBetween(text, [' von ', ' an ', ' für ', ' rechnung '], [' ', '.', '?']);
        return {
            type: 'QUERY_INVOICE_PDF',
            data: { identifier: identifier !== 'Unbekannt' ? identifier : '', getAll: false, subType }
        };
    }

    // --- LÖSCHEN ---
    if (lowerText.includes('lösch') || lowerText.includes('entfern')) {
        if (lowerText.includes('projekt')) {
             const name = extractBetween(text, ['projekt ', 'baustelle ', ' das '], [' ', '.', '!', ' mit']);
             const passMatch = text.match(/\b\d{6}\b/);
             const password = passMatch ? passMatch[0] : undefined;
             return { type: 'DELETE_ENTITY', data: { entityType: 'project', identifier: name !== 'Unbekannt' ? name : '', password } };
        }
        const name = extractBetween(text, [' von ', ' an ', ' für ', ' rechnung '], [' ', '.', '!']);
        return { type: 'DELETE_ENTITY', data: { entityType: 'invoice', identifier: name !== 'Unbekannt' ? name : '' } };
    }

    // --- KOSTENSTELLEN ---
    if (lowerText.includes('kostenstelle') || lowerText.includes('kst')) {
        if ((lowerText.includes('alle') || lowerText.includes('liste')) && (lowerText.includes('pdf') || lowerText.includes('druck'))) {
             return { type: 'QUERY_COST_CENTER', data: { identifier: '', getAll: true } };
        }
        if (lowerText.includes('alle') || lowerText.includes('liste')) {
             return { type: 'LIST_ENTITIES', data: { entity: 'cost_centers' } };
        }
        const identifier = extractBetween(text, ['kostenstelle ', 'kst ', 'für ', 'über '], [' ', '.', '?', ' als']);
        const stopWords = ['alle', 'alles', 'kostenstellen', 'projekte', 'die', 'eine'];
        if (stopWords.includes(identifier.toLowerCase())) {
             return { type: 'QUERY_COST_CENTER', data: { identifier: '', getAll: true } };
        }
        return { type: 'QUERY_COST_CENTER', data: { identifier: identifier !== 'Unbekannt' ? identifier : '' } };
    }

    // --- RECHNUNGEN ---
    if (lowerText.includes('rechnung') || lowerText.includes('beleg') || lowerText.includes('erstell')) {
        const amount = extractAmount(text);
        const isNet = lowerText.includes('netto') || lowerText.includes('zzgl');
        
        if (lowerText.includes('zeig') || lowerText.includes('liste')) {
             let subType: 'incoming' | 'outgoing' | undefined = undefined;
             if (lowerText.includes('ausgang') || lowerText.includes('kunde')) subType = 'outgoing';
             if (lowerText.includes('eingang') || lowerText.includes('lieferant')) subType = 'incoming';
             return { type: 'LIST_ENTITIES', data: { entity: 'invoices', subType } };
        }

        if (lowerText.includes(' an ')) {
            const customer = extractBetween(text, [' an '], [' über ', ' euro', '€', ' für ', ' mit ']);
            let description = extractBetween(text, [' für ', ' betreff ', ' zweck '], [' über ', ' euro', '€', '.']);
            if (description === 'Unbekannt') description = 'Leistung';
            return { type: 'CREATE_INVOICE_OUTGOING', data: { customer, amount, description, isNet } };
        }

        if (lowerText.includes(' von ')) {
            const supplier = extractBetween(text, [' von '], [' über ', ' euro', '€', ' für ', ' mit ']);
            let description = extractBetween(text, [' für ', ' betreff ', ' zweck '], [' über ', ' euro', '€', '.']);
            if (description === 'Unbekannt') description = 'Sonstiges';
            return { type: 'CREATE_INVOICE_INCOMING', data: { supplier, amount, description, isNet } };
        }
        
        if (amount > 0) {
             return { type: 'CREATE_INVOICE_INCOMING', data: { supplier: 'Unbekannt', amount, description: 'Via Chat', isNet } };
        }
    }

    // --- PROJEKTE ---
    if (lowerText.includes('projekt') || lowerText.includes('baustelle')) {
        if (lowerText.includes('alle') || lowerText.includes('liste') || lowerText.includes('was habe ich')) {
            return { type: 'LIST_ENTITIES', data: { entity: 'projects' } };
        }
        if (lowerText.includes('neu') || lowerText.includes('erstell') || lowerText.includes('anlegen')) {
             const name = extractBetween(text, ['projekt ', 'baustelle ', 'namens '], [' mit', ' budget', ' kosten', '.']);
             const budget = extractAmount(text);
             return { type: 'CREATE_PROJECT', data: { name: name !== 'Unbekannt' ? name : 'Neues Projekt', budget: budget > 0 ? budget : 0 } }
        }
        const cleanName = text.replace(/status|wie|ist|das|projekt|baustelle|steht|es|um|\?/gi, '').trim();
        return { type: 'QUERY_PROJECT_STATUS', data: { projectName: cleanName } };
    }
    
    if (lowerText.includes('hilfe')) {
         return { type: 'CHAT', data: { message: "Ich kann Rechnungen schreiben, Projekte anlegen oder Kontakte verwalten." } };
    }

    return { type: 'UNKNOWN', data: {} };
};