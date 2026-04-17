'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Student, BeltLevel, StudentStatus } from '@/types';
import { PlanKey, Periodicidade, PLANS } from '@/lib/plans';
import { useToast } from '@/hooks/useToast';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore';
import { CreditCard, Copy, CheckCircle, Camera, X, User, CalendarDays } from 'lucide-react';

interface StudentFormProps {
  student?: Student | null;
  onSuccess: () => void;
}

const planColors: Record<PlanKey, string> = {
  gi:       'border-blue-300 bg-blue-50 text-blue-700',
  nogi:     'border-violet-300 bg-violet-50 text-violet-700',
  completo: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  kids:     'border-green-300 bg-green-50 text-green-700',
};

const planSelectedColors: Record<PlanKey, string> = {
  gi:       'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
  nogi:     'border-violet-500 bg-violet-100 ring-2 ring-violet-400',
  completo: 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-400',
  kids:     'border-green-500 bg-green-100 ring-2 ring-green-400',
};

const periodicidades: Periodicidade[] = ['mensal', 'trimestral', 'semestral', 'anual'];

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Belt colors for visual stripe
const beltColors: Record<string, string> = {
  'Branca':          'bg-white border border-gray-300',
  'Azul':            'bg-blue-500',
  'Roxa':            'bg-purple-600',
  'Marrom':          'bg-amber-800',
  'Preta':           'bg-gray-900',
  'Branca (Kids)':   'bg-white border border-gray-300',
  'Cinza-Branca':    'bg-gradient-to-r from-gray-400 to-white',
  'Cinza':           'bg-gray-400',
  'Cinza-Preta':     'bg-gradient-to-r from-gray-400 to-gray-900',
  'Amarela-Branca':  'bg-gradient-to-r from-yellow-400 to-white',
  'Amarela':         'bg-yellow-400',
  'Amarela-Preta':   'bg-gradient-to-r from-yellow-400 to-gray-900',
  'Laranja-Branca':  'bg-gradient-to-r from-orange-500 to-white',
  'Laranja':         'bg-orange-500',
  'Laranja-Preta':   'bg-gradient-to-r from-orange-500 to-gray-900',
  'Verde-Branca':    'bg-gradient-to-r from-green-600 to-white',
  'Verde':           'bg-green-600',
  'Verde-Preta':     'bg-gradient-to-r from-green-600 to-gray-900',
};

const adultBelts = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const kidsBelts = [
  'Branca (Kids)',
  'Cinza-Branca', 'Cinza', 'Cinza-Preta',
  'Amarela-Branca', 'Amarela', 'Amarela-Preta',
  'Laranja-Branca', 'Laranja', 'Laranja-Preta',
  'Verde-Branca', 'Verde', 'Verde-Preta',
];

/**
 * Salva a foto localmente no dispositivo como `nome_id.ext`.
 * A foto NÃO vai ao banco de dados.
 */
