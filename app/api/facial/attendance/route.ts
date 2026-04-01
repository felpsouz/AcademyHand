import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Extrai o JSON do body multipart enviado pela Intelbras
function parseIntelbrasBody(text: string): Record<string, any> {
  // O dispositivo envia multipart/form-data com campo "info" contendo JSON
  const match = text.match(/name="info"[\s\S]*?Content-Length:.*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--myboundary|$)/i);
  if (match?.[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('Erro ao parsear JSON do campo info:', e);
    }
  }

  // Fallback: tenta encontrar qualquer JSON no body
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  return {};
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    console.log('Intelbras raw (primeiros 500 chars):', text.substring(0, 500));

    let body: Record<string, any> = {};

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try { body = JSON.parse(text); } catch {}
    } else {
      body = parseIntelbrasBody(text);
    }

    console.log('Intelbras parsed:', JSON.stringify(body).substring(0, 300));

    // A Intelbras envia os eventos dentro de "Events"
    const events = body?.Events ?? [];
    const eventData = events[0]?.Data ?? {};

    // UserID pode estar no evento ou no nível raiz
    const userId = (
      eventData?.UserID ??
      eventData?.CardNo ??
      body?.UserID ??
      body?.CardNo
    )?.toString();

    const timestamp = body?.Time ?? eventData?.UTC
      ? new Date((eventData.UTC ?? 0) * 1000).toISOString()
      : new Date().toISOString();

    console.log('UserID extraído:', userId);

    if (!userId || userId === '') {
      return NextResponse.json(
        { error: 'UserID vazio — cadastre o UserID do Firestore no dispositivo', body: eventData },
        { status: 400 }
      );
    }

    const db = adminDb();
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

    // Evitar presença duplicada no mesmo dia
    const existingSnap = await db.collection('attendance')
      .where('studentId', '==', userId)
      .where('date', '==', dateStr)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({
        approved: true,
        message: 'Presença já registrada hoje',
        studentName: student.name,
        date: dateStr,
      });
    }

    const paymentStatus = student.stripePaymentStatus ?? 'pending';
    const isActive      = student.status === 'active';
    const isPaid        = paymentStatus === 'active';
    const approved      = isActive && isPaid;

    let message = approved ? 'Acesso liberado' : '';
    if (!isActive)                         message = 'Aluno inativo';
    else if (paymentStatus === 'overdue')   message = 'Pagamento em atraso';
    else if (paymentStatus === 'pending')   message = 'Pagamento pendente';
    else if (paymentStatus === 'cancelled') message = 'Assinatura cancelada';

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

    return NextResponse.json({
      approved,
      studentName: student.name,
      belt:        student.belt ?? '',
      paymentStatus,
      message,
    });

  } catch (err: any) {
    console.error('Erro no reconhecimento facial:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}