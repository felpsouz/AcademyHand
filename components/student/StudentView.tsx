// components/student/StudentView.tsx - VERSÃO CORRIGIDA - VÍDEOS PARA TODOS

'use client'

import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, CheckCircle2, Calendar, Video, 
  Clock, PlayCircle, History, CheckCircle, DollarSign,
  AlertCircle, CalendarCheck, FileText
} from 'lucide-react';
import { db } from '@/services/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';

interface StudentViewProps {
  userId: string;
  onLogout: () => void;
}

interface StudentData {
  name: string;
  email: string;
  belt: string;
  status: string;
  monthlyFee: number;
  dueDate: number;
}

interface Invoice {
  id: string;
  month: string;
  year: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  pixKey?: string;
  description?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  confirmed: boolean;
}

interface VideoData {
  id: string;
  title: string;
  duration: string;
  url: string;
  description?: string;
}

export const StudentView: React.FC<StudentViewProps> = ({ userId, onLogout }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingAttendance, setConfirmingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'attendance' | 'videos'>('overview');

  useEffect(() => {
    if (!userId) {
      console.error('userId não fornecido');
      setLoading(false);
      return;
    }
    loadStudentData();
    loadInvoices();
    loadAttendance();
    loadVideos(); // ✅ Carrega vídeos junto com os outros dados
  }, [userId]);

  const loadStudentData = async () => {
    if (!userId) return;
    
    try {
      const studentDoc = await getDoc(doc(db, 'students', userId));
      if (studentDoc.exists()) {
        const data = studentDoc.data() as StudentData;
        console.log('📋 Dados do aluno carregados:', data);
        setStudentData(data);
      } else {
        console.error('Documento do aluno não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
    }
  };

  const loadInvoices = async () => {
    if (!userId) return;
    
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef, 
        where('studentId', '==', userId),
        orderBy('year', 'desc'),
        orderBy('month', 'desc'),
        limit(12)
      );
      const snapshot = await getDocs(q);
      const invoicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    }
  };

  const loadAttendance = async () => {
    if (!userId) return;
    
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('studentId', '==', userId),
        orderBy('date', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Erro ao carregar presenças:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      console.log('🔍 Buscando todos os vídeos');
      
      const videosRef = collection(db, 'videos');
      // ✅ REMOVIDO O FILTRO POR FAIXA - busca todos os vídeos
      const q = query(
        videosRef,
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      console.log('📊 Total de vídeos encontrados:', snapshot.size);
      
      const videosData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          duration: data.duration 
            ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` 
            : '00:00',
          url: data.url,
          description: data.description || '',
        };
      }) as VideoData[];
      
      console.log('✅ Vídeos carregados:', videosData);
      setVideos(videosData);
    } catch (error) {
      console.error('❌ Erro ao carregar vídeos:', error);
    }
  };

  const confirmAttendance = async () => {
    if (!userId || !studentData) return;
    
    try {
      setConfirmingAttendance(true);
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR');
      const timeStr = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await addDoc(collection(db, 'attendance'), {
        studentId: userId,
        studentName: studentData?.name,
        date: dateStr,
        time: timeStr,
        confirmed: true,
        createdAt: new Date().toISOString()
      });

      await loadAttendance();
      alert('Presença confirmada com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      alert('Erro ao confirmar presença. Tente novamente.');
    } finally {
      setConfirmingAttendance(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMonthName = (month: string) => {
    const months = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    return months[month as keyof typeof months] || month;
  };

  const totalAttendanceThisMonth = attendance.filter(record => {
    const recordDate = new Date(record.date.split('/').reverse().join('-'));
    const now = new Date();
    return recordDate.getMonth() === now.getMonth() && 
           recordDate.getFullYear() === now.getFullYear();
  }).length;

  const nextInvoice = invoices.find(inv => inv.status === 'pending' || inv.status === 'overdue');
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userId || !studentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {!userId ? 'Sessão inválida' : 'Dados do aluno não encontrados'}
          </p>
          <button
            onClick={onLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{studentData.name}</h1>
              <p className="text-sm text-gray-600">Faixa {studentData.belt}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {overdueCount} {overdueCount === 1 ? 'fatura atrasada' : 'faturas atrasadas'}
                </span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navegação por Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Visão Geral', icon: Activity },
              { id: 'invoices', label: 'Minhas Faturas', icon: DollarSign },
              { id: 'attendance', label: 'Presenças', icon: CheckCircle2 },
              { id: 'videos', label: 'Vídeos', icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Status</span>
                  <Activity className={`w-5 h-5 ${
                    studentData.status === 'active' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {studentData.status === 'active' ? 'Ativo' : 'Inativo'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Presenças</span>
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{attendance.length}</p>
                <p className="text-sm text-gray-500 mt-1">Este mês: {totalAttendanceThisMonth} presenças</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Próximo Vencimento</span>
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                {nextInvoice ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{nextInvoice.dueDate}</p>
                    <p className={`text-sm mt-1 ${
                      nextInvoice.status === 'paid' ? 'text-green-600' : 
                      nextInvoice.status === 'overdue' ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      Status: {getStatusText(nextInvoice.status)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma fatura pendente</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <button
                onClick={confirmAttendance}
                disabled={confirmingAttendance}
                className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarCheck className="w-5 h-5" />
                {confirmingAttendance ? 'Confirmando...' : 'Confirmar Presença Hoje'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <div className="text-sm text-gray-500 mb-1">Faturas Pagas</div>
                <div className="text-2xl font-bold text-green-600">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <div className="text-sm text-gray-500 mb-1">Pendentes</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                <div className="text-sm text-gray-500 mb-1">Atrasadas</div>
                <div className="text-2xl font-bold text-red-600">
                  {overdueCount}
                </div>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Você não possui faturas cadastradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                      invoice.status === 'paid'
                        ? 'border-green-500'
                        : invoice.status === 'overdue'
                        ? 'border-red-500'
                        : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {getMonthName(invoice.month)} / {invoice.year}
                          </h4>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>

                        {invoice.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {invoice.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Valor:</span>
                            <p className="font-semibold text-gray-900 text-lg">
                              {formatCurrency(invoice.amount)}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Vencimento:</span>
                            <p className="font-medium text-gray-900">
                              {invoice.dueDate}
                            </p>
                          </div>
                          
                          {invoice.status === 'paid' && invoice.paidAt && (
                            <div>
                              <span className="text-gray-500">Pagamento:</span>
                              <p className="font-medium text-green-700">
                                {invoice.paidAt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {invoice.status !== 'paid' && invoice.pixKey && (
                        <div className="md:w-64">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">
                              Pague com PIX:
                            </div>
                            <div className="font-mono text-sm text-blue-700 break-all">
                              {invoice.pixKey}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(invoice.pixKey || '');
                                alert('Chave PIX copiada!');
                              }}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Copiar chave
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {invoice.status === 'overdue' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">
                              Esta fatura está atrasada
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Por favor, regularize o pagamento o quanto antes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Histórico de Presenças</h2>
            </div>

            {attendance.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma presença registrada</p>
            ) : (
              <div className="space-y-2">
                {attendance.map(record => (
                  <div key={record.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-900">{record.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{record.time}</span>
                      {record.confirmed && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          Confirmada
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Vídeos Disponíveis
              </h2>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Nenhum vídeo disponível</p>
                <p className="text-sm text-gray-400">
                  Os vídeos serão adicionados em breve
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map(video => (
                  <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">{video.title}</h3>
                    </div>
                    
                    {video.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {video.duration}
                      </span>
                      <button 
                        onClick={() => window.open(video.url, '_blank')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Assistir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};