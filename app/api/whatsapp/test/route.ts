import { NextResponse } from 'next/server';
import { verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';
import { enviarWhatsAppDetalhado } from '@/lib/whatsapp';

// POST /api/whatsapp/test — envia uma mensagem de teste usando o MESMO código dos lembretes,
// retornando detalhes da resposta do Z-API (útil pra debugar configuração errada)
export async function POST(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0 && usuario.role !== 2) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const telefone = typeof body?.telefone === 'string' ? body.telefone : '';

    if (!telefone) {
      return NextResponse.json({ error: 'Informe um telefone' }, { status: 400 });
    }

    const resultado = await enviarWhatsAppDetalhado(
      telefone,
      '✅ Mensagem de teste do AcademyHand! Se você recebeu isso, o WhatsApp está configurado corretamente.'
    );

    if (!resultado.ok) {
      const status = resultado.motivo === 'config' || resultado.motivo === 'telefone' ? 400 : 502;
      return NextResponse.json(
        { error: resultado.erro, detalhe: resultado.detalhe ?? null },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      numeroEnviado: resultado.numero,
      resposta: resultado.detalhe,
    });
  } catch (error: any) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro no teste de WhatsApp:', error);
    return NextResponse.json({ error: `Erro interno: ${error?.message ?? 'desconhecido'}` }, { status: 500 });
  }
}