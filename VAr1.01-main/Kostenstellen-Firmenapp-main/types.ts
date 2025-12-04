
export enum Status {
  ACTIVE = 'Aktiv',
  PENDING = 'Ausstehend',
  COMPLETED = 'Abgeschlossen',
  WARNING = 'Warnung',
  CRITICAL = 'Kritisch'
}

export enum InvoiceStatus {
  DRAFT = 'Entwurf',
  CAPTURED = 'Erfasst', // NEW STATUS
  PENDING_APPROVAL = 'Warte auf Freigabe',
  APPROVED = 'Freigegeben', // Offen
  SENT = 'Versendet',
  PAID = 'Bezahlt',
  PARTIALLY_PAID = 'Teilbezahlt',
  OVERDUE = 'Überfällig'
}

export type UserRole = 'admin' | 'user';

export interface Company {
    id: string;
    name: string;
    dbPrefix: string; 
    created: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin?: string;
  password?: string;
  // Berechtigungen
  allowedModules?: string[]; // IDs der Module, die der User sehen darf
  canApprove?: boolean;      // Darf Rechnungen freigeben und löschen (außer Entwürfe)
}

export interface Contact {
  id: string;
  type: 'customer' | 'supplier';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  customerNumber?: string; 
  address: string;
  zip: string;
  city: string;
  country: string;
  uid?: string; 
  email?: string;
  phone?: string;
  iban?: string; 
  bic?: string;
  notes?: string;
}

export interface EmailConfig {
  incomingHost: string;
  incomingPort: string;
  incomingUser: string;
  incomingPass: string;
  incomingSecure: boolean;
  outgoingHost: string;
  outgoingPort: string;
  outgoingUser: string;
  outgoingPass: string;
  outgoingSecure: boolean;
  senderName: string;
}

export interface FinApiConfig {
  clientId: string;
  clientSecret: string;
  sandbox: boolean; 
}

export interface CompanySettings {
  name: string;
  address: string;
  zip: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  uid: string;
  fn: string;
  court: string;
  bankName: string;
  iban: string;
  bic: string;
  owner: string;
  logoUrl?: string;
  aiApiKey?: string; 
  aiProvider?: 'google' | 'openrouter';
  aiModel?: string;
  whatsappConnected?: boolean;
  emailConfig?: EmailConfig;
  finApiConfig?: FinApiConfig;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  budget: number;
  used: number;
  manager: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  notes?: string; 
  quantity: number;
  unitType?: 'piece' | 'days' | 'hours' | 'flat'; 
  dateFrom?: string; 
  dateTo?: string;   
  unitPriceNet: number;
  taxRate: 10 | 20;
  totalNet: number;
  totalGross: number;
}

export interface InvoiceAllocation {
  id: string;
  amount: number;
  type: 'project' | 'cost_center';
  entityId: string;
}

export interface ApprovalData {
  approvedBy: string;
  approvedAt: string;
  approvedAmount?: number; // The amount written on the stamp
  originalAmount?: number; // The original amount before approval (if changed)
}

export interface InvoiceComment {
  id: string;
  text: string;
  author: string;
  date: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  recordedBy: string;
  type: 'full' | 'partial';
}

export interface Invoice {
  id: string;
  number: string;
  type: 'incoming' | 'outgoing';
  contactId?: string; 
  supplier?: string; 
  customer?: string; 
  customerNumber?: string; 
  showCustomerNumber?: boolean; 
  customerAddress?: string;
  customerUID?: string; 
  projectId?: string; 
  costCenterId?: string; 
  locationAddress?: string; 
  amount: number;
  
  // Zahlungslogik
  paidAmount?: number;
  paymentHistory?: PaymentRecord[];
  paidDate?: string; // Datum der letzten/vollständigen Zahlung
  
  taxAmount?: number;
  netAmount?: number;
  items?: InvoiceItem[];
  allocations?: InvoiceAllocation[]; // Für Split-Buchungen
  date: string;
  dueDate: string;
  
  status: InvoiceStatus;
  category?: string; 
  aiSuggestion?: string;
  fileUrl?: string; 
  createdBy?: string;
  approvalData?: ApprovalData; 
  comments?: InvoiceComment[];
  linkedTransactionId?: string;
}

export interface ConstructionDiaryEntry {
  id: string;
  date: string;
  weather: string;
  temperature: string;
  staffCount: number;
  content: string;
  images: string[];
  author: string;
}

export interface Project {
  id: string;
  costCenterCode: string;
  name: string; 
  address: string;
  budgetTotal: number;
  budgetUsed: number;
  status: Status;
  manager: string;
  thumbnail?: string;
  startDate: string;
  endDate?: string;
  diaryEntries?: ConstructionDiaryEntry[];
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  relatedEntityId?: string; 
  description?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export interface BankAccount {
  id: string;
  name: string;
  iban: string;
  balance: number;
  currency: string;
  type: 'Checking' | 'CreditCard' | 'Savings';
  finApiId?: number; 
  lastSync?: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  counterparty: string;
  status: 'Pending' | 'Booked';
  relatedInvoiceId?: string; 
  finApiId?: number; 
  linkedInvoiceId?: string;
}

export interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export interface LoanScheduleItem {
  period: number;
  date: string;
  type: 'Plan' | 'Sondertilgung';
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
}

export interface LoanTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'repayment' | 'interest_payment';
  note?: string;
}

export interface Loan {
  id: string;
  type: 'taken' | 'given';
  counterpartyName: string;
  contractInfo?: string; 
  amount: number; 
  interestRate: number; 
  interestType: 'p.a.' | 'fixed'; 
  amortizationType: 'annuity' | 'linear' | 'balloon'; 
  paymentFrequency: 1 | 3 | 6 | 12; 
  startDate: string;
  endDate: string;
  collateral?: string;
  status: 'Active' | 'Closed' | 'Defaulted';
  autoPayment?: boolean; 
  transactions?: LoanTransaction[]; 
  schedule?: LoanScheduleItem[]; 
}