async function savePhotoLocally(file: File, studentName: string, studentId: string): Promise<void> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = studentName.trim().replace(/\s+/g, '_').toLowerCase();
  const fileName = `${safeName}_${studentId}.${ext}`;

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isKids, setIsKids] = useState(false);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    belt: 'Branca' as BeltLevel,
    status: 'active' as StudentStatus,
    monthlyFee: 0,
  });

  const [selectedPlano, setSelectedPlano] = useState<PlanKey>('gi');
  const [selectedPeriodicidade, setSelectedPeriodicidade] = useState<Periodicidade>('mensal');
  const [gerarLinkAoCadastrar, setGerarLinkAoCadastrar] = useState(true);

  useEffect(() => {
    if (student) {
      setIsEditMode(true);
      const beltValue = student.belt || 'Branca';
      setIsKids(kidsBelts.includes(beltValue));
      setFormData({
        name: student.name || '',
        email: student.email || '',
        password: '',
        phone: student.phone || '',
        belt: beltValue,
        status: student.status || 'active',
        monthlyFee: student.monthlyFee || 0,
      });
      if (student.plano) setSelectedPlano(student.plano as PlanKey);
      if (student.periodicidade) setSelectedPeriodicidade(student.periodicidade as Periodicidade);
    }
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyFee' ? parseFloat(value) || 0 : value,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Imagem muito grande. Máximo 10MB.', 'error');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleKidsToggle = (kids: boolean) => {
    setIsKids(kids);
    setFormData(prev => ({
      ...prev,
      belt: (kids ? 'Branca (Kids)' : 'Branca') as BeltLevel,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) { showToast('Nome é obrigatório', 'error'); return; }
    if (!formData.email.trim()) { showToast('Email é obrigatório', 'error'); return; }
    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      showToast('Senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && student) {
        await firestoreService.updateDocument('students', student.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          monthlyFee: formData.monthlyFee,
          diasPermitidos: PLANS[selectedPlano].diasPermitidos,
          updatedAt: new Date().toISOString(),
        });

        if (photoFile) {
          await savePhotoLocally(photoFile, formData.name.trim(), student.id);
          showToast('Foto salva no dispositivo!', 'success');
        }

        showToast('Aluno atualizado com sucesso!', 'success');
        onSuccess();

      } else {
        let secondaryAuth;
        let userId;

        try {
          const secondaryApp = initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          }, 'Secondary');
          secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth, formData.email.trim(), formData.password
          );
          userId = userCredential.user.uid;
          await secondaryAuth.signOut();
        } catch (error: any) {
          if (error.code === 'app/duplicate-app') {
            secondaryAuth = getAuth(getApp('Secondary'));
            const userCredential = await createUserWithEmailAndPassword(
              secondaryAuth, formData.email.trim(), formData.password
            );
            userId = userCredential.user.uid;
            await secondaryAuth.signOut();
          } else {
            throw error;
          }
        }

        const now = new Date().toISOString();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await setDoc(doc(db, 'users', userId), {
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: 1,
        });

        await setDoc(doc(db, 'students', userId), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          monthlyFee: PLANS[selectedPlano][selectedPeriodicidade].valor,
          paymentStatus: 'pending',
          stripePaymentStatus: 'pending',
          plano: selectedPlano,
          periodicidade: selectedPeriodicidade,
          diasPermitidos: PLANS[selectedPlano].diasPermitidos, // ← salvo automaticamente pelo plano
          lastPayment: now,
          nextPaymentDue: nextMonth.toISOString(),
          totalAttendances: 0,
          beltHistory: [{ from: 'Branca', to: formData.belt, date: now, notes: 'Cadastro inicial' }],
          createdAt: now,
          updatedAt: now,
        });

        if (photoFile) {
          await savePhotoLocally(photoFile, formData.name.trim(), userId);
          showToast('Foto salva no dispositivo!', 'success');
        }

        showToast('Aluno cadastrado!', 'success');

        if (gerarLinkAoCadastrar) {
          const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'subscription',
              studentId: userId,
              studentEmail: formData.email.trim(),
              studentName: formData.name.trim(),
              plano: selectedPlano,
              periodicidade: selectedPeriodicidade,
            }),
          });
          const { url } = await res.json();
          if (url) {
            setGeneratedLink(url);
            navigator.clipboard.writeText(url);
            showToast('Link de pagamento copiado!', 'success');
          }
        } else {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error(error);
      let msg = 'Erro ao salvar aluno';
      if (error.code === 'auth/email-already-in-use') msg = 'Email já cadastrado';
      else if (error.code === 'auth/invalid-email') msg = 'Email inválido';
      else if (error.code === 'auth/weak-password') msg = 'Senha muito fraca';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (generatedLink) {
    return (
      <div className="space-y-5 py-2">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Aluno cadastrado!</h3>
            <p className="text-sm text-gray-500 mt-1">
              O link de pagamento foi gerado e copiado para a área de transferência.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Link de pagamento:</p>
          <p className="text-xs text-gray-700 break-all font-mono leading-relaxed">{generatedLink}</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-700">
          <strong>Plano:</strong> {PLANS[selectedPlano].label} · {selectedPeriodicidade} ·{' '}
          <strong>R$ {PLANS[selectedPlano][selectedPeriodicidade].valor.toFixed(2).replace('.', ',')}</strong>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${
              linkCopied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button
            onClick={onSuccess}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const currentBelts = isKids ? kidsBelts : adultBelts;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Foto ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foto do Aluno
          <span className="ml-1 text-xs text-gray-400 font-normal">(salva localmente no dispositivo)</span>
        </label>
        <div className="flex items-center gap-4">
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`relative w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition
              ${photoPreview ? 'border-transparent' : 'border-gray-300 bg-gray-50 hover:border-red-400 hover:bg-red-50'}`}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <User className="w-6 h-6" />
                <Camera className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {photoPreview ? 'Trocar foto' : 'Selecionar foto'}
            </button>
            {photoFile && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <p className="text-xs text-gray-500 truncate flex-1">{photoFile.name}</p>
                <button type="button" onClick={removePhoto} className="text-gray-400 hover:text-red-500 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">A foto será baixada com o nome e ID do aluno.</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
      </div>

      {/* ── Nome ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange}
          required disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
      </div>

      {/* ── Email ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange}
          required disabled={loading || isEditMode}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:bg-gray-100" />
        {isEditMode && <p className="text-xs text-gray-400 mt-1">Email não pode ser alterado</p>}
      </div>

      {/* ── Senha ── */}
      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso *</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange}
            required placeholder="Mínimo 6 caracteres" disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
        </div>
      )}

      {/* ── Telefone ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
          placeholder="(00) 00000-0000" disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
      </div>

      {/* ── Faixa ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Faixa *</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs">
            <button type="button" onClick={() => handleKidsToggle(false)} disabled={loading}
              className={`px-3 py-1.5 font-medium transition ${!isKids ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Adulto
            </button>
            <button type="button" onClick={() => handleKidsToggle(true)} disabled={loading}
              className={`px-3 py-1.5 font-medium transition ${isKids ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Kids
            </button>
          </div>
        </div>
        <div className={`grid gap-2 ${isKids ? 'grid-cols-3' : 'grid-cols-5'}`}>
          {currentBelts.map(belt => {
            const isSelected = formData.belt === belt;
            return (
              <button key={belt} type="button" disabled={loading}
                onClick={() => setFormData(prev => ({ ...prev, belt: belt as BeltLevel }))}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition text-xs font-medium
                  ${isSelected
                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className={`w-full h-3 rounded-full ${beltColors[belt] || 'bg-gray-300'}`} />
                <span className="leading-tight text-center">{belt.replace(' (Kids)', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Status ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select name="status" value={formData.status} onChange={handleChange} disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm">
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="suspended">Suspenso</option>
        </select>
      </div>

      {/* ── Plano ── */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">Plano de Assinatura</span>
        </div>

        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modalidade</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLANS) as PlanKey[]).map(plano => (
              <button key={plano} type="button"
                onClick={() => {
                  setSelectedPlano(plano);
                  setFormData(prev => ({ ...prev, monthlyFee: PLANS[plano][selectedPeriodicidade].valor }));
                }}
                className={`p-2.5 rounded-xl border-2 text-center transition text-xs font-medium ${
                  selectedPlano === plano ? planSelectedColors[plano] : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {PLANS[plano].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Periodicidade</label>
          <div className="grid grid-cols-2 gap-2">
            {periodicidades.map(periodo => (
              <button key={periodo} type="button"
                onClick={() => {
                  setSelectedPeriodicidade(periodo);
                  setFormData(prev => ({ ...prev, monthlyFee: PLANS[selectedPlano][periodo].valor }));
                }}
                className={`py-2 rounded-xl border-2 text-sm font-medium capitalize transition ${
                  selectedPeriodicidade === periodo
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {periodo}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo do plano + dias permitidos */}
        <div className={`p-3 rounded-xl border-2 ${planColors[selectedPlano]}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-medium opacity-80">Plano selecionado</p>
              <p className="text-sm font-semibold mt-0.5">
                {PLANS[selectedPlano].label} · {selectedPeriodicidade}
              </p>
            </div>
            <p className="text-xl font-bold">
              R$ {PLANS[selectedPlano][selectedPeriodicidade].valor.toFixed(2).replace('.', ',')}
            </p>
          </div>
          {/* Dias de acesso */}
          <div className="flex items-center gap-2 pt-2 border-t border-current border-opacity-20">
            <CalendarDays className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {NOMES_DIAS.map((nome, idx) => {
                const permitido = PLANS[selectedPlano].diasPermitidos.includes(idx);
                return (
                  <span key={idx}
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      permitido ? 'bg-current bg-opacity-20 opacity-100' : 'opacity-30'
                    }`}
                  >
                    {nome}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gerar link ── */}
      {!isEditMode && (
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition">
          <input type="checkbox" checked={gerarLinkAoCadastrar}
            onChange={e => setGerarLinkAoCadastrar(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded" />
          <div>
            <p className="text-sm font-medium text-gray-800">Gerar link de pagamento ao cadastrar</p>
            <p className="text-xs text-gray-500">O link será copiado automaticamente após o cadastro</p>
          </div>
        </label>
      )}

      {/* ── Ações ── */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onSuccess} disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50">
          {loading ? 'Salvando...' : isEditMode ? 'Atualizar' : 'Cadastrar Aluno'}
        </button>
      </div>
    </form>
  );
};