'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { PixQrCode } from '@/components/common/PixQrCode';

interface PixConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PixConfigModal({ isOpen, onClose }: PixConfigModalProps) {
  const { user } = useAuth();
  const [chave, setChave] = useState('');
  const [nomeTitular, setNomeTitular] = useState('');
  const [copiaECola, setCopiaECola] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    setCarregando(true);
    setErro(null);
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/academy/pix', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar Pix');
        setChave(data.pix?.chave ?? '');
        setNomeTitular(data.pix?.nomeTitular ?? '');
        setCopiaECola(data.pix?.copiaECola ?? '');
      } catch (err: any) {
        setErro(err.message || 'Erro ao carregar Pix');
      } finally {
        setCarregando(false);
      }
    })();
  }, [isOpen, user]);

  const handleSalvar = async () => {
    if (!user) return;
    setErro(null);
    setSalvando(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/academy/pix', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ chave, nomeTitular, copiaECola }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar Pix');
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar Pix');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Pix" size="sm">
      {carregando ? (
        <p className="text-sm text-gray-500 py-6 text-center">Carregando...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
            <input
              type="text"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do titular</label>
            <input
              type="text"
              value={nomeTitular}
              onChange={(e) => setNomeTitular(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Pix "copia e cola" <span className="text-gray-400">(opcional — gera o QR Code)</span>
            </label>
            <textarea
              value={copiaECola}
              onChange={(e) => setCopiaECola(e.target.value)}
              rows={3}
              placeholder="Cole aqui o código gerado no app do seu banco"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Gere um código Pix "estático" (sem valor fixo, se seu banco permitir) no app do seu banco e cole aqui.
              Sem isso, o aluno só verá a chave pra copiar, sem QR Code.
            </p>
          </div>

          {copiaECola && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-gray-500">Pré-visualização:</p>
              <PixQrCode copiaECola={copiaECola} size={160} />
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" fullWidth onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Pix'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}