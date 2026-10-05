/**
 * Envio de WhatsApp via Z-API. Usa uma instância COMPARTILHADA pra toda a
 * plataforma (configurada via variáveis de ambiente), não por academia —
 * mais simples de configurar, e o nome da academia vai dentro da mensagem.
 */

export interface ResultadoWhatsApp {
  ok: boolean;
  motivo?: 'config' | 'telefone' | 'rede' | 'zapi';
  numero?: string;
  status?: number;
  detalhe?: unknown;
  erro?: string;
}

// Limpa um secret vindo das variáveis de ambiente: tira aspas nas pontas e qualquer caractere
// que não seja ASCII visível (espaço, quebra de linha, caracteres invisíveis de copiar/colar).
// Um único caractere inválido faz o fetch recusar o cabeçalho ("invalid Client-Token header").
function limparSecret(nome: string, bruto: string | undefined): string {
  if (!bruto) return '';

  const limpo = bruto
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/[^\x21-\x7E]/g, '');

  if (limpo.length !== bruto.length) {
    console.warn(
      `[whatsapp] ${nome} tinha ${bruto.length - limpo.length} caractere(s) inválido(s) ou invisível(is) que foram ignorados. ` +
      `Reenvie o secret digitando o valor no terminal.`
    );
  }

  return limpo;
}

// Deixa só os dígitos e garante o DDI do Brasil (55). Devolve null se o número não faz sentido.
export function normalizarTelefone(telefone: string): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;

  // Já vem com DDI (55 + DDD + número = 12 ou 13 dígitos).
  // Testar só "começa com 55" confundiria o DDD 55 (RS) com o código do país.
  if (digitos.length >= 12 && digitos.startsWith('55')) return digitos;

  return `55${digitos}`;
}

/** Versão com detalhes do resultado — usada pela rota de teste e, por baixo, pelos lembretes. */
export async function enviarWhatsAppDetalhado(telefone: string, mensagem: string): Promise<ResultadoWhatsApp> {
  const instanceId = limparSecret('ZAPI_INSTANCE_ID', process.env.ZAPI_INSTANCE_ID);
  const token = limparSecret('ZAPI_TOKEN', process.env.ZAPI_TOKEN);
  const clientToken = limparSecret('ZAPI_CLIENT_TOKEN', process.env.ZAPI_CLIENT_TOKEN);

  if (!instanceId || !token) {
    console.warn('[whatsapp] Z-API não configurado — mensagem não enviada');
    return {
      ok: false,
      motivo: 'config',
      erro: 'ZAPI_INSTANCE_ID e/ou ZAPI_TOKEN não configurados nas variáveis de ambiente',
    };
  }

  const numero = normalizarTelefone(telefone);
  if (!numero) {
    console.warn('[whatsapp] Telefone inválido — mensagem não enviada:', telefone);
    return { ok: false, motivo: 'telefone', erro: 'Telefone inválido (informe DDD + número)' };
  }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
        body: JSON.stringify({ phone: numero, message: mensagem }),
        // Sem limite, uma resposta travada do Z-API pararia o disparo de todos os alunos
        signal: AbortSignal.timeout(15000),
      }
    );

    const texto = await res.text();
    let detalhe: unknown = texto;
    try { detalhe = JSON.parse(texto); } catch {}

    if (!res.ok) {
      console.error('[whatsapp] Falha ao enviar:', res.status, texto);
      return {
        ok: false,
        motivo: 'zapi',
        numero,
        status: res.status,
        detalhe,
        erro: `Z-API respondeu com status ${res.status}`,
      };
    }

    return { ok: true, numero, status: res.status, detalhe };
  } catch (err: any) {
    console.error('[whatsapp] Erro ao enviar:', err);
    return {
      ok: false,
      motivo: 'rede',
      numero,
      erro: `Não foi possível chamar o Z-API: ${err?.message ?? 'erro desconhecido'}`,
      detalhe: err?.cause?.message ?? err?.cause?.code ?? null,
    };
  }
}

export async function enviarWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  const resultado = await enviarWhatsAppDetalhado(telefone, mensagem);
  return resultado.ok;
}