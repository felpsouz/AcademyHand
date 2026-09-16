'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface CreateAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    nome: string;
    usaGraduacao: boolean;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
  }) => Promise<void>;
}

export function CreateAcademyModal({ isOpen, onClose, onCreate }: CreateAcademyModalProps) {
  const [nome, setNome] = useState('');
  const [usaGraduacao, setUsaGraduacao] = useState(true);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await onCreate({
        nome,
        usaGraduacao,
        stripeSecretKey: stripeSecretKey || undefined,
        stripeWebhookSecret: stripeWebhookSecret || undefined,
      });
      setNome('');
      setUsaGraduacao(true);
      setStripeSecretKey('');
      setStripeWebhookSecret('');
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar academia');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova academia" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da academia</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Ex: Fit Center Aracaju"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={usaGraduacao}
            onChange={(e) => setUsaGraduacao(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          Essa academia usa sistema de faixas/graduação (ex: Jiu-Jitsu)
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stripe Secret Key <span className="text-gray-400">(opcional agora, pode configurar depois)</span>
          </label>
          <input
            type="password"
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="sk_live_..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stripe Webhook Secret <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="password"
            value={stripeWebhookSecret}
            onChange={(e) => setStripeWebhookSecret(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="whsec_..."
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar academia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}