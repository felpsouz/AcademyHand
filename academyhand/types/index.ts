export type BeltLevel = 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
export type StudentStatus = 'active' | 'inactive' | 'suspended';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type TransactionType = 'revenue' | 'expense';
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ViewMode = 'login' | 'student' | 'admin';
export type TabType = 'dashboard' | 'students' | 'videos' | 'financial';

export interface Student {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  belt: BeltLevel;
  status: StudentStatus;
  paymentStatus: PaymentStatus;
  monthlyFee: number;
  lastPayment: string;
  nextPaymentDue: string;
  createdAt: string;
  updatedAt: string;
  totalAttendances: number;
  beltHistory: BeltChange[];
}

export interface BeltChange {
  from: BeltLevel;
  to: BeltLevel;
  date: string;
  notes?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}