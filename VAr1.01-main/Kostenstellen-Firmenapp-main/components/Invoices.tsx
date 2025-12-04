import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  FileText,
  UploadCloud,
  Trash2,
  Check,
  Save,
  X,
  Split,
  Plus,
  Loader2,
  Euro,
  CheckCircle,
  Send,
  MessageSquare,
  Stamp,
} from "lucide-react";

import {
  Invoice,
  InvoiceStatus,
  CostCenter,
  Project,
  UserRole,
  InvoiceAllocation,
  User,
  ApprovalData,
  CompanySettings,
  PaymentRecord,
  Contact,
} from "../types";

import {
  analyzeInvoiceImage,
} from "../services/geminiService";
import { generateIncomingInvoicesListPDF } from "../services/pdfService";
import { uploadFileToServer, analyzeFileOnBackend } from "../services/apiService";
import { INITIAL_COMPANY_SETTINGS } from "../constants";

interface InvoicesProps {
  invoices: Invoice[];
  onAddInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
  onApproveInvoice: (id: string, approvalData: ApprovalData) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
  onUpdatePayment?: (id: string, date: string, amount: number) => void;
  onAddComment?: (id: string, text: string) => void;
  costCenters: CostCenter[];
  categories: string[];
  projects?: Project[];
  contacts?: Contact[];
  userRole?: UserRole;
  currentUser?: User | null;
  companySettings?: CompanySettings;
}

