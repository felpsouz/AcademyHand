'use client'
import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Calendar, Video, Plus, Search, X, Edit2, TrendingUp, 
  TrendingDown, BarChart3, Clock, CheckCircle2, AlertTriangle, 
  LogIn, UserCheck, Menu, Bell, Award, Activity, Trash2,
  Home, PlayCircle
} from 'lucide-react';

const ImperioJiuJitsu = () => {
  const [activeView, setActiveView] = useState('admin');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [videos, setVideos] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, videosData, attendancesData, transactionsData] = await Promise.all([
        window.storage.get('students').catch(() => null),
        window.storage.get('videos').catch(() => null),
        window.storage.get('attendances').catch(() => null),
        window.storage.get('transactions').catch(() => null)
      ]);
      
      if (studentsData) setStudents(JSON.parse(studentsData.value));
      if (videosData) setVideos(JSON.parse(videosData.value));
      if (attendancesData) setAttendances(JSON.parse(attendancesData.value));
      if (transactionsData) setTransactions(JSON.parse(transactionsData.value));
    } catch (error) {
      console.log('Iniciando sistema...');
    }
  };

  const saveData = async (type, data) => {
    try {
      await window.storage.set(type, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const addStudent = (student) => {
    const newStudent = {
      id: Date.now(),
      ...student,
      createdAt: new Date().toISOString(),
      status: student.status || 'active',
      paymentStatus: 'paid',
      lastPayment: new Date().toISOString(),
      totalAttendances: 0
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    saveData('students', updated);

    // Adicionar mensalidade como receita automaticamente
    if (student.monthlyFee && student.monthlyFee > 0) {
      const newTransaction = {
        id: Date.now() + 1,
        type: 'revenue',
        amount: student.monthlyFee,
        description: `Matrícula - ${student.name}`,
        category: 'Matrícula',
        studentId: newStudent.id,
        createdAt: new Date().toISOString()
      };
      const updatedTransactions = [...transactions, newTransaction];
      setTransactions(updatedTransactions);
      saveData('transactions', updatedTransactions);
    }
  };

  const updateStudent = (id, updates) => {
    const updated = students.map(s => s.id === id ? { ...s, ...updates } : s);
    setStudents(updated);
    saveData('students', updated);
  };

  const deleteStudent = (id) => {
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    saveData('students', updated);
  };

  const addVideo = (video) => {
    const newVideo = {
      id: Date.now(),
      ...video,
      createdAt: new Date().toISOString(),
      views: 0,
      duration: video.duration || '00:00'
    };
    const updated = [...videos, newVideo];
    setVideos(updated);
    saveData('videos', updated);
  };

  const deleteVideo = (id) => {
    const updated = videos.filter(v => v.id !== id);
    setVideos(updated);
    saveData('videos', updated);
  };

  const markAttendance = (studentId) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendances.find(a => a.studentId === studentId && a.date === today);
    
    if (existing) {
      alert('Presença já registrada hoje!');
      return;
    }

    const newAttendance = {
      id: Date.now(),
      studentId,
      date: today,
      timestamp: new Date().toISOString()
    };
    const updated = [...attendances, newAttendance];
    setAttendances(updated);
    saveData('attendances', updated);

    const student = students.find(s => s.id === studentId);
    if (student) {
      updateStudent(studentId, { totalAttendances: (student.totalAttendances || 0) + 1 });
    }
  };

  const addTransaction = (transaction) => {
    const newTransaction = {
      id: Date.now(),
      ...transaction,
      createdAt: new Date().toISOString()
    };
    const updated = [...transactions, newTransaction];
    setTransactions(updated);
    saveData('transactions', updated);

    if (transaction.studentId && transaction.type === 'revenue') {
      updateStudent(transaction.studentId, {
        paymentStatus: 'paid',
        lastPayment: new Date().toISOString()
      });
    }
  };

  const getFinancialStats = () => {
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
      .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === lastMonth.getMonth() && tDate.getFullYear() === lastMonth.getFullYear();
    });

    const lastMonthRevenue = lastMonthTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueGrowth = lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      expectedRevenue,
      revenueRate: expectedRevenue > 0 ? (revenue / expectedRevenue) * 100 : 0,
      revenueGrowth
    };
  };

  const getAttendanceStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayAttendances = attendances.filter(a => a.date === today);
    const last30DaysAttendances = attendances.filter(a => a.date >= last30Days);
    
    const attendanceRate = students.length > 0 ? (todayAttendances.length / students.length) * 100 : 0;
    const avgMonthlyAttendance = students.length > 0 ? last30DaysAttendances.length / students.length : 0;

    return {
      todayCount: todayAttendances.length,
      attendanceRate,
      avgMonthlyAttendance: avgMonthlyAttendance.toFixed(1)
    };
  };

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.status === 'active').length,
    pendingPayments: students.filter(s => s.paymentStatus === 'pending').length,
    overduePayments: students.filter(s => s.paymentStatus === 'overdue').length,
    ...getFinancialStats(),
    ...getAttendanceStats()
  };

  const getBeltColor = (belt) => {
    const colors = {
      'Branca': 'bg-gray-50 text-gray-700 border-gray-300',
      'Azul': 'bg-blue-50 text-blue-700 border-blue-300',
      'Roxa': 'bg-purple-50 text-purple-700 border-purple-300',
      'Marrom': 'bg-amber-50 text-amber-700 border-amber-300',
      'Preta': 'bg-gray-900 text-white border-gray-900'
    };
    return colors[belt] || colors['Branca'];
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'inactive': 'bg-gray-50 text-gray-700 border-gray-200',
      'suspended': 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[status] || colors['active'];
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'overdue': 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[status] || colors['pending'];
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || s.paymentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Student Area Component
  const StudentArea = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">Império Jiu-Jitsu</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Área do Aluno</p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('admin')}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0 ml-2"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Bem-vindo, {currentStudent?.name || 'Aluno'}!</h2>
              <p className="text-red-100 mb-3 sm:mb-4 text-sm sm:text-base">Faixa {currentStudent?.belt || 'Branca'}</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-words">Membro desde {currentStudent?.createdAt ? new Date(currentStudent.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{currentStudent?.totalAttendances || 0} treinos</span>
                </div>
              </div>
            </div>
            <Award className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 opacity-20 hidden sm:block" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Registrar Presença</h3>
            </div>
            <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">Marque sua presença no treino de hoje</p>
            <button
              onClick={() => currentStudent && markAttendance(currentStudent.id)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Confirmar Presença
            </button>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="bg-blue-50 p-2 sm:p-3 rounded-xl flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Minha Performance</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Frequência mensal</span>
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  {currentStudent ? attendances.filter(a => a.studentId === currentStudent.id && 
                    new Date(a.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length : 0} dias
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Total de treinos</span>
                <span className="text-base sm:text-lg font-bold text-gray-900">{currentStudent?.totalAttendances || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 lg:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Histórico de Presenças</h3>
          </div>
          <div className="p-3 sm:p-6">
            <div className="space-y-2">
              {currentStudent && attendances
                .filter(a => a.studentId === currentStudent.id)
                .slice(-10)
                .reverse()
                .map(att => (
                  <div key={att.id} className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="bg-emerald-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{new Date(att.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p className="text-xs text-gray-500">{new Date(att.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              {(!currentStudent || attendances.filter(a => a.studentId === currentStudent.id).length === 0) && (
                <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">Nenhuma presença registrada ainda</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Biblioteca de Treinamento</h3>
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {videos.map(video => (
                <div key={video.id} className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-all border border-gray-200">
                  <div className="aspect-video bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm sm:text-base">{video.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{video.category}</p>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-red-600 hover:bg-red-700 text-white text-center py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium"
                    >
                      Assistir Agora
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // Admin Dashboard Component
  const AdminDashboard = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-blue-50 p-2 sm:p-3 rounded-xl">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              {stats.activeStudents} ativos
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stats.totalStudents}</h3>
          <p className="text-xs sm:text-sm text-gray-600">Total de Alunos</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <span className={`text-xs font-medium ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">R$ {stats.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <p className="text-xs sm:text-sm text-gray-600">Receita Mensal</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-purple-50 p-2 sm:p-3 rounded-xl">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              {stats.revenueRate.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">R$ {stats.profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <p className="text-xs sm:text-sm text-gray-600">Lucro Líquido</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="bg-orange-50 p-2 sm:p-3 rounded-xl">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              {stats.attendanceRate.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stats.todayCount}</h3>
          <p className="text-xs sm:text-sm text-gray-600">Presenças Hoje</p>
        </div>
      </div>

      {(stats.pendingPayments > 0 || stats.overduePayments > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-red-50 border border-amber-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Alertas de Pagamento</h3>
              <div className="space-y-2">
                {stats.pendingPayments > 0 && (
                  <p className="text-xs sm:text-sm text-gray-700">
                    <span className="font-semibold">{stats.pendingPayments}</span> pagamento{stats.pendingPayments > 1 ? 's' : ''} pendente{stats.pendingPayments > 1 ? 's' : ''}
                  </p>
                )}
                {stats.overduePayments > 0 && (
                  <p className="text-xs sm:text-sm text-red-700">
                    <span className="font-semibold">{stats.overduePayments}</span> pagamento{stats.overduePayments > 1 ? 's' : ''} atrasado{stats.overduePayments > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Students Management Component
  const StudentsManagement = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciamento de Alunos</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gerencie todos os alunos da academia</p>
        </div>
        <button
          onClick={() => {
            setModalType('addStudent');
            setEditingItem(null);
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors shadow-lg text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Aluno
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Atrasados</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Faixa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Mensalidade</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBeltColor(student.belt)}`}>
                      {student.belt}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(student.status)}`}>
                      {student.status === 'active' ? 'Ativo' : student.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(student.paymentStatus)}`}>
                      {student.paymentStatus === 'paid' ? 'Pago' : student.paymentStatus === 'pending' ? 'Pendente' : 'Atrasado'}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <p className="text-sm font-medium text-gray-900">R$ {student.monthlyFee?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(student);
                          setModalType('editStudent');
                          setShowModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Deseja realmente excluir este aluno?')) {
                            deleteStudent(student.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum aluno encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Financial Component
  const Financial = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financeiro</h2>
          <p className="text-gray-600 mt-1">Gerencie receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            setModalType('addTransaction');
            setEditingItem(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Este mês</span>
          </div>
          <h3 className="text-3xl font-bold mb-2">R$ {stats.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <p className="text-emerald-100">Total de Receitas</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Este mês</span>
          </div>
          <h3 className="text-3xl font-bold mb-2">R$ {stats.expenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <p className="text-red-100">Total de Despesas</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Lucro</span>
          </div>
          <h3 className="text-3xl font-bold mb-2">R$ {stats.profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <p className="text-blue-100">Saldo do Mês</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transações Recentes</h3>
        <div className="space-y-3">
          {transactions.slice(-10).reverse().map(transaction => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${transaction.type === 'revenue' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {transaction.type === 'revenue' ? (
                    <TrendingUp className={`w-5 h-5 ${transaction.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}`} />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.category} • {new Date(transaction.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <p className={`text-lg font-bold ${transaction.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}`}>
                {transaction.type === 'revenue' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma transação registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Videos Component
  const Videos = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Vídeos</h2>
          <p className="text-gray-600 mt-1">Gerencie o conteúdo de treinamento</p>
        </div>
        <button
          onClick={() => {
            setModalType('addVideo');
            setEditingItem(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Vídeo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
            <div className="aspect-video bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-white opacity-80" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{video.category}</p>
              <div className="flex items-center justify-between">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Assistir →
                </a>
                <button
                  onClick={() => {
                    if (confirm('Deseja realmente excluir este vídeo?')) {
                      deleteVideo(video.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum vídeo cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );

  // Modal Component
  const Modal = () => {
    const [formData, setFormData] = useState(editingItem || {});

    const handleSubmit = (e) => {
      e.preventDefault();
      if (modalType === 'addStudent' || modalType === 'editStudent') {
        if (editingItem) {
          updateStudent(editingItem.id, formData);
        } else {
          addStudent(formData);
        }
      } else if (modalType === 'addVideo') {
        addVideo(formData);
      } else if (modalType === 'addTransaction') {
        addTransaction(formData);
      }
      setShowModal(false);
      setFormData({});
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <h3 className="text-xl font-bold text-gray-900">
              {modalType === 'addStudent' && 'Novo Aluno'}
              {modalType === 'editStudent' && 'Editar Aluno'}
              {modalType === 'addVideo' && 'Novo Vídeo'}
              {modalType === 'addTransaction' && 'Nova Transação'}
            </h3>
            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {(modalType === 'addStudent' || modalType === 'editStudent') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faixa</label>
                  <select
                    required
                    value={formData.belt || 'Branca'}
                    onChange={(e) => setFormData({...formData, belt: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="Branca">Branca</option>
                    <option value="Azul">Azul</option>
                    <option value="Roxa">Roxa</option>
                    <option value="Marrom">Marrom</option>
                    <option value="Preta">Preta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthlyFee || ''}
                    onChange={(e) => setFormData({...formData, monthlyFee: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>
              </>
            )}

            {modalType === 'addVideo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL do Vídeo</label>
                  <input
                    type="url"
                    required
                    value={formData.url || ''}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <input
                    type="text"
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Técnicas de Guarda, Finalizações, etc."
                  />
                </div>
              </>
            )}

            {modalType === 'addTransaction' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    required
                    value={formData.type || 'revenue'}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="revenue">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input
                    type="text"
                    required
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <input
                    type="text"
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                {formData.type === 'revenue' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aluno (opcional)</label>
                    <select
                      value={formData.studentId || ''}
                      onChange={(e) => setFormData({...formData, studentId: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Selecione um aluno</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {editingItem ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Main Render
  if (activeView === 'student') {
    return <StudentArea />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-xl shadow-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
                  <p className="text-sm text-gray-500">Painel Administrativo</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveView('student');
                setCurrentStudent(students[0]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              <UserCheck className="w-4 h-4" />
              Área do Aluno
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 bg-white border-r border-gray-200 min-h-screen p-4`}>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'students' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Alunos</span>
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'financial' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Financeiro</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'videos' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">Vídeos</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'students' && <StudentsManagement />}
          {activeTab === 'financial' && <Financial />}
          {activeTab === 'videos' && <Videos />}
        </main>
      </div>

      {showModal && <Modal />}
    </div>
  );
};

export default ImperioJiuJitsu;