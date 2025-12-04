import {
  Invoice,
  InvoiceStatus,
  Project,
  Status,
  Task,
  Notification,
  CostCenter,
  User,
  BankAccount,
  BankTransaction,
  CompanySettings,
  Contact,
  Loan,
} from "./types";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Inbox,
  BarChart3,
  Settings,
  CheckSquare,
  Send,
  Users,
  Banknote,
  Landmark,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Kontakte", icon: Users },
  { id: "projects", label: "Projekte / Bauakte", icon: FolderKanban },
  { id: "loans", label: "Darlehen & Kredite", icon: Banknote },
  { id: "banking", label: "Banking & Finanzen", icon: Landmark },
  { id: "inbox", label: "KI-Posteingang", icon: Inbox },
  { id: "invoices", label: "Eingangsrechnungen", icon: FileText },
  { id: "outgoing", label: "Ausgangsrechnungen", icon: Send },
  { id: "accounting", label: "Buchhaltung / KSt", icon: BarChart3 },
  { id: "tasks", label: "Aufgaben", icon: CheckSquare },
  { id: "system", label: "System & Einstellungen", icon: Settings },
];

export const INITIAL_CATEGORIES = [
  "Sonstiges",
  "Material",
  "Dienstleistung",
  "Miete",
  "KFZ-Kosten",
  "Büromaterial",
  "Werbung",
  "Telefon & Internet",
  "Versicherung",
  "Verpflegung / Repräsentation",
];

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  name: "NexGen Bau & Management GmbH",
  address: "Musterstraße 12/4",
  zip: "1010",
  city: "Wien",
  email: "test@bb-asset.at",
  phone: "+43 1 234 56 78",
  website: "www.nexgen-erp.at",
  uid: "ATU12345678",
  fn: "FN 123456z",
  court: "Handelsgericht Wien",
  bankName: "Erste Bank",
  iban: "AT89 2011 1000 0000 1234",
  bic: "EPSAATWW",
  owner: "Ing. Max Mustermann",
  logoUrl: "",
  aiApiKey: process.env.API_KEY || "",
  aiProvider: "google",
  aiModel: "gemini-2.5-flash",
  whatsappConnected: false,
  emailConfig: {
    incomingHost: "imap.easyname.com",
    incomingPort: "993",
    incomingUser: "148355mail23",
    incomingPass: "123456",
    incomingSecure: true,
    outgoingHost: "smtp.easyname.com",
    outgoingPort: "587",
    outgoingUser: "148355mail23",
    outgoingPass: "123456",
    outgoingSecure: true,
    senderName: "NexGen Buchhaltung",
  },
  finApiConfig: {
    clientId: "",
    clientSecret: "",
    sandbox: true,
  },
};

// ✅ Users lassen wir, damit Login & Rollen weiter funktionieren
export const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Administrator",
    email: "bars.b@live.at",
    role: "admin",
    lastLogin: "Heute, 10:42",
    password: "9747597",
    allowedModules: NAV_ITEMS.map((i) => i.id),
    canApprove: true,
  },
  {
    id: "u2",
    name: "Max Mitarbeiter",
    email: "max@nexgen.at",
    role: "user",
    lastLogin: "Gestern, 16:20",
    password: "user123",
    allowedModules: ["dashboard", "tasks", "invoices", "projects"],
    canApprove: false,
  },
  {
    id: "u3",
    name: "Sarah Buchhaltung",
    email: "sarah@nexgen.at",
    role: "user",
    lastLogin: "Heute, 08:15",
    password: "finance123",
    allowedModules: ["dashboard", "invoices", "accounting", "banking"],
    canApprove: true,
  },
];

// ❌ Alle Mock-Daten, die "echte" Geschäftsdaten simulieren, leeren wir:

export const MOCK_CONTACTS: Contact[] = [];

export const MOCK_COST_CENTERS: CostCenter[] = [];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_INVOICES: Invoice[] = [];

export const MOCK_TASKS: Task[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [];

export const MOCK_TRANSACTIONS: BankTransaction[] = [];

export const MOCK_LOANS: Loan[] = [];


