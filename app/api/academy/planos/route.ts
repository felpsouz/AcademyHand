import { NextResponse } from 'next/server';
import { adminDb, verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';

function validarPlanos(planos: any): string | null {
  if (!Array.isArray(planos)) return 'planos deve ser uma lista';
  for (const p of planos) {
    if (!p.id || typeof p.id !== 'string') return 'Todo plano precisa de um id';
    if (!p.label || typeof p.label !== 'string') return 'Todo plano precisa de um nome';
    if (!Array.isArray(p.diasPermitidos)) return 'diasPermitidos deve ser uma lista de números';
    if (typeof p.precos !== 'object' || p.precos === null) return 'precos deve ser um objeto';
    const temPreco = Object.values(p.precos).some((v) => typeof v === 'number' && v > 0);
    if (!temPreco) return `O plano "${p.label}" precisa de pelo menos um preço válido`;
  }
  return null;
}

// GET /api/academy/planos — lê os planos da academia do admin logado
export async function GET(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0) {
      return NextResponse.json({ error: 'Apenas admins podem gerenciar planos' }, { status: 403 });
    }

    const doc = await adminDb().collection('academies').doc(usuario.academyId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ planos: doc.data()?.planos ?? [] });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar planos' }, { status: 500 });
  }
}

// PUT /api/academy/planos — substitui a lista inteira de planos da academia do admin logado
export async function PUT(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0) {
      return NextResponse.json({ error: 'Apenas admins podem gerenciar planos' }, { status: 403 });
    }

    const body = await request.json();
    const erro = validarPlanos(body.planos);
    if (erro) {
      return NextResponse.json({ error: erro }, { status: 400 });
    }

    await adminDb().collection('academies').doc(usuario.academyId).update({
      planos: body.planos,
    });

    return NextResponse.json({ planos: body.planos });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao salvar planos:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar planos' }, { status: 500 });
  }
}