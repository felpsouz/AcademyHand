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
  beltLevel: string;
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
}

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  confirmed: boolean;
}

interface Video {
  id: string;
  title: string;
  level: string;
  duration: string;
  url: string;
}

export const StudentView: React.FC<StudentViewProps> = ({ userId, onLogout }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingAttendance, setConfirmingAttendance] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.error('userId não fornecido');
      setLoading(false);
      return;
    }
    loadStudentData();
    loadInvoices();
    loadAttendance();
  }, [userId]);

  useEffect(() => {
    if (studentData?.beltLevel) {
      loadVideos();
    }
  }, [studentData?.beltLevel]);

  const loadStudentData = async () => {
    if (!userId) return;
    
    try {
      const studentDoc = await getDoc(doc(db, 'students', userId));
      if (studentDoc.exists()) {
        const data = studentDoc.data() as StudentData;
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
    if (!studentData?.beltLevel) return;
    
    try {
      const videosRef = collection(db, 'videos');
      const q = query(
        videosRef,
        where('level', '==', studentData.beltLevel)
      );
      const snapshot = await getDocs(q);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Video[];
      setVideos(videosData);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
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

  const nextInvoice = invoices.find(inv => inv.status === 'pending');

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
              <p className="text-sm text-gray-600">Faixa {studentData.beltLevel}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                  nextInvoice.status === 'paid' ? 'text-green-600' : 'text-orange-600'
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Histórico de Faturas</h2>
            </div>

            {invoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma fatura encontrada</p>
            ) : (
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getMonthName(invoice.month)}/{invoice.year}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Vencimento: {invoice.dueDate}
                        </p>
                        {invoice.paidAt && (
                          <p className="text-sm text-green-600">
                            Pago em: {invoice.paidAt}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </span>
                      {invoice.status === 'pending' && (
                        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                          Ver Detalhes
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </div>

        {videos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Vídeos - Faixa {studentData.beltLevel}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map(video => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{video.title}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {video.level}
                    </span>
                  </div>
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
          </div>
        )}
      </main>
    </div>
  );
};