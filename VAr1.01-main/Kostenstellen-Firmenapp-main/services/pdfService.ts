
import { CostCenter, CompanySettings, Invoice, Loan, LoanScheduleItem, Project, Task } from "../types";

declare global {
    interface Window {
        jspdf: any;
    }
}

// Helper interface for entity lookup
interface EntityLookup {
    id: string;
    code: string;
    name: string;
}

export const generateCostCenterReport = (costCenter: CostCenter, settings: CompanySettings, allInvoices: Invoice[]) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    
    doc.setFontSize(22);
    doc.text("Finanzbericht", margin, 20);
    doc.setFontSize(10);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString()}`, margin, 28);
    
    let y = 50;
    doc.text(`Kostenstelle: ${costCenter.name} (${costCenter.code})`, margin, y);
    y+=10;
    doc.text(`Budget: € ${costCenter.budget}`, margin, y);
    y+=10;
    doc.text(`Verbraucht: € ${costCenter.used}`, margin, y);
    
    y+=20;
    doc.text("Buchungen:", margin, y);
    y+=10;
    const relevant = allInvoices.filter(i => i.costCenterId === costCenter.id || i.projectId === costCenter.id);
    relevant.forEach(inv => {
        if(y > 280) { doc.addPage(); y=20; }
        doc.text(`${inv.date} - ${inv.number} - € ${inv.amount}`, margin, y);
        y+=7;
    });

    doc.save(`Bericht_${costCenter.code}.pdf`);
};

export const generateJournalPDF = (
    invoices: Invoice[], 
    settings: CompanySettings, 
    title: string,
    entities: EntityLookup[] = []
) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 15;
    let y = 20;

    // --- HEADER ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(settings.name, 280 - margin, y, { align: 'right' });
    y += 6;
    doc.text(`Druckdatum: ${new Date().toLocaleDateString()}`, 280 - margin, y, { align: 'right' });
    y += 15;

    // --- TABLE DEFINITION ---
    const cols = {
        date: margin,
        number: margin + 25,
        partner: margin + 60,
        costCenter: margin + 120,
        category: margin + 170,
        net: margin + 220,
        gross: margin + 250
    };

    // Draw Header Row
    const drawHeader = (posY: number) => {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, posY - 5, 267, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);

        doc.text("Datum", cols.date, posY);
        doc.text("Beleg Nr.", cols.number, posY);
        doc.text("Partner", cols.partner, posY);
        doc.text("Kostenstelle / Projekt", cols.costCenter, posY);
        doc.text("Kategorie", cols.category, posY);
        doc.text("Netto", cols.net + 20, posY, { align: "right" });
        doc.text("Brutto", cols.gross + 20, posY, { align: "right" });
        doc.setFont(undefined, 'normal');
    };

    drawHeader(y);
    y += 8;

    let totalNet = 0;
    let totalGross = 0;

    // --- DATA ROWS ---
    invoices.forEach(inv => {
        if (y > 190) { 
            doc.addPage({ orientation: 'landscape' }); 
            y = 20;
            drawHeader(y);
            y += 8;
        }

        // Resolve Entity Name (Cost Center / Project)
        let entityLabel = '-';
        if (inv.allocations && inv.allocations.length > 0) {
            entityLabel = `Split (${inv.allocations.length})`;
        } else {
            const id = inv.projectId || inv.costCenterId;
            const entity = entities.find(e => e.id === id);
            if (entity) entityLabel = entity.code; 
        }

        const partner = inv.supplier || inv.customer || 'Unbekannt';
        const net = inv.netAmount || (inv.amount / 1.2); // Fallback estimate if net missing
        
        doc.text(inv.date, cols.date, y);
        doc.text(inv.number.substring(0, 15), cols.number, y);
        doc.text(partner.substring(0, 25), cols.partner, y);
        doc.text(entityLabel.substring(0, 25), cols.costCenter, y);
        doc.text((inv.category || '').substring(0, 20), cols.category, y);
        
        doc.text(`€ ${net.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.net + 20, y, { align: "right" });
        doc.text(`€ ${inv.amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.gross + 20, y, { align: "right" });

        totalNet += net;
        totalGross += inv.amount;
        y += 6;
    });

    // --- FOOTER / TOTALS ---
    y += 5;
    doc.line(margin, y, 282, y);
    y += 8;
    
    if (y > 190) { doc.addPage({ orientation: 'landscape' }); y = 20; }

    doc.setFont(undefined, 'bold');
    doc.text("GESAMTSUMMEN:", cols.category, y);
    doc.text(`€ ${totalNet.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.net + 20, y, { align: "right" });
    doc.text(`€ ${totalGross.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.gross + 20, y, { align: "right" });

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
};

export const generateInvoicePDF = (invoice: Invoice, settings: CompanySettings) => {
     if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Rechnung ${invoice.number}`, 20, 20);
    doc.save(`Rechnung_${invoice.number}.pdf`);
};

// NEW: Specific Export for Incoming Invoices List
export const generateIncomingInvoicesListPDF = (invoices: Invoice[], settings: CompanySettings, filterName: string) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 15;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.text("Eingangsrechnungen", margin, y);
    
    doc.setFontSize(10);
    doc.text(`Firma: ${settings.name}`, margin + 100, y);
    y += 6;
    doc.setFontSize(12);
    doc.text(`Filter: ${filterName}`, margin, y);
    doc.setFontSize(10);
    doc.text(`Druckdatum: ${new Date().toLocaleDateString()}`, margin + 100, y);
    y += 15;

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 267, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    
    const cols = {
        date: margin,
        number: margin + 25,
        supplier: margin + 60,
        category: margin + 120,
        status: margin + 160,
        amount: margin + 210,
        paid: margin + 240
    };

    doc.text("Datum", cols.date, y);
    doc.text("Referenz", cols.number, y);
    doc.text("Lieferant", cols.supplier, y);
    doc.text("Kategorie", cols.category, y);
    doc.text("Status", cols.status, y);
    doc.text("Betrag (Brutto)", cols.amount, y, { align: "right" });
    doc.text("Bereits bezahlt", cols.paid, y, { align: "right" });
    
    y += 8;
    doc.setFont(undefined, 'normal');

    let totalAmount = 0;
    let totalPaid = 0;

    invoices.forEach(inv => {
        if (y > 190) { doc.addPage({orientation:'landscape'}); y = 20; }
        
        doc.text(inv.date, cols.date, y);
        doc.text(inv.number.substring(0, 15), cols.number, y);
        doc.text(inv.supplier?.substring(0, 30) || '', cols.supplier, y);
        doc.text(inv.category?.substring(0, 20) || '', cols.category, y);
        doc.text(inv.status, cols.status, y);
        
        doc.text(`€ ${inv.amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.amount, y, { align: "right" });
        doc.text(`€ ${(inv.paidAmount || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.paid, y, { align: "right" });

        totalAmount += inv.amount;
        totalPaid += (inv.paidAmount || 0);
        y += 6;
        
        // Optional line for split details
        if (inv.allocations && inv.allocations.length > 0) {
             doc.setFontSize(8);
             doc.setTextColor(100);
             doc.text(`   L> Split: ${inv.allocations.length} Zuweisungen`, cols.supplier, y - 2);
             doc.setTextColor(0);
             doc.setFontSize(9);
        }
    });

    y += 5;
    doc.line(margin, y, 282, y);
    y += 8;

    doc.setFont(undefined, 'bold');
    doc.text("Gesamtsumme:", cols.status, y);
    doc.text(`€ ${totalAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.amount, y, { align: "right" });
    doc.text(`€ ${totalPaid.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, cols.paid, y, { align: "right" });

    doc.save(`Eingangsrechnungen_${filterName}.pdf`);
};

export const generateLoanListPDF = (loans: Loan[], settings: CompanySettings) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    doc.setFontSize(18);
    doc.text("Finanzstatus: Darlehen & Kredite", margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Firma: ${settings.name}`, margin, y);
    doc.text(`Datum: ${new Date().toLocaleDateString()}`, margin + 100, y);
    y += 15;

    // Headers
    doc.setFont(undefined, 'bold');
    doc.text("Typ", margin, y);
    doc.text("Partner", margin + 25, y);
    doc.text("Ursprung (€)", margin + 80, y, { align: "right" });
    doc.text("Aktuell Offen (€)", margin + 120, y, { align: "right" });
    doc.text("Laufzeit bis", margin + 130, y);
    doc.text("Zins", margin + 160, y);
    doc.setFont(undefined, 'normal');
    
    y += 2;
    doc.line(margin, y, 195, y);
    y += 8;

    let totalLiabilities = 0;
    let totalAssets = 0;

    loans.forEach(loan => {
        // Calculate current balance logic
        let currentBalance = loan.amount;
        
        if (loan.autoPayment) {
             const today = new Date().toISOString().split('T')[0];
             const scheduledPaid = loan.schedule?.filter(s => s.date <= today && s.type === 'Plan').reduce((acc, s) => acc + s.principal, 0) || 0;
             const manualPaid = loan.transactions?.filter(t => t.type === 'repayment').reduce((acc, t) => acc + t.amount, 0) || 0;
             currentBalance = loan.amount - scheduledPaid - manualPaid;
        } else {
             const repaid = loan.transactions?.reduce((sum, t) => sum + (t.type === 'repayment' ? t.amount : 0), 0) || 0;
             currentBalance = loan.amount - repaid;
        }
        
        if (currentBalance < 0) currentBalance = 0;

        if (loan.type === 'taken') totalLiabilities += currentBalance;
        else totalAssets += currentBalance;

        if (y > 270) { doc.addPage(); y = 20; }

        doc.text(loan.type === 'taken' ? 'Verb.' : 'Ford.', margin, y);
        doc.text(loan.counterpartyName.substring(0, 25), margin + 25, y);
        doc.text(loan.amount.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 80, y, { align: "right" });
        doc.text(currentBalance.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 120, y, { align: "right" });
        doc.text(loan.endDate, margin + 130, y);
        
        const interestStr = loan.interestType === 'fixed' 
            ? `€ ${loan.interestRate.toLocaleString()}` 
            : `${loan.interestRate}%`;
            
        doc.text(interestStr, margin + 160, y);
        
        y += 7;
    });

    y += 5;
    doc.line(margin, y, 195, y);
    y += 10;
    
    doc.setFont(undefined, 'bold');
    doc.text("Zusammenfassung:", margin, y);
    y += 7;
    doc.text(`Offene Verbindlichkeiten: € ${totalLiabilities.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin, y);
    y += 7;
    doc.text(`Offene Forderungen:       € ${totalAssets.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin, y);

    doc.save('Darlehensliste.pdf');
};

export const generateLoanSchedulePDF = (loan: Loan, settings: CompanySettings, scheduleOverride?: LoanScheduleItem[], fromDate?: string, toDate?: string) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    const scheduleToPrint = scheduleOverride || loan.schedule || [];

    doc.setFontSize(16);
    doc.text("Zins- & Tilgungsplan", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Vertrag: ${loan.counterpartyName}`, margin, y);
    doc.text(`Betrag: € ${loan.amount.toLocaleString()}`, margin + 100, y);
    y += 6;
    if (loan.contractInfo) {
        doc.text(`Vertrags-Nr: ${loan.contractInfo}`, margin, y);
        y += 6;
    }
    
    if (fromDate || toDate) {
         const f = fromDate || loan.startDate;
         const t = toDate || loan.endDate;
         doc.text(`Angezeigter Zeitraum: ${f} bis ${t}`, margin, y);
    } else {
         doc.text(`Laufzeit: ${loan.startDate} bis ${loan.endDate}`, margin, y);
    }
    y += 10;

    // Table Header
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y-5, 180, 8, 'F');
    doc.text("Datum", margin + 2, y);
    doc.text("Art", margin + 30, y);
    doc.text("Rate", margin + 70, y, {align: 'right'});
    doc.text("Zins", margin + 100, y, {align: 'right'});
    doc.text("Tilgung", margin + 130, y, {align: 'right'});
    doc.text("Restschuld", margin + 170, y, {align: 'right'});
    y += 8;
    doc.setFont(undefined, 'normal');

    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalPayment = 0;

    scheduleToPrint.forEach(item => {
        if (y > 275) { doc.addPage(); y = 20; }
        
        if (item.type === 'Sondertilgung') doc.setTextColor(0, 100, 0);
        
        doc.text(item.date, margin + 2, y);
        doc.text(item.type.substring(0, 15), margin + 30, y);
        doc.text(item.payment.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 70, y, {align: 'right'});
        doc.text(item.interest.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 100, y, {align: 'right'});
        doc.text(item.principal.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 130, y, {align: 'right'});
        doc.text(item.remainingBalance.toLocaleString('de-DE', {minimumFractionDigits: 2}), margin + 170, y, {align: 'right'});
        
        doc.setTextColor(0, 0, 0);
        
        totalInterest += item.interest;
        totalPrincipal += item.principal;
        totalPayment += item.payment;
        
        y += 6;
    });

    // Summary Footer
    y += 5;
    doc.line(margin, y, 195, y);
    y += 10;
    
    if (y > 250) { doc.addPage(); y = 20; }
    
    const endBalance = scheduleToPrint.length > 0 ? scheduleToPrint[scheduleToPrint.length - 1].remainingBalance : 0;

    doc.setFont(undefined, 'bold');
    doc.text("Zusammenfassung (für diesen Zeitraum):", margin, y);
    y += 8;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Geleistete Zahlungen:`, margin, y);
    doc.text(`€ ${totalPayment.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin + 80, y, {align: 'right'});
    y += 6;
    
    doc.text(`Davon Tilgung:`, margin, y);
    doc.text(`€ ${totalPrincipal.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin + 80, y, {align: 'right'});
    y += 6;
    
    doc.text(`Davon Zinsen:`, margin, y);
    doc.text(`€ ${totalInterest.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin + 80, y, {align: 'right'});
    y += 8;
    
    doc.setFont(undefined, 'bold');
    doc.text(`Restschuld (am Ende des Zeitraums):`, margin, y);
    doc.text(`€ ${endBalance.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin + 80, y, {align: 'right'});

    doc.save(`Zinsplan_${loan.counterpartyName}.pdf`);
}

export const generateLoanContractPDF = (loan: Loan, settings: CompanySettings) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    const width = doc.internal.pageSize.getWidth() - (margin * 2);
    let y = 20;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text("DARLEHENSVERTRAG", doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("nach österreichischem Recht (ABGB)", doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
    y += 20;

    doc.setFontSize(11);
    doc.text("Zwischen", margin, y);
    y += 7;
    
    const lender = loan.type === 'given' ? settings.name : loan.counterpartyName;
    const borrower = loan.type === 'taken' ? settings.name : loan.counterpartyName;

    doc.setFont(undefined, 'bold');
    doc.text(`Darlehensgeber: ${lender}`, margin, y);
    y += 6;
    doc.text(`Darlehensnehmer: ${borrower}`, margin, y);
    y += 10;
    doc.setFont(undefined, 'normal');
    doc.text("wird folgender Vertrag geschlossen:", margin, y);
    y += 15;

    const addSection = (title: string, text: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        const splitText = doc.splitTextToSize(text, width);
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 10;
    };

    addSection("§ 1 Darlehensbetrag", `Der Darlehensgeber gewährt dem Darlehensnehmer ein Darlehen in Höhe von EUR ${loan.amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}.`);
    
    if (loan.contractInfo) {
        addSection("§ 1a Vertragsreferenz", `Dieses Darlehen wird unter der Referenznummer / Konto: ${loan.contractInfo} geführt.`);
    }

    let interestText = "";
    if (loan.interestType === 'fixed') {
        interestText = `Das Darlehen wird mit einem Pauschalzins (Gesamtbetrag) von EUR ${loan.interestRate.toLocaleString('de-DE', {minimumFractionDigits: 2})} verzinst, der über die Laufzeit verteilt wird.`;
    } else {
        interestText = `Das Darlehen wird mit ${loan.interestRate}% ${loan.interestType} verzinst.`;
    }
    
    addSection("§ 2 Verzinsung", interestText);
    
    let amortText = "Die Rückzahlung erfolgt ";
    if (loan.amortizationType === 'annuity') amortText += "in gleichbleibenden Annuitäten (Zins + Tilgung).";
    else if (loan.amortizationType === 'linear') amortText += "in gleichbleibenden Tilgungsraten zzgl. Zinsen.";
    else amortText += "endfällig (nur Zinsen laufend, Tilgung am Ende).";
    
    let freqText = "";
    switch(loan.paymentFrequency) {
        case 1: freqText = "monatlich"; break;
        case 3: freqText = "quartalsweise"; break;
        case 12: freqText = "jährlich"; break;
        default: freqText = "monatlich";
    }

    addSection("§ 3 Laufzeit & Rückzahlung", `Das Darlehen beginnt am ${loan.startDate} und endet am ${loan.endDate}. ${amortText} Die Raten sind ${freqText} fällig. Die Berechnung erfolgt gemäß beiliegendem Tilgungsplan. Sondertilgungen sind jederzeit möglich.`);
    addSection("§ 4 Sicherheiten", `Zur Sicherung des Darlehens werden folgende Sicherheiten vereinbart: ${loan.collateral}`);
    addSection("§ 5 Haftung", "Der Darlehensnehmer haftet für die Rückzahlung des Darlehens sowie der Zinsen vollumfänglich mit seinem gesamten Vermögen.");
    
    if (y > 240) { doc.addPage(); y = 20; } else { y += 20; }
    doc.text("Ort, Datum: _________________________", margin, y);
    y += 25;
    
    doc.text("_________________________", margin, y);
    doc.text("_________________________", margin + 100, y);
    y += 5;
    doc.text("Unterschrift Darlehensgeber", margin, y);
    doc.text("Unterschrift Darlehensnehmer", margin + 100, y);

    doc.save(`Darlehensvertrag_${loan.id}.pdf`);
};

export const generateProjectFilePDF = (project: Project, invoices: Invoice[], tasks: Task[], settings: CompanySettings) => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(`Projektakte: ${project.name}`, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Erstellt am: ${new Date().toLocaleDateString()}`, margin, y);
    doc.text(`Projekt-ID: ${project.costCenterCode}`, margin + 100, y);
    y += 15;

    // Stammdaten
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 170, 8, 'F');
    doc.text("Stammdaten", margin + 2, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Adresse: ${project.address}`, margin, y);
    y += 6;
    doc.text(`Projektleiter: ${project.manager}`, margin, y);
    y += 6;
    doc.text(`Status: ${project.status}`, margin, y);
    y += 6;
    doc.text(`Startdatum: ${project.startDate}`, margin, y);
    y += 15;

    // Budget
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 170, 8, 'F');
    doc.text("Budget & Kosten", margin + 2, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Budget Gesamt: € ${project.budgetTotal.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin, y);
    y += 6;
    doc.text(`Verbraucht:      € ${project.budgetUsed.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin, y);
    y += 6;
    const remaining = project.budgetTotal - project.budgetUsed;
    doc.setFont(undefined, 'bold');
    if (remaining < 0) doc.setTextColor(200, 0, 0);
    doc.text(`Verfügbar:       € ${remaining.toLocaleString('de-DE', {minimumFractionDigits: 2})}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Rechnungen
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 170, 8, 'F');
    doc.text("Zugeordnete Rechnungen", margin + 2, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    // Table Header
    doc.text("Datum", margin, y);
    doc.text("Lieferant", margin + 25, y);
    doc.text("Nr.", margin + 80, y);
    doc.text("Betrag", margin + 110, y);
    doc.text("Status", margin + 140, y);
    y += 5;
    doc.line(margin, y - 2, 190, y - 2);
    y += 6; 
    
    invoices.forEach(inv => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(inv.date, margin, y);
        doc.text(inv.supplier?.substring(0, 25) || '', margin + 25, y);
        doc.text(inv.number, margin + 80, y);
        doc.text(`€ ${inv.amount.toLocaleString('de-DE')}`, margin + 110, y);
        doc.text(inv.status, margin + 140, y);
        y += 5;
    });
    
    if (invoices.length === 0) {
        doc.text("- Keine Rechnungen -", margin, y);
        y += 5;
    }
    y += 10;

    // Bautagebuch (Short)
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, 170, 8, 'F');
    doc.text("Bautagebuch (Letzte Einträge)", margin + 2, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const entries = project.diaryEntries || [];
    entries.slice(0, 5).forEach(entry => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont(undefined, 'bold');
        doc.text(`${entry.date} (${entry.weather})`, margin, y);
        y += 4;
        doc.setFont(undefined, 'normal');
        const splitText = doc.splitTextToSize(entry.content, 170);
        doc.text(splitText, margin, y);
        y += (splitText.length * 4) + 6;
    });
    
    if (entries.length === 0) {
        doc.text("- Keine Einträge -", margin, y);
    }

    doc.save(`Projektakte_${project.costCenterCode}.pdf`);
};
