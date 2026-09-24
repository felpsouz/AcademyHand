/**
 * Envio de WhatsApp via Z-API. Usa uma instância COMPARTILHADA pra toda a
 * plataforma (configurada via variáveis de ambiente), não por academia —
 * mais simples de configurar, e o nome da academia vai dentro da mensagem.
 */
export async function enviarWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    console.warn('[whatsapp] Z-API não configurado — mensagem não enviada');
    return false;
  }

  // Limpa o telefone pra só dígitos e garante o DDI do Brasil (55)
  const digitos = telefone.replace(/\D/g, '');
  const numeroComPais = digitos.startsWith('55') ? digitos : `55${digitos}`;

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
        body: JSON.stringify({ phone: numeroComPais, message: mensagem }),
      }
    );

    if (!res.ok) {
      const detalhe = await res.text();
      console.error('[whatsapp] Falha ao enviar:', res.status, detalhe);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[whatsapp] Erro ao enviar:', err);
    return false;
  }
}