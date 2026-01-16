'use client'
import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, Video, Plus, Search, X, Edit2, TrendingUp, TrendingDown, BarChart3, Clock, CheckCircle2, XCircle, AlertTriangle, LogIn, UserCheck, Circle, ChevronDown, ChevronUp } from 'lucide-react';

const ImperioJiuJitsuSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userType, setUserType] = useState('admin');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [videos, setVideos] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const studentsData = await window.storage.get('students');
      const videosData = await window.storage.get('videos');
      const attendancesData = await window.storage.get('attendances');
      const transactionsData = await window.storage.get('transactions');
      
      if (studentsData) setStudents(JSON.parse(studentsData.value));
      if (videosData) setVideos(JSON.parse(videosData.value));
      if (attendancesData) setAttendances(JSON.parse(attendancesData.value));
      if (transactionsData) setTransactions(JSON.parse(transactionsData.value));
    } catch (error) {
      console.log('Iniciando com dados vazios');
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
      paymentStatus: 'paid',
      lastPayment: new Date().toISOString()
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    saveData('students', updated);
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
      views: 0
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
    alert('Presença registrada com sucesso!');
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
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      expectedRevenue,
      revenueRate: expectedRevenue > 0 ? (revenue / expectedRevenue) * 100 : 0
    };
  };

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.paymentStatus === 'paid').length,
    pendingPayments: students.filter(s => s.paymentStatus === 'pending').length,
    overduePayments: students.filter(s => s.paymentStatus === 'overdue').length,
    attendanceToday: attendances.filter(a => a.date === new Date().toISOString().split('T')[0]).length,
    attendanceRate: students.length > 0 ? 
      (attendances.filter(a => a.date === new Date().toISOString().split('T')[0]).length / students.length) * 100 : 0,
    ...getFinancialStats()
  };

  const StudentForm = ({ student, onSave, onClose }) => {
    const [formData, setFormData] = useState(student || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      belt: 'Branca',
      monthlyFee: 150,
      paymentStatus: 'paid'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`
      });
      onClose();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Nome</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Sobrenome</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Telefone</label>
            <input
              type="tel"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Faixa</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.belt}
              onChange={(e) => setFormData({...formData, belt: e.target.value})}
            >
              <option>Branca</option>
              <option>Azul</option>
              <option>Roxa</option>
              <option>Marrom</option>
              <option>Preta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Mensalidade (R$)</label>
            <input
              type="number"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.monthlyFee}
              onChange={(e) => setFormData({...formData, monthlyFee: parseFloat(e.target.value)})}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
            Salvar
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-900 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium">
            Cancelar
          </button>
        </div>
      </form>
    );
  };

  const TransactionForm = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState({
      type: 'revenue',
      category: 'Mensalidade',
      amount: 0,
      description: '',
      studentId: null
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
      onClose();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Tipo</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="revenue">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            {formData.type === 'revenue' ? (
              <>
                <option>Mensalidade</option>
                <option>Matrícula</option>
                <option>Evento</option>
                <option>Produto</option>
                <option>Outros</option>
              </>
            ) : (
              <>
                <option>Aluguel</option>
                <option>Equipamentos</option>
                <option>Água/Luz</option>
                <option>Marketing</option>
                <option>Manutenção</option>
                <option>Outros</option>
              </>
            )}
          </select>
        </div>
        {formData.type === 'revenue' && formData.category === 'Mensalidade' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">Aluno</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.studentId || ''}
              onChange={(e) => setFormData({...formData, studentId: parseInt(e.target.value)})}
            >
              <option value="">Selecione um aluno</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Valor (R$)</label>
          <input
            type="number"
            required
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Descrição</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
            Adicionar
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-900 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium">
            Cancelar
          </button>
        </div>
      </form>
    );
  };

  const getBeltColor = (belt) => {
    const colors = {
      'Branca': 'bg-gray-100 text-gray-800 border border-gray-300',
      'Azul': 'bg-blue-50 text-blue-800 border border-blue-200',
      'Roxa': 'bg-purple-50 text-purple-800 border border-purple-200',
      'Marrom': 'bg-amber-50 text-amber-800 border border-amber-200',
      'Preta': 'bg-gray-800 text-white border border-gray-900'
    };
    return colors[belt] || colors['Branca'];
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'paid': 'bg-green-50 text-green-800 border border-green-200',
      'pending': 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      'overdue': 'bg-red-50 text-red-800 border border-red-200'
    };
    return colors[status] || colors['pending'];
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Área do Aluno
  if (userType === 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-white">IJ</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Área do Aluno</h1>
                  <p className="text-xs sm:text-sm text-red-100 hidden sm:block">Bem-vindo, {currentStudent?.name || 'Aluno'}</p>
                </div>
              </div>
              <button
                onClick={() => setUserType('admin')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-white/20 transition-colors text-xs sm:text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Marcar Presença</h3>
              <p className="text-sm text-gray-600 mb-3 sm:mb-4">Clique no botão abaixo para registrar sua presença de hoje</p>
              <button
                onClick={() => currentStudent && markAttendance(currentStudent.id)}
                className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Confirmar Presença
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Minha Frequência</h3>
              <div className="space-y-2">
                {currentStudent && attendances
                  .filter(a => a.studentId === currentStudent.id)
                  .slice(-5)
                  .reverse()
                  .map(att => (
                    <div key={att.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                      <span className="text-gray-700 font-medium">{new Date(att.date).toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(att.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Vídeos de Treinamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base line-clamp-2">{video.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">{video.category}</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-red-600 text-white text-center py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Assistir
                  </a>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Área Administrativa
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg backdrop-blur-sm flex-shrink-0">
                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">IJ</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">Império Jiu-Jitsu</h1>
                <p className="text-xs sm:text-sm text-red-100 hidden sm:block">Sistema de Gestão</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUserType('student');
                setCurrentStudent(students[0]);
              }}
              className="flex items-center gap-1.5 sm:gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg border border-white/20 transition-colors text-xs sm:text-sm font-medium"
            >
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Área do Aluno</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-14 sm:top-16 md:top-20 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'students', label: 'Alunos', icon: Users },
              { id: 'financial', label: 'Financeiro', icon: DollarSign },
              { id: 'attendance', label: 'Frequência', icon: Calendar },
              { id: 'videos', label: 'Vídeos', icon: Video }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm md:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Alunos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
                  </div>
                  <div className="bg-red-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-green-600 font-medium">{stats.activeStudents} ativos</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Mensal</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">R$ {stats.revenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-gray-600">{stats.revenueRate.toFixed(0)}% da meta</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Lucro Líquido</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">R$ {stats.profit.toFixed(2)}</p>
                  </div>
                  <div className="bg-black/5 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-gray-600">Despesas: R$ {stats.expenses.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Presença Hoje</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.attendanceToday}</p>
                  </div>
                  <div className="bg-blue-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-gray-600">{stats.attendanceRate.toFixed(0)}% taxa</span>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {(stats.pendingPayments > 0 || stats.overduePayments > 0) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Alertas de Pagamento
                </h3>
                <div className="space-y-2">
                  {stats.pendingPayments > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <Clock className="w-4 h-4" />
                      <span>{stats.pendingPayments} pagamento{stats.pendingPayments > 1 ? 's' : ''} pendente{stats.pendingPayments > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {stats.overduePayments > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                      <XCircle className="w-4 h-4" />
                      <span>{stats.overduePayments} pagamento{stats.overduePayments > 1 ? 's' : ''} atrasado{stats.overduePayments > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar alunos..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  setModalType('student');
                  setEditingItem(null);
                  setShowModal(true);
                }}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Novo Aluno
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Faixa</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Mensalidade</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500 md:hidden">{student.email}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{student.email}</td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getBeltColor(student.belt)}`}>
                            {student.belt}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(student.paymentStatus)}`}>
                            {student.paymentStatus === 'paid' ? 'Pago' : student.paymentStatus === 'pending' ? 'Pendente' : 'Atrasado'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">R$ {student.monthlyFee?.toFixed(2)}</td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(student);
                                setModalType('student');
                                setShowModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este aluno?')) {
                                  deleteStudent(student.id);
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setModalType('transaction');
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-red-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Nova Transação
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Descrição</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.slice().reverse().map(transaction => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                          {new Date(transaction.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'revenue' 
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {transaction.type === 'revenue' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">{transaction.category}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{transaction.description}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-right">
                          <span className={transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'revenue' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.slice().reverse().map(attendance => {
                    const student = students.find(s => s.id === attendance.studentId);
                    return (
                      <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{student?.name}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                          {new Date(attendance.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                          {new Date(attendance.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setModalType('video');
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-red-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Novo Vídeo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {videos.map(video => (
                <div key={video.id} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2 text-base">{video.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{video.category}</p>
                  <div className="flex gap-2">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-red-600 text-white text-center py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Assistir
                    </a>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este vídeo?')) {
                          deleteVideo(video.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalType === 'student' ? (editingItem ? 'Editar Aluno' : 'Novo Aluno') :
                 modalType === 'transaction' ? 'Nova Transação' :
                 'Novo Vídeo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {modalType === 'student' && (
                <StudentForm
                  student={editingItem}
                  onSave={(student) => {
                    if (editingItem) {
                      updateStudent(editingItem.id, student);
                    } else {
                      addStudent(student);
                    }
                  }}
                  onClose={() => setShowModal(false)}
                />
              )}
              {modalType === 'transaction' && (
                <TransactionForm
                  onSave={addTransaction}
                  onClose={() => setShowModal(false)}
                />
              )}
              {modalType === 'video' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  addVideo({
                    title: formData.get('title'),
                    category: formData.get('category'),
                    url: formData.get('url')
                  });
                  setShowModal(false);
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">Título</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
                    <select
                      name="category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option>Técnicas Básicas</option>
                      <option>Técnicas Avançadas</option>
                      <option>Posições</option>
                      <option>Finalizações</option>
                      <option>Defesas</option>
                      <option>Condicionamento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">URL do Vídeo</label>
                    <input
                      type="url"
                      name="url"
                      required
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium">
                      Adicionar
                    </button>
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-900 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                      Cancelar
                    </button>
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

export default ImperioJiuJitsuSystem;