import { NextResponse } from 'next/server';
import { adminDb, adminAuth, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/master/users — cria um admin (role 0) ou aluno (role 1) em qualquer academia
export async function POST(request: Request) {
  try {
    await verifyMasterRequest(request);

    const body = await request.json();
    const { email, password, name, role, academyId, studentId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, password e name são obrigatórios' }, { status: 400 });
    }

    if (role !== 0 && role !== 1) {
      return NextResponse.json({ error: 'role deve ser 0 (admin) ou 1 (aluno)' }, { status: 400 });
    }

    if (!academyId) {
      return NextResponse.json({ error: 'academyId é obrigatório' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter ao menos 6 caracteres (mínimo do Firebase Auth)' }, { status: 400 });
    }

    // Confirma que a academia existe antes de criar o usuário nela
    const academyDoc = await adminDb().collection('academies').doc(academyId).get();
    if (!academyDoc.exists) {
      return NextResponse.json({ error: `Academia "${academyId}" não encontrada` }, { status: 404 });
    }
    const academyData = academyDoc.data()!;

    // 1. Cria a conta de autenticação (e-mail/senha)
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Cria o documento de perfil no Firestore
    const userData: Record<string, any> = {
      email,
      name,
      role,
      academyId,
      // Denormalizado da academia, já que o client nunca lê a coleção "academies" diretamente
      academyName: academyData.nome,
      usaGraduacao: academyData.usaGraduacao !== false,
      usaFacial: academyData.usaFacial === true,
      criadoEm: FieldValue.serverTimestamp(),
    };
    if (role === 1 && studentId) {
      userData.studentId = studentId;
    }

    await adminDb().collection('users').doc(userRecord.uid).set(userData);

    // Se for aluno, cria também o documento em "students" — é de lá que a
    // tela do aluno (StudentView) busca nome, faixa, mensalidade, status Stripe, etc.
    // Sem isso, o aluno loga com sucesso mas cai numa tela de "dados não encontrados".
    if (role === 1) {
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const studentDoc: Record<string, any> = {
        academyId,
        name,
        email,
        status: 'active',
        monthlyFee: 0,
        paymentStatus: 'pending',
        stripePaymentStatus: 'pending',
        totalAttendances: 0,
        lastPayment: now.toISOString(),
        nextPaymentDue: nextMonth.toISOString(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Só grava faixa/graduação se essa academia usa esse sistema
      if (academyData.usaGraduacao !== false) {
        studentDoc.belt = 'Branca';
        studentDoc.beltHistory = [{
          from: 'Branca', to: 'Branca', date: now.toISOString(), notes: 'Cadastro inicial (via painel master)',
        }];
      }

      await adminDb().collection('students').doc(userRecord.uid).set(studentDoc);
    }

    return NextResponse.json({ uid: userRecord.uid, email, role, academyId }, { status: 201 });
  } catch (error: any) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail' }, { status: 409 });
    }
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao criar usuário' }, { status: 500 });
  }
}