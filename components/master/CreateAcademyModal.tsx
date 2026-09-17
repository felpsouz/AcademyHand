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
    usaFacial: boolean;
    device?: { ip: string; port: string; user: string; pass: string };
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
  }) => Promise<void>;
}

export function CreateAcademyModal({ isOpen, onClose, onCreate }: CreateAcademyModalProps) {
  const [nome, setNome] = useState('');
  const [usaGraduacao, setUsaGraduacao] = useState(true);
  const [usaFacial, setUsaFacial] = useState(false);
  const [deviceIp, setDeviceIp] = useState('');
  const [devicePort, setDevicePort] = useState('9020');
  const [deviceUser, setDeviceUser] = useState('admin');
  const [devicePass, setDevicePass] = useState('');
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
        usaFacial,
        device: usaFacial && deviceIp
          ? { ip: deviceIp, port: devicePort, user: deviceUser, pass: devicePass }
          : undefined,
        stripeSecretKey: stripeSecretKey || undefined,
        stripeWebhookSecret: stripeWebhookSecret || undefined,
      });
      setNome('');
      setUsaGraduacao(true);
      setUsaFacial(false);
      setDeviceIp('');
      setDevicePass('');
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

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={usaFacial}
            onChange={(e) => setUsaFacial(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          Essa academia tem leitor de reconhecimento facial
        </label>

        {usaFacial && (
          <div className="pl-6 space-y-3 border-l-2 border-gray-100">
            <p className="text-xs text-gray-500">
              Dados do dispositivo (pode preencher depois, direto no Firestore)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={deviceIp}
                onChange={(e) => setDeviceIp(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="IP (ex: 192.168.2.100)"
              />
              <input
                type="text"
                value={devicePort}
                onChange={(e) => setDevicePort(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Porta"
              />
              <input
                type="text"
                value={deviceUser}
                onChange={(e) => setDeviceUser(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Usuário"
              />
              <input
                type="password"
                value={devicePass}
                onChange={(e) => setDevicePass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Senha"
              />
            </div>
          </div>
        )}

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