'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { 
  Users, DollarSign, Calendar, Video, Plus, Search, X, Edit2, TrendingUp, 
  TrendingDown, BarChart3, Clock, CheckCircle2, AlertTriangle, 
  LogIn, UserCheck, Award, Activity, Trash2,
  Home, PlayCircle, Download, FileText, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Eye, EyeOff,
  Loader2, FileSpreadsheet, Bell, History, CreditCard
} from 'lucide-react';

// Declaração TypeScript para window.storage
declare global {
  interface Window {
    storage: {
      get(key: string, shared?: boolean): Promise<{ key: string; value: string; shared: boolean } | null>;
      set(key: string, value: string, shared?: boolean): Promise<{ key: string; value: string; shared: boolean } | null>;
      delete(key: string, shared?: boolean): Promise<{ key: string; deleted: boolean; shared: boolean } | null>;
      list(prefix?: string, shared?: boolean): Promise<{ keys: string[]; prefix?: string; shared: boolean } | null>;
    };
  }
}

// ============================================
// TYPES AND INTERFACES
// ============================================

type BeltLevel = 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
type StudentStatus = 'active' | 'inactive' | 'suspended';
type PaymentStatus = 'paid' | 'pending' | 'overdue';
type TransactionType = 'revenue' | 'expense';
type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
type ToastType = 'success' | 'error' | 'warning' | 'info';
type ViewMode = 'login' | 'student' | 'admin';
type TabType = 'dashboard' | 'students' | 'videos' | 'financial';

interface Student {
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

interface BeltChange {
  from: BeltLevel;
  to: BeltLevel;
  date: string;
  notes?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  level: BeltLevel;
  duration: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  timestamp: string;
  notes?: string;
}

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  paymentMethod?: PaymentMethod;
  studentId?: string;
  studentName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface FinancialStats {
  revenue: number;
  expenses: number;
  profit: number;
  expectedRevenue: number;
  revenueRate: number;
  revenueGrowth: number;
}

interface AttendanceStats {
  todayCount: number;
  attendanceRate: number;
  avgMonthlyAttendance: string;
}

// ============================================
// FIREBASE SERVICE LAYER
// ============================================

class FirebaseService {
  private checkStorage(): boolean {
    if (typeof window === 'undefined' || !window.storage) {
      console.error('Storage API not available');
      return false;
    }
    return true;
  }

  async getStudents(): Promise<Student[]> {
    if (!this.checkStorage()) return [];
    try {
      const result = await window.storage.get('students');
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }

  async saveStudent(student: Student): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const students = await this.getStudents();
      const index = students.findIndex(s => s.id === student.id);
      
      if (index >= 0) {
        students[index] = { ...student, updatedAt: new Date().toISOString() };
      } else {
        students.push(student);
      }
      
      await window.storage.set('students', JSON.stringify(students));
    } catch (error) {
      console.error('Error saving student:', error);
      throw error;
    }
  }

  async deleteStudent(id: string): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const students = await this.getStudents();
      const filtered = students.filter(s => s.id !== id);
      await window.storage.set('students', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  }

  async getVideos(): Promise<Video[]> {
    if (!this.checkStorage()) return [];
    try {
      const result = await window.storage.get('videos');
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error getting videos:', error);
      return [];
    }
  }

  async saveVideo(video: Video): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const videos = await this.getVideos();
      const index = videos.findIndex(v => v.id === video.id);
      
      if (index >= 0) {
        videos[index] = { ...video, updatedAt: new Date().toISOString() };
      } else {
        videos.push(video);
      }
      
