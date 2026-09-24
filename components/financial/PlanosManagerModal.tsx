'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAcademia } from '@/lib/plans';
import { PlanosEditor } from './PlanosEditor';

interface PlanosManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (planos: PlanoAcademia[]) => void;
}

export function PlanosManagerModal({ isOpen, onClose, onSaved }: PlanosManagerModalProps) {
  const { user } = useAuth();
  const [planos, setPlanos] = useState<PlanoAcademia[]>([]);
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
        const res = await fetch('/api/academy/planos', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar planos');
        setPlanos(data.planos ?? []);
      } catch (err: any) {
        setErro(err.message || 'Erro ao carregar planos');
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
      const res = await fetch('/api/academy/planos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ planos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar planos');
      onSaved?.(data.planos);
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar planos');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planos da academia" size="lg">
      {carregando ? (
        <p className="text-sm text-gray-500 py-6 text-center">Carregando...</p>
      ) : (
        <div className="space-y-4">
          <PlanosEditor planos={planos} onChange={setPlanos} />

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" fullWidth onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar planos'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}