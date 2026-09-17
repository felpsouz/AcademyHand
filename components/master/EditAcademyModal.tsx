'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface EditAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyId: string | null;
  onLoad: (academyId: string) => Promise<any>;
  onSave: (academyId: string, payload: any) => Promise<void>;
}

export function EditAcademyModal({ isOpen, onClose, academyId, onLoad, onSave }: EditAcademyModalProps) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [usaGraduacao, setUsaGraduacao] = useState(true);
  const [usaFacial, setUsaFacial] = useState(false);
  const [deviceIp, setDeviceIp] = useState('');
  const [devicePort, setDevicePort] = useState('9020');
  const [deviceUser, setDeviceUser] = useState('admin');
  const [devicePass, setDevicePass] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

  useEffect(() => {
    if (!isOpen || !academyId) return;

    setCarregando(true);
    setErro(null);

    onLoad(academyId)
      .then((data) => {
        setNome(data.nome ?? '');
        setUsaGraduacao(data.usaGraduacao !== false);
        setUsaFacial(data.usaFacial === true);
        setDeviceIp(data.device?.ip ?? '');
        setDevicePort(data.device?.port ?? '9020');
        setDeviceUser(data.device?.user ?? 'admin');
        setDevicePass(data.device?.pass ?? '');
        setStripeSecretKey(data.stripeSecretKey ?? '');
        setStripeWebhookSecret(data.stripeWebhookSecret ?? '');
      })
      .catch((err) => setErro(err.message || 'Erro ao carregar academia'))
      .finally(() => setCarregando(false));
  }, [isOpen, academyId, onLoad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyId) return;

    setErro(null);
    setSalvando(true);
    try {
      await onSave(academyId, {
        nome,
        usaGraduacao,
        usaFacial,
        device: usaFacial && deviceIp
          ? { ip: deviceIp, port: devicePort, user: deviceUser, pass: devicePass }
          : null,
        stripeSecretKey,
        stripeWebhookSecret,
      });
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar academia');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar academia" size="sm">
      {carregando ? (
        <p className="text-sm text-gray-500 py-6 text-center">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da academia</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={usaGraduacao}
              onChange={(e) => setUsaGraduacao(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Usa sistema de faixas/graduação
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={usaFacial}
              onChange={(e) => setUsaFacial(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Tem leitor de reconhecimento facial
          </label>

          {usaFacial && (
            <div className="pl-6 space-y-3 border-l-2 border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={deviceIp}
                  onChange={(e) => setDeviceIp(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="IP"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Secret Key</label>
            <input
              type="password"
              value={stripeSecretKey}
              onChange={(e) => setStripeSecretKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="sk_live_..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Webhook Secret</label>
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
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}