      await window.storage.set('videos', JSON.stringify(videos));
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  }

  async deleteVideo(id: string): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const videos = await this.getVideos();
      const filtered = videos.filter(v => v.id !== id);
      await window.storage.set('videos', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  async getAttendances(): Promise<Attendance[]> {
    if (!this.checkStorage()) return [];
    try {
      const result = await window.storage.get('attendances');
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error getting attendances:', error);
      return [];
    }
  }

  async saveAttendance(attendance: Attendance): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const attendances = await this.getAttendances();
      attendances.push(attendance);
      await window.storage.set('attendances', JSON.stringify(attendances));
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    if (!this.checkStorage()) return [];
    try {
      const result = await window.storage.get('transactions');
      return result ? JSON.parse(result.value) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const transactions = await this.getTransactions();
      const index = transactions.findIndex(t => t.id === transaction.id);
      
      if (index >= 0) {
        transactions[index] = { ...transaction, updatedAt: new Date().toISOString() };
      } else {
        transactions.push(transaction);
      }
      
      await window.storage.set('transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    if (!this.checkStorage()) {
      throw new Error('Storage not available');
    }
    try {
      const transactions = await this.getTransactions();
      const filtered = transactions.filter(t => t.id !== id);
      await window.storage.set('transactions', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
};

const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('pt-BR');
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const calculateNextPaymentDue = (lastPayment: string): string => {
  const date = new Date(lastPayment);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"']/g, '');
};

// ============================================
// TOAST COMPONENT
// ============================================

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = memo(({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: AlertCircle
  };

  const Icon = icons[type];

  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${styles[type]} px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <p className="font-medium text-sm sm:text-base">{message}</p>
      <button 
        onClick={onClose} 
        className="ml-2 hover:opacity-80 flex-shrink-0"
        aria-label="Fechar notificação"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

// ============================================
// LOADING COMPONENT
// ============================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(({ size = 'md', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const content = (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-red-600`} />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
});

LoadingSpinner.displayName = 'LoadingSpinner';

// ============================================
// MAIN COMPONENT
// ============================================

const ImperioJiuJitsu: React.FC = () => {
  const firebaseService = useRef(new FirebaseService()).current;
  
  const [activeView, setActiveView] = useState<ViewMode>('login');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'student' | 'video' | 'transaction'>('student');
  const [editingItem, setEditingItem] = useState<Student | Video | Transaction | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterBelt, setFilterBelt] = useState<BeltLevel | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'monthlyFee'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const itemsPerPage = 10;

  // ============================================
  // TOAST MANAGEMENT
  // ============================================

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    loadData();
    const interval = setInterval(checkPaymentStatus, 3600000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, videosData, attendancesData, transactionsData] = await Promise.all([
        firebaseService.getStudents(),
        firebaseService.getVideos(),
        firebaseService.getAttendances(),
        firebaseService.getTransactions()
      ]);
      
      setStudents(studentsData);
      setVideos(videosData);
      setAttendances(attendancesData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PAYMENT STATUS CHECK
  // ============================================

  const checkPaymentStatus = useCallback(async () => {
    const now = new Date();
    const updatedStudents = students.map(student => {
      if (student.status !== 'active') return student;
      
      const dueDate = new Date(student.nextPaymentDue);
      const daysToDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let paymentStatus: PaymentStatus = 'paid';
      if (daysToDue < 0) {
        paymentStatus = 'overdue';
      } else if (daysToDue <= 5) {
        paymentStatus = 'pending';
      }
      
      return { ...student, paymentStatus };
    });
    
    setStudents(updatedStudents);
    
    for (const student of updatedStudents) {
      await firebaseService.saveStudent(student);
    }
  }, [students, firebaseService]);

  // ============================================
  // STUDENT MANAGEMENT
  // ============================================

  const addStudent = useCallback(async (studentData: Partial<Student>) => {
    try {
      if (!studentData.name || !studentData.email) {
        showToast('Nome e email são obrigatórios', 'error');
        return;
      }

      if (!validateEmail(studentData.email)) {
        showToast('Email inválido', 'error');
        return;
      }

      if (studentData.phone && !validatePhone(studentData.phone)) {
        showToast('Telefone inválido (use formato: (00) 00000-0000)', 'error');
        return;
      }

      if (students.some(s => s.email === studentData.email)) {
        showToast('Email já cadastrado', 'error');
        return;
      }

      const now = new Date().toISOString();
      const newStudent: Student = {
        id: generateId(),
        name: sanitizeInput(studentData.name),
        email: studentData.email.toLowerCase(),
        cpf: studentData.cpf,
        phone: studentData.phone,
        belt: studentData.belt || 'Branca',
        status: studentData.status || 'active',
        paymentStatus: 'paid',
        monthlyFee: studentData.monthlyFee || 0,
        lastPayment: now,
        nextPaymentDue: calculateNextPaymentDue(now),
        createdAt: now,
        updatedAt: now,
        totalAttendances: 0,
        beltHistory: [{
          from: 'Branca',
          to: studentData.belt || 'Branca',
          date: now,
          notes: 'Cadastro inicial'
        }]
      };

      await firebaseService.saveStudent(newStudent);
      setStudents(prev => [...prev, newStudent]);

      if (newStudent.monthlyFee > 0) {
        const transaction: Transaction = {
          id: generateId(),
          type: 'revenue',
          amount: newStudent.monthlyFee,
          description: `Matrícula - ${newStudent.name}`,
          category: 'Matrícula',
          paymentMethod: 'cash',
          studentId: newStudent.id,
          studentName: newStudent.name,
          createdAt: now,
          updatedAt: now
        };
        
        await firebaseService.saveTransaction(transaction);
        setTransactions(prev => [...prev, transaction]);
      }

      showToast('Aluno cadastrado com sucesso!', 'success');
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error adding student:', error);
      showToast('Erro ao cadastrar aluno', 'error');
    }
  }, [students, firebaseService, showToast]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    try {
      if (updates.email && !validateEmail(updates.email)) {
        showToast('Email inválido', 'error');
        return;
      }

      if (updates.phone && !validatePhone(updates.phone)) {
        showToast('Telefone inválido', 'error');
        return;
      }

      const student = students.find(s => s.id === id);
      if (!student) {
        showToast('Aluno não encontrado', 'error');
        return;
      }

      const updatedStudent: Student = {
        ...student,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (updates.belt && updates.belt !== student.belt) {
        updatedStudent.beltHistory = [
          ...student.beltHistory,
          {
            from: student.belt,
            to: updates.belt,
            date: new Date().toISOString(),
            notes: 'Graduação'
          }
        ];
      }

      await firebaseService.saveStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === id ? updatedStudent : s));
      
      showToast('Aluno atualizado com sucesso!', 'success');
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating student:', error);
      showToast('Erro ao atualizar aluno', 'error');
    }
  }, [students, firebaseService, showToast]);

  const deleteStudent = useCallback(async (id: string) => {
    try {
      await firebaseService.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      
      const relatedTransactions = transactions.filter(t => t.studentId === id);
      for (const transaction of relatedTransactions) {
        await firebaseService.deleteTransaction(transaction.id);
      }
      setTransactions(prev => prev.filter(t => t.studentId !== id));
      
      showToast('Aluno removido', 'info');
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('Erro ao remover aluno', 'error');
    }
  }, [firebaseService, transactions, showToast]);

  // ============================================
  // VIDEO MANAGEMENT
  // ============================================

  const addVideo = useCallback(async (videoData: Partial<Video>) => {
    try {
      if (!videoData.title || !videoData.url) {
        showToast('Título e URL são obrigatórios', 'error');
        return;
      }

      try {
        new URL(videoData.url);
      } catch {
        showToast('URL inválida', 'error');
        return;
      }

      const now = new Date().toISOString();
      const newVideo: Video = {
        id: generateId(),
        title: sanitizeInput(videoData.title),
        description: videoData.description ? sanitizeInput(videoData.description) : '',
        url: videoData.url,
        level: videoData.level || 'Branca',
        duration: videoData.duration || '00:00',
        views: 0,
        createdAt: now,
        updatedAt: now
      };

      await firebaseService.saveVideo(newVideo);
      setVideos(prev => [...prev, newVideo]);
      
      showToast('Vídeo adicionado com sucesso!', 'success');
      setShowModal(false);
    } catch (error) {
      console.error('Error adding video:', error);
      showToast('Erro ao adicionar vídeo', 'error');
    }
  }, [firebaseService, showToast]);

  const deleteVideo = useCallback(async (id: string) => {
    try {
      await firebaseService.deleteVideo(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      showToast('Vídeo removido', 'info');
    } catch (error) {
      console.error('Error deleting video:', error);
      showToast('Erro ao remover vídeo', 'error');
    }
  }, [firebaseService, showToast]);

  // ============================================
  // ATTENDANCE MANAGEMENT
  // ============================================

  const markAttendance = useCallback(async (studentId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = attendances.find(
        a => a.studentId === studentId && a.date === today
      );

      if (existing) {
        showToast('Presença já registrada hoje!', 'warning');
        return;
      }

      const now = new Date();
      const hour = now.getHours();

      if (hour < 6 || hour > 23) {
        showToast('Horário inválido para registro (6h-23h)', 'warning');
        return;
      }

      const student = students.find(s => s.id === studentId);
      if (!student) {
        showToast('Aluno não encontrado', 'error');
        return;
      }

      const newAttendance: Attendance = {
        id: generateId(),
        studentId,
        studentName: student.name,
        date: today,
        timestamp: now.toISOString(),
        notes: ''
      };

      await firebaseService.saveAttendance(newAttendance);
      setAttendances(prev => [...prev, newAttendance]);

      const updatedStudent = {
        ...student,
        totalAttendances: student.totalAttendances + 1,
        updatedAt: now.toISOString()
      };
      
      await firebaseService.saveStudent(updatedStudent);
      setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));

      showToast('Presença confirmada!', 'success');
    } catch (error) {
      console.error('Error marking attendance:', error);
      showToast('Erro ao registrar presença', 'error');
    }
  }, [attendances, students, firebaseService, showToast]);

  // ============================================
  // TRANSACTION MANAGEMENT
  // ============================================

  const addTransaction = useCallback(async (transactionData: Partial<Transaction>) => {
    try {
      if (!transactionData.amount || transactionData.amount <= 0) {
        showToast('Valor deve ser maior que zero', 'error');
        return;
      }

      if (!transactionData.description) {
        showToast('Descrição é obrigatória', 'error');
        return;
      }

      const now = new Date().toISOString();
      const student = transactionData.studentId 
        ? students.find(s => s.id === transactionData.studentId)
        : undefined;

      const newTransaction: Transaction = {
        id: generateId(),
        type: transactionData.type || 'revenue',
        amount: transactionData.amount,
        description: sanitizeInput(transactionData.description),
        category: transactionData.category || 'Outros',
        paymentMethod: transactionData.paymentMethod,
        studentId: transactionData.studentId,
        studentName: student?.name,
        createdAt: now,
        updatedAt: now
      };

      await firebaseService.saveTransaction(newTransaction);
      setTransactions(prev => [...prev, newTransaction]);

      if (newTransaction.type === 'revenue' && student) {
        const updatedStudent: Student = {
          ...student,
          paymentStatus: 'paid',
          lastPayment: now,
          nextPaymentDue: calculateNextPaymentDue(now),
          updatedAt: now
        };
        
        await firebaseService.saveStudent(updatedStudent);
        setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      }

      showToast('Transação registrada!', 'success');
      setShowModal(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      showToast('Erro ao registrar transação', 'error');
    }
  }, [students, firebaseService, showToast]);

  // ============================================
  // EXPORT TO CSV
  // ============================================

  const exportToCSV = useCallback(() => {
    try {
      const headers = ['Nome', 'Email', 'CPF', 'Telefone', 'Faixa', 'Status', 'Mensalidade', 'Último Pagamento', 'Próximo Vencimento'];
      const rows = students.map(s => [
        s.name,
        s.email,
        s.cpf || '',
        s.phone || '',
        s.belt,
        s.status,
        s.monthlyFee.toFixed(2),
        formatDate(s.lastPayment),
        formatDate(s.nextPaymentDue)
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alunos-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('Erro ao exportar dados', 'error');
    }
  }, [students, showToast]);

  // ============================================
  // STATISTICS
  // ============================================

  const getFinancialStats = useMemo((): FinancialStats => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const revenue = monthTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedRevenue = students
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.monthlyFee, 0);

    const revenueRate = expectedRevenue > 0 ? (revenue / expectedRevenue) * 100 : 0;

    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === lastMonth.getMonth() && tDate.getFullYear() === lastMonth.getFullYear();
    });

    const lastMonthRevenue = lastMonthTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      expectedRevenue,
      revenueRate,
      revenueGrowth
    };
  }, [transactions, students]);

  const getAttendanceStats = useMemo((): AttendanceStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = attendances.filter(a => a.date === today).length;

    const activeStudents = students.filter(s => s.status === 'active').length;
    const attendanceRate = activeStudents > 0 ? (todayCount / activeStudents) * 100 : 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthAttendances = attendances.filter(a => {
      const aDate = new Date(a.date);
      return aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear;
    });

    const avgMonthlyAttendance = activeStudents > 0 
      ? (monthAttendances.length / activeStudents).toFixed(1)
      : '0.0';

    return {
      todayCount,
      attendanceRate,
      avgMonthlyAttendance
    };
  }, [attendances, students]);

  // ============================================
  // FILTERED AND SORTED DATA
  // ============================================

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || student.paymentStatus === filterStatus;
      const matchesBelt = filterBelt === 'all' || student.belt === filterBelt;
      
      return matchesSearch && matchesStatus && matchesBelt;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? a.monthlyFee - b.monthlyFee
          : b.monthlyFee - a.monthlyFee;
      }
    });
  }, [students, searchTerm, filterStatus, filterBelt, sortBy, sortOrder]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // ============================================
  // LOGIN HANDLERS
  // ============================================

  const handleLogin = useCallback((email: string, password: string) => {
    if (email === 'admin@imperio.com' && password === 'admin123') {
      setIsAdmin(true);
      setActiveView('admin');
      showToast('Bem-vindo, Admin!', 'success');
    } else {
      const student = students.find(s => s.email === email);
      if (student) {
        setCurrentStudent(student);
        setActiveView('student');
        showToast(`Bem-vindo, ${student.name}!`, 'success');
      } else {
        showToast('Credenciais inválidas', 'error');
      }
    }
  }, [students, showToast]);

  const handleLogout = useCallback(() => {
    setActiveView('login');
    setCurrentStudent(null);
    setIsAdmin(false);
    showToast('Logout realizado', 'info');
  }, [showToast]);

  // ============================================
  // RENDER LOGIN VIEW
  // ============================================

  if (activeView === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
        
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
            <p className="text-gray-600 mt-2">Sistema de Gestão</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleLogin(
              formData.get('email') as string,
              formData.get('password') as string
            );
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Entrar
              </button>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Admin: admin@imperio.com / admin123
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER STUDENT VIEW
  // ============================================

  if (activeView === 'student' && currentStudent) {
    const studentVideos = videos.filter(v => v.level === currentStudent.belt);
    const studentAttendances = attendances
      .filter(a => a.studentId === currentStudent.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return (
      <div className="min-h-screen bg-gray-50">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
        
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentStudent.name}</h1>
                <p className="text-sm text-gray-600">Faixa {currentStudent.belt}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Status</span>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {currentStudent.status === 'active' ? 'Ativo' : 'Inativo'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Presenças</span>
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentStudent.totalAttendances}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Próximo Vencimento</span>
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatDate(currentStudent.nextPaymentDue)}
              </p>
            </div>
          </div>

          {/* Videos Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Vídeos - Faixa {currentStudent.belt}
              </h2>
            </div>

            {studentVideos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum vídeo disponível para sua faixa
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentVideos.map(video => (
                  <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{video.duration}</span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Assistir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance History */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Histórico de Presenças</h2>
            </div>

            {studentAttendances.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma presença registrada
              </p>
            ) : (
              <div className="space-y-2">
                {studentAttendances.map(attendance => (
                  <div key={attendance.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-900">{formatDate(attendance.date)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(attendance.timestamp).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER ADMIN VIEW
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}

      {isLoading && <LoadingSpinner fullScreen />}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
                <p className="text-sm text-gray-600">Painel Administrativo</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'students'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Alunos
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'videos'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Video className="w-4 h-4 inline mr-2" />
              Vídeos
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'financial'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              Financeiro
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Total de Alunos</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {students.filter(s => s.status === 'active').length} ativos
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Receita Mensal</span>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(getFinancialStats.revenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {getFinancialStats.revenueGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${
                    getFinancialStats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(getFinancialStats.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Presenças Hoje</span>
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {getAttendanceStats.todayCount}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getAttendanceStats.attendanceRate.toFixed(0)}% dos alunos
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Inadimplentes</span>
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {students.filter(s => s.paymentStatus === 'overdue').length}
                </p>
                <p className="text-sm text-gray-500 mt-1">Pagamentos atrasados</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  Presenças Recentes
                </h3>
                <div className="space-y-3">
                  {attendances
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5)
                    .map(attendance => (
                      <div key={attendance.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">{attendance.studentName}</p>
                            <p className="text-sm text-gray-500">{formatDate(attendance.date)}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(attendance.timestamp).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  Transações Recentes
                </h3>
                <div className="space-y-3">
                  {transactions
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          {transaction.type === 'revenue' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{transaction.category}</p>
                          </div>
                        </div>
                        <span className={`font-semibold ${
                          transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'revenue' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Filters and Actions */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar alunos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={filterBelt}
                    onChange={(e) => setFilterBelt(e.target.value as BeltLevel | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    <option value="all">Todas as Faixas</option>
                    <option value="Branca">Branca</option>
                    <option value="Azul">Azul</option>
                    <option value="Roxa">Roxa</option>
                    <option value="Marrom">Marrom</option>
                    <option value="Preta">Preta</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    <option value="all">Todos Status</option>
                    <option value="paid">Pago</option>
                    <option value="pending">Pendente</option>
                    <option value="overdue">Atrasado</option>
                  </select>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                  <button
                    onClick={exportToCSV}
                    className="flex-1 lg:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                  <button
                    onClick={() => {
                      setModalType('student');
                      setEditingItem(null);
                      setShowModal(true);
                    }}
                    className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Aluno
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aluno
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faixa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status Pagamento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mensalidade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Presenças
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-red-600 font-semibold">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {student.belt}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : student.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.paymentStatus === 'paid' ? 'Pago' : student.paymentStatus === 'pending' ? 'Pendente' : 'Atrasado'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(student.monthlyFee)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.totalAttendances}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => markAttendance(student.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Marcar presença"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setModalType('student');
                                setEditingItem(student);
                                setShowModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este aluno?')) {
                                  deleteStudent(student.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                        </span>{' '}
                        de <span className="font-medium">{filteredStudents.length}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-red-600 border-red-600 text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Vídeos</h2>
              <button
                onClick={() => {
                  setModalType('video');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Vídeo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(video => (
                <div key={video.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{video.title}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {video.level}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{video.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {video.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {video.views} visualizações
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-center rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Assistir
                      </a>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este vídeo?')) {
                            deleteVideo(video.id);
                          }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {videos.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum vídeo cadastrado</h3>
                <p className="text-gray-500">Adicione vídeos para seus alunos assistirem</p>
              </div>
            )}
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Financial Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Receita do Mês</span>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(getFinancialStats.revenue)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getFinancialStats.revenueRate.toFixed(0)}% da receita esperada
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Despesas do Mês</span>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(getFinancialStats.expenses)}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Lucro do Mês</span>
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(getFinancialStats.profit)}
                </p>
              </div>
            </div>

            {/* Transaction Actions */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setModalType('transaction');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Transação
              </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(transaction => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              {transaction.studentName && (
                                <div className="text-gray-500 text-xs">{transaction.studentName}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.category}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              transaction.type === 'revenue'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold">
                            <span className={transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'revenue' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                  firebaseService.deleteTransaction(transaction.id);
                                  setTransactions(prev => prev.filter(t => t.id !== transaction.id));
                                  showToast('Transação excluída', 'info');
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="p-12 text-center">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação registrada</h3>
                  <p className="text-gray-500">Adicione receitas e despesas para controlar suas finanças</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalType === 'student' && (editingItem ? 'Editar Aluno' : 'Novo Aluno')}
                  {modalType === 'video' && 'Novo Vídeo'}
                  {modalType === 'transaction' && 'Nova Transação'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Student Form */}
              {modalType === 'student' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    cpf: formData.get('cpf') as string,
                    phone: formData.get('phone') as string,
                    belt: formData.get('belt') as BeltLevel,
                    status: formData.get('status') as StudentStatus,
                    monthlyFee: parseFloat(formData.get('monthlyFee') as string)
                  };

                  if (editingItem) {
                    updateStudent((editingItem as Student).id, data);
                  } else {
                    addStudent(data);
                  }
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingItem ? (editingItem as Student).name : ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={editingItem ? (editingItem as Student).email : ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF
                        </label>
                        <input
                          type="text"
                          name="cpf"
                          defaultValue={editingItem ? (editingItem as Student).cpf : ''}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          defaultValue={editingItem ? (editingItem as Student).phone : ''}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Faixa *
                        </label>
                        <select
                          name="belt"
                          required
                          defaultValue={editingItem ? (editingItem as Student).belt : 'Branca'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        >
                          <option value="Branca">Branca</option>
                          <option value="Azul">Azul</option>
                          <option value="Roxa">Roxa</option>
                          <option value="Marrom">Marrom</option>
                          <option value="Preta">Preta</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status *
                        </label>
                        <select
                          name="status"
                          required
                          defaultValue={editingItem ? (editingItem as Student).status : 'active'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                          <option value="suspended">Suspenso</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mensalidade (R$) *
                      </label>
                      <input
                        type="number"
                        name="monthlyFee"
                        required
                        min="0"
                        step="0.01"
                        defaultValue={editingItem ? (editingItem as Student).monthlyFee : ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingItem(null);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {editingItem ? 'Atualizar' : 'Cadastrar'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Video Form */}
              {modalType === 'video' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addVideo({
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    url: formData.get('url') as string,
                    level: formData.get('level') as BeltLevel,
                    duration: formData.get('duration') as string
                  });
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título *
                      </label>
                      <input
                        type="text"
                        name="title"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL do Vídeo *
                      </label>
                      <input
                        type="url"
                        name="url"
                        required
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nível *
                        </label>
                        <select
                          name="level"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        >
                          <option value="Branca">Branca</option>
                          <option value="Azul">Azul</option>
                          <option value="Roxa">Roxa</option>
                          <option value="Marrom">Marrom</option>
                          <option value="Preta">Preta</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duração
                        </label>
                        <input
                          type="text"
                          name="duration"
                          placeholder="00:00"
                          defaultValue="00:00"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Transaction Form */}
              {modalType === 'transaction' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addTransaction({
                    type: formData.get('type') as TransactionType,
                    amount: parseFloat(formData.get('amount') as string),
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    paymentMethod: formData.get('paymentMethod') as PaymentMethod,
                    studentId: formData.get('studentId') as string || undefined
                  });
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo *
                      </label>
                      <select
                        name="type"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        <option value="revenue">Receita</option>
                        <option value="expense">Despesa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição *
                      </label>
                      <input
                        type="text"
                        name="description"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categoria *
                        </label>
                        <input
                          type="text"
                          name="category"
                          required
                          placeholder="Ex: Mensalidade, Equipamento..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Método de Pagamento
                        </label>
                        <select
                          name="paymentMethod"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        >
                          <option value="cash">Dinheiro</option>
                          <option value="credit">Cartão de Crédito</option>
                          <option value="debit">Cartão de Débito</option>
                          <option value="pix">PIX</option>
                          <option value="transfer">Transferência</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aluno (opcional)
                      </label>
<select
                        name="studentId"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      >
                        <option value="">Selecione um aluno</option>
                        {students
                          .filter(s => s.status === 'active')
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Registrar
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImperioJiuJitsu;