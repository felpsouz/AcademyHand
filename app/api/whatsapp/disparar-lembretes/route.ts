import { NextResponse } from 'next/server';
import { verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';
import { processarLembretesAcademia, processarTodosLembretes } from '@/lib/lembretes';

// POST /api/whatsapp/disparar-lembretes
// - Admin (role 0): sempre dispara só pra própria academia
// - Master (role 2): dispara pra uma academia específica (se academyId vier no
//   body) ou pra TODAS de uma vez (se body vazio)
export async function POST(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0 && usuario.role !== 2) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    if (usuario.role === 0) {
      const resultado = await processarLembretesAcademia(usuario.academyId);
      return NextResponse.json({ ok: true, ...resultado });
    }

    // Master
    if (body.academyId) {
      const resultado = await processarLembretesAcademia(body.academyId);
      return NextResponse.json({ ok: true, ...resultado });
    }

    const resultado = await processarTodosLembretes();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao disparar lembretes manualmente:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}