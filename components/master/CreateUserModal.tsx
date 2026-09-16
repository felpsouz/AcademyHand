'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { AcademiaResumo } from '@/hooks/useMasterPanel';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  academias: AcademiaResumo[];
  academiaPreSelecionada?: string;
  onCreate: (payload: {
    email: string;
    password: string;
    name: string;
    role: 0 | 1;
    academyId: string;
    studentId?: string;
  }) => Promise<void>;
}

export function CreateUserModal({
  isOpen,
  onClose,
  academias,
  academiaPreSelecionada,
  onCreate,
}: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<0 | 1>(0);
  const [academyId, setAcademyId] = useState(academiaPreSelecionada || '');
  const [studentId, setStudentId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!academyId) {
      setErro('Selecione uma academia');
      return;
    }

    setSalvando(true);
    try {
      await onCreate({
        email,
        password,
        name,
        role,
        academyId,
        studentId: role === 1 && studentId ? studentId : undefined,
      });
      setName('');
      setEmail('');
      setPassword('');
      setStudentId('');
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar usuário');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo acesso" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de acesso</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole(0)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                role === 0 ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-700'
              }`}
            >
              Admin (professor)
            </button>
            <button
              type="button"
              onClick={() => setRole(1)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                role === 1 ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-700'
              }`}
            >
              Aluno
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Academia</label>
          <select
            required
            value={academyId}
            onChange={(e) => setAcademyId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Selecione...</option>
            {academias.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha provisória</label>
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {role === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID de aluno vinculado <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar acesso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}