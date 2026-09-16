import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// GET /api/master/overview — visão consolidada: academias, contagem de admins/alunos por academia
export async function GET(request: Request) {
  try {
    await verifyMasterRequest(request);

    const academiasSnap = await adminDb().collection('academies').get();

    const overview = await Promise.all(
      academiasSnap.docs.map(async (academiaDoc) => {
        const academyId = academiaDoc.id;
        const data = academiaDoc.data();

        const [adminsCount, alunosCount] = await Promise.all([
          adminDb().collection('users')
            .where('academyId', '==', academyId)
            .where('role', '==', 0)
            .count().get(),
          adminDb().collection('users')
            .where('academyId', '==', academyId)
            .where('role', '==', 1)
            .count().get(),
        ]);

        return {
          id: academyId,
          nome: data.nome,
          ativa: data.ativa !== false,
          totalAdmins: adminsCount.data().count,
          totalAlunos: alunosCount.data().count,
        };
      })
    );

    const totais = overview.reduce(
      (acc, a) => {
        acc.totalAcademias += 1;
        acc.totalAdmins += a.totalAdmins;
        acc.totalAlunos += a.totalAlunos;
        if (a.ativa) acc.academiasAtivas += 1;
        return acc;
      },
      { totalAcademias: 0, academiasAtivas: 0, totalAdmins: 0, totalAlunos: 0 }
    );

    return NextResponse.json({ academias: overview, totais });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao gerar visão geral:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar visão geral' }, { status: 500 });
  }
}