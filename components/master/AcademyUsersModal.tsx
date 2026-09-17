'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface Usuario {
  uid: string;
  name: string;
  email: string;
  role: 0 | 1;
  studentId: string | null;
}

interface AcademyUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyId: string | null;
  academyName?: string;
  onList: (academyId: string) => Promise<Usuario[]>;
  onUpdate: (uid: string, payload: { name?: string; studentId?: string; newPassword?: string }) => Promise<void>;
  onDelete: (uid: string) => Promise<void>;
}

export function AcademyUsersModal({
  isOpen,
  onClose,
  academyId,
  academyName,
  onList,
  onUpdate,
  onDelete,
}: AcademyUsersModalProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [senhaEdicao, setSenhaEdicao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendoUid, setRemovendoUid] = useState<string | null>(null);

  const carregar = () => {
    if (!academyId) return;
    setCarregando(true);
    setErro(null);
    onList(academyId)
      .then(setUsuarios)
      .catch((err) => setErro(err.message || 'Erro ao carregar usuários'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (isOpen && academyId) carregar();
  }, [isOpen, academyId]);

  const iniciarEdicao = (usuario: Usuario) => {
    setEditandoUid(usuario.uid);
    setNomeEdicao(usuario.name);
    setSenhaEdicao('');
  };

  const salvarEdicao = async (uid: string) => {
    setSalvando(true);
    try {
      const payload: any = { name: nomeEdicao };
      if (senhaEdicao) payload.newPassword = senhaEdicao;
      await onUpdate(uid, payload);
      setEditandoUid(null);
      carregar();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (usuario: Usuario) => {
    if (!confirm(`Remover o acesso de "${usuario.name}"? Essa ação não pode ser desfeita.`)) return;
    setRemovendoUid(usuario.uid);
    try {
      await onDelete(usuario.uid);
      carregar();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover');
    } finally {
      setRemovendoUid(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Acessos — ${academyName ?? ''}`} size="lg">
      {carregando ? (
        <p className="text-sm text-gray-500 py-6 text-center">Carregando...</p>
      ) : erro ? (
        <p className="text-sm text-red-600 py-6 text-center">{erro}</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Nenhum acesso cadastrado ainda.</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {usuarios.map((usuario) => (
            <div key={usuario.uid} className="border border-gray-200 rounded-lg p-3">
              {editandoUid === usuario.uid ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={nomeEdicao}
                    onChange={(e) => setNomeEdicao(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nome"
                  />
                  <input
                    type="text"
                    value={senhaEdicao}
                    onChange={(e) => setSenhaEdicao(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nova senha (deixe em branco pra não trocar)"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditandoUid(null)} disabled={salvando}>
                      Cancelar
                    </Button>
                    <Button variant="primary" onClick={() => salvarEdicao(usuario.uid)} disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">{usuario.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        usuario.role === 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {usuario.role === 0 ? 'Admin' : 'Aluno'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => iniciarEdicao(usuario)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleRemover(usuario)}
                      disabled={removendoUid === usuario.uid}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      {removendoUid === usuario.uid ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}