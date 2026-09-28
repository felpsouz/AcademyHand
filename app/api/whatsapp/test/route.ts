import { NextResponse } from 'next/server';
import { verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';

// POST /api/whatsapp/test — envia uma mensagem de teste, retornando detalhes
// da resposta do Z-API (útil pra debugar configuração errada)
export async function POST(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0 && usuario.role !== 2) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { telefone } = body;

    if (!telefone) {
      return NextResponse.json({ error: 'Informe um telefone' }, { status: 400 });
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (!instanceId || !token) {
      return NextResponse.json({
        error: 'ZAPI_INSTANCE_ID e/ou ZAPI_TOKEN não configurados nas variáveis de ambiente',
      }, { status: 400 });
    }

    const digitos = telefone.replace(/\D/g, '');
    const numeroComPais = digitos.startsWith('55') ? digitos : `55${digitos}`;

    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
        body: JSON.stringify({
          phone: numeroComPais,
          message: '✅ Mensagem de teste do AcademyHand! Se você recebeu isso, o WhatsApp está configurado corretamente.',
        }),
      }
    );

    const respostaTexto = await res.text();
    let respostaJson: any = null;
    try { respostaJson = JSON.parse(respostaTexto); } catch {}

    if (!res.ok) {
      return NextResponse.json({
        error: `Z-API respondeu com status ${res.status}`,
        detalhe: respostaJson ?? respostaTexto,
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true, numeroEnviado: numeroComPais, resposta: respostaJson ?? respostaTexto });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro no teste de WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}