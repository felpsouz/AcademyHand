'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { PlanoAcademia } from '@/lib/plans';
import { PlanosEditor } from '@/components/financial/PlanosEditor';
import { useAuth } from '@/contexts/AuthContext';

interface EditAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyId: string | null;
  onLoad: (academyId: string) => Promise<any>;
  onSave: (academyId: string, payload: any) => Promise<void>;
}

export function EditAcademyModal({ isOpen, onClose, academyId, onLoad, onSave }: EditAcademyModalProps) {
  const { user } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [usaGraduacao, setUsaGraduacao] = useState(true);
  const [usaFacial, setUsaFacial] = useState(false);
  const [usaAgenda, setUsaAgenda] = useState(false);
  const [deviceIp, setDeviceIp] = useState('');
  const [devicePort, setDevicePort] = useState('9020');
  const [deviceUser, setDeviceUser] = useState('admin');
  const [devicePass, setDevicePass] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [planos, setPlanos] = useState<PlanoAcademia[]>([]);
  const [pixChave, setPixChave] = useState('');
  const [pixNomeTitular, setPixNomeTitular] = useState('');
  const [pixCopiaECola, setPixCopiaECola] = useState('');
  const [lembretesWhatsapp, setLembretesWhatsapp] = useState(false);
  const [telefoneTeste, setTelefoneTeste] = useState('');
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [resultadoDisparo, setResultadoDisparo] = useState<string | null>(null);

  // Guarda o onLoad mais recente sem fazer o efeito de carga rodar de novo
  // (se o pai recriar a função, o formulário não pode ser recarregado no meio da edição)
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  // Ao fechar, volta para "carregando" — assim, ao reabrir, nunca aparecem os dados da academia anterior
  useEffect(() => {
    if (!isOpen) setCarregando(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !academyId) return;

    let cancelado = false;

    setCarregando(true);
    setErro(null);
    setErroCarga(null);
    setResultadoTeste(null);
    setResultadoDisparo(null);
    setTelefoneTeste('');

    onLoadRef.current(academyId)
      .then((data) => {
        if (cancelado) return;
        setNome(data.nome ?? '');
        setUsaGraduacao(data.usaGraduacao !== false);
        setUsaFacial(data.usaFacial === true);
        setUsaAgenda(data.usaAgenda === true);
        setDeviceIp(data.device?.ip ?? '');
        setDevicePort(data.device?.port ?? '9020');
        setDeviceUser(data.device?.user ?? 'admin');
        setDevicePass(data.device?.pass ?? '');
        setStripeSecretKey(data.stripeSecretKey ?? '');
        setStripeWebhookSecret(data.stripeWebhookSecret ?? '');
        setPlanos(data.planos ?? []);
        setPixChave(data.pix?.chave ?? '');
        setPixNomeTitular(data.pix?.nomeTitular ?? '');
        setPixCopiaECola(data.pix?.copiaECola ?? '');
        setLembretesWhatsapp(data.lembretesWhatsapp === true);
      })
      .catch((err) => {
        if (!cancelado) setErroCarga(err.message || 'Erro ao carregar academia');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, academyId, tentativa]);

  const handleDispararLembretes = async () => {
    if (!user || !academyId) return;
    setDisparando(true);
    setResultadoDisparo(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/whatsapp/disparar-lembretes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ academyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultadoDisparo(
          `Enviado: ${data.vencendoEnviados} lembrete(s) de vencimento próximo, ${data.vencidosEnviados} de vencido. ${data.erros > 0 ? `${data.erros} erro(s).` : ''}`
        );
      } else {
        setResultadoDisparo(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setResultadoDisparo(err.message || 'Erro ao disparar');
    } finally {
      setDisparando(false);
    }
  };

  const handleTestarWhatsapp = async () => {
    if (!user || !telefoneTeste) return;
    setTestando(true);
    setResultadoTeste(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ telefone: telefoneTeste }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultadoTeste({ ok: true, mensagem: `Enviado para ${data.numeroEnviado}! Confira o WhatsApp.` });
      } else {
        setResultadoTeste({ ok: false, mensagem: data.error + (data.detalhe ? ` — ${JSON.stringify(data.detalhe)}` : '') });
      }
    } catch (err: any) {
      setResultadoTeste({ ok: false, mensagem: err.message || 'Erro ao testar' });
    } finally {
      setTestando(false);
    }
  };

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
        usaAgenda,
        device: usaFacial && deviceIp
          ? { ip: deviceIp, port: devicePort, user: deviceUser, pass: devicePass }
          : null,
        stripeSecretKey,
        stripeWebhookSecret,
        planos,
        pix: { chave: pixChave, nomeTitular: pixNomeTitular, copiaECola: pixCopiaECola },
        lembretesWhatsapp,
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
      ) : erroCarga ? (
        <div className="py-6 text-center space-y-4">
          <p className="text-sm text-red-600">{erroCarga}</p>
          <div className="flex gap-3 justify-center">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" variant="primary" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
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

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={usaAgenda}
              onChange={(e) => setUsaAgenda(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span>
              Modo personal (agenda + treinos)
              <span className="block text-xs text-gray-400">
                Alunos individuais: o aluno escolhe o horário na grade do personal e vê o treino prescrito.
              </span>
            </span>
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

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Planos</label>
            <PlanosEditor planos={planos} onChange={setPlanos} />
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Pix</label>
            <input
              type="text"
              value={pixChave}
              onChange={(e) => setPixChave(e.target.value)}
              placeholder="Chave Pix"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <input
              type="text"
              value={pixNomeTitular}
              onChange={(e) => setPixNomeTitular(e.target.value)}
              placeholder="Nome do titular"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <textarea
              value={pixCopiaECola}
              onChange={(e) => setPixCopiaECola(e.target.value)}
              placeholder="Código Pix copia-e-cola (opcional, gera QR Code)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 border-t border-gray-100 pt-4">
            <input
              type="checkbox"
              checked={lembretesWhatsapp}
              onChange={(e) => setLembretesWhatsapp(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Enviar lembretes de pagamento por WhatsApp
          </label>

          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Testar envio de WhatsApp</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={telefoneTeste}
                onChange={(e) => setTelefoneTeste(e.target.value)}
                placeholder="(00) 00000-0000"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestarWhatsapp}
                disabled={testando || !telefoneTeste}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {testando ? 'Enviando...' : 'Enviar teste'}
              </button>
            </div>
            {resultadoTeste && (
              <p className={`text-xs ${resultadoTeste.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {resultadoTeste.mensagem}
              </p>
            )}
          </div>

          {lembretesWhatsapp && (
            <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-indigo-700">
                Disparar lembretes agora (sem esperar o horário automático)
              </p>
              <button
                type="button"
                onClick={handleDispararLembretes}
                disabled={disparando}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {disparando ? 'Disparando...' : 'Disparar lembretes dessa academia'}
              </button>
              {resultadoDisparo && (
                <p className="text-xs text-gray-600">{resultadoDisparo}</p>
              )}
            </div>
          )}

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