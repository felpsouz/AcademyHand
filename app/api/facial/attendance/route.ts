import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Intelbras SS 3532 MF W → chama este endpoint quando reconhece um rosto
// POST https://academy-hand.vercel.app/api/facial/attendance

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // O dispositivo Intelbras envia o UserID que foi cadastrado
    // O UserID no dispositivo é o mesmo ID do aluno no Firestore
    const userId     = body.UserID   ?? body.userId   ?? body.user_id;
    const userName   = body.UserName ?? body.userName ?? body.user_name;
    const timestamp  = body.Time     ?? body.timestamp ?? new Date().toISOString();

    if (!userId) {
      return NextResponse.json({ error: 'UserID obrigatório' }, { status: 400 });
    }

    const db = adminDb();

    // Buscar aluno no Firestore pelo ID
    const studentDoc = await db.collection('students').doc(userId).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { approved: false, message: 'Aluno não encontrado', userId },
        { status: 404 }
      );
    }

    const student = studentDoc.data()!;
    const now     = new Date(timestamp);
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Verificar se já registrou presença hoje
    const existingSnap = await db.collection('attendance')
      .where('studentId', '==', userId)
      .where('date', '==', dateStr)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({
        approved: true,
        message:  'Presença já registrada hoje',
        studentName: student.name,
        date: dateStr,
      });
    }

    // Verificar status de pagamento
    const paymentStatus = student.stripePaymentStatus ?? 'pending';
    const isActive      = student.status === 'active';
    const isPaid        = paymentStatus === 'active';

    let approved = isActive && isPaid;
    let message  = approved ? 'Acesso liberado' : '';

    if (!isActive) message = 'Aluno inativo';
    else if (!isPaid) {
      if (paymentStatus === 'overdue')   message = 'Pagamento em atraso';
      if (paymentStatus === 'pending')   message = 'Pagamento pendente';
      if (paymentStatus === 'cancelled') message = 'Assinatura cancelada';
    }

    // Registrar presença independente do status (para histórico)
    await db.collection('attendance').add({
      studentId:            userId,
      studentName:          student.name,
      date:                 dateStr,
      time:                 timeStr,
      confirmed:            true,
      source:               'facial',
      paymentStatusAtEntry: paymentStatus,
      approved,
      createdAt:            now.toISOString(),
    });

    // Retorno para o dispositivo exibir na tela
    return NextResponse.json({
      approved,
      studentName: student.name,
      belt:        student.belt   ?? '',
      paymentStatus,
      message,
    });

  } catch (err: any) {
    console.error('Erro no reconhecimento facial:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keepalive — o dispositivo em Modo Online faz GET periódico para verificar conexão
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}