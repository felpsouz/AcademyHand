import { NextResponse } from 'next/server';
import {
  adminDb,
  verifyUserRequest,
  MasterAuthError,
  type UsuarioVerificado,
} from '@/lib/firebase-admin';
import { sanitizarPlano } from '@/lib/treinos';

export const dynamic = 'force-dynamic';

const COLECAO = 'treinos';

class TreinoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function tratarErro(error: unknown) {
  if (error instanceof TreinoError || error instanceof MasterAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[treinos] Erro interno:', error);
  return NextResponse.json({ error: 'Erro interno nos treinos' }, { status: 500 });
}

function exigirAdmin(u: UsuarioVerificado) {
  if (u.role !== 0) throw new TreinoError('Apenas o personal pode fazer isso', 403);
}

// Modo personal (agenda + treinos) é opcional por academia: academies/{id}.usaAgenda === true
async function exigirModoPersonal(academyId: string) {
  const snap = await adminDb().collection('academies').doc(academyId).get();
  if (!snap.exists || snap.data()?.usaAgenda !== true) {
    throw new TreinoError('O modo personal (agenda e treinos) não está habilitado para esta academia', 403);
  }
}

function paraResposta(studentId: string, d: any) {
  return {
    studentId,
    titulo: d.titulo ?? '',
    observacoes: d.observacoes ?? '',
    fichas: d.fichas ?? [],
    atualizadoEm: d.atualizadoEm ?? null,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
// Aluno: devolve o próprio treino.
// Personal: com ?studentId=... devolve o treino daquele aluno; sem parâmetro, devolve
// o resumo de quem já tem treino montado.
export async function GET(request: Request) {
  try {
    const u = await verifyUserRequest(request);
    if (!u.academyId) throw new TreinoError('Usuário sem academia vinculada', 403);
    await exigirModoPersonal(u.academyId);

    const db = adminDb();

    if (u.role === 1) {
      const snap = await db.collection(COLECAO).doc(u.uid).get();
      const d = snap.exists ? snap.data() : null;
      if (!d || d.academyId !== u.academyId) return NextResponse.json({ plano: null });
      return NextResponse.json({ plano: paraResposta(snap.id, d) });
    }

    if (u.role === 0) {
      const studentId = new URL(request.url).searchParams.get('studentId');

      if (studentId) {
        const snap = await db.collection(COLECAO).doc(studentId).get();
        const d = snap.exists ? snap.data() : null;
        if (!d || d.academyId !== u.academyId) return NextResponse.json({ plano: null });
        return NextResponse.json({ plano: paraResposta(snap.id, d) });
      }

      const snap = await db.collection(COLECAO).where('academyId', '==', u.academyId).get();
      const planos = snap.docs.map(doc => {
        const d = doc.data();
        return {
          studentId: doc.id,
          titulo: d.titulo ?? '',
          totalFichas: Array.isArray(d.fichas) ? d.fichas.length : 0,
          atualizadoEm: d.atualizadoEm ?? null,
        };
      });
      return NextResponse.json({ planos });
    }

    throw new TreinoError('Acesso não permitido', 403);
  } catch (error) {
    return tratarErro(error);
  }
}

// ── PUT: personal salva o treino de um aluno ──────────────────────────────────
export async function PUT(request: Request) {
  try {
    const u = await verifyUserRequest(request);
    if (!u.academyId) throw new TreinoError('Usuário sem academia vinculada', 403);
    exigirAdmin(u);
    await exigirModoPersonal(u.academyId);

    const body = await request.json().catch(() => ({}));
    const studentId = String(body?.studentId ?? '');
    if (!studentId) throw new TreinoError('Aluno não informado');

    const db = adminDb();
    const alunoSnap = await db.collection('students').doc(studentId).get();
    if (!alunoSnap.exists || alunoSnap.data()?.academyId !== u.academyId) {
      throw new TreinoError('Aluno não encontrado', 404);
    }

    let plano;
    try {
      plano = sanitizarPlano(body?.plano);
    } catch (e: any) {
      throw new TreinoError(e?.message || 'Treino inválido');
    }

    const atualizadoEm = new Date().toISOString();

    await db.collection(COLECAO).doc(studentId).set({
      academyId: u.academyId,
      studentId,
      ...plano,
      atualizadoEm,
      atualizadoPor: u.uid,
    });

    return NextResponse.json({ ok: true, plano: paraResposta(studentId, { ...plano, atualizadoEm }) });
  } catch (error) {
    return tratarErro(error);
  }
}

// ── DELETE: personal remove o treino de um aluno (?studentId=...) ─────────────
export async function DELETE(request: Request) {
  try {
    const u = await verifyUserRequest(request);
    if (!u.academyId) throw new TreinoError('Usuário sem academia vinculada', 403);
    exigirAdmin(u);
    await exigirModoPersonal(u.academyId);

    const studentId = new URL(request.url).searchParams.get('studentId') ?? '';
    if (!studentId) throw new TreinoError('Aluno não informado');

    const ref = adminDb().collection(COLECAO).doc(studentId);
    const snap = await ref.get();

    if (snap.exists && snap.data()?.academyId === u.academyId) {
      await ref.delete();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return tratarErro(error);
  }
}