const Invoices: React.FC<InvoicesProps> = ({
  invoices,
  onAddInvoice,
  onDeleteInvoice,
  onUpdateStatus,
  onApproveInvoice,
  onUpdateInvoice,
  onUpdatePayment,
  onAddComment,
  costCenters,
  categories,
  projects = [],
  contacts = [],
  userRole = "admin",
  currentUser,
  companySettings,
}) => {
  const effectiveSettings = companySettings || INITIAL_COMPANY_SETTINGS;

  // TABS
  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "approval" | "open" | "paid"
  >("all");

  // MODALS
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Approval Mode State
  const [isApprovingMode, setIsApprovingMode] = useState(false);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);

  // PAYMENTS
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");

  // NEW INVOICE
  const [newInv, setNewInv] = useState<Partial<Invoice>>({
    status: InvoiceStatus.DRAFT,
    category: categories[0] || "Sonstiges",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
  });
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");

  // Upload & AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments (Detail)
  const [newCommentText, setNewCommentText] = useState("");

  // Entities (Projekt + Kostenstelle)
  const allEntities = useMemo(
    () => [
      ...projects.map((p) => ({
        id: p.id,
        code: p.costCenterCode,
        name: p.name,
        type: "project" as const,
      })),
      ...costCenters.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        type: "cost_center" as const,
      })),
    ],
    [projects, costCenters]
  );

  const hasApprovalRights =
    userRole === "admin" ||
    currentUser?.role === "admin" ||
    currentUser?.canApprove === true;

  // Lieferantenliste (aus Kontakten + bestehenden Rechnungen)
  const suppliers = useMemo(() => {
    const contactSuppliers = contacts
      .filter((c) => c.type === "supplier")
      .map(
        (c) =>
          c.companyName ||
          [c.firstName, c.lastName].filter(Boolean).join(" ")
      )
      .filter(Boolean) as string[];
    const invoiceSuppliers = invoices
      .map((i) => i.supplier)
      .filter(Boolean) as string[];

    return Array.from(new Set([...contactSuppliers, ...invoiceSuppliers])).sort();
  }, [contacts, invoices]);

  // FILTERING
  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === "all") return true;
    if (activeTab === "draft") return inv.status === InvoiceStatus.DRAFT;
    if (activeTab === "approval")
      return inv.status === InvoiceStatus.PENDING_APPROVAL;
    if (activeTab === "open")
      return (
        inv.status === InvoiceStatus.APPROVED ||
        inv.status === InvoiceStatus.PARTIALLY_PAID
      );
    if (activeTab === "paid") return inv.status === InvoiceStatus.PAID;
    return true;
  });

  // EXPORT CSV
  const handleExportCSV = () => {
    const headers = [
      "Datum",
      "Referenz",
      "Lieferant",
      "Kategorie",
      "Betrag (Brutto)",
      "Bereits Bezahlt",
      "Status",
      "Erstellt von",
    ];
    const csvContent = [
      headers.join(";"),
      ...filteredInvoices.map((inv) => {
        const gross = Number(inv.amount)
          .toFixed(2)
          .replace(".", ",");
        const paid = Number(inv.paidAmount || 0)
          .toFixed(2)
          .replace(".", ",");
        return [
          inv.date,
          inv.number,
          (inv.supplier || "").replace(/;/g, ","),
          inv.category || "",
          gross,
          paid,
          inv.status,
          inv.createdBy || "",
        ].join(";");
      }),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Eingangsrechnungen_${activeTab}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF
  const handleExportPDF = () => {
    const filterName =
      activeTab === "all"
        ? "Alle"
        : activeTab === "draft"
        ? "Entwürfe"
        : activeTab === "approval"
        ? "Zur Freigabe"
        : activeTab === "open"
        ? "Offen"
        : "Bezahlt";

    generateIncomingInvoicesListPDF(
      filteredInvoices,
      effectiveSettings,
      filterName
    );
  };

  // --- Actions ---

  const handleMoveToApproval = (e: React.MouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onUpdateStatus(inv.id, InvoiceStatus.PENDING_APPROVAL);
  };

  const handleApproveClick = (e: React.MouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (!hasApprovalRights) {
      alert("Keine Berechtigung zur Freigabe.");
      return;
    }

    setSelectedInvoice(inv);
    setApprovalAmount(inv.amount);
    setIsApprovingMode(true);
    setIsViewModalOpen(true);
  };

  const executeApproval = () => {
    if (!selectedInvoice) return;

    const hasAmountChanged = approvalAmount !== selectedInvoice.amount;

    if (onUpdateInvoice) {
      const updatedInvoice: Invoice = {
        ...selectedInvoice,
        status: InvoiceStatus.APPROVED,
        amount: approvalAmount,
        approvalData: {
          approvedBy: currentUser?.name || "Admin",
          approvedAt: new Date().toISOString(),
          approvedAmount: approvalAmount,
          originalAmount: hasAmountChanged
            ? selectedInvoice.amount
            : undefined,
        },
      };
      onUpdateInvoice(updatedInvoice);
    } else {
      onApproveInvoice(selectedInvoice.id, {
        approvedBy: currentUser?.name || "Admin",
        approvedAt: new Date().toISOString(),
        approvedAmount: approvalAmount,
      });
    }

    setIsViewModalOpen(false);
    setIsApprovingMode(false);
  };

  const handleViewClick = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsApprovingMode(false);
    setIsViewModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (inv.status !== InvoiceStatus.DRAFT && !hasApprovalRights) {
      alert("Nur Administratoren dürfen aktive Rechnungen löschen.");
      return;
    }
    if (window.confirm("Wirklich löschen?")) {
      onDeleteInvoice(inv.id);
    }
  };

  const handleAddCommentWrapper = () => {
    if (!selectedInvoice || !newCommentText.trim()) return;
    if (onAddComment) {
      onAddComment(selectedInvoice.id, newCommentText);
    }

    const newComment = {
      id: `c-${Date.now()}`,
      text: newCommentText,
      author: currentUser?.name || "Admin",
      date: new Date().toISOString().split("T")[0],
    };

    setSelectedInvoice({
      ...selectedInvoice,
      comments: [...(selectedInvoice.comments || []), newComment],
    });
    setNewCommentText("");
  };

  // --- PAYMENTS ---

  const openPaymentModal = (e: React.MouseEvent, inv: Invoice) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    setSelectedInvoice(inv);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("full");
    const openAmount = inv.amount - (inv.paidAmount || 0);
    setPaymentAmount(Number(openAmount.toFixed(2)));
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = () => {
    if (!selectedInvoice) return;

    const openAmount =
      selectedInvoice.amount - (selectedInvoice.paidAmount || 0);

    const amountToPay =
      paymentMode === "full"
        ? openAmount
        : Number(paymentAmount || 0);

    if (amountToPay <= 0) {
      alert("Betrag muss positiv sein.");
      return;
    }

    const newPaidAmount = (selectedInvoice.paidAmount || 0) + amountToPay;
    let newStatus = selectedInvoice.status;

    if (newPaidAmount >= selectedInvoice.amount - 0.02) {
      newStatus = InvoiceStatus.PAID;
    } else {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    }

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: paymentDate,
      amount: amountToPay,
      type: paymentMode,
      recordedBy: currentUser?.name || "System",
    };

    const updatedInvoice: Invoice = {
      ...selectedInvoice,
      status: newStatus,
      paidAmount: newPaidAmount,
      paidDate:
        newStatus === InvoiceStatus.PAID ? paymentDate : undefined,
      paymentHistory: [
        ...(selectedInvoice.paymentHistory || []),
        newPaymentRecord,
      ],
    };

    if (onUpdateInvoice) {
      onUpdateInvoice(updatedInvoice);
    }
    if (onUpdatePayment) {
      onUpdatePayment(selectedInvoice.id, paymentDate, amountToPay);
    }

    setIsPaymentModalOpen(false);
  };

  // --- CREATION / DRAG & DROP / AI / UPLOAD ---

  const processFile = async (file: File) => {
    try {
      // 1. lokale Vorschau
      setFilePreviewUrl(URL.createObjectURL(file));
      setFileType(file.type);

      // 2. Upload zum Backend
      setUploadStatus("Uploading...");
      setIsAnalyzing(true);

      const serverUrlData: any = await uploadFileToServer(file); // { url, filename, serverFilename }

      let finalFileUrl: string | null = null;
      let serverFilename: string | null = null;

      if (serverUrlData && typeof serverUrlData === "object") {
        finalFileUrl = serverUrlData.url || null;
        serverFilename =
          serverUrlData.serverFilename ||
          serverUrlData.storedName ||
          serverUrlData.filename ||
          null;

        if (finalFileUrl) {
          setFilePreviewUrl(finalFileUrl);
        }
        setUploadStatus("Gespeichert");
      } else if (typeof serverUrlData === "string") {
        finalFileUrl = serverUrlData;
        setFilePreviewUrl(finalFileUrl);
        setUploadStatus("Gespeichert");
      } else {
        setUploadStatus("Upload Fehler (Lokal)");
      }

      // 3. KI Analyse über Backend (Vision)
      if (serverFilename) {
        try {
          const res = await analyzeFileOnBackend(serverFilename);

          setNewInv((prev) => ({
            ...prev,
            supplier: res.supplier || prev.supplier,
            number: res.invoiceNumber || prev.number,
            amount: res.amount ?? prev.amount,
            date: res.date || prev.date,
            // Wir könnten hier auch dueDate = res.dueDate setzen
          }));

          setIsAnalyzing(false);
          return;
        } catch (err) {
          console.error("Fehler bei analyzeFileOnBackend:", err);
          // fällt dann unten auf Fallback zurück, falls konfiguriert
        }
      }

      // 3b. Fallback: Client-Seite, falls Key in Einstellungen
      if (effectiveSettings.aiApiKey) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          const res = await analyzeInvoiceImage(
            base64,
            file.type,
            effectiveSettings
          );

          if (res) {
            setNewInv((prev) => ({
              ...prev,
              supplier: (res as any).supplier || prev.supplier,
              number: (res as any).number || prev.number,
              amount: (res as any).amount || prev.amount,
              date: (res as any).date || prev.date,
              category: (res as any).category || prev.category,
              aiSuggestion:
                (res as any).aiSuggestion || (prev as any).aiSuggestion,
            }));
          }
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
      } else {
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error("Fehler in processFile:", err);
      setUploadStatus("Fehler beim Upload/KI");
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveNew = () => {
    if (!newInv.amount) {
      alert("Betrag fehlt.");
      return;
    }

    const baseDate = newInv.date || new Date().toISOString().split("T")[0];

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      type: "incoming",
      number: newInv.number || "NEU",
      supplier: newInv.supplier || "Unbekannt",
      amount: Number(newInv.amount),
      date: baseDate,
      dueDate:
        newInv.dueDate ||
        new Date().toISOString().split("T")[0],
      status: InvoiceStatus.DRAFT,
      category: newInv.category,
      createdBy: currentUser?.name,
      fileUrl: filePreviewUrl || undefined,
      allocations: isSplitMode ? allocations : undefined,
      projectId:
        !isSplitMode &&
        allEntities.find((e) => e.id === selectedEntityId)?.type ===
          "project"
          ? selectedEntityId
          : undefined,
      costCenterId:
        !isSplitMode &&
        allEntities.find((e) => e.id === selectedEntityId)?.type ===
          "cost_center"
          ? selectedEntityId
          : undefined,
    };

    onAddInvoice(invoice);
    setIsCreateModalOpen(false);
    setNewInv({
      amount: 0,
      category: categories[0],
      date: new Date().toISOString().split("T")[0],
      status: InvoiceStatus.DRAFT,
    });
    setFilePreviewUrl(null);
    setFileType("");
    setAllocations([]);
    setUploadStatus("");
  };

  // --- Rendering helpers ---

  const renderProgressBar = (inv: Invoice) => {
    const paid = inv.paidAmount || 0;
    const total = inv.amount;
    const percent = Math.min(100, (paid / total) * 100);

    if (percent <= 0) return null;

    return (
      <div className="mt-2 w-full">
        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
          <span>Bezahlt: € {paid.toFixed(2)}</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              percent >= 99 ? "bg-green-500" : "bg-yellow-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const renderStamp = (invoice: Invoice) => {
    const isEditable =
      isApprovingMode && selectedInvoice?.id === invoice.id;
    const showStamp = invoice.approvalData || isEditable;

    if (!showStamp) return null;

    const approver =
      invoice.approvalData?.approvedBy ||
      currentUser?.name ||
      "Admin";
    const date = invoice.approvalData?.approvedAt
      ? new Date(invoice.approvalData.approvedAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const amount = isEditable
      ? approvalAmount
      : invoice.approvalData?.approvedAmount ?? invoice.amount;

    return (
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 border-2 border-green-600 text-green-600 px-3 py-1 rounded-lg font-bold text-sm uppercase opacity-90 z-30 bg-white/80 backdrop-blur-sm rotate-[-6deg] shadow-md select-none">
        <div className="flex flex-col items-center">
          <div className="flex items-center mb-0.5">
            <Stamp className="w-4 h-4 mr-1" />
            FREIGEGEBEN
          </div>
          <div className="w-full h-px bg-green-600 my-0.5" />
          <div className="text-[10px] font-bold text-center leading-tight space-y-0.5">
            <div>AM: {date}</div>
            <div>VON: {approver}</div>
            <div className="flex items-center justify-center bg-green-50/50 px-1 rounded">
              <span className="mr-1">BETRAG: €</span>
              {isEditable ? (
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) =>
                    setApprovalAmount(parseFloat(e.target.value))
                  }
                  className="bg-transparent border-b border-green-600 text-center font-bold w-16 focus:outline-none text-green-800 h-4 text-xs"
                  autoFocus
                />
              ) : (
                <span>{amount.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- JSX ---

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">
          Eingangsrechnungen
        </h1>
        <div className="flex space-x-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-2 text-green-700 hover:bg-green-50 rounded text-sm font-medium transition-colors"
              title="Als Excel/CSV"
            >
              <FileText className="w-4 h-4 mr-2" /> CSV
            </button>
            <div className="w-px bg-slate-200 mx-1" />
            <button
              onClick={handleExportPDF}
              className="flex items-center px-3 py-2 text-red-700 hover:bg-red-50 rounded text-sm font-medium transition-colors"
              title="Als PDF Liste"
            >
              <FileText className="w-4 h-4 mr-2" /> PDF
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-700 shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Beleg erfassen
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 space-x-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === "all"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setActiveTab("draft")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === "draft"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Entwurf
        </button>
        <button
          onClick={() => setActiveTab("approval")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === "approval"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Zur Freigabe
        </button>
        <button
          onClick={() => setActiveTab("open")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === "open"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Offen / Freigegeben
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === "paid"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Bezahlt
        </button>
      </div>

      {/* LISTE */}
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b">
            <tr>
              <th className="p-4 w-32">Status</th>
              <th className="p-4">Referenz</th>
              <th className="p-4">Lieferant</th>
              <th className="p-4">Betrag / Zahlung</th>
              <th className="p-4">Kategorie</th>
              <th className="p-4 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-slate-400"
                >
                  Keine Rechnungen in diesem Bereich.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const hasComments =
                  !!inv.comments && inv.comments.length > 0;
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => handleViewClick(inv)}
                  >
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                          inv.status === InvoiceStatus.DRAFT
                            ? "bg-slate-100 text-slate-600"
                            : inv.status ===
                              InvoiceStatus.PENDING_APPROVAL
                            ? "bg-orange-100 text-orange-700"
                            : inv.status === InvoiceStatus.APPROVED
                            ? "bg-blue-100 text-blue-700"
                            : inv.status === InvoiceStatus.PAID
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                      {inv.status === InvoiceStatus.PAID &&
                        inv.paidDate && (
                          <div className="text-[10px] text-green-700 font-bold mt-1 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />{" "}
                            Bezahlt{" "}
                            {new Date(
                              inv.paidDate
                            ).toLocaleDateString()}
                          </div>
                        )}
                    </td>
                    <td className="p-4 font-mono text-slate-700 relative">
                      {inv.number}
                      {hasComments && (
                        <div
                          className="absolute top-2 left-0 -ml-2 bg-red-500 rounded-full p-0.5 border border-white"
                          title="Kommentare vorhanden"
                        >
                          <MessageSquare
                            size={8}
                            className="text-white fill-white"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">
                      {inv.supplier}
                    </td>
                    <td className="p-4">
                      <div className="font-bold">
                        €{" "}
                        {inv.amount.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      {renderProgressBar(inv)}
                    </td>
                    <td className="p-4 text-slate-600">
                      {inv.category}
                    </td>
                    <td
                      className="p-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end space-x-2">
                        {inv.status === InvoiceStatus.DRAFT && (
                          <button
                            onClick={(e) =>
                              handleMoveToApproval(e, inv)
                            }
                            className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-200 border border-purple-200 flex items-center shadow-sm"
                            title="An Buchhaltung senden"
                          >
                            <Send className="w-3 h-3 mr-1.5" /> Zur
                            Freigabe
                          </button>
                        )}

                        {inv.status ===
                          InvoiceStatus.PENDING_APPROVAL &&
                          (hasApprovalRights ? (
                            <button
                              onClick={(e) =>
                                handleApproveClick(e, inv)
                              }
                              className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-orange-200 border border-orange-200 flex items-center shadow-sm"
                              title="Jetzt genehmigen"
                            >
                              <Check className="w-3 h-3 mr-1.5" />{" "}
                              Freigeben
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic px-2">
                              Wartet...
                            </span>
                          ))}

                        {(inv.status === InvoiceStatus.APPROVED ||
                          inv.status ===
                            InvoiceStatus.PARTIALLY_PAID) && (
                          <button
                            onClick={(e) =>
                              openPaymentModal(e, inv)
                            }
                            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-green-200 border border-green-200 flex items-center shadow-sm"
                          >
                            <Euro className="w-3 h-3 mr-1.5" /> Bezahlt
                            am
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDelete(e, inv)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">
                Zahlung erfassen
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm border border-slate-200">
              <div className="flex justify-between mb-1">
                <span>Gesamtbetrag:</span>
                <b>€ {selectedInvoice.amount.toFixed(2)}</b>
              </div>
              <div className="flex justify-between text-green-600 mb-1">
                <span>Bereits bezahlt:</span>
                <b>
                  € {(selectedInvoice.paidAmount || 0).toFixed(2)}
                </b>
              </div>
              <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-red-600 font-bold">
                <span>Offen:</span>
                <span>
                  €{" "}
                  {(
                    selectedInvoice.amount -
                    (selectedInvoice.paidAmount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Bezahlt am
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 p-2.5 rounded-lg"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Art der Zahlung
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setPaymentMode("full");
                      const openAmount =
                        selectedInvoice.amount -
                        (selectedInvoice.paidAmount || 0);
                      setPaymentAmount(
                        Number(openAmount.toFixed(2))
                      );
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      paymentMode === "full"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    Vollzahlung
                  </button>
                  <button
                    onClick={() => setPaymentMode("partial")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      paymentMode === "partial"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    Teilzahlung
                  </button>
                </div>
              </div>

              {paymentMode === "partial" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Betrag (€)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 p-2.5 rounded-lg font-bold text-lg"
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(parseFloat(e.target.value))
                    }
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleExecutePayment}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center transition-transform active:scale-95"
            >
              <Check className="w-4 h-4 mr-2" /> Zahlung speichern
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT: Upload */}
            <div
              className={`w-1/3 p-6 border-r border-slate-200 flex flex-col items-center justify-center relative transition-colors ${
                isDragging
                  ? "bg-brand-50 border-brand-400"
                  : "bg-slate-100"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {filePreviewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-100">
                  {fileType === "application/pdf" ||
                  filePreviewUrl.endsWith(".pdf") ? (
                    <iframe
                      src={filePreviewUrl}
                      className="w-full h-full border-none shadow-md rounded-lg"
                      title="PDF Vorschau"
                    />
                  ) : (
                    <img
                      src={filePreviewUrl}
                      className="max-w-full max-h-full object-contain shadow-md rounded-lg"
                    />
                  )}
                  <div className="absolute bottom-4 left-0 right-0 text-center bg-white/80 p-2 rounded shadow">
                    <p className="text-xs font-bold text-green-600">
                      {uploadStatus || "Vorschau"}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer p-8 border-2 border-dashed rounded-xl flex flex-col items-center text-slate-400 transition-colors ${
                    isDragging
                      ? "border-brand-500 text-brand-600 bg-white"
                      : "border-slate-300 hover:border-slate-400 hover:bg-white"
                  }`}
                >
                  <UploadCloud
                    className={`w-12 h-12 mb-2 ${
                      isDragging ? "animate-bounce" : ""
                    }`}
                  />
                  <span className="text-sm font-bold">
                    {isDragging
                      ? "Datei hier loslassen"
                      : "Beleg hier ablegen"}
                  </span>
                  <span className="text-[10px] mt-1">
                    oder klicken zum Upload (PDF, JPG)
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin text-brand-600 mb-2 w-8 h-8" />
                  <span className="font-bold text-brand-600 text-sm">
                    Beleg wird mit KI analysiert...
                  </span>
                </div>
              )}
            </div>

            {/* RIGHT: Form */}
            <div className="w-2/3 p-8 overflow-y-auto bg-white relative flex flex-col">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>

              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-brand-600" />{" "}
                Belegdaten erfassen
              </h2>

              <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    Lieferant
                  </label>
                  <div className="relative">
                    <input
                      list="suppliers-list"
                      className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      value={newInv.supplier || ""}
                      onChange={(e) =>
                        setNewInv({
                          ...newInv,
                          supplier: e.target.value,
                        })
                      }
                      placeholder="Name eingeben oder auswählen"
                    />
                    <datalist id="suppliers-list">
                      {suppliers.map((s, idx) => (
                        <option key={idx} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    Referenz / Nr.
                  </label>
                  <input
                    className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newInv.number || ""}
                    onChange={(e) =>
                      setNewInv({
                        ...newInv,
                        number: e.target.value,
                      })
                    }
                    placeholder="Rechnungs-Nr."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    Betrag (€)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 p-2.5 rounded-lg font-bold text-lg"
                    value={newInv.amount ?? 0}
                    onChange={(e) =>
                      setNewInv({
                        ...newInv,
                        amount: parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    Datum
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-300 p-2.5 rounded-lg"
                    value={newInv.date || ""}
                    onChange={(e) =>
                      setNewInv({
                        ...newInv,
                        date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    Kategorie
                  </label>
                  <select
                    className="w-full border border-slate-300 p-2.5 rounded-lg bg-white"
                    value={newInv.category}
                    onChange={(e) =>
                      setNewInv({
                        ...newInv,
                        category: e.target.value,
                      })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SPLIT */}
              <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">
                    Kostenzuordnung
                  </label>
                  <button
                    onClick={() => setIsSplitMode(!isSplitMode)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center transition-colors ${
                      isSplitMode
                        ? "bg-purple-100 text-purple-700 border-purple-300"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    <Split className="w-3 h-3 mr-1.5" />{" "}
                    {isSplitMode ? "Split aktiv" : "Split aktivieren"}
                  </button>
                </div>

                {!isSplitMode ? (
                  <select
                    className="w-full border border-slate-300 p-2.5 rounded-lg bg-white text-sm"
                    value={selectedEntityId}
                    onChange={(e) =>
                      setSelectedEntityId(e.target.value)
                    }
                  >
                    <option value="">
                      -- Keine Zuordnung --
                    </option>
                    {allEntities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.type === "project"
                          ? "🏗️ PROJEKT"
                          : "🏢 KSt"}{" "}
                        : {e.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    {allocations.map((alloc, idx) => (
                      <div
                        key={alloc.id || idx}
                        className="flex gap-2"
                      >
                        <select
                          className="flex-1 border border-slate-300 p-2 text-xs rounded-md"
                          value={alloc.entityId}
                          onChange={(e) => {
                            const newAlloc = [...allocations];
                            newAlloc[idx].entityId = e.target.value;
                            setAllocations(newAlloc);
                          }}
                        >
                          {allEntities.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="w-24 border border-slate-300 p-2 text-xs rounded-md text-right"
                          value={alloc.amount}
                          onChange={(e) => {
                            const newAlloc = [...allocations];
                            newAlloc[idx].amount =
                              parseFloat(e.target.value) || 0;
                            setAllocations(newAlloc);
                          }}
                        />
                      </div>
                    ))}

                    <button
                      onClick={() =>
                        setAllocations([
                          ...allocations,
                          {
                            id: Date.now().toString(),
                            amount: 0,
                            type: "cost_center",
                            entityId: allEntities[0]?.id || "",
                          },
                        ])
                      }
                      className="text-xs text-blue-600 font-bold flex items-center mt-1"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Zeile hinzufügen
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveNew}
                  className="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" /> Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL / APPROVAL VIEW MODAL */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT: DOC */}
            <div className="w-1/2 bg-slate-800 flex items-center justify-center border-r border-slate-700 relative overflow-hidden">
              {renderStamp(selectedInvoice)}

              {selectedInvoice.fileUrl ? (
                selectedInvoice.fileUrl.endsWith(".pdf") ? (
                  <iframe
                    src={selectedInvoice.fileUrl}
                    className="w-full h-full border-none"
                    title="Rechnung"
                  />
                ) : (
                  <img
                    src={selectedInvoice.fileUrl}
                    className="max-w-full max-h-full object-contain"
                  />
                )
              ) : (
                <div className="text-white/30 flex flex-col items-center">
                  <FileText className="w-16 h-16 mb-2" />
                  <p>Kein Belegbild</p>
                </div>
              )}
            </div>

            {/* RIGHT: DATA */}
            <div className="w-1/2 flex flex-col h-full">
              <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
                <div className="mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Lieferant
                  </span>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {selectedInvoice.supplier}
                  </h2>
                  <p className="text-slate-500 font-mono mt-1 flex items-center">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-xs mr-2">
                      REF
                    </span>{" "}
                    {selectedInvoice.number}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="block text-slate-400 text-xs uppercase font-bold mb-1">
                        Betrag
                      </span>
                      <span className="font-bold text-2xl text-slate-900">
                        € {selectedInvoice.amount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs uppercase font-bold mb-1">
                        Status
                      </span>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          selectedInvoice.status ===
                          InvoiceStatus.PAID
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedInvoice.status}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs uppercase font-bold mb-1">
                        Rechnungsdatum
                      </span>
                      <span className="font-medium">
                        {selectedInvoice.date}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs uppercase font-bold mb-1">
                        Fällig am
                      </span>
                      <span className="font-medium text-orange-600">
                        {selectedInvoice.dueDate}
                      </span>
                    </div>
                  </div>
                  {renderProgressBar(selectedInvoice)}
                </div>

                <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider border-b pb-2">
                  Verlauf &amp; Protokoll
                </h3>
                <div className="space-y-3">
                  {selectedInvoice.comments?.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-start"
                    >
                      <div className="bg-slate-100 p-2 rounded-full mr-3">
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {c.author}{" "}
                          <span className="font-normal text-xs text-slate-400 ml-1">
                            {c.date}
                          </span>
                        </span>
                        <span className="text-xs text-slate-700">
                          {c.text}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* New Comment */}
                  <div className="mt-2 flex space-x-2">
                    <input
                      type="text"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Kommentar hinzufügen..."
                      value={newCommentText}
                      onChange={(e) =>
                        setNewCommentText(e.target.value)
                      }
                    />
                    <button
                      onClick={handleAddCommentWrapper}
                      className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedInvoice.approvalData && (
                    <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm flex items-start">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <span className="font-bold text-green-900 text-sm block">
                          Freigegeben
                        </span>
                        <span className="text-xs text-green-700">
                          von {selectedInvoice.approvalData.approvedBy} am{" "}
                          {new Date(
                            selectedInvoice.approvalData.approvedAt
                          ).toLocaleDateString()}
                        </span>
                        {selectedInvoice.approvalData.originalAmount &&
                          selectedInvoice.approvalData
                            .originalAmount !==
                            selectedInvoice.amount && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Ursprungsbetrag: €{" "}
                              {selectedInvoice.approvalData.originalAmount.toFixed(
                                2
                              )}{" "}
                              (Gekürzt auf €{" "}
                              {selectedInvoice.amount.toFixed(2)})
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {selectedInvoice.paymentHistory?.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex items-start"
                    >
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Euro className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-bold text-blue-900 text-sm block">
                          {rec.type === "full"
                            ? "Vollzahlung"
                            : "Teilzahlung"}
                          : € {rec.amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-blue-700">
                          verbucht durch {rec.recordedBy} am{" "}
                          {new Date(rec.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex items-start opacity-70">
                    <div className="bg-slate-200 p-2 rounded-full mr-3">
                      <Plus className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 text-sm block">
                        Erstellt
                      </span>
                      <span className="text-xs text-slate-500">
                        von {selectedInvoice.createdBy || "System"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* APPROVAL FOOTER */}
              {isApprovingMode && (
                <div className="p-6 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      Rechnung prüfen
                    </p>
                    <p className="text-xs text-slate-500">
                      Bitte prüfen Sie den Beleg links bevor Sie
                      freigeben.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={executeApproval}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-lg flex items-center transform active:scale-95 transition-all"
                    >
                      <Stamp className="w-4 h-4 mr-2" /> Stempel
                      aufdrücken &amp; Freigeben